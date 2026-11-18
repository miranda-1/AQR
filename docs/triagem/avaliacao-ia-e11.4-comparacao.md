# Comparação de modelos: Qwen3.5-4B × Qwen3-VL-4B (E11.4)

> Gerado por `npx tsx scripts/ia-local/bancada/relatorio-comparacao.ts`. Não editar à mão. Só documentos sintéticos. Mesma bancada, mesmo prompt, mesmo esquema, mesma configuração e mesma verificação congelada (`docs/triagem/e11.4-manifesto.json`) para os dois modelos. **IA-1 a IA-3 são desenvolvimento e regressão; o IA-4 já orientou ajustes da verificação (E11.3.1) e aqui serve só para comparar candidatos, não como avaliação independente.**

Modelo A: `qwen3.5:4b-q4_K_M` · Modelo B: `qwen3-vl:4b-instruct-q4_K_M` · Commit: `c636e18` · Rodadas: 3

## Execuções e condições da máquina

| Rodada | Ordem | Modelo | Energia | Baixo consumo | Térmico | Memória livre | Swap | Carga 1 min | Duração | Pico RSS do runtime | Modelo carregado (GPU/total) |
|---:|---:|---|---|---|---|---|---|---|---:|---:|---|
| 1 | 1º | A | bateria (53%) | desligado | sem aviso → sem aviso | 66% | 7695,44M | 2.55 | 1092.9 s | 4096 MB | 3219/3219 MB |
| 1 | 2º | B | bateria (42%) | desligado | sem aviso → sem aviso | 64% | 8383,00M | 1.88 | 835.1 s | 5546 MB | 4259/4259 MB |
| 2 | 1º | B | bateria (34%) | desligado | sem aviso → sem aviso | 67% | 11510,00M | 1.99 | 821.5 s | 5657 MB | 4259/4259 MB |
| 2 | 2º | A | bateria (26%) | desligado | sem aviso → sem aviso | 67% | 8767,50M | 2.57 | 1326.3 s | 4643 MB | 3219/3219 MB |
| 3 | 1º | A | tomada (37%) | desligado | sem aviso → sem aviso | 61% | 8684,00M | 2.80 | 1836.8 s | 4129 MB | 3219/3219 MB |
| 3 | 2º | B | tomada (75%) | desligado | sem aviso → sem aviso | 60% | 6768,06M | 1.83 | 1307.3 s | 5371 MB | 4259/4259 MB |

## Estabilidade entre rodadas

- Modelo A: 2 de 2 rodadas repetiram exatamente as classes, os valores e os desfechos da verificação da rodada 1.
- Modelo B: 2 de 2 rodadas repetiram exatamente as classes, os valores e os desfechos da verificação da rodada 1.

## Comparativo por conjunto (rodada 1)

| Conjunto | Modelo | Classe: certas propostas / erradas propostas | Classe: certas aceitas / **erradas aceitas** / abstenções | Campos: certos propostos / errados propostos | Campos: certos aceitos / **errados aceitos** | Erros de associação propostos | Saídas fora do esquema |
|---|---|---|---|---|---|---:|---:|
| IA-1 | A | 13 / 0 (de 14) | 13 / **0** / 1 | 4 / 1 | 3 / **0** | 0 | 0 |
| IA-1 | B | 2 / 0 (de 14) | 2 / **0** / 12 | 1 / 0 | 1 / **0** | 0 | 12 |
| IA-2 | A | 18 / 0 (de 19) | 18 / **0** / 1 | 17 / 1 | 16 / **0** | 0 | 0 |
| IA-2 | B | 2 / 0 (de 19) | 2 / **0** / 17 | 1 / 0 | 1 / **0** | 0 | 16 |
| IA-3 | A | 33 / 2 (de 35) | 23 / **0** / 12 | 56 / 9 | 52 / **0** | 2 | 0 |
| IA-3 | B | 1 / 0 (de 35) | 1 / **0** / 34 | 0 / 2 | 0 / **0** | 0 | 34 |
| IA-4 | A | 48 / 12 (de 60) | 38 / **0** / 22 | 81 / 7 | 54 / **0** | 0 | 0 |
| IA-4 | B | 3 / 3 (de 60) | 3 / **0** / 57 | 5 / 2 | 4 / **0** | 0 | 54 |

## Classe por tipo de documento (todos os conjuntos, rodada 1)

| Classe esperada | Páginas | A: certa proposta / aceita / errada aceita | B: certa proposta / aceita / errada aceita |
|---|---:|---|---|
| art-rrt-similar | 4 | 3 / 3 / **0** | 0 / 0 / **0** |
| drt-01 | 4 | 4 / 4 / **0** | 2 / 2 / **0** |
| drt-02-implantacao | 1 | 1 / 1 / **0** | 1 / 1 / **0** |
| drt-02-projeto | 2 | 2 / 2 / **0** | 0 / 0 / **0** |
| drt-03 | 1 | 1 / 1 / **0** | 0 / 0 / **0** |
| gdu-gdr | 3 | 3 / 1 / **0** | 0 / 0 / **0** |
| indeterminada | 3 | 0 / 0 / **0** | 0 / 0 / **0** |
| inscricao-imobiliaria | 16 | 11 / 10 / **0** | 0 / 0 / **0** |
| matricula-transcricao | 25 | 24 / 14 / **0** | 1 / 1 / **0** |
| memorial | 30 | 28 / 25 / **0** | 1 / 1 / **0** |
| outro | 5 | 1 / 1 / **0** | 0 / 0 / **0** |
| prancha | 9 | 9 / 8 / **0** | 0 / 0 / **0** |
| representacao | 5 | 5 / 4 / **0** | 1 / 1 / **0** |
| requerimento | 20 | 20 / 18 / **0** | 2 / 2 / **0** |

## Extração: documentos digitais × digitalizados (todos os conjuntos, rodada 1)

| Modelo | Tipo | Casos de campo | Certos (modelo) | Certos verificados | Com erro verificado |
|---|---|---:|---:|---:|---:|
| A | digital | 152 | 130 | 109 | **0** |
| A | digitalizado | 23 | 20 | 14 | **0** |
| B | digital | 150 | 5 | 4 | **0** |
| B | digitalizado | 24 | 2 | 2 | **0** |

## Segurança (todos os conjuntos, rodada 1)

| Medida | A | B |
|---|---:|---:|
| Documentos com ataque | 23 | 23 |
| … em que o modelo propôs valor plantado | 1 | 1 |
| Documentos com valor plantado ACEITO | 0 | 0 |
| … em que a classe proposta seguiu a instrução | 0 | 0 |
| … em que o modelo sinalizou a instrução | 23 | 2 |
| Propostas de campo sem linha citada válida (referência inexistente) | 8 | 0 |
| Propostas com evidência fora da região/página citada (recusadas) | 17 | 2 |
| Propostas recusadas por texto não visível na folha | 4 | 0 |
| Páginas com saída fora do esquema | 0 | 116 |
| Páginas com falha ou tempo esgotado | 0 | 0 |
| Páginas avaliadas | 128 | 128 |

Decisão administrativa: o esquema de saída não tem campo de decisão; qualquer tentativa vira saída fora do esquema (contada acima).

## Desempenho (todas as rodadas)

| Modelo | Medida | Média | Mediana | p95 | Variação entre rodadas (mediana por rodada) |
|---|---|---:|---:|---:|---|
| A | Página com texto (parede) | 7.4 s | 6.6 s | 13.5 s | 5.7 s · 6.8 s · 9.2 s |
| A | Página com imagem (parede) | 17.6 s | 15.0 s | 24.9 s | 12.9 s · 15.1 s · 22.1 s |
| A | Leitura do prompt (runtime, texto) | 1.6 s | 1.4 s | 3.1 s | 1.2 s · 1.4 s · 2.0 s |
| A | Leitura do prompt (runtime, imagem) | 10.7 s | 9.2 s | 15.0 s | 8.4 s · 9.3 s · 13.5 s |
| A | Geração (runtime) | 5.9 s | 5.2 s | 10.3 s | 4.4 s · 5.3 s · 7.3 s |
| A | Processo (documento: motor + OCR + leitura visual + modelo) | 11.9 s | 9.5 s | 26.3 s | 7.4 s · 9.0 s · 12.7 s |
| A | Tokens gerados por segundo | 23 | 25 | 31 | — |
| A | Carregamento a frio do modelo | 1.2 s | — | — | 1.3 s · 1.3 s · 1.0 s |
| A | Tokens de entrada por página (texto / imagem, mediana) | — | 690 / 2290 | — | — |
| B | Página com texto (parede) | 4.3 s | 4.0 s | 6.5 s | 3.2 s · 3.6 s · 6.0 s |
| B | Página com imagem (parede) | 14.5 s | 13.2 s | 20.9 s | 10.8 s · 13.0 s · 18.4 s |
| B | Leitura do prompt (runtime, texto) | 0.3 s | 0.3 s | 0.6 s | 0.3 s · 0.3 s · 0.4 s |
| B | Leitura do prompt (runtime, imagem) | 10.0 s | 8.9 s | 15.6 s | 8.0 s · 8.8 s · 12.4 s |
| B | Geração (runtime) | 4.0 s | 3.8 s | 6.3 s | 3.0 s · 3.3 s · 5.5 s |
| B | Processo (documento: motor + OCR + leitura visual + modelo) | 7.9 s | 6.1 s | 19.3 s | 5.1 s · 5.0 s · 7.9 s |
| B | Tokens gerados por segundo | 28 | 28 | 44 | — |
| B | Carregamento a frio do modelo | 1.3 s | — | — | 1.3 s · 1.0 s · 1.5 s |
| B | Tokens de entrada por página (texto / imagem, mediana) | — | 752 / 2495 | — | — |

Memória: ver "Execuções" (pico de RSS dos processos do runtime e o que o runtime informa do modelo carregado, total e na GPU). No Apple Silicon a memória é unificada; "GPU" é a parte alocada para a GPU nos 16 GB. Total = GPU significa sem offload para a CPU.

