# Desempenho da comparação

Medido por `npm run medir:desempenho` em 2026-10-15, num só processo (sem a thread do servidor), com os limites padrão (orçamento de 90 s). Memória: aumento do RSS do processo no pico (inclui o pdf.js e o canvas nativo).

| Páginas | Cenário | Total | exame | ocr | correspondencia | texto | visual | organizacao | Pico de memória | Situação | Diferenças | Ressalvas |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 10 | idênticos | 0.6 s | 0.5 s | 0.0 s | 0.0 s | 0.0 s | 0.0 s | 0.0 s | +190 MB | complete | 0 | — |
| 10 | edições | 0.8 s | 0.2 s | 0.0 s | 0.0 s | 0.0 s | 0.6 s | 0.0 s | +98 MB | complete | 4 | — |
| 10 | diagramação | 1.6 s | 0.3 s | 0.0 s | 0.0 s | 0.0 s | 1.3 s | 0.0 s | +135 MB | complete | 11 | — |
| 50 | idênticos | 1.2 s | 1.2 s | 0.0 s | 0.0 s | 0.0 s | 0.0 s | 0.0 s | +0 MB | complete | 0 | — |
| 50 | edições | 1.5 s | 1.1 s | 0.0 s | 0.0 s | 0.0 s | 0.4 s | 0.0 s | +165 MB | complete | 4 | — |
| 50 | diagramação | 7.0 s | 1.0 s | 0.0 s | 0.0 s | 0.0 s | 5.9 s | 0.0 s | +137 MB | complete | 55 | — |
| 100 | idênticos | 2.2 s | 2.1 s | 0.0 s | 0.0 s | 0.0 s | 0.0 s | 0.0 s | +5 MB | complete | 0 | — |
| 100 | edições | 2.6 s | 2.1 s | 0.0 s | 0.0 s | 0.0 s | 0.4 s | 0.0 s | +154 MB | complete | 4 | — |
| 100 | diagramação | 14.1 s | 2.1 s | 0.0 s | 0.0 s | 0.0 s | 11.9 s | 0.0 s | +122 MB | complete | 110 | — |
| 500 | idênticos | 10.4 s | 9.9 s | 0.0 s | 0.2 s | 0.2 s | 0.0 s | 0.0 s | +80 MB | complete | 0 | — |
| 500 | edições | 11.1 s | 10.1 s | 0.0 s | 0.2 s | 0.2 s | 0.5 s | 0.0 s | +65 MB | complete | 4 | — |
| 500 | diagramação | 80.3 s | 10.1 s | 0.0 s | 0.2 s | 0.1 s | 69.8 s | 0.0 s | +85 MB | complete | 550 | — |
| 1000 | idênticos | 20.7 s | 19.9 s | 0.0 s | 0.4 s | 0.3 s | 0.0 s | 0.0 s | +147 MB | complete | 0 | — |
| 1000 | edições | 20.9 s | 19.6 s | 0.0 s | 0.4 s | 0.3 s | 0.5 s | 0.0 s | +53 MB | complete | 4 | — |
| 1000 | diagramação | 90.2 s | 19.9 s | 0.0 s | 0.4 s | 0.3 s | 69.5 s | 0.1 s | +65 MB | partial | 472 | VISUAL_LIMIT_REACHED |
