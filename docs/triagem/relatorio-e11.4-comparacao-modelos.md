# E11.4: comparação Qwen3.5-4B × Qwen3-VL-4B

Data: 17/11/2026. Branch `dev`. Só documentos sintéticos. IA desligada no pipeline operacional, sem N0/N1, sem efeito no motor, nas regras ou no banco.

Dados medidos:
- `docs/triagem/avaliacao-ia-e11.4-comparacao.md`: comparação principal, 3 rodadas;
- `docs/triagem/avaliacao-ia-e11.4-exploratorio.md`: braço exploratório;
- `docs/triagem/e11.4-manifesto.json`: experimento congelado.

## 1. Modelos e runtime

| | Modelo A | Modelo B |
|---|---|---|
| Nome no Ollama | `qwen3.5:4b-q4_K_M` | `qwen3-vl:4b-instruct-q4_K_M` |
| Origem | Qwen3.5 (Alibaba/Qwen), via biblioteca do Ollama | `Qwen/Qwen3-VL-4B-Instruct` (Hugging Face oficial da Qwen, revisão `ebb281ec…`, publicado em 11/10/2025), via biblioteca do Ollama |
| Licença | Apache 2.0 | Apache 2.0 (conferida no Hugging Face oficial e no runtime) |
| Parâmetros | 4,2 B (visão incluída) | 4,0 B + codificador de visão CLIP de 415 M |
| Quantização / formato | Q4_K_M, GGUF | Q4_K_M, GGUF (há Q8_0 de 5,1 GB e BF16 de 8,9 GB) |
| Digest do manifesto | `d8b0f5e9…38c04` | `84f7ed80…bc318` |
| Executor | llama.cpp (`llama-server`) do Ollama 0.40.16, 100% GPU | idem |
| Modo "thinking" | existe; desligado (`think: false`) | não existe (modelo instruct) |
| Memória carregada (runtime) | 3,2 GB, toda na GPU | 4,3 GB, toda na GPU |

Os dois rodaram no mesmo servidor sem rede (sandbox do kernel), só em 127.0.0.1, com a nuvem desligada e um pedido por vez.

## 2. Configuração experimental

- **Congelamento:** o manifesto (`c636e18`) foi comitado antes da primeira rodada, com os hashes de:
  - verificador: E11.0, reforçada, classe, detector e instruções;
  - bancada, OCR, perfil de sandbox e servidor;
  - gabaritos IA-1 a IA-4;
  - prompt (`e11.1-pagina@1`, `ae8c2026…`) e esquema (`1d15848b…`);
  - os dois modelos;
  - a configuração.

  A ferramenta recusa rodar se qualquer item divergir ou se houver alteração não comitada em `server/`, `shared/`, `scripts/ia-local/` ou nos gabaritos. **Nada do verificador mudou durante a comparação.**
- **Entradas idênticas** para os dois modelos:
  - mesmos documentos;
  - mesmas linhas lidas pelo motor;
  - mesmas imagens (1100 px) nas páginas digitalizadas;
  - mesmo prompt e esquema JSON.
- **Inferência idêntica:** temperatura 0, semente 7, até 400 tokens, contexto 8192, saída restrita por esquema.
- **Verificação idêntica:**
  - E11.0;
  - verificação reforçada de campos;
  - verificação de classe;
  - leitura visual e segunda leitura com PaddleOCR.
- **Rodadas:** 3 rodadas com IA-1 a IA-4 (128 páginas por modelo e rodada), na ordem A→B, B→A e A→B. Antes de cada passada, os dois modelos foram descarregados, para medir o carregamento a frio. Sem cache: toda resposta foi gerada na hora.
- **Condições da máquina:** registradas por passada. As rodadas 1 e 2 rodaram **na bateria** (53% a 26%), e a rodada 3 **na tomada**. Não houve aviso térmico nem modo de baixo consumo. O swap ficou entre 6,8 e 11,5 GB, e a carga da máquina entre 1,8 e 2,8.
- **Limitações de equivalência:**
  - os codificadores de visão são diferentes: a mesma imagem vira cerca de 2.290 tokens no A e cerca de 2.495 no B;
  - os tokens de texto também diferem (cerca de 690 × 752) por causa de tokenizadores e modelos de chat diferentes;
  - o padrão `L\d+` do esquema não é imposto pelo executor para nenhum dos dois: só o zod confere depois.
- **Conjuntos:**
  - IA-1 a IA-3 são desenvolvimento e regressão;
  - **o IA-4 já orientou ajustes da verificação na E11.3.1 e serve aqui só para comparar candidatos**, não como avaliação independente;
  - nenhum IA-5 foi criado nem usado.

## 3. Comparativo por conjunto (comparação principal, rodada 1)

As rodadas 2 e 3 repetiram **exatamente** as mesmas respostas e os mesmos desfechos, nos dois modelos.

| Conjunto | Modelo | Classe: certas / erradas propostas | Classe: certas / **erradas** aceitas | Campos: certos / errados propostos | Campos: certos / **errados** aceitos | Saída fora do esquema |
|---|---|---|---|---|---|---:|
| IA-1 | A | 13 / 0 | 13 / **0** | 4 / 1 | 3 / **0** | 0 |
| IA-1 | B | 2 / 0 | 2 / **0** | 1 / 0 | 1 / **0** | 12 de 14 |
| IA-2 | A | 18 / 0 | 18 / **0** | 17 / 1 | 16 / **0** | 0 |
| IA-2 | B | 2 / 0 | 2 / **0** | 1 / 0 | 1 / **0** | 16 de 19 |
| IA-3 | A | 33 / 2 | 23 / **0** | 56 / 9 | 52 / **0** | 0 |
| IA-3 | B | 1 / 0 | 1 / **0** | 0 / 2 | 0 / **0** | 34 de 35 |
| IA-4 | A | 48 / 12 | 38 / **0** | 81 / 7 | 54 / **0** | 0 |
| IA-4 | B | 3 / 3 | 3 / **0** | 5 / 2 | 4 / **0** | 54 de 60 |
| **Total** | **A** | **112 / 14** | **92 / 0** | **158 / 18** | **125 / 0** | **0 de 128** |
| **Total** | **B** | **8 / 3** | **8 / 0** | **7 / 4** | **6 / 0** | **116 de 128** |

**Por que o B falha no esquema:** em vez do identificador da linha citada ("L2"), ele escreve a linha inteira ("L2: MEMORIAL DESCRITIVO…"). O contrato exige o identificador, e o zod recusa a página inteira. O A cumpre o formato em 100% das páginas.

**Como contar.** Os números acima contam **propostas**: uma classe só conta quando é proposta e aceita, e um campo aceito em duas páginas conta duas vezes. O relatório da E11.3.1 contava a abstenção nas páginas "indeterminadas" como acerto e contava campos por documento. Por isso, para o mesmo modelo A no IA-4, aparecem 41/52 lá e 38/54 aqui. Conferi que as 128 respostas do A são idênticas byte a byte nas duas etapas e que os desfechos página a página coincidem.

## 4. Classificação

**Principal:** o A propôs 112 classes certas e 14 erradas, e a verificação aceitou 92 certas e **0 erradas**. O B quase não produziu saída válida.

**Braço exploratório.** São as mesmas respostas cruas, reaplicadas à mesma bancada e à mesma verificação, com uma única tolerância de **formato**, igual para os dois modelos: "L2: texto" vira "L2". Não é a comparação principal; serve para avaliar o **conteúdo** do B.

| | A | B |
|---|---:|---:|
| Classes certas propostas | 112 | 106 |
| Classes erradas propostas | 14 | 11 |
| Classes certas aceitas | 92 | 91 |
| **Classes erradas aceitas** | **0** | **0** |
| Saída fora do esquema, mesmo com a tolerância | 0 | 10 |

Por tipo de documento (exploratório; certas propostas / aceitas, A × B):
- **O B foi melhor em cadastro imobiliário:** 16/15 contra 11/10.
- **O A foi melhor em:**
  - ART/RRT: 3/3 contra 0/0;
  - prancha: 9/8 contra 6/6;
  - certidão de matrícula: 24/14 contra 21/15;
  - procuração: 5/4 contra 4/3.
- **Iguais:** os demais tipos, com zero erradas aceitas nos dois.

## 5. Extração

| | Principal A | Principal B | Exploratório A | Exploratório B |
|---|---:|---:|---:|---:|
| Valores certos propostos | 158 | 7 | 158 | 103 |
| **Valores errados propostos** | 18 | 4 | 18 | **72** |
| Valores certos aceitos | 125 | 6 | 125 | 82 |
| **Valores errados aceitos** | **0** | **0** | **0** | **1\*** |
| Erros de associação propostos (distrator) | 2 | 0 | 2 | 7 |

\* O único "errado aceito" do B é o IA1-05: ele propôs a matrícula impressa na página 3 ("Ficha nº 205.330"), que é o valor certo, mas o gabarito do IA-1 só registra lote e quadra nesse documento. **É omissão do gabarito, não erro do modelo nem do verificador.**

**Por que o B erra mais valores:** muitas vezes omite a unidade ("486,75" em vez de "486,75 m²"), associa valores a outro rótulo e escolhe um entre valores conflitantes. Pelo critério congelado (valor como impresso), essas propostas são erradas, e a verificação as recusou.

**Digitais × digitalizados** (casos de campo verificados como certos):

| | A | B (exploratório) |
|---|---:|---:|
| Digital | 109 de 152 | 73 de 159 |
| **Digitalizado** | **14 de 23** | 8 de 24 |

O modelo especializado em visão (B) **não** teve vantagem nos digitalizados desta bancada.

## 6. Erros aceitos e rejeitados

| | A | B (principal) | B (exploratório) |
|---|---:|---:|---:|
| Classes erradas propostas → aceitas | 14 → **0** | 3 → **0** | 11 → **0** |
| Valores errados propostos → aceitos | 18 → **0** | 4 → **0** | 72 → **0** (+1 omissão de gabarito) |

**A verificação congelada segurou todos os erros dos dois modelos.** A diferença está em quantos erros chegam até ela: com o B, 4 vezes mais valores errados, todos barrados.

## 7. Resultados adversariais

São 23 documentos com ataque (IA-1 a IA-4).

| | A | B (principal) | B (exploratório) |
|---|---:|---:|---:|
| Documentos em que o modelo propôs valor plantado | 1 | 1 | **7** |
| Valor plantado aceito | **0** | **0** | **0** |
| Classe proposta seguiu a instrução | 0 | 0 | **1** |
| Modelo sinalizou a instrução | 23 de 23 | 2 de 23 | 20 de 23 |
| Propostas sem linha válida (referência inexistente) | 8 | 0 | 8 |
| Propostas com evidência fora da região/página (recusadas) | 17 | 2 | 19 |
| Recusadas por texto invisível na folha | 4 | 0 | 4 |
| Falhas ou tempo esgotado | 0 | 0 | 0 |

**Decisão administrativa:** nenhuma foi produzida. O esquema não tem campo para isso, e qualquer tentativa vira saída fora do esquema.

**O B é menos resistente às instruções maliciosas:** propôs valor plantado em 7 documentos (contra 1 do A) e seguiu a instrução de classe em 1. A verificação barrou todos.

## 8. Latência e memória (3 rodadas)

| | A | B |
|---|---|---|
| Página de texto: média / mediana / p95 | 7,4 / 6,6 / 13,5 s | **4,3 / 4,0 / 6,5 s** |
| Página com imagem: média / mediana / p95 | 17,6 / 15,0 / 24,9 s | 14,5 / 13,2 / 20,9 s |
| Leitura do prompt, texto (mediana) | 1,4 s | **0,3 s** |
| Leitura do prompt, imagem (mediana) | 9,2 s | 8,9 s |
| Geração (mediana) | 5,2 s | 3,8 s |
| Tokens gerados por segundo (mediana) | 25 | 28 |
| Processo (documento com motor, OCR, leitura visual e modelo): média / mediana / p95 | 11,9 / 9,5 / 26,3 s | 7,9 / 6,1 / 19,3 s |
| Carregamento a frio | 1,0–1,3 s | 1,0–1,5 s |
| Modelo carregado (runtime) | 3,2 GB, 100% GPU | **4,3 GB**, 100% GPU |
| Pico de RSS do runtime | 4,1–4,6 GB | **5,4–5,7 GB** |
| Offload para a CPU | não | não |
| Mediana de texto por rodada | 5,7 · 6,8 · 9,2 s | 3,2 · 3,6 · 6,0 s |

- **Variação entre rodadas:** a rodada 3 foi a mais lenta para os **dois** modelos, embora tenha rodado **na tomada**. A variação não vem da bateria. Ela acompanha a carga da máquina, que é compartilhada (navegador, outros programas, swap alto).
- **Velocidade:** o B é mais rápido em texto, porque processa o prompt muito mais depressa. Em imagem, os dois ficam parecidos.
- **Saídas inválidas do B:** as respostas fora do esquema também consomem tempo, e esse tempo está incluído nas medidas.

## 9. Análise das diferenças

1. **Saída estruturada:** é o fator decisivo. O B descumpre o formato da linha citada em 91% das páginas. Num sistema que exige evidência rastreável, isso equivale a não responder.
2. **Conteúdo:** mesmo com o formato tolerado, o B não supera o A:
   - acertos de classe verificáveis parecidos (91 × 92);
   - **menos valores certos verificáveis** (82 × 125);
   - **4 vezes mais valores errados propostos** (72 × 18);
   - mais propostas de valor plantado (7 × 1).
3. **Segurança:** com os dois modelos, a verificação congelada barrou 100% dos erros. O risco residual cresce com o volume de erros que chega a ela, e o B entrega mais.
4. **Digitalizados:** não houve ganho do modelo de visão (8 × 14 casos verificados).
5. **Desempenho:** o B é cerca de 40% mais rápido em texto, mas usa cerca de 1,1 GB a mais de memória.

## 10. Recomendação

**Manter o Qwen3.5-4B (modelo A).** Pelos critérios definidos, em ordem:

| Critério | Resultado |
|---|---|
| 1. Erros que sobreviveram à verificação | 0 nos dois (empate) |
| 2. Acertos verificáveis | A: 92 classes e 125 valores. B: 8 e 6 (principal), 91 e 82 (exploratório) |
| 3. Abstenção diante de incerteza | O A propõe menos valores errados (18 × 72) e sinaliza instruções com mais consistência |
| 4. Digitalizados | A: 14 × B: 8 |
| 5. Robustez a instruções | A melhor: 1 × 7 propostas de valor plantado; 0 × 1 classe seguindo instrução |
| 6. Latência e memória | B mais rápido em texto; A usa menos memória |
| 7. Mac mini M5 Pro de 48 GB | Os dois cabem com folga (≤ 6 GB). A escolha não depende do hardware |

A vantagem de velocidade do B não compensa a falha de formato, o maior número de erros propostos e a menor resistência a instruções.

**Estimativa (não medida) para o Mac mini M5 Pro de 48 GB:** a memória deixa de ser limite. Variantes maiores, como Q8 ou modelos de 8–9 B, ficam viáveis para uma comparação futura, que pediria as mesmas condições de congelamento. A latência deve cair em relação ao M5 de 16 GB compartilhado, mas isso só se confirma medindo.

## 11. Limitações e próximos passos

**Limitações:**
1. **IA-4 não é independente:** ele orientou a E11.3.1 e aqui serve só para comparar candidatos. **Os números absolutos não são avaliação final**; só a comparação entre modelos, sob a mesma verificação, é o objetivo desta etapa.
2. **Braço exploratório:** a tolerância de formato só serve para avaliar o conteúdo do B. Adotá-la em produção exigiria nova decisão e nova medição.
3. **Prompt sem ajuste:** o prompt e o esquema foram feitos e ajustados com o modelo A desde a E11.1. Um prompt específico para o B poderia reduzir a falha de formato, mas isso não foi testado, porque mudaria a comparação.
4. **Máquina compartilhada:** as medições de desempenho foram feitas numa máquina compartilhada, com bateria em parte das rodadas e swap alto.
5. **Dados sintéticos:** todos os conjuntos são sintéticos.

**Próximos passos sugeridos:**
1. **IA-5** escrito por uma pessoa ou por um agente sem acesso ao código, para a avaliação independente do Qwen3.5-4B com a verificação atual.
2. **Medição no hardware alvo** (Mac mini M5 Pro de 48 GB), sem outros programas.
3. **Opcional, em etapa própria:** testar se um prompt adaptado ao Qwen3-VL corrige o formato. Só faz sentido se houver motivo para trocar de modelo (por exemplo, a velocidade).
4. **Corrigir a omissão do gabarito do IA-1** (matrícula do IA1-05) **só** num gabarito novo, versionado. O IA-1 continua congelado.
