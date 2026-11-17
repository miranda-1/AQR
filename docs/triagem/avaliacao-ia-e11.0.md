# Benchmark técnico da IA documental (E11.0)

> Gerado por `npm run triagem:ia-benchmark`. Não editar à mão. Só documentos sintéticos, sem OCR.
>
> **O provedor avaliado aqui é SIMULADO, não é um modelo de IA.** Ele existe para validar a arquitetura (contratos, verificação, isolamento, registro). Os números de sugestões medem o comportamento da VERIFICAÇÃO diante de propostas certas, erradas e maliciosas, **não** o desempenho de um modelo real. O perfil "adversário" obedece de propósito a instruções embutidas nos documentos.
>
> As sugestões não têm efeito nesta etapa. "Reduziria", "desfaria" e "prejudicaria" são contrafactuais: o que aconteceria se a sugestão verificada fosse aplicada.

## Histórico das execuções

- A primeira execução (gabarito IA-1 já congelado e comitado) está preservada sem alteração em `avaliacao-ia-e11.0-primeira-execucao.md`. Ela achou 1 valor incorreto verificado no IA-1 (caso IA1-07: duas áreas no memorial; o valor estava impresso na região, mas era ambíguo).
- Depois dela, a verificação passou a recusar valor ambíguo no documento (`valor-ambiguo-no-documento`). O gabarito não mudou. Por ter orientado essa correção, o IA-1 deixou de ser medida independente para a verificação; continua sendo o primeiro registro e um teste de regressão.
- Também a partir dela, a extração do motor ignora linhas com cara de instrução ao sistema (caso IA1-10: matrícula plantada numa instrução era lida como campo). Na linha de base do IA-1, o valor errado caiu de 1 para 0; VAL, IND e NOV não mudaram.

## Braços comparados

| Braço | Situação |
|---|---|
| Motor determinístico (linha de base) | Executado |
| Motor + sugestões do provedor simulado (cooperativo e adversário) | Executado |
| Motor + sugestões de modelo real | **Não executado nesta etapa** (nenhum modelo foi baixado nem executado) |

## Linha de base: motor determinístico

| Conjunto | Documentos | Classe certa | Classe: abstenção | Classe errada | Campos esperados | Certos | Abstenção | Valor errado | Conflitos respeitados | Conflitos escolhidos | Latência média por documento |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| IA-1 (novo, congelado na E11.0) | 12 | 8 | 4 | 0 | 28 | 13 | 15 | 0 | 2 | 0 | 27 ms |
| validação (VAL) | 128 | 125 | 3 | 0 | 725 | 684 | 41 | 0 | 15 | 0 | 9 ms |
| independente (IND) | 126 | 123 | 3 | 0 | 748 | 649 | 99 | 0 | 1 | 0 | 10 ms |
| segundo independente (NOV) | 130 | 128 | 2 | 0 | 740 | 717 | 23 | 0 | 9 | 0 | 8 ms |

## Sugestões do provedor simulado

| Conjunto | Perfil | Execuções (não concluídas) | Propostas | Fora do esquema | Verificadas (A) | Hipóteses visuais (B) | Recusadas | Valores incorretos propostos | **Incorretos verificados** | Plantados propostos | **Plantados verificados** | Evidências corretas |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| IA-1 (novo, congelado na E11.0) | cooperativo | 12 (0) | 10 | 0 | 9 | 0 | 1 | 1 | **0** | 0 | **0** | 8 |
| IA-1 (novo, congelado na E11.0) | adversario | 12 (0) | 55 | 24 | 9 | 0 | 22 | 10 | **0** | 2 | **0** | 8 |
| validação (VAL) | cooperativo | 16 (0) | 15 | 0 | 15 | 0 | 0 | 0 | **0** | 0 | **0** | 15 |
| validação (VAL) | adversario | 16 (0) | 98 | 38 | 15 | 0 | 45 | 15 | **0** | 0 | **0** | 15 |
| independente (IND) | cooperativo | 16 (0) | 60 | 0 | 60 | 0 | 0 | 0 | **0** | 0 | **0** | 60 |
| independente (IND) | adversario | 16 (0) | 293 | 98 | 60 | 0 | 135 | 45 | **0** | 0 | **0** | 60 |
| segundo independente (NOV) | cooperativo | 16 (0) | 0 | 0 | 0 | 0 | 0 | 0 | **0** | 0 | **0** | 0 |
| segundo independente (NOV) | adversario | 16 (0) | 68 | 68 | 0 | 0 | 0 | 0 | **0** | 0 | **0** | 0 |

### Efeito contrafactual (se as sugestões verificadas fossem aplicadas)

| Conjunto | Perfil | Abstenções que reduziria | Abstenções corretas que desfaria | Resultados corretos que prejudicaria | Classes recuperadas | Classes erradas verificadas | Hipóteses B com valor certo / errado |
|---|---|---:|---:|---:|---:|---:|---|
| IA-1 (novo, congelado na E11.0) | cooperativo | 8 | 0 | 0 | 0 | 0 | 0 / 0 |
| IA-1 (novo, congelado na E11.0) | adversario | 8 | 0 | 0 | 0 | 0 | 0 / 0 |
| validação (VAL) | cooperativo | 15 | 0 | 0 | 0 | 0 | 0 / 0 |
| validação (VAL) | adversario | 15 | 0 | 0 | 0 | 0 | 0 / 0 |
| independente (IND) | cooperativo | 60 | 0 | 0 | 0 | 0 | 0 / 0 |
| independente (IND) | adversario | 60 | 0 | 0 | 0 | 0 | 0 / 0 |
| segundo independente (NOV) | cooperativo | 0 | 0 | 0 | 0 | 0 | 0 / 0 |
| segundo independente (NOV) | adversario | 0 | 0 | 0 | 0 | 0 | 0 / 0 |

Efeito real nesta etapa: **nenhum** em todos os conjuntos (as sugestões não alimentam classe, campo, regra nem decisão; o banco recusa outro efeito).

### Recusas por motivo

| Conjunto | Perfil | Motivos |
|---|---|---|
| IA-1 (novo, congelado na E11.0) | cooperativo | valor-ambiguo-no-documento 1 |
| IA-1 (novo, congelado na E11.0) | adversario | valor-ausente-da-regiao 6; valor-em-outra-regiao 6; pagina-inexistente 6; regiao-com-instrucao 3; valor-ambiguo-no-documento 1 |
| validação (VAL) | cooperativo | — |
| validação (VAL) | adversario | valor-ausente-da-regiao 15; valor-em-outra-regiao 15; pagina-inexistente 15 |
| independente (IND) | cooperativo | — |
| independente (IND) | adversario | valor-ausente-da-regiao 45; valor-em-outra-regiao 45; pagina-inexistente 45 |
| segundo independente (NOV) | cooperativo | — |
| segundo independente (NOV) | adversario | — |

## Latência e recursos (provedor simulado, thread isolada)

| Conjunto | Perfil | Latência média por processo | Máxima | Memória máxima da thread |
|---|---|---:|---:|---:|
| IA-1 (novo, congelado na E11.0) | cooperativo | 46 ms | 48 ms | 9 MB |
| IA-1 (novo, congelado na E11.0) | adversario | 46 ms | 50 ms | 9 MB |
| validação (VAL) | cooperativo | 45 ms | 47 ms | 8 MB |
| validação (VAL) | adversario | 46 ms | 48 ms | 9 MB |
| independente (IND) | cooperativo | 46 ms | 49 ms | 9 MB |
| independente (IND) | adversario | 47 ms | 52 ms | 9 MB |
| segundo independente (NOV) | cooperativo | 45 ms | 47 ms | 8 MB |
| segundo independente (NOV) | adversario | 46 ms | 49 ms | 9 MB |

A latência e a memória medem o custo da INFRAESTRUTURA (criar a thread, montar o pedido, validar e verificar), não de um modelo. Um modelo real acrescenta o tempo de inferência estimado no plano da E11 (seção 9).

Duração total: 10 s.
