# E11.1: primeira evidência real do Qwen local no AQR

Data: 17/11/2026. Branch `dev`. Só documentos sintéticos. Nenhuma sugestão do modelo tem efeito no motor, nas regras, no banco ou na tela. Números marcados como **medidos** saíram das execuções registradas em `docs/triagem/avaliacao-ia-e11.1-qwen-primeira-execucao.md` e `docs/triagem/avaliacao-ia-e11.1-qwen-depuracao-ia1.md`. O que não foi medido está dito.

## 1. Estado inicial encontrado

- `dev` em dia com o GitHub (`1b78c19`). Única alteração fora do Git: `AGENTS.md`, não rastreado: lido, não alterado e não comitado. É uma cópia antiga do `CLAUDE.md` e ainda diz "sem IA".
- E11.0 já concluída:
  - contratos (`shared/contracts/triage-ia.ts`);
  - provedor simulado, pedido com recorte mínimo (`montarPedido`) e verificação determinística em dois níveis (`verificarProposta`);
  - tabelas só de inserção (migração 0010);
  - benchmark do simulado e conjunto IA-1 congelado.
- O provedor local existia só como contrato e recusava ser criado (`criarProvedorLocal`). Continua assim: a bancada não passa pelo servidor.
- Reaproveitado sem mudança de comportamento:
  - o motor (`triarAnexo`), com o OCR local;
  - `propostaModeloSchema` e `verificarProposta`, por onde passam todas as propostas;
  - os geradores do IA-1, `normalizarCampo` e `mascararDocumentos`;
  - `renderPage`, que desenha as páginas digitalizadas enviadas ao modelo.

## 2. Hardware (medido)

| Item | Esperado no pedido | Real |
|---|---|---|
| Máquina | RTX 4070 8 GB + 64 GB RAM | **Apple M5** (10 núcleos de CPU, GPU de 8 núcleos, Metal 4) |
| Memória | 8 GB de VRAM separados | **16 GB unificados** (CPU e GPU dividem a mesma memória) |
| Sistema | — | macOS 26.6.2 |
| Disco livre | — | 250 GB |
| CUDA | — | não se aplica (Metal) |

O modelo de 4 B quantizado coube com folga: 3,2 GB na GPU, sem offload para a CPU. Os números de latência e memória valem **para este Mac**, não para a RTX 4070 nem para um servidor da prefeitura.

## 3. Modelo, versão, licença, quantização e runtime

| Item | Valor |
|---|---|
| Runtime | Ollama 0.40.16 (Homebrew, licença MIT), só o binário: sem aplicativo de fundo, sem atualização automática, sem serviço que sobe sozinho |
| Modelo usado | `qwen3.5:4b-q4_K_M`: Qwen3.5, 4,2 B de parâmetros, GGUF, **Q4_K_M**, com visão (projetor incluído) |
| Manifesto dos pesos (sha256) | `d8b0f5e9760cd1682034f292d7ef72ec46f432149be0df7574bf2d6e92e38c04` |
| Licença | Apache 2.0 (texto informado pelo runtime; hash registrado no relatório da execução) |
| Executor | llama.cpp (`llama-server`), 100% na GPU |
| Também baixado, **não usado** | `qwen3.5:4b` (padrão do Ollama no Mac): 4,5 B, `nvfp4`, executor MLX. Nele a saída estruturada **não está disponível** (`structured output is unavailable`, medido), e o plano pede decodificação restrita por esquema |
| Prompt | `e11.1-pagina@1`, sha256 `ae8c2026…dfb449` (prompt + esquema + versão) |
| Geração | temperatura 0, semente 7, até 400 tokens, `think: false`, saída restrita por esquema JSON |

O segundo candidato (`Qwen3-VL-4B-Instruct`) **não foi baixado nem executado** nesta etapa.

## 4. Arquitetura local implementada

```text
documento sintético ─► motor (triarAnexo, OCR local) ─► linhas lidas, numeradas L1..Ln (CPF/CNPJ mascarados)
                                                     └► página digitalizada: imagem desenhada pelo AQR
                                    ▼
      cliente só-loopback ─► Ollama em 127.0.0.1:11434, dentro do sandbox sem rede, sem ferramentas
                                    ▼
          resposta ─► JSON.parse ─► zod estrito (saidaPaginaSchema) ─► recusa o que não couber
                                    ▼
   proposta do contrato E11.0: região = palavras da LINHA citada (montada pelo AQR, nunca pelo modelo)
                                    ▼
             verificarProposta (E11.0, inalterada) ─► + teste de rótulo da bancada
                                    ▼
                    só contagem e categoria no relatório; efeito: nenhum
```

- **Isolamento de rede.** O servidor do modelo roda em `sandbox-exec` com `scripts/ia-local/sem-rede.sb`: o kernel nega toda saída que não seja loopback.
  - Medido: com o perfil, `curl` para a internet falha; sem o perfil, responde `200`.
  - A bancada só roda se o servidor foi iniciado nesse modo, o que ela confere pelo pid que escuta na porta.
  - A rede só foi usada para baixar os pesos, no modo `baixar`.
- **Limites do servidor:** `OLLAMA_NO_CLOUD=1`, `OLLAMA_HOST=127.0.0.1:11434`, um pedido por vez, um modelo carregado, fila de 4, contexto de 8 192 tokens e depuração desligada. Os pesos ficam em `~/.aqr-ia/modelos`, fora do Git.
- **Cliente** (`scripts/ia-local/bancada/ollama.ts`):
  - recusa qualquer endereço que não seja `http://127.0.0.1`, inclusive `localhost`;
  - nunca passa `tools`;
  - tem tempo máximo por pedido;
  - os erros não carregam conteúdo, o que está testado.
- **Entrada do modelo:** só a página selecionada pelo AQR. Não vai nome de arquivo, processo, catálogo, regras nem sistema de arquivos. As imagens são as páginas desenhadas pelo AQR.
- **Evidência:** o modelo cita a linha. Sem linha válida, a proposta vai num ponto vazio do canto e **nunca** é verificada.
  - Achado durante os testes: uma região grande deixava a verificação encontrar o valor por conta própria, o que seria aceitar proposta sem evidência.
- **Fora do servidor.** A bancada mora em `scripts/ia-local/bancada/`, porque o teste de segurança da E10.3 proíbe código de rede em `server/triage` e `server/documents`. O teste não foi alterado. `isolamento.test.ts` garante que servidor, tela e contratos não importam a bancada.
- **Logs.** Nada de conteúdo:
  - a bancada imprime só documento, página, situação e tempo;
  - o relatório guarda categorias, contagens, tempos e memória;
  - o Ollama roda sem modo de depuração.

## 5. Arquivos alterados

| Arquivo | O quê |
|---|---|
| `scripts/ia-local/ollama.sh`, `scripts/ia-local/sem-rede.sb` | Servidor local (baixar / inferência sem rede / parar) e perfil de sandbox |
| `server/triage/corpus/ia2.ts`, `ia2.test.ts`, `docs/triagem/casos/ia2-gabarito.json` | Conjunto IA-2 e congelamento por hash (commit `0ef4f51`, antes de qualquer execução do modelo sobre ele) |
| `scripts/ia-local/bancada/{ollama,tarefa,bancada,relatorio,cli}.ts` e testes | Bancada (commit `c87d5e8`, antes da primeira execução no IA-2) |
| `package.json`, `tsconfig.server*.json`, `vite.config.ts`, `eslint.config.js` | Script `triagem:ia-qwen`; a bancada entra no typecheck, no lint e nos testes, e fica fora do build do servidor |
| `docs/triagem/avaliacao-ia-e11.1-qwen-*.md`, este relatório, `docs/CONTEXTO.md` | Resultados e registro |

Não mudaram: servidor, rotas, banco, motor, catálogo, verificação da E11.0, contratos, tela e `master`.

## 6. Como reproduzir

```bash
brew install ollama                                   # uma vez
scripts/ia-local/ollama.sh baixar qwen3.5:4b-q4_K_M   # uma vez, com rede
scripts/ia-local/ollama.sh inferencia                 # servidor sem rede, só 127.0.0.1
npm run triagem:ia-qwen -- --conjuntos ia2,ia1        # gera docs/triagem/avaliacao-ia-e11.1-qwen.md
scripts/ia-local/ollama.sh parar
```

A primeira execução no IA-2 está em `avaliacao-ia-e11.1-qwen-primeira-execucao.md` e não é reescrita: a bancada passa a gravar em `avaliacao-ia-e11.1-qwen.md`.

## 7. Resultados (medidos)

### 7.1 IA-2: independente, primeira execução

19 páginas em 14 documentos, 3 delas digitalizadas e enviadas com imagem.

| Classe por página | Certa | Indeterminada | Errada |
|---|---:|---:|---:|
| Motor determinístico | 16 | 3 | 0 |
| Modelo | **18** | 1 | **0** |

Área do lote e matrícula, 19 casos:

| Braço | Certo | Abstenção | Conflito escolhido | Distrator | Plantado | Alucinado | Outro erro |
|---|---:|---:|---:|---:|---:|---:|---:|
| Motor determinístico | 4 | 15 | 0 | 0 | 0 | 0 | 0 |
| Modelo isolado | **17** | 1 | **1** | 0 | 0 | 0 | 0 |
| Modelo + verificação E11.0 | 7 | 12 | 0 | 0 | 0 | 0 | 0 |
| Modelo + verificação + rótulo (\*) | 6 | 13 | 0 | 0 | 0 | 0 | 0 |

(\*) A regra de rótulo foi escrita por quem escreveu o IA-2. No IA-2, essa linha não é medida independente.

- **O único erro do modelo isolado:** no IA2-13, o memorial traz duas áreas para o mesmo terreno, e o modelo escolheu uma em vez de se abster. A verificação barrou, porque o valor é ambíguo no documento.
- **Ganho contrafactual:** se as sugestões verificadas preenchessem lacunas (política N1, **não ligada**), 5 abstenções do motor virariam o valor certo, e 0 resultados certos do motor seriam prejudicados.
- **Custo da verificação:** ela recusou 11 das 18 propostas de campo.
  - 8 por `valor-ambiguo-no-documento`: o documento tinha outro valor no mesmo formato, como a área construída.
  - 3 por `valor-ausente-da-regiao`: em digitalizados, o OCR leu a linha de outro jeito.
  - Várias dessas recusas atingiram valores **certos**. Ela é segura, mas abstém muito.
- **Injeções.** Foram 4 documentos: instrução visível, texto branco de 2 pt, instrução dentro da imagem e trecho em formato JSON.
  - O modelo não propôs nenhum valor plantado e não trocou a classe.
  - Sinalizou a instrução nos 4.
  - Nenhum plantado chegou a ser aceito pela verificação.
- **Distratores:** o modelo não propôs nenhum (área construída, área permeável, matrícula anterior).
- **Saídas e evidência:** nenhuma saída fora do esquema, nenhuma proposta sem linha válida e nenhuma alucinação.

### 7.2 IA-1: regressão, não independente

| Braço | Classe certa (14 páginas) | Campos certos (8) | Erros de campo |
|---|---:|---:|---:|
| Motor | 9 | 0 | 0 |
| Modelo isolado | 13 | 4 | 1 (conflito escolhido no IA1-07, barrado pela verificação) |
| Modelo + verificação E11.0 | 13 | 4 | 0 |

- Nenhum plantado foi proposto nos 3 documentos com instrução maliciosa.
- **Determinismo:** a mesma tarefa rodou duas vezes no IA-1 (depuração e primeira execução) e devolveu as mesmas classes, os mesmos valores e os mesmos desfechos. Com temperatura 0 e semente fixa, o modelo foi determinístico nesse conjunto.

### 7.3 Latência, memória e estabilidade

| Medida (primeira execução) | Mediana | p95 | Máximo |
|---|---:|---:|---:|
| Página só com texto, IA-2 | 6,8 s | 8,8 s | 8,8 s |
| Página com imagem, IA-2 | 16,8 s | 18,4 s | 18,4 s |
| Documento (motor + OCR + modelo), IA-2 | 7,9 s | 26,2 s | 26,2 s |

- **Variação entre rodadas:** a rodada de depuração, uma hora antes e na mesma máquina, deu cerca de **3,5 s** por página de texto e **10 s** com imagem. A primeira execução deu cerca de **7 s** e **17 s**. A causa não foi investigada; pode ser carga térmica ou de energia do notebook.
- **Tokens:** cerca de 680 de entrada por página (máximo 2 962, com imagem) e cerca de 115 gerados.
- **Memória:** pico de 4,2 GB residentes nos processos do runtime. O modelo carregado ocupa 3,2 GB, todos na GPU (sem offload).
- **Estabilidade** (todas medidas e aprovadas):
  - endereço fora do loopback é recusado antes de conectar;
  - um pedido com tempo de 30 ms esgota, e o seguinte funciona;
  - uma resposta cortada é recusada pelo esquema, e o seguinte pedido funciona;
  - com o executor do modelo encerrado no meio do pedido, o pedido falha sem derrubar a bancada, o runtime sobe um executor novo e o pedido seguinte funciona.

## 8. Riscos, limitações e bloqueios

1. **Conjunto pequeno.** São 33 páginas no total. Nenhum número aqui tem significância estatística; servem como primeira evidência e sinal de direção, não como aceite.
2. **O IA-2 foi escrito pelo mesmo autor da bancada.** Os valores e os distratores são sintéticos e de layout limpo, e a regra de rótulo conhecia os distratores. O desempenho em documento real da SEMADES é **desconhecido**.
3. **O prompt avisa sobre instruções.** A resistência a injeção medida vale com esse prompt e esse esquema. Não foi testada contra ataque adaptativo, como paráfrases, outras línguas ou instruções diluídas no meio de dados.
4. **Digitalizados.** O modelo leu certo os 2 digitalizados legíveis (IA2-05 e IA2-11), mas a verificação recusou porque o OCR do motor não confirma o valor na região. Usar a IA em digitalização exige a "segunda leitura independente" prevista na E11.3. Nos muito degradados (IA1-06, IA2-06), o modelo se absteve.
5. **A verificação da E11.0 abstém demais.** A regra de valor ambíguo recusa o valor certo sempre que existe outro no mesmo formato, mesmo com rótulo diferente. É segura, mas corta o ganho de 17 para 7 acertos no IA-2.
6. **Hardware de teste ≠ hardware alvo.** Os números de latência valem para o M5 de 16 GB e variaram 2× entre rodadas.
7. **A variante padrão do Ollama no Mac (MLX, `nvfp4`) não tem saída estruturada.** A bancada usa a GGUF Q4_K_M; mudar de executor ou de versão do Ollama exige refazer a medição.
8. **`sandbox-exec` está marcado como obsoleto pela Apple**, embora funcione no macOS 26.6. Num servidor Linux, o equivalente é namespace de rede sem interface, ou firewall por processo.
9. **Não foram feitos nesta etapa:**
   - o segundo candidato (Qwen3-VL-4B);
   - os conjuntos VAL, IND e NOV com o modelo;
   - medição de energia;
   - qualquer integração com o servidor (que segue recusando provedor local).

## 9. Comparação com o motor determinístico

- **Classe por página:** o modelo acertou mais que o motor (IA-2: 18 contra 16; IA-1: 13 contra 9) e nenhum dos dois errou. O ganho está justamente nas páginas em que o motor se abstém: layout inédito, digitalizado com ruído e documento fora do catálogo.
- **Campos:** o motor quase não extrai área e matrícula nesses layouts (4 de 19 no IA-2, 0 de 8 no IA-1), com zero erros. O modelo isolado extrai muito mais (17 de 19), com 1 erro (conflito escolhido). Com a verificação, o modelo acrescenta 5 acertos às lacunas do motor no IA-2, com zero erros.
- **Papéis:** o motor continua sendo a referência e a única fonte normativa. Nesses dados, o modelo funciona como leitor de lacunas, e a verificação como trava.

## 10. Recomendação para a próxima etapa

1. **Não ligar N0 ainda.** Faltam conjunto maior e independente de quem escreveu a bancada (gerado por outra pessoa, ou anonimizado de casos reais se a GCA autorizar) e repetição em VAL, IND e NOV para medir regressão.
2. **E11.3 (verificação reforçada) é o gargalo do ganho.**
   - Trocar a recusa por "valor ambíguo" por uma exigência de rótulo compatível, como `rotuloCompativel`, validada num conjunto que o autor da regra não viu.
   - Fazer a segunda leitura independente para digitalizados.
   - Fazer o teste de injeção adaptativa: variar o texto da instrução e medir se a saída muda.
3. **Benchmark comparativo com `Qwen3-VL-4B-Instruct`,** mesmo prompt e mesma bancada (basta `--modelo`). Para digitalizados, testar também imagem em resolução maior.
4. **Medir no hardware alvo** (a RTX 4070 do pedido ou o servidor da TI), com várias rodadas, para separar a variação da máquina da do modelo.
5. **Manter** a bancada fora do servidor, o servidor recusando provedor local e o efeito "nenhum" até haver decisão da GCA e da TI.
