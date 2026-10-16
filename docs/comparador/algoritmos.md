# Algoritmos do comparador de PDFs

Como cada método funciona, com as tolerâncias e os motivos. Os valores estão no código (constantes
nomeadas) e foram ajustados com o corpus sintético (`docs/comparador/avaliacao-corpus.md`).

## 1. Exame das páginas (`server/comparison/pdf/`)

- **Texto** (`extract.ts`): pdf.js extrai os trechos com posição. A largura de cada letra é estimada por
  pesos (o pdf.js informa a largura do trecho, não da letra). Cada palavra guarda a fonte (id do pdf.js) e o
  tamanho. O texto é lido na página **sem a rotação declarada** (linhas horizontais) e os retângulos são
  girados para a orientação exibida — assim os destaques ficam certos em páginas giradas.
- **Ordem de leitura** (`reading-order.ts`): corte XY conservador. Linhas partidas em trechos onde há vão
  de mais de 1,6 altura de letra; um corredor vertical vazio (≥ 1,2 altura de letra) que atravessa o bloco
  separa colunas (lidas uma depois da outra); se os dois lados têm trechos curtos (≤ 4 palavras em média)
  alinhados pela linha de base em ≥ 60 %, é tabela, lida linha a linha. Um vão horizontal só é usado se
  isolar um bloco em colunas (título acima de duas colunas). Sem corredor, a ordem do PDF é mantida.
- **Objetos** (`page-objects.ts`): lista de operadores do pdf.js, acompanhando a matriz de transformação
  (incluindo formulários): caixa de cada imagem, quantidade de desenhos vetoriais e uma **assinatura de
  fonte** (família genérica, negrito, itálico, Type 3, caixa dos glifos, matriz). O nome PostScript não é
  exposto pelo pdf.js, então a interface não mostra nome de fonte, só "com/sem serifa" e o tamanho.
- **Prévia** (`extract.ts`, `render.ts`): a página é desenhada com 300 px de largura (@napi-rs/canvas).
  Dela saem um resumo SHA-256 dos pixels (páginas idênticas nesta resolução), uma grade 16 × 20 de cinzas
  (semelhança aproximada) e a fração de tinta.
- **Tipo de conteúdo** (por página, nunca pelo documento inteiro): sem texto e sem tinta → em branco; sem
  texto e imagens cobrindo ≥ 50 % → digitalizada; sem texto, outra coisa → desenhos; com texto e imagens
  ≥ 25 % → mista; menos de 20 caracteres com tinta > 3 % → pouco texto; sem prévia → não examinada.

## 2. OCR (`server/comparison/ocr/ocr-engine.ts`)

- Tesseract (tesseract.js 7, WebAssembly) com o modelo `por` "best_int" do pacote `@tesseract.js-data/por`,
  lido do disco local (`langPath`), `cacheMethod: 'none'` (nada é gravado) e nunca a CDN padrão. Verificado
  num ambiente sem nenhuma interface de rede (`unshare -rn`).
- Roda só nas páginas digitalizadas, com pouco texto ou mistas (nestas, só as palavras dentro das imagens e
  que não se sobrepõem ao texto do PDF), até `COMPARISON_OCR_MAX_PAGES` por documento e dentro do orçamento
  de tempo. A página é desenhada com 2000 px de largura (≈ 240 dpi em A4).
- Palavras com confiança < 45 são descartadas como ilegíveis; sinais soltos sem letra ou número, com
  confiança < 80, também. Diferença com palavra de confiança < 70 fica "conferir".
- Confiança média por página vem do próprio Tesseract (não é calculada pelo AQR).

## 3. Correspondência de páginas (`server/comparison/structure/page-matching.ts`)

1. Semelhança de cada par: coeficiente de Dice sobre a contagem de palavras (0,85) + aparência (0,15)
   quando as duas têm texto; com OCR, o maior entre texto e aparência (o OCR varia entre digitalizações);
   sem texto, só a aparência (grade de cinzas: 1 − |Δ tinta| / tinta total). Prévias idênticas valem 1.
2. Alinhamento em ordem por programação dinâmica numa faixa da diagonal (≥ 25 páginas), ganho
   = semelhança − 0,35.
3. Sobras dos dois lados com semelhança ≥ 0,8 → página **movida**.
4. Sobra cujo texto está ≥ 60 % no **excedente** do outro documento (o que ele tem a mais que todas as
   demais páginas deste) → **refluxo** (o texto mudou de página), comparada pelo texto; senão incluída ou
   excluída. Uma cópia repetida não é refluxo: a outra cópia consome as mesmas palavras.
5. Página com gêmea idêntica no mesmo documento, com quantidades diferentes entre os dois → **ambígua**.

## 4. Texto (`server/comparison/text/`, `diff/`)

- Normalização (NFKC, ligaduras, aspas, traços, invisíveis, hifenização de fim de linha); maiúsculas,
  acentos e pontuação contam. Pontuação nas pontas da palavra vira item próprio.
- jsdiff (Myers) palavra a palavra nas páginas em ordem (excluídas, incluídas e movidas ficam fora); acima
  de 300 mil palavras, 50 mil edições ou 20 s, por linhas (ressalva `TEXT_ALIGNED_BY_LINES`). Páginas
  movidas são comparadas uma a uma com a sua correspondente.
- Trechos a até 2 palavras iguais se unem; adições e exclusões deslizam até o início da linha.
- **Movimentação**: exclusão e inclusão (≥ 3 palavras) com exatamente as mesmas palavras → um trecho movido.
- **Subtipo** (`classify.ts`): valor ("R$" ou centavos), data (numérica ou por extenso), identificador
  (nº, processo, protocolo, CPF, CNPJ etc. seguidos de número, ou `00/00/00`), número isolado, numeração de
  página (número nas faixas de 8 % do topo ou do pé), texto.
- **Regiões** (`regions.ts`): um retângulo por linha (pedaços na mesma faixa vertical a até 3 alturas de
  distância), mais as páginas em que o trecho continua. Nada de um retângulo único cobrindo regiões separadas.

## 5. Comparação visual (`server/comparison/visual/raster-diff.ts`)

- As duas páginas são desenhadas **na mesma escala** (1000 px para a mais larga; 2000 px se alguma é
  digitalizada, mista ou com pouco texto). Páginas com a mesma prévia exata não são redesenhadas.
- **Alinhamento global**: deslocamento (dx, dy) até 4 % da largura que minimiza a diferença dos perfis de
  tinta das linhas e colunas.
- **Máscara**: um pixel difere se a maior diferença de canal passa de 48 e o tom de um dos lados fica fora
  da faixa [mínimo − 48, máximo + 48] da vizinhança 3 × 3 do outro (mapas de mínimo e máximo pré-calculados).
  Isso absorve serrilhado e bordas deslocadas por fração de pixel sem esconder traços novos. (Raio 2 foi
  testado e escondeu um dígito trocado numa digitalização; descartado.)
- **Ruído**: células de 4 × 4 px com ≥ 2 pixels diferentes; componentes conexos unindo células a até 2
  células; componentes com < 12 pixels descartados (escalado pela área física quando a resolução dobra).
  Em digitalizações, manchas com menos de ~3 pt de lado são sujeira.
- **Realinhamento local**: região do tamanho de palavras que some com um deslocamento de até 2 px
  (≈ 0,4 mm) é arredondamento de posição entre geradores, não diferença.
- **Páginas giradas** de forma diferente são desenhadas sem rotação e as regiões giradas de volta.

## 6. Imagens (`visual/images.ts`)

Assinatura 12 × 12 de cinzas do recorte renderizado de cada imagem (independe de compressão e resolução).
Mesma aparência (distância ≤ 14/255) → igual, **movida** (> 0,6 % da página) ou **redimensionada** (> 3 %);
com mudança visual dentro → **conteúdo alterado**. Aparência diferente no mesmo lugar (IoU ≥ 0,5) →
**trocada**. Sobras → incluída ou excluída. Imagens ≥ 50 % da página são digitalizações (ficam para o OCR e
a comparação visual); < 0,04 % são ignoradas.

## 7. Formatação (`visual/formatting.ts`)

Para cada palavra igual nos dois documentos, em páginas correspondentes:
- fonte (assinatura) e tamanho (> 8 %) **só onde a aparência mudou** (outro gerador pode reincorporar a
  mesma fonte com outra assinatura sem mudar nada do que se vê);
- cor: mediana do terço mais escuro da tinta (o miolo dos traços); no mesmo lugar, confirmada pixel a
  pixel (≥ 60 % dos pixels com tinta nas duas versões mudaram de cor), para separar mudança de cor de um
  traço de outra cor cruzando a palavra;
- posição: deslocamento > 0,8 % da página **só em página intacta** (todas as palavras dos dois lados são
  iguais entre si); nas outras, deslocamento é refluxo.
Palavras seguidas com a mesma mudança formam um trecho (pontuação sem medida não interrompe); mais de 6
trechos, ou > 60 % das palavras, viram uma diferença para a página toda ("Diagramação alterada").

## 8. Consolidação (`consolidate.ts`)

Cada região visual é explicada, nesta ordem, por: diferença de texto no lugar (ganha "visual" e vira
**confirmada**); imagem; formatação; palavras iguais deslocadas (refluxo, descontado o deslocamento global);
linha fina (≤ 3 pt) com até o dobro de tinta (espessura de rasterização). O que sobra vira diferença
visual: inclusão/exclusão de tinta (detectada) ou alteração sem causa identificada (**conferir**).
Diferenças independentes nunca são fundidas por proximidade. OCR: leitura incerta sobre mudança visual →
diferença visual com a leitura anotada; leitura incerta sem mudança visual → descartada (ressalva
`OCR_NOISE_DISCARDED`); leitura confiável sem confirmação visual → mantida como "conferir".

## 9. Situação da análise (`shared/contracts/comparison.ts`, `analysisStatusOf`)

- `partial`: alguma página com método aplicável sem análise (OCR indisponível ou no limite, comparação
  visual desligada ou sem tempo, página não desenhada) ou ressalva de limitação;
- `with-caveats`: tudo examinado, mas com OCR, OCR de baixa confiança, correspondência ambígua, imagens
  grandes sem leitura do texto ou texto comparado por linhas;
- `complete`: todos os métodos aplicáveis rodaram em todas as páginas.
A falha impeditiva continua sendo `ComparisonError` (arquivo inválido, protegido, limite, tempo).

## 10. Desempenho

Etapas medidas por `npm run medir:desempenho` (`docs/comparador/desempenho.md`). O custo dominante é a
comparação visual de páginas que mudaram de aparência; páginas idênticas na prévia são puladas. O
orçamento (75 % do tempo máximo da tarefa) faz a comparação visual e o OCR pararem antes de a tarefa
estourar o tempo; as páginas restantes ficam marcadas como não analisadas e a análise, parcial.
