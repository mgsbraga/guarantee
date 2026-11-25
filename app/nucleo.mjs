/**
 * Núcleo de cálculo da Guarantee — o mesmo arquivo roda no painel (PC), no site
 * (celular) e no Node. Nada de DOM aqui: só funções sobre o ledger.
 *
 * Lançamento (l):
 *   { id, conta, cat, desc, comp:'AAAA-MM', venc:'AAAA-MM-DD', pago:'AAAA-MM-DD'|null, valor>0,
 *     cliente? | socio? | quem:'5050'?, nota?:idDaNota, origem?:'extrato'|'fatura'|'manual' }
 * Nota (n):
 *   { id, uid?, autor, estab, valor, data, cartao, cat, quem, lanc:idLanc|null, foto?:arquivo, obs? }
 */

export const CATS = [
  ['rec-int', 'Serviços — Brasil (NF)', 'receita'], ['rec-ext', 'Serviços — exterior (invoice)', 'receita'],
  ['das', 'Imposto (DAS)', 'imposto'], ['prolabore', 'Pró-labore', 'pessoal'], ['inss-pl', 'INSS do pró-labore', 'pessoal'],
  ['contab', 'Contabilidade', 'despesa'], ['saude', 'Plano de saúde', 'despesa'], ['software', 'Software', 'despesa'],
  ['combust', 'Combustível', 'despesa'], ['alim', 'Alimentação', 'despesa'], ['viagem', 'Viagens e deslocamento', 'despesa'],
  ['tarifa', 'Tarifas bancárias', 'despesa'], ['outras', 'Outras despesas', 'despesa'],
  ['retirada', 'Retirada de sócio', 'movimento'], ['aporte', 'Aporte de sócio', 'movimento'],
  ['transf', 'Transferência entre contas', 'movimento'], ['fatura', 'Pagamento de fatura do cartão', 'movimento'],
].map(([id, nome, grupo]) => ({ id, nome, grupo }));

export const GRUPOS = { receita: 'Receitas', imposto: 'Impostos', pessoal: 'Pessoal', despesa: 'Despesas', movimento: 'Fora do resultado' };
export const MES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
export const MESL = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

const pad = (n) => String(n).padStart(2, '0');
export const r2 = (n) => Math.round(n * 100) / 100;

export const U = {
  pad, MES, MESL,
  fmt: (n) => (n < -0.004 ? '−' : '') + 'R$ ' + Math.abs(n).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
  fmtN: (n) => Number(n || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
  mesLabel: (c) => { const [y, m] = c.split('-'); return MES[+m - 1] + '/' + y.slice(2); },
  mesNome: (c) => MESL[+c.slice(5, 7) - 1],
  mesLongo: (c) => MESL[+c.slice(5, 7) - 1] + ' ' + c.slice(0, 4),
  dCurto: (d) => (d ? d.slice(8, 10) + '/' + d.slice(5, 7) : '—'),
  esc: (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])),
  addMes: (c, k) => { let [y, m] = c.split('-').map(Number); m += k; while (m > 12) { m -= 12; y++; } while (m < 1) { m += 12; y--; } return y + '-' + pad(m); },
  hoje: () => { const d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); },
  parseBR: (s) => { s = String(s ?? '').trim().replace(/[R$\s]/g, ''); if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.'); return parseFloat(s) || 0; },
  dias: (a, b) => Math.abs((new Date(a) - new Date(b)) / 864e5),
};

/** Todas as consultas sobre um ledger. */
export function criarNucleo(L) {
  const cat = (id) => CATS.find((c) => c.id === id) || { id, nome: id, grupo: 'despesa' };
  const cli = (id) => L.clientes.find((c) => c.id === id);
  const conta = (id) => L.contas.find((c) => c.id === id) || { id, nome: id, tipo: 'banco' };
  const grupo = (l) => cat(l.cat).grupo;
  const emRes = (l) => ['imposto', 'pessoal', 'despesa'].includes(grupo(l));
  const ehCartao = (l) => conta(l.conta).tipo === 'cartao';
  const SOC = Object.fromEntries(Object.entries(L.socios).map(([k, v]) => [k, v.nome]));

  function partes(l) {
    if (l.quem === '5050') return { miguel: 50, arnaldo: 50 };
    if (l.socio) return { [l.socio]: 100 };
    if (l.cliente && cli(l.cliente)) return cli(l.cliente).div;
    return { miguel: 50, arnaldo: 50 };
  }
  const quemDe = (l) => (l.quem === '5050' ? '5050' : l.cliente ? 'c:' + l.cliente : l.socio ? 's:' + l.socio : '');
  function setQuem(l, v) {
    delete l.cliente; delete l.socio; delete l.quem; if (!v) return;
    if (v.startsWith('c:')) l.cliente = v.slice(2); else if (v.startsWith('s:')) l.socio = v.slice(2); else if (v === '5050') l.quem = '5050';
  }
  function quemTxt(v) {
    if (!v) return ''; if (v === '5050') return '50/50';
    if (v.startsWith('c:')) return (cli(v.slice(2)) || {}).nome || ''; return SOC[v.slice(2)] || '';
  }

  function resumo(f) {
    const r = { rec: 0, imp: 0, pes: 0, desp: 0 };
    L.lanc.filter(f).forEach((l) => {
      const g = grupo(l);
      if (g === 'receita') r.rec += l.valor; else if (g === 'imposto') r.imp += l.valor; else if (g === 'pessoal') r.pes += l.valor; else if (g === 'despesa') r.desp += l.valor;
    });
    r.saida = r.imp + r.pes + r.desp; r.res = r.rec - r.saida; return r;
  }
  const resumoMes = (m) => resumo((l) => l.comp === m);

  function socios(f) {
    const z = () => ({ rec: 0, saida: 0, imp: 0, pes: 0, desp: 0, ret: 0, apo: 0 });
    const o = Object.fromEntries(Object.keys(L.socios).map((k) => [k, z()]));
    L.lanc.filter(f).forEach((l) => {
      const g = grupo(l);
      if (g === 'movimento') { if (l.socio && o[l.socio]) { if (l.cat === 'retirada') o[l.socio].ret += l.valor; if (l.cat === 'aporte') o[l.socio].apo += l.valor; } return; }
      const p = partes(l);
      for (const k in p) {
        if (!o[k]) continue; const v = l.valor * p[k] / 100;
        if (g === 'receita') o[k].rec += v; else { o[k].saida += v; o[k][g === 'imposto' ? 'imp' : g === 'pessoal' ? 'pes' : 'desp'] += v; }
      }
    });
    for (const k in o) o[k].res = o[k].rec - o[k].saida; return o;
  }
  function sociosMes(m) {
    const mes = socios((l) => l.comp === m), ac = socios((l) => l.comp.slice(0, 4) === m.slice(0, 4) && l.comp <= m);
    for (const k in mes) { mes[k].saldo = ac[k].res - ac[k].ret + ac[k].apo; mes[k].acum = ac[k]; }
    return mes;
  }
  const receitas = (m) => L.lanc.filter((l) => l.comp === m && grupo(l) === 'receita').sort((a, b) => b.valor - a.valor);
  function saidasPorCat(m) {
    const g = {};
    L.lanc.filter((l) => l.comp === m && emRes(l)).forEach((l) => {
      (g[l.cat] = g[l.cat] || { cat: l.cat, nome: cat(l.cat).nome, v: 0, itens: [] }); g[l.cat].v += l.valor; g[l.cat].itens.push(l);
    });
    return Object.values(g).sort((a, b) => b.v - a.v);
  }
  const lancsMes = (m) => L.lanc
    .filter((l) => l.comp === m || (l.pago && l.pago.slice(0, 7) === m && grupo(l) === 'movimento' && l.comp !== m))
    .sort((a, b) => (b.venc || '').localeCompare(a.venc || ''));

  function porCliente(f) {
    const Ls = L.lanc.filter(f);
    const rows = L.clientes.map((c) => {
      const rec = Ls.filter((l) => grupo(l) === 'receita' && l.cliente === c.id).reduce((a, l) => a + l.valor, 0);
      const desp = Ls.filter((l) => emRes(l) && l.cliente === c.id).reduce((a, l) => a + l.valor, 0);
      const dono = c.div.miguel >= 100 ? 'miguel' : c.div.arnaldo >= 100 ? 'arnaldo' : null;
      return { c, rec, desp, res: rec - desp, dono };
    }).filter((r) => r.rec || r.desp);
    const geral = Ls.filter((l) => emRes(l) && !l.cliente).reduce((a, l) => a + l.valor, 0);
    return { rows: rows.sort((a, b) => b.rec - a.rec), geral };
  }

  // ---- notas ----
  const nota = (id) => L.notas.find((n) => n.id === id);
  const lanc = (id) => L.lanc.find((l) => l.id === id);
  function ligar(n, l) { n.lanc = l.id; l.nota = n.id; if (n.cat) l.cat = n.cat; if (n.quem) setQuem(l, n.quem); }
  /** Casa notas soltas com compras da fatura: mesmo cartão, mesmo valor, até 3 dias. */
  function casar() {
    let k = 0;
    L.notas.filter((n) => !n.lanc).forEach((n) => {
      const c = L.lanc.filter((l) => l.conta === n.cartao && !l.nota && Math.abs(l.valor - n.valor) < 0.01 && U.dias(l.venc, n.data) <= 3)
        .sort((a, b) => U.dias(a.venc, n.data) - U.dias(b.venc, n.data));
      if (c[0]) { ligar(n, c[0]); k++; }
    });
    return k;
  }
  const aguardando = () => L.notas.filter((n) => !n.lanc).sort((a, b) => b.data.localeCompare(a.data));
  const casadas = (m) => L.notas.filter((n) => n.lanc && n.data.slice(0, 7) === m).sort((a, b) => b.data.localeCompare(a.data));
  const semNota = (m) => L.lanc.filter((l) => ehCartao(l) && emRes(l) && !l.nota && l.comp === m).sort((a, b) => a.venc.localeCompare(b.venc));

  // ---- pendências do mês ----
  function pendencias(m) {
    const fim = m + '-31', hoje = U.hoje(), P = [];
    const ag = aguardando();
    const cartoes = L.contas.filter((c) => c.tipo === 'cartao');
    const mesAnt = U.addMes(hoje.slice(0, 7), -1);
    const atrasadas = cartoes.filter((c) => !L.faturas[c.id] || L.faturas[c.id] < mesAnt);
    if (ag.length && atrasadas.length) P.push({ k: 'fatura', ord: 0, t: 'Importar fatura do cartão', s: `${ag.length} nota${ag.length > 1 ? 's' : ''} esperando · ${atrasadas.map((c) => c.nome).join(', ')}`, btn: 'Importar', act: 'irImportar' });
    const bancos = L.contas.filter((c) => c.tipo === 'banco' && L.extratos[c.id]);
    bancos.filter((c) => U.dias(L.extratos[c.id], hoje) > 20).forEach((c) => P.push({ k: 'extrato', ord: 0, t: 'Importar extrato ' + c.nome, s: 'último até ' + U.dCurto(L.extratos[c.id]) + '/' + L.extratos[c.id].slice(0, 4), btn: 'Importar', act: 'irImportar' }));
    semNota(m).forEach((l) => P.push({ k: 'nota', ord: 1, t: 'Gasto sem nota: ' + l.desc, s: conta(l.conta).nome + ' · ' + U.dCurto(l.venc), v: l.valor, btn: 'Anexar foto', act: 'anexar', id: l.id }));
    L.lanc.filter((l) => !l.pago && !ehCartao(l) && l.venc <= fim && grupo(l) !== 'movimento').forEach((l) => {
      const r = grupo(l) === 'receita', venc = l.venc < hoje;
      P.push({ k: r ? 'receber' : 'pagar', ord: venc ? 1 : 2, venc, t: r ? `${(cli(l.cliente) || {}).nome || 'Cliente'} pagou ${l.desc}?` : l.desc, s: (venc ? 'venceu ' : 'vence ') + U.dCurto(l.venc) + ' · ' + conta(l.conta).nome, v: l.valor, btn: r ? 'Recebi' : 'Paguei', act: 'pagar', id: l.id });
    });
    return P.sort((a, b) => a.ord - b.ord);
  }

  function status(l) {
    const g = grupo(l), hoje = U.hoje();
    if (g === 'movimento') return ['n', 'movimento'];
    if (l.pago) return ['ok', (g === 'receita' ? 'recebido ' : 'pago ') + U.dCurto(l.pago)];
    if (l.venc < hoje) return ['no', (g === 'receita' ? 'atrasado ' : 'vencido ') + U.dCurto(l.venc)];
    return ['wait', (g === 'receita' ? 'a receber ' : 'a pagar ') + U.dCurto(l.venc)];
  }

  return {
    L, SOC, cat, cli, conta, grupo, emRes, ehCartao, partes, quemDe, setQuem, quemTxt,
    resumo, resumoMes, socios, sociosMes, receitas, saidasPorCat, lancsMes, porCliente,
    nota, lanc, ligar, casar, aguardando, casadas, semNota, pendencias, status,
  };
}

// ---------------------------------------------------------------- importação

/** CSV simples com aspas; detecta ; ou , como separador. */
export function lerCSV(txt) {
  txt = String(txt).replace(/^﻿/, '');
  const prim = txt.split(/\r?\n/)[0] || '';
  const sep = (prim.match(/;/g) || []).length > (prim.match(/,/g) || []).length ? ';' : ',';
  const linhas = []; let campo = '', linha = [], aspas = false;
  for (let i = 0; i < txt.length; i++) {
    const ch = txt[i];
    if (aspas) { if (ch === '"') { if (txt[i + 1] === '"') { campo += '"'; i++; } else aspas = false; } else campo += ch; continue; }
    if (ch === '"') aspas = true;
    else if (ch === sep) { linha.push(campo); campo = ''; }
    else if (ch === '\n' || ch === '\r') { if (ch === '\r' && txt[i + 1] === '\n') i++; linha.push(campo); campo = ''; if (linha.some((c) => c.trim())) linhas.push(linha); linha = []; }
    else campo += ch;
  }
  linha.push(campo); if (linha.some((c) => c.trim())) linhas.push(linha);
  return linhas;
}

const dataBR = (s) => { const m = String(s).trim().match(/^(\d{2})\/(\d{2})\/(\d{4})/); return m ? `${m[3]}-${m[2]}-${m[1]}` : (/^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : null); };
const valorNum = (s) => { s = String(s).trim().replace(/[R$\s]/g, ''); if (/,\d{1,2}$/.test(s)) s = s.replace(/\./g, '').replace(',', '.'); const n = parseFloat(s); return Number.isFinite(n) ? n : NaN; };
const norm = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

/**
 * Extrato bancário em CSV. Formato da Cora: Data, Transação, Tipo Transação, Identificação, Valor.
 * Genérico: procura colunas de data, descrição/identificação e valor pelo cabeçalho.
 */
export function lerExtratoCSV(txt) {
  const linhas = lerCSV(txt); if (!linhas.length) return [];
  const cab = linhas[0].map(norm);
  const iData = cab.findIndex((c) => c.startsWith('data'));
  const iVal = cab.findIndex((c) => c.startsWith('valor'));
  const iIdent = cab.findIndex((c) => c.startsWith('identifica') || c.startsWith('descri') || c.startsWith('historico'));
  const iTipo = cab.findIndex((c) => c === 'transacao');
  if (iData < 0 || iVal < 0) throw new Error('Não achei as colunas de data e valor no cabeçalho do CSV.');
  return linhas.slice(1).map((r) => ({
    data: dataBR(r[iData]), valor: valorNum(r[iVal]),
    ident: String(r[iIdent >= 0 ? iIdent : iData + 1] || '').trim(), tipo: iTipo >= 0 ? String(r[iTipo] || '').trim() : '',
  })).filter((x) => x.data && Number.isFinite(x.valor) && x.valor !== 0);
}

/**
 * Fatura de cartão em CSV: data, descrição, valor (compras positivas). Linhas de
 * pagamento/estorno (valor negativo) são ignoradas.
 */
export function lerFaturaCSV(txt) {
  const linhas = lerCSV(txt); if (!linhas.length) return [];
  const cab = linhas[0].map(norm);
  let iData = cab.findIndex((c) => c.startsWith('data'));
  let iVal = cab.findIndex((c) => c.startsWith('valor') || c.startsWith('total'));
  let iDesc = cab.findIndex((c) => c.startsWith('descri') || c.startsWith('estabelec') || c.startsWith('lancamento') || c.startsWith('historico') || c.startsWith('identifica'));
  let corpo = linhas.slice(1);
  if (iData < 0 || iVal < 0) { // sem cabeçalho reconhecível: assume data, descrição, valor
    if (!dataBR(linhas[0][0])) throw new Error('Não reconheci o formato da fatura. Esperado: data, descrição, valor.');
    iData = 0; iDesc = 1; iVal = linhas[0].length - 1; corpo = linhas;
  }
  if (iDesc < 0) iDesc = [0, 1, 2].find((i) => i !== iData && i !== iVal);
  return corpo.map((r) => ({ data: dataBR(r[iData]), desc: String(r[iDesc] || '').trim(), valor: Math.abs(valorNum(r[iVal])), neg: valorNum(r[iVal]) < 0 }))
    .filter((x) => x.data && Number.isFinite(x.valor) && x.valor > 0 && !x.neg && !/pagamento|estorno/i.test(x.desc));
}

/** Regra que vale para uma linha de extrato (primeira que bate). */
export function regraPara(L, ident, valor) {
  const lado = valor > 0 ? 'C' : 'D';
  return L.regras.find((r) => r.lado === lado && norm(ident).includes(norm(r.contem))) || null;
}

/**
 * Aplica um extrato: dá baixa no que estava em aberto (mesmo valor, mesmo lado,
 * até 12 dias, mesmo cliente quando a regra indica) e lança o resto pelas regras.
 * Linhas já importadas antes (mesma conta, data, valor e identificação) são puladas.
 */
export function aplicarExtrato(L, contaId, linhas, novoId) {
  const N = criarNucleo(L);
  let baixas = 0, novos = 0, repetidos = 0, semRegra = 0;
  const usados = new Set();
  const chave = (d, v, i) => `${contaId}|${d}|${r2(Math.abs(v))}|${norm(i)}`;
  const ja = new Set(L.lanc.filter((l) => l.extrato).map((l) => l.extrato));
  for (const x of linhas) {
    const k = chave(x.data, x.valor, x.ident);
    if (ja.has(k)) { repetidos++; continue; }
    const rg = regraPara(L, x.ident, x.valor);
    const alvo = rg ? rg.quem : '';
    const ab = L.lanc.filter((l) => !l.pago && !usados.has(l.id) && !N.ehCartao(l) && Math.abs(l.valor - Math.abs(x.valor)) < 0.01
      && (N.grupo(l) === 'receita') === (x.valor > 0) && U.dias(l.venc, x.data) <= 12 && (!alvo.startsWith('c:') || l.cliente === alvo.slice(2)))
      .sort((a, b) => U.dias(a.venc, x.data) - U.dias(b.venc, x.data))[0];
    if (ab) { ab.pago = x.data; ab.conta = ab.conta || contaId; ab.extrato = k; usados.add(ab.id); baixas++; ja.add(k); continue; }
    const cat = rg ? rg.cat : (x.valor > 0 ? 'aporte' : 'outras');
    if (!rg) semRegra++;
    const desc = rg && (cat === 'retirada' || cat === 'aporte') ? (cat === 'retirada' ? 'Pix para ' : 'Pix de ') + (N.SOC[alvo.slice(2)] || x.ident) : x.ident || x.tipo;
    const comp = rg && rg.comp ? U.addMes(x.data.slice(0, 7), rg.comp) : x.data.slice(0, 7);
    const l = { id: novoId(), conta: contaId, cat, desc: rg && rg.comp ? `NF ${U.mesLabel(comp)} — ${x.ident}` : desc, comp, venc: x.data, pago: x.data, valor: r2(Math.abs(x.valor)), origem: 'extrato', extrato: k };
    if (!rg || rg.comp) l.revisar = true;   // sem regra, ou competência deduzida: conferir
    N.setQuem(l, alvo);
    L.lanc.push(l); ja.add(k); novos++;
  }
  const ult = linhas.map((x) => x.data).sort().pop();
  if (ult && (!L.extratos[contaId] || ult > L.extratos[contaId])) L.extratos[contaId] = ult;
  return { baixas, novos, repetidos, semRegra };
}

/** Aplica uma fatura de cartão: cada compra vira lançamento do dono do cartão; depois casa as notas. */
export function aplicarFatura(L, cartaoId, mesFatura, linhas, novoId) {
  const N = criarNucleo(L), c = N.conta(cartaoId);
  let novos = 0, repetidos = 0;
  const ja = new Set(L.lanc.filter((l) => l.conta === cartaoId).map((l) => `${l.venc}|${r2(l.valor)}|${norm(l.desc)}`));
  for (const x of linhas) {
    const k = `${x.data}|${r2(x.valor)}|${norm(x.desc)}`;
    if (ja.has(k)) { repetidos++; continue; }
    const rg = L.regras.find((r) => r.lado === 'D' && norm(x.desc).includes(norm(r.contem)) && CATS.find((cc) => cc.id === r.cat && cc.grupo === 'despesa'));
    const l = { id: novoId(), conta: cartaoId, cat: rg ? rg.cat : 'outras', desc: x.desc, comp: x.data.slice(0, 7), venc: x.data, pago: x.data, valor: r2(x.valor), origem: 'fatura' };
    N.setQuem(l, rg && rg.quem ? rg.quem : (c.dono ? 's:' + c.dono : ''));
    if (!rg) l.revisar = true;
    L.lanc.push(l); ja.add(k); novos++;
  }
  if (!L.faturas[cartaoId] || mesFatura > L.faturas[cartaoId]) L.faturas[cartaoId] = mesFatura;
  const casadas = N.casar();
  return { novos, repetidos, casadas };
}
