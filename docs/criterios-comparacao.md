# Critérios de precisão da comparação de PDFs

Verificados automaticamente por `server/comparison/compare-documents.test.ts` (e, para a posição das palavras,
`server/comparison/pdf/extract.test.ts`). Todos os casos usam **PDFs gerados de verdade** com `pdf-lib`
(`server/test/make-pdf.ts`) e passam pela mesma extração do pdf.js que os arquivos reais. O `pdf-lib`
também fornece o gabarito: a página e o retângulo de cada palavra desenhada.

## O que é comparado

- **Só o texto.** Fonte, cor, negrito, espaçamento, quebras de linha e de página e imagens não geram diferença
  (decisão provisória D3, a confirmar).
- Maiúsculas, acentos e pontuação **contam** (texto jurídico).
- São equivalentes: formas Unicode do mesmo caractere (NFKC; inclui ligaduras como "ﬁ", e também "1º" = "1o"),
  aspas e traços tipográficos, caracteres invisíveis e a hifenização de fim de linha ("requeri-" + "mento").
- PDF sem texto (digitalizado) não é comparado: dá `NO_EXTRACTABLE_TEXT`, sem OCR.

## Critérios e resultado atual (09/10/2026)

| Critério | Exigido | Atual |
|---|---|---|
| Documentos idênticos | 0 diferenças | 0 |
| Mesmo texto em outra diagramação (fonte 12 → 10, margem, largura de linha) | 0 diferenças | 0 |
| Palavra alterada | 1 modificação, textos dos dois lados, contexto certo | ok ("dez" → "quinze", "Art. 2º") |
| Linha inserida | 1 adição, sem lado original, com âncora no original | ok ("Art. 5º-A") |
| Linha removida | 1 exclusão, sem lado atualizado, com âncora no atualizado | ok ("Art. 2º, § 1º") |
| Várias páginas (modificação, exclusão e adição em páginas 1, 2 e 3) | tipo, página, contexto e ordem certos; resumo certo | ok |
| Página de cada diferença | 100% correta | 100% |
| Região do destaque (IoU contra o gabarito) | ≥ 0,5 em todos os casos | ok em todos os casos da suíte |
| Posição de cada palavra extraída (IoU) | ≥ 0,5 em todas; média ≥ 0,75 | mínimo ≈ 0,65; média ≈ 0,79 |
| PDF inválido, não-PDF, protegido por senha | `INCOMPATIBLE_DOCUMENT`, documento certo | ok |
| PDF só com imagens | `NO_EXTRACTABLE_TEXT`, documento certo | ok |
| Etapas | `validating → extracting → comparing → organizing` | ok |
| Desempenho: 2 × 100 páginas | < 10 s | ≈ 0,4 s (incluindo gerar os PDFs) |

## Como as diferenças são formadas

1. As palavras dos dois documentos viram uma sequência única (atravessando linhas e páginas); a pontuação no
   início e no fim da palavra vira item próprio.
2. O jsdiff (Myers) compara as duas sequências. Acima de 300 mil palavras, 50 mil edições ou 20 s, a comparação
   é feita por linhas; se nem assim couber, o resultado é `PROCESSING_FAILED`.
3. Uma adição ou exclusão pura é deslizada, só por palavras iguais, até começar numa linha.
4. Trechos separados por até 2 palavras iguais viram um só.
5. Cada trecho vira uma `Difference`: tipo, texto de cada lado, página e retângulo onde começa, âncora no
   documento em que não existe (adições e exclusões) e contexto (último artigo/parágrafo, cláusula, capítulo,
   título numerado ou em maiúsculas; sem título, "Página N").

## Limitações conhecidas

- A posição de uma palavra no meio da linha é estimada (o pdf.js informa a largura do trecho, não de cada letra).
- Um trecho que atravessa páginas é localizado pela página em que começa.
- Compostos quebrados no fim da linha ("bem-" + "estar") são unidos como hifenização.
- Texto em colunas ou tabelas segue a ordem do conteúdo do PDF, que pode não ser a ordem de leitura.
- PDFs com parte das páginas digitalizada: só o texto existente é comparado.
