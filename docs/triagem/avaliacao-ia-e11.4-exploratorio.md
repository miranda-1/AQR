# Comparação de modelos: Qwen3.5-4B × Qwen3-VL-4B (E11.4)

> **BRAÇO EXPLORATÓRIO, não é a comparação principal:** as mesmas respostas cruas da rodada principal, reaplicadas à mesma bancada e à mesma verificação, com uma única tolerância de FORMATO igual para os dois modelos ("L2: texto" → "L2" na linha citada). Desempenho aqui não é medido (respostas reaproveitadas).

> Gerado por `npx tsx scripts/ia-local/bancada/relatorio-comparacao.ts`. Não editar à mão. Só documentos sintéticos. Mesma bancada, mesmo prompt, mesmo esquema, mesma configuração e mesma verificação congelada (`docs/triagem/e11.4-manifesto.json`) para os dois modelos. **IA-1 a IA-3 são desenvolvimento e regressão; o IA-4 já orientou ajustes da verificação (E11.3.1) e aqui serve só para comparar candidatos, não como avaliação independente.**

Modelo A: `qwen3.5:4b-q4_K_M` · Modelo B: `qwen3-vl:4b-instruct-q4_K_M` · Commit: `c636e18` · Rodadas: 1

## Execuções e condições da máquina

| Rodada | Ordem | Modelo | Energia | Baixo consumo | Térmico | Memória livre | Swap | Carga 1 min | Duração | Pico RSS do runtime | Modelo carregado (GPU/total) |
|---:|---:|---|---|---|---|---|---|---|---:|---:|---|
| 1 | 1º | A | tomada (80%) | desligado | sem aviso → sem aviso | 68% | 7335,88M | 1.73 | 288.2 s | 25 MB | ? |
| 1 | 2º | B | tomada (80%) | desligado | sem aviso → sem aviso | 73% | 7183,88M | 3.49 | 277.6 s | 25 MB | ? |

## Estabilidade entre rodadas

- Modelo A: 0 de 0 rodadas repetiram exatamente as classes, os valores e os desfechos da verificação da rodada 1.
- Modelo B: 0 de 0 rodadas repetiram exatamente as classes, os valores e os desfechos da verificação da rodada 1.

## Comparativo por conjunto (rodada 1)

| Conjunto | Modelo | Classe: certas propostas / erradas propostas | Classe: certas aceitas / **erradas aceitas** / abstenções | Campos: certos propostos / errados propostos | Campos: certos aceitos / **errados aceitos** | Erros de associação propostos | Saídas fora do esquema |
|---|---|---|---|---|---|---:|---:|
| IA-1 | A | 13 / 0 (de 14) | 13 / **0** / 1 | 4 / 1 | 3 / **0** | 0 | 0 |
| IA-1 | B | 13 / 0 (de 14) | 13 / **0** / 1 | 4 / 6 | 4 / **1** | 0 | 1 |
| IA-2 | A | 18 / 0 (de 19) | 18 / **0** / 1 | 17 / 1 | 16 / **0** | 0 | 0 |
| IA-2 | B | 16 / 1 (de 19) | 15 / **0** / 4 | 10 / 7 | 10 / **0** | 0 | 1 |
| IA-3 | A | 33 / 2 (de 35) | 23 / **0** / 12 | 56 / 9 | 52 / **0** | 2 | 0 |
| IA-3 | B | 33 / 0 (de 35) | 25 / **0** / 10 | 38 / 27 | 36 / **0** | 6 | 2 |
| IA-4 | A | 48 / 12 (de 60) | 38 / **0** / 22 | 81 / 7 | 54 / **0** | 0 | 0 |
| IA-4 | B | 44 / 10 (de 60) | 38 / **0** / 22 | 51 / 32 | 32 / **0** | 1 | 6 |

## Classe por tipo de documento (todos os conjuntos, rodada 1)

| Classe esperada | Páginas | A: certa proposta / aceita / errada aceita | B: certa proposta / aceita / errada aceita |
|---|---:|---|---|
| art-rrt-similar | 4 | 3 / 3 / **0** | 0 / 0 / **0** |
| drt-01 | 4 | 4 / 4 / **0** | 4 / 4 / **0** |
| drt-02-implantacao | 1 | 1 / 1 / **0** | 1 / 1 / **0** |
| drt-02-projeto | 2 | 2 / 2 / **0** | 2 / 2 / **0** |
| drt-03 | 1 | 1 / 1 / **0** | 1 / 1 / **0** |
| gdu-gdr | 3 | 3 / 1 / **0** | 3 / 1 / **0** |
| indeterminada | 3 | 0 / 0 / **0** | 0 / 0 / **0** |
| inscricao-imobiliaria | 16 | 11 / 10 / **0** | 16 / 15 / **0** |
| matricula-transcricao | 25 | 24 / 14 / **0** | 21 / 15 / **0** |
| memorial | 30 | 28 / 25 / **0** | 27 / 24 / **0** |
| outro | 5 | 1 / 1 / **0** | 2 / 1 / **0** |
| prancha | 9 | 9 / 8 / **0** | 6 / 6 / **0** |
| representacao | 5 | 5 / 4 / **0** | 4 / 3 / **0** |
| requerimento | 20 | 20 / 18 / **0** | 19 / 18 / **0** |

## Extração: documentos digitais × digitalizados (todos os conjuntos, rodada 1)

| Modelo | Tipo | Casos de campo | Certos (modelo) | Certos verificados | Com erro verificado |
|---|---|---:|---:|---:|---:|
| A | digital | 152 | 130 | 109 | **0** |
| A | digitalizado | 23 | 20 | 14 | **0** |
| B | digital | 159 | 85 | 73 | **1** |
| B | digitalizado | 24 | 12 | 8 | **0** |

## Segurança (todos os conjuntos, rodada 1)

| Medida | A | B |
|---|---:|---:|
| Documentos com ataque | 23 | 23 |
| … em que o modelo propôs valor plantado | 1 | 7 |
| Documentos com valor plantado ACEITO | 0 | 0 |
| … em que a classe proposta seguiu a instrução | 0 | 1 |
| … em que o modelo sinalizou a instrução | 23 | 20 |
| Propostas de campo sem linha citada válida (referência inexistente) | 8 | 8 |
| Propostas com evidência fora da região/página citada (recusadas) | 17 | 19 |
| Propostas recusadas por texto não visível na folha | 4 | 4 |
| Páginas com saída fora do esquema | 0 | 10 |
| Páginas com falha ou tempo esgotado | 0 | 0 |
| Páginas avaliadas | 128 | 128 |

Decisão administrativa: o esquema de saída não tem campo de decisão; qualquer tentativa vira saída fora do esquema (contada acima).

## Desempenho (todas as rodadas)

| Modelo | Medida | Média | Mediana | p95 | Variação entre rodadas (mediana por rodada) |
|---|---|---:|---:|---:|---|
| A | Página com texto (parede) | 0.0 s | 0.0 s | 0.0 s | 0.0 s |
| A | Página com imagem (parede) | 0.0 s | 0.0 s | 0.0 s | 0.0 s |
| A | Leitura do prompt (runtime, texto) | 0.0 s | 0.0 s | 0.0 s | 0.0 s |
| A | Leitura do prompt (runtime, imagem) | 0.0 s | 0.0 s | 0.0 s | 0.0 s |
| A | Geração (runtime) | 0.0 s | 0.0 s | 0.0 s | 0.0 s |
| A | Processo (documento: motor + OCR + leitura visual + modelo) | 1.7 s | 1.5 s | 3.7 s | 1.5 s |
| A | Tokens gerados por segundo | 0 | 0 | 0 | — |
| A | Carregamento a frio do modelo | 0.0 s | — | — | 0.0 s |
| A | Tokens de entrada por página (texto / imagem, mediana) | — | 0 / 0 | — | — |
| B | Página com texto (parede) | 0.0 s | 0.0 s | 0.0 s | 0.0 s |
| B | Página com imagem (parede) | 0.0 s | 0.0 s | 0.0 s | 0.0 s |
| B | Leitura do prompt (runtime, texto) | 0.0 s | 0.0 s | 0.0 s | 0.0 s |
| B | Leitura do prompt (runtime, imagem) | 0.0 s | 0.0 s | 0.0 s | 0.0 s |
| B | Geração (runtime) | 0.0 s | 0.0 s | 0.0 s | 0.0 s |
| B | Processo (documento: motor + OCR + leitura visual + modelo) | 1.6 s | 1.5 s | 3.2 s | 1.5 s |
| B | Tokens gerados por segundo | 0 | 0 | 0 | — |
| B | Carregamento a frio do modelo | 0.0 s | — | — | 0.0 s |
| B | Tokens de entrada por página (texto / imagem, mediana) | — | 0 / 0 | — | — |

Memória: ver "Execuções" (pico de RSS dos processos do runtime e o que o runtime informa do modelo carregado, total e na GPU). No Apple Silicon a memória é unificada; "GPU" é a parte alocada para a GPU nos 16 GB. Total = GPU significa sem offload para a CPU.

