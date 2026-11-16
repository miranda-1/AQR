# Reprocessamento incremental × execução integral

> Gerado por `npm run triagem:incremental`. Não editar à mão. Só pacotes sintéticos (DSD, VAL, IND, NOV), sem OCR.

Para cada pacote, o processo é criado e analisado; depois, em sequência, a completude é confirmada, a condição da regra 028 é confirmada nos dois sentidos e, para cada nome de campo extraído, um valor é corrigido para outro (diverge) e de volta ao valor mais frequente (harmoniza). Cada passo é um reprocessamento.

O serviço sempre roda as 19 regras (execução integral) e grava esse resultado. A coluna "incremental puro erraria" conta os reprocessamentos em que alguma regra **fora** do mapa `DEPENDENCIAS` mudou de resultado: a estratégia que só recalcula as regras do mapa teria gravado essa regra desatualizada.

- Reprocessamentos medidos: 3462 (em 96 pacotes sintéticos).
- Gravado diferente da execução integral do zero: **0**.
- Reprocessamentos em que o incremental puro teria deixado regra desatualizada: **0** (0 regras distintas).

| Perturbação | Reprocessamentos | Com resultado alterado | Incremental puro erraria |
|---|---:|---:|---:|
| completude | 96 | 44 | 0 |
| área acima de 2 ha | 192 | 192 | 0 |
| correção divergente | 1587 | 1143 | 0 |
| correção que harmoniza | 1587 | 1143 | 0 |
