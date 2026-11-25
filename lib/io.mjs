// Leitura/escrita do ledger local e utilitários de formato.
import fs from 'node:fs';
import path from 'node:path';

export const RAIZ = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
export const P = {
  local: path.join(RAIZ, 'local'),
  ledger: path.join(RAIZ, 'local', 'ledger.json'),
  segredos: path.join(RAIZ, 'local', 'segredos.json'),
  fotos: path.join(RAIZ, 'local', 'fotos'),
  docs: path.join(RAIZ, 'docs'),
  dados: path.join(RAIZ, 'docs', 'data'),
  fotosEnc: path.join(RAIZ, 'docs', 'data', 'fotos'),
  app: path.join(RAIZ, 'app'),
};

/**
 * Ledger vazio. O cadastro da empresa (sócios, clientes, contas, regras, PGDAS)
 * NÃO fica no código, que é público: vem de local/semente.json no init e depois
 * é editado pelo painel (Ajustes).
 */
export function ledgerInicial() {
  const base = {
    v: 1, org: 'Guarantee', criadoEm: new Date().toISOString(),
    socios: {}, clientes: [], contas: [],
    // regras: "contem" é procurado na descrição do extrato; lado C = entrada, D = saída.
    // quem: c:<cliente> | s:<socio> | 5050 | '' ; comp: -1 = competência no mês anterior ao pagamento
    regras: [],
    pgdas: {},      // receita do mês segundo o extrato do Simples: { 'AAAA-MM': [interno, exterior] }
    lanc: [], notas: [],
    faturas: {},    // { contaCartao: 'AAAA-MM' } última fatura importada
    extratos: {},   // { contaBanco: 'AAAA-MM-DD' } última data de extrato importada
  };
  const semente = path.join(P.local, 'semente.json');
  if (fs.existsSync(semente)) Object.assign(base, JSON.parse(fs.readFileSync(semente, 'utf8')));
  return base;
}

export function lerLedger() {
  if (!fs.existsSync(P.ledger)) throw new Error('Ledger local não encontrado. Rode primeiro:  node guarantee.mjs init');
  return JSON.parse(fs.readFileSync(P.ledger, 'utf8'));
}

export function gravarLedger(l) {
  fs.mkdirSync(P.local, { recursive: true });
  const tmp = P.ledger + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(l, null, 2), 'utf8');
  fs.renameSync(tmp, P.ledger);
}

export function lerSegredos() {
  if (!fs.existsSync(P.segredos)) return null;
  return JSON.parse(fs.readFileSync(P.segredos, 'utf8'));
}

export function gravarSegredos(s) {
  fs.mkdirSync(P.local, { recursive: true });
  fs.writeFileSync(P.segredos, JSON.stringify(s, null, 2), 'utf8');
}

export const brl = (n) => (n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 });

export const hojeISO = () => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

/** Identificador curto e único para lançamentos e notas. */
export const novoId = (prefixo = 'l') =>
  prefixo + Date.now().toString(36) + [...crypto.getRandomValues(new Uint8Array(3))].map((b) => b.toString(16).padStart(2, '0')).join('');
