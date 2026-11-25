/**
 * Peças de interface compartilhadas pelo painel (PC) e pelo site (celular):
 * ícones, etiquetas, aviso, visualizador de foto e a folha de captura de nota.
 */
import { U, CATS } from './nucleo.mjs?v=860d0c3f79';
export { U };

const { esc, fmtN } = U;
const $ = (s) => document.querySelector(s);

export const P = (d) => `<svg viewBox="0 0 24 24">${d}</svg>`;
export const ICO = {
  prev: '<svg class="i" viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg>',
  next: '<svg class="i" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6"/></svg>',
  chev: '<svg class="chev" viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg>',
  logo: '<svg viewBox="0 0 24 24"><path d="M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6z"/><path d="M8.5 12l2.5 2.5 4.5-5"/></svg>',
  gear: '<svg class="i" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z"/></svg>',
  cam: P('<path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/>'),
  nota: '<svg class="i" viewBox="0 0 24 24"><path d="M6 2h12v20l-3-2-3 2-3-2-3 2z"/><path d="M9 7h6M9 11h6M9 15h4"/></svg>',
  chart: '<svg class="i" viewBox="0 0 24 24"><path d="M3 3v18h18"/><path d="M7 15l4-5 3 3 5-7"/></svg>',
  sair: '<svg class="i" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/></svg>',
  lock: P('<rect x="3" y="11" width="18" height="10" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>'),
};

/** Ícone e tom por categoria. */
export const CI = {
  combust: ['o', '<path d="M4 21V5a2 2 0 012-2h6a2 2 0 012 2v16M3 21h12M4 10h10"/><path d="M14 8h2a2 2 0 012 2v6a1.5 1.5 0 003 0V9l-3-3"/>'],
  alim: ['g', '<path d="M6 2v7a3 3 0 006 0V2M9 2v20M18 2c-2.5 1-3 5-3 8h3v12"/>'],
  viagem: ['b', '<path d="M5 17h14v-5l-2-5H7l-2 5z"/><circle cx="8" cy="17" r="2"/><circle cx="16" cy="17" r="2"/><path d="M5 12h14"/>'],
  software: ['p', '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>'],
  saude: ['r', '<path d="M20.8 4.6a5.5 5.5 0 00-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 00-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 000-7.8z"/>'],
  contab: ['p', '<rect x="5" y="2" width="14" height="20" rx="2"/><path d="M9 6h6M9 11h.01M12 11h.01M15 11h.01M9 15h.01M12 15h.01M15 15h.01M9 18h6"/>'],
  prolabore: ['b', '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0116 0"/>'],
  'inss-pl': ['b', '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0116 0"/>'],
  das: ['o', '<path d="M3 21h18M5 21V10M19 21V10M9 21V10M15 21V10M2 10l10-7 10 7z"/>'],
  'rec-int': ['g', '<path d="M12 4v12M6 10l6 6 6-6M4 20h16"/>'],
  'rec-ext': ['g', '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 010 18M12 3a14 14 0 000 18"/>'],
  tarifa: ['n', '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20M6 15h4"/>'],
  retirada: ['n', '<path d="M7 17L17 7M8 7h9v9"/>'],
  aporte: ['n', '<path d="M17 7L7 17M16 17H7V8"/>'],
  transf: ['n', '<path d="M7 7h11l-3-3M17 17H6l3 3"/>'],
  fatura: ['n', '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/>'],
  outras: ['n', '<path d="M20 12l-8 8-9-9V3h8z"/><circle cx="7.5" cy="7.5" r="1.5"/>'],
};
export const TC = { g: 'var(--accent)', b: 'var(--series)', p: 'var(--purple)', o: 'var(--warn)', r: 'var(--bad)', n: 'var(--axis)' };
export const tom = (c) => (CI[c] || CI.outras)[0];
export const ic = (c, extra = '', foto = '') => { const [t, s] = CI[c] || CI.outras; return `<span class="ic ${t}${extra ? ' ' + extra : ''}">${P(s)}${foto ? `<img src="${foto}" alt="">` : ''}</span>`; };
export const COR = { miguel: 'var(--series)', arnaldo: 'var(--purple)' };

export function quemTag(N, l) {
  const p = N.partes(l);
  if (N.grupo(l) === 'movimento') return l.socio ? `<span class="tag ${l.socio === 'miguel' ? 'm' : 'a'}">${esc(N.SOC[l.socio] || l.socio)}</span>` : '';
  if ((p.miguel || 0) >= 100) return '<span class="tag m">Miguel</span>';
  if ((p.arnaldo || 0) >= 100) return '<span class="tag a">Arnaldo</span>';
  return '<span class="tag n">' + (l.quem === '5050' || !l.cliente ? '50/50' : `${p.miguel}/${p.arnaldo}`) + '</span>';
}
export const pill = (N, l) => { const [c, t] = N.status(l); return `<span class="pill ${c}">${t}</span>`; };

// ---------------------------------------------------------------- peças fixas

export function montarPecas() {
  if ($('#gToast')) return;
  document.body.insertAdjacentHTML('beforeend', `<div class="sheet-bg" id="gSheet"><div class="sheet"></div></div>
  <div class="lb" id="gLb"><img id="gLbImg" alt="Foto da nota"></div><div class="toast" id="gToast"></div>
  <input type="file" id="gCam" accept="image/*" capture="environment" hidden>`);
  $('#gLb').addEventListener('click', () => $('#gLb').classList.remove('show'));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') $('#gLb').classList.remove('show'); });
}
export function toast(m, ms = 3400) {
  const t = $('#gToast'); t.textContent = m; t.classList.add('show');
  clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('show'), ms);
}
export function verFoto(src) { if (!src) return; $('#gLbImg').src = src; $('#gLb').classList.add('show'); }

/** Reduz a foto (lado maior 1400 px, JPEG 0,72): ~150–300 KB por nota. */
export function compactar(file) {
  return new Promise((ok, er) => {
    const fr = new FileReader(); fr.onerror = er;
    fr.onload = () => {
      const img = new Image(); img.onerror = er;
      img.onload = () => {
        const k = Math.min(1, 1400 / Math.max(img.width, img.height));
        const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        const dataUrl = c.toDataURL('image/jpeg', 0.72);
        ok({ dataUrl, mime: 'image/jpeg', dataB64: dataUrl.split(',')[1], img });
      };
      img.src = fr.result;
    };
    fr.readAsDataURL(file);
  });
}

/**
 * O que dá para tirar do QR code de um cupom, sem rede e sem adivinhar:
 *  - NFC-e online (a maioria): só a chave de acesso — CNPJ e mês, sem valor;
 *  - NFC-e offline: chave + dia + valor;
 *  - QR antigo (v1): chave + data (dhEmi em hexadecimal) + valor (vNF);
 *  - SAT-CF-e (SP): chave|AAAAMMDDhhmmss|valor|...
 * Devolve { chave, data?, valor? } ou null.
 */
export function interpretarQR(txt) {
  txt = String(txt || '').trim();
  const ch = (txt.match(/\d{44}/) || [])[0];
  if (!ch) return null;
  const o = { chave: ch };
  const ano = '20' + ch.substr(2, 2), mes = ch.substr(4, 2);
  // SAT (SP): partes separadas por | começando pela chave
  const sat = txt.split('|');
  if (sat.length >= 3 && /^\d{44}$/.test(sat[0].replace(/\D/g, '').slice(-44)) && /^\d{14}$/.test(sat[1]) && /^\d+(\.\d+)?$/.test(sat[2])) {
    o.data = `${sat[1].slice(0, 4)}-${sat[1].slice(4, 6)}-${sat[1].slice(6, 8)}`; o.valor = parseFloat(sat[2]); return o;
  }
  let url; try { url = new URL(txt); } catch { url = null; }
  const q = url ? url.searchParams : new URLSearchParams(txt.split('?')[1] || '');
  // v1: ?chNFe=...&dhEmi=<hex>&vNF=12.34
  if (q.get('vNF')) {
    o.valor = parseFloat(q.get('vNF'));
    const hex = q.get('dhEmi') || '';
    if (/^[0-9a-f]+$/i.test(hex)) { const d = (hex.match(/../g) || []).map((h) => String.fromCharCode(parseInt(h, 16))).join(''); if (/^\d{4}-\d{2}-\d{2}/.test(d)) o.data = d.slice(0, 10); }
    return o;
  }
  // v2: p=chave|versao|amb|dia|valor|digVal|token|hash (offline) ou p=chave|versao|amb|token|hash (online)
  const p = (q.get('p') || (txt.split('p=')[1] || '')).split('|');
  if (p.length >= 6 && /^\d{1,2}$/.test(p[3]) && /^\d+(\.\d+)?$/.test(p[4])) {
    o.data = `${ano}-${mes}-${U.pad(+p[3])}`; o.valor = parseFloat(p[4]);
  }
  return o;
}

let jsQRpronto = null;
function carregarJsQR() {
  if (window.jsQR) return Promise.resolve(window.jsQR);
  if (!jsQRpronto) jsQRpronto = new Promise((ok, er) => {
    const s = document.createElement('script'); s.src = new URL('./jsqr.js', import.meta.url).href;
    s.onload = () => ok(window.jsQR); s.onerror = () => { jsQRpronto = null; er(new Error('leitor de QR não carregou')); };
    document.head.appendChild(s);
  });
  return jsQRpronto;
}
/** Procura um QR na foto: primeiro inteira, depois em pedaços maiores (o QR costuma ser pequeno no cupom). */
async function acharQR(img) {
  try {
    if ('BarcodeDetector' in window) {
      const r = await new BarcodeDetector({ formats: ['qr_code'] }).detect(img);
      if (r.length) return r[0].rawValue;
    }
  } catch { /* segue para o jsQR */ }
  let jsQR; try { jsQR = await carregarJsQR(); } catch { return null; }
  const W = img.naturalWidth || img.width, H = img.naturalHeight || img.height;
  const c = document.createElement('canvas'), ctx = c.getContext('2d', { willReadFrequently: true });
  // [x, y, largura, altura] em fração da foto
  const recortes = [[0, 0, 1, 1], [0, 0.4, 1, 0.6], [0, 0.2, 1, 0.6], [0, 0, 1, 0.5], [0.1, 0.5, 0.8, 0.5]];
  for (const [fx, fy, fw, fh] of recortes) {
    const sw = W * fw, sh = H * fh, k = Math.min(1, 1600 / Math.max(sw, sh));
    c.width = Math.round(sw * k); c.height = Math.round(sh * k);
    ctx.drawImage(img, W * fx, H * fy, sw, sh, 0, 0, c.width, c.height);
    const r = jsQR(ctx.getImageData(0, 0, c.width, c.height).data, c.width, c.height, { inversionAttempts: 'dontInvert' });
    if (r && r.data) return r.data;
    await new Promise((ok) => setTimeout(ok, 0));   // deixa a tela respirar entre tentativas
  }
  return null;
}
async function lerQR(img) { const t = await acharQR(img); return t ? interpretarQR(t) : null; }

/**
 * Folha de captura de nota.
 * cfg: { N:()=>nucleo, autor:()=>login, cartoes:()=>[contas], enviar: async(dados)=>msg, depois:()=>void }
 * dados = { foto:{dataUrl,mime,dataB64}, valor, data, cartao, estab, cat, quem, lanc?, chave? }
 */
export function criarCaptura(cfg) {
  montarPecas();
  let cap = null, ocupado = false;
  const bg = $('#gSheet'), el = bg.firstElementChild;

  // Enquanto a folha está aberta, a página de fundo fica presa no lugar. Ao fechar, o campo
  // perde o foco (o teclado some) e a página volta exatamente para onde estava — sem isso o
  // iPhone fica com a tela deslocada e os toques caem fora de onde a pessoa tocou.
  let travadaEm = null;
  function travar() {
    if (travadaEm !== null) return;
    travadaEm = window.scrollY;
    Object.assign(document.body.style, { position: 'fixed', top: -travadaEm + 'px', left: '0', right: '0' });
  }
  function destravar() {
    if (travadaEm === null) return;
    document.activeElement?.blur?.();
    Object.assign(document.body.style, { position: '', top: '', left: '', right: '' });
    window.scrollTo(0, travadaEm); travadaEm = null;
  }

  function desenhar() {
    if (!cap) { bg.classList.remove('show'); destravar(); return; }
    travar(); bg.classList.add('show');
    if (cap.step === 'lendo' || ocupado) { el.innerHTML = `<div class="sh-load"><div class="spin"></div><b>${ocupado ? 'Enviando…' : 'Lendo a nota…'}</b></div>`; return; }
    const N = cfg.N(), me = cfg.autor(), linha = cap.lanc && N.lanc(cap.lanc);
    const cats = ['combust', 'alim', 'viagem', 'software', 'outras'];
    const cl = N.L.clientes.slice().sort((a, b) => (b.div[me] || 0) - (a.div[me] || 0));
    const cartoes = cfg.cartoes();
    el.innerHTML = `<div class="sh-top"><img src="${cap.foto.dataUrl}"><div><h4>${linha ? 'Nota de ' + esc(linha.desc) : 'Nova nota'}</h4>
      <div class="sh-note">${linha ? 'Vai direto para esta compra da fatura.' : cap.qr === 'completo' ? '✓ QR lido: data e valor preenchidos — confira.' : cap.qr === 'chave' ? '✓ QR lido, mas esta nota não traz o valor no QR — digite o valor.' : 'Não achei QR code na foto — preencha à mão.'}</div></div></div>
    ${linha ? '' : `<label class="fld"><span>Valor</span><input class="inp big" inputmode="decimal" placeholder="0,00" value="${cap.valor ? fmtN(cap.valor) : ''}" data-cap="valor"></label>
    ${cartoes.length > 1 ? `<div class="two"><label class="fld"><span>Data</span><input class="inp" type="date" value="${cap.data}" data-cap="data"></label>
    <label class="fld"><span>Cartão</span><select class="inp" data-cap="cartao">${cartoes.map((c) => `<option value="${c.id}"${c.id === cap.cartao ? ' selected' : ''}>${esc(c.nome)}</option>`).join('')}</select></label></div>`
    : `<label class="fld"><span>Data · ${esc((cartoes[0] || {}).nome || 'sem cartão')}</span><input class="inp" type="date" value="${cap.data}" data-cap="data"></label>`}
    <label class="fld"><span>Onde</span><input class="inp" value="${esc(cap.estab || '')}" placeholder="posto, restaurante…" data-cap="estab"></label>
    <div class="fld"><span>Categoria</span><div class="chips">${cats.map((k) => `<button type="button" class="chip${cap.cat === k ? ' on' : ''}" data-capcat="${k}">${esc(CATS.find((c) => c.id === k).nome.replace(' e deslocamento', ''))}</button>`).join('')}</div></div>`}
    <div class="fld"><span>Foi para qual cliente?</span><div class="chips">${cl.map((c) => `<button type="button" class="chip${cap.quem === 'c:' + c.id ? ' on' : ''}" data-capquem="c:${c.id}">${esc(c.nome)}</button>`).join('')}<button type="button" class="chip${cap.quem === 's:' + me ? ' on' : ''}" data-capquem="s:${me}">Nenhum</button></div></div>
    <button type="button" class="sh-send" data-capacao="enviar">Enviar nota</button><button type="button" class="sh-cancel" data-capacao="cancelar">Descartar</button>`;
  }

  async function receber(file) {
    if (!file) return;
    let r; try { r = await compactar(file); } catch { toast('Não consegui abrir essa imagem'); return; }
    const lanc = cap && cap.lanc;
    const meus = cfg.cartoes();
    cap = { step: 'lendo', foto: r, lanc, data: U.hoje(), cartao: (meus[0] || {}).id, quem: '' };
    desenhar();
    if (lanc) { const l = cfg.N().lanc(lanc); cap.quem = cfg.N().quemDe(l) || 's:' + cfg.autor(); cap.step = 'form'; desenhar(); return; }
    const q = await lerQR(r.img);
    if (q) { cap.qr = q.valor ? 'completo' : 'chave'; cap.chave = q.chave; if (q.data) cap.data = q.data; if (q.valor) cap.valor = q.valor; }
    cap.step = 'form'; desenhar();
  }

  async function enviar() {
    const N = cfg.N();
    let dados;
    if (cap.lanc) {
      const l = N.lanc(cap.lanc);
      dados = { foto: cap.foto, valor: l.valor, data: l.venc, cartao: l.conta, estab: l.desc, cat: l.cat, quem: cap.quem, lanc: l.id };
    } else {
      if (!(cap.valor > 0)) { toast('Informe o valor'); return; }
      if (!cap.cat) { toast('Escolha a categoria'); return; }
      if (!cap.cartao) { toast('Escolha o cartão'); return; }
      dados = { foto: cap.foto, valor: cap.valor, data: cap.data, cartao: cap.cartao, estab: cap.estab || '', cat: cap.cat, quem: cap.quem || 's:' + cfg.autor(), chave: cap.chave || '' };
    }
    ocupado = true; desenhar();
    try { const msg = await cfg.enviar(dados); cap = null; ocupado = false; desenhar(); toast(msg || 'Nota enviada ✓'); cfg.depois && cfg.depois(); }
    catch (e) { ocupado = false; desenhar(); toast(e.message || 'Não foi possível enviar', 5000); }
  }

  $('#gCam').addEventListener('change', (e) => { receber(e.target.files[0]); e.target.value = ''; });
  bg.addEventListener('click', (e) => {
    if (e.target === bg && !ocupado && cap?.step !== 'lendo') { cap = null; desenhar(); return; }
    const c = e.target.closest('[data-capcat]'); if (c) { cap.cat = c.dataset.capcat; desenhar(); return; }
    const q = e.target.closest('[data-capquem]'); if (q) { cap.quem = q.dataset.capquem; desenhar(); return; }
    const a = e.target.closest('[data-capacao]'); if (!a) return;
    if (a.dataset.capacao === 'enviar') enviar(); else { cap = null; desenhar(); }
  });
  bg.addEventListener('input', (e) => { const i = e.target.closest('[data-cap]'); if (!i || !cap) return; cap[i.dataset.cap] = i.dataset.cap === 'valor' ? U.parseBR(i.value) : i.value; });
  bg.addEventListener('change', (e) => { const i = e.target.closest('[data-cap]'); if (!i || !cap) return; cap[i.dataset.cap] = i.dataset.cap === 'valor' ? U.parseBR(i.value) : i.value; });

  return {
    nova() { cap = null; $('#gCam').click(); },
    anexar(lancId) { cap = { lanc: lancId }; $('#gCam').click(); },
  };
}
