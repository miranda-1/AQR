# Avaliação da triagem experimental (E4–E6)

> Gerado por `npm run triagem:avaliar`. Não editar à mão. Só documentos fictícios. O catálogo não é homologado pela GCA:
> os resultados medem verificações técnicas experimentais, não conformidade nem decisão administrativa.

- Conjunto de desenvolvimento: 48 pacotes, 372 anexos (DSD-01 a 48, usados durante a implementação).
- Conjunto de validação: 16 pacotes, 128 anexos (VAL-01 a 16, escritos antes da extração e do motor, com outros modelos de texto).
- OCR local: disponível.

## E4: classificação documental

### Conjunto de desenvolvimento (372 anexos)

- Classe igual ao gabarito: **370 de 372** (99,5%).
- Anexos com documento: 364; abstenções (indeterminada): **2** (0,5%); classe errada proposta: **0**.
- Arquivos sem documento legível: 8; classificados como indeterminada: 8.

| Classe | Esperados | Propostos | Acertos | Precisão | Cobertura | Abstenções |
|---|---:|---:|---:|---:|---:|---:|
| art-rrt-similar | 45 | 45 | 45 | 100,0% | 100,0% | 0 |
| cad | 46 | 46 | 46 | 100,0% | 100,0% | 0 |
| drt-01 | 45 | 45 | 45 | 100,0% | 100,0% | 0 |
| drt-03 | 1 | 1 | 1 | 100,0% | 100,0% | 0 |
| gdu-gdr | 1 | 1 | 1 | 100,0% | 100,0% | 0 |
| inscricao-imobiliaria | 45 | 45 | 45 | 100,0% | 100,0% | 0 |
| matricula-transcricao | 45 | 43 | 43 | 100,0% | 95,6% | 2 |
| memorial | 43 | 43 | 43 | 100,0% | 100,0% | 0 |
| prancha | 46 | 46 | 46 | 100,0% | 100,0% | 0 |
| representacao | 1 | 1 | 1 | 100,0% | 100,0% | 0 |
| requerimento | 46 | 46 | 46 | 100,0% | 100,0% | 0 |

<details><summary>Matriz de confusão</summary>

| esperado ↓ / obtido → | art-rrt-similar | cad | drt-01 | drt-03 | gdu-gdr | indeterminada | inscricao-imobiliaria | matricula-transcricao | memorial | prancha | representacao | requerimento |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| art-rrt-similar | **45** | · | · | · | · | · | · | · | · | · | · | · |
| cad | · | **46** | · | · | · | · | · | · | · | · | · | · |
| drt-01 | · | · | **45** | · | · | · | · | · | · | · | · | · |
| drt-03 | · | · | · | **1** | · | · | · | · | · | · | · | · |
| gdu-gdr | · | · | · | · | **1** | · | · | · | · | · | · | · |
| indeterminada | · | · | · | · | · | **8** | · | · | · | · | · | · |
| inscricao-imobiliaria | · | · | · | · | · | · | **45** | · | · | · | · | · |
| matricula-transcricao | · | · | · | · | · | 2 | · | **43** | · | · | · | · |
| memorial | · | · | · | · | · | · | · | · | **43** | · | · | · |
| prancha | · | · | · | · | · | · | · | · | · | **46** | · | · |
| representacao | · | · | · | · | · | · | · | · | · | · | **1** | · |
| requerimento | · | · | · | · | · | · | · | · | · | · | · | **46** |

</details>

Divergências do gabarito:

- DSD-28/matricula.pdf: esperado **matricula-transcricao**, obtido **indeterminada** (origem: leitura-ocr; leitura parcial (OCR 32)). Nenhum título ou campo característico de classe documental foi encontrado no texto lido.
- DSD-29/matricula.pdf: esperado **matricula-transcricao**, obtido **indeterminada** (origem: leitura-ocr; leitura parcial (OCR 17)). Nenhum título ou campo característico de classe documental foi encontrado no texto lido.

### Conjunto de validação (128 anexos)

- Classe igual ao gabarito: **127 de 128** (99,2%).
- Anexos com documento: 128; abstenções (indeterminada): **1** (0,8%); classe errada proposta: **0**.
- Arquivos sem documento legível: 0; classificados como indeterminada: 0.

| Classe | Esperados | Propostos | Acertos | Precisão | Cobertura | Abstenções |
|---|---:|---:|---:|---:|---:|---:|
| art-rrt-similar | 15 | 15 | 15 | 100,0% | 100,0% | 0 |
| cad | 16 | 16 | 16 | 100,0% | 100,0% | 0 |
| drt-01 | 14 | 14 | 14 | 100,0% | 100,0% | 0 |
| drt-02-implantacao | 1 | 1 | 1 | 100,0% | 100,0% | 0 |
| drt-02-projeto | 1 | 1 | 1 | 100,0% | 100,0% | 0 |
| inscricao-imobiliaria | 16 | 16 | 16 | 100,0% | 100,0% | 0 |
| matricula-transcricao | 15 | 15 | 15 | 100,0% | 100,0% | 0 |
| memorial | 16 | 16 | 16 | 100,0% | 100,0% | 0 |
| outro | 1 | 0 | 0 | — | 0,0% | 1 |
| prancha | 16 | 16 | 16 | 100,0% | 100,0% | 0 |
| representacao | 1 | 1 | 1 | 100,0% | 100,0% | 0 |
| requerimento | 16 | 16 | 16 | 100,0% | 100,0% | 0 |

<details><summary>Matriz de confusão</summary>

| esperado ↓ / obtido → | art-rrt-similar | cad | drt-01 | drt-02-implantacao | drt-02-projeto | indeterminada | inscricao-imobiliaria | matricula-transcricao | memorial | prancha | representacao | requerimento |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| art-rrt-similar | **15** | · | · | · | · | · | · | · | · | · | · | · |
| cad | · | **16** | · | · | · | · | · | · | · | · | · | · |
| drt-01 | · | · | **14** | · | · | · | · | · | · | · | · | · |
| drt-02-implantacao | · | · | · | **1** | · | · | · | · | · | · | · | · |
| drt-02-projeto | · | · | · | · | **1** | · | · | · | · | · | · | · |
| inscricao-imobiliaria | · | · | · | · | · | · | **16** | · | · | · | · | · |
| matricula-transcricao | · | · | · | · | · | · | · | **15** | · | · | · | · |
| memorial | · | · | · | · | · | · | · | · | **16** | · | · | · |
| outro | · | · | · | · | · | 1 | · | · | · | · | · | · |
| prancha | · | · | · | · | · | · | · | · | · | **16** | · | · |
| representacao | · | · | · | · | · | · | · | · | · | · | **1** | · |
| requerimento | · | · | · | · | · | · | · | · | · | · | · | **16** |

</details>

Documentos compostos (mais de um documento no mesmo arquivo):

- VAL-02/documentos.pdf: esperado requerimento + drt-01; notado (requerimento, drt-01).

Divergências do gabarito:

- VAL-05/rrt.pdf: esperado **outro**, obtido **indeterminada** (origem: classificacao; leitura legivel). Nenhum título ou campo característico de classe documental foi encontrado no texto lido.
