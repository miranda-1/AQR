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
- Usuários do realm (`docker/keycloak/aqr-realm.json`, **só local**): `admin` / `admin-dev-123`, `ana` / `ana-dev-123`, `recuperacao` / `recuperacao-dev-123` e `semconta` / `semconta-dev-123` (autentica no Keycloak, mas não tem conta no AQR → bloqueado). Crie `ana` como analista pela administração.
- Teste ponta a ponta: `AUTH_MODE=keycloak ... PORT=3100 DATABASE_PATH=<temporário> npx tsx server/main.ts` e, em outro terminal, `node scripts/e2e-keycloak.mjs <original.pdf> <revisado.pdf>`.

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

Keycloak 26.8.0 em Docker com o realm de `docker/keycloak/` + API em `PORT=3100` + banco temporário, rodando `node scripts/e2e-keycloak.mjs <original.pdf> <revisado.pdf>` (o script percorre o navegador: formulário do Keycloak, cookies e redirecionamentos). **17 verificações, todas OK:** sem sessão (401); senha errada (Keycloak rejeita); usuário sem conta no AQR (bloqueado); admin entra e volta à página pedida; cookie opaco; admin cria o analista; analista entra, não administra (403) e compara `AQR_teste_01_original.pdf` × `AQR_teste_02_revisado.pdf` (**18 diferenças**); comparação sem login (401); desativação derruba a sessão na hora e bloqueia novo login; logout aponta o encerramento no Keycloak e invalida o cookie. Não coberto: a interface no navegador (o fluxo foi exercitado por HTTP; a tela em modo Keycloak tem teste de componente, sem inspeção visual).

## Testes

`server/auth/keycloak-auth.test.ts` (servidor OIDC falso com HTTP e JWT RS256 reais): não autenticado, login correto, login errado (código inválido, público errado, sem cookie), sem conta, `returnTo` malicioso, administrador cria analista, analista sem permissão, desativação imediata, CSRF, logout. Mais `server/config.test.ts` e `KeycloakLogin.test.tsx`.
