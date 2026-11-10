# Corpus sintético de desdobro (etapa E2)

48 pacotes fictícios de **desdobro (D) na etapa de abertura**, gerados por código (`server/triage/corpus/`), com gabarito escrito à mão. Nenhum nome, matrícula, CPF ou documento real: as pessoas e os números são inventados, toda peça traz "DOCUMENTO FICTÍCIO PARA TESTE - SEM VALIDADE" e um teste confere que não há CPF nem CNPJ em nenhum arquivo.

Para ver os arquivos: `npm run triagem:corpus -- <pasta>` grava cada pacote numa pasta, com o `gabarito.json`, e um `indice.md`.

## Como o gabarito é feito

- **O que o arquivo é** (tipo real, extensão confere ou não, integridade, isolamento, classe documental, forma de leitura, campos impressos) vem da definição do pacote, nunca do detector ou do motor da triagem.
- **O que se espera das regras** segue a lógica do catálogo e as leituras registradas na reconciliação (R6, R9). Quando mais de uma saída é defensável, todas as aceitáveis são listadas. Exemplo: matrícula muito degradada aceita "sem achado" (se a leitura der certo) ou "não avaliável", **nunca** "achado de ausência". Regra sem expectativa num pacote não é afirmada.
- Os testes (`corpus.test.ts`) conferem as verdades do gabarito contra os bytes, com verificações independentes: assinatura de cada formato, texto dos PDFs (extração já existente), conteúdo dos DOCX e DXF, imagens nem em branco nem pretas, PDFs corrompidos e com senha recusados pelo leitor, hash e tamanho de cada arquivo, geração repetida com os mesmos bytes.

## Cobertura

| Categoria | Pacotes | Exemplos |
|---|---|---|
| completo | 6 | DSD-01 (texto + DXF), 02 (DWG), 03 (matrícula digitalizada), 04 (ficha em JPG), 44 (com GDU) |
| incompleto | 12 | sem requerimento (06), DRT 01 (07), matrícula (09), ficha (10), ART (11), CAD (12), prancha PDF (13), memorial (15), memorial só DOCX (14) |
| documento trocado | 2 | DRT 03 no lugar da DRT 01 (08), memorial de retificação (20) |
| campos divergentes | 5 | lote na ART (16), matrícula na prancha (17), quadra no memorial (18), datas prancha × memorial (19) |
| digitalizado / OCR difícil | 7 / 3 | ruído e inclinação (28), muito degradado (29), JPG girado 90° (30) |
| datas | 3 | data ambígua "03/04/26" (26), emissão meses antes do protocolo (27) |
| arquivo corrompido | 3 | PDF corrompido (31), com senha (32), vazio (33) |
| extensão falsa | 5 | JPG como .pdf (34), ZIP como .docx (35), texto como .dwg (36) |
| arquivo suspeito | 3 | executável como .pdf (37), ZIP com caminho "../" (38), RAR como .pdf (39) |
| limite de 2 ha | 6 | 1,99 / 2,00 / 2,01 ha sem confirmação (40–42); confirmado sem GDU (43), com GDU (44), confirmado falso (45) |
| formato | 7 | escala 1:500 (21), prancha A0 (22), ficha em PNG (05) |
| representação | 2 | terceiro sem procuração (24), procuradora com procuração (25) |
| assinatura | 2 | RT sem assinatura na prancha (23) e no memorial (48) |
| pacote parcial | 2 | só um DWG, integridade desconhecida (46, ensaio T21); pacote marcado parcial (47) |

Tipos de arquivo: 314 PDFs (texto, digitalizados, corrompido, com senha), 44 DXF, 2 DWG, 4 JPG, 1 PNG, 1 DOCX, 2 ZIP, 1 RAR, 1 vazio e 2 de conteúdo desconhecido (executável e texto).

Regras com expectativa: as 19 regras de documento aplicáveis a desdobro na abertura (001, 002, 003, 006, 008, 009, 010, 011, 012, 013, 016, 018, 019, 020, 021, 022, 023, 028, 043). As garantias 040 e 041 são testadas como invariantes do contrato; as hipóteses 045 e 047 nunca rodam.

## Limites conhecidos

- As peças imitam a lista de campos das fichas do dossiê, não os modelos oficiais (que não estão no repositório). Layout real, carimbo, quadro de áreas e desenho técnico não são reproduzidos.
- DWG tem só a assinatura de versão (`AC1032`) e corpo fictício; o DXF tem só textos e uma linha. Servem para reconhecer o tipo, não para interpretar desenho.
- A "assinatura" é um rabisco vetorial; não representa assinatura eletrônica nem permite verificar autoria.
- As expectativas de regra são leitura do AQR sobre o catálogo e dependem de homologação da GCA (ver `reconciliacao-catalogo-dossie.md`).
