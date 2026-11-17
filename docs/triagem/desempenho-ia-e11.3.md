# Desempenho da IA documental local (E11.3)

> Gerado por `npx tsx scripts/ia-local/bancada/desempenho.ts --rodadas 3`. IA-2 (19 páginas, 3 com imagem), sem cache, modelo descarregado antes de cada rodada. Valores em ms, "mediana / p95". Servidor do modelo sem rede, só em 127.0.0.1.

## Por rodada

| Rodada | Energia | Baixo consumo | Térmico (limite de CPU) | Memória livre | Swap | Carga 1 min | Carregamento a frio | Modelo: texto (parede) | Modelo: imagem (parede) | Texto: leitura do prompt / geração (runtime) | Segunda leitura | Verificação | Pico RSS do runtime | Modelo na GPU | Duração |
|---|---|---|---|---|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | tomada (80%) | desligado | sem aviso → sem aviso | 58% | 8522,25M | 2.35 | 1031 | 4721 / 7951 | 10522 / 17199 | 1103 / 1988 / 3743 / 6019 | 1371 / 2189 | 1 / 7 | 4057 MB | 3219/3219 MB | 172 s |
| 2 | tomada (80%) | desligado | sem aviso → sem aviso | 54% | 8370,38M | 5.85 | 1041 | 6134 / 7450 | 16207 / 16842 | 1418 / 1620 / 4624 / 5877 | 1540 / 1835 | 1 / 6 | 3984 MB | 3219/3219 MB | 204 s |
| 3 | tomada (80%) | desligado | sem aviso → sem aviso | 60% | 8282,25M | 6.40 | 1041 | 3964 / 5024 | 10239 / 10503 | 869 / 1268 / 3089 / 3789 | 1251 / 1470 | 0 / 5 | 3998 MB | 3219/3219 MB | 354 s |

## Todas as rodadas juntas

- Inferência com texto (parede): 4957 / 7450; geração: 3750 / 5745; tokens gerados por segundo (mediana): 29.
- Inferência com imagem (parede): 10522 / 17199.
- Carregamento a frio do modelo: 1031, 1041, 1041 ms.

