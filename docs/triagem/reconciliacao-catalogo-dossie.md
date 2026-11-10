# Reconciliação: catálogo de regras × dossiê v1.5

Feita em 09/11/2026 (etapa E0 da triagem). Compara `catalogo/regras_aqr_gca.json` (versão `1.0-review`, corte 15/10/2026) com a seção 9 do `Dossie_Normativo_e_Operacional_da_GCA.docx` v1.5 (SHA-256 `96f640d4…f38465c`).

## Método

1. O texto do `.docx` foi lido diretamente do `word/document.xml` (parágrafos e tabelas, sem conversão de conteúdo).
2. Cada bloco `## AQR-GCA-…` / `## HYP-GCA-…` da seção 9 foi separado nos campos que o dossiê usa (estado, modalidades, etapa, severidade, confiança, pré-condição, insumos, extrações, lógica, resultado, revisão, exemplos, fundamentação). O resultado está em `catalogo/dossie-v1.5-secao9.json`.
3. Os campos foram comparados um a um com o JSON. O teste `server/triage/catalog/catalog.test.ts` refaz essa comparação a cada execução: se uma das duas fontes mudar, o teste falha.

Não foram comparados: o Anexo B (índice reverso fonte → regras) e as URLs completas das fontes, que o dossiê imprime só como identificador e página.

## Resultado

**IDs:** os mesmos 47 nos dois (`AQR-GCA-001` a `035`, `039` a `043`; `HYP-GCA-036` a `038`, `044` a `047`). Nenhum ausente, nenhum a mais.

**Conteúdo das regras:** nenhuma divergência em nome, modalidades, etapa, severidade, confiança, pré-condição, insumos, extrações, lógica, resultado, revisão humana, exemplos e fontes. Estado de habilitação concorda: as 40 "ATIVA COMO ALERTA" são `enabled: true` / `official-confirmed`; as 7 "HIPÓTESE DESATIVADA" são `enabled: false` / `hypothesis`.

**Diferenças só de apresentação** (não alteram a regra):
- Em `AQR-GCA-029`, `HYP-GCA-036`, `037`, `038` e `044`, o dossiê imprime também o arquivo de dentro do pacote ZIP (`archive_member` no JSON) depois de "→".
- O dossiê termina o campo "Revisão" com ponto final.

## Divergências registradas (não resolvidas por suposição)

| # | Divergência | Tratamento |
|---|---|---|
| R1 | **Versão:** o catálogo é `1.0-review` com corte em 15/10/2026; o dossiê é v1.5, com revisões até 29/10/2026. A seção 9 diz que o JSON "contém" as regras, mas não informa a versão do JSON correspondente à v1.5. | Conteúdo idêntico, então o catálogo `1.0-review` é usado. Confirmar com o responsável pelo dossiê se há JSON mais novo. |
| R2 | **Vocabulário de estado:** o dossiê diz "ATIVA COMO ALERTA" e "HIPÓTESE DESATIVADA"; o JSON diz `official-confirmed` e `hypothesis`. Pela escala de certeza do dossiê (seção 1), "confirmado oficialmente" significa texto encontrado em fonte oficial e **não** certifica procedimento atual. | O contrato separa `status` (origem da regra) de `homologacao` (ato da GCA). Todas as regras estão `nao-homologada`. |
| R3 | **Etapas fora do par abertura/análise:** `abertura ou análise` (017, 021), `todas` (040, 041), `pós-análise` (039) e `pós-decisão` (042). | O contrato aceita as etapas `abertura`, `analise`, `pos-analise` e `pos-decisao`; "abertura ou análise" vira as duas; "todas" vira as quatro. "Pós-análise" e "pós-decisão" ficam separadas: o dossiê não diz que são a mesma coisa. |
| R4 | **Severidade `critical`** (039, 040, 041) e **`none`** (HYP-047): a seção 9 não define a escala. | Aceitas como estão. Severidade é "do alerta, não pena" (seção 9). |
| R5 | **Modalidades além do parcelamento:** `CERT-MED`, `CERT-LOG-NEW`, `CERT-NUM` (certidões da DCC) e `REURB-E` (só em hipóteses e nas garantias 040/041). | Aceitas no contrato. Nenhuma está no escopo do MVP. |
| R6 | **Pré-condições em texto livre:** 12 regras dependem de algo "confirmado", "registrado" ou "examinado" por servidor, mas o JSON não tem campo estruturado para isso. | `catalogo/condicoes-humanas.json` liga cada uma a identificadores de condição, citando a pré-condição literalmente. Para 033, 034 e 035 ("tipologia … confirmada"), a seção 6.8 admite tipologia "extraída com confiança **ou** confirmada pelo responsável humano"; o AQR adota a leitura mais restritiva (exige servidor) até a GCA dizer o contrário. |
| R7 | **040 e 041 não verificam documento:** "Sem decisão automática" e "Proteção de dados na evidência" valem para todo o sistema. | Tratadas como garantias: viram invariantes do contrato (texto de alerta não pode conter palavras de decisão) e regras de privacidade, não avaliações de anexo. |
| R8 | **IDs de ensaio:** T27–T38 aparecem no Anexo E do dossiê de forma resumida e no JSON complementar com detalhe; T39–T72 só no JSON. | Mesmos casos (conferido pelo título). `casos/dossie-v1.5-ensaios.json` registra a origem de cada um. |
| R9 | **Pacote parcial:** T21 (Anexo C.5) manda **não** apontar falta de requerimento ou matrícula quando a integralidade dos anexos não foi confirmada; T02 e T03 apontam faltas em pacotes de protocolo. | O contrato tem `integridadeDoPacote` (`completo`, `parcial`, `desconhecida`, valores do Anexo C.4). Regra de presença só aponta "não localizado nos anexos recebidos" com pacote confirmado como completo; caso contrário, "não avaliável". **Leitura do AQR, a validar pela GCA.** |

## Classificação das 47 regras

- **A — alerta técnico testável (29):** ativa, fundada em fonte oficial e sem pré-condição humana. Pode ser implementada e testada com casos sintéticos **como alerta para revisão**.
- **B — alerta condicionado (9):** ativa, mas só roda depois que um servidor confirma a condição (`condicoes-humanas.json`). Sem a confirmação, o resultado é "condição pendente".
- **C — hipótese desativada (7):** nunca roda. Depende de ato ou instrução escrita da GCA.
- **D — garantia do sistema (2):** 040 e 041, aplicadas como invariantes.

**Nenhuma regra é homologada institucionalmente.** Tudo depende, para uso real, de homologação da GCA (dossiê, seções 1, 13 e 14).

| Regra | Nome | Modalidades | Etapa | Severidade | Classe | Desdobro na abertura |
|---|---|---|---|---|---|---|
| AQR-GCA-001 | Assunto reconhecível | todas as de parcelamento | abertura | review | A — alerta técnico testável | sim |
| AQR-GCA-002 | Requerimento presente | todas as de parcelamento | abertura | major | A — alerta técnico testável | sim |
| AQR-GCA-003 | DRT 01 correta | R, D, DM, R/D, D/R | abertura | major | A — alerta técnico testável | sim |
| AQR-GCA-004 | DRT 03 correta | RET | abertura | major | A — alerta técnico testável |  |
| AQR-GCA-005 | DRT 02 de projeto | L1, L2, L3, L4, L6, L7 | abertura | major | A — alerta técnico testável |  |
| AQR-GCA-006 | Documento de inscrição imobiliária | R, D, DM, R/D, D/R, RET | abertura | major | A — alerta técnico testável | sim |
| AQR-GCA-007 | Ficha cadastral de loteamento | L1, L2, L3, L4, L6, L7 | abertura | major | A — alerta técnico testável |  |
| AQR-GCA-008 | Título registral presente | todas as de parcelamento | abertura | major | A — alerta técnico testável | sim |
| AQR-GCA-009 | Data do título registral para revisão | todas as de parcelamento | abertura | review | A — alerta técnico testável | sim |
| AQR-GCA-010 | Prova de representação condicional | todas as de parcelamento | abertura | review | A — alerta técnico testável | sim |
| AQR-GCA-011 | ART RRT ou similar de projeto | todas as de parcelamento | abertura | major | A — alerta técnico testável | sim |
| AQR-GCA-012 | Planta e CAD para R D DM RET | R, D, DM, R/D, D/R, RET | abertura | major | A — alerta técnico testável | sim |
| AQR-GCA-013 | Memorial PDF para R D DM RET | R, D, DM, R/D, D/R, RET | abertura | major | A — alerta técnico testável | sim |
| AQR-GCA-014 | Prancha CAD de loteamento | L1, L2, L3, L4, L6, L7 | abertura | major | A — alerta técnico testável |  |
| AQR-GCA-015 | GDU ou GDR de loteamento | L1, L2, L3, L4, L6, L7 | abertura | major | A — alerta técnico testável |  |
| AQR-GCA-016 | Assinatura do RT nas peças | todas as de parcelamento | abertura | review | A — alerta técnico testável | sim |
| AQR-GCA-017 | Assinatura do titular em loteamento | L1, L2, L3, L4, L6, L7 | abertura ou análise | review | A — alerta técnico testável |  |
| AQR-GCA-018 | Campos da ART RRT coerentes | todas as de parcelamento | abertura | review | A — alerta técnico testável | sim |
| AQR-GCA-019 | Assunto consistente | todas as de parcelamento | abertura | review | A — alerta técnico testável | sim |
| AQR-GCA-020 | Identidade do imóvel consistente | todas as de parcelamento | abertura | review | A — alerta técnico testável | sim |
| AQR-GCA-021 | Datas de revisão planta memorial | todas as de parcelamento | abertura ou análise | minor | A — alerta técnico testável | sim |
| AQR-GCA-022 | Escala da situação | todas as de parcelamento | abertura | review | A — alerta técnico testável | sim |
| AQR-GCA-023 | Carimbo e formato da prancha | todas as de parcelamento | abertura | review | A — alerta técnico testável | sim |
| AQR-GCA-024 | Memorial na etapa de loteamento | L1, L2, L3, L4, L6, L7 | análise | major | B — alerta condicionado a confirmação humana |  |
| AQR-GCA-025 | Planilha áreas na análise de loteamento | L1, L2, L3, L4, L6, L7 | análise | major | A — alerta técnico testável |  |
| AQR-GCA-026 | DRT implantação de loteamento | L1, L2, L3, L4, L6, L7 | análise | major | A — alerta técnico testável |  |
| AQR-GCA-027 | ART implantação por RT distinto | L1, L2, L3, L4, L6, L7 | análise | review | A — alerta técnico testável |  |
| AQR-GCA-028 | GDU desdobro maior que dois hectares | D, R/D, D/R | abertura | review | B — alerta condicionado a confirmação humana | sim |
| AQR-GCA-029 | GDU do desmembramento por gatilho legal | DM | abertura | review | B — alerta condicionado a confirmação humana |  |
| AQR-GCA-030 | ZEIA levantamento na etapa | todas as de parcelamento | análise | review | B — alerta condicionado a confirmação humana |  |
| AQR-GCA-031 | Licenças LP LI na análise de loteamento | L1, L2, L3, L4, L6, L7 | análise | review | A — alerta técnico testável |  |
| AQR-GCA-032 | Projetos complementares por tipo | L1, L2, L3, L4, L6, L7 | análise | review | A — alerta técnico testável |  |
| AQR-GCA-033 | L2 documentos habitacionais | L2 | análise | review | B — alerta condicionado a confirmação humana |  |
| AQR-GCA-034 | L3 L7 administração registrada | L3, L7 | análise | review | B — alerta condicionado a confirmação humana |  |
| AQR-GCA-035 | L6 L7 anuência INCRA | L6, L7 | análise | review | B — alerta condicionado a confirmação humana |  |
| HYP-GCA-036 | Certidão de medidas documentos | CERT-MED | abertura | review | C — hipótese desativada |  |
| HYP-GCA-037 | Certidão novo loteamento documentos | CERT-LOG-NEW | abertura | review | C — hipótese desativada |  |
| HYP-GCA-038 | Número predial substituição título IPTU | CERT-NUM | abertura | minor | C — hipótese desativada |  |
| AQR-GCA-039 | Retificação saída anuência | RET | pós-análise | critical | B — alerta condicionado a confirmação humana |  |
| AQR-GCA-040 | Sem decisão automática | todas as de parcelamento e certidões | todas | critical | D — garantia do sistema | sim |
| AQR-GCA-041 | Proteção de dados na evidência | todas as de parcelamento e certidões | todas | critical | D — garantia do sistema | sim |
| AQR-GCA-042 | Nota devolutiva sem mudança técnica | R, D, DM, R/D, D/R, RET | pós-decisão | review | B — alerta condicionado a confirmação humana |  |
| AQR-GCA-043 | Validação de formato do arquivo | R, D, DM, R/D, D/R, RET | abertura | minor | A — alerta técnico testável | sim |
| HYP-GCA-044 | Representação de processo REURB E | REURB-E | abertura | review | C — hipótese desativada |  |
| HYP-GCA-045 | Fila SAP GCA sem com GDU | todas as de parcelamento | abertura | review | C — hipótese desativada | sim |
| HYP-GCA-046 | PDF da prancha em loteamento digital | L1, L2, L3, L4, L6, L7 | abertura | review | C — hipótese desativada |  |
| HYP-GCA-047 | Nomenclatura de arquivos GCA | todas as de parcelamento | abertura | none | C — hipótese desativada | sim |

### Escopo do MVP (desdobro, abertura)

23 regras se aplicam a desdobro na abertura: **18 da classe A** (001, 002, 003, 006, 008, 009, 010, 011, 012, 013, 016, 018, 019, 020, 021, 022, 023, 043), **1 da classe B** (028, que depende de servidor confirmar área acima de 2 ha), **2 garantias** (040, 041) e **2 hipóteses que não rodam** (045, 047).

### O que depende de decisão institucional

- Homologação de qualquer regra (nenhuma está homologada).
- As 7 hipóteses.
- As condições das 9 regras da classe B, a cada processo.
- R1 (versão do catálogo), R6 (tipologia por extração ou só por servidor) e R9 (presença com pacote não confirmado).
- Perguntas 2 (limiar de 2 ha), 5 (contagem de 30 dias), 8 (formatos de arquivo) e 9 (assinatura e quitação) da seção 13 do dossiê, que afetam as regras 009, 012, 013, 016, 018, 023, 028 e 043 no desdobro.
