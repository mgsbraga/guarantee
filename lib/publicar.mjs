// Cifra, commita e envia. Usado tanto pelo CLI quanto pelo painel.
import { execFileSync } from 'node:child_process';
import { RAIZ, lerLedger, hojeISO } from './io.mjs';
import { build } from './build.mjs';

const git = (...args) => execFileSync('git', args, { cwd: RAIZ, encoding: 'utf8' });

/** Quantos arquivos estão esperando publicação. */
export function pendencias() {
  try {
    const sujo = git('status', '--porcelain', '--', 'docs').trim();
    let naoEnviados = 0;
    try { naoEnviados = Number(git('rev-list', '--count', '@{u}..HEAD').trim()) || 0; } catch { /* sem upstream */ }
    return { arquivos: sujo ? sujo.split('\n').length : 0, commitsNaoEnviados: naoEnviados };
  } catch {
    return { arquivos: 0, commitsNaoEnviados: 0, semGit: true };
  }
}

export async function publicar() {
  await build({ verboso: false });
  try {
    const sujo = git('status', '--porcelain').trim();
    if (!sujo && !pendencias().commitsNaoEnviados) return { ok: true, novidade: false, mensagem: 'Nada novo para publicar.' };
    if (sujo) {
      git('add', '-A');
      const L = lerLedger();
      git('commit', '-m', `dados: ${L.lanc.length} lançamentos, ${L.notas.length} notas — ${hojeISO()}`);
    }
    git('push');
    return { ok: true, novidade: true, mensagem: 'Publicado. O site atualiza em cerca de um minuto.' };
  } catch (e) {
    return { ok: false, mensagem: String(e.stderr || e.message).trim() };
  }
}
