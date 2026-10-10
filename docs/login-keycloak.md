# Login real com Keycloak: relatório e guia

## Como funciona

O servidor do AQR é o cliente OIDC (padrão BFF): código de autorização + PKCE (S256), `state` e `nonce`.

1. `GET /api/auth/login?returnTo=/pagina` → redireciona ao Keycloak (guarda `state`, `nonce` e o verificador PKCE só no servidor; o navegador recebe apenas o cookie `aqr_login` com o `state`).
2. Keycloak autentica a pessoa e volta em `GET /api/auth/callback`. A biblioteca troca o código, valida assinatura (JWKS), emissor, público, expiração, `state` e `nonce`.
3. A conta do AQR é localizada pelo **`sub` do token** (id imutável do usuário no Keycloak, gravado em `accounts.keycloak_sub`), **nunca** pelo `preferred_username`, que pode ser trocado ou reaproveitado. Sem vínculo pelo `sub` ninguém entra, nem que o nome coincida (`vinculo_pendente`; se a conta já está vinculada a outro `sub`, `vinculo_divergente`). A conta precisa estar ativa. O papel (`administrador`/`analista`) vem do banco do AQR, não do Keycloak.

   **Como o vínculo nasce (o `sub` só é gravado por quem tem credencial de serviço, nunca pelo próprio login):** (a) conta criada pela administração: o `sub` é o id do usuário que o backend acabou de criar no Keycloak; (b) conta antiga: administrador usa "Sincronizar com o Keycloak" (confere que o **e-mail** do Keycloak é o da conta, senão recusa) ou o operador roda `npm run admin:vincular -- --usuario <login>` / `--todos` no servidor (contas sem e-mail, como o primeiro administrador, exigem `--confirmo-identidade`). O vínculo é definitivo: o banco recusa alterá-lo e cada `sub` só pertence a uma conta. **Migração de contas existentes:** a migração 0004 só adiciona a coluna (nula); contas antigas ficam *sem acesso* até serem vinculadas por um dos dois caminhos.
4. O servidor cria uma sessão (guardada no banco do AQR, só o hash) e entrega só um cookie `aqr_sessao` (aleatório, `HttpOnly`, `SameSite=Lax`, `Secure` em HTTPS, 8 h). **Nenhum token vai ao navegador.**
5. A cada pedido a conta é consultada de novo: desativar ou mudar o papel vale na hora.
6. `POST /api/auth/logout` apaga a sessão do AQR e, **pelo backend e com a credencial de serviço**, encerra as sessões da pessoa no Keycloak (`POST /users/{sub}/logout`); a resposta é só `{ "keycloakEncerrado": true|false }` e o frontend volta para `/entrar`. **Nenhum token (nem `id_token`) é guardado ou enviado ao navegador**: o `id_token_hint` deixou de ser necessário. Se o Keycloak estiver fora do ar, a sessão do AQR cai do mesmo jeito e o registro do logout anota `keycloak_nao_encerrado`.

Proteções: `Origin` obrigatório e igual a `APP_BASE_URL` em pedidos `POST/PUT/PATCH/DELETE` (CSRF); `returnTo` só aceita caminhos internos; `/api/comparisons` exige sessão; `/api/admin/*` exige papel administrador; HTTP só é aceito para `localhost`.

**Biblioteca:** `openid-client` 6.8.8 (OpenID Foundation/panva, certificada). Justificativa: o protocolo OIDC e a validação de tokens não devem ser reimplementados; não há criptografia própria no código.

## Configuração

| Variável | Uso |
|---|---|
| `AUTH_MODE=keycloak` | liga o login real (padrão `visual`) |
| `KEYCLOAK_ISSUER` | URL do realm, ex.: `http://localhost:8080/realms/aqr` |
| `KEYCLOAK_CLIENT_ID` | ex.: `aqr-web` (cliente público com PKCE) |
| `KEYCLOAK_CLIENT_SECRET` | opcional (cliente confidencial) |
| `KEYCLOAK_ADMIN_CLIENT_ID` / `KEYCLOAK_ADMIN_CLIENT_SECRET` | credencial de serviço do AQR (cliente confidencial `aqr-admin`, com `manage-users` e `view-users` do `realm-management`); **obrigatória** com `AUTH_MODE=keycloak`; só o servidor a conhece |
| `APP_BASE_URL` | origem pública do site, ex.: `http://localhost:5173` (o callback é `APP_BASE_URL/api/auth/callback`) |

`AUTH_MODE=keycloak` não combina com `ADMIN_API_MODE=dev`. Em modo `visual` nada muda (login só visual).

## Rodando localmente (Keycloak autohospedado + Mailpit)

```bash
docker compose -f docker/dev/compose.yml up -d     # Keycloak 26.8.0 + Postgres + Mailpit
npm run admin:criar -- --usuario admin --nome "Admin Local"
AUTH_MODE=keycloak KEYCLOAK_ISSUER=http://localhost:8080/realms/aqr KEYCLOAK_CLIENT_ID=aqr-web \
  APP_BASE_URL=http://localhost:5173 npm run dev
```

- Keycloak: http://localhost:8080 (console: `admin` / `admin`). Dados no volume Postgres `keycloak-db`; para reimportar o realm: `docker compose -f docker/dev/compose.yml down -v`.
- **Mailpit** (caixa de e-mail falsa): http://localhost:8025. O Keycloak envia a ele o e-mail de "Esqueceu a senha?" (SMTP `mailpit:1025` no realm).
- Cliente de serviço `aqr-admin` (segredo de desenvolvimento `aqr-admin-dev-secret`; use `KEYCLOAK_ADMIN_CLIENT_ID=aqr-admin KEYCLOAK_ADMIN_CLIENT_SECRET=aqr-admin-dev-secret`). Usuários do realm (`docker/dev/realm/aqr-realm-dev.json`, **só local**): `admin` / `admin-dev-123`, `recuperacao` / `recuperacao-dev-123` e `semconta` / `semconta-dev-123` (autentica no Keycloak, mas não tem conta no AQR → bloqueado). O analista `ana` **não** vem no realm: o E2E a cria pela administração, como no uso real.
- Teste ponta a ponta: `AUTH_MODE=keycloak ... PORT=3100 DATABASE_PATH=<temporário> npx tsx server/main.ts` e, em outro terminal, `node scripts/e2e-keycloak.mjs <original.pdf> <revisado.pdf>`.

## Provisionamento da identidade (conta do AQR → usuário no Keycloak)

O backend usa a API Admin do Keycloak com a credencial de serviço (`client_credentials`, via `openid-client`). **Nenhuma senha passa pelo AQR nem pelo navegador**: a pessoa define a própria senha por um link enviado pelo próprio Keycloak.

| Ação do administrador | O que acontece |
|---|---|
| Criar conta (`POST /api/admin/accounts`, **e-mail obrigatório**) | cria o usuário no Keycloak (ativo, sem senha) → grava a conta no AQR (se falhar, apaga o usuário do Keycloak) → envia o e-mail de convite (UPDATE_PASSWORD, 72 h). Keycloak fora do ar: nenhuma conta é criada (502). Só o e-mail falhou: conta criada e resposta com `aviso`; reenvie pelo botão |
| Desativar / reativar | o AQR bloqueia na hora; depois bloqueia/desbloqueia o usuário no Keycloak e encerra as sessões dele. Falha no Keycloak: a conta fica alterada no AQR e a resposta traz `aviso` |
| Editar | nome e e-mail seguem para o Keycloak |
| `POST /api/admin/accounts/:id/redefinir-senha` | envia o link para definir uma nova senha (conta ativa e com e-mail) |
| `POST /api/admin/accounts/:id/sincronizar` | alinha o Keycloak com a conta: cria o usuário e o convite de contas antigas, ou corrige situação e dados |

Na tela: página de criação (e-mail obrigatório) e, na edição, a seção **Acesso ao sistema** com "Enviar link para definir a senha" e "Sincronizar com o Keycloak". Cada passo fica em `access_events` (`identidade.criada`, `convite_enviado`, `senha_redefinicao_enviada`, `bloqueada`, `reativada`, `sincronizada`, `falha`) com quem agiu.

## Sessões e registros

Sessões ficam na tabela `sessions` (só o hash do identificador, sem nenhum token; migração 0005 apagou as antigas e removeu a coluna `id_token`) e sobrevivem a reinício do servidor. Redefinir a senha de uma conta pelo administrador **encerra todas as sessões dela** no AQR e no Keycloak.

Três registros, todos só de inserção, lidos **só por administradores** (`GET /api/admin/access-events`, `GET /api/admin/comparison-events`, com `page`, `pageSize` até 100, `evento` e `usuario`; analista recebe 403, sem sessão 401):

- `access_events`: logins (`login.ok`, `sem_conta`, `conta_inativa`, `falha`, `vinculo_pendente`, `vinculo_divergente`), `logout` e os passos de identidade (`identidade.*`), com usuário, conta, quem agiu, IP e detalhe.
- `comparison_events`: cada comparação de PDFs: `comparacao.enviada` (quem, quando, **nome** dos dois arquivos, nunca o conteúdo), `comparacao.concluida` (nº de diferenças) ou `comparacao.falhou` (código do erro).
- `audit_events`: alterações de contas (já existia).

## Produção: travas e bloqueios

**O servidor falha fechado** (`server/config.ts`). Com `NODE_ENV=production` ele **não inicia** se:
- `AUTH_MODE` não for `keycloak` (o login visual aceita qualquer usuário e senha, e `ADMIN_API_MODE=dev` também é recusado);
- `KEYCLOAK_ISSUER` ou `APP_BASE_URL` não forem HTTPS ou apontarem para `localhost`;
- `KEYCLOAK_ADMIN_CLIENT_SECRET` for o segredo de teste do repositório ou tiver menos de 24 caracteres;
- faltarem `KEYCLOAK_*` ou a credencial de serviço.

O **frontend** também falha fechado: no build de produção, se o servidor não responder ou anunciar o modo visual, a tela de login mostra "Não foi possível verificar o sistema de login" e não oferece o login fictício.

**Credenciais de teste fora do que vai a produção:** senhas fixas, `admin/admin`, o segredo `aqr-admin-dev-secret`, o Mailpit e o `start-dev` existem só em `docker/dev/` (compose e `realm/aqr-realm-dev.json`) e em `scripts/e2e-keycloak.mjs`. Para produção há `docker/producao/` (modelo do realm **sem usuários nem segredos** e passo a passo). Não há credencial de teste em `server/`, `src/` nem nas variáveis padrão.

**Ainda dependem de domínio, SMTP e servidor (não resolvíveis no repositório):**
- **Domínio e HTTPS** do Keycloak e do AQR, com certificados.
- **SMTP real** (host, porta, TLS, remetente do domínio da Prefeitura) em *Realm settings → Email*; sem isso convites e recuperação de senha não saem.
- **Keycloak em produção:** `start` (não `start-dev`), `KC_HOSTNAME`, proxy reverso, Postgres com backup, administrador próprio, política de senha e de bloqueio definida pela SEMADES.
- **Segredo da credencial de serviço** gerado no Keycloak e guardado em cofre/variável de ambiente.
- **Vincular o primeiro administrador** (`npm run admin:criar` + `npm run admin:vincular -- --usuario <login> --confirmo-identidade`, depois de conferir a pessoa) e as contas antigas.
- Cookies passam a `Secure` automaticamente com `APP_BASE_URL` em HTTPS.

## Limitações conhecidas (honestas)

- **Confiança no vínculo inicial:** "Sincronizar" e `admin:vincular` confiam no administrador/operador e conferem apenas o **e-mail** do Keycloak; se o e-mail estiver errado no Keycloak, o vínculo errado é definitivo (o banco recusa alterar; corrigir exige intervenção manual no banco por quem tem acesso). `--confirmo-identidade` é uma declaração do operador, sem verificação técnica.
- **Contas antigas ficam sem acesso até serem vinculadas** (é o comportamento seguro; planeje a janela de migração).
- **Sessões** no banco do AQR expiram em 8 h, **sem renovação**. Quem tiver o banco não assume sessões (só há hash) e não encontra tokens.
- **Três sistemas para manter coerentes** (SQLite do AQR, Keycloak, e-mail): falhas parciais geram `aviso` e o botão "Sincronizar com o Keycloak" conclui; não há reconciliação automática periódica. Uma conta desativada no AQR com falha no Keycloak continua sem entrar (o AQR confere a situação a cada pedido).
- **Não há tela** para os registros: `access_events` e `comparison_events` só têm a API de leitura para administradores.
- **Comparações não pertencem a quem as enviou:** `GET/DELETE /api/comparisons/:id` aceitam qualquer pessoa autenticada que conheça o id (UUID aleatório, resultado some em 30 min). Falta restringir ao autor (e ao administrador).
- **Auditoria das comparações** vale só no login real e registra nomes de arquivo (que podem conter dados pessoais): defina a política de retenção. Nada é apagado automaticamente.
- **Encerramento no Keycloak** depende da credencial de serviço estar no ar; sem ela, o login único do Keycloak pode continuar ativo até expirar (a sessão do AQR sempre cai).
- **Auditoria de contas** (`audit_events`) não registra o vínculo nem os convites; esses ficam em `access_events`.
- A tela de login, em modo Keycloak, mostra um botão no lugar dos campos usuário/senha (as credenciais são digitadas só no Keycloak). É a única mudança na tela; **aguarda validação visual**. A interface não foi inspecionada no navegador.
- O E2E real roda só localmente (Docker + Mailpit); falhas de SMTP/Keycloak e a sincronização de conta antiga sem usuário no Keycloak estão cobertas só por testes com provedor falso.

## Verificação com Keycloak real (10/10/2026)

Compose de desenvolvimento (Keycloak 26.8.0 + Postgres + Mailpit) recriado do zero + API em `PORT=3100` + banco novo, com `node scripts/e2e-keycloak.mjs <original.pdf> <revisado.pdf>`. **49 verificações, todas OK** (rodada repetida depois da remoção do `id_token`), incluindo o vínculo pelo `sub`: o administrador recém-criado **não entra** por ter só o nome de usuário igual (`vinculo_pendente`), o operador o vincula com `npm run admin:vincular` (o `sub` real do Keycloak fica gravado) e repetir o comando não faz nada; `ana` nasce vinculada ao id do usuário criado no Keycloak. O restante: recuperação de senha por e-mail, login errado, usuário sem conta, criação com convite no Mailpit (a própria `ana` define a senha), permissões (403), comparação dos PDFs de teste (**18 diferenças**), desativação/reativação refletidas no Keycloak com a sessão caindo na hora, redefinição pelo administrador (que derruba na hora as sessões da `ana`, sem afetar o administrador), sincronização, leitura dos registros de acesso e de comparações pelo administrador (analista recebe 403; a comparação aparece com quem enviou e os nomes dos dois PDFs) e logout pelo backend: a resposta não traz URL nem token, a sessão cai e, no mesmo navegador, o Keycloak volta a pedir a senha; o banco não tem coluna nem valor de token. Também conferido: `NODE_ENV=production` com `AUTH_MODE=visual` (ou sem `AUTH_MODE`) **não inicia** o servidor. Não coberto ao vivo: sincronizar conta antiga sem usuário no Keycloak, falha de SMTP/Keycloak e a interface no navegador (testes com provedor falso e de componente cobrem parte).

## Testes

`server/auth/keycloak-auth.test.ts` (servidor OIDC falso com HTTP e JWT RS256 reais): não autenticado, login correto, login errado (código inválido, público errado, sem cookie), sem conta, `returnTo` malicioso, administrador cria analista, analista sem permissão, desativação imediata, CSRF, logout. Com o provedor de identidade falso (`server/test/fake-identity.ts`): criação com convite, e-mail obrigatório, desfazer o usuário se a conta falhar, Keycloak fora do ar (502), SMTP fora do ar (aviso e reenvio), bloqueio/reativação, sincronização e permissões. Mais `server/config.test.ts` e `KeycloakLogin.test.tsx`.
