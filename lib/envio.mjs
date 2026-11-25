/**
 * Notas enviadas pelo celular.
 *
 * O celular cifra com a chave pública (em meta.json) e manda para o Worker. Aqui o
 * painel lista, baixa, decifra com a chave privada de local/, vira nota no ledger,
 * grava a foto em local/fotos/ e apaga o envio do Worker.
 */
import fs from 'node:fs';
import path from 'node:path';
import { RAIZ, P, lerSegredos, gravarSegredos, lerLedger, gravarLedger, novoId } from './io.mjs';
import { garantirChaves, decifrarEnvio } from './chaves.mjs';
import { criarNucleo, r2 } from '../app/nucleo.mjs';

const P_ENVIO = {
  molde: path.join(RAIZ, 'envio', 'worker.js'),
  saida: path.join(RAIZ, 'envio', 'dist', 'worker.js'),
  cname: path.join(RAIZ, 'docs', 'CNAME'),
};

export function origemDoSite() {
  if (!fs.existsSync(P_ENVIO.cname)) return '';
  const host = fs.readFileSync(P_ENVIO.cname, 'utf8').trim();
  return host ? `https://${host}` : '';
}

/** Gera envio/dist/worker.js e garante o par de chaves e o segredo de administração. */
export async function montarWorker() {
  const { nova } = await garantirChaves();
  const s = lerSegredos();
  if (!s.envioSegredo) {
    s.envioSegredo = [...crypto.getRandomValues(new Uint8Array(24))].map((b) => b.toString(16).padStart(2, '0')).join('');
    gravarSegredos(s);
  }
  const worker = fs.readFileSync(P_ENVIO.molde, 'utf8').replace('__ORIGEM_SITE__', JSON.stringify(origemDoSite()));
  fs.mkdirSync(path.dirname(P_ENVIO.saida), { recursive: true });
  fs.writeFileSync(P_ENVIO.saida, worker, 'utf8');
  return { arquivo: P_ENVIO.saida, chaveNova: nova, origem: origemDoSite(), segredo: s.envioSegredo };
}

export function configuracaoEnvio() {
  const s = lerSegredos() || {};
  return { url: s.envioUrl || '', temSegredo: Boolean(s.envioSegredo), temChaves: Boolean(s.envioPrivada) };
}

export function configurarEnvio({ url }) {
  const s = lerSegredos();
  if (!s) throw new Error('Configure o sistema antes: node guarantee.mjs init');
  s.envioUrl = String(url || '').trim().replace(/\/+$/, '');
  gravarSegredos(s);
  return configuracaoEnvio();
}

async function chamar(caminho, { metodo = 'GET' } = {}) {
  const s = lerSegredos() || {};
  if (!s.envioUrl) throw new Error('Recebedor de notas ainda não configurado.');
  const r = await fetch(s.envioUrl + caminho, { method: metodo, headers: { 'x-guarantee-admin': s.envioSegredo || '' } });
  if (r.status === 401) throw new Error('O segredo de administração não confere com o do Worker.');
  if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.erro || `O recebedor respondeu ${r.status}.`); }
  return r;
}

export async function listarEnvios() {
  const { url } = configuracaoEnvio();
  if (!url) return { ativo: false, itens: [] };
  try { const r = await chamar('/api/listar'); const { itens } = await r.json(); return { ativo: true, itens: itens || [] }; }
  catch (e) { return { ativo: false, erro: e.message, itens: [] }; }
}

const EXT = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/heic': '.heic', 'application/pdf': '.pdf' };

/** Transforma um envio decifrado em nota no ledger (sem gravar). Devolve a nota. */
export function notaDoEnvio(L, env) {
  if (!env || env.tipo !== 'nota') throw new Error('Envio não é uma nota.');
  if (env.uid && L.notas.some((n) => n.uid === env.uid)) return null;  // já recebida
  const id = novoId('n');
  let foto = null;
  if (env.foto?.dataB64) {
    foto = id + (EXT[env.foto.mime] || '.jpg');
    fs.mkdirSync(P.fotos, { recursive: true });
    fs.writeFileSync(path.join(P.fotos, foto), Buffer.from(env.foto.dataB64, 'base64'));
  }
  const n = {
    id, uid: env.uid || null, autor: String(env.autor || ''), estab: String(env.estab || '').slice(0, 120),
    valor: r2(Number(env.valor) || 0), data: /^\d{4}-\d{2}-\d{2}$/.test(env.data) ? env.data : new Date().toISOString().slice(0, 10),
    cartao: String(env.cartao || ''), cat: String(env.cat || 'outras'), quem: String(env.quem || ''),
    lanc: null, foto, obs: String(env.obs || '').slice(0, 500),
    recebidaEm: new Date().toISOString(),
  };
  L.notas.push(n);
  // anexar direto a uma compra (botão "Foto" num gasto sem nota)
  if (env.lanc) { const l = L.lanc.find((x) => x.id === env.lanc && !x.nota); if (l) criarNucleo(L).ligar(n, l); }
  return n;
}

/** Busca tudo que chegou, grava no ledger e apaga do Worker. */
export async function puxarEnvios() {
  const lista = await listarEnvios();
  if (!lista.ativo) return { ok: false, erro: lista.erro || 'Recebedor de notas não configurado.', novas: 0 };
  const L = lerLedger();
  let novas = 0; const erros = [];
  for (const it of lista.itens) {
    try {
      const pacote = await (await chamar(`/api/baixar?chave=${encodeURIComponent(it.chave)}`)).json();
      const env = await decifrarEnvio(pacote);
      if (notaDoEnvio(L, env)) novas++;
      gravarLedger(L);
      await chamar(`/api/apagar?chave=${encodeURIComponent(it.chave)}`, { metodo: 'POST' });
    } catch (e) { erros.push(`${it.chave}: ${e.message}`); }
  }
  const casadas = criarNucleo(L).casar();
  gravarLedger(L);
  return { ok: true, novas, casadas, erros };
}
