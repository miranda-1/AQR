# Login real com Keycloak: relatório e guia

## Como funciona

O servidor do AQR é o cliente OIDC (padrão BFF): código de autorização + PKCE (S256), `state` e `nonce`.

1. `GET /api/auth/login?returnTo=/pagina` → redireciona ao Keycloak (guarda `state`, `nonce` e o verificador PKCE só no servidor; o navegador recebe apenas o cookie `aqr_login` com o `state`).
2. Keycloak autentica a pessoa e volta em `GET /api/auth/callback`. A biblioteca troca o código, valida assinatura (JWKS), emissor, público, expiração, `state` e `nonce`.
3. O `preferred_username` do token precisa ter **conta ativa no AQR** (tabela `accounts`). O papel (`administrador`/`analista`) vem do banco do AQR, não do Keycloak.
4. O servidor cria uma sessão em memória e entrega só um cookie `aqr_sessao` (aleatório, `HttpOnly`, `SameSite=Lax`, `Secure` em HTTPS, 8 h). **Nenhum token vai ao navegador.**
5. A cada pedido a conta é consultada de novo: desativar ou mudar o papel vale na hora.
6. `POST /api/auth/logout` apaga a sessão e devolve a URL de encerramento do Keycloak (com `id_token_hint`).

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
docker compose -f docker/compose.yml up -d     # Keycloak 26.8.0 + Postgres + Mailpit
npm run admin:criar -- --usuario admin --nome "Admin Local"
AUTH_MODE=keycloak KEYCLOAK_ISSUER=http://localhost:8080/realms/aqr KEYCLOAK_CLIENT_ID=aqr-web \
  APP_BASE_URL=http://localhost:5173 npm run dev
```

- Keycloak: http://localhost:8080 (console: `admin` / `admin`). Dados no volume Postgres `keycloak-db`; para reimportar o realm: `docker compose -f docker/compose.yml down -v`.
- **Mailpit** (caixa de e-mail falsa): http://localhost:8025. O Keycloak envia a ele o e-mail de "Esqueceu a senha?" (SMTP `mailpit:1025` no realm).
- Cliente de serviço `aqr-admin` (segredo de desenvolvimento `aqr-admin-dev-secret`; use `KEYCLOAK_ADMIN_CLIENT_ID=aqr-admin KEYCLOAK_ADMIN_CLIENT_SECRET=aqr-admin-dev-secret`). Usuários do realm (`docker/keycloak/aqr-realm.json`, **só local**): `admin` / `admin-dev-123`, `recuperacao` / `recuperacao-dev-123` e `semconta` / `semconta-dev-123` (autentica no Keycloak, mas não tem conta no AQR → bloqueado). O analista `ana` **não** vem no realm: o E2E a cria pela administração, como no uso real.
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

## Sessões e registro de acessos

Sessões ficam na tabela `sessions` (migração 0002; só o hash do identificador) e sobrevivem a reinício do servidor. Logins e saídas ficam em `access_events` (só inserção): `login.ok`, `login.sem_conta`, `login.conta_inativa`, `login.falha`, `logout`, com usuário, conta e IP. Ainda não há tela para consultá-los.

## Produção: o que falta (bloqueios que dependem de domínio, SMTP e servidor)

- **Domínio e HTTPS:** definir o endereço do Keycloak e do AQR, com certificados; `KEYCLOAK_ISSUER` e `APP_BASE_URL` em HTTPS (a configuração já recusa HTTP fora de localhost).
- **SMTP real:** trocar o Mailpit por um servidor SMTP (host, porta, TLS e remetente do domínio da Prefeitura) no realm; sem isso a recuperação de senha não envia e-mail.
- **Keycloak em produção:** `start` (não `start-dev`) com `KC_HOSTNAME`, proxy reverso, Postgres com backup e senhas trocadas; recriar o realm sem os usuários de teste e com a política de senha e de bloqueio definida pela SEMADES; o cadastro dos mesmos usuários precisa existir no AQR (`preferred_username` = usuário).
- Cookies passam a `Secure` automaticamente com `APP_BASE_URL` em HTTPS.

## Limitações conhecidas

- Sem renovação de sessão: expira em 8 h e a pessoa entra de novo.
- O `id_token` fica guardado no banco (sem criptografia em repouso) para o encerramento da sessão no Keycloak.
- Não há tela para ver `access_events`.
- A tela de login, em modo Keycloak, mostra um botão "Entrar com a conta da PREFCG" no lugar dos campos usuário/senha (as credenciais são digitadas só no Keycloak). É a única mudança na tela; **aguarda validação**.

## Verificação com Keycloak real (10/10/2026)

Compose (Keycloak 26.8.0 + Postgres + Mailpit) recriado do zero + API em `PORT=3100` + banco novo, com `node scripts/e2e-keycloak.mjs <original.pdf> <revisado.pdf>`. **40 verificações, todas OK:** recuperação de senha (e-mail no Mailpit, senha antiga invalidada); sem sessão (401); senha errada; sem conta no AQR; admin entra; criar conta sem e-mail recusado; **a conta nasce no Keycloak** (ativa, com nome e e-mail, sem senha) e a pessoa não entra antes de definir a senha; **convite no Mailpit → a própria `ana` define a senha → entra**; analista sem permissão de administrar (403); comparação dos PDFs de teste (**18 diferenças**) e sem login (401); **desativar bloqueia no Keycloak** e derruba a sessão; **reativar** desbloqueia; **redefinição pelo admin** (e-mail, senha antiga invalidada, nova funciona); redefinição de conta desativada recusada (422); sincronizar; logout. Não coberto ao vivo: sincronizar uma conta antiga que não existe no Keycloak (coberto por teste com Keycloak falso), falha de SMTP/Keycloak (idem) e a interface no navegador (sem inspeção visual).

## Testes

`server/auth/keycloak-auth.test.ts` (servidor OIDC falso com HTTP e JWT RS256 reais): não autenticado, login correto, login errado (código inválido, público errado, sem cookie), sem conta, `returnTo` malicioso, administrador cria analista, analista sem permissão, desativação imediata, CSRF, logout. Com o provedor de identidade falso (`server/test/fake-identity.ts`): criação com convite, e-mail obrigatório, desfazer o usuário se a conta falhar, Keycloak fora do ar (502), SMTP fora do ar (aviso e reenvio), bloqueio/reativação, sincronização e permissões. Mais `server/config.test.ts` e `KeycloakLogin.test.tsx`.
