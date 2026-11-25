/**
 * Painel local (PC). Mesmo desenho do heli-contas:
 *  - servidor só em 127.0.0.1;
 *  - toda chamada exige um token sorteado a cada execução.
 * Os dados em claro nunca saem da máquina; o site recebe só o que for publicado, cifrado.
 *
 * A página mantém uma cópia do ledger, faz as contas com app/nucleo.mjs e grava o
 * ledger inteiro a cada alteração (um usuário só, local).
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { P, RAIZ, lerLedger, gravarLedger, novoId } from './io.mjs';
import { publicar } from './publicar.mjs';
import { configuracaoEnvio, configurarEnvio, listarEnvios, puxarEnvios, apagarFotoLocal } from './envio.mjs';
import { CATS } from '../app/nucleo.mjs';

const PORTA_PADRAO = 7790;
const LIMITE_CORPO = 30 * 1024 * 1024;
const token = () => [...crypto.getRandomValues(new Uint8Array(24))].map((b) => b.toString(16).padStart(2, '0')).join('');
const MIMES = { '.html': 'text/html; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.heic': 'image/heic', '.pdf': 'application/pdf' };

function lerCorpo(req) {
  return new Promise((res, rej) => {
    const partes = []; let total = 0;
    req.on('data', (c) => { total += c.length; if (total > LIMITE_CORPO) { rej(new Error('Requisição grande demais.')); req.destroy(); return; } partes.push(c); });
    req.on('end', () => { try { res(partes.length ? JSON.parse(Buffer.concat(partes).toString('utf8')) : {}); } catch { rej(new Error('Corpo inválido.')); } });
    req.on('error', rej);
  });
}
const json = (res, codigo, corpo) => { res.writeHead(codigo, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }); res.end(JSON.stringify(corpo)); };

/** Conferência mínima antes de gravar o ledger que veio da página. */
function validarLedger(L) {
  const erros = [];
  if (!L || typeof L !== 'object') return ['Ledger ausente.'];
  for (const k of ['socios', 'clientes', 'contas', 'regras', 'lanc', 'notas', 'faturas', 'extratos', 'pgdas']) if (L[k] === undefined) erros.push(`Campo ${k} ausente.`);
  if (erros.length) return erros;
  const cats = new Set(CATS.map((c) => c.id)), ids = new Set();
  for (const l of L.lanc) {
    if (!l.id || ids.has(l.id)) erros.push(`Lançamento sem id ou repetido (${l.desc}).`); ids.add(l.id);
    if (!(l.valor > 0)) erros.push(`Valor inválido em "${l.desc}".`);
    if (!cats.has(l.cat)) erros.push(`Categoria desconhecida em "${l.desc}".`);
    if (!/^\d{4}-\d{2}$/.test(l.comp || '')) erros.push(`Competência inválida em "${l.desc}".`);
  }
  return erros.slice(0, 5);
}

function salvarFoto({ dataB64, mime }) {
  const ext = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'application/pdf': '.pdf' }[mime] || '.jpg';
  const arquivo = novoId('f') + ext;
  fs.mkdirSync(P.fotos, { recursive: true });
  fs.writeFileSync(path.join(P.fotos, arquivo), Buffer.from(String(dataB64 || ''), 'base64'));
  return arquivo;
}

/** Há alteração no ledger ainda não publicada? (ledger mais novo que o arquivo cifrado) */
function estadoPublicacao() {
  const enc = path.join(P.dados, 'ledger.enc');
  const a = fs.statSync(P.ledger).mtimeMs, b = fs.existsSync(enc) ? fs.statSync(enc).mtimeMs : 0;
  return { alterado: a > b, publicadoEm: b ? new Date(b).toISOString() : null };
}

export function abrirPainel({ porta = PORTA_PADRAO, abrirNavegador = true } = {}) {
  if (!fs.existsSync(P.ledger)) throw new Error('Ledger local não encontrado. Rode primeiro:  node guarantee.mjs init');
  const chave = token();
  const pagina = path.join(RAIZ, 'painel', 'index.html');

  const servidor = http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://127.0.0.1');
    const rota = url.pathname;
    const host = (req.headers.host || '').split(':')[0];
    if (host !== '127.0.0.1' && host !== 'localhost') return json(res, 403, { erro: 'Acesso local apenas.' });

    if (rota === '/') {
      if (url.searchParams.get('k') !== chave) { res.writeHead(403, { 'content-type': 'text/plain; charset=utf-8' }); return res.end('Link inválido. Abra o painel com: painel.bat'); }
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
      return res.end(fs.readFileSync(pagina, 'utf8').replace('__TOKEN__', chave));
    }
    // código compartilhado com o site (sem dado nenhum)
    if (rota.startsWith('/app/') && req.method === 'GET') {
      const arq = path.join(P.app, path.basename(rota));
      if (!/\.(mjs|js|css)$/.test(arq) || !fs.existsSync(arq)) return json(res, 404, { erro: 'não encontrado' });
      res.writeHead(200, { 'content-type': MIMES[path.extname(arq)], 'cache-control': 'no-store' });
      return fs.createReadStream(arq).pipe(res);
    }

    if (req.headers['x-token'] !== chave && url.searchParams.get('k') !== chave) return json(res, 403, { erro: 'Token inválido.' });

    try {
      if (rota === '/api/estado' && req.method === 'GET') {
        return json(res, 200, { ledger: lerLedger(), publicar: estadoPublicacao(), envio: configuracaoEnvio() });
      }
      if (rota === '/api/foto' && req.method === 'GET') {
        const arq = path.basename(url.searchParams.get('arquivo') || '');
        const f = path.join(P.fotos, arq);
        if (!arq || !fs.existsSync(f)) return json(res, 404, { erro: 'Foto não encontrada.' });
        res.writeHead(200, { 'content-type': MIMES[path.extname(f).toLowerCase()] || 'application/octet-stream', 'cache-control': 'private, max-age=3600' });
        return fs.createReadStream(f).pipe(res);
      }
      if (rota === '/api/envios' && req.method === 'GET') return json(res, 200, await listarEnvios());

      if (req.method !== 'POST') return json(res, 404, { erro: 'Rota desconhecida.' });
      const corpo = await lerCorpo(req);

      if (rota === '/api/ledger') {
        const erros = validarLedger(corpo.ledger);
        if (erros.length) return json(res, 400, { ok: false, erros });
        gravarLedger(corpo.ledger);
        return json(res, 200, { ok: true, publicar: estadoPublicacao() });
      }
      if (rota === '/api/foto') return json(res, 200, { ok: true, arquivo: salvarFoto(corpo) });
      if (rota === '/api/foto/apagar') { apagarFotoLocal(corpo.arquivo); return json(res, 200, { ok: true }); }
      if (rota === '/api/envios/puxar') return json(res, 200, await puxarEnvios());
      if (rota === '/api/envio/config') return json(res, 200, configurarEnvio(corpo));
      if (rota === '/api/publicar') { const r = await publicar(); return json(res, 200, { ...r, publicar: estadoPublicacao() }); }
      if (rota === '/api/encerrar') { json(res, 200, { ok: true }); setTimeout(() => process.exit(0), 200); return; }
      return json(res, 404, { erro: 'Rota desconhecida.' });
    } catch (e) {
      return json(res, 500, { ok: false, erros: [e.message] });
    }
  });

  return new Promise((resolve, reject) => {
    servidor.on('error', (e) => reject(e.code === 'EADDRINUSE' ? new Error(`A porta ${porta} já está em uso. Feche o outro painel ou rode:  node guarantee.mjs painel ${porta + 1}`) : e));
    servidor.listen(porta, '127.0.0.1', () => {
      const endereco = `http://127.0.0.1:${porta}/?k=${chave}`;
      console.log('\n  Painel aberto em:\n  ' + endereco + '\n');
      console.log('  Deixe esta janela aberta enquanto usa o painel. Para encerrar: Ctrl+C.\n');
      if (abrirNavegador) spawn('cmd', ['/c', 'start', '""', endereco], { detached: true, stdio: 'ignore' }).unref();
      resolve({ servidor, endereco });
    });
  });
}
