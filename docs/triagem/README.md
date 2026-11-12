# Triagem documental: especificações versionadas

Esta pasta guarda, sob controle de versão, o que a triagem assistida do AQR usa como especificação: o catálogo de regras, o registro de homologação, as condições que dependem de servidor e os casos sintéticos. Nada aqui é dado de requerente real.

**Estado institucional:** o dossiê v1.5 está "em preparação para validação institucional". Nenhuma regra foi homologada pela GCA (`catalogo/homologacoes.json` está vazio). Regra extraída de fonte oficial é **alerta para revisão de servidor**, nunca decisão.

## Conteúdo

| Arquivo | O que é | Origem |
|---|---|---|
| `catalogo/regras_aqr_gca.json` | Catálogo de 47 regras (40 ativas como alerta, 7 hipóteses desativadas), versão `1.0-review`, corte 15/10/2026. **Cópia sem alteração.** | Artefatos do dossiê |
| `catalogo/dossie-v1.5-secao9.json` | As 47 regras como aparecem na seção 9 do dossiê v1.5, extraídas campo a campo (texto sem alteração), para conferir o catálogo. | Extraído do `.docx` |
| `catalogo/condicoes-humanas.json` | Regras ativas cuja pré-condição exige confirmação humana, com a pré-condição citada literalmente. O carregador recusa o catálogo se o texto do catálogo mudar. | Curadoria AQR (ver reconciliação) |
| `catalogo/homologacoes.json` | Registro de homologação institucional por regra. Vazio. | AQR |
| `casos/casos_sinteticos_complementares_aqr.json` | 46 casos fictícios complementares (T27–T72), versão `1.5-r2`, `contains_real_applicant_data: false`. **Cópia sem alteração.** | Artefatos do dossiê |
| `casos/dossie-v1.5-ensaios.json` | Ensaios T01–T38 das tabelas do dossiê (seção 12, Anexo C.5, Anexo E), texto sem alteração. | Extraído do `.docx` |
| `fontes/inventario_fontes.json` | Inventário das fontes oficiais públicas (URL, hash, páginas). **Cópia sem alteração.** | Artefatos do dossiê |
| `casos/independente-gabarito.json` | Gabarito **congelado** do conjunto independente IND-01 a 16 (SHA-256 `f8d0bd9562f9ff41fc2ca3920433fbc5ff121c896c7357755677a7e627fe5f05`), gravado e commitado antes da primeira execução do motor. Não editar. | AQR |
| `e4-e6.md` | Arquitetura, resultados, defeitos corrigidos e limitações da classificação, da extração e do motor (E4–E6). | AQR |
| `avaliacao-e4-e6.md` | Métricas da triagem experimental nos conjuntos de desenvolvimento e validação. **Gerado** por `npm run triagem:avaliar`. | AQR |
| `reconciliacao-catalogo-dossie.md` | Comparação catálogo × dossiê, divergências e classificação das 47 regras. | AQR |

## Hashes de origem (SHA-256)

| Arquivo de origem | Versão | SHA-256 | No repositório? |
|---|---|---|---|
| `Dossie_Normativo_e_Operacional_da_GCA.docx` | 1.5 | `96f640d4f8439e1d449037ebfea37b495f72ad4b744d6a3ca54909115f38465c` | **Não**: os anexos D a K descrevem o acervo privado da GCA (Drive). Só os trechos normativos e os ensaios foram extraídos. |
| `regras_aqr_gca.json` | 1.0-review | `fd9b3e3b9db5d16685798f80f64932ceb91dae3f4a4253cda60fe3f966c419eb` | Sim, idêntico |
| `casos_sinteticos_complementares_aqr.json` | 1.5-r2 | `33b6f6c062e9b3a9bb034f8f2a8d443f6962f1a504c889d72276178c73cd36db` | Sim, idêntico |
| `inventario_fontes.json` | corte 15/10/2026 | `dc725e3863d70e6459c4d656a9617986e1f36225a42a8d543da2ccaa003e72dc` | Sim, idêntico |
| `controles_tecnicos_propostos_aqr.json` | — | `68dd7b321b20b77d23c77f4e862f0ffdbd7a2cce79e8778a60defb56ea58ca0b` | **Não**: cita o acervo privado (planilha, pasta do Drive). |
| `Dossie_Normativo_e_Operacional_da_GCA.md` | 1.5 | `13563f4655b579a87ffb29b0fb0dd35639c5cdabd9cae5fa02a628e88e1ac081` | **Não**: mesma razão do `.docx`. |

Os arquivos de origem estavam em `~/Dossie_Normativo_e_Operacional_da_GCA.docx` (idêntico ao de `~/Downloads`) e em `~/.codex/.chatgpt-projects/…/artefatos/`. O teste `server/triage/catalog/catalog.test.ts` confere os hashes das cópias e a concordância catálogo × seção 9.

## Regras de manutenção

- Arquivo copiado não é editado. Nova versão do catálogo entra como arquivo novo, com hash e data, e a reconciliação é refeita.
- Mudança de norma gera nova versão da regra, nunca substituição silenciosa (dossiê, seção 9).
- Hipótese (`HYP-…`) só deixa de ser hipótese com ato ou instrução escrita da GCA.
- Homologação só entra em `homologacoes.json` com ato, data e responsável.
