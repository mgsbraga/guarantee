#!/usr/bin/env node
// Guarantee — sistema financeiro. Uso: node guarantee.mjs <comando>
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { P, lerLedger, gravarLedger, lerSegredos, gravarSegredos, ledgerInicial } from './lib/io.mjs';
import { garantirChave, criarUsuario, trocarSenha, removerUsuario, listarUsuarios } from './lib/usuarios.mjs';
import { build } from './lib/build.mjs';
import { publicar } from './lib/publicar.mjs';
import { abrirPainel } from './lib/painel.mjs';
import { montarWorker, configurarEnvio } from './lib/envio.mjs';
import { garantirChaves } from './lib/chaves.mjs';

const [cmd, ...args] = process.argv.slice(2);

function entregarSenha(itens) {
  const texto = itens.map((i) => `  ${i.nome}\n    login:  ${i.login}\n    senha:  ${i.senha}`).join('\n\n');
  if (process.stdout.isTTY) {
    console.log('\n  ── Senha(s) — anote agora, não aparecem de novo ─────────\n\n' + texto + '\n\n  Repasse por um canal privado.\n');
    return;
  }
  const arq = path.join(P.local, 'senhas-para-entregar.txt');
  fs.appendFileSync(arq, `${new Date().toLocaleString('pt-BR')}\n\n${texto}\n\nRepasse por um canal privado e APAGUE este arquivo depois.\n\n`, 'utf8');
  console.log('\n  Senha(s) gravada(s) em local/senhas-para-entregar.txt. Repasse e apague o arquivo depois.\n');
  if (!process.env.GUARANTEE_NAO_ABRIR) { try { spawn('notepad', [arq], { detached: true, stdio: 'ignore' }).unref(); } catch { /* sem bloco de notas */ } }
}

async function cmdInit() {
  if (fs.existsSync(P.ledger)) { console.log('  Já configurado: local/ledger.json existe. Nada feito.'); return; }
  const L = ledgerInicial();
  if (!Object.keys(L.socios).length) throw new Error('Falta local/semente.json com o cadastro (sócios, clientes, contas, regras). Veja o README.');
  gravarLedger(L);
  gravarSegredos(garantirChave(lerSegredos()));
  await garantirChaves();   // par de chaves do envio de notas
  console.log('  ✓ local/ criado (ledger, chave dos dados, chaves do envio).');
  console.log('  Próximo:  node guarantee.mjs usuario criar miguel "Miguel"');
}

async function cmdUsuario() {
  const [acao, login, ...resto] = args;
  const seg = garantirChave(lerSegredos());
  if (!acao || acao === 'listar') {
    const us = listarUsuarios(seg);
    if (!us.length) console.log('  Nenhum usuário.');
    us.forEach((u) => console.log(`  ${u.login.padEnd(12)} ${u.nome.padEnd(18)} senha definida em ${(u.senhaDefinidaEm || '').slice(0, 10)}`));
    return;
  }
  if (acao === 'criar') {
    const nome = resto.join(' ').replace(/^"|"$/g, '');
    const senha = await criarUsuario(seg, login, nome);
    gravarSegredos(seg); entregarSenha([{ nome, login, senha }]);
    console.log('  Publique para valer no site:  node guarantee.mjs publish'); return;
  }
  if (acao === 'senha') { const senha = await trocarSenha(seg, login); gravarSegredos(seg); entregarSenha([{ nome: seg.usuarios[login].nome, login, senha }]); return; }
  if (acao === 'remover') { removerUsuario(seg, login); gravarSegredos(seg); console.log(`  ✓ ${login} removido. Chave dos dados trocada; publique para valer.`); return; }
  throw new Error('Use: usuario listar | criar <login> "<Nome>" | senha <login> | remover <login>');
}

async function cmdEnvio() {
  const r = await montarWorker();
  console.log(`\n  ✓ ${path.relative(process.cwd(), r.arquivo)} gerado${r.chaveNova ? ' (par de chaves novo)' : ''}. Site autorizado: ${r.origem || '(sem docs/CNAME)'}\n`);
  console.log('  De dentro de sistema/envio:');
  console.log('    npx wrangler login');
  console.log('    npx wrangler r2 bucket create guarantee-envios');
  console.log('    npx wrangler secret put SEGREDO_ADMIN     ← cole o segredo de local/segredos.json (envioSegredo)');
  console.log('    npx wrangler deploy');
  console.log('\n  Depois:  node guarantee.mjs envio-config <URL que o deploy imprimiu>  e publique.\n');
}

const comandos = {
  init: cmdInit,
  usuario: cmdUsuario,
  painel: async () => { await abrirPainel({ porta: Number(args[0]) || undefined }); },
  build: () => build(),
  publish: async () => { const r = await publicar(); console.log('  ' + r.mensagem); if (!r.ok) process.exitCode = 1; },
  envio: cmdEnvio,
  'envio-config': async () => { if (!args[0]) throw new Error('Use: envio-config <url do worker>'); configurarEnvio({ url: args[0] }); console.log('  ✓ Endereço do recebedor registrado. Publique para o celular passar a enviar.'); },
  ledger: () => { const L = lerLedger(); console.log(`  ${L.lanc.length} lançamentos · ${L.notas.length} notas · ${L.clientes.length} clientes`); },
};

const f = comandos[cmd];
if (!f) {
  console.log(`
  Guarantee — sistema financeiro

    node guarantee.mjs init                        configuração inicial (uma vez)
    node guarantee.mjs usuario listar|criar|senha|remover
    node guarantee.mjs painel                      abre o painel no navegador (ou painel.bat)
    node guarantee.mjs build                       recifra docs/ sem publicar
    node guarantee.mjs publish                     build + commit + push
    node guarantee.mjs envio                       gera o recebedor de notas (Cloudflare)
    node guarantee.mjs envio-config <url>          registra o endereço do recebedor
`);
} else {
  try { await f(); } catch (e) { console.error('\n  ✗ ' + e.message + '\n'); process.exitCode = 1; }
}
