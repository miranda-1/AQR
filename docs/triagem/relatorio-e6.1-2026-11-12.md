# Relatório da publicação da dev e da E6.1, 12/11/2026

## 1. Publicação da `dev`

**Feito:** push dos 10 commits locais para a branch `dev` (`87da286..bde806b`), sem force push, sem release e sem tocar a `master` (que continua em `62a02e0`).

**Antes do envio:**
- **Diff e histórico:** 39 arquivos, todos da triagem (código, testes, documentação e gabaritos sintéticos).
- **Segredos e dados privados:** nenhuma senha, token, chave, e-mail ou caminho privado no diff. As duas ocorrências de "CPF" são o número fictício `123.456.789-09`, usado em teste para provar o mascaramento. `AGENTS.md` e o dossiê privado ficaram de fora.
- **Implantação:** o repositório não tem workflow de CI, webhook nem implantação registrada, e o último commit da `dev` não tinha verificações. A publicação na Cloudflare é da `master`, feita pelo terminal (`docs/hospedagem-cloudflare.md`, na `master`). O push da `dev` não dispara implantação.

**Os commits da E6.1 estão só na máquina** (ver item 7). O push autorizado cobria os 10 commits anteriores.

## 2. Defeitos corrigidos na E6.1

| Defeito (origem) | Correção | Teste |
|---|---|---|
| A regra 021 se abstinha quando a planta trazia "Revisão 01 - data" (14 casos no IND). A extração só aceitava "Revisão:" ou "Data:". | **Padrão de família**, não lista de textos: a palavra "revisão", "rev." ou "data", até 25 caracteres sem algarismo, um número de revisão opcional e a data. Reconhece "Revisão 01 - data", "Rev. 02 – data", "REVISÃO: 2 (data)", "Revisão nº 3 de data" e "Data da revisão:". Tabela com datas diferentes continua "vários valores" e a regra não escolhe a vigente. | `extract.test.ts` |
| Planta sem "prancha/planta" no título ficava sem classe (IND-14). Daí vinham abstenções nas regras 012, 022 e 023 e, antes da correção de 11/11, um falso "prancha não localizada". | **Prancha pela estrutura:** folha maior que A4, pelo menos dois sinais distintos de prancha no corpo e nenhum título de outra classe. A confiança fica média e a justificativa diz "estrutura de prancha". Folha grande com um sinal só, ou folha A4, continua sem classe. Os sinais de escala e de formato aceitam "Esc." e "Formato:/Folha". | `classify.test.ts`, com exemplos próprios, não os do IND |
| Vários imóveis desativavam as regras 006, 008, 018 e 020; no IND-11, a falta do segundo título não era apontada (ensaio T03 do dossiê). | **Mapa de imóveis** (`engine/imoveis.ts`): matrículas e lotes declarados no requerimento, cada um como impresso e com a evidência da própria ocorrência, ligados a títulos e inscrições pelo número normalizado. 008/006 apontam a declaração sem documento correspondente só com pacote completo confirmado e números lidos com segurança. 020 compara a identidade imóvel a imóvel. 018 confere se lote e matrícula da ART/RRT estão na lista declarada. Nada sobre propriedade, cadeia dominial ou validade registral. | `engine.test.ts` (4 casos) |

**Preservado:**
- regras versionadas com o hash do catálogo;
- hipóteses 045/047 desativadas;
- regra 028 condicionada à confirmação do servidor;
- garantias 040/041 (sem decisão, comunicação bloqueada, dados minimizados);
- política de abstenção para leitura incerta, pacote parcial e composto não resolvido.

Nenhum teste antigo foi afrouxado. A auditoria das 19 regras ganhou uma exceção documentada: no requerimento, várias matrículas ou lotes são lista de imóveis, não leitura ambígua.

## 3. Métricas

### Regras

| Conjunto | Expectativas | Aceitas | Falsos alertas | Achados não detectados | Abstenções indevidas | Tipo de achado diferente | Não avaliáveis (total) | Abstenções aceitas | Condição pendente |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Desenvolvimento (DSD) | 821 | 821 | 0 | 0 | 0 | 0 | 22 | 22 | 44 |
| Validação usada nos ajustes (VAL) | 144 | 143 | 1 | 0 | 0 | 0 | 3 | 3 | 15 |
| IND, primeira execução (original, 11/11) | 288 | 270 | 1 | 1 | 16 | 0 | 23 | 6 | 15 |
| IND, depois das correções da E6.1 | 288 | 288 | 0 | 0 | 0 | 0 | 4 | 4 | 15 |
| **NOV, primeira execução (novo conjunto)** | 291 | 290 | **0** | **0** | 1 | 0 | 8 | 7 | 16 |

### Classificação e campos

| Conjunto | Anexos | Classe certa | Classe errada | Abstenção de classe | Campos certos | Valor errado aceito | Normalização errada |
|---|---:|---:|---:|---:|---:|---:|---:|
| Desenvolvimento (DSD) | 372 | 370 | 0 | 2 | 2565 de 2583 | 0 | 0 |
| Validação (VAL) | 128 | 127 | 0 | 1 | 705 de 740 | 0 | 0 |
| IND, primeira execução | 126 | 124 | 0 | 2 | 634 de 749 | 0 | 0 |
| IND, depois da E6.1 | 126 | 125 | 0 | 1 | 653 de 749 | 0 | 0 |
| **NOV, primeira execução** | 130 | 129 | 0 | 1 | 738 de 749 | 0 | 0 |

**Como ler.** O 100% do desenvolvimento e o 288/288 do IND corrigido **não** medem generalização: as regras e as correções foram feitas olhando esses conjuntos. A medida da E6.1 é a primeira execução do NOV.

## 4. Nova avaliação independente (NOV)

**Conteúdo:** 16 pacotes e 130 arquivos (`server/triage/corpus/novo.ts`), com outra estrutura, linguagem e formatação:
- rótulos com travessão e campos em linha separados por barras;
- revisões em três formatos novos, data de revisão ambígua e tabela de revisões;
- certidão vintenária, espelho cadastral e RRT;
- prancha A2 sem título de classe;
- dois imóveis: completos, sem o segundo título (pacote completo e parcial) e sem a segunda inscrição;
- JPG girado 90°, certidão digitalizada com ruído;
- DRT e RRT no mesmo PDF;
- matrícula divergente e integridade desconhecida.

**Congelamento:** o gabarito foi escrito à mão, gravado em `docs/triagem/casos/novo-gabarito.json` (SHA-256 `35326fc748e1ac9baafe557a03b4092010acfd7df29ea4c3ce48898d9c73ed7b`) e commitado (`cf9d261`) **antes** da primeira execução. Um teste falha se ele mudar. O resultado da primeira tentativa está em `docs/triagem/avaliacao-novo-primeira-execucao.md`, que não é regenerado. Nada foi ajustado depois.

**Resultado:**
- Confirmado, sem ajuste:
  - as revisões nos três formatos, com coincidência e divergência;
  - abstenção na data ambígua e na tabela de revisões;
  - a prancha A2 reconhecida pela estrutura;
  - os quatro cenários de vários imóveis (sem achado, lacuna de título, lacuna de inscrição e pacote parcial não avaliável);
  - a matrícula divergente;
  - o PDF composto notado.
- **Única falha, NOV-11 · 018 (abstenção indevida):** o requerimento em JPG girado teve o lote "22" lido **certo**, mas com confiança de OCR 64, o que dá 0,58 no campo, abaixo do mínimo de 0,6 para comparação. A regra não concluiu. É a política de abstenção agindo sobre OCR médio. O avaliador atribuiu a origem a "regra", mas a origem real é a confiança do OCR.
- **Abstenção de classe, NOV-10:** a certidão com ruído teve OCR 50; o gabarito aceita "não avaliável".

## 5. Limitações restantes

- **Vocabulário:** rótulos com travessão e campos sem dois-pontos só são lidos onde o padrão de expressão alcança (lote, quadra, matrícula). Assunto, titular e bairro nesse formato não são lidos. O efeito é abstenção ou alerta de revisão, nunca valor errado.
- **Limiar de comparação 0,6:** é conservador e não foi calibrado com documentos reais. Campo certo lido por OCR médio pode ficar de fora (NOV-11).
- **Prancha pela estrutura:** depende da folha maior que A4. Planta impressa em A4, ou digitalizada, sem título de classe continua sem classe; nesse caso a ausência não é concluída.
- **Vários imóveis:** a ligação é só pelo número normalizado. Grafias diferentes ("22-A" × "22A") não ligam. Peça que cita mais de um imóvel não entra na comparação por imóvel.
- **Os dois conjuntos independentes** foram escritos pelo mesmo autor do motor. O congelamento impede ajuste posterior, não o conhecimento prévio.
- **Institucionais, sem mudança:**
  - homologação das regras pela GCA;
  - perguntas 2, 5, 8 e 9 do dossiê;
  - divergências R1, R6 e R9;
  - tabelas de formato do TR 001 e do TR 003;
  - validação com documentos reais anonimizados, se autorizada.

Os 4 testes pulados continuam os do Ghostscript (comparação de PDFs); o `gs` não está instalado nesta máquina.

## 6. Arquivos

**Novos:**
- `server/triage/engine/imoveis.ts`: mapa de imóveis e correspondência declarado × documento;
- `server/triage/corpus/novo.ts` e `novo.test.ts`: conjunto NOV e congelamento;
- `docs/triagem/casos/novo-gabarito.json`: gabarito congelado;
- `docs/triagem/avaliacao-novo-primeira-execucao.md`: primeira execução, congelada;
- este relatório.

**Modificados:**
- `server/triage/extraction/extract.ts`: data de revisão por família de rótulo;
- `server/triage/classification/classify.ts` e `signals.ts`: prancha pela estrutura, sinais de escala e de formato;
- `server/triage/engine/rules.ts`: regras 006, 008, 018 e 020 com o mapa de imóveis;
- `server/triage/evaluation/casos.ts`, `report.ts` e `avaliacao.test.ts`: quarto conjunto e exceção da auditoria;
- testes de extração, classificação e motor;
- `docs/triagem/e4-e6.md`, `README.md`, `avaliacao-e4-e6.md` e `docs/CONTEXTO.md`.

## 7. Commits da E6.1 (locais, sem push)

| Commit | O que faz |
|---|---|
| `d77ddec` | Revisão por família de rótulo, prancha pela estrutura e vários imóveis |
| `cf9d261` | Congela o gabarito do segundo conjunto independente (NOV), antes da execução |
| `3c5d2ea` | Mede a E6.1 no NOV (primeira execução registrada) |
| o commit deste relatório | Registra este relatório |

## 8. Verificação

- `npm run lint`: sem erros.
- `npm run typecheck`: sem erros.
- `npm test`: **580 passaram, 4 pulados** (Ghostscript), 70 arquivos.
- `npm run build`: concluído.
- `npm run triagem:avaliar`: quatro conjuntos, cerca de 90 s.

## 9. Situação para a E7

O núcleo está consistente para receber persistência, API e revisão humana:
- o resultado sai no contrato `ProcessoTriagem`;
- no conjunto novo, a primeira execução não teve nenhum falso alerta nem achado não detectado;
- nenhuma classe errada nem valor errado aceito em nenhum conjunto;
- as garantias e a abstenção estão testadas.

Os problemas conhecidos que sobram são conservadores (abstenção) ou institucionais. A E7–E10 não foi iniciada.
