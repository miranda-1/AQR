# AQR: instruções para agentes

Frontend React 19 + Vite 8 + TypeScript 6 (strict) + Tailwind 4 + shadcn/ui. Etapa atual: **apenas frontend**, sem backend, processamento real de PDF, IA, banco de dados, autenticação ou deploy.

## Comandos
`npm run dev` · `npm run typecheck` · `npm run lint` · `npm test` · `npm run build`. Rode os quatro últimos antes de concluir qualquer mudança.

## Regras do projeto
- **Marca:** usar apenas `src/assets/brand/prefcg-azul.svg`, via `<BrandMark />`. Nunca redesenhar, recolorir, distorcer ou reconstruir a marca ou o brasão. Ver `src/assets/brand/README.md`.
- **Layout:** blocos são separados por fundo tonal, sombra (`shadow-surface`) e espaçamento — não usar linhas divisórias (`border-b/t`, `divide-*`).
- **Logo do AQR:** usar `<AqrLogo />` / `<AqrLensSymbol />` (`src/components/layout/AqrLogo.tsx`); não redesenhar. Ver `src/assets/aqr/README.md`.
- **Cores:** só por tokens (`src/styles/tokens.css` → `globals.css`). O amarelo `#FFCC00` é decorativo: nunca usar em texto ou foco.
- **Dados fictícios** ficam em `features/comparison/mocks/` e nunca devem parecer resultado real. Avisos de protótipo dependem de `appConfig.isPrototype`.
- **Contratos** de comparação ficam em `features/comparison/model/types.ts`. O backend futuro implementa `ComparisonService`.
- **Diferenças:** cor nunca é o único indicador (ícone + rótulo + tratamento do texto).
- **Interface em português (pt-BR):** frases em caixa normal, verbos claros, erros que dizem o que houve e como resolver.
- **Sem dependências novas** sem justificativa. Sem `any`. Sem "!" (non-null) — em testes, use `defined()` de `src/test/files.ts`.
- **Testes** consultam por papel e nome acessível. Mudanças de interface devem manter `src/test/a11y.test.tsx` passando.
- Decisões de identidade não previstas no manual vão para `docs/identidade-visual.md`, para validação institucional.
