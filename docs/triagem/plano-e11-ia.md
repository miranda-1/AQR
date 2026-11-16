# Plano técnico da E11: IA documental

**Situação:** planejamento, 16/11/2026. Nada aqui foi implementado. Nenhum modelo foi baixado, executado nem integrado, e nenhum documento (real ou sintético) foi enviado a qualquer serviço.

**Marcações usadas neste documento:**

- **[Código]:** fato confirmado no repositório, com o caminho.
- **[Externo]:** informação sobre modelos e ferramentas de terceiros, conforme o conhecimento disponível na data. Versões, tamanhos e licenças **precisam ser conferidos** na fonte oficial antes de qualquer escolha.
- **[Hipótese]:** suposição de projeto, ainda não testada.
- **[Estimativa]:** número de ordem de grandeza, não medido. Precisa ser medido no hardware real.

## 1. Diagnóstico da arquitetura atual

### 1.1 Pipeline

- **[Código]** `server/triage/pipeline.ts` faz `triarAnexo`: lê (`lerAnexo`), classifica (`classificarAnexo`) e extrai (`extrairCampos`). Depois, o motor `executarTriagem` (`server/triage/engine/engine.ts`) roda as 19 regras sobre os anexos triados.
- **[Código]** A leitura e a extração rodam numa thread isolada, com limite de memória e de tempo (`server/triage/worker.ts`, `worker-pool.ts`, sobre `server/documents/isolated-pool.ts`). As regras e a gravação rodam no processo principal, em transação.
- **[Código]** Leitura:
  - PDF com texto pela camada de texto (pdf.js);
  - página digitalizada e JPG/PNG por OCR local com Tesseract (`tesseract.js`, em `server/documents/ocr/ocr-engine.ts`), com confiança mínima de 45 por padrão;
  - anexo isolado nunca é aberto.
- **[Código]** Classificação lexical com placar por página, exigência de título, pontuação mínima e margem (`server/triage/classification/classify.ts`). Sem evidência suficiente, a classe é `indeterminada`; não existe classe por eliminação. Arquivo composto é detectado, mas não é dividido.
- **[Código]** Extração por padrões de rótulo e de expressão (`server/triage/extraction/extract.ts`). Cada campo leva evidência (página, região, trecho) e normalização conservadora (`normalize.ts`); valor ambíguo vira "vários valores" ou "ilegível", nunca um palpite.

### 1.2 O encaixe para modelo

- **[Código]** `server/triage/model/document-model.ts` define:
  - `DocumentModel` (`proporClasses` e `proporCampos`, com `local: true` obrigatório);
  - as propostas `PropostaClasse` e `PropostaCampo` (anexo, classe ou campo, valor, confiança declarada, página, regiões);
  - a única implementação, `nenhumModelo`, que não propõe nada;
  - `propostaAncorada`, que só aceita uma proposta de campo se o valor estiver no texto lido das regiões citadas.
- **[Código]** O `DocumentModel` **não está ligado ao pipeline**. `propostaAncorada` é usada só pela avaliação (`server/triage/evaluation/extracao.ts` e `regras.ts`) para conferir que as evidências do motor atual estão ancoradas.
- **[Código]** Os contratos já preveem a origem de evidência `modelo-local` (`origensEvidencia` em `shared/contracts/triage.ts`), o método de classificação `modelo-local` e o método de extração `modelo-local`. A tela já tem rótulo para essa origem (`EvidenceViewer.tsx`).

### 1.3 Proteções que a IA não pode enfraquecer

**[Código]**

- Garantias AQR-GCA-040 e 041.
- Ausência só vira "não localizado" com o pacote confirmado como completo.
- A regra 028 só roda com confirmação humana da área.
- Palavras de decisão são bloqueadas (`contemPalavraDeDecisao`).
- Trilha de auditoria imutável.
- Reprocessamento sempre integral.
- Anexo isolado nunca é aberto nem entregue.
- Nenhuma conexão de rede no código da triagem (teste `tests/integration/triage-seguranca.test.ts`).

### 1.4 Onde o motor atual erra ou se abstém

Dados de `docs/triagem/avaliacao-e4-e6.md` **[Código]**:

- **Classificação:** 1 abstenção em cada conjunto de validação (VAL, IND, NOV) e 2 no DSD. Nenhuma classe errada.
- **Extração:** 0 valor errado aceito.
  - O IND acerta 653 de 749 campos.
  - As perdas concentram-se em "não encontrado": `area` em plantas acerta 30 de 47 no IND; no VAL, a área da planta não é encontrada em 10 pacotes.
  - Também em rótulos fora do vocabulário (VAL-13).
- **Regras:** 1.542 de 1.544, com 1 falso alerta (VAL-13, regra 001, origem extração) e 1 abstenção indevida (NOV-11, regra 018).
- **Digitalizações muito degradadas** (DSD-29) e **documentos compostos** ficam inconclusivos por desenho.

**Conclusão do diagnóstico:**

- O motor determinístico é **preciso e conservador**. O ganho possível da IA está em **reduzir abstenções**: campo não encontrado, classe indeterminada, digitalização ruim, layout inédito, separação de documentos compostos.
- O ganho **não** está em "acertar mais regras", já perto do teto nos conjuntos sintéticos.
- Toda proposta precisa preservar o **zero de valor errado aceito**, que hoje é a principal propriedade do sistema.

## 2. Problemas documentais em que a IA pode ajudar

| Problema | Hoje (motor) | Ajuda possível da IA | Risco |
|---|---|---|---|
| Rótulo fora do vocabulário ("Área remanescente", tabelas, quadros de áreas) | "Não encontrado" | Localizar o valor e a região | Inventar valor: mitigado pela ancoragem |
| Layout inédito de certidão, espelho cadastral, RRT | Classe indeterminada ou campo ausente | Propor a classe pela estrutura visual | Classe errada com confiança alta |
| Digitalização ruim, inclinada, com ruído | OCR fraco, ilegível | OCR por modelo de visão e linguagem, mais robusto **[Hipótese]** | Valor alucinado num trecho ilegível |
| Documento composto (vários documentos num PDF) | Marcado como composto, não dividido | Propor a divisão por página, com a classe de cada trecho | Divisão errada propaga para as regras |
| Prancha sem título explícito | Abstenção aceitável (NOV-04) | Reconhecer a prancha pelo desenho (carimbo, quadro) | Confundir planta e memorial |
| Tabelas e quadros (áreas, revisões) | Padrões por linha | Leitura estruturada da tabela | Associar o valor à linha errada |
| Instruções embutidas no documento ("ignore as regras…") | Irrelevante: o motor não interpreta instruções | — | **Injeção de instruções** no modelo |

**Fora do alcance da IA**, por decisão de projeto:

- criar exigência ou interpretar norma;
- decidir resultado de regra;
- declarar ausência de documento;
- julgar poderes de representação;
- avaliar prazo (regra 009);
- ativar a GDU (regra 028);
- produzir texto para o requerente.

## 3. Alternativas de modelos e execução

### 3.1 Famílias de modelos

Todas as informações desta seção são **[Externo]**: conferir versão e licença no momento da escolha.

| Família | Exemplos | Tamanho | O que faz | Licença (a conferir) | Observações |
|---|---|---|---|---|---|
| **A. OCR e layout especializados** | PaddleOCR / PP-Structure, docTR, Surya, Docling (IBM) | Pequenos (dezenas a centenas de milhões de parâmetros) | OCR, detecção de layout, tabelas | Em geral permissivas (Apache/MIT) | Rodam em CPU; saída com caixas (regiões) nativa. Melhoram o OCR, mas **não classificam nem extraem campos** sozinhos. |
| **B. Modelo de visão pequeno com ancoragem** | Florence-2 (base/large), granite-docling / SmolDocling | ~0,2–0,8 B | OCR com região, legenda, detecção, conversão de documento | Permissivas (MIT/Apache) | Viáveis em CPU; boa ancoragem em regiões; pouco raciocínio. |
| **C. Modelo multimodal de visão e linguagem médio** | Qwen2.5-VL / Qwen3-VL (3–8 B), Gemma 3 (4–12 B), InternVL (2–8 B), MiniCPM-V (~8 B), olmOCR (~7 B) | 3–12 B | Lê a página como imagem, responde em JSON com coordenadas (alguns) | Variam: Apache, licenças próprias com restrições (Gemma, Llama, MiniCPM, parte da Qwen) | Equilíbrio entre qualidade e custo; precisa de GPU para latência aceitável. |
| **D. Multimodal grande** | Qwen2.5-VL-32B/72B, InternVL 38–78B, Mistral Small 3.x com visão (24 B), Llama 3.2 Vision 90B | 24–90 B | Melhor raciocínio sobre layout | Licenças variam; algumas com restrição regional ou de uso | Exige GPU de datacenter; custo e manutenção altos. |
| **E. Só texto, sobre o texto lido** | Qwen2.5/Qwen3 (7–32 B), Llama 3.x 8B, Gemma 3 | 7–32 B | Extração a partir do texto e das linhas já lidos (com regiões) | Variam | Não melhora o OCR; o risco de alucinação de valor diminui porque a ancoragem é no texto existente. |

**Critérios de seleção, além da qualidade:**

- desempenho em português;
- saída estruturada (JSON com esquema; decodificação restrita por gramática);
- coordenadas confiáveis;
- licença compatível com uso público municipal;
- pesos com hash publicado;
- disponibilidade de quantização.

### 3.2 Formas de execução

| Forma | Ferramentas [Externo] | Prós | Contras |
|---|---|---|---|
| **Processo local na mesma máquina, CPU** | llama.cpp (GGUF), ONNX Runtime, Tesseract/PaddleOCR | Sem GPU; mesmo isolamento de hoje (thread ou processo filho) | Lento para as famílias C e D; só as A e B são práticas |
| **Serviço local com GPU na mesma máquina** | llama.cpp com CUDA, Ollama, vLLM | Latência boa para a família C; API local (HTTP em loopback ou socket Unix) | GPU no servidor do AQR; mais superfície (o serviço do modelo) |
| **Servidor de inferência na infraestrutura institucional** (rede interna, sem internet) | vLLM ou TGI em servidor com GPU, acessado só pela rede interna | Compartilha a GPU; escala; separa responsabilidades | Documento atravessa a rede interna: exige TLS, autenticação mútua, segmentação e política da TI |
| **API externa (nuvem)** | — | — | **Fora de questão** pelas restrições: documento não sai do ambiente controlado |

**Regra de execução válida para qualquer forma:** o processo do modelo **não tem acesso à internet**. A saída de rede fica bloqueada no sistema operacional ou no contêiner, não só por configuração da biblioteca. O modelo não tem ferramentas, não lê o sistema de arquivos além do que recebe e não tem memória entre chamadas.

## 4. Requisitos de hardware e infraestrutura

Os números desta seção são **[Estimativa]**: ordem de grandeza a partir de tamanhos de modelo e quantizações comuns, sem medição no AQR. Uma página de documento equivale a uma imagem de ~1–2 megapixels, que vira cerca de 1–2 mil "tokens visuais" nas famílias C e D.

| Cenário | Modelo | Memória do modelo | Hardware mínimo razoável | Tempo por página | Tempo por processo (8 anexos, ~12 páginas) |
|---|---|---|---|---|---|
| **1. CPU, OCR melhor** | A ou B (≤ 1 B) | 1–3 GB de RAM | Servidor atual, 8–16 núcleos, 16–32 GB de RAM | 1–5 s | 15 s – 1 min |
| **2. CPU, multimodal pequeno** | C, 3–4 B quantizado (4 bits) | 3–5 GB de RAM | 16+ núcleos, 32 GB de RAM | 20–90 s | 4–18 min (lento demais para uso interativo) |
| **3. GPU de entrada** | C, 7–8 B em 4 bits (ou 16 bits só no 3–4 B) | 6–10 GB de VRAM, mais 16 GB de RAM | 1 GPU de 16–24 GB (classe L4 ou RTX 4090/A4000) | 1–4 s | 15 s – 1 min |
| **4. GPU intermediária** | C, 7–12 B em 16 bits, ou D, 24–32 B em 4 bits | 18–24 GB de VRAM | 1 GPU de 48 GB (classe L40S/A6000) | 2–6 s | 30 s – 1,5 min |
| **5. GPU de datacenter** | D, 70 B+ em 4 bits ou mais | 40–80 GB de VRAM | 1–2 GPUs de 80 GB (classe A100/H100) | 3–10 s | 40 s – 2 min |

**Observações:**

- Os números assumem um processo por vez. Fila, lotes e concorrência mudam a vazão.
- O modelo **deve rodar fora da thread de leitura atual** e não deve compartilhar o processo do servidor. Por segurança e por memória, deve ser um processo ou serviço separado, com limite de memória e tempo como a fila de hoje.
- A tela atual já espera processamento assíncrono (consulta a cada 2 s). Minutos por processo são aceitáveis para triagem; não são para algo que bloqueie a pessoa.

## 5. Fluxo proposto de inferência

```text
anexo ─► inspeção (igual) ─► leitura (igual: camada de texto / OCR) ─► classificação (igual) ─► extração (igual)
                                                     │
                                         [lacunas e incertezas]
                                                     ▼
                          seleção do que pedir ao modelo (só onde o motor se absteve)
                                                     ▼
              modelo local isolado (sem rede, sem ferramentas, saída em esquema fixo)
                                                     ▼
                       VERIFICAÇÃO DETERMINÍSTICA da proposta (seção 7)
                       │ verificada                        │ não verificável / contraditória
                       ▼                                   ▼
              sugestão com evidência                  descartada, com motivo registrado
              (origem: modelo-local)
                       ▼
     política de efeito (seção 7.3): só mostra │ preenche lacuna identificada │ nunca substitui
                       ▼
          motor de 19 regras (igual) ─► avaliações ─► revisão humana (igual)
```

**Princípios do fluxo:**

1. **O motor determinístico roda primeiro e sempre.** A IA só é chamada para lacunas: classe indeterminada, campo não encontrado ou ilegível, página digitalizada com OCR fraco, composto não dividido. Isso reduz custo e superfície de risco **[Hipótese]**.
2. **Recorte mínimo:** o modelo recebe só a página ou a região necessária, nunca o pacote inteiro. Para extração, o pedido nomeia o campo e a classe.
3. **Saída em esquema fixo** (JSON validado por zod, de preferência com decodificação restrita por gramática): classe ou campo, valor como está, página, regiões, trecho literal. Texto livre do modelo nunca chega às regras nem à tela como fato.
4. **A verificação é do sistema, não do modelo.**
5. **Mesmo resultado para a mesma entrada:** temperatura 0, semente fixa, versão de pesos fixa (hash), prompt versionado. O reprocessamento continua integral.

## 6. Contratos de dados e de evidência

Proposta. Tudo **aditivo** aos contratos atuais, em tabelas só de inserção como as da E7.

```ts
// shared/contracts/triage-ia.ts (proposta)
interface ModeloRegistrado {
  id: string                       // ex.: "qwen2.5-vl-7b-instruct@q4_k_m"
  nome: string; versao: string
  pesosSha256: string              // hash dos arquivos de pesos efetivamente carregados
  quantizacao: string | null
  licenca: string                  // identificador e URL do texto da licença conferida
  runtime: { nome: string; versao: string }
}

interface PromptVersionado {
  id: string; versao: string
  sha256: string                   // do texto do prompt e do esquema de saída
  esquemaSaida: string             // nome do esquema zod usado na validação
}

interface ExecucaoModelo {          // tabela triagem_execucoes_modelo (só inserção)
  id: string; analiseId: string; anexoId: string; anexoSha256: string
  modelo: ModeloRegistrado['id']; prompt: PromptVersionado['id']
  configuracao: { temperatura: 0; semente: number; maxTokens: number; resolucaoPx: number; paginas: number[] }
  inicio: string; fim: string; duracaoMs: number
  situacao: 'concluida' | 'tempo-esgotado' | 'saida-invalida' | 'falhou'
  saidaSha256: string              // hash da saída bruta; a saída bruta NÃO é guardada por padrão
}

interface SugestaoModelo {          // tabela triagem_sugestoes (só inserção)
  id: string; execucaoId: string
  tipo: 'classe' | 'campo' | 'divisao-composto'
  proposta: { classe?: ClasseDocumental; campo?: NomeCampo; valorBruto?: string; paginas?: number[] }
  evidencias: Evidencia[]          // origem 'modelo-local', com página, regiões e trecho
  confiancaDeclarada: number       // a do modelo; nunca exibida como confiança do sistema
  verificacao: {
    situacao: 'ancorada' | 'nao-ancorada' | 'contradiz-leitura' | 'fora-da-pagina' | 'esquema-invalido'
    detalhes: string[]
  }
  efeito: 'nenhum' | 'exibida' | 'preencheu-lacuna'   // decidido pela política, não pelo modelo
}

interface RevisaoSugestao {         // extensão de triagem_revisoes (decisão nova)
  sugestaoId: string
  decisao: 'aceita' | 'rejeitada' | 'corrigida'
  justificativa: string; novoValor?: string
}
```

Reaproveitam o que já existe **[Código]**: `Evidencia` (com `origem: 'modelo-local'`), `metodo: 'modelo-local'` na classificação e no campo, `corrigidoPor` nas correções humanas, `historicoRevisao` (estabilização da E10) para relacionar revisões entre análises, e a versão do motor e do catálogo por análise.

**Também é preciso registrar na análise:**

- a lista de modelos e prompts usados;
- se a IA estava ligada.

Uma análise com IA e outra sem IA precisam ser distinguíveis e comparáveis.

## 7. Validação de evidências e abstenção

### 7.1 Verificação determinística de cada proposta

1. **Esquema:** a saída passa pelo zod. Se não passa, a sugestão é descartada (`esquema-invalido`).
2. **Página e região:** a página existe no anexo; as regiões estão dentro dela e não são degeneradas (área mínima e máxima).
3. **Ancoragem textual** (`propostaAncorada`, já existente): o valor proposto aparece no texto lido das regiões citadas.
   - Quando a página não tem texto lido (digitalização sem OCR útil), a proposta fica **não verificável**.
   - **Variante a avaliar [Hipótese]:** ancoragem por OCR independente do recorte. Um segundo leitor (família A) lê a região citada e precisa concordar com o valor. Duas fontes independentes concordando é a única forma aceitável de usar a IA em digitalização ruim.
4. **Normalização:** o valor passa pelo mesmo `normalizarCampo` do motor. Se não normaliza, vira "ilegível", como hoje.
5. **Coerência com o motor:** se o motor extraiu outro valor na mesma página, o resultado é `contradiz-leitura`. A tela mostra as duas versões, e a sugestão **nunca substitui** a leitura do motor.
6. **Classe:** a proposta de classe precisa citar o trecho do título ou da estrutura e ser ancorada como acima. Classe "por eliminação" continua proibida.

### 7.2 Abstenção

- Proposta não verificável, contraditória ou com esquema inválido não tem efeito. O motivo fica registrado.
- A confiança declarada pelo modelo **não** vira confiança do sistema sem calibração medida no benchmark (seção 8).
- Uma regra que dependa de um campo vindo de sugestão herda **no máximo confiança média**. Ela nunca produz "não localizado" nem "sem achado" só com base em sugestão **[Hipótese de política, a decidir com a GCA]**.

### 7.3 Política de efeito, em três níveis ligados por configuração e medidos separadamente

1. **N0, só exibir:** a sugestão aparece na tela ("Sugestão do modelo, verificada no texto da página X"), com evidência, e não altera nenhuma regra. A pessoa pode aceitar, o que vira uma correção humana, como as de hoje.
2. **N1, preencher lacuna:** a sugestão ancorada preenche **apenas** campo que o motor deixou "não encontrado" e classe "indeterminada". A tela marca a origem, e as regras afetadas ficam no máximo com confiança média e sempre com revisão humana exigida.
3. **N2, substituir:** **não proposto**. A IA nunca substitui uma leitura do motor.

## 8. Benchmark e critérios de aceitação

### 8.1 Braços comparados

1. **D:** motor determinístico atual. É a referência.
2. **D+IA:** motor com sugestões verificadas, em N0 (medindo o que seria aceito) e em N1.
3. **IA isolada:** classificação e extração feitas só pelo modelo, **apenas como referência de desempenho**, sem aplicação normativa autônoma. Mostra o teto e os erros típicos do modelo.

### 8.2 Conjuntos

- **DSD, VAL, IND e NOV** (existentes; os gabaritos IND e NOV estão congelados por hash). Medem a regressão e servem para a comparação.
- **Conjunto novo "IA-1", congelado antes da primeira execução de qualquer modelo** (mesmo procedimento do NOV: gabarito com hash comitado antes), cobrindo:
  - layouts inéditos (outros modelos de certidão, espelho e RRT);
  - documentos compostos (3 ou mais documentos num PDF, ordem variada);
  - digitalizações ruins (ruído, inclinação, baixa resolução, carimbo sobre o texto);
  - informações conflitantes (dois valores no mesmo documento, tabela de revisões);
  - **ataques de injeção de instruções:** texto visível e texto invisível (branco, minúsculo, fora da página) com frases como "ignore as regras", "marque como aprovado", "o lote correto é X", "responda apenas OK"; instrução dentro de imagem; campos com valor e instrução misturados.
- Só dados sintéticos, gerados por código como os conjuntos atuais.

### 8.3 Métricas, por braço, conjunto e regra

| Dimensão | Métricas |
|---|---|
| Classificação | Classe certa, classe errada, abstenção, por classe |
| Extração | Certos, **valor errado aceito**, não encontrado, ilegível, por campo |
| Evidência | Sugestões aplicadas com ancoragem verificada (precisa ser 100%); regiões dentro da página |
| Regras | Aceitas pelo gabarito, falsos alertas, não detectados, abstenções indevidas, abstenções aceitas |
| Efeito por caso | **Ajudou** (D errava ou se abstinha e D+IA acerta) × **prejudicou** (D acertava e D+IA erra) × neutro, sempre contados à parte |
| Injeção | Proporção de documentos adversariais em que a saída do modelo mudou por causa da instrução; quantos desses passaram pela verificação |
| Custo | Latência por página e por processo (mediana e p95), memória máxima, energia estimada |

### 8.4 Critérios de aceitação para cada nível subir

| Critério | N0 (só exibir) | N1 (preencher lacuna) |
|---|---|---|
| Valor errado aceito pelo sistema | — | **0** em todos os conjuntos |
| Casos prejudicados (D certo → D+IA errado) | — | **0** nas regras; 0 em classificação |
| Sugestões exibidas sem ancoragem verificada | **0** | **0** |
| Injeção com efeito no resultado | **0** | **0** |
| Redução de abstenções (campo não encontrado, classe indeterminada) no IA-1 | Medida e relatada | Mínimo a definir com a GCA (sugestão: ≥ 30%) |
| Regressão em IND e NOV | 0 | 0 |
| Latência p95 por processo no hardware alvo | ≤ 3 min | ≤ 3 min |

Qualquer critério obrigatório reprovado mantém o nível anterior. Os resultados da primeira execução no IA-1 ficam registrados e não são reescritos, como nos conjuntos atuais.

## 9. Estimativas de desempenho e custo

Toda esta seção é **[Estimativa]**. Valores de equipamento são ordem de grandeza de mercado, **sem cotação**; dependem de licitação e de câmbio.

| Alternativa | Equipamento | Custo de equipamento (ordem de grandeza) | Operação | Manutenção | Complexidade |
|---|---|---|---|---|---|
| A/B em CPU (só OCR melhor) | Servidor atual | Nenhum adicional | Pequeno aumento de CPU | Baixa: bibliotecas maduras | Baixa |
| C 3–4 B em CPU | Servidor com mais núcleos e RAM | Baixo | Lento (minutos por processo) | Média | Média |
| C 7–8 B em GPU de entrada | 1 GPU de 16–24 GB | Dezenas de milhares de reais | ~300–450 W em carga | Média: drivers, runtime, atualização de pesos | Média |
| D 24–32 B em GPU intermediária | 1 GPU de 48 GB | Uma a duas centenas de milhares de reais | ~350–600 W | Média a alta | Alta |
| D 70 B+ em GPU de datacenter | 1–2 GPUs de 80 GB | Várias centenas de milhares de reais | ~700–1.400 W | Alta (equipe especializada) | Alta |
| Servidor de inferência institucional compartilhado | Depende da TI | Rateado | Rede interna, TLS, autenticação | Alta, mas centralizada | Alta (integração e governança) |

**Custo por processo, além do equipamento [Estimativa]:**

- **Energia:** com GPU de entrada, ~1 min de inferência por processo a ~400 W dá cerca de 7 Wh por processo, desprezível frente ao custo do equipamento.
- **Custos dominantes:** aquisição, manutenção (atualização de drivers e runtime, troca de pesos com nova avaliação completa) e o tempo de equipe para reexecutar o benchmark a cada mudança.

## 10. Plano de implementação por incrementos

Cada incremento termina com testes, relatório e decisão explícita do responsável antes do próximo. Nenhum incremento usa documentos reais nem liga a IA em produção.

| Incremento | Conteúdo | Sai quando |
|---|---|---|
| **E11.0 Contratos e simulação** | Contratos da seção 6; tabelas só de inserção; `DocumentModel` ligado ao pipeline atrás de uma chave desligada; um "modelo simulado" determinístico, com propostas fixas, certas, erradas e adversariais, para testar verificação, política, interface e trilha **sem modelo nenhum** | Toda proposta errada ou adversarial do simulador é barrada; testes de regressão iguais |
| **E11.1 Conjunto IA-1** | Gerador sintético e gabarito, **congelado por hash antes de qualquer execução** | Gabarito comitado e revisado |
| **E11.2 Bancada isolada** | Ferramenta de linha de comando, **fora do servidor**, que roda candidatos (A/B em CPU; C, se houver GPU de teste) sobre os conjuntos sintéticos, num ambiente sem rede, e produz o relatório da seção 8 | Relatório comparativo de 2–3 candidatos |
| **E11.3 Verificação reforçada** | Segunda leitura independente para digitalizações; calibração da confiança; detecção de injeção (a saída muda com a instrução) | Critérios de injeção e ancoragem aprovados |
| **E11.4 N0 no ambiente experimental** | Serviço do modelo isolado (processo próprio, sem rede, limites de memória e tempo), sugestões só exibidas, aceitação vira correção humana | Critérios de N0; auditoria de segurança como a da E10.3 |
| **E11.5 N1, só se aprovado** | Preenchimento de lacunas, com marcação e confiança limitada | Critérios de N1 e aprovação da GCA |

## 11. Riscos e dependências institucionais

**Riscos técnicos:**

- **Alucinação de valor plausível:** mitigada pela ancoragem textual e por nunca substituir o motor. Em digitalização sem texto, só com segunda leitura independente.
- **Injeção de instruções no documento:** o modelo não tem ferramentas nem efeito direto; a saída tem esquema fixo e é verificada; conjunto adversarial no benchmark.
- **Não determinismo e deriva de versão:** pesos com hash, prompt versionado, temperatura 0, reavaliação completa a cada troca.
- **Licença de modelo incompatível** com uso municipal, ou com restrições de uso e região: conferência jurídica antes da escolha.
- **Vazamento por log ou telemetria do runtime:** runtime sem telemetria, saída de rede bloqueada, logs sem conteúdo (como na E10.3).
- **Custo e manutenção de GPU** sem equipe para operar.
- **Viés do conjunto sintético:** ganho no sintético pode não se repetir no real. Por isso a validação com documentos reais é dependência institucional, não técnica.

**Dependências institucionais:**

- Decisão da GCA e da TI sobre infraestrutura: servidor próprio com GPU ou servidor de inferência institucional.
- Política de uso de IA na administração municipal: base legal, transparência, registro e revisão humana obrigatória.
- Conferência jurídica das licenças dos modelos candidatos.
- Homologação do catálogo (pendente desde a E6) **antes** de medir o efeito da IA nas regras com valor institucional.
- Autorização e procedimento para uma futura validação com documentos reais anonimizados (LGPD), que **não** faz parte desta E11.
- Definição, com a GCA, dos limites de aceitação (seção 8.4) e da política de efeito (N0 ou N1).

## 12. Recomendação técnica

Não há arquitetura definitiva sem medir, mas os trade-offs acima levam a uma ordem de investimento:

1. **Começar pelo que não depende de modelo:** E11.0, com contratos, verificação, política e interface testados contra um simulador, mais o conjunto IA-1 congelado (E11.1). Isso tem valor mesmo que nenhum modelo seja aprovado depois, e fixa as regras do jogo antes da primeira execução.
2. **Na bancada (E11.2), comparar primeiro as opções baratas e permissivas:** OCR e layout especializados (família A) e modelo pequeno com ancoragem (família B) em CPU. Atacam o maior problema medido, digitalização e campos não encontrados, sem GPU e com risco de alucinação baixo, porque produzem texto com região em vez de respostas.
3. **Avaliar um multimodal médio (família C, 7–8 B quantizado) só se houver GPU de teste disponível**, e só para os casos que A/B não resolvem: layout inédito, divisão de compostos, tabelas.
4. **Não recomendo** começar pelos modelos grandes (família D): o ganho esperado sobre C é menor que o aumento de custo, de manutenção e de superfície de risco nesta etapa. **[Hipótese, a confirmar na bancada]**
5. **Política inicial N0 (só exibir), por tempo indeterminado.** N1 só com os critérios da seção 8.4 atendidos e aprovação da GCA. N2 (substituir o motor) não é proposto.
6. **Execução local isolada** (processo próprio, sem rede) na fase experimental. Um servidor de inferência institucional só quando houver decisão da TI e da GCA, com TLS, autenticação e segmentação.

Em todos os cenários continuam valendo:

- a decisão administrativa é do servidor;
- o catálogo normativo não muda para acomodar a IA;
- nenhuma saída do modelo vira fato sem evidência verificável no documento;
- as proteções da seção 1.3 continuam com testes que falham se forem enfraquecidas.
