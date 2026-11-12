# Avaliação da triagem experimental (E4–E6)

> Gerado por `npm run triagem:avaliar`. Não editar à mão. Só documentos fictícios. O catálogo não é homologado pela GCA:
> os resultados medem verificações técnicas experimentais, não conformidade nem decisão administrativa.

- Conjunto de desenvolvimento: 48 pacotes, 372 anexos (DSD-01 a 48, usados durante a implementação).
- Conjunto de validação: 16 pacotes, 128 anexos (VAL-01 a 16, escritos antes da extração e do motor, mas **usados para corrigir defeitos**: não são mais medida independente).
- Conjunto independente: 16 pacotes, 126 anexos (IND-01 a 16, gabarito congelado em `docs/triagem/casos/independente-gabarito.json` antes da primeira execução; **é a medida de generalização**).
- OCR local: disponível.

## Resumo por conjunto

| Conjunto | Anexos | Classe igual ao gabarito | Classe errada proposta | Abstenções de classe | Campos impressos | Campos certos | Valor errado aceito | Normalização errada |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| desenvolvimento (DSD, usado na implementação) | 372 | 370 | 0 | 2 | 2583 | 2565 | 0 | 0 |
| validação usada nos ajustes (VAL) | 128 | 127 | 0 | 1 | 740 | 705 | 0 | 0 |
| independente congelado (IND) | 126 | 124 | 0 | 2 | 749 | 634 | 0 | 0 |

Regras:

| Conjunto | Expectativas | Aceitas | Falsos alertas | Achados não detectados | Abstenções indevidas | Tipo de achado diferente | Outro resultado | Não avaliáveis (total) | Abstenções aceitas | Condição pendente |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| desenvolvimento (DSD, usado na implementação) | 821 | 821 | 0 | 0 | 0 | 0 | 0 | 22 | 22 | 44 |
| validação usada nos ajustes (VAL) | 144 | 143 | 1 | 0 | 0 | 0 | 0 | 3 | 3 | 15 |
| independente congelado (IND) | 288 | 270 | 0 | 1 | 17 | 0 | 0 | 24 | 6 | 15 |

## E4: classificação documental

### Conjunto de desenvolvimento (DSD, usado na implementação) (372 anexos)

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

### Conjunto de validação usada nos ajustes (VAL) (128 anexos)

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

### Conjunto de independente congelado (IND) (126 anexos)

- Classe igual ao gabarito: **124 de 126** (98,4%).
- Anexos com documento: 126; abstenções (indeterminada): **2** (1,6%); classe errada proposta: **0**.
- Arquivos sem documento legível: 0; classificados como indeterminada: 0.

| Classe | Esperados | Propostos | Acertos | Precisão | Cobertura | Abstenções |
|---|---:|---:|---:|---:|---:|---:|
| art-rrt-similar | 15 | 15 | 15 | 100,0% | 100,0% | 0 |
| cad | 16 | 16 | 16 | 100,0% | 100,0% | 0 |
| drt-01 | 14 | 14 | 14 | 100,0% | 100,0% | 0 |
| drt-03 | 1 | 1 | 1 | 100,0% | 100,0% | 0 |
| gdu-gdr | 1 | 1 | 1 | 100,0% | 100,0% | 0 |
| inscricao-imobiliaria | 15 | 15 | 15 | 100,0% | 100,0% | 0 |
| matricula-transcricao | 16 | 16 | 16 | 100,0% | 100,0% | 0 |
| memorial | 15 | 14 | 14 | 100,0% | 93,3% | 1 |
| prancha | 16 | 15 | 15 | 100,0% | 93,8% | 1 |
| representacao | 1 | 1 | 1 | 100,0% | 100,0% | 0 |
| requerimento | 16 | 16 | 16 | 100,0% | 100,0% | 0 |

<details><summary>Matriz de confusão</summary>

| esperado ↓ / obtido → | art-rrt-similar | cad | drt-01 | drt-03 | gdu-gdr | indeterminada | inscricao-imobiliaria | matricula-transcricao | memorial | prancha | representacao | requerimento |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| art-rrt-similar | **15** | · | · | · | · | · | · | · | · | · | · | · |
| cad | · | **16** | · | · | · | · | · | · | · | · | · | · |
| drt-01 | · | · | **14** | · | · | · | · | · | · | · | · | · |
| drt-03 | · | · | · | **1** | · | · | · | · | · | · | · | · |
| gdu-gdr | · | · | · | · | **1** | · | · | · | · | · | · | · |
| inscricao-imobiliaria | · | · | · | · | · | · | **15** | · | · | · | · | · |
| matricula-transcricao | · | · | · | · | · | · | · | **16** | · | · | · | · |
| memorial | · | · | · | · | · | 1 | · | · | **14** | · | · | · |
| prancha | · | · | · | · | · | 1 | · | · | · | **15** | · | · |
| representacao | · | · | · | · | · | · | · | · | · | · | **1** | · |
| requerimento | · | · | · | · | · | · | · | · | · | · | · | **16** |

</details>

Documentos compostos (mais de um documento no mesmo arquivo):

- IND-04/03-documentos-do-imovel.pdf: esperado matricula-transcricao + inscricao-imobiliaria; notado (matricula-transcricao, inscricao-imobiliaria).
- IND-05/06-planta-e-memorial.pdf: esperado prancha + memorial; notado (prancha, memorial).

Divergências do gabarito:

- IND-14/06-planta.pdf: esperado **prancha**, obtido **indeterminada** (origem: classificacao; leitura legivel). Nenhum título ou campo característico de classe documental foi encontrado no texto lido.
- IND-15/08-memorial.pdf: esperado **memorial**, obtido **indeterminada** (origem: leitura-ocr; leitura parcial (OCR 17)). Nenhum título ou campo característico de classe documental foi encontrado no texto lido.

## E5: extração e normalização de campos

### Conjunto de desenvolvimento (DSD, usado na implementação) (2583 campos impressos no gabarito)

- Extraídos como no gabarito: **2565 de 2583** (99,3%).
- Valor diferente do impresso (erro que pareceria acerto): **0**.

| Campo | Impressos | Certos | Valor diferente | Não encontrado | Ilegível | Vários valores | Sem campo | Estado diferente | Normalização certa / conferida | Evidência ancorada / com região |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| area | 135 | 130 | 0 | 0 | 3 | 0 | 2 | 0 | 130 / 130 | 132 / 132 |
| assunto | 181 | 181 | 0 | 0 | 0 | 0 | 0 | 0 | — | 180 / 180 |
| bairro | 182 | 182 | 0 | 0 | 0 | 0 | 0 | 0 | — | 182 / 182 |
| cartorio | 45 | 43 | 0 | 0 | 0 | 0 | 2 | 0 | — | 43 / 43 |
| data-emissao | 45 | 43 | 0 | 0 | 0 | 0 | 2 | 0 | 43 / 43 | 43 / 43 |
| data-revisao | 89 | 89 | 0 | 0 | 0 | 0 | 0 | 0 | 89 / 89 | 88 / 88 |
| escala-situacao | 46 | 46 | 0 | 0 | 0 | 0 | 0 | 0 | 46 / 46 | 46 / 46 |
| formato-folha | 46 | 46 | 0 | 0 | 0 | 0 | 0 | 0 | 46 / 46 | 46 / 46 |
| inscricao | 91 | 91 | 0 | 0 | 0 | 0 | 0 | 0 | 91 / 91 | 91 / 91 |
| lote | 362 | 360 | 0 | 0 | 0 | 0 | 2 | 0 | 360 / 360 | 315 / 315 |
| matricula | 272 | 270 | 0 | 0 | 0 | 0 | 2 | 0 | 270 / 270 | 269 / 269 |
| parcelamento | 137 | 135 | 0 | 0 | 0 | 0 | 2 | 0 | — | 135 / 135 |
| quadra | 362 | 361 | 0 | 0 | 0 | 0 | 1 | 0 | 361 / 361 | 316 / 316 |
| rt-nome | 226 | 226 | 0 | 0 | 0 | 0 | 0 | 0 | — | 225 / 225 |
| rt-registro | 91 | 91 | 0 | 0 | 0 | 0 | 0 | 0 | — | 91 / 91 |
| signatario | 47 | 47 | 0 | 0 | 0 | 0 | 0 | 0 | — | 47 / 47 |
| titular | 226 | 224 | 0 | 0 | 0 | 0 | 2 | 0 | — | 223 / 223 |

Origem dos erros: classificação 15, OCR 3, extração 0.

<details><summary>Campos diferentes do gabarito</summary>

- DSD-03/matricula.pdf · area: esperado "450,00 m²"; obtido ilegivel "450,00 m?" (ilegivel; origem ocr).
- DSD-28/matricula.pdf · matricula: esperado "90417"; obtido nenhum campo (sem-campo; origem classificacao).
- DSD-28/matricula.pdf · cartorio: esperado "9º Serviço Registral Fictício"; obtido nenhum campo (sem-campo; origem classificacao).
- DSD-28/matricula.pdf · lote: esperado "F7"; obtido nenhum campo (sem-campo; origem classificacao).
- DSD-28/matricula.pdf · parcelamento: esperado "Jardim Ficticio"; obtido nenhum campo (sem-campo; origem classificacao).
- DSD-28/matricula.pdf · area: esperado "450,00 m²"; obtido nenhum campo (sem-campo; origem classificacao).
- DSD-28/matricula.pdf · titular: esperado "Carla Ficticia de Exemplo"; obtido nenhum campo (sem-campo; origem classificacao).
- DSD-28/matricula.pdf · data-emissao: esperado "20/10/2026"; obtido nenhum campo (sem-campo; origem classificacao).
- DSD-29/matricula.pdf · matricula: esperado "90417"; obtido nenhum campo (sem-campo; origem classificacao).
- DSD-29/matricula.pdf · cartorio: esperado "9º Serviço Registral Fictício"; obtido nenhum campo (sem-campo; origem classificacao).
- DSD-29/matricula.pdf · lote: esperado "F7"; obtido nenhum campo (sem-campo; origem classificacao).
- DSD-29/matricula.pdf · quadra: esperado "12"; obtido nenhum campo (sem-campo; origem classificacao).
- DSD-29/matricula.pdf · parcelamento: esperado "Jardim Ficticio"; obtido nenhum campo (sem-campo; origem classificacao).
- DSD-29/matricula.pdf · area: esperado "450,00 m²"; obtido nenhum campo (sem-campo; origem classificacao).
- DSD-29/matricula.pdf · titular: esperado "Carla Ficticia de Exemplo"; obtido nenhum campo (sem-campo; origem classificacao).
- DSD-29/matricula.pdf · data-emissao: esperado "20/10/2026"; obtido nenhum campo (sem-campo; origem classificacao).
- DSD-30/matricula.jpg · area: esperado "450,00 m²"; obtido ilegivel "450,00 m?" (ilegivel; origem ocr).
- DSD-34/matricula.pdf · area: esperado "450,00 m²"; obtido ilegivel "450,00 m?" (ilegivel; origem ocr).

</details>

Campos encontrados que o gabarito não lista para aquele anexo (não contam como erro; o gabarito só afirma o que a peça foi feita para mostrar): rt-registro 135.

### Conjunto de validação usada nos ajustes (VAL) (740 campos impressos no gabarito)

- Extraídos como no gabarito: **705 de 740** (95,3%).
- Valor diferente do impresso (erro que pareceria acerto): **0**.

| Campo | Impressos | Certos | Valor diferente | Não encontrado | Ilegível | Vários valores | Sem campo | Estado diferente | Normalização certa / conferida | Evidência ancorada / com região |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| area | 47 | 31 | 0 | 16 | 0 | 0 | 0 | 0 | 31 / 31 | 31 / 31 |
| assunto | 64 | 63 | 0 | 1 | 0 | 0 | 0 | 0 | — | 63 / 63 |
| bairro | 47 | 47 | 0 | 0 | 0 | 0 | 0 | 0 | — | 47 / 47 |
| cartorio | 15 | 15 | 0 | 0 | 0 | 0 | 0 | 0 | — | 15 / 15 |
| data-emissao | 15 | 15 | 0 | 0 | 0 | 0 | 0 | 0 | 15 / 15 | 15 / 15 |
| data-revisao | 32 | 32 | 0 | 0 | 0 | 0 | 0 | 0 | 32 / 32 | 32 / 32 |
| escala-situacao | 16 | 16 | 0 | 0 | 0 | 0 | 0 | 0 | 16 / 16 | 16 / 16 |
| formato-folha | 16 | 15 | 0 | 1 | 0 | 0 | 0 | 0 | 15 / 15 | 15 / 15 |
| inscricao | 32 | 32 | 0 | 0 | 0 | 0 | 0 | 0 | 32 / 32 | 32 / 32 |
| lote | 94 | 93 | 0 | 0 | 1 | 0 | 0 | 0 | 93 / 93 | 94 / 94 |
| matricula | 63 | 63 | 0 | 0 | 0 | 0 | 0 | 0 | 63 / 63 | 63 / 63 |
| parcelamento | 31 | 16 | 0 | 0 | 0 | 0 | 15 | 0 | — | 16 / 16 |
| quadra | 94 | 93 | 0 | 0 | 1 | 0 | 0 | 0 | 93 / 93 | 94 / 94 |
| rt-nome | 63 | 63 | 0 | 0 | 0 | 0 | 0 | 0 | — | 63 / 63 |
| rt-registro | 47 | 47 | 0 | 0 | 0 | 0 | 0 | 0 | — | 47 / 47 |
| signatario | 17 | 17 | 0 | 0 | 0 | 0 | 0 | 0 | — | 17 / 17 |
| titular | 47 | 47 | 0 | 0 | 0 | 0 | 0 | 0 | — | 47 / 47 |

Origem dos erros: classificação 0, OCR 4, extração 31.

<details><summary>Campos diferentes do gabarito</summary>

- VAL-01/certidao.pdf · parcelamento: esperado "Vila Imaginaria"; obtido nenhum campo (sem-campo; origem extracao).
- VAL-01/planta.pdf · area: esperado "600,00 m²"; obtido nao-encontrado (nao-encontrado; origem extracao).
- VAL-02/certidao.pdf · parcelamento: esperado "Vila Imaginaria"; obtido nenhum campo (sem-campo; origem extracao).
- VAL-02/planta.pdf · area: esperado "600,00 m²"; obtido nao-encontrado (nao-encontrado; origem extracao).
- VAL-03/certidao.pdf · parcelamento: esperado "Vila Imaginaria"; obtido nenhum campo (sem-campo; origem extracao).
- VAL-03/planta.pdf · area: esperado "600,00 m²"; obtido nao-encontrado (nao-encontrado; origem extracao).
- VAL-04/certidao.pdf · parcelamento: esperado "Vila Imaginaria"; obtido nenhum campo (sem-campo; origem extracao).
- VAL-04/planta.pdf · area: esperado "600,00 m²"; obtido nao-encontrado (nao-encontrado; origem extracao).
- VAL-05/certidao.pdf · parcelamento: esperado "Vila Imaginaria"; obtido nenhum campo (sem-campo; origem extracao).
- VAL-05/planta.pdf · area: esperado "600,00 m²"; obtido nao-encontrado (nao-encontrado; origem extracao).
- VAL-06/certidao.pdf · parcelamento: esperado "Vila Imaginaria"; obtido nenhum campo (sem-campo; origem extracao).
- VAL-06/planta.pdf · area: esperado "600,00 m²"; obtido nao-encontrado (nao-encontrado; origem extracao).
- VAL-07/certidao.pdf · parcelamento: esperado "Vila Imaginaria"; obtido nenhum campo (sem-campo; origem extracao).
- VAL-07/planta.pdf · area: esperado "20.100,00 m²"; obtido nao-encontrado (nao-encontrado; origem extracao).
- VAL-08/certidao.pdf · parcelamento: esperado "Vila Imaginaria"; obtido nenhum campo (sem-campo; origem extracao).
- VAL-08/planta.pdf · area: esperado "600,00 m²"; obtido nao-encontrado (nao-encontrado; origem extracao).
- VAL-09/certidao.pdf · parcelamento: esperado "Vila Imaginaria"; obtido nenhum campo (sem-campo; origem extracao).
- VAL-09/planta.pdf · area: esperado "600,00 m²"; obtido nao-encontrado (nao-encontrado; origem extracao).
- VAL-10/certidao.pdf · parcelamento: esperado "Vila Imaginaria"; obtido nenhum campo (sem-campo; origem extracao).
- VAL-10/planta.pdf · area: esperado "600,00 m²"; obtido nao-encontrado (nao-encontrado; origem extracao).
- VAL-11/certidao.pdf · parcelamento: esperado "Vila Imaginaria"; obtido nenhum campo (sem-campo; origem extracao).
- VAL-11/planta.pdf · area: esperado "600,00 m²"; obtido nao-encontrado (nao-encontrado; origem extracao).
- VAL-12/certidao.pdf · parcelamento: esperado "Vila Imaginaria"; obtido nenhum campo (sem-campo; origem extracao).
- VAL-12/planta.pdf · area: esperado "600,00 m²"; obtido nao-encontrado (nao-encontrado; origem extracao).
- VAL-13/req.pdf · assunto: esperado "Desdobro"; obtido nao-encontrado (nao-encontrado; origem extracao).
- VAL-13/certidao.pdf · parcelamento: esperado "Vila Imaginaria"; obtido nenhum campo (sem-campo; origem extracao).
- VAL-13/planta.pdf · area: esperado "600,00 m²"; obtido nao-encontrado (nao-encontrado; origem extracao).
- VAL-14/certidao.pdf · parcelamento: esperado "Vila Imaginaria"; obtido nenhum campo (sem-campo; origem extracao).
- VAL-14/planta.pdf · lote: esperado "07"; obtido ilegivel "07" (ilegivel; origem ocr).
- VAL-14/planta.pdf · quadra: esperado "03"; obtido ilegivel "03" (ilegivel; origem ocr).
- VAL-14/planta.pdf · area: esperado "600,00 m²"; obtido nao-encontrado (nao-encontrado; origem ocr).
- VAL-14/planta.pdf · formato-folha: esperado "A3"; obtido nao-encontrado (nao-encontrado; origem ocr).
- VAL-15/certidao.pdf · parcelamento: esperado "Vila Imaginaria"; obtido nenhum campo (sem-campo; origem extracao).
- VAL-15/planta.pdf · area: esperado "600,00 m²"; obtido nao-encontrado (nao-encontrado; origem extracao).
- VAL-16/planta.pdf · area: esperado "600,00 m²"; obtido nao-encontrado (nao-encontrado; origem extracao).

</details>

Campos encontrados que o gabarito não lista para aquele anexo (não contam como erro; o gabarito só afirma o que a peça foi feita para mostrar): lote 18, quadra 16, rt-registro 16.

### Conjunto de independente congelado (IND) (749 campos impressos no gabarito)

- Extraídos como no gabarito: **634 de 749** (84,6%).
- Valor diferente do impresso (erro que pareceria acerto): **0**.

| Campo | Impressos | Certos | Valor diferente | Não encontrado | Ilegível | Vários valores | Sem campo | Estado diferente | Normalização certa / conferida | Evidência ancorada / com região |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| area | 47 | 30 | 0 | 15 | 0 | 0 | 2 | 0 | 30 / 30 | 30 / 30 |
| assunto | 46 | 44 | 0 | 0 | 1 | 0 | 1 | 0 | — | 44 / 44 |
| bairro | 30 | 29 | 0 | 0 | 1 | 0 | 0 | 0 | — | 29 / 29 |
| cartorio | 16 | 16 | 0 | 0 | 0 | 0 | 0 | 0 | — | 16 / 16 |
| data-emissao | 16 | 16 | 0 | 0 | 0 | 0 | 0 | 0 | 16 / 16 | 16 / 16 |
| data-revisao | 31 | 14 | 0 | 15 | 0 | 0 | 2 | 0 | 14 / 14 | 14 / 14 |
| escala-situacao | 16 | 15 | 0 | 0 | 0 | 0 | 1 | 0 | 15 / 15 | 15 / 15 |
| formato-folha | 16 | 15 | 0 | 0 | 0 | 0 | 1 | 0 | 15 / 15 | 15 / 15 |
| inscricao | 30 | 15 | 0 | 14 | 1 | 0 | 0 | 0 | 15 / 15 | 15 / 15 |
| lote | 110 | 92 | 0 | 16 | 1 | 0 | 1 | 0 | 92 / 92 | 76 / 76 |
| matricula | 63 | 61 | 0 | 0 | 1 | 0 | 1 | 0 | 60 / 60 | 61 / 61 |
| parcelamento | 31 | 16 | 0 | 14 | 1 | 0 | 0 | 0 | — | 16 / 16 |
| quadra | 110 | 92 | 0 | 16 | 1 | 0 | 1 | 0 | 92 / 92 | 76 / 76 |
| rt-nome | 77 | 73 | 0 | 1 | 1 | 0 | 2 | 0 | — | 73 / 73 |
| rt-registro | 45 | 44 | 0 | 0 | 0 | 0 | 1 | 0 | — | 44 / 44 |
| signatario | 17 | 16 | 0 | 0 | 1 | 0 | 0 | 0 | — | 16 / 16 |
| titular | 48 | 46 | 0 | 1 | 1 | 0 | 0 | 0 | — | 46 / 46 |

Origem dos erros: classificação 12, OCR 12, extração 91.

<details><summary>Campos diferentes do gabarito</summary>

- IND-01/01-requerimento.pdf · parcelamento: esperado "Residencial Hipotetico"; obtido nao-encontrado (nao-encontrado; origem extracao).
- IND-01/01-requerimento.pdf · inscricao: esperado "1234.5678.009"; obtido nao-encontrado (nao-encontrado; origem extracao).
- IND-01/05-art.pdf · lote: esperado "15"; obtido nao-encontrado (nao-encontrado; origem extracao).
- IND-01/05-art.pdf · quadra: esperado "08"; obtido nao-encontrado (nao-encontrado; origem extracao).
- IND-01/06-planta.pdf · area: esperado "360,00 m²"; obtido nao-encontrado (nao-encontrado; origem extracao).
- IND-01/06-planta.pdf · data-revisao: esperado "30/10/2026"; obtido nao-encontrado (nao-encontrado; origem extracao).
- IND-02/01-requerimento.pdf · titular: esperado "Helena Modelo Simulada"; obtido nao-encontrado (nao-encontrado; origem extracao).
- IND-02/01-requerimento.pdf · lote: esperado "15"; obtido nao-encontrado (nao-encontrado; origem extracao).
- IND-02/01-requerimento.pdf · quadra: esperado "08"; obtido nao-encontrado (nao-encontrado; origem extracao).
- IND-02/01-requerimento.pdf · rt-nome: esperado "Bruno Projetista Imaginario"; obtido nao-encontrado (nao-encontrado; origem extracao).
- IND-02/05-art.pdf · lote: esperado "15"; obtido nao-encontrado (nao-encontrado; origem extracao).
- IND-02/05-art.pdf · quadra: esperado "08"; obtido nao-encontrado (nao-encontrado; origem extracao).
- IND-02/06-planta.pdf · area: esperado "360,00 m²"; obtido nao-encontrado (nao-encontrado; origem extracao).
- IND-02/06-planta.pdf · data-revisao: esperado "30/10/2026"; obtido nao-encontrado (nao-encontrado; origem extracao).
- IND-03/01-requerimento.pdf · assunto: esperado "Desdobro de lote"; obtido ilegivel (ilegivel; origem ocr).
- IND-03/01-requerimento.pdf · titular: esperado "Helena Modelo Simulada"; obtido ilegivel (ilegivel; origem ocr).
- IND-03/01-requerimento.pdf · lote: esperado "15"; obtido ilegivel (ilegivel; origem ocr).
- IND-03/01-requerimento.pdf · quadra: esperado "08"; obtido ilegivel (ilegivel; origem ocr).
- IND-03/01-requerimento.pdf · parcelamento: esperado "Residencial Hipotetico"; obtido ilegivel (ilegivel; origem ocr).
- IND-03/01-requerimento.pdf · bairro: esperado "Vila Teste"; obtido ilegivel (ilegivel; origem ocr).
- IND-03/01-requerimento.pdf · matricula: esperado "55.120"; obtido ilegivel (ilegivel; origem ocr).
- IND-03/01-requerimento.pdf · inscricao: esperado "1234.5678.009"; obtido ilegivel (ilegivel; origem ocr).
- IND-03/01-requerimento.pdf · rt-nome: esperado "Bruno Projetista Imaginario"; obtido ilegivel (ilegivel; origem ocr).
- IND-03/01-requerimento.pdf · rt-registro: esperado "CREA-FIC 000777"; obtido nenhum campo (sem-campo; origem extracao).
- IND-03/01-requerimento.pdf · signatario: esperado "Helena Modelo Simulada"; obtido ilegivel (ilegivel; origem ocr).
- IND-03/05-art.jpg · lote: esperado "15"; obtido nao-encontrado (nao-encontrado; origem ocr).
- IND-03/05-art.jpg · quadra: esperado "08"; obtido nao-encontrado (nao-encontrado; origem ocr).
- IND-03/06-planta.pdf · area: esperado "360,00 m²"; obtido nao-encontrado (nao-encontrado; origem extracao).
- IND-03/06-planta.pdf · data-revisao: esperado "30/10/2026"; obtido nao-encontrado (nao-encontrado; origem extracao).
- IND-04/01-requerimento.pdf · parcelamento: esperado "Residencial Hipotetico"; obtido nao-encontrado (nao-encontrado; origem extracao).
- IND-04/01-requerimento.pdf · inscricao: esperado "1234.5678.009"; obtido nao-encontrado (nao-encontrado; origem extracao).
- IND-04/05-art.pdf · lote: esperado "15"; obtido nao-encontrado (nao-encontrado; origem extracao).
- IND-04/05-art.pdf · quadra: esperado "08"; obtido nao-encontrado (nao-encontrado; origem extracao).
- IND-04/06-planta.pdf · area: esperado "360,00 m²"; obtido nao-encontrado (nao-encontrado; origem extracao).
- IND-04/06-planta.pdf · data-revisao: esperado "30/10/2026"; obtido nao-encontrado (nao-encontrado; origem extracao).
- IND-05/01-requerimento.pdf · parcelamento: esperado "Residencial Hipotetico"; obtido nao-encontrado (nao-encontrado; origem extracao).
- IND-05/01-requerimento.pdf · inscricao: esperado "1234.5678.009"; obtido nao-encontrado (nao-encontrado; origem extracao).
- IND-05/05-art.pdf · lote: esperado "15"; obtido nao-encontrado (nao-encontrado; origem extracao).
- IND-05/05-art.pdf · quadra: esperado "08"; obtido nao-encontrado (nao-encontrado; origem extracao).
- IND-05/06-planta-e-memorial.pdf · area: esperado "360,00 m²"; obtido nao-encontrado (nao-encontrado; origem extracao).
- IND-05/06-planta-e-memorial.pdf · data-revisao: esperado "30/10/2026"; obtido nao-encontrado (nao-encontrado; origem extracao).
- IND-06/01-requerimento.pdf · parcelamento: esperado "Residencial Hipotetico"; obtido nao-encontrado (nao-encontrado; origem extracao).
- IND-06/01-requerimento.pdf · inscricao: esperado "1234.5678.009"; obtido nao-encontrado (nao-encontrado; origem extracao).
- IND-06/06-planta.pdf · area: esperado "360,00 m²"; obtido nao-encontrado (nao-encontrado; origem extracao).
- IND-06/06-planta.pdf · data-revisao: esperado "30/10/2026"; obtido nao-encontrado (nao-encontrado; origem extracao).
- IND-07/01-requerimento.pdf · parcelamento: esperado "Residencial Hipotetico"; obtido nao-encontrado (nao-encontrado; origem extracao).
- IND-07/01-requerimento.pdf · inscricao: esperado "1234.5678.009"; obtido nao-encontrado (nao-encontrado; origem extracao).
- IND-07/05-art.pdf · lote: esperado "15"; obtido nao-encontrado (nao-encontrado; origem extracao).
- IND-07/05-art.pdf · quadra: esperado "08"; obtido nao-encontrado (nao-encontrado; origem extracao).
- IND-07/06-planta.pdf · area: esperado "360,00 m²"; obtido nao-encontrado (nao-encontrado; origem extracao).
- IND-07/06-planta.pdf · data-revisao: esperado "30/10/2026"; obtido nao-encontrado (nao-encontrado; origem extracao).
- IND-08/01-requerimento.pdf · parcelamento: esperado "Residencial Hipotetico"; obtido nao-encontrado (nao-encontrado; origem extracao).
- IND-08/01-requerimento.pdf · inscricao: esperado "1234.5678.009"; obtido nao-encontrado (nao-encontrado; origem extracao).
- IND-08/05-art.pdf · lote: esperado "15"; obtido nao-encontrado (nao-encontrado; origem extracao).
- IND-08/05-art.pdf · quadra: esperado "08"; obtido nao-encontrado (nao-encontrado; origem extracao).
- IND-08/06-planta.pdf · area: esperado "360,00 m²"; obtido nao-encontrado (nao-encontrado; origem extracao).
- IND-08/06-planta.pdf · data-revisao: esperado "30/10/2026"; obtido nao-encontrado (nao-encontrado; origem extracao).
- IND-09/01-requerimento.pdf · parcelamento: esperado "Residencial Hipotetico"; obtido nao-encontrado (nao-encontrado; origem extracao).
- IND-09/01-requerimento.pdf · inscricao: esperado "1234.5678.009"; obtido nao-encontrado (nao-encontrado; origem extracao).
- IND-09/05-art.pdf · lote: esperado "15"; obtido nao-encontrado (nao-encontrado; origem extracao).
- IND-09/05-art.pdf · quadra: esperado "08"; obtido nao-encontrado (nao-encontrado; origem extracao).
- IND-09/06-planta.pdf · area: esperado "360,00 m²"; obtido nao-encontrado (nao-encontrado; origem extracao).
- IND-09/06-planta.pdf · data-revisao: esperado "30/10/2026"; obtido nao-encontrado (nao-encontrado; origem extracao).
- IND-10/01-requerimento.pdf · parcelamento: esperado "Residencial Hipotetico"; obtido nao-encontrado (nao-encontrado; origem extracao).
- IND-10/01-requerimento.pdf · inscricao: esperado "1234.5678.009"; obtido nao-encontrado (nao-encontrado; origem extracao).
- IND-10/05-art.pdf · lote: esperado "15"; obtido nao-encontrado (nao-encontrado; origem extracao).
- IND-10/05-art.pdf · quadra: esperado "08"; obtido nao-encontrado (nao-encontrado; origem extracao).
- IND-10/06-planta.pdf · area: esperado "360,00 m²"; obtido nao-encontrado (nao-encontrado; origem extracao).
- IND-10/06-planta.pdf · data-revisao: esperado "30/10/2026"; obtido nao-encontrado (nao-encontrado; origem extracao).
- IND-11/01-requerimento.pdf · parcelamento: esperado "Residencial Hipotetico"; obtido nao-encontrado (nao-encontrado; origem extracao).
- IND-11/01-requerimento.pdf · inscricao: esperado "1234.5678.009"; obtido nao-encontrado (nao-encontrado; origem extracao).
- IND-11/05-art.pdf · lote: esperado "15"; obtido nao-encontrado (nao-encontrado; origem extracao).
- IND-11/05-art.pdf · quadra: esperado "08"; obtido nao-encontrado (nao-encontrado; origem extracao).
- IND-11/06-planta.pdf · area: esperado "360,00 m²"; obtido nao-encontrado (nao-encontrado; origem extracao).
- IND-11/06-planta.pdf · data-revisao: esperado "30/10/2026"; obtido nao-encontrado (nao-encontrado; origem extracao).
- IND-12/01-requerimento.pdf · parcelamento: esperado "Residencial Hipotetico"; obtido nao-encontrado (nao-encontrado; origem extracao).
- IND-12/01-requerimento.pdf · inscricao: esperado "1234.5678.009"; obtido nao-encontrado (nao-encontrado; origem extracao).
- IND-12/05-art.pdf · lote: esperado "15"; obtido nao-encontrado (nao-encontrado; origem extracao).
- IND-12/05-art.pdf · quadra: esperado "08"; obtido nao-encontrado (nao-encontrado; origem extracao).
- IND-12/06-planta.pdf · area: esperado "360,00 m²"; obtido nao-encontrado (nao-encontrado; origem extracao).
- IND-12/06-planta.pdf · data-revisao: esperado "30/10/2026"; obtido nao-encontrado (nao-encontrado; origem extracao).
- IND-13/01-requerimento.pdf · parcelamento: esperado "Residencial Hipotetico"; obtido nao-encontrado (nao-encontrado; origem extracao).
- IND-13/01-requerimento.pdf · inscricao: esperado "1234.5678.009"; obtido nao-encontrado (nao-encontrado; origem extracao).
- IND-13/05-art.pdf · lote: esperado "15"; obtido nao-encontrado (nao-encontrado; origem extracao).
- IND-13/05-art.pdf · quadra: esperado "08"; obtido nao-encontrado (nao-encontrado; origem extracao).
- IND-13/06-planta.pdf · area: esperado "25.000,00 m²"; obtido nao-encontrado (nao-encontrado; origem extracao).
- IND-13/06-planta.pdf · data-revisao: esperado "30/10/2026"; obtido nao-encontrado (nao-encontrado; origem extracao).
- IND-14/01-requerimento.pdf · parcelamento: esperado "Residencial Hipotetico"; obtido nao-encontrado (nao-encontrado; origem extracao).
- IND-14/01-requerimento.pdf · inscricao: esperado "1234.5678.009"; obtido nao-encontrado (nao-encontrado; origem extracao).
- IND-14/05-art.pdf · lote: esperado "15"; obtido nao-encontrado (nao-encontrado; origem extracao).
- IND-14/05-art.pdf · quadra: esperado "08"; obtido nao-encontrado (nao-encontrado; origem extracao).
- IND-14/06-planta.pdf · area: esperado "360,00 m²"; obtido nenhum campo (sem-campo; origem classificacao).
- IND-14/06-planta.pdf · escala-situacao: esperado "1:10.000"; obtido nenhum campo (sem-campo; origem classificacao).
- IND-14/06-planta.pdf · formato-folha: esperado "A3"; obtido nenhum campo (sem-campo; origem classificacao).
- IND-14/06-planta.pdf · data-revisao: esperado "30/10/2026"; obtido nenhum campo (sem-campo; origem classificacao).
- IND-14/06-planta.pdf · rt-nome: esperado "Bruno Projetista Imaginario"; obtido nenhum campo (sem-campo; origem classificacao).
- IND-15/01-requerimento.pdf · parcelamento: esperado "Residencial Hipotetico"; obtido nao-encontrado (nao-encontrado; origem extracao).
- IND-15/01-requerimento.pdf · inscricao: esperado "1234.5678.009"; obtido nao-encontrado (nao-encontrado; origem extracao).
- IND-15/05-art.pdf · lote: esperado "15"; obtido nao-encontrado (nao-encontrado; origem extracao).
- IND-15/05-art.pdf · quadra: esperado "08"; obtido nao-encontrado (nao-encontrado; origem extracao).
- IND-15/06-planta.pdf · area: esperado "360,00 m²"; obtido nao-encontrado (nao-encontrado; origem extracao).
- IND-15/06-planta.pdf · data-revisao: esperado "30/10/2026"; obtido nao-encontrado (nao-encontrado; origem extracao).
- IND-15/08-memorial.pdf · assunto: esperado "Desdobro"; obtido nenhum campo (sem-campo; origem classificacao).
- IND-15/08-memorial.pdf · lote: esperado "15"; obtido nenhum campo (sem-campo; origem classificacao).
- IND-15/08-memorial.pdf · quadra: esperado "08"; obtido nenhum campo (sem-campo; origem classificacao).
- IND-15/08-memorial.pdf · matricula: esperado "55.120"; obtido nenhum campo (sem-campo; origem classificacao).
- IND-15/08-memorial.pdf · area: esperado "360,00 m²"; obtido nenhum campo (sem-campo; origem classificacao).
- IND-15/08-memorial.pdf · data-revisao: esperado "30/10/2026"; obtido nenhum campo (sem-campo; origem classificacao).
- IND-15/08-memorial.pdf · rt-nome: esperado "Bruno Projetista Imaginario"; obtido nenhum campo (sem-campo; origem classificacao).
- IND-16/01-requerimento.pdf · parcelamento: esperado "Residencial Hipotetico"; obtido nao-encontrado (nao-encontrado; origem extracao).
- IND-16/01-requerimento.pdf · inscricao: esperado "1234.5678.009"; obtido nao-encontrado (nao-encontrado; origem extracao).
- IND-16/05-art.pdf · lote: esperado "15"; obtido nao-encontrado (nao-encontrado; origem extracao).
- IND-16/05-art.pdf · quadra: esperado "08"; obtido nao-encontrado (nao-encontrado; origem extracao).
- IND-16/06-planta.pdf · area: esperado "360,00 m²"; obtido nao-encontrado (nao-encontrado; origem extracao).
- IND-16/06-planta.pdf · data-revisao: esperado "30/10/2026"; obtido nao-encontrado (nao-encontrado; origem extracao).

</details>

Campos encontrados que o gabarito não lista para aquele anexo (não contam como erro; o gabarito só afirma o que a peça foi feita para mostrar): rt-registro 29, lote 1.

### Comparação interdocumental

Só entram valores encontrados com confiança e sem ambiguidade; o resto fica inconclusivo. "Insuficiente" quer dizer menos de dois valores para comparar (ausência não é divergência). Se a divergência é esperada ou não, o gabarito diz nas regras 018 a 021 (seção E6).

| Comparação | Coincide | Diverge | Inconclusivo | Insuficiente | Pacotes com divergência |
|---|---:|---:|---:|---:|---|
| Matrícula no requerimento × memorial | 70 | 0 | 2 | 8 | — |
| Lote na prancha × memorial | 69 | 1 | 1 | 9 | VAL-06 ("07" × "7") |
| Responsável técnico na DRT × ART/RRT | 72 | 0 | 0 | 8 | — |
| Assunto do requerimento × DRT | 70 | 3 | 1 | 6 | DSD-08 ("DESDOBRO" × "RETIFICAÇÃO DE REGISTRO IMOBILIÁRIO"), VAL-15 ("Remembramento" × "Desdobro"), IND-16 ("Desdobro de lote" × "Retificação de registro imobiliário") |
| Data de revisão da prancha × memorial | 56 | 2 | 0 | 22 | DSD-19 ("01/11/2026" × "03/11/2026"), VAL-10 ("12/05/2026" × "13/05/2026") |

## E6: motor de regras

### Conjunto de desenvolvimento (DSD, usado na implementação) (821 expectativas de regra)

- Resultado aceito pelo gabarito: **821 de 821** (100,0%).
- Falsos alertas: **0**; achados esperados não detectados: **0**; abstenções indevidas: **0**; tipo de achado diferente: **0**; outro resultado: **0**.
- Evidência dos achados (hash e página conferem; valores conflitantes na região citada): 36 corretas de 36.

| Regra | Expectativas | Aceitas | Falso alerta | Não detectado | Abstenção indevida | Tipo diferente | Outro | Obtidos (sem-achado / achado / não avaliável / pendente / não aplicável) |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| AQR-GCA-001 | 45 | 45 | 0 | 0 | 0 | 0 | 0 | 45 / 0 / 0 / 0 / 0 |
| AQR-GCA-002 | 48 | 48 | 0 | 0 | 0 | 0 | 0 | 46 / 1 / 1 / 0 / 0 |
| AQR-GCA-003 | 48 | 48 | 0 | 0 | 0 | 0 | 0 | 45 / 2 / 1 / 0 / 0 |
| AQR-GCA-006 | 48 | 48 | 0 | 0 | 0 | 0 | 0 | 45 / 1 / 2 / 0 / 0 |
| AQR-GCA-008 | 48 | 48 | 0 | 0 | 0 | 0 | 0 | 43 / 1 / 4 / 0 / 0 |
| AQR-GCA-009 | 3 | 3 | 0 | 0 | 0 | 0 | 0 | 0 / 2 / 1 / 0 / 0 |
| AQR-GCA-010 | 46 | 46 | 0 | 0 | 0 | 0 | 0 | 1 / 1 / 1 / 0 / 43 |
| AQR-GCA-011 | 48 | 48 | 0 | 0 | 0 | 0 | 0 | 45 / 1 / 2 / 0 / 0 |
| AQR-GCA-012 | 48 | 48 | 0 | 0 | 0 | 0 | 0 | 44 / 3 / 1 / 0 / 0 |
| AQR-GCA-013 | 48 | 48 | 0 | 0 | 0 | 0 | 0 | 42 / 2 / 4 / 0 / 0 |
| AQR-GCA-016 | 41 | 41 | 0 | 0 | 0 | 0 | 0 | 39 / 2 / 0 / 0 / 0 |
| AQR-GCA-018 | 46 | 46 | 0 | 0 | 0 | 0 | 0 | 44 / 1 / 1 / 0 / 0 |
| AQR-GCA-019 | 38 | 38 | 0 | 0 | 0 | 0 | 0 | 36 / 2 / 0 / 0 / 0 |
| AQR-GCA-020 | 34 | 34 | 0 | 0 | 0 | 0 | 0 | 32 / 2 / 0 / 0 / 0 |
| AQR-GCA-021 | 44 | 44 | 0 | 0 | 0 | 0 | 0 | 41 / 1 / 2 / 0 / 0 |
| AQR-GCA-022 | 47 | 47 | 0 | 0 | 0 | 0 | 0 | 45 / 1 / 1 / 0 / 0 |
| AQR-GCA-023 | 47 | 47 | 0 | 0 | 0 | 0 | 0 | 45 / 1 / 1 / 0 / 0 |
| AQR-GCA-028 | 47 | 47 | 0 | 0 | 0 | 0 | 0 | 1 / 1 / 0 / 44 / 1 |
| AQR-GCA-043 | 47 | 47 | 0 | 0 | 0 | 0 | 0 | 36 / 11 / 0 / 0 / 0 |

Origem dos erros: classificacao 0, ocr 0, extracao 0, condicao 0, regra 0.

### Conjunto de validação usada nos ajustes (VAL) (144 expectativas de regra)

- Resultado aceito pelo gabarito: **143 de 144** (99,3%).
- Falsos alertas: **1**; achados esperados não detectados: **0**; abstenções indevidas: **0**; tipo de achado diferente: **0**; outro resultado: **0**.
- Evidência dos achados (hash e página conferem; valores conflitantes na região citada): 8 corretas de 8.

| Regra | Expectativas | Aceitas | Falso alerta | Não detectado | Abstenção indevida | Tipo diferente | Outro | Obtidos (sem-achado / achado / não avaliável / pendente / não aplicável) |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| AQR-GCA-001 | 2 | 1 | 1 | 0 | 0 | 0 | 0 | 1 / 1 / 0 / 0 / 0 |
| AQR-GCA-002 | 16 | 16 | 0 | 0 | 0 | 0 | 0 | 16 / 0 / 0 / 0 / 0 |
| AQR-GCA-003 | 15 | 15 | 0 | 0 | 0 | 0 | 0 | 14 / 1 / 0 / 0 / 0 |
| AQR-GCA-006 | 15 | 15 | 0 | 0 | 0 | 0 | 0 | 15 / 0 / 0 / 0 / 0 |
| AQR-GCA-008 | 16 | 16 | 0 | 0 | 0 | 0 | 0 | 15 / 0 / 1 / 0 / 0 |
| AQR-GCA-009 | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 0 / 1 / 0 / 0 / 0 |
| AQR-GCA-010 | 3 | 3 | 0 | 0 | 0 | 0 | 0 | 1 / 1 / 0 / 0 / 1 |
| AQR-GCA-011 | 15 | 15 | 0 | 0 | 0 | 0 | 0 | 14 / 1 / 0 / 0 / 0 |
| AQR-GCA-012 | 15 | 15 | 0 | 0 | 0 | 0 | 0 | 15 / 0 / 0 / 0 / 0 |
| AQR-GCA-013 | 15 | 15 | 0 | 0 | 0 | 0 | 0 | 15 / 0 / 0 / 0 / 0 |
| AQR-GCA-016 | 2 | 2 | 0 | 0 | 0 | 0 | 0 | 1 / 0 / 1 / 0 / 0 |
| AQR-GCA-018 | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 0 / 0 / 1 / 0 / 0 |
| AQR-GCA-019 | 2 | 2 | 0 | 0 | 0 | 0 | 0 | 1 / 1 / 0 / 0 / 0 |
| AQR-GCA-020 | 2 | 2 | 0 | 0 | 0 | 0 | 0 | 1 / 1 / 0 / 0 / 0 |
| AQR-GCA-021 | 3 | 3 | 0 | 0 | 0 | 0 | 0 | 2 / 1 / 0 / 0 / 0 |
| AQR-GCA-022 | 3 | 3 | 0 | 0 | 0 | 0 | 0 | 3 / 0 / 0 / 0 / 0 |
| AQR-GCA-023 | 2 | 2 | 0 | 0 | 0 | 0 | 0 | 2 / 0 / 0 / 0 / 0 |
| AQR-GCA-028 | 15 | 15 | 0 | 0 | 0 | 0 | 0 | 0 / 0 / 0 / 15 / 0 |
| AQR-GCA-043 | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 1 / 0 / 0 / 0 / 0 |

Origem dos erros: classificacao 0, ocr 0, extracao 1, condicao 0, regra 0.

Resultados diferentes do gabarito:

- VAL-13 · AQR-GCA-001: esperado sem-achado; obtido **achado** (condicao-indeterminada) — falso-alerta, origem extracao. Gabarito: O assunto está no requerimento, com outro rótulo.

### Conjunto de independente congelado (IND) (288 expectativas de regra)

- Resultado aceito pelo gabarito: **270 de 288** (93,8%).
- Falsos alertas: **0**; achados esperados não detectados: **1**; abstenções indevidas: **17**; tipo de achado diferente: **0**; outro resultado: **0**.
- Evidência dos achados (hash e página conferem; valores conflitantes na região citada): 21 corretas de 21.

| Regra | Expectativas | Aceitas | Falso alerta | Não detectado | Abstenção indevida | Tipo diferente | Outro | Obtidos (sem-achado / achado / não avaliável / pendente / não aplicável) |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| AQR-GCA-001 | 15 | 15 | 0 | 0 | 0 | 0 | 0 | 15 / 0 / 0 / 0 / 0 |
| AQR-GCA-002 | 16 | 16 | 0 | 0 | 0 | 0 | 0 | 16 / 0 / 0 / 0 / 0 |
| AQR-GCA-003 | 16 | 16 | 0 | 0 | 0 | 0 | 0 | 14 / 1 / 1 / 0 / 0 |
| AQR-GCA-006 | 16 | 16 | 0 | 0 | 0 | 0 | 0 | 15 / 0 / 1 / 0 / 0 |
| AQR-GCA-008 | 16 | 15 | 0 | 1 | 0 | 0 | 0 | 15 / 0 / 1 / 0 / 0 |
| AQR-GCA-009 | 16 | 16 | 0 | 0 | 0 | 0 | 0 | 0 / 16 / 0 / 0 / 0 |
| AQR-GCA-010 | 15 | 15 | 0 | 0 | 0 | 0 | 0 | 1 / 0 / 1 / 0 / 13 |
| AQR-GCA-011 | 16 | 16 | 0 | 0 | 0 | 0 | 0 | 15 / 1 / 0 / 0 / 0 |
| AQR-GCA-012 | 16 | 15 | 0 | 0 | 1 | 0 | 0 | 15 / 0 / 1 / 0 / 0 |
| AQR-GCA-013 | 16 | 16 | 0 | 0 | 0 | 0 | 0 | 15 / 0 / 1 / 0 / 0 |
| AQR-GCA-016 | 14 | 14 | 0 | 0 | 0 | 0 | 0 | 14 / 0 / 0 / 0 / 0 |
| AQR-GCA-018 | 15 | 15 | 0 | 0 | 0 | 0 | 0 | 13 / 0 / 2 / 0 / 0 |
| AQR-GCA-019 | 12 | 12 | 0 | 0 | 0 | 0 | 0 | 11 / 1 / 0 / 0 / 0 |
| AQR-GCA-020 | 11 | 11 | 0 | 0 | 0 | 0 | 0 | 10 / 1 / 0 / 0 / 0 |
| AQR-GCA-021 | 14 | 0 | 0 | 0 | 14 | 0 | 0 | 0 / 0 / 14 / 0 / 0 |
| AQR-GCA-022 | 16 | 15 | 0 | 0 | 1 | 0 | 0 | 14 / 1 / 1 / 0 / 0 |
| AQR-GCA-023 | 16 | 15 | 0 | 0 | 1 | 0 | 0 | 15 / 0 / 1 / 0 / 0 |
| AQR-GCA-028 | 16 | 16 | 0 | 0 | 0 | 0 | 0 | 1 / 0 / 0 / 15 / 0 |
| AQR-GCA-043 | 16 | 16 | 0 | 0 | 0 | 0 | 0 | 16 / 0 / 0 / 0 / 0 |

Origem dos erros: classificacao 4, ocr 1, extracao 13, condicao 0, regra 0.

Resultados diferentes do gabarito:

- IND-01 · AQR-GCA-021: esperado sem-achado; obtido **nao-avaliavel** — abstencao-indevida, origem extracao. Gabarito: Planta (revisão 01) e memorial com a mesma data, 30/10/2026.
- IND-02 · AQR-GCA-021: esperado sem-achado; obtido **nao-avaliavel** — abstencao-indevida, origem extracao. Gabarito: Planta (revisão 01) e memorial com a mesma data, 30/10/2026.
- IND-03 · AQR-GCA-021: esperado sem-achado; obtido **nao-avaliavel** — abstencao-indevida, origem ocr. Gabarito: Planta (revisão 01) e memorial com a mesma data, 30/10/2026.
- IND-04 · AQR-GCA-021: esperado sem-achado; obtido **nao-avaliavel** — abstencao-indevida, origem extracao. Gabarito: Planta (revisão 01) e memorial com a mesma data, 30/10/2026.
- IND-06 · AQR-GCA-021: esperado sem-achado; obtido **nao-avaliavel** — abstencao-indevida, origem extracao. Gabarito: Planta (revisão 01) e memorial com a mesma data, 30/10/2026.
- IND-07 · AQR-GCA-021: esperado sem-achado; obtido **nao-avaliavel** — abstencao-indevida, origem extracao. Gabarito: Planta (revisão 01) e memorial com a mesma data, 30/10/2026.
- IND-08 · AQR-GCA-021: esperado sem-achado; obtido **nao-avaliavel** — abstencao-indevida, origem extracao. Gabarito: Planta (revisão 01) e memorial com a mesma data, 30/10/2026.
- IND-09 · AQR-GCA-021: esperado sem-achado; obtido **nao-avaliavel** — abstencao-indevida, origem extracao. Gabarito: Planta (revisão 01) e memorial com a mesma data, 30/10/2026.
- IND-10 · AQR-GCA-021: esperado sem-achado; obtido **nao-avaliavel** — abstencao-indevida, origem extracao. Gabarito: Planta (revisão 01) e memorial com a mesma data, 30/10/2026.
- IND-11 · AQR-GCA-021: esperado sem-achado; obtido **nao-avaliavel** — abstencao-indevida, origem extracao. Gabarito: Planta (revisão 01) e memorial com a mesma data, 30/10/2026.
- IND-11 · AQR-GCA-008: esperado achado (nao-localizado); obtido **nao-avaliavel** — achado-nao-detectado, origem extracao. Gabarito: Dossiê, ensaio T03: alertar a possível falta do título do segundo imóvel.
- IND-12 · AQR-GCA-021: esperado sem-achado; obtido **nao-avaliavel** — abstencao-indevida, origem extracao. Gabarito: Planta (revisão 01) e memorial com a mesma data, 30/10/2026.
- IND-13 · AQR-GCA-021: esperado sem-achado; obtido **nao-avaliavel** — abstencao-indevida, origem extracao. Gabarito: Planta (revisão 01) e memorial com a mesma data, 30/10/2026.
- IND-14 · AQR-GCA-012: esperado sem-achado; obtido **nao-avaliavel** — abstencao-indevida, origem classificacao. Gabarito: A peça é a planta do desdobro, em PDF, com DXF.
- IND-14 · AQR-GCA-021: esperado sem-achado; obtido **nao-avaliavel** — abstencao-indevida, origem classificacao. Gabarito: Planta (revisão 01) e memorial com a mesma data, 30/10/2026.
- IND-14 · AQR-GCA-022: esperado sem-achado; obtido **nao-avaliavel** — abstencao-indevida, origem classificacao. Gabarito: Situação em 1:10.000.
- IND-14 · AQR-GCA-023: esperado sem-achado; obtido **nao-avaliavel** — abstencao-indevida, origem classificacao. Gabarito: Folha A3, permitida pelo TR 002.
- IND-16 · AQR-GCA-021: esperado sem-achado; obtido **nao-avaliavel** — abstencao-indevida, origem extracao. Gabarito: Planta (revisão 01) e memorial com a mesma data, 30/10/2026.

### Estados de todas as avaliações (com e sem expectativa no gabarito)

| Regra | sem-achado | achado | não avaliável | condição pendente | não aplicável |
|---|---:|---:|---:|---:|---:|
| AQR-GCA-001 | 76 | 1 | 3 | 0 | 0 |
| AQR-GCA-002 | 78 | 1 | 1 | 0 | 0 |
| AQR-GCA-003 | 74 | 4 | 2 | 0 | 0 |
| AQR-GCA-006 | 76 | 1 | 3 | 0 | 0 |
| AQR-GCA-008 | 73 | 1 | 6 | 0 | 0 |
| AQR-GCA-009 | 0 | 74 | 6 | 0 | 0 |
| AQR-GCA-010 | 3 | 2 | 4 | 0 | 71 |
| AQR-GCA-011 | 75 | 3 | 2 | 0 | 0 |
| AQR-GCA-012 | 75 | 3 | 2 | 0 | 0 |
| AQR-GCA-013 | 73 | 2 | 5 | 0 | 0 |
| AQR-GCA-016 | 75 | 2 | 3 | 0 | 0 |
| AQR-GCA-018 | 58 | 1 | 21 | 0 | 0 |
| AQR-GCA-019 | 74 | 4 | 2 | 0 | 0 |
| AQR-GCA-020 | 72 | 4 | 4 | 0 | 0 |
| AQR-GCA-021 | 56 | 2 | 22 | 0 | 0 |
| AQR-GCA-022 | 75 | 2 | 3 | 0 | 0 |
| AQR-GCA-023 | 75 | 1 | 4 | 0 | 0 |
| AQR-GCA-028 | 2 | 1 | 0 | 76 | 1 |
| AQR-GCA-043 | 69 | 11 | 0 | 0 | 0 |

Regras não executadas em todos os pacotes: HYP-GCA-045 (Hipótese desativada: depende de ato ou instrução escrita da GCA.); HYP-GCA-047 (Hipótese desativada: depende de ato ou instrução escrita da GCA.).
Garantias aplicadas como invariantes: AQR-GCA-040, AQR-GCA-041.

## Exemplos de triagem

### DSD-16 · AQR-GCA-018 (Campos da ART RRT coerentes): achado / divergencia

*ART com lote diferente do requerimento*

- Versão da regra: `AQR-GCA-018@1.0-review+fd9b3e3b9db5`; severidade do alerta: review; confiança: alta.
- Rascunho: Verificação técnica experimental, para revisão de servidor (não enviar ao requerente sem revisão). Campos da ART/RRT: lote difere entre requerimento e matrícula/transcrição × ART/RRT. Os valores e as páginas estão no quadro comparativo. O sistema não indica qual documento está correto.
- Evidência: anexo-1, hash 7b0b5cbd8e56…, página 1, região x=0.140 y=0.193, trecho "Lote: F7 Quadra: 12" (camada-de-texto).
- Evidência: anexo-3, hash 2596a64ad52e…, página 1, região x=0.193 y=0.144, trecho "Imóvel: lote F7 da quadra 12 do Jardim Ficticio, com área de 450,00 m²." (camada-de-texto).
- Evidência: anexo-5, hash 5a087240d7f8…, página 1, região x=0.142 y=0.193, trecho "Lote: C3 Quadra: 12 Bairro: Bairro Exemplo" (camada-de-texto).
- Valores de lote: "F7" (requerimento, anexo-1) × "F7" (matricula-transcricao, anexo-3) × "C3" (art-rrt-similar, anexo-5).
- Fundamento: S04 (art.3 §3); S06 (p.1 II); S07 (p.1 II); S08 (p.1 II).
- Limitação: Não extraídos da ART/RRT: parcelamento.
- Revisão humana: Servidor GCA valida achado e comunicação.

### DSD-08 · AQR-GCA-003 (DRT 01 correta): achado / nao-localizado

*DRT 03 (retificação) no lugar da DRT 01*

- Versão da regra: `AQR-GCA-003@1.0-review+fd9b3e3b9db5`; severidade do alerta: major; confiança: media.
- Rascunho: Verificação técnica experimental, para revisão de servidor (não enviar ao requerente sem revisão). Possível pendência: DRT 01 não localizado nos anexos recebidos. Há DRT 03, que não substitui a DRT 01 segundo o catálogo. Servidor confere antes de qualquer comunicação.
- Evidência: anexo-2, hash 96abd32dd9fc…, página 1, região x=0.094 y=0.080, trecho "DECLARAÇÃO DE RESPONSABILIDADE TÉCNICA - DRT 03" (camada-de-texto).
- Anexos procurados (pacote completo): anexo-1=requerimento, anexo-2=drt-03, anexo-3=matricula-transcricao, anexo-4=inscricao-imobiliaria, anexo-5=art-rrt-similar, anexo-6=prancha, anexo-7=cad, anexo-8=memorial.
- Fundamento: S07 (p.3 item II).
- Limitação: A busca cobre só os anexos recebidos, classificados pelo conteúdo; um documento com cabeçalho fora do padrão pode não ter sido reconhecido.
- Revisão humana: Servidor GCA valida achado e comunicação.

### DSD-46 · AQR-GCA-002 (Requerimento presente): nao-avaliavel

*Só um desenho DWG, sem confirmação de que o pacote está completo*

- Versão da regra: `AQR-GCA-002@1.0-review+fd9b3e3b9db5`; severidade do alerta: major; confiança: baixa.
- Rascunho: Verificação técnica experimental, para revisão de servidor (não enviar ao requerente sem revisão). Requerimento: não localizado entre os anexos recebidos, mas o pacote não foi confirmado como completo. Nada a apontar sem conferência do protocolo.
- Motivo: Integridade do pacote não confirmada: o documento pode estar entre os anexos não recebidos.
- Fundamento: S06 (p.2 item I); S07 (p.3 item I); S08 (p.3 item I).
- Limitação: Ausência nos anexos recebidos não comprova ausência no processo.
- Revisão humana: Servidor GCA valida achado e comunicação.

### DSD-42 · AQR-GCA-028 (GDU desdobro maior que dois hectares): condicao-pendente

*Área de 2,01 ha (20.100 m²), sem GDU, sem confirmação*

- Versão da regra: `AQR-GCA-028@1.0-review+fd9b3e3b9db5`; severidade do alerta: review; confiança: baixa.
- Rascunho: Verificação técnica experimental, para revisão de servidor (não enviar ao requerente sem revisão). Regra aguardando confirmação de servidor (area-situacao-acima-2ha). Pré-condição do catálogo: "Área da situação pertinente >20.000 m² confirmada por servidor". Informação: área acima de 20.000 m² extraída em anexo-3, anexo-6, anexo-8. Isso não ativa a regra; o enquadramento depende de confirmação do servidor.
- Fundamento: S07 (p.4 IX); L03 (art.22 I).
- Limitação: Sem a confirmação, a regra não é executada.
- Revisão humana: Servidor GCA valida achado e comunicação.

### DSD-43 · AQR-GCA-028 (GDU desdobro maior que dois hectares): achado / nao-localizado

*Área de 2,01 ha, sem GDU, servidor confirmou área acima de 2 ha*

- Versão da regra: `AQR-GCA-028@1.0-review+fd9b3e3b9db5`; severidade do alerta: review; confiança: media.
- Rascunho: Verificação técnica experimental, para revisão de servidor (não enviar ao requerente sem revisão). Possível pendência: GDU/GDR em PDF não localizado nos anexos recebidos. Condição de área confirmada por servidor; consulta GCA/PLANURB. Servidor confere antes de qualquer comunicação.
- Anexos procurados (pacote completo): anexo-1=requerimento, anexo-2=drt-01, anexo-3=matricula-transcricao, anexo-4=inscricao-imobiliaria, anexo-5=art-rrt-similar, anexo-6=prancha, anexo-7=cad, anexo-8=memorial.
- Fundamento: S07 (p.4 IX); L03 (art.22 I).
- Limitação: A busca cobre só os anexos recebidos, classificados pelo conteúdo; um documento com cabeçalho fora do padrão pode não ter sido reconhecido.
- Limitação: Divergência registrada no catálogo com a LC 74, art. 22 (gatilhos da GDU); o enquadramento é do servidor.
- Limitação: Validade e conteúdo da GDU não são verificados.
- Revisão humana: Servidor GCA valida achado e comunicação.

### DSD-26 · AQR-GCA-009 (Data do título registral para revisão): achado / condicao-indeterminada

*Matrícula com data de emissão ambígua (03/04/26)*

- Versão da regra: `AQR-GCA-009@1.0-review+fd9b3e3b9db5`; severidade do alerta: review; confiança: baixa.
- Rascunho: Verificação técnica experimental, para revisão de servidor (não enviar ao requerente sem revisão). Datas para conferência do prazo do título (protocolo registrado em 2026-11-05T13:00:00.000Z, dia 2026-11-05 no fuso de Campo Grande): emissão "03/04/26" com leitura ambígua (ano com dois dígitos: o século não está no documento); intervalo não calculado. O sistema não aplica critério de contagem, não declara validade nem vencimento; a avaliação temporal é do servidor.
- Evidência: anexo-3, hash ed45cf57042c…, página 1, região x=0.263 y=0.193, trecho "Certidão emitida em 03/04/26." (camada-de-texto).
- Fundamento: S06 (p.3 item V); S07 (p.3 item IV); S08 (p.4 item IV).
- Limitação: A forma de contagem do prazo de 30 dias (corrida ou útil, marco inicial, fuso) não é homologada: pergunta 5 do dossiê.
- Limitação: O intervalo em dias corridos é só apresentação, não critério.
- Revisão humana: Servidor GCA valida achado e comunicação.

### DSD-23 · AQR-GCA-016 (Assinatura do RT nas peças): achado / condicao-indeterminada

*Campo de assinatura do RT vazio na prancha*

- Versão da regra: `AQR-GCA-016@1.0-review+fd9b3e3b9db5`; severidade do alerta: review; confiança: media.
- Rascunho: Verificação técnica experimental, para revisão de servidor (não enviar ao requerente sem revisão). Área de assinatura do responsável técnico aparentemente vazia em prancha (anexo-6). Verificar se há assinatura eletrônica ou física.
- Evidência: anexo-6, hash c33e478b5441…, página 1, região x=0.047 y=0.822, trecho "Assinatura do responsável técnico" (camada-de-texto).
- Fundamento: S04 (art.3 §4); S06 (p.1 III); S07 (p.1 III); S08 (p.1 III).
- Limitação: Só a presença de traço na área de assinatura é vista; autoria, assinatura eletrônica e validade não são verificadas.
- Revisão humana: Servidor GCA valida achado e comunicação.

### VAL-13 · AQR-GCA-001 (Assunto reconhecível): achado / condicao-indeterminada

*Assunto com outro rótulo ("Objeto do pedido")*

- Versão da regra: `AQR-GCA-001@1.0-review+fd9b3e3b9db5`; severidade do alerta: review; confiança: media.
- Rascunho: Verificação técnica experimental, para revisão de servidor (não enviar ao requerente sem revisão). Assunto não localizado no texto lido do requerimento: modalidade indeterminada, para classificação pelo servidor. O sistema não infere o assunto do nome do arquivo.
- Evidência: anexo-1, hash aea58c3a0f71…, página 1, região x=0.094 y=0.080, trecho "Requerimento" (camada-de-texto).
- Fundamento: S06 (p.1); S07 (p.1); S08 (p.1).
- Limitação: O assunto pode estar sob outro rótulo que o sistema não reconhece.
- Revisão humana: Servidor GCA valida achado e comunicação.
