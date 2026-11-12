# Relatório de estabilização da triagem (E4–E6) — 11/11/2026

Rodada curta de estabilização e auditoria das etapas E4–E6, antes da E7. Tudo foi feito na branch `dev`, em commits locais separados, **sem push**. O `AGENTS.md` não foi tocado, e a E7–E10 não foi iniciada.

## Commits desta rodada

| Commit | O que faz |
|---|---|
| `b970d0b` | Retira o critério de contagem de prazo da regra 009 |
| `0893244` | Confere os formatos de folha da regra 023 no TR 002 |
| `c2dc54b` | Impede resultado conclusivo com extração incerta, vários imóveis ou composto não resolvido |
| `d5d9088` | Congela o gabarito do conjunto independente (antes de qualquer execução) |
| `4be2970` | Mede a triagem no conjunto independente e audita as 19 regras |
| `264a000` | Impede apontar ausência quando há anexo sem classe com indício do documento (defeito de segurança) |

A `dev` está 10 commits à frente do GitHub: 3 da E4–E6, 6 desta rodada e o deste relatório (`d3fff7c` ou o seguinte).

## 1. Regra AQR-GCA-009 (data do título)

- **Antes:** intervalos de até 29 dias corridos entre a emissão e o protocolo davam "sem achado". Isso era um critério de contagem que o dossiê não autoriza (pergunta 5).
- **Agora:** a regra registra a data de emissão, o instante do protocolo e o intervalo aparente em dias corridos, e **sempre** encaminha a avaliação temporal ao servidor (alerta "condição indeterminada"). Não há limiar e o texto nunca fala em validade ou vencimento. Com data ambígua ("28/10/26"), o intervalo não é calculado; sem data legível, a regra fica "não avaliável".
- **Custo:** um alerta de conferência por processo, até a GCA definir a contagem.

## 2. Regra AQR-GCA-023 (formato da folha)

- **Conferência na fonte:** baixei a cópia pública oficial do TR 002 e conferi que o SHA-256 (`a13d7b54…`) é idêntico ao do inventário de fontes. Na p. 4, item VII, o TR diz *"Uma (01) via do projeto podendo ser em prancha A-3, A-2 ou A-1"*. É a mesma fonte que o catálogo cita para a regra (S07 p.4 VII).
- **Por que A1/A2 estavam "não avaliáveis":** eu não tinha conferido o TR e usava só os exemplos do catálogo (A3 positivo, A0 negativo). Foi falha minha de verificação, não falta de fonte.
- **Agora:** A3, A2 e A1 são aceitos para R, D, DM, R/D e D/R, e outro formato declarado gera alerta.
- **Abstenção preservada:**
  - a regra só conclui com o formato declarado na prancha e consistente com o tamanho da página;
  - sem declaração, ou com declaração diferente da medida do arquivo, fica "não avaliável";
  - página digitalizada não é medida;
  - modalidades de outros TR ficam "não avaliável".
- **Testes:**
  - positivos: A3, A2, A1;
  - negativo: A0;
  - abstenção: sem formato, formato inconsistente, modalidade RET;
  - citação conferida contra o inventário.

## 3. Política de abstenção (item 4 do pedido)

- **Extração ambígua:** campo com valor ambíguo, ilegível, com vários valores ou com pouca confiança não sustenta "sem achado" nas comparações (018, 019, 020, 021) nem na escala (022). Divergência entre valores seguros continua sendo apontada.
- **Um imóvel por pacote:** com indício de vários imóveis (requerimento com vários lotes ou matrículas, ou títulos com números diferentes), as regras 006, 008, 018 e 020 ficam "não avaliável". A ausência total do documento continua sendo apontada.
- **Documento composto:** PDF com mais de um documento e alguma página sem classe impede apontar documento "não localizado". Composto resolvido (cada página com título próprio) conta como presença, com limitação registrada; nunca é dividido.
- **Anexo sem classe com indício** (correção de segurança, `264a000`): impede concluir ausência.
- **Auditoria em teste, nos três conjuntos:**
  - todo pacote tem as 19 regras, cada uma com versão (hash do catálogo), fundamento normativo e revisão humana;
  - todo achado tem tipo e evidência ou lista de anexos procurados;
  - todo "não avaliável" tem motivo;
  - nenhum resultado conclusivo usa campo ambíguo;
  - nenhuma presença se apoia só em composto não resolvido.

## 4. Conjunto independente

- **Conteúdo:** 16 pacotes novos (IND-01 a 16, 126 arquivos) com formulários, terminologia e formatação que não aparecem nos outros conjuntos:
  - título do TR 002 no requerimento; "Nº da Matrícula", "Insc. Imobiliária", "Loteamento", "Lt./Qd.", "Requerente", "RT:";
  - "Revisão 01 - data", "ESC.", extrato de débitos, substabelecimento;
  - planta sem "prancha/planta" no título;
  - OCR com ruído, ART em JPG, memorial muito degradado;
  - dois documentos no mesmo PDF;
  - duas matrículas, A2 e 1:5.000.
- **Congelamento:** o gabarito foi escrito à mão, gravado em `docs/triagem/casos/independente-gabarito.json` (SHA-256 `f8d0bd95…`) e **commitado antes da primeira execução**. Um teste falha se ele mudar.
- **Limite honesto:** o autor do conjunto é o mesmo do motor.

## 5. Métricas

### Medida oficial: primeira execução

A cópia congelada está em `avaliacao-independente-primeira-execucao.md`.

| Conjunto | Anexos | Classe certa | Classe errada | Abstenção de classe | Campos certos | Valor errado aceito | Normalização errada |
|---|---:|---:|---:|---:|---:|---:|---:|
| Desenvolvimento (DSD) | 372 | 370 | 0 | 2 | 2565 de 2583 | 0 | 0 |
| Validação usada nos ajustes (VAL) | 128 | 127 | 0 | 1 | 705 de 740 | 0 | 0 |
| Independente congelado (IND) | 126 | 124 | 0 | 2 | 634 de 749 | 0 | 0 |

| Conjunto | Expectativas de regra | Aceitas | Falsos alertas | Achados não detectados | Abstenções indevidas | Tipo de achado diferente | Não avaliáveis (total) | Abstenções aceitas | Condição pendente |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Desenvolvimento (DSD) | 821 | 821 | 0 | 0 | 0 | 0 | 22 | 22 | 44 |
| Validação usada nos ajustes (VAL) | 144 | 143 | 1 | 0 | 0 | 0 | 3 | 3 | 15 |
| Independente congelado (IND) | 288 | 270 | 1 | 1 | 16 | 0 | 23 | 6 | 15 |

Como ler as colunas:
- **falso alerta:** achado onde o gabarito não aceita achado;
- **achado não detectado:** o gabarito só aceita achado e o motor deu outra coisa;
- **abstenção indevida:** "não avaliável" ou pendente onde o gabarito não aceita;
- **não avaliáveis (total):** todas as avaliações "não avaliável", aceitas ou não.

O 100% do desenvolvimento não mede generalização: as regras foram escritas olhando esse conjunto.

### Depois da correção de segurança

Esta linha **não** é mais medida independente.

| Conjunto | Expectativas | Aceitas | Falsos alertas | Achados não detectados | Abstenções indevidas | Não avaliáveis (total) |
|---|---:|---:|---:|---:|---:|---:|
| Independente (IND), depois de `264a000` | 288 | 270 | 0 | 1 | 17 | 24 |

### Falhas no independente e origem

1. **IND-14, falso alerta da 012 (origem: classificação). Corrigido.** Uma planta intitulada "PROJETO DE DESDOBRO - FOLHA 01/01" ficou sem classe, e a regra apontou a prancha como não localizada com ela presente. Era um defeito de segurança. Agora vira abstenção; as regras 022 e 023 também ficam "não avaliável".
2. **Regra 021, 14 abstenções (origem: extração).** "Revisão 01 - 30/10/2026" não é reconhecido como data de revisão. É conservador. Não corrigi, para não ajustar o motor ao conjunto que mede generalização.
3. **IND-11 · 008, achado não detectado (origem: política de vários imóveis).** O requerimento declara duas matrículas e há uma só certidão. O dossiê (ensaio T03) pede alerta, e a regra se absteve. É abstenção excessiva, não conclusão errada. Fica como pendência.
4. **IND-15, memorial muito degradado (OCR 17):** fica sem classe, como o gabarito aceita.

## 6. Falso alerta VAL-13 (causa)

O requerimento traz "Objeto do pedido: Desdobro". O extrator só reconhece "Assunto:", então o campo fica "não encontrado" num anexo bem lido. A regra 001 segue o catálogo ("assunto ausente → modalidade indeterminada") e pede classificação ao servidor.

A origem é o vocabulário da extração, não a regra. O efeito é conservador: um pedido de revisão, nunca uma conclusão de irregularidade. Mantive o rótulo fora de propósito.

## 7. Os 4 testes pulados

São os 4 casos de `server/comparison/evaluation/corpus.test.ts` regravados pelo Ghostscript: `02-palavra-modificada`, `24-tabela`, `25-multiplas-colunas` e `29-cabecalho-rodape`. Pertencem à **comparação de PDFs**, não à triagem.

São pulados porque o `gs` não está instalado nesta máquina (`it.skipIf(!hasTool('gs'))`). Os 4 equivalentes com o Cairo rodam. Devem continuar condicionais, porque dependem de ferramenta externa opcional. Para executá-los: `brew install ghostscript`. Não instalei, porque é mudança no sistema.

## 8. Verificação final

- `npm run lint`: sem erros.
- `npm run typecheck`: sem erros.
- `npm test`: **568 passaram, 4 pulados** (os do Ghostscript), 69 arquivos. A rodada anterior terminou com 554.
- `npm run build`: concluído.
- `npm run triagem:avaliar`: relatório em `docs/triagem/avaliacao-e4-e6.md`.

## 9. Bloqueios antes da E7

**Nenhum bloqueio técnico** impede a E7 (persistência, API e revisão humana). O resultado já sai no contrato `ProcessoTriagem`, com as garantias 040/041 testadas.

Pendências recomendadas, que dependem de nova instrução:
1. Vocabulário de "Revisão nº - data" e de prancha sem "prancha/planta" no título. É abstenção excessiva e, depois de corrigido, precisa ser medido com um novo conjunto independente.
2. Vários imóveis: alertar quando há mais matrículas declaradas que títulos (ensaio T03).
3. Institucionais:
   - homologação das regras pela GCA;
   - perguntas 2, 5, 8 e 9 do dossiê;
   - divergências R1, R6 e R9;
   - tabelas de formato do TR 001 e do TR 003;
   - validação com documentos reais anonimizados, se autorizada.
