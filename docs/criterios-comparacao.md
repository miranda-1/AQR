# Critérios de precisão da comparação de PDFs

Verificados automaticamente por três suítes, todas com **PDFs gerados de verdade** que passam pelo mesmo
pdf.js dos arquivos reais:

- `server/comparison/compare-documents.test.ts` e `coverage.test.ts`: contrato, etapas, entradas
  problemáticas, cobertura da análise e escala;
- `server/comparison/evaluation/` (projeto `corpus` do Vitest, `npm run test:corpus`): 47 pares com
  gabarito escrito à mão e localizado pelas posições que o gerador desenhou, mais os mesmos PDFs regravados
  pelo Ghostscript e pelo Cairo. Relatório por categoria: `npm run avaliar:corpus`
  (`docs/comparador/avaliacao-corpus.md`);
- testes unitários de cada método (`reading-order`, `page-matching`, `raster-diff`, `classify`,
  `consolidate`).

Algoritmos e tolerâncias: `docs/comparador/algoritmos.md`.

## O que é comparado

- **Texto** (camada de texto do PDF e, onde não há, OCR local): adições, exclusões, modificações e trechos
  movidos; números, datas, valores e identificadores reconhecidos pela forma (sem interpretação semântica).
  Maiúsculas, acentos e pontuação **contam**. São equivalentes: formas Unicode do mesmo caractere (NFKC,
  ligaduras, "1º" = "1o"), aspas e traços tipográficos, invisíveis e a hifenização de fim de linha.
- **Estrutura**: páginas incluídas, excluídas, movidas, repetidas; tamanho e orientação.
- **Aparência**: imagens (incluída, excluída, trocada, movida, redimensionada, alterada por dentro),
  desenhos e elementos gráficos, fonte, tamanho, cor, posição do texto e diagramação.
- **Digitalizados**: cada página é classificada (texto, digitalizada, mista, em branco, desenhos, pouco
  texto); OCR onde falta texto; a comparação visual complementa. Assinaturas digitalizadas são imagem; a
  autenticidade de assinaturas (digitais ou não) **não** é verificada.

## Critérios (exigidos pelo gabarito do corpus)

| Critério | Exigido |
|---|---|
| Documentos idênticos | 0 diferenças, análise completa |
| Mesmo texto em outra diagramação | 0 diferenças de texto; só formatação (fonte, diagramação) |
| Visualmente iguais, gerados de formas diferentes (palavra a palavra, outro gerador) | 0 diferenças |
| Mesma imagem em PNG e JPEG | 0 diferenças |
| Cada mudança introduzida | encontrada, com a categoria, o tipo e o subtipo certos |
| Página de cada diferença | a do gabarito, nos dois documentos |
| Região | sobreposição em cada eixo ≥ 50 % da menor extensão; área ≤ 4 × a esperada + 2 % da página |
| Diferenças fora do gabarito | só as toleradas e justificadas caso a caso (ex.: diagramação depois de trocar a fonte) |
| PDF inválido, protegido, corrompido | `INCOMPATIBLE_DOCUMENT`, documento certo |
| Página sem leitura possível | a análise diz qual e por quê (situação parcial ou com ressalvas) |

Resultado atual: **47 de 47 casos** e os 8 casos de regravação (ver relatório).

## Semântica do resultado

- "Nenhuma diferença foi detectada nas áreas analisadas" — nunca "os documentos são iguais".
- `complete`: todos os métodos aplicáveis rodaram em todas as páginas. `with-caveats`: tudo examinado, com
  qualidade reduzida em parte (OCR, ambiguidade, ordem de leitura, comparação por linhas ou páginas).
  `partial`: alguma página ou método aplicável ficou sem análise (OCR ou visual indisponível ou sem tempo).
- Evidência: **confirmada** (dois métodos), **detectada** (um método, direto do arquivo), **conferir**
  (OCR de baixa confiança, mudança visual sem causa identificada, leitura de OCR sem confirmação visual).

## Limitações conhecidas

- A posição de uma palavra no meio da linha é estimada (o pdf.js informa a largura do trecho, não da letra).
- Ordem de leitura: colunas e tabelas são reconhecidas por corredores vazios; um título que encosta nas
  colunas sem espaço maior que o normal, ou tabelas sem alinhamento pela linha de base, seguem a ordem do PDF.
- Fonte: o pdf.js não expõe o nome; a mudança é detectada pela assinatura e mostrada como família genérica.
  Mudança de fonte sem nenhuma mudança visível não é relatada (quando a comparação visual roda).
- Mudança de posição do texto só é relatada em página "intacta" (sem inclusões ou exclusões de texto); nas
  demais, o deslocamento é tratado como refluxo. Uma margem alterada numa página que também teve o texto
  editado aparece só pela edição.
- Comparação visual a 120 dpi (240 dpi em digitalizadas): deslocamentos de até ~0,4 mm (2 px) e linhas
  finas que só mudam de espessura (até 2 ×) não são relatados.
- Compostos quebrados no fim da linha ("bem-" + "estar") são unidos como hifenização.
- OCR: depende da qualidade da digitalização; texto ilegível resulta em ressalva e diferenças "conferir".
  Páginas acima de `COMPARISON_OCR_MAX_PAGES` ficam sem leitura (análise parcial).
- Documentos muito grandes ou muito diferentes: texto comparado por linhas ou página a página (ressalva) e
  comparação visual limitada pelo orçamento de tempo (análise parcial).
- O corpus é sintético. A validação com requerimentos reais da SEMADES continua pendente.
