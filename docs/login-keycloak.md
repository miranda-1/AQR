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

## Rodando localmente

```bash
docker run --rm -p 8080:8080 -e KC_BOOTSTRAP_ADMIN_USERNAME=admin -e KC_BOOTSTRAP_ADMIN_PASSWORD=admin \
  -v "$PWD/docker/keycloak:/opt/keycloak/data/import:ro" quay.io/keycloak/keycloak:26.8.0 start-dev --import-realm
npm run admin:criar -- --usuario admin --nome "Admin Local"
AUTH_MODE=keycloak KEYCLOAK_ISSUER=http://localhost:8080/realms/aqr KEYCLOAK_CLIENT_ID=aqr-web \
  APP_BASE_URL=http://localhost:5173 npm run dev
```

Usuários de desenvolvimento do realm (`docker/keycloak/aqr-realm.json`, **só local**): `admin` / `admin-dev-123`, `ana` / `ana-dev-123`, `semconta` / `semconta-dev-123` (autentica no Keycloak, mas não tem conta no AQR → bloqueado). Crie `ana` como analista pela administração.

## Limitações conhecidas

- Sessões ficam em memória: reiniciar o servidor desconecta todos; com várias instâncias é preciso armazenamento compartilhado.
- Login e logout não entram na auditoria de contas (só as alterações de conta).
- A tela de login, em modo Keycloak, mostra um botão "Entrar com a conta da PREFCG" no lugar dos campos usuário/senha (as credenciais são digitadas só no Keycloak). É a única mudança na tela; **aguarda validação**.
- Sem endpoint de renovação: a sessão expira em 8 h e a pessoa entra de novo.
- Produção: precisa de HTTPS, Keycloak institucional e revisão do realm (aqui só há o realm de desenvolvimento).

## Testes

`server/auth/keycloak-auth.test.ts` (servidor OIDC falso com HTTP e JWT RS256 reais): não autenticado, login correto, login errado (código inválido, público errado, sem cookie), sem conta, `returnTo` malicioso, administrador cria analista, analista sem permissão, desativação imediata, CSRF, logout. Mais `server/config.test.ts` e `KeycloakLogin.test.tsx`.
