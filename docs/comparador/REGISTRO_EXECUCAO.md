# Registro de execução: evolução do comparador de PDFs

Registro persistente da missão "evolução completa do sistema de comparação de PDFs" (pedido do
responsável em 15/10/2026). Serve para retomar o trabalho se a sessão for interrompida. Sem dados
sensíveis: só decisões, estado e comandos.

## Baseline (15/10/2026, antes de qualquer mudança)

- Repositório: `/home/miranda/codigos/AQR`, branch `master`, HEAD `9e972e9`, árvore limpa.
- `npm run lint`, `npm run typecheck`: sem erros. `npm test`: 42 arquivos, 293 testes, todos passando.
- Ambiente: Node 26.8.1; `@napi-rs/canvas` 1.0.10 já presente (dependência opcional do pdfjs-dist).

### O que a auditoria de 10/10 apontou e o estado encontrado

| Achado da auditoria | Estado em 15/10 (antes) |
|---|---|
| Imagens não comparadas | Continuava |
| Mudanças só visuais ignoradas | Continuava |
| Fontes, cores, diagramação ignoradas | Continuava |
| Sem OCR | Continuava (PDF sem texto → erro `NO_EXTRACTABLE_TEXT`) |
| Páginas digitalizadas passam despercebidas | Continuava: num PDF misto, a página sem texto era ignorada em silêncio |
| Sem correspondência estrutural de páginas | Continuava |
| Tabelas e colunas | Continuava (ordem do fluxo do PDF) |
| Marcações enormes | Continuava (união de todas as palavras do trecho na página) |
| Memória do visualizador | Parcial: desenho só perto da tela, mas o canvas nunca era liberado |
| Sem exportação | Continuava |
| Sem corpus com gabarito | Parcial: suíte sintética pequena, só texto |
| Isolamento de tarefas, cancelamento, limites | Já resolvido (thread por tarefa, fila, tempo, memória, dono) |

## Decisões técnicas

- **Formato 2 do resultado** (`shared/contracts/comparison.ts`): categoria, subtipo, métodos e
  evidência por diferença; cobertura por página; correspondência de páginas; ressalvas; situação
  (`complete`, `with-caveats`, `partial`). O frontend valida `formatVersion: 2` e recusa outro formato.
- **Renderização no servidor**: pdf.js + `@napi-rs/canvas` (MIT, binário pré-compilado, sem rede).
- **Comparação de pixels própria** (sem pixelmatch): precisa de alinhamento global, tolerância por
  vizinhança nos dois sentidos e regiões por componentes conexos, que o pixelmatch não dá.
- **OCR**: `tesseract.js` 7 (Apache-2.0) + `@tesseract.js-data/por` 1.0.0 (modelo `best_int`
  versionado no lockfile). Sempre com `langPath` local e `cacheMethod: 'none'`: o tesseract.js nunca
  usa a CDN padrão nem grava cache. OpenCV descartado (peso e instalação sem ganho medido).
- **Página não é identidade**: correspondência por programação dinâmica com semelhança de texto e
  aparência (`structure/page-matching.ts`).
- **Consolidação**: região visual explicada por texto, imagem, formatação ou refluxo não vira
  diferença própria; o resto vira diferença visual (`consolidate.ts`).

## Progresso

| Fase | Situação | Commit |
|---|---|---|
| 0. Baseline | feito | — |
| 1. Contrato e confiabilidade | feito | ver git log |
| 3–7. Motores (texto, estrutura, visual, OCR, consolidação) | primeira versão integrada | ver git log |
| 8. Frontend (modos, filtros, situação, exportação) | primeira versão integrada | ver git log |
| 2. Corpus com gabarito e avaliação | em andamento | — |
| 9. Desempenho | pendente | — |
| 10. Segurança | pendente | — |
| Relatório final | pendente | — |

## Retomada

```bash
cd /home/miranda/codigos/AQR
git status && git log --oneline | head
npm run lint && npm run typecheck && npm test && npm run build
```
