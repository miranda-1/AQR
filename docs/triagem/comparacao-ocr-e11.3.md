# Comparação de OCR para a segunda leitura (E11.3)

> Gerado por `npx tsx scripts/ia-local/ocr/comparar.ts`. Páginas digitalizadas sintéticas próprias desta comparação (3 imóveis × 4 peças × 3 qualidades = 36 páginas), fora dos conjuntos IA. Tudo local; PaddleOCR e Vision rodam no sandbox sem rede.

"Valor lido": os dígitos do valor (matrícula, área, inscrição) aparecem na ordem certa numa mesma linha. O tempo do motor inclui a leitura do PDF inteiro; o dos outros, só o OCR da imagem já desenhada (1700 px de largura) e a partida do processo.

| Mecanismo | Qualidade | Páginas | Valores lidos | Rótulos lidos | Palavras com caixa | Tempo mediano | Falhas |
|---|---|---:|---:|---:|---:|---:|---:|
| tesseract (motor) | boa | 12 | 18/18 (100%) | 18/18 (100%) | 493/493 (100%) | 540 ms | 0 |
| tesseract (motor) | ruido | 12 | 2/18 (11%) | 8/18 (44%) | 173/173 (100%) | 870 ms | 0 |
| tesseract (motor) | muito-degradada | 12 | 0/18 (0%) | 0/18 (0%) | 2363/2363 (100%) | 39029 ms | 0 |
| paddle | boa | 12 | 18/18 (100%) | 18/18 (100%) | 498/498 (100%) | 1044 ms | 0 |
| paddle | ruido | 12 | 18/18 (100%) | 18/18 (100%) | 499/499 (100%) | 960 ms | 0 |
| paddle | muito-degradada | 12 | 0/18 (0%) | 0/18 (0%) | — | 761 ms | 0 |
| vision | boa | 12 | 18/18 (100%) | 18/18 (100%) | 498/498 (100%) | 193 ms | 0 |
| vision | ruido | 12 | 18/18 (100%) | 18/18 (100%) | 496/496 (100%) | 191 ms | 0 |
| vision | muito-degradada | 12 | 0/18 (0%) | 0/18 (0%) | — | 188 ms | 0 |

