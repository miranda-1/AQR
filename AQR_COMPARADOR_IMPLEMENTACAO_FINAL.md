# AQR — Comparador de PDFs: relatório final da implementação

Data: 16/10/2026. Repositório `AQR`, branch `master`, de `9e972e9` (baseline) a `fd5e7d8` + o commit deste
relatório. Seis commits locais, **sem push e sem deploy**. 93 arquivos alterados (+8,7 mil linhas).

## 1. Resumo executivo

O comparador deixou de olhar só o texto. Agora compara cinco dimensões e junta as evidências numa lista
única:

- **texto**: camada de texto do PDF e OCR local. Detecta adições, exclusões, modificações e trechos
  movidos, e reconhece números, datas, valores, identificadores e numeração de página;
- **estrutura**: páginas incluídas, excluídas, movidas, repetidas ou redistribuídas, além de tamanho e
  orientação;
- **aparência**: imagens (incluída, excluída, trocada, movida, redimensionada ou alterada por dentro),
  desenhos, fonte, tamanho, cor, posição e diagramação;
- **digitalizados**: classificação de cada página, OCR em português sem rede e comparação visual
  complementar;
- **consolidação**: uma alteração vista pelo texto e pelos pixels vira uma diferença só, marcada como
  "confirmada".

Cada resultado informa o que foi e o que não foi analisado em cada página, com três situações possíveis:
completa, com ressalvas ou parcial. "Nenhuma diferença" nunca aparece como prova de igualdade.

A interface ganhou:

- situação da análise sempre visível;
- modos Completo, Conteúdo e Visual;
- filtro por categoria;
- lista com antes e depois, método e força da evidência;
- destaques por linha e por categoria, com a correspondência e a cobertura de cada página;
- exportação em HTML (com ou sem trechos dos documentos) e em JSON.

Evidência produzida:

- 404 testes automatizados;
- corpus com gabarito: **47 de 47** casos, mais 8 regravações por outros geradores;
- navegador real: 19 de 19 verificações;
- desempenho medido de 10 a 1.000 páginas.

## 2. Estado inicial (baseline `9e972e9`)

O fluxo era: extração com pdf.js → diff palavra a palavra (jsdiff) → destaques. Os PDFs eram processados
em threads isoladas, com fila, limites, cancelamento e dono da comparação.

Problemas confirmados no código:

- imagens e aparência ignoradas;
- PDF sem texto recusado e página digitalizada de um PDF misto ignorada em silêncio;
- sem correspondência de páginas;
- colunas lidas na ordem do fluxo do PDF;
- destaque como um único retângulo cobrindo o trecho inteiro;
- canvas do visualizador nunca liberado;
- sem exportação.

Baseline: lint e typecheck limpos, 293 testes passando. Detalhes em
`docs/comparador/REGISTRO_EXECUCAO.md`.

## 3. Arquitetura final

```
validação → exame das páginas (texto+fonte, ordem de leitura, imagens, prévia, tipo de conteúdo)
→ OCR onde falta texto → correspondência de páginas → texto (palavras → linhas → páginas)
→ estrutura → por par de páginas: pixels, imagens, formatação → consolidação
→ reconferência a 240 dpi do texto não confirmado → cobertura, ressalvas, situação
```

Tudo roda dentro da thread isolada que já existia, com um **orçamento de tempo** (75 % do tempo máximo da
tarefa). Ao atingi-lo, o OCR e a comparação visual param e as páginas restantes ficam marcadas como não
analisadas. Diagrama e responsabilidades: `docs/arquitetura.md`. Algoritmos e tolerâncias:
`docs/comparador/algoritmos.md`.

## 4. Alterações por módulo

| Módulo | O que faz |
|---|---|
| `shared/contracts/comparison.ts` | Formato 2: categoria, subtipo, métodos, evidência, regiões múltiplas, continuação, cobertura por página, correspondência, ressalvas, situação |
| `server/comparison/pdf/extract.ts`, `reading-order.ts`, `page-objects.ts`, `render.ts` | Exame por página, colunas e tabelas, imagens e fontes, renderização no servidor |
| `server/comparison/ocr/ocr-engine.ts` | OCR local (tesseract.js + modelo `por`) |
| `server/comparison/structure/page-matching.ts` | Correspondência entre páginas |
| `server/comparison/text/classify.ts`, `regions.ts`, `diff/align.ts` | Subtipos, destaques por linha, escada palavras → linhas → páginas |
| `server/comparison/visual/raster-diff.ts`, `images.ts`, `formatting.ts` | Pixels, imagens, formatação |
| `server/comparison/consolidate.ts`, `drafts.ts`, `compare-documents.ts` | Consolidação e orquestração |
| `server/comparison/evaluation/` | Gerador do corpus, gabarito, avaliação, relatório, desempenho |
| `server/config.ts`, `limits.ts` | `COMPARISON_VISUAL`, `COMPARISON_OCR`, `COMPARISON_OCR_MAX_PAGES`, `COMPARISON_OCR_LANG_PATH`, orçamento |
| `src/features/comparison/` | Modos, categorias, situação da análise, lista, destaques, exportação, liberação de canvas |
| `scripts/e2e-navegador.mts` | Ponta a ponta no Chromium |

## 5. Algoritmos

Resumo; o detalhe está em `docs/comparador/algoritmos.md`.

- **Texto:** jsdiff palavra a palavra nas páginas que estão em ordem. Se não couber, compara por linhas e,
  em último caso, página a página. Trechos movidos são pares exatos de exclusão e inclusão.
- **Páginas:** programação dinâmica em faixa sobre semelhança de texto (Dice) e de aparência. Páginas fora
  de ordem com semelhança ≥ 0,8 são "movidas"; o refluxo é reconhecido pelo excedente de palavras.
- **Pixels:**
  - alinhamento global pelos perfis de tinta;
  - teste de faixa de tons 3 × 3, para tolerar serrilhado e deslocamento de fração de pixel;
  - células de 4 px e componentes conexos;
  - realinhamento local de ±2 px;
  - filtro de sujeira em digitalizações.
- **Imagens:** assinatura 12 × 12 do recorte renderizado, que independe da compressão.
- **Formatação:** fonte e tamanho só onde a aparência mudou; cor medida pelo miolo do traço e confirmada
  pixel a pixel; posição só em páginas intactas.
- **Consolidação:** uma região visual explicada por texto, imagem, formatação, refluxo ou espessura de
  rasterização não vira diferença própria. Leitura de OCR incerta sobre uma mudança visual vira diferença
  visual, com a leitura anotada.

## 6. Bibliotecas

| Biblioteca | Situação | Motivo |
|---|---|---|
| `pdfjs-dist`, `diff`, `zod`, `fastify` | mantidas | já atendiam |
| `@napi-rs/canvas` 1.0.10 (MIT) | declarada (já vinha como dependência opcional do pdf.js) | renderização no servidor, binário pré-compilado, sem rede |
| `tesseract.js` 7.0.0 (Apache-2.0) | adicionada | OCR local em WebAssembly, sem binário do sistema |
| `@tesseract.js-data/por` 1.0.0 (MIT) | adicionada | modelo português versionado no lockfile; nada é baixado ao rodar |
| `@pdf-lib/fontkit` 1.1.1 (MIT) | adicionada (só desenvolvimento) | fonte incorporada no corpus |
| pixelmatch, OpenCV | não adotadas | pixelmatch não traz alinhamento, faixa de tons nem regiões; OpenCV é pesado demais sem ganho medido |

## 7. Requisitos e evidências

| Requisito | Situação | Evidência |
|---|---|---|
| Comparação textual aprimorada (adição, exclusão, modificação, movimentação, números, datas, valores) | ✅ | corpus 02–10, 24, 35, 40; `classify.test.ts` |
| Destaques precisos | ✅ | critério de região no gabarito; `PdfPages.test.tsx` |
| Correspondência de páginas, páginas incluídas, excluídas e reorganizadas | ✅ | corpus 21–23, 38, 46, 47; `page-matching.test.ts` |
| Comparação visual real, imagens e elementos gráficos | ✅ | corpus 11–16, 33, 37; `raster-diff.test.ts` |
| Alterações de aparência | ✅ | corpus 17–20, 34, 36 |
| Tabelas e colunas | ✅ | corpus 24, 25, 40; `reading-order.test.ts` |
| OCR para digitalizados | ✅ | corpus 26, 27, 41–45; OCR comprovado sem rede (`unshare -rn`) |
| Páginas não analisadas detectadas | ✅ | `coverage.test.ts`; `comparison.test.ts` |
| Consolidação sem duplicações | ✅ | `consolidate.test.ts`; corpus (nenhuma diferença duplicada) |
| Modos Conteúdo, Visual e Completo | ✅ | `modes.test.ts`, `PdfPages.test.tsx`, navegador |
| Navegação e filtros por categoria | ✅ | `PdfPages.test.tsx`, `ComparisonWorkspace.test.tsx` |
| Falhas e limitações representadas | ✅ | situação, ressalvas, hachura e aviso em cada página |
| Exportação de relatório | ✅ | `report.test.ts`; download no navegador real |
| Limites e cancelamento | ✅ | testes existentes de pool e rotas; orçamento; 1.000 páginas pela thread real |
| Testes por categoria, regressão e integração frontend–backend | ✅ | 404 testes; `tests/integration`; e2e no navegador |
| Segurança | ✅ | seção 11 |
| Avaliação de desempenho | ✅ | seção 10 |
| Documentação | ✅ | `docs/comparador/*`, `criterios-comparacao.md`, `arquitetura.md`, README, CONTEXTO |
| Build, lint e typecheck | ✅ | rodados antes de cada commit |
| Validação com documentos reais da SEMADES | ⛔ pendente | não há documentos reais disponíveis (seção 12) |

## 8. Testes

Comandos:

- `npm run lint`, `npm run typecheck`, `npm run build`: sem erros;
- `npm test`: 51 arquivos e 404 testes passando, nos projetos frontend, servidor, integração e corpus;
- `npm run test:corpus`: 47 casos com gabarito e 8 regravações (Ghostscript: 0 diferenças; Cairo: só a
  troca real da Helvetica pela Nimbus Sans);
- `node --import tsx scripts/e2e-navegador.mts`, com `npm run dev` rodando: 19 de 19 verificações no
  Chromium (valor, imagem, página incluída, digitalizado, idênticos, modos e exportação). Capturas em
  `docs/comparador/capturas/`.

## 9. Qualidade (corpus sintético, gabarito independente)

| Categoria | Casos | Esperadas | Encontradas | Omitidas | Classificação errada | Localização errada | Falsas | Toleradas |
|---|---|---|---|---|---|---|---|---|
| texto | 14 | 18 | 18 | 0 | 0 | 0 | 0 | 0 |
| imagem | 7 | 7 | 7 | 0 | 0 | 0 | 0 | 0 |
| aparência | 5 | 5 | 5 | 0 | 0 | 0 | 0 | 4 |
| estrutura | 8 | 9 | 9 | 0 | 0 | 0 | 0 | 3 |
| digitalizado | 7 | 6 | 6 | 0 | 0 | 0 | 0 | 1 |
| negativo (deve dar zero) | 4 | 0 | — | — | — | — | 0 | 0 |
| entrada (corrompido, senha) | 2 | erro esperado | ok | | | | | |

As diferenças "toleradas" são reais e estão justificadas no gabarito, por exemplo a diagramação que muda
depois de trocar a fonte e a numeração "de 3" → "de 4" depois de incluir uma página. Não há porcentagem
global de precisão: o corpus é sintético e não mede o desempenho em documentos reais.

Para chegar a 47 de 47, a primeira rodada (37 de 47) levou a correções reais do comparador:

- texto em página girada;
- serrilhado com deslocamento de fração de pixel;
- cópia repetida tratada como refluxo;
- carimbo lido como mudança de cor;
- ruído e rabiscos no OCR;
- sujeira de digitalização.

Também houve dois ajustes no gabarito (palavra repetida na mesma página e folga de altura do destaque),
registrados em `REGISTRO_EXECUCAO.md`.

## 10. Desempenho (`docs/comparador/desempenho.md`)

| Páginas | Típico (3 edições + 1 imagem) | Pior caso (todas as páginas com outra diagramação) |
|---|---|---|
| 10 | 0,8 s | 1,6 s |
| 100 | 2,6 s | 14 s |
| 500 | 11 s | 80 s, completa |
| 1.000 | 21 s | 90 s, **parcial** (`VISUAL_LIMIT_REACHED`) |

Memória medida no processo: até cerca de +480 MB no pico. Pela thread real do servidor (768 MB, 120 s), o
pior caso de 1.000 páginas termina em 90 s, como parcial.

Otimizações feitas:

- mapas de vizinhança pré-calculados (custo visual por página de ~0,45 s para ~0,15 s);
- agrupamento por página, eliminando filtragens quadráticas;
- texto longo tentado palavra a palavra antes de cair para linhas;
- correção de `push(...lista)`, que estourava a pilha com documentos longos;
- frontend: canvas liberado fora da tela e tamanhos das páginas vindos do servidor.

## 11. Segurança e privacidade

- Nenhum documento sai do servidor. O OCR é local, foi comprovado sem rede com `unshare -rn`, usa o modelo
  do pacote e `cacheMethod: 'none'`, sem escrita em disco (confirmado no código do tesseract.js).
- Nada novo é persistido: o resultado continua só em memória e é descartado ao ser entregue. A exportação
  é gerada no navegador e pode omitir os trechos dos documentos.
- Logs: só id, situação, tempo e bytes, sem conteúdo.
- Autenticação, Keycloak, dono da comparação, CSRF e limites de envio não foram alterados.
- Risco residual: a memória da thread do Tesseract e os buffers nativos (canvas) não entram no limite
  `maxOldGenerationSizeMb`. O que os contém é o lado máximo de 4.000 px, o processamento página a página,
  o limite de páginas com OCR e o tempo da tarefa.

## 12. Problemas restantes

- **Documentos reais da SEMADES:** a validação continua pendente. Todo o corpus é sintético e os PDFs de
  teste citados no CONTEXTO não estão mais na máquina.
- **Aprovação visual** da interface nova pelo responsável (capturas em `docs/comparador/capturas/`).
- **Limitações conhecidas** (listadas em `docs/criterios-comparacao.md`):
  - posição das letras estimada;
  - ordem de leitura heurística;
  - nome da fonte não exposto pelo pdf.js;
  - mudança de posição só em páginas intactas;
  - deslocamentos de até ~0,4 mm ignorados;
  - pior caso acima de ~550 páginas fica parcial.
- No navegador, o pdf.js ainda avisa `standardFontDataUrl` (pendência anterior a esta missão).
- O OCR acrescenta ~2 s por página digitalizada.

## 13. Como executar

```bash
npm install
npm run dev                      # API (127.0.0.1:3000) e site (localhost:5173)
npm run lint && npm run typecheck && npm test && npm run build
npm run test:corpus              # corpus com gabarito
npm run avaliar:corpus -- --saida docs/comparador/avaliacao-corpus.md
npm run medir:desempenho -- --paginas 10,100,1000 --saida docs/comparador/desempenho.md
node --import tsx scripts/e2e-navegador.mts docs/comparador/capturas   # com npm run dev rodando
```

Variáveis novas: `COMPARISON_VISUAL`, `COMPARISON_OCR`, `COMPARISON_OCR_MAX_PAGES` e
`COMPARISON_OCR_LANG_PATH` (ver `.env.example`).

## 14. Próximas melhorias

- Validar e calibrar os limiares com requerimentos reais (bloqueado: depende de documentos).
- Servir `standard_fonts` ao pdf.js no navegador.
- Ler a largura de cada glifo pela lista de operadores, para melhorar a posição das letras.
- Paralelizar a comparação visual entre páginas, se o pior caso for frequente em documentos longos.

## 15. Contexto para revisão independente (resumo autocontido)

O AQR (SEMADES, Prefeitura de Campo Grande/MS) compara dois PDFs. A pilha é React 19 + Vite no frontend e
Fastify + TypeScript no servidor, com threads isoladas por comparação. A comparação passou de "só texto" a
híbrida:

- pdf.js extrai texto, fontes e imagens;
- `@napi-rs/canvas` renderiza as páginas;
- tesseract.js faz OCR local em português;
- jsdiff compara o texto;
- módulos próprios cuidam da correspondência de páginas (programação dinâmica), da comparação de pixels
  (alinhamento, faixa de tons, componentes conexos) e da consolidação das evidências.

O resultado (contrato em `shared/contracts/comparison.ts`, formato 2) traz, para cada diferença:
categoria, subtipo, métodos e evidência (confirmada, detectada ou conferir). Traz também a cobertura de
cada página e a situação da análise (completa, com ressalvas ou parcial), para nunca confundir "nada
detectado" com "documentos iguais".

A qualidade é medida num corpus de 47 pares de PDFs sintéticos com gabarito independente
(`server/comparison/evaluation/`), onde passam todos os casos; a robustez, em regravações pelo Ghostscript
e pelo Cairo; o desempenho, de 10 a 1.000 páginas. A principal lacuna é a validação com documentos reais.
Para revisar, os pontos de partida são `docs/comparador/algoritmos.md`, `server/comparison/compare-documents.ts`
e `server/comparison/consolidate.ts`.
