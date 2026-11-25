# Guarantee — sistema financeiro

Dois pedaços, mesmo desenho do `heli-contas`:

| Onde | O quê | Quem usa |
|---|---|---|
| **Painel** (PC, `painel.bat`) | importa extrato e fatura, lança, corrige, anexa notas, pacote do contador, publica | Miguel |
| **Site** (`docs/`, GitHub Pages) | celular: fotografar nota do cartão + conferir o mês (só leitura) | os dois sócios |

## Segurança em uma linha por item

- Os dados em claro vivem **só** em `local/` (fora do git): `ledger.json`, `segredos.json`, `fotos/`, `semente.json`.
- O site publica o ledger e as fotos **cifrados** (AES-256-GCM). Cada usuário tem um envelope com a chave dos dados, aberto pela senha dele (PBKDF2-SHA256, 600 mil iterações). Login aparece no `meta.json` só como hash.
- O celular envia nota cifrando com a **chave pública** (RSA-OAEP-3072 + AES-256-GCM). O recebedor (Cloudflare Worker + R2) guarda bytes que não consegue ler; só a chave privada em `local/segredos.json` abre.
- O painel roda só em `127.0.0.1`, com um token novo a cada execução.
- O código é público e **não tem cadastro da empresa**: clientes, regras e PGDAS vêm de `local/semente.json` no `init`.

## Comandos (dentro desta pasta)

```
node guarantee.mjs init                         uma vez: cria local/ a partir de local/semente.json
node guarantee.mjs usuario listar
node guarantee.mjs usuario criar <login> "<Nome>"   login = id do sócio (miguel, arnaldo)
node guarantee.mjs usuario senha <login>            gera senha nova
node guarantee.mjs usuario remover <login>          troca a chave dos dados
node guarantee.mjs painel                       (ou painel.bat)
node guarantee.mjs build                        recifra docs/ sem publicar
node guarantee.mjs publish                      build + commit + push
node guarantee.mjs envio                        gera o recebedor de notas (Cloudflare)
node guarantee.mjs envio-config <url>           registra o endereço do recebedor
```

Senhas são geradas aqui (24 caracteres) e aparecem uma vez no terminal; fora de um terminal
vão para `local/senhas-para-entregar.txt` — repasse por canal privado e apague o arquivo.
Depois de mexer em usuário, **publique**.

## Ligar o envio de notas pelo celular (uma vez)

```
node guarantee.mjs envio
cd envio
npx wrangler login
npx wrangler r2 bucket create guarantee-envios
npx wrangler secret put SEGREDO_ADMIN      ← cole "envioSegredo" de local/segredos.json
npx wrangler deploy
cd ..
node guarantee.mjs envio-config https://guarantee-envios.<sua-conta>.workers.dev
node guarantee.mjs publish
```

O painel busca as notas sozinho ao abrir (e no botão **Importar → Buscar notas agora**),
guarda a foto em `local/fotos/` e apaga do recebedor. Cada nota vira compra do cartão na hora
("a conferir c/ fatura"); quando a fatura é importada, a linha correspondente (mesmo cartão,
mesmo valor, até 3 dias) só confere a compra em vez de criar outra.

Enquanto o painel não busca, o celular mostra as "Enviadas" a partir de uma cópia cifrada com a
chave do site (`espelhos/` no R2), em qualquer aparelho. Excluir uma nota pelo celular manda um
pedido cifrado pelo mesmo caminho; o painel aplica na próxima busca.

## Estrutura

```
app/        código comum ao painel e ao site (nucleo.mjs = contas; ui.mjs = peças de tela)
painel/     página do painel (servida por lib/painel.mjs)
docs/       site publicado: index.html + cópia de app/ + data/ cifrado (gerado no build)
envio/      recebedor de notas (Cloudflare Worker)
lib/        CLI: cripto, usuários, build, publicação, envio
local/      NUNCA vai para o git
```

Regras de negócio e decisões: `../docs/decisoes.md`.
