# Arquitetura

## Visão geral

Aplicação React de página única (SPA), construída com Vite e TypeScript em modo strict, e um servidor Node.js/TypeScript (Fastify, em `server/`) que compara os PDFs. Os dois falam pelo contrato `ComparisonService` e pelos tipos de `shared/contracts/`. O modo demonstrativo (`VITE_COMPARISON_SERVICE=demo`) continua disponível para revisar a interface sem servidor.

```
src/
  app/                    roteador (rotas carregadas sob demanda) e provedores
  pages/                  uma página por rota
  components/
    ui/                   componentes shadcn/ui (copiados para o projeto e adaptados à marca)
    layout/               AppShell, cabeçalho, navegação, rodapé, BrandMark
    common/               componentes pequenos reutilizáveis
  features/
    comparison/
      model/              contratos (types.ts), máquina de estados, validação de arquivos
      services/           serviço real (HTTP) e demonstrativo, os dois implementam ComparisonService
      mocks/              dados fictícios, isolados (só no modo demonstrativo)
      session/            arquivos escolhidos, mantidos apenas em memória
      hooks/              execução da comparação, navegação, rolagem sincronizada
      components/         telas e painéis da comparação
      viewer/             visualizador: páginas reais do PDF (pdf/, pdf.js) ou simuladas em HTML (demo)
    home/                 página inicial: dados das ferramentas, opções, demonstração e ilustrações animadas
    triage/               reservado (em desenvolvimento)
  hooks/ lib/ config/     utilitários e configuração (limite de 50 MB, rotas)
  styles/                 tokens.css (design tokens) e globals.css (tema Tailwind)
  assets/brand/           marca institucional e sua procedência
  test/                   utilitários de teste e auditoria de acessibilidade
```

## Login (visual)

```
Qualquer rota → RequireAuth ─ sem sessão → /entrar (state.from = página pedida)
/entrar → LoginPage
  ├─ LoginForm (usuário e senha obrigatórios; sem verificação de credenciais)
  └─ entrada animada (pulada com movimento reduzido ou sem canvas)
       ├─ dot-logo: amostra a logo em pontos e os traz dos anéis (canvas)
       ├─ varredura: linha amarela troca os pontos pela logo sólida
       └─ EntryHandoffProvider: depois de navegar, a logo voa até [data-entry-target] (AppHeader)
AuthSessionProvider: sessão da aba (sessionStorage), trocável por autenticação real no futuro
```

## Fluxo da comparação

```
Início (/) → HomePage: seletor de ferramentas (Comparar PDFs → /comparacao, Triagem → /triagem)
Seleção (/comparacao)
  └─ useFileSlot ─ validatePdfFile (local: extensão, tipo, tamanho, assinatura %PDF-)
       └─ ComparisonSession (memória)
Resultado (/comparacao/resultado)
  └─ useComparisonRun(service, input)
       └─ comparisonRunReducer: preparing → processing(stage) → completed | failed
            ├─ ProcessingPanel
            ├─ ErrorPanel (PROCESSING_FAILED | INCOMPATIBLE_DOCUMENT | NO_EXTRACTABLE_TEXT)
            ├─ NoDifferencesPanel
            └─ ComparisonWorkspace (indicadores/filtro, lista, visualizador, navegação)
```

## Contratos para o backend

Estão em `src/features/comparison/model/types.ts`, que reexporta os tipos de dados de `shared/contracts/comparison.ts` (os mesmos usados pelo servidor):

- `ComparisonService.compare(input, { signal, onProgress })` → `Promise<ComparisonOutcome>`.
- `ComparisonOutcome` = `{ status: 'completed', result }` ou `{ status: 'failed', error }`.
- `ComparisonResult`: documentos, resumo e lista de `Difference`. Cada diferença tem tipo, contexto, texto e localização (`pageNumber` e `region` normalizada de 0 a 1) em cada documento e, opcionalmente, `anchors`: a posição no documento em que o trecho não existe.
- `ComparisonStage`: `validating | extracting | comparing | organizing`, para relatar o progresso.

Implementações (escolhidas em `pages/ComparisonWorkspacePage.tsx`, o único ponto de troca, por `comparisonConfig.serviceMode`):

1. `services/http-comparison-service.ts` (padrão): envia os arquivos à API, acompanha a tarefa por consultas a cada 0,7 s, valida cada resposta (`model/api-schema.ts`) e cancela no servidor ao sair da tela.
2. `services/mock-comparison-service.ts` (`VITE_COMPARISON_SERVICE=demo`): resultado fictício, com "Simular estado" e os avisos de protótipo (`appConfig.isPrototype`).

O visualizador recebe um `DocumentSource` por documento: o PDF escolhido (páginas reais pelo pdf.js, destaques por `Difference.*.location.region` e `anchors`) ou o documento fictício. `DocumentPane`, a lista, a navegação e a rolagem sincronizada são os mesmos nos dois casos.

## Backend

O plano completo está em `docs/plano-backend.md`. Estrutura:

```
shared/contracts/   tipos de dados usados pelo frontend e pelo servidor (comparação, administração, erros da API)
server/             servidor Node.js/TypeScript (Fastify): comparação de PDFs em tarefas assíncronas e, depois,
                    administração de contas com SQLite (node:sqlite), migrações e auditoria
```

- `ComparisonService` continua sendo o contrato do frontend; `types.ts` reexporta os tipos de `shared/contracts/`.
- No desenvolvimento, o Vite encaminha `/api` para o servidor local (`127.0.0.1:3000`), na mesma origem.
- Já existe: `server/app.ts` (`buildApp`, testado com `app.inject()` sem abrir porta), `server/config.ts`
  (variáveis validadas com Zod; valor inválido impede a inicialização) e `GET /api/health`.
  O servidor usa `module: NodeNext` com imports `.ts` reescritos para `.js` no build (`tsconfig.server.build.json` → `dist-server/`);
  no desenvolvimento roda com `tsx watch`. Os testes do Vitest ficam em dois projetos: `frontend` (jsdom) e `servidor` (Node).
- Núcleo da comparação: `compareDocuments` (`server/comparison/compare-documents.ts`) recebe os bytes dos dois PDFs e
  devolve o `ComparisonResult` (formato 2), relatando as etapas. Comparação híbrida (texto, estrutura, aparência, OCR):

```
bytes ─ assertPdfBytes
  ├─ analyzeDocument (pdf/extract.ts), por página:
  │    texto com posição, fonte e tamanho (pdf.js, lido sem a rotação e girado para a orientação exibida)
  │    ordem de leitura com colunas e tabelas (pdf/reading-order.ts)
  │    imagens e desenhos pela lista de operadores (pdf/page-objects.ts)
  │    prévia renderizada de 300 px (pdf/render.ts, @napi-rs/canvas) → resumo exato, grade de cinzas, tinta
  │    tipo de conteúdo: texto, digitalizada, mista, em branco, desenhos, pouco texto, não examinada
  ├─ OCR local onde falta texto (ocr/ocr-engine.ts: tesseract.js + modelo "por" do npm, sem rede nem cache)
  ├─ correspondência de páginas (structure/page-matching.ts): incluídas, excluídas, movidas, repetidas, refluxo
  ├─ texto: tokenize → alignDocuments (jsdiff) nas páginas em ordem + páginas movidas, uma a uma;
  │    trechos movidos, números/datas/valores/identificadores (text/classify.ts), destaques por linha (regions.ts)
  ├─ estrutura: páginas incluídas/excluídas/movidas, tamanho e rotação
  ├─ por par de páginas (com orçamento de tempo): renderização a 1000 px (2000 px nas digitalizadas)
  │    → visual/raster-diff.ts (alinhamento global, faixa de tons, células, componentes, realinhamento local)
  │    → visual/images.ts (incluída, excluída, trocada, movida, redimensionada)
  │    → visual/formatting.ts (fonte, tamanho, cor, posição, diagramação)
  │    → consolidate.ts (região explicada por texto, imagem, formatação ou refluxo; o resto vira visual)
  └─ cobertura por página, ressalvas e situação (complete | with-caveats | partial) ─ ComparisonResult
```

  Algoritmos e tolerâncias: `docs/comparador/algoritmos.md`. Critérios de precisão e limitações: `docs/criterios-comparacao.md`.
  Avaliação no corpus sintético com gabarito: `server/comparison/evaluation/` (`npm run test:corpus`, `npm run avaliar:corpus`).
- API de comparação (`server/comparison/routes.ts`):

```
POST /api/comparisons (multipart: original, updated) ─ tipo, %PDF-, 50 MB, nome higienizado ─ 202 { id, status: queued }
  └─ ComparisonWorkerPool: fila (503 se cheia) → thread nova (memória e tempo limitados) → compareDocuments
       └─ ComparisonJobStore (memória): queued → processing(stage) → completed | failed; descartado ao ser entregue (5 min se não buscado); com login real, só o dono vê
GET /api/comparisons/:id → ComparisonJob        DELETE /api/comparisons/:id → cancela e descarta (204)
```

  Erros sempre no formato `ApiErrorBody` (`shared/contracts/api-error.ts`), com mensagem em português e sem detalhes internos.
- A API administrativa fica desligada por padrão e o servidor recusa o modo de desenvolvimento em produção.
  A autenticação real entrará trocando o `AuthProvider`, sem mexer em rotas, regras ou auditoria.

### Administração de contas

```
GET  /api/admin/status                         sempre responde { available, mode }
GET|POST /api/admin/accounts                   lista (q, papel, situacao, page, pageSize) · cria
GET|PATCH /api/admin/accounts/:id              detalhe · edita (nome, e-mail, papel + versao)
POST /api/admin/accounts/:id/desativar|reativar   situação (+ motivo opcional + versao)
GET  /api/admin/audit-events                   auditoria (contaId, acao, page, pageSize)
```

Com `ADMIN_API_MODE=dev`, o `DevAuthProvider` identifica a pessoa pelo cabeçalho `X-AQR-Dev-Actor` (o frontend envia o nome
digitado no login visual) e só aceita administradores ativos no banco. Cada alteração e o evento de auditoria compartilham a
mesma transação SQLite; a trilha é só de inserção (gatilhos do banco). O primeiro administrador sai de
`npm run admin:criar -- --usuario x --nome "Y"`.

Frontend (`src/features/admin/`): `AccountService` (contrato) com `createHttpAccountService` e `createInMemoryAccountService`
(testes); `AdminSessionProvider` consulta o `status` e o menu da conta só oferece "Administração de contas" quando está
disponível. Telas: `/administracao/contas` (lista e busca), `/administracao/contas/nova`, `/administracao/contas/:id`
(edição, situação e histórico) e `/administracao/auditoria`.

### Como entrará a autenticação real

Nada nas rotas, nas regras de `AccountService` ou nas telas muda. O que trocar:

1. Implementar outro `AuthProvider` (`server/auth/auth-provider.ts`) que leia a sessão (LDAP/AD, SSO da Prefeitura ou outro)
   e devolva o `Principal` com `origem: 'real'`; ligar em `server/app.ts` no lugar do `DevAuthProvider`.
2. Sessão em cookie `HttpOnly; Secure; SameSite=Strict`, com proteção contra CSRF nas rotas que alteram dados.
3. Migração `0002_identidade_externa` para ligar a conta ao identificador do provedor (o `usuario` institucional já casa
   com o login; não há senha guardada).
4. Trocar o login visual (`src/features/auth/`) pela autenticação real, **só com pedido explícito**; o `AdminSessionProvider`
   deixa de enviar `X-AQR-Dev-Actor` e passa a depender da sessão.
5. Remover o `DevAuthProvider`, o `ADMIN_API_MODE=dev` e a restrição de loopback em `server/admin/routes.ts`; manter a trava
   de que produção nunca inicia sem autenticação real.

## Decisões

| Decisão | Motivo |
|---|---|
| Vite + React Router, sem Next.js | Aplicação interna sem necessidade de SSR |
| Fastify 5 no servidor | Limites de upload em streaming, validação e `inject()` para testar rotas sem rede |
| `pdfjs-dist` (build legado) no servidor | Mesma biblioteca que o visualizador usará no navegador: posições compatíveis. Aberto em modo restrito (sem fontes do sistema, sem rede, `stopAtErrors`) |
| `diff` (jsdiff) para as diferenças | Algoritmo de Myers testado e mantido, com limites de edições e de tempo; sem dependências próprias |
| `pdf-lib` só nos testes | Gera PDFs sintéticos de verdade, com a posição de cada palavra como gabarito |
| `tsx` no desenvolvimento do servidor | Roda TypeScript direto com recarga, sem exigir Node mais novo que o `engines` atual |
| Rotas com `React.lazy` | O carregamento inicial fica com cerca de 140 KB em gzip, e o workspace carrega sob demanda |
| `zod/mini` | Validação com Zod e tree-shaking, para um uso pequeno (metadados do arquivo) |
| Estado com `useReducer` e Context, sem biblioteca de estado | O escopo atual não justifica Redux, Zustand ou React Query |
| shadcn/ui copiado para o projeto | Componentes acessíveis (Radix), adaptados aos tokens institucionais |
| Fonte hospedada no projeto (`@fontsource`) | Sem CDN externo, nenhuma requisição a terceiros |
| TypeScript 6.0 (não 7.0) | O `typescript-eslint` ainda não suporta TypeScript 7 |
| ESLint 9 (não 10) | O `eslint-plugin-jsx-a11y` ainda não declara suporte ao ESLint 10 |
| Ilustrações da home em SVG + CSS (`@keyframes`), sem biblioteca de animação | Só `transform` e `opacity` (sem mudança de layout). Pausadas fora da tela (IntersectionObserver) e quando inativas. Com `prefers-reduced-motion`, ficam no quadro estático |
| Login só visual, com sessão em `sessionStorage` | A etapa é de frontend; `AuthSessionProvider` concentra o ponto de troca para a autenticação real |
| Entrada do login em canvas + Web Animations API | Centenas de pontos animados sem biblioteca nova; a passagem para o cabeçalho sobrevive à troca de rota por ficar acima do roteador |
| Transição entre páginas com View Transitions API | Sem biblioteca: o React Router chama `document.startViewTransition` nos links com `viewTransition`, e só o `main` (`view-transition-name: page`) anima. Navegadores sem suporte trocam a página direto |
| Painel de demonstração da home com `tabIndex={-1}` | Clicável com o mouse, mas sem parada extra de tabulação: as opções já levam ao mesmo destino |
| Destaques inline como `span role="button"` | Assim o destaque quebra linha junto com o texto, o que `<button>` não faz |
