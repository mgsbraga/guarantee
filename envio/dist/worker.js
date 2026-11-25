/**
 * Recebedor de notas da Guarantee — Cloudflare Worker.
 * (Mesmo princípio do heli-envios.)
 *
 * O celular cifra a nota (foto + dados) com a chave pública antes de enviar: este
 * Worker e o bucket só enxergam bytes opacos. Só a chave privada, que vive em
 * local/segredos.json no PC do Miguel, abre um envio.
 *
 * Este arquivo é um molde. O pronto para publicar sai de:  node guarantee.mjs envio
 *
 * Além do envio, guarda uma CÓPIA de cada nota cifrada com a chave dos dados do site
 * (espelhos/<uid>.meta e .foto), para o celular mostrar "Enviadas" em qualquer aparelho
 * antes de o painel processar. O Worker também não lê essa cópia.
 *
 * Configuração na Cloudflare (nada disso vive aqui, que é público):
 *   - Binding de R2 chamado ENVIOS
 *   - Secret SEGREDO_ADMIN — usado pelo painel para listar, baixar e apagar
 */

const ORIGEM_SITE = "https://guarantee.miguelbraga.com.br";
const LIMITE = 15 * 1024 * 1024;   // 15 MB por envio
const LIMITE_META = 64 * 1024;      // dados de uma nota (com miniatura)
const UID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

const json = (corpo, codigo = 200, extra = {}) =>
  new Response(JSON.stringify(corpo), {
    status: codigo,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...extra },
  });

function novoProtocolo() {
  const d = new Date(), p = (n, c = 2) => String(n).padStart(c, '0');
  const suf = [...crypto.getRandomValues(new Uint8Array(3))].map((b) => b.toString(16).padStart(2, '0')).join('').toUpperCase();
  return `${d.getUTCFullYear()}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}-${p(d.getUTCHours())}${p(d.getUTCMinutes())}${p(d.getUTCSeconds())}-${suf}`;
}

const admin = (req, env) => Boolean(env.SEGREDO_ADMIN) && req.headers.get('x-guarantee-admin') === env.SEGREDO_ADMIN;

function cors(req) {
  const origem = req.headers.get('origin');
  if (!origem || !ORIGEM_SITE || origem !== ORIGEM_SITE) return {};
  return {
    'access-control-allow-origin': origem,
    'access-control-allow-methods': 'GET, POST, OPTIONS',
    'access-control-allow-headers': 'content-type',
    'access-control-max-age': '86400',
    'vary': 'origin',
  };
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const rota = url.pathname.replace(/\/+$/, '') || '/';

    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(req) });

    // ---------------------------------------------------------- envio (vem do site)
    if (rota === '/enviar' && req.method === 'POST') {
      const h = cors(req);
      if (!h['access-control-allow-origin']) return json({ erro: 'Origem não autorizada.' }, 403);
      if (!env.ENVIOS) return json({ erro: 'Recebedor sem armazenamento configurado.' }, 500, h);
      const tamanho = Number(req.headers.get('content-length') || 0);
      if (tamanho > LIMITE) return json({ erro: 'Envio acima de 15 MB.' }, 413, h);
      if (!tamanho) return json({ erro: 'Envio vazio.' }, 400, h);
      const protocolo = novoProtocolo();
      await env.ENVIOS.put(`envios/${protocolo}.json`, req.body, {
        httpMetadata: { contentType: 'application/octet-stream' },
        customMetadata: { recebidoEm: new Date().toISOString() },
      });
      return json({ ok: true, protocolo }, 200, h);
    }

    // ---------------------------------------------------------- cópias para o celular (cifradas com a chave do site)
    if (rota === '/espelho' && req.method === 'POST') {
      const h = cors(req);
      if (!h['access-control-allow-origin']) return json({ erro: 'Origem não autorizada.' }, 403);
      const uid = url.searchParams.get('uid') || '', parte = url.searchParams.get('parte') || '';
      if (!UID.test(uid) || !['meta', 'foto'].includes(parte)) return json({ erro: 'Pedido inválido.' }, 400, h);
      const tamanho = Number(req.headers.get('content-length') || 0);
      if (!tamanho || tamanho > (parte === 'meta' ? LIMITE_META : LIMITE)) return json({ erro: 'Tamanho inválido.' }, 413, h);
      const chave = `espelhos/${uid}.${parte}`;
      if (await env.ENVIOS.head(chave)) return json({ erro: 'Já existe.' }, 409, h);   // nunca sobrescreve
      await env.ENVIOS.put(chave, req.body, { httpMetadata: { contentType: 'application/octet-stream' }, customMetadata: { recebidoEm: new Date().toISOString() } });
      return json({ ok: true }, 200, h);
    }
    if (rota === '/espelhos' && req.method === 'GET') {
      const h = cors(req);
      if (!h['access-control-allow-origin']) return json({ erro: 'Origem não autorizada.' }, 403);
      const lista = await env.ENVIOS.list({ prefix: 'espelhos/', limit: 500 });
      const metas = lista.objects.filter((o) => o.key.endsWith('.meta')).slice(0, 200);
      const itens = await Promise.all(metas.map(async (o) => {
        const obj = await env.ENVIOS.get(o.key);
        return { uid: o.key.slice(9, -5), dados: obj ? await obj.text() : null };
      }));
      return json({ itens: itens.filter((i) => i.dados) }, 200, h);
    }
    if (rota === '/espelho-foto' && req.method === 'GET') {
      const h = cors(req);
      if (!h['access-control-allow-origin']) return json({ erro: 'Origem não autorizada.' }, 403);
      const uid = url.searchParams.get('uid') || '';
      if (!UID.test(uid)) return json({ erro: 'Pedido inválido.' }, 400, h);
      const obj = await env.ENVIOS.get(`espelhos/${uid}.foto`);
      if (!obj) return json({ erro: 'Não encontrada.' }, 404, h);
      return new Response(obj.body, { headers: { 'content-type': 'application/octet-stream', 'cache-control': 'no-store', ...h } });
    }

    // ---------------------------------------------------------- área do painel
    if (rota.startsWith('/api/')) {
      if (!admin(req, env)) return json({ erro: 'Não autorizado.' }, 401);
      if (!env.ENVIOS) return json({ erro: 'Sem armazenamento configurado.' }, 500);

      if (rota === '/api/listar') {
        const lista = await env.ENVIOS.list({ prefix: 'envios/', limit: 500 });
        return json({
          itens: lista.objects.map((o) => ({
            chave: o.key, tamanho: o.size,
            recebidoEm: o.customMetadata?.recebidoEm || o.uploaded,
          })).sort((a, b) => String(a.recebidoEm).localeCompare(String(b.recebidoEm))),
        });
      }
      if (rota === '/api/baixar') {
        const chave = url.searchParams.get('chave') || '';
        if (!chave.startsWith('envios/')) return json({ erro: 'Chave inválida.' }, 400);
        const obj = await env.ENVIOS.get(chave);
        if (!obj) return json({ erro: 'Envio não encontrado.' }, 404);
        return new Response(obj.body, { headers: { 'content-type': 'application/octet-stream', 'cache-control': 'no-store' } });
      }
      if (rota === '/api/apagar' && req.method === 'POST') {
        const chave = url.searchParams.get('chave') || '';
        if (!chave.startsWith('envios/') && !chave.startsWith('espelhos/')) return json({ erro: 'Chave inválida.' }, 400);
        await env.ENVIOS.delete(chave);
        return json({ ok: true });
      }
      return json({ erro: 'Rota desconhecida.' }, 404);
    }

    return new Response('Guarantee — recebedor de notas.', { status: 200, headers: { 'content-type': 'text/plain; charset=utf-8' } });
  },
};
