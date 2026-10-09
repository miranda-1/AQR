# Plano técnico — AQR: comparação real de PDFs (entrega 1) e administração de contas (entrega 2)

> Plano aprovado pelo responsável em 09/10/2026. Os commits da seção 9 são executados em ordem, um por vez.
> As decisões D1–D4 valem como **provisórias** até a confirmação prevista no commit 10.
> O progresso de cada commit fica no Histórico de `docs/CONTEXTO.md`.

## Contexto

O frontend (etapa 1) está aprovado: a comparação é simulada por `createMockComparisonService`
(`src/features/comparison/services/mock-comparison-service.ts`), trocável num único ponto
(`src/pages/ComparisonWorkspacePage.tsx`), e o visualizador desenha páginas fictícias em HTML
(`viewer/SimulatedPageView.tsx`). O responsável autorizou agora, nesta ordem:

1. **Comparação real** com backend Node.js/TypeScript, preservando `ComparisonService` e o frontend aprovado.
2. **Administração de contas** (listagem, busca, criação, edição, ativação/desativação, papéis, auditoria básica),
   **sem** autenticação real: o login visual (`auth-session.tsx`, `sessionStorage`) continua. A API administrativa
   precisa nascer pronta para receber autenticação real e **nunca** ficar exposta sem proteção em produção.

Nada é implementado nesta execução. Cada item abaixo vira um commit pequeno, com `lint`, `typecheck`, `test`,
`build` e atualização do `docs/CONTEXTO.md` (Histórico, Decisões, Estado atual, Pendências).

---

## 1. Decisões

### 1.1 Indispensáveis do responsável (com default para não travar)

O trabalho segue com o default; a confirmação é pedida **no fim da entrega 1**, antes do commit A1, porque só
a entrega 2 depende delas. Se o responsável mudar algo, o custo é uma migração nova ou um ajuste de texto.

| # | Decisão | Default conservador |
|---|---|---|
| D1 | **Papéis e permissões** | Dois papéis: `administrador` (usa o AQR e administra contas) e `analista` (só usa as ferramentas). Sem exclusão de contas: só desativação, para preservar a auditoria. |
| D2 | **Identificador da conta** (vai casar com a autenticação real futura: LDAP/AD, SSO da Prefeitura ou outra) | `usuario` = login institucional, minúsculo, `^[a-z0-9._-]{3,32}$`, único e imutável depois de criado. Mais `nome` (obrigatório) e `email` institucional (opcional, único). Sem senha guardada: a credencial virá do provedor de autenticação. |
| D3 | **O que conta como diferença** (pendência já registrada: "alterações apenas visuais não são avaliadas") | Só o **texto** é comparado. Fonte, cor, negrito, espaçamento, quebra de linha/página e imagens não geram diferença. PDFs digitalizados (só imagem) dão `NO_EXTRACTABLE_TEXT`; sem OCR. |
| D4 | **Visual das telas de administração** | Seguem os padrões já aprovados (tokens, `shadow-surface`, sem linhas divisórias). Acesso pelo botão de conta ("Administração de contas"), sem mexer na sub-barra aprovada. Capturas enviadas para aprovação no fim da entrega 2. |

### 1.2 Tomadas sem interromper (registradas em "Decisões" do CONTEXTO.md como técnicas)

| Decisão | Escolha e motivo |
|---|---|
| Estrutura | Mesmo `package.json` na raiz; backend em `server/`; tipos de dados compartilhados em `shared/contracts/`. Evita workspaces npm e mudança de layout do frontend. |
| Servidor HTTP | **Fastify 5** + `@fastify/multipart`: limites de upload em streaming, validação, `app.inject()` para testar sem rede. |
| Execução TS no dev | `tsx` (devDependency) em `npm run dev:server`; build com `tsc -p tsconfig.server.json` → `dist-server/`. |
| Leitura de PDF | **`pdfjs-dist`** no servidor (extração com posições) **e** no navegador (visualizador). Mesma biblioteca dos dois lados = mesmas coordenadas. Sempre `isEvalSupported: false` (CVE-2024-4367), versão ≥ 4.2.67, sem fontes de rede. |
| Algoritmo de diferença | `diff` (jsdiff, BSD, sem dependências) com `diffArrays` sobre tokens; alinhamento em dois níveis (linhas, depois palavras). Evita manter um Myers próprio. |
| PDFs de teste | `pdf-lib` (devDependency) gera documentos sintéticos em teste, com posição conhecida de cada trecho (gabarito de região). |
| Banco | **`node:sqlite`** (embutido no Node ≥ 22.13; máquina local está em 26). Zero dependência nativa. `engines.node` sobe para `>=22.13`. Arquivo em `data/aqr.sqlite` (no `.gitignore`). |
| Armazenamento da comparação | **Nada em disco.** PDFs ficam em memória durante o processamento; resultado em memória por 30 min (TTL) e apagado depois. O visualizador usa os `File` que já estão na sessão do navegador, então o servidor não devolve os PDFs. Conservador para LGPD. |
| Processamento | Fila com `worker_threads` (2 workers padrão, configurável), para não bloquear o servidor. Cancelamento via `DELETE` encerra a tarefa. |
| Progresso | Polling a cada 700 ms (`GET /api/comparisons/:id`). SSE fica para depois, se precisar. |
| Contrato | `ComparisonService` intacto. Acréscimo **opcional** em `Difference`: `anchors?: Partial<Record<DocumentRole, DocumentLocation>>`, posição no documento em que o trecho *não* existe (para adições/exclusões rolarem os dois painéis juntos). Não quebra nada. |
| Escolha do serviço | `VITE_COMPARISON_SERVICE=api|demo`. Build: `api`. Modo `demo` mantém "Simular estado", `?cenario=` e os dados fictícios. `appConfig.isPrototype` passa a ser `true` só no modo demo; os avisos do resultado já dependem de `result.isDemonstration`. |
| Rede | Vite faz proxy de `/api` → `http://127.0.0.1:3000` no dev (mesma origem, sem CORS). Servidor escuta em `127.0.0.1` por padrão. |
| Exportação | Continua "indisponível" (fora do escopo pedido). |

---

## 2. Segurança da API administrativa (sem autenticação real)

- **Abstração de autenticação** (`server/auth/`): `AuthProvider.resolvePrincipal(request) → Principal | null`,
  `Principal = { accountId, usuario, nome, papel, origem: 'dev' | 'real' }`. Rotas usam `requireRole('administrador')`.
  A autenticação real futura só implementa outro `AuthProvider` e liga sessão/cookie; rotas, serviço e auditoria não mudam.
- **`ADMIN_API_MODE`**: `disabled` (padrão) | `dev`.
  - `disabled`: rotas `/api/admin/*` **não são registradas** (404); só `GET /api/admin/status` responde `{ available: false }`.
  - `dev`: `DevAuthProvider` lê o cabeçalho `X-AQR-Dev-Actor: <usuario>`, que precisa ser uma conta **ativa** com papel `administrador`
    no banco. Cabeçalho customizado obriga preflight; com servidor em `127.0.0.1` e sem CORS, outro site não consegue chamar.
  - **Trava de produção** em `server/config.ts`: com `NODE_ENV=production` e `ADMIN_API_MODE=dev`, o servidor **recusa iniciar**
    (erro explícito). Também recusa `dev` com `HOST` diferente de loopback. Testado.
- No frontend, o nome digitado no login visual vira o `X-AQR-Dev-Actor` **apenas** quando `GET /api/admin/status` informa `mode: 'dev'`.
- Primeiro administrador: CLI local `npm run admin:criar -- --usuario x --nome "Y"` (acesso direto ao banco, sem rede), auditado como ator `sistema`.
- Auditoria só de inserção: gatilhos SQLite impedem `UPDATE`/`DELETE` em `audit_events`. Nunca registra segredos.

---

## 3. Contratos e modelos

### 3.1 Comparação
- `shared/contracts/comparison.ts`: tipos de dados puros hoje em `types.ts` (`DocumentRole`, `DifferenceKind`, `NormalizedRect`,
  `DocumentLocation`, `DifferenceSide`, `Difference` + `anchors?`, `DocumentSummary`, `ComparisonSummary`, `ComparisonResult`,
  `ComparisonErrorCode`, `ComparisonError`, `ComparisonStage`). Mais o DTO de tarefa:
  ```ts
  type ComparisonJob =
    | { id: string; status: 'queued' }
    | { id: string; status: 'processing'; stage: ComparisonStage }
    | { id: string; status: 'completed'; result: ComparisonResult }
    | { id: string; status: 'failed'; error: ComparisonError }
  ```
- `src/features/comparison/model/types.ts` **reexporta** tudo e mantém `ComparisonService`, `ComparisonInput`, `CompareOptions`,
  `summarize` (a regra "contratos em types.ts" continua valendo). `summarize` move para `shared/` e é reexportado (o servidor usa).
- `shared/contracts/api-error.ts`: `{ error: { code, message /* pt-BR */, fields?: Record<string, string> } }`.

### 3.2 Administração (`shared/contracts/admin.ts`)
```ts
type AccountRole = 'administrador' | 'analista'
type AccountStatus = 'ativa' | 'inativa'
interface Account { id; usuario; nome; email: string | null; papel; situacao; criadaEm; atualizadaEm; desativadaEm: string | null; versao: number }
interface AccountPage { items: Account[]; total: number; page: number; pageSize: number }
interface AuditEvent { id; ocorridoEm; ator: { id: string | null; rotulo: string; origem: 'dev' | 'real' | 'sistema' };
  acao: 'conta.criada' | 'conta.editada' | 'conta.papel_alterado' | 'conta.desativada' | 'conta.reativada';
  alvo: { tipo: 'conta'; id: string; rotulo: string }; detalhes: { antes?: Partial<Account>; depois?: Partial<Account>; motivo?: string } }
```
Frontend: `src/features/admin/model/types.ts` com `AccountService` (mesmo padrão de `ComparisonService`), implementado por
`services/http-account-service.ts` e, em testes, `services/in-memory-account-service.ts`.

### 3.3 Regras de negócio (servidor)
`usuario` único (sem diferenciar maiúsculas) e imutável; `email` único; não desativar a si mesmo; não desativar nem rebaixar o
**último administrador ativo**; edição exige `versao` (concorrência otimista → 409 "Esta conta foi alterada por outra pessoa.
Recarregue a página para ver a versão atual."); alteração e evento de auditoria na **mesma transação**.

---

## 4. Endpoints

| Método e caminho | Uso | Respostas |
|---|---|---|
| `GET /api/health` | vida do servidor | 200 |
| `POST /api/comparisons` | multipart com `original` e `updated` | 202 `ComparisonJob`; 400 campos faltando; 413 > 50 MB; 415 não-PDF (assinatura `%PDF-`); 503 fila cheia |
| `GET /api/comparisons/:id` | progresso/resultado | 200 `ComparisonJob`; 404 expirada/inexistente |
| `DELETE /api/comparisons/:id` | cancelar e descartar | 204 |
| `GET /api/admin/status` | disponibilidade | `{ available, mode }` |
| `GET /api/admin/accounts?q=&papel=&situacao=&page=&pageSize=` | lista e busca (usuário, nome, e-mail) | 200 `AccountPage` |
| `POST /api/admin/accounts` | criar | 201 `Account`; 400; 409 duplicado |
| `GET /api/admin/accounts/:id` | detalhe | 200; 404 |
| `PATCH /api/admin/accounts/:id` | `nome`, `email`, `papel` + `versao` | 200; 400; 409; 422 último administrador |
| `POST /api/admin/accounts/:id/desativar` · `/reativar` | situação (+ `motivo` opcional) + `versao` | 200; 409; 422 |
| `GET /api/admin/audit-events?contaId=&acao=&page=` | auditoria | 200 paginado |

Todas as rotas admin: 401 sem principal, 403 sem papel `administrador`. Limites: `pageSize ≤ 100`, `q ≤ 100` caracteres.

---

## 5. Processamento de PDF (servidor)

Pipeline em `server/comparison/`, rodando no worker, relatando as etapas do contrato:

1. **validating** (`pdf/load.ts`): assinatura e tamanho; `getDocument({ data, isEvalSupported: false, disableFontFace: true, useSystemFonts: false })`;
   `PasswordException`/`InvalidPDFException` → `INCOMPATIBLE_DOCUMENT` com `document`. Limite de 1.000 páginas por arquivo (configurável).
2. **extracting** (`pdf/extract.ts`): `getTextContent()` por página; cada item vira palavras com caixa normalizada (0–1, origem no canto
   superior esquerdo, via `viewport.convertToViewportPoint`); largura por palavra proporcional aos caracteres do item. Agrupa linhas
   por linha de base. Documento com menos de 20 caracteres visíveis no total → `NO_EXTRACTABLE_TEXT`.
3. **normalização** (`text/normalize.ts`): NFKC (ligaturas `ﬁ`→`fi`), espaços colapsados, hífen de fim de linha unido
   (`requeri-`+`mento`), aspas/traços tipográficos equivalentes. Comparação **diferencia** maiúsculas e pontuação (é texto jurídico).
4. **comparing** (`diff/align.ts`, `diff/hunks.ts`): alinha linhas normalizadas (jsdiff `diffArrays` em hashes), depois palavras
   dentro de blocos alterados; remoção+inserção adjacentes viram `modification`; trechos separados por ≤ 2 palavras iguais se
   fundem. Salvaguarda: se o documento passar de 300 mil palavras ou o passo exceder 20 s, cai para comparação só por linhas.
5. **organizing** (`compare-documents.ts`, `context.ts`, `regions.ts`): `region` = união das caixas das palavras na primeira página
   do trecho (com margem de 0,4%); `anchors` = posição da palavra vizinha no outro documento; `context` = último título
   detectado antes do trecho (linha curta com padrões `Art. N`, `Cláusula N`, `CAPÍTULO`, numeração `1.2` ou caixa alta) ou
   "Página N"; ids `d-001…`; `summary` via `summarize`; `isDemonstration: false`.

**Critérios de precisão** (`docs/criterios-comparacao.md`, verificados pela suíte sintética):
- documentos idênticos e documentos com o mesmo texto em outra diagramação (fonte, margem, quebra) → **0** diferenças;
- cada alteração injetada detectada com o **tipo correto** (100% na suíte), sem falsos positivos;
- `region` com IoU ≥ 0,5 contra o gabarito do `pdf-lib`; página correta em 100%;
- PDF protegido, corrompido e só-imagem → código de erro correto e documento certo;
- desempenho: 2 × 100 páginas em menos de 10 s na máquina de desenvolvimento.

## 6. Visualizador real (frontend)

- `viewer/document-source.ts`: `type DocumentSource = { kind: 'simulated'; document: SimulatedDocument } | { kind: 'pdf'; file: File }`.
  `ComparisonWorkspace` passa a receber `Record<DocumentRole, DocumentSource>`; `DocumentPane` escolhe a visualização.
- `viewer/pdf/load-pdf.ts`: importa `pdfjs-dist` sob demanda (já fica no chunk da rota lazy do resultado), worker por
  `pdf.worker.min.mjs?url`, `isEvalSupported: false`.
- `viewer/PdfPageView.tsx`: `<article data-page-number aria-label="Página N de M">` com o mesmo tamanho/zoom (`--zoom`) da página
  simulada; canvas desenhado só quando visível (`hooks/use-in-view.ts`), em `devicePixelRatio`; **camada de texto** do pdf.js
  (texto selecionável e lido por leitores de tela); destaques sobrepostos por `region`, reaproveitando `DiffMark`
  (`data-diff-id`, ícone + rótulo + numeração, nunca só cor). Assim `scrollToDifference`, `currentPageOf`, a lista, a navegação
  (Alt + ↑/↓) e a rolagem sincronizada continuam iguais. Adições/exclusões ganham um marcador de posição pelo `anchors`.
- Erro ao abrir o PDF no navegador → mensagem no painel, sem derrubar a lista de diferenças.

## 7. Migrações

- `server/db/database.ts` (abre `node:sqlite`, `PRAGMA foreign_keys=ON`, `journal_mode=WAL`), `server/db/migrate.ts`
  (aplica `server/db/migrations/NNNN_nome.sql` em ordem, cada uma em transação, registrando em `schema_migrations(version, applied_at)`;
  roda ao iniciar e por `npm run db:migrar`). Migrações nunca são editadas depois de commitadas.
- `0001_contas_e_auditoria.sql`: `accounts` (id TEXT PK uuid, usuario TEXT UNIQUE COLLATE NOCASE, nome, email UNIQUE NULL,
  papel CHECK IN (...), situacao CHECK IN (...), criada_em, atualizada_em, desativada_em, versao INTEGER) e índices de busca;
  `audit_events` (id, ocorrido_em, ator_id NULL, ator_rotulo, ator_origem, acao, alvo_tipo, alvo_id, alvo_rotulo, detalhes JSON)
  com índices por `alvo_id` e `ocorrido_em`, e gatilhos que bloqueiam `UPDATE`/`DELETE`.
- Campo para a autenticação futura entra na migração dela (ex.: `0002_identidade_externa.sql` com `subject` do provedor).

## 8. Arquivos

**Criar:** `shared/contracts/{comparison,admin,api-error}.ts` · `tsconfig.server.json` · `server/{main,app,config}.ts` ·
`server/http/errors.ts` · `server/auth/{principal,auth-provider,dev-auth-provider,require-role}.ts` ·
`server/comparison/{routes,job-store,worker-pool,worker,compare-documents,context,regions}.ts` · `server/comparison/pdf/{load,extract}.ts` ·
`server/comparison/text/{normalize,tokenize}.ts` · `server/comparison/diff/{align,hunks}.ts` ·
`server/admin/{routes,schemas,account-repository,audit-repository,account-service}.ts` · `server/db/{database,migrate}.ts` +
`migrations/0001_contas_e_auditoria.sql` · `server/scripts/criar-admin.ts` · `server/test/{make-pdf,build-test-app}.ts` + `*.test.ts` ao lado
de cada módulo · `src/features/comparison/services/http-comparison-service.ts` (+ teste) · `src/features/comparison/viewer/{document-source.ts,PdfPageView.tsx,pdf/load-pdf.ts}` ·
`src/features/admin/{model/types.ts,services/http-account-service.ts,services/in-memory-account-service.ts,hooks/*,components/*}` ·
`src/pages/{AccountsPage,AccountFormPage,AuditPage}.tsx` (+ testes) · `src/components/ui/alert-dialog.tsx` (shadcn, sobre o `radix-ui` já instalado) ·
`docs/criterios-comparacao.md` · `.env.example`.

**Alterar:** `package.json` (deps, scripts `dev:server`, `build:server`, `db:migrar`, `admin:criar`; `build` inclui o servidor; `engines`) ·
`tsconfig.json` (referência ao servidor; `tsconfig.app.json` inclui `shared`) · `vite.config.ts` (proxy `/api`; `test.projects`: `jsdom` para
`src`, `node` para `server`/`shared`) · `eslint.config.js` (globals de Node para `server/**`, ignorar `dist-server`) · `.gitignore` (`data/`, `dist-server/`) ·
`src/features/comparison/model/types.ts` (reexportar) · `src/pages/ComparisonWorkspacePage.tsx` (escolha do serviço; fontes de documento) ·
`ComparisonWorkspace.tsx`, `DocumentPane.tsx` · `WorkspaceHeader.tsx` (menu "Simular estado" só em demo) · `src/config/{app,routes}.ts` ·
`src/app/routes.tsx` · `src/components/layout/AccountMenu.tsx` (item "Administração de contas" quando disponível) · `src/test/a11y.test.tsx` ·
`docs/arquitetura.md`, `docs/CONTEXTO.md`, `README.md`.

---

## 9. Commits (cada um: lint, typecheck, test, build, CONTEXTO.md, commit em português no imperativo)

### Entrega 1 — comparação real
1. **Registra o plano do backend e os defaults técnicos** — só docs (`docs/arquitetura.md`, CONTEXTO: decisões D1–D4 como provisórias).
2. **Move os tipos de dados da comparação para `shared/` sem mudar o contrato** — reexporta em `types.ts`; acrescenta `anchors?`. Testes atuais intactos.
3. **Cria o servidor Fastify com `/api/health`** — deps, `tsconfig.server.json`, `config.ts` (zod), proxy do Vite, `test.projects`, ESLint Node. Teste via `inject`.
4. **Gera PDFs sintéticos para testes e extrai texto com posição** — `pdf-lib` (dev), `pdfjs-dist`; testes de caixas, protegido, corrompido, só-imagem.
5. **Normaliza o texto e calcula diferenças por linha e palavra** — funções puras + testes (adição, exclusão, modificação, entre páginas, hifenização, ligaturas, só espaço = nada).
6. **Monta o resultado no formato do contrato e mede a precisão** — contexto, regiões, âncoras, resumo; suíte sintética com os critérios da seção 5; `docs/criterios-comparacao.md`.
7. **Expõe a comparação por tarefas assíncronas em worker** — rotas, fila, TTL, cancelamento, limites (400/413/415/503); testes `inject`.
8. **Liga o frontend ao serviço HTTP mantendo o modo demonstrativo** — `http-comparison-service.ts` (validação da resposta com `zod/mini`, `AbortSignal`, mapeia `fetch` falho para `PROCESSING_FAILED`), `VITE_COMPARISON_SERVICE`, menu de cenário só em demo; testes com `fetch` simulado.
9. **Mostra as páginas reais do PDF com os destaques no visualizador** — `DocumentSource`, `PdfPageView`, camada de texto, marcadores por âncora; testes com pdf.js simulado no jsdom; a11y passando.
10. **Encerra o modo protótipo da comparação** — `isPrototype` derivado do modo, README/arquitetura (como rodar os dois processos), pendências. **Ponto de confirmação de D1–D4 com o responsável.**

### Entrega 2 — administração de contas
11. **Cria o banco SQLite com migrações versionadas** — `node:sqlite`, `migrate.ts`, `0001`, `db:migrar`, `engines`; testes em `:memory:` (idempotência, gatilhos de auditoria).
12. **Isola a autenticação e trava a API administrativa em produção** — `AuthProvider`, `DevAuthProvider`, `requireRole`, `ADMIN_API_MODE`; testes: produção + dev não inicia; `disabled` → 404; sem cabeçalho → 401; analista → 403.
13. **Implementa as regras de contas com auditoria na mesma transação** — repositórios + serviço; testes das regras da seção 3.3.
14. **Expõe as rotas de contas e de auditoria** — schemas, erros pt-BR, paginação; testes `inject`.
15. **Adiciona o comando para criar o primeiro administrador** — `admin:criar`, auditado como `sistema`.
16. **Cria o serviço de contas no frontend e o acesso pelo botão de conta** — `AccountService` HTTP + em memória, rotas `/administracao/contas` (protegidas por `RequireAuth` e pelo `status`), item no `AccountMenu`.
17. **Lista e busca contas** — tabela acessível (caption, `th scope`), busca com atraso, filtros de papel e situação, paginação, estados vazio/erro.
18. **Cria e edita contas, com ativação e desativação confirmadas** — páginas de formulário, `alert-dialog`, mensagens de conflito e de último administrador.
19. **Mostra a auditoria geral e o histórico de cada conta** — `/administracao/auditoria` e seção na edição.
20. **Documenta a integração da autenticação real** — `docs/arquitetura.md` (o que trocar: `AuthProvider` real, cookie `HttpOnly; Secure; SameSite=Strict`, CSRF, `0002_identidade_externa`, remover `DevAuthProvider`), CONTEXTO, capturas para aprovação visual (D4).

Envio ao GitHub só quando o responsável pedir (comando em `docs/CONTEXTO.md`).

## 10. Testes

- **Servidor (Vitest, ambiente node):** unidades puras (normalização, diff, contexto, regiões), extração com PDFs gerados, suíte de precisão,
  rotas com `app.inject()` (sem porta aberta), banco em `:memory:`, trava de produção.
- **Frontend (jsdom):** `http-comparison-service` com `fetch` simulado (progresso, cancelamento, erros, resposta inválida); `PdfPageView`
  com `pdfjs-dist` simulado; páginas de administração com o serviço em memória, consultando por papel e nome acessível; casos novos em
  `src/test/a11y.test.tsx` (lista, formulário, diálogo, auditoria). Testes existentes continuam passando (modo demo nos testes).
- **Manual (Playwright MCP):** `npm run dev` + `npm run dev:server`, comparar dois PDFs reais, navegar pelas diferenças, zoom, rolagem
  sincronizada; criar/editar/desativar conta e conferir a auditoria.

## 11. Critérios de conclusão

**Entrega 1:** dois PDFs reais comparados de ponta a ponta pela interface aprovada, sem mudanças visuais além dos destaques sobre as páginas
reais; critérios de precisão da seção 5 cumpridos na suíte; erros `INCOMPATIBLE_DOCUMENT`/`NO_EXTRACTABLE_TEXT`/`PROCESSING_FAILED`
aparecendo nos painéis existentes; nenhum PDF gravado em disco; modo demo ainda disponível; `ComparisonService` inalterado.

**Entrega 2:** todas as operações pedidas funcionam em modo `dev`; toda alteração gera evento de auditoria imutável; com
`NODE_ENV=production` a API administrativa não existe (ou o servidor não inicia, se `dev`); login visual intocado; caminho da
autenticação real documentado.

**Ambas:** `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` verdes em cada commit; `docs/CONTEXTO.md` e
`docs/arquitetura.md` atualizados; nenhum `any`, nenhum `!`; dependências novas justificadas na tabela de decisões
(`fastify`, `@fastify/multipart`, `pdfjs-dist`, `diff`; dev: `tsx`, `pdf-lib`).
