# Login real com Keycloak: relatório e guia

## Como funciona

O servidor do AQR é o cliente OIDC (padrão BFF): código de autorização + PKCE (S256), `state` e `nonce`.

1. `GET /api/auth/login?returnTo=/pagina` → redireciona ao Keycloak (guarda `state`, `nonce` e o verificador PKCE só no servidor; o navegador recebe apenas o cookie `aqr_login` com o `state`).
2. Keycloak autentica a pessoa e volta em `GET /api/auth/callback`. A biblioteca troca o código, valida assinatura (JWKS), emissor, público, expiração, `state` e `nonce`.
3. A conta do AQR é localizada pelo **`sub` do token** (id imutável do usuário no Keycloak, gravado em `accounts.keycloak_sub`), **nunca** pelo `preferred_username`, que pode ser trocado ou reaproveitado. Sem vínculo pelo `sub` ninguém entra, nem que o nome coincida (`vinculo_pendente`; se a conta já está vinculada a outro `sub`, `vinculo_divergente`). A conta precisa estar ativa. O papel (`administrador`/`analista`) vem do banco do AQR, não do Keycloak.

   **Como o vínculo nasce (o `sub` só é gravado por quem tem credencial de serviço, nunca pelo próprio login):** (a) conta criada pela administração: o `sub` é o id do usuário que o backend acabou de criar no Keycloak; (b) conta antiga: administrador usa "Sincronizar com o Keycloak" (confere que o **e-mail** do Keycloak é o da conta, senão recusa) ou o operador roda `npm run admin:vincular -- --usuario <login>` / `--todos` no servidor (contas sem e-mail, como o primeiro administrador, exigem `--confirmo-identidade`). O vínculo é definitivo: o banco recusa alterá-lo e cada `sub` só pertence a uma conta. **Migração de contas existentes:** a migração 0004 só adiciona a coluna (nula); contas antigas ficam *sem acesso* até serem vinculadas por um dos dois caminhos.
4. O servidor cria uma sessão (guardada no banco do AQR, só o hash) e entrega só um cookie `aqr_sessao` (aleatório, `HttpOnly`, `SameSite=Lax`, `Secure` em HTTPS). A sessão **cai depois de 30 min sem uso e, em qualquer caso, 8 h depois do login**. **Nenhum token vai ao navegador.**
5. A cada pedido a conta é consultada de novo: desativar ou mudar o papel vale na hora. Cada pedido conta como uso (o último uso é regravado no máximo a cada 30 s). No navegador, cliques, teclas e rolagem avisam o servidor (no máximo uma vez por minuto) e o relógio da sessão (`GET /api/auth/sessao`, que **não** conta como uso) é conferido a cada minuto e ao voltar à aba; quando a sessão termina, a pessoa vai para `/entrar?erro=sessao_expirada` e, ao entrar de novo, volta à página em que estava.
6. `POST /api/auth/logout` apaga a sessão do AQR e, **pelo backend e com a credencial de serviço**, encerra as sessões da pessoa no Keycloak (`POST /users/{sub}/logout`); a resposta é só `{ "keycloakEncerrado": true|false }` e o frontend volta para `/entrar`. **Nenhum token (nem `id_token`) é guardado ou enviado ao navegador**: o `id_token_hint` deixou de ser necessário. Se o Keycloak estiver fora do ar, a sessão do AQR cai do mesmo jeito e o registro do logout anota `keycloak_nao_encerrado`.

Proteções: `Origin` obrigatório e igual a `APP_BASE_URL` em pedidos `POST/PUT/PATCH/DELETE` (CSRF); `returnTo` só aceita caminhos internos; `/api/comparisons` exige sessão e **cada comparação só é vista e cancelada por quem a enviou** (outra pessoa, inclusive administrador, recebe 404); o resultado é **descartado assim que entregue** (margem de 1 min para repetir o pedido) ou 5 min depois de pronto, se ninguém o buscar; `/api/admin/*` exige papel administrador; HTTP só é aceito para `localhost`.

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

Sessões ficam na tabela `sessions` (só o hash do identificador, sem nenhum token, com o último uso em `last_seen_at`; migração 0005 apagou as antigas e removeu a coluna `id_token`, 0006 trouxe a inatividade) e sobrevivem a reinício do servidor. Sessões vencidas são apagadas a cada minuto. Redefinir a senha de uma conta pelo administrador **encerra todas as sessões dela** no AQR e no Keycloak.

Registros, lidos **só por administradores** (analista recebe 403, sem sessão 401), na tela **Administração de contas → Registros** (`/administracao/registros`, só com o login real) e pela API:

- `access_events` (`GET /api/admin/access-events`, com `page`, `pageSize` até 100, `evento` da lista conhecida e `usuario`): logins (`login.ok`, `sem_conta`, `conta_inativa`, `falha`, `vinculo_pendente`, `vinculo_divergente`), `logout` e os passos de identidade (`identidade.*`), com usuário, conta, quem agiu, IP e detalhe. Só inserção.
- `comparison_events` (`GET /api/admin/comparison-events` e o resumo por pessoa em `GET /api/admin/comparison-events/resumo`): **só quem comparou, quando e o resultado** (`comparacao.enviada`, `comparacao.concluida` com o nº de diferenças, `comparacao.falhou` com o código do erro). **Nada do conteúdo, nem os nomes dos arquivos** (a migração 0006 apagou os nomes gravados antes). Só inserção; o servidor apaga sozinho (de hora em hora) o que tem **mais de 1 ano**, e o banco recusa apagar antes disso.
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
- **Sessões**: caem com 30 min sem uso ou 8 h depois do login; não há aviso antes de cair (quem está usando não é interrompido, porque a atividade renova a sessão). Quem tiver o banco não assume sessões (só há hash) e não encontra tokens.
- **Três sistemas para manter coerentes** (SQLite do AQR, Keycloak, e-mail): falhas parciais geram `aviso` e o botão "Sincronizar com o Keycloak" conclui; não há reconciliação automática periódica. Uma conta desativada no AQR com falha no Keycloak continua sem entrar (o AQR confere a situação a cada pedido).
- **Registro das comparações** vale só no login real. Os **registros de acesso** (`access_events`, com IP) não têm prazo de retenção definido: nada é apagado automaticamente.
- **Encerramento no Keycloak** depende da credencial de serviço estar no ar; sem ela, o login único do Keycloak pode continuar ativo até expirar (a sessão do AQR sempre cai).
- **Auditoria de contas** (`audit_events`) não registra o vínculo nem os convites; esses ficam em `access_events`.
- A tela de login, em modo Keycloak, mostra um botão no lugar dos campos usuário/senha (as credenciais são digitadas só no Keycloak). É a única mudança na tela; **aguarda validação visual**. A interface não foi inspecionada no navegador.
- O E2E real roda só localmente (Docker + Mailpit); falhas de SMTP/Keycloak e a sincronização de conta antiga sem usuário no Keycloak estão cobertas só por testes com provedor falso.

## Verificação com Keycloak real (10/10/2026)

Compose de desenvolvimento (Keycloak 26.8.0 + Postgres + Mailpit) recriado do zero + API em `PORT=3100` + banco novo, com `node scripts/e2e-keycloak.mjs <original.pdf> <revisado.pdf>`. **53 verificações, todas OK** (última rodada depois da sessão por inatividade e das comparações sem nomes), incluindo o vínculo pelo `sub`: o administrador recém-criado **não entra** por ter só o nome de usuário igual (`vinculo_pendente`), o operador o vincula com `npm run admin:vincular` (o `sub` real do Keycloak fica gravado) e repetir o comando não faz nada; `ana` nasce vinculada ao id do usuário criado no Keycloak. O restante: recuperação de senha por e-mail, login errado, usuário sem conta, criação com convite no Mailpit (a própria `ana` define a senha), permissões (403), comparação dos PDFs de teste (**18 diferenças**), desativação/reativação refletidas no Keycloak com a sessão caindo na hora, redefinição pelo administrador (que derruba na hora as sessões da `ana`, sem afetar o administrador), sincronização, leitura dos registros de acesso e de comparações pelo administrador (analista recebe 403; a comparação aparece só com quem enviou e o resultado, sem os nomes dos PDFs, e o resumo conta as comparações da `ana`), a comparação da `ana` invisível para o administrador (404) e descartada quando ela pede, o relógio da sessão (cai em até 30 min sem uso) e logout pelo backend: a resposta não traz URL nem token, a sessão cai e, no mesmo navegador, o Keycloak volta a pedir a senha; o banco não tem coluna nem valor de token. Também conferido: `NODE_ENV=production` com `AUTH_MODE=visual` (ou sem `AUTH_MODE`) **não inicia** o servidor. Não coberto ao vivo: sincronizar conta antiga sem usuário no Keycloak, falha de SMTP/Keycloak e a interface no navegador (testes com provedor falso e de componente cobrem parte).

## Testes

`server/auth/keycloak-auth.test.ts` (servidor OIDC falso com HTTP e JWT RS256 reais): não autenticado, login correto, login errado (código inválido, público errado, sem cookie), sem conta, `returnTo` malicioso, administrador cria analista, analista sem permissão, desativação imediata, CSRF, logout. Com o provedor de identidade falso (`server/test/fake-identity.ts`): criação com convite, e-mail obrigatório, desfazer o usuário se a conta falhar, Keycloak fora do ar (502), SMTP fora do ar (aviso e reenvio), bloqueio/reativação, sincronização e permissões. Mais `server/config.test.ts` e `KeycloakLogin.test.tsx`.
