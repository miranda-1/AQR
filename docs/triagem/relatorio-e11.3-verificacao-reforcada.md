# E11.3: verificação reforçada e segunda leitura

Data: 17/11/2026. Branch `dev`. Só documentos sintéticos. Modelo `qwen3.5:4b-q4_K_M`, 100% local, só em 127.0.0.1, com a rede bloqueada pelo kernel durante a inferência. **Nenhuma sugestão tem efeito**: N0, N1 e N2 continuam desligados, o servidor continua recusando provedor local, e o motor, as regras e as garantias não mudaram.

Resultados medidos:
- `docs/triagem/avaliacao-ia-e11.3-desenvolvimento.md`: desenvolvimento, IA-1 e IA-2;
- `docs/triagem/avaliacao-ia-e11.3-final-ia3.md`: **avaliação final**, IA-3, executada uma vez;
- `docs/triagem/comparacao-ocr-e11.3.md`: comparação de OCR;
- `docs/triagem/desempenho-ia-e11.3.md`: desempenho em 3 rodadas.

## 1. Diagnóstico dos 10 acertos recusados na E11.1 (IA-2)

O Qwen acertou 17 de 19 campos e a verificação da E11.0 aceitou 7. Os 10 acertos recusados, um a um (rodada de diagnóstico com as mesmas respostas do modelo):

| Causa | Casos | Documentos |
|---|---:|---|
| Outro valor do mesmo formato **com outro rótulo** (área construída, permeável, edificada; matrícula anterior). A E11.0 recusava por `valor-ambiguo-no-documento` | 4 | IA2-01, IA2-02 (matrícula), IA2-03, IA2-04 (área) |
| Outro valor do mesmo formato **plantado numa instrução** (visível, texto branco, JSON). A "ambiguidade" vinha do ataque | 3 | IA2-09, IA2-10, IA2-12 |
| **Digitalizado**: o OCR do motor (Tesseract) leu outra coisa na linha citada (`m?` no lugar de `m²`, linha errada) | 3 | IA2-05 (2), IA2-11 |

O único erro do modelo no IA-2 (escolher uma de duas áreas no IA2-13) foi recusado corretamente.

## 2. Mudanças na verificação

Novo módulo `server/triage/ia/verificacao-reforcada.ts` (`verificacao@2`), determinístico, sem rede e sem nada vindo do modelo além da proposta. **Roda depois da E11.0**, que continua inalterada. Ela só pode desfazer duas recusas da E11.0:
- `valor-ambiguo-no-documento`;
- em página digitalizada, as recusas que dependem do texto do OCR do motor.

Hash, página, região inválida, instrução na região, normalização, campo confirmado por servidor e anexo isolado nunca são relaxados. Ela também pode **recusar o que a E11.0 aceitava**.

1. **Rótulo de cada valor.** Para cada valor no formato do campo, o rótulo vem, nesta ordem:
   - do texto antes do valor na mesma linha, até um separador ou o valor anterior;
   - em tabela, da primeira célula da linha ou, se ela for só número, do cabeçalho da coluna;
   - se o valor está sozinho na linha, da linha de cima, quando ela é um rótulo curto sem número.
2. **Classificação do rótulo** por vocabulário do domínio, não de casos:
   - "do campo": área + lote/terreno/imóvel; matrícula/ficha/"mat.";
   - "genérico": "área" sem qualificador;
   - "outra grandeza": construída, edificada, permeável, projeção, útil, comum, remanescente, desdobrada, parte, sub-lote "47-B", fração, valor venal; matrícula anterior/de origem/mãe/encerrada, transcrição, processo, protocolo, inscrição, cadastro;
   - "nenhum".
3. **Decisão:**
   - o valor citado precisa estar na região citada e ter rótulo do campo (ou genérico, se nenhum valor tiver rótulo do campo);
   - se o anexo tiver **mais de um valor distinto** com rótulo do campo ou genérico, a resposta é **abstenção** (`varios-valores-com-rotulo-do-campo`). Isso cobre dois imóveis, dois levantamentos e "área do lote" × "área total retificada";
   - valor de outra grandeza é recusado (`rotulo-de-outra-grandeza`); valor sem rótulo, também (`sem-rotulo-do-campo`).
4. **Linhas dirigidas à máquina** não contam como evidência nem como candidatas: instruções, vocativos ("SISTEMA:", "IA:", "ao modelo"), imperativos sobre valor ou classe, e linhas em formato JSON. Valor plantado não cria nem resolve ambiguidade. O detector `pareceInstrucao` do motor **não** foi alterado.
5. **Digitalizado:** a verificação exige a segunda leitura independente.
   - O valor precisa estar nela, com rótulo do campo, perto da região citada pelo modelo, quando ele citou uma.
   - O OCR do motor não pode trazer outro valor com rótulo do campo na mesma página (`leituras-divergentes`).
   - Concordância de texto sem rótulo não basta (há teste para isso).
6. Só `area` e `matricula` têm vocabulário. Os outros campos e a classe ficam com o resultado da E11.0.

**Um ajuste guiado pelo desenvolvimento** (IA-1, documento IA1-07): na primeira versão, o rótulo genérico ("Área total (após retificação)") era ignorado quando havia um específico, e a reforçada aceitou um valor conflitante. Passou a contar para o conflito, com teste genérico novo. Esse foi o único erro aceito em todo o desenvolvimento, e foi corrigido **antes** do congelamento.

## 3. OCR independente

Comparação em 36 páginas digitalizadas próprias, fora dos conjuntos IA: 3 imóveis × 4 peças × 3 qualidades. As medidas são de valores lidos com os dígitos exatos.

| Mecanismo | Boa | Ruído | Muito degradada | Tempo mediano |
|---|---:|---:|---:|---:|
| Tesseract (motor) | 18/18 | **2/18** | 0/18 (39 s por página) | 0,5–0,9 s |
| **PaddleOCR PP-OCRv5 latino** (RapidOCR 3.10 + onnxruntime 1.32, CPU) | 18/18 | **18/18** | 0/18 | 1,0 s |
| Vision (Apple) | 18/18 | **18/18** | 0/18 | 0,2 s |

**Escolhido: PaddleOCR.** É tão preciso quanto o Vision aqui, é independente do Tesseract do motor, roda num servidor Linux (o Vision só existe no macOS) e tem licença Apache 2.0.
- Os modelos foram baixados uma vez, do repositório do RapidOCR no ModelScope, e o hash está registrado. O do reconhecimento latino é `b20bd37c…5f5a`.
- O OCR roda num processo próprio, dentro do mesmo sandbox sem rede, com tempo máximo, e a saída é validada por zod.
- Ambiente em `~/.aqr-ia/ocr-paddle` (Python 3.12), fora do Git.
- O Vision fica disponível como alternativa no Mac (`scripts/ia-local/ocr/vision-ocr.swift`).
- Nenhum dos três lê a digitalização muito degradada: ali a abstenção continua sendo a resposta.

## 4. Testes novos

| Arquivo | Testes | O que cobre |
|---|---:|---|
| `server/triage/ia/verificacao-reforcada.test.ts` | 44 | Ver lista abaixo |
| `server/triage/corpus/ia3.test.ts` | 4 | Congelamento do IA-3 (hash e bytes), cobertura dos desafios, sem CPF/CNPJ, e que o valor certo nunca coincide com distrator, plantado ou conflito |

O que `verificacao-reforcada.test.ts` cobre:
- a classificação de 15 rótulos;
- 8 linhas dirigidas à máquina e linhas comuns;
- recuperação do valor certo ao lado de outra grandeza;
- recusa do valor de outra grandeza;
- **valor certo com rótulo errado**, que a E11.0 aceitava e a reforçada recusa;
- número de processo no formato de matrícula;
- matrícula atual × anterior;
- dois valores plausíveis;
- rótulo específico × genérico;
- tabela por coluna e por linha;
- rótulo na linha de cima;
- instrução visível, JSON e texto oculto;
- evidência fora da região declarada;
- página inexistente e hash trocado (decisão da E11.0 mantida);
- campo fora do vocabulário;
- proposta sem linha citada;
- segunda leitura: ausente, com rótulo, sem rótulo, com valor diferente e fora da região citada.

Os textos dos testes foram escritos para eles e não copiam IA-1, IA-2 nem IA-3.

**Suíte completa:** 90 arquivos, 843 testes passando, 4 ignorados (os de sempre), além de lint, typecheck e build. Na primeira rodada, o teste de desempenho do comparador ("100 páginas em menos de 10 s") falhou com o modelo carregado e a suíte em paralelo. Passou duas vezes isolado e passou na suíte completa com o modelo parado. O comparador não foi alterado. O mesmo risco existe sempre que o modelo estiver carregado durante os testes.

## 5. Antes × depois

| Conjunto | Modelo isolado (certos / erros) | E11.0 (certos / erros aceitos) | **Reforçada (certos / erros aceitos)** |
|---|---|---|---|
| IA-2 (desenvolvimento) | 17 / 1 | 7 / 0 | **16 / 0** |
| IA-1 (desenvolvimento) | 4 / 1 | 4 / 0 | **3 / 0** |
| **IA-3 (avaliação final)** | **56 / 9** | **24 / 2** | **53 / 0** |

- **No IA-3:**
  - a reforçada recuperou 29 acertos que a E11.0 recusava e não perdeu nenhum que a E11.0 aceitava;
  - deixou de verificar só 3 dos 56 acertos do modelo (1 em camada de texto, 2 matrículas em digitalizado em que o PaddleOCR não confirmou o valor);
  - contrafactual: com N1 ligado (**não está**), ela reduziria 41 abstenções do motor sem prejudicar nenhum resultado certo do motor.
- **Abstenções no IA-3: 13**, e a maioria é correta:
  - 6 são documentos com dois imóveis (o gabarito pede abstenção);
  - 2 são valores só com rótulo de outra grandeza;
  - o resto é falta de confirmação.
- **Perdas no desenvolvimento** em relação à E11.0 (abstenções, nunca erro):
  - IA2-02: o valor vinha só depois de "com", sem a palavra "área";
  - IA1-01: o rótulo é "área remanescente", que o vocabulário trata como outra grandeza (o gabarito do IA-1 o considera a área).

## 6. Valores incorretos

| Conjunto | Propostas incorretas do modelo | Aceitas pela E11.0 | **Aceitas pela reforçada** |
|---|---:|---:|---:|
| IA-2 | 1 (conflito escolhido) | 0 | **0** |
| IA-1 | 1 (conflito escolhido) | 0 | **0** (1 na versão de desenvolvimento, corrigido antes do congelamento) |
| **IA-3** | **9** (6 conflitos escolhidos em documentos com dois imóveis, 2 distratores, 1 outro) | **2** (os distratores: "valor certo com rótulo errado") | **0** |

- **Valores plantados:** o modelo não propôs nenhum, nem nos 5 ataques do IA-3 (visível, oculto, JSON, na imagem, pedido de aprovação), nem no IA-1 e no IA-2. Sinalizou a instrução em todos. Os plantados também são barrados pela verificação nos testes.
- **Alucinação e saída fora do esquema:** nenhuma.

## 7. Avaliação final (IA-3), separada do desenvolvimento

O IA-3 tem 35 documentos sintéticos de um gerador combinatório com semente fixa. Foi congelado (`251aacd`) antes de qualquer linha da verificação reforçada. A verificação foi congelada (`20f0470`) antes da execução final, que foi feita **uma vez**, sem cache, com as respostas geradas na hora.

| Medida (IA-3) | Motor | Modelo isolado | Modelo + E11.0 | **Modelo + reforçada** |
|---|---:|---:|---:|---:|
| Classe certa (35 páginas) | 24 | 33 | 33 | 33 |
| Classe errada | 0 | **2** | **2** | **2** |
| Campos certos (66) | 13 | 56 | 24 | **53** |
| Erros aceitos | 1 | 9 | 2 | **0** |

- **Achado: a verificação de classe é fraca.** O modelo classificou 2 espelhos cadastrais como certidão de matrícula (eles trazem o rótulo "Matrícula"), e a verificação de classe da E11.0, que só confere o título citado, **aceitou**. A E11.3 não reforçou a classe, e isso fica como próximo passo.
- **O motor errou 1 campo:** escolheu uma das matrículas num documento com dois imóveis.
- **Limite de independência:** o gerador do IA-3 e o verificador são do mesmo autor. A separação é temporal (commits na ordem acima) e por geração combinatória, não por pessoa. Uma avaliação escrita por outra pessoa continua pendente.

## 8. Latência e memória

Três rodadas no IA-2, sem cache, com o modelo descarregado antes de cada uma, num M5 de 16 GB ligado na tomada, sem modo de baixo consumo e sem aviso térmico.

| Rodada | Texto: mediana / p95 | Imagem: mediana / p95 | Geração (texto), mediana | Carga 1 min | Swap usado |
|---|---|---|---:|---:|---:|
| 1 | 4,7 / 8,0 s | 10,5 / 17,2 s | 3,7 s | 2,35 | 8,5 GB |
| 2 | 6,1 / 7,5 s | 16,2 / 16,8 s | 4,6 s | 5,85 | 8,4 GB |
| 3 | 4,0 / 5,0 s | 10,2 / 10,5 s | 3,1 s | 6,40 | 8,3 GB |

- **Carregamento a frio:** 1,0 s nas 3 rodadas.
- **Leitura do prompt:** cerca de 1,1 s.
- **Geração:** cerca de 29 tokens/s, e é cerca de 75% do tempo de uma página de texto.
- **Segunda leitura (PaddleOCR):** mediana de 1,3–1,5 s por página digitalizada.
- **Verificação (E11.0 + reforçada):** de 0 a 7 ms por página.
- **Memória:** pico de cerca de 4,0 GB nos processos do runtime. O modelo ocupa 3,2 GB, todos na GPU, sem offload, em todas as rodadas.

**A variação de ~2×** se repete dentro da mesma sessão (texto de 4,0 a 6,1 s; imagem de 10,2 a 16,2 s).
- **Descartado:** não vem do carregamento (constante), do calor (sem aviso), da energia (tomada) nem do modo de baixo consumo (desligado).
- **O que varia:** a velocidade de **geração** do mesmo modelo, para o mesmo número de tokens.
- **Hipótese:** com 8,3–8,5 GB de swap em uso, a carga de 2,4 a 6,4 e outros programas abertos, a explicação mais provável é a disputa de memória e GPU na máquina de trabalho. É uma hipótese sustentada pelas medidas, não uma causa provada: para separar, é preciso medir em máquina dedicada.
- **Duração total:** a rodada 3 levou 354 s, contra 172 s da rodada 1, mesmo com as medianas do modelo mais baixas. O tempo extra não está nas medianas das chamadas ao modelo. Provavelmente está no motor (OCR do Tesseract em digitalização muito degradada, que levou até 39 s por página na comparação de OCR) ou em páginas fora da mediana. Isso não foi medido em separado.

## 9. Segurança, limitações e riscos residuais

1. **Isolamento mantido:**
   - modelo e PaddleOCR rodam em processos próprios, no sandbox sem rede, só em 127.0.0.1, sem ferramentas;
   - a bancada continua fora do servidor (teste de isolamento);
   - o teste de segurança da E10.3 não foi alterado;
   - nada de conteúdo vai para log. O cache local de respostas (só no desenvolvimento) fica em `~/.aqr-ia/cache` com permissão 0600, fora do Git, e nunca foi usado na avaliação final.
2. **A regra de rótulo é vocabulário.** Rótulos fora dele levam a abstenção, não a erro, enquanto não houver outro valor com rótulo do campo. Um documento real pode usar expressões que o vocabulário classifica errado. Exemplo: "área remanescente" no sentido de área total, que hoje vira abstenção.
3. **Um valor com rótulo do campo e errado** (erro de digitação do próprio documento, ou um documento que mente) passa pela verificação: ela confere associação, não a verdade do dado.
4. **Instrução sem padrão conhecido** (outra língua, paráfrase sem imperativo nem vocativo) não seria marcada como dirigida à máquina. Hoje, nesse caso, o valor plantado contaria como candidato **sem rótulo do campo**, e por isso não seria aceito, mas poderia criar conflito, com abstenção. Teste de injeção adaptativa continua pendente.
5. **Classe:** sem verificação semântica (ver seção 7).
6. **Digitalização muito degradada:** nenhum OCR lê; abstenção.
7. **Conjuntos pequenos e sintéticos,** escritos pelo mesmo autor da verificação. Desempenho em documento real é desconhecido.
8. **Hardware:** as latências valem para este Mac, compartilhado com outros programas.

## 10. Recomendação sobre o Qwen3-VL

**Avançar para a comparação com `Qwen3-VL-4B-Instruct`, mas como comparação de modelos, sem mexer na verificação.**
- Mesma bancada, mesmo prompt e mesmo verificador congelado (`verificacao@2`), nos mesmos conjuntos: IA-1 e IA-2 para desenvolvimento e IA-3 para comparação. Como o verificador não muda, o IA-3 pode comparar modelos.
- Qualquer mudança no verificador depois disso precisa de um **IA-4** novo e congelado antes, de preferência escrito por outra pessoa.

**O que medir:**
- os digitalizados, onde se espera o maior ganho de um modelo especializado em visão;
- a classe, porque o Qwen3.5 errou 2 no IA-3;
- os valores incorretos que chegam à verificação;
- a latência.

**Prioridades em paralelo,** antes de qualquer discussão de N0:
1. verificação semântica da **classe**;
2. teste de injeção adaptativa;
3. avaliação escrita por outra pessoa, ou com documentos reais anonimizados se a GCA autorizar;
4. medição no hardware alvo, sem outros programas.
