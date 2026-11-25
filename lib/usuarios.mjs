/**
 * Usuários do site — um login e uma senha por pessoa, sem servidor.
 * (Mesmo modelo do heli-contas, com um nível só: os dois sócios veem tudo.)
 *
 * Os dados são cifrados com uma chave sorteada, guardada só em local/segredos.json.
 * Cada usuário recebe, no meta.json público, um envelope com essa chave trancado
 * pela chave dele (PBKDF2 da senha). Login + senha destrancam o envelope no
 * navegador; nada vai a servidor algum.
 *
 *  - No meta.json o login aparece só como hash; nome e login vão dentro do envelope.
 *  - Remover um usuário sorteia chave nova e recifra tudo.
 *  - local/segredos.json guarda, por usuário, a chave derivada da senha (não a senha).
 */
import { b64, novoSalt, derivarBits, importarChave, cifrar, paraBytes, chaveAleatoria, idDoLogin } from './crypto.mjs';
import { gerarSenha } from './senhas.mjs';

export const normalizarLogin = (s) => String(s || '').trim().toLowerCase();
export const loginValido = (s) => /^[a-z0-9][a-z0-9._-]{1,31}$/.test(s);

const novoIdChave = () => b64.from(crypto.getRandomValues(new Uint8Array(9))).replace(/[+/=]/g, '');

export function rotacionarChave(seg) {
  seg.chaveDados = b64.from(chaveAleatoria());
  seg.idChave = novoIdChave();
  return seg;
}

export function garantirChave(seg) {
  seg = seg || {};
  if (!seg.chaveDados || !seg.idChave) rotacionarChave(seg);
  seg.usuarios = seg.usuarios || {};
  return seg;
}

export const temUsuarios = (seg) => !!seg?.chaveDados && Object.keys(seg.usuarios || {}).length > 0;

async function definirSenha(u, senha) {
  const salt = novoSalt();
  u.salt = b64.from(salt);
  u.kek = b64.from(await derivarBits(senha, salt));
  u.senhaDefinidaEm = new Date().toISOString();
}

/**
 * Cria o usuário com a senha dada (ou sorteada) e devolve a senha.
 * O login deve ser o id do sócio (miguel, arnaldo): é assim que o site sabe
 * quem enviou uma nota e quais cartões são dele.
 */
export async function criarUsuario(seg, login, nome, senhaDada = null) {
  login = normalizarLogin(login);
  if (!loginValido(login)) throw new Error('Login inválido: use 2 a 32 letras minúsculas, números, ponto, hífen ou sublinhado.');
  if (!String(nome || '').trim()) throw new Error('Informe o nome da pessoa.');
  garantirChave(seg);
  if (seg.usuarios[login]) throw new Error(`O usuário "${login}" já existe. Para trocar a senha:  node guarantee.mjs usuario senha ${login}`);
  const u = { nome: String(nome).trim(), criadoEm: new Date().toISOString() };
  const senha = senhaDada || gerarSenha();
  await definirSenha(u, senha);
  seg.usuarios[login] = u;
  return senha;
}

export async function trocarSenha(seg, login, senhaDada = null) {
  const u = seg?.usuarios?.[normalizarLogin(login)];
  if (!u) throw new Error(`Usuário "${login}" não encontrado.`);
  const senha = senhaDada || gerarSenha();
  await definirSenha(u, senha);
  return senha;
}

export function removerUsuario(seg, login) {
  login = normalizarLogin(login);
  if (!seg?.usuarios?.[login]) throw new Error(`Usuário "${login}" não encontrado.`);
  delete seg.usuarios[login];
  rotacionarChave(seg);
}

/** Envelopes publicados no meta.json: { idDoLogin: { salt, iv, ct } }. */
export async function montarAcessos(seg) {
  const acessos = {};
  for (const [login, u] of Object.entries(seg.usuarios || {})) {
    const kek = await importarChave(b64.to(u.kek));
    const conteudo = { login, nome: u.nome, k: seg.chaveDados };
    acessos[await idDoLogin(login)] = { salt: u.salt, ...(await cifrar(kek, paraBytes(conteudo))) };
  }
  return acessos;
}

export const listarUsuarios = (seg) =>
  Object.entries(seg?.usuarios || {}).map(([login, u]) => ({ login, nome: u.nome, senhaDefinidaEm: u.senhaDefinidaEm }));
