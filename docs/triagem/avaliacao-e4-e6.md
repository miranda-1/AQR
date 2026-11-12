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

## E5: extração e normalização de campos

### Conjunto de desenvolvimento (2583 campos impressos no gabarito)

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

### Conjunto de validação (740 campos impressos no gabarito)

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

### Comparação interdocumental

Só entram valores encontrados com confiança e sem ambiguidade; o resto fica inconclusivo. "Insuficiente" quer dizer menos de dois valores para comparar (ausência não é divergência). Se a divergência é esperada ou não, o gabarito diz nas regras 018 a 021 (seção E6).

| Comparação | Coincide | Diverge | Inconclusivo | Insuficiente | Pacotes com divergência |
|---|---:|---:|---:|---:|---|
| Matrícula no requerimento × memorial | 58 | 0 | 0 | 6 | — |
| Lote na prancha × memorial | 56 | 1 | 1 | 6 | VAL-06 ("07" × "7") |
| Responsável técnico na DRT × ART/RRT | 58 | 0 | 0 | 6 | — |
| Assunto do requerimento × DRT | 57 | 2 | 0 | 5 | DSD-08 ("DESDOBRO" × "RETIFICAÇÃO DE REGISTRO IMOBILIÁRIO"), VAL-15 ("Remembramento" × "Desdobro") |
| Data de revisão da prancha × memorial | 56 | 2 | 0 | 6 | DSD-19 ("01/11/2026" × "03/11/2026"), VAL-10 ("12/05/2026" × "13/05/2026") |
