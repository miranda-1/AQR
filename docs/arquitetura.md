# Arquitetura do frontend

## Visão geral

Aplicação React de página única (SPA), construída com Vite e TypeScript em modo strict. Não tem backend nesta etapa: a comparação de PDFs é **simulada** por um serviço demonstrativo, isolado atrás de um contrato TypeScript.

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
      services/           serviço demonstrativo (ponto de troca pelo backend)
      mocks/              dados fictícios, isolados
      session/            arquivos escolhidos, mantidos apenas em memória
      hooks/              execução da comparação, navegação, rolagem sincronizada
      components/         telas e painéis da comparação
      viewer/             visualizador de páginas (hoje, páginas simuladas em HTML)
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

Estão em `src/features/comparison/model/types.ts`:

- `ComparisonService.compare(input, { signal, onProgress })` → `Promise<ComparisonOutcome>`.
- `ComparisonOutcome` = `{ status: 'completed', result }` ou `{ status: 'failed', error }`.
- `ComparisonResult`: documentos, resumo e lista de `Difference`. Cada diferença tem tipo, contexto, texto e localização (`pageNumber` e `region` normalizada de 0 a 1) em cada documento.
- `ComparisonStage`: `validating | extracting | comparing | organizing`, para relatar o progresso.

Para ligar o backend:

1. Criar `services/http-comparison-service.ts`, que implementa `ComparisonService`. Ele envia os arquivos, acompanha o progresso (polling, SSE ou WebSocket) e mapeia a resposta para `ComparisonResult`.
2. Trocar `createMockComparisonService` em `pages/ComparisonWorkspacePage.tsx`. É o único ponto de troca.
3. Substituir o visualizador simulado (`viewer/SimulatedPageView`) por páginas reais do PDF (por exemplo, renderizadas com pdf.js), com destaques posicionados por `Difference.*.location.region`. `DocumentPane`, a lista, a navegação e a rolagem sincronizada continuam iguais.
4. Remover o seletor "Simular estado" e os avisos de protótipo (`appConfig.isPrototype = false`).

## Decisões

| Decisão | Motivo |
|---|---|
| Vite + React Router, sem Next.js | Aplicação interna sem necessidade de SSR |
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
| Painel de demonstração da home com `tabIndex={-1}` | Clicável com o mouse, mas sem parada extra de tabulação: as opções já levam ao mesmo destino |
| Destaques inline como `span role="button"` | Assim o destaque quebra linha junto com o texto, o que `<button>` não faz |
