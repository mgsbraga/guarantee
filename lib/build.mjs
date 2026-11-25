// Gera os artefatos cifrados em docs/ a partir do ledger local em claro.
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { importarChave, cifrar, paraBytes, b64, KDF_ITER } from './crypto.mjs';
import { temUsuarios, montarAcessos } from './usuarios.mjs';
import { P, RAIZ, lerLedger, lerSegredos, brl } from './io.mjs';

const hashDe = (arq) => createHash('sha256').update(fs.readFileSync(arq)).digest('hex').slice(0, 10);

/** Arquivos de código que o site usa, copiados de lib/ e app/ para docs/. */
const COPIAS = [
  ['lib/crypto.mjs', 'crypto.mjs'],
  ['app/nucleo.mjs', 'app/nucleo.mjs'],
  ['app/ui.mjs', 'app/ui.mjs'],
  ['app/base.css', 'app/base.css'],
  ['app/estilo.css', 'app/estilo.css'],
];

/** Copia o código do site e carimba a versão em cada import (o GitHub Pages guarda cache por 10 min). */
export function sincronizarCodigo() {
  fs.mkdirSync(path.join(P.docs, 'app'), { recursive: true });
  for (const [de, para] of COPIAS) {
    const origem = path.join(RAIZ, de);
    if (fs.existsSync(origem)) fs.copyFileSync(origem, path.join(P.docs, para));
  }
  // dentro de ui.mjs: import de nucleo.mjs
  const ui = path.join(P.docs, 'app', 'ui.mjs');
  if (fs.existsSync(ui)) {
    const t = fs.readFileSync(ui, 'utf8');
    const c = t.replace(/from '\.\/nucleo\.mjs(\?v=[0-9a-f]+)?'/g, `from './nucleo.mjs?v=${hashDe(path.join(P.docs, 'app', 'nucleo.mjs'))}'`);
    if (c !== t) fs.writeFileSync(ui, c, 'utf8');
  }
  const pagina = path.join(P.docs, 'index.html');
  if (!fs.existsSync(pagina)) return;
  const html = fs.readFileSync(pagina, 'utf8');
  const carimbado = html.replace(/(["'])\.?\/?((?:app\/)?[\w-]+\.(?:mjs|css))(\?v=[0-9a-f]+)?\1/g, (m, q, arq) => {
    const f = path.join(P.docs, arq);
    return fs.existsSync(f) ? `${q}./${arq}?v=${hashDe(f)}${q}` : m;
  });
  if (carimbado !== html) fs.writeFileSync(pagina, carimbado, 'utf8');
}

export async function build({ verboso = true } = {}) {
  const ledger = lerLedger();
  const seg = lerSegredos();
  if (!temUsuarios(seg)) throw new Error('Nenhum usuário configurado. Crie:  node guarantee.mjs usuario criar miguel "Miguel"');

  const k = await importarChave(b64.to(seg.chaveDados));
  fs.mkdirSync(P.fotosEnc, { recursive: true });

  // chave nova (usuário removido): as fotos cifradas com a antiga são refeitas
  const metaArq = path.join(P.dados, 'meta.json');
  const metaAntigo = fs.existsSync(metaArq) ? JSON.parse(fs.readFileSync(metaArq, 'utf8')) : {};
  if (metaAntigo.idChave !== seg.idChave) for (const f of fs.readdirSync(P.fotosEnc)) fs.unlinkSync(path.join(P.fotosEnc, f));

  // 1. ledger (só o necessário para consultar: nada de segredo de importação)
  const pub = { ...ledger, geradoEm: new Date().toISOString() };
  fs.writeFileSync(path.join(P.dados, 'ledger.enc'), JSON.stringify(await cifrar(k, paraBytes(pub))));

  // 2. fotos das notas
  const esperados = new Set(); let novas = 0;
  for (const n of ledger.notas) {
    if (!n.foto) continue;
    const alvo = n.foto + '.enc'; esperados.add(alvo);
    const destino = path.join(P.fotosEnc, alvo);
    if (fs.existsSync(destino)) continue;
    const origem = path.join(P.fotos, n.foto);
    if (!fs.existsSync(origem)) { if (verboso) console.log(`  ! foto ausente em local/fotos/: ${n.foto}`); continue; }
    fs.writeFileSync(destino, JSON.stringify(await cifrar(k, new Uint8Array(fs.readFileSync(origem)))));
    novas++;
  }
  let removidas = 0;
  for (const f of fs.readdirSync(P.fotosEnc)) if (!esperados.has(f)) { fs.unlinkSync(path.join(P.fotosEnc, f)); removidas++; }

  // 3. metadados públicos: envelopes por usuário + endereço e chave pública do envio de notas
  fs.writeFileSync(metaArq, JSON.stringify({
    v: 1, kdf: 'PBKDF2-SHA256', iter: KDF_ITER, alg: 'AES-256-GCM',
    org: ledger.org, geradoEm: new Date().toISOString(), idChave: seg.idChave,
    usuarios: await montarAcessos(seg),
    envio: seg.envioUrl && seg.envioPublica ? { url: seg.envioUrl, publica: seg.envioPublica } : null,
  }, null, 2));

  // 4. código do site
  sincronizarCodigo();

  if (verboso) {
    console.log('\n  ✓ build concluído');
    console.log(`    ${ledger.lanc.length} lançamentos · ${ledger.notas.length} notas · fotos: ${esperados.size} (${novas} novas${removidas ? `, ${removidas} removidas` : ''})`);
  }
  return { lanc: ledger.lanc.length, notas: ledger.notas.length };
}

export { brl };
