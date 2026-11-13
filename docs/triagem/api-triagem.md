# API da triagem documental experimental (E7–E8)

Backend da triagem: recebe pacotes **sintéticos**, roda o núcleo (leitura → classificação → extração → comparação → 19 regras), guarda o resultado com a versão do catálogo e as evidências, e registra confirmações e revisões humanas. **Não decide:** não há rota nem campo para aprovar, indeferir, anuir, arquivar ou comunicar o requerente. O catálogo `1.0-review` não é homologado pela GCA.

## Como ligar

| Variável | Padrão | Uso |
|---|---|---|
| `TRIAGEM_MODO` | `desativada` | `experimental-sintetico` liga a API. **Recusado em produção.** |
| `TRIAGEM_MAX_ANEXOS` / `TRIAGEM_MAX_BYTES_PACOTE` | 40 / 200 MB | Limites do pacote; cada arquivo até 50 MB. |
| `TRIAGEM_WORKERS` / `TRIAGEM_QUEUE_LIMIT` | 1 / 4 | Threads isoladas e fila (`IsolatedWorkerPool`, a mesma da comparação). |
| `TRIAGEM_TIMEOUT_MS` / `TRIAGEM_WORKER_MEMORY_MB` | 600000 / 1536 | Tempo e memória de cada thread. |
| `TRIAGEM_OCR` | `on` | OCR local (Tesseract); nada sai do servidor. |
| `TRIAGEM_CATALOGO_DIR` | `docs/triagem/catalogo` | Catálogo versionado (conferido ao iniciar). |
| `TRIAGEM_CONTEUDO_CHAVE` | vazio | Chave AES-256 (base64, 32 bytes). Sem ela, o conteúdo dos anexos **não** é guardado. |
| `TRIAGEM_CONTEUDO_DIR` / `TRIAGEM_RETENCAO_HORAS` | `data/triagem-conteudo` / 72 | Pasta privada do conteúdo cifrado e prazo de expurgo. |

A API exige pessoa identificada:
- **login real** (Keycloak escondido), ou
- **`ADMIN_API_MODE=dev`**: cabeçalho `X-AQR-Dev-Actor` com o usuário de uma conta ativa, só para pedidos do próprio computador.

Sem nenhum dos dois, a triagem fica desligada. `GET /api/triagem/status` informa se está disponível.

## Papéis

| Ação | Analista | Administrador |
|---|---|---|
| Criar processo (`POST /api/triagens`) | sim | não (403) |
| Listar e consultar | só os que criou | todos (supervisão) |
| Confirmar condições, revisar, reprocessar | só nos que criou | não (403) |
| Baixar o conteúdo sintético | só dos que criou | todos |

O processo de outra pessoa responde 404, sem revelar que existe, e a tentativa fica na trilha (`acesso.negado`).

## Endpoints

| Método e caminho | O que faz | Respostas |
|---|---|---|
| `POST /api/triagens` | multipart: campo `metadados` (JSON `{referencia, protocoladoEm, modalidade, etapa}`) e arquivos em `anexos`. Cabeçalho opcional `Idempotency-Key`. Valida quantidade, tamanho por arquivo e do pacote; tipo real, integridade e isolamento são conferidos pelo conteúdo na thread. | 202 (na fila), 200 (mesma chave), 400, 401, 403, 413, 415, 503 |
| `GET /api/triagens?limit&offset` | Processos visíveis à pessoa. | 200 |
| `GET /api/triagens/:id` | Processo, enquadramento atual (declarado ou confirmado), todas as análises (versão do motor, catálogo e hashes), confirmações e revisões. | 200, 404 |
| `GET /api/triagens/:id/anexos?analise=N` | Metadados, tipo real, integridade, isolamento e classificação com justificativa. | 200, 404 |
| `GET /api/triagens/:id/avaliacoes?analise=N` | As 19 avaliações com evidências, quadro de valores, fundamentos, limitações, revisões e se foi recalculada ou reaproveitada. Sem `analise`, a atual. | 200, 404, 409 |
| `GET /api/triagens/:id/campos?analise=N` | Campos extraídos (ids para correção). | 200, 404, 409 |
| `GET /api/triagens/:id/anexos/:anexoId/conteudo` | Conteúdo **sintético** decifrado, sempre como download. Expurgado ou não armazenado: 404. | 200, 404 |
| `POST /api/triagens/:id/condicoes` | `{versaoEsperada, tipo: modalidade\|etapa\|integridade\|condicao, valor, condicao?, justificativa}`. Integridade exige justificativa (≥ 5 caracteres): a confirmação de pacote completo é ação explícita e auditada. | 201, 400, 403, 404, 409 |
| `POST /api/triagens/:id/revisoes` | `{versaoEsperada, decisao: confirmado\|descartado\|encaminhado, regraId, justificativa}` ou `{versaoEsperada, decisao: corrigido, campoId, novoValor, justificativa}`. Descartar e corrigir exigem justificativa; só achado é confirmado ou descartado. | 201, 400, 403, 404, 409 |
| `POST /api/triagens/:id/reprocessar` | `{versaoEsperada}`. Com análise concluída: nova análise na hora, com as correções e as confirmações, recalculando só as regras afetadas. Sem análise concluída (falhou ou interrompida): retomada na fila a partir do conteúdo cifrado. | 201, 202, 404, 409, 503 |

Toda entrada e toda saída passam por esquemas zod (`shared/contracts/triage-api.ts`). Corpo com campo fora do contrato é recusado (400): o cliente não consegue enviar "resultado" de regra. Alterações levam `versaoEsperada`, e versão desatualizada recebe 409.

## Fluxo

1. A pessoa envia o pacote sintético. O servidor confere limites, grava o processo e os anexos (SHA-256; conteúdo cifrado, se houver chave), abre a análise 1 (`processando`) e põe na fila.
2. A thread isolada lê, classifica e extrai (OCR local). O processo principal roda as regras e grava tudo numa transação: leituras sem texto integral, classificações, campos, avaliações, evidências, versão do motor e do catálogo. O processo fica `aguardando-revisao`.
3. O analista consulta e registra confirmações (modalidade, etapa, completude do pacote, condições como `area-situacao-acima-2ha`) e revisões (confirmar, descartar, encaminhar achado; corrigir campo).
4. Reprocessar cria a análise seguinte. A anterior continua consultável (`?analise=1`).
5. Falha da thread: a análise fica `falhou`. Desligamento ou reinício: fica `interrompida`, marcada também na inicialização. O processo nunca fica preso em `processando`: volta à última análise concluída ou fica `falhou`, de onde pode ser retomado pelo conteúdo cifrado.

## Exemplos (pacote sintético DSD-16, respostas reais da suíte, abreviadas)

```bash
# Desenvolvimento: ADMIN_API_MODE=dev, TRIAGEM_MODO=experimental-sintetico; conta "ana.analista" ativa.
curl -s -X POST http://127.0.0.1:3000/api/triagens \
  -H 'X-AQR-Dev-Actor: ana.analista' -H 'Idempotency-Key: pacote-sintetico-01' \
  -F 'metadados={"referencia":"SINTETICO-001","protocoladoEm":"2026-11-05T13:00:00.000Z","modalidade":"D","etapa":"abertura"}' \
  -F 'anexos=@requerimento.pdf' -F 'anexos=@drt-01.pdf' -F 'anexos=@matricula.pdf' # …
```

```json
{ "triagem": { "id": "a79a4d61-…", "referencia": "SINTETICO-001", "modo": "experimental-sintetico",
    "situacao": "processando", "versao": 1, "analiseAtual": null, "retencaoAte": "2026-11-15T23:56:56.413Z", "criadaPorMim": true },
  "anexos": [ { "ordem": 1, "nome": "requerimento.pdf", "sha256": "7b0b5cbd…04dc", "bytes": 2138, "conteudo": "armazenado", "classificacao": null } ],
  "nova": true }
```

`GET /api/triagens/:id/avaliacoes`, regra 018:

```json
{ "analise": 1, "natureza": "verificacao-tecnica-experimental", "decisaoAdministrativa": null,
  "itens": [ { "regraId": "AQR-GCA-018", "regraVersao": "AQR-GCA-018@1.0-review+fd9b3e3b9db5",
    "resultado": "achado", "tipo": "divergencia", "severidade": "review", "confianca": "alta",
    "rascunho": "Verificação técnica experimental, para revisão de servidor (não enviar ao requerente sem revisão). Campos da ART/RRT: lote difere entre requerimento e matrícula/transcrição × ART/RRT. …",
    "evidencias": [ { "anexoId": "bd2475b6-…", "sha256": "7b0b5cbd…", "pagina": 1, "regioes": [ { "x": 0.140, "y": 0.193, "width": 0.021, "height": 0.015 } ], "trecho": "Lote: F7 Quadra: 12", "origem": "camada-de-texto" } ],
    "valoresConflitantes": [ { "campo": "lote", "valores": [ { "classe": "requerimento", "valorBruto": "F7" }, { "classe": "matricula-transcricao", "valorBruto": "F7" }, { "classe": "art-rrt-similar", "valorBruto": "C3" } ] } ],
    "recalculada": true, "origemAnalise": null, "revisoes": [] } ] }
```

Confirmação da completude, descarte do achado com justificativa e reprocessamento:

```http
POST /api/triagens/:id/condicoes  {"versaoEsperada": 2, "tipo": "integridade", "valor": "completo", "justificativa": "Conferido com o protocolo sintético."}   → 201
POST /api/triagens/:id/revisoes   {"versaoEsperada": 3, "decisao": "descartado", "regraId": "AQR-GCA-018", "justificativa": "Lote C3 é erro de digitação na ART sintética."}   → 201
POST /api/triagens/:id/reprocessar {"versaoEsperada": 4}   → 201
```

```json
{ "analise": 2,
  "recalculadas": ["AQR-GCA-002", "AQR-GCA-003", "AQR-GCA-006", "AQR-GCA-008", "AQR-GCA-010", "AQR-GCA-011", "AQR-GCA-012", "AQR-GCA-013", "AQR-GCA-028"],
  "reaproveitadas": ["AQR-GCA-001", "AQR-GCA-009", "AQR-GCA-016", "AQR-GCA-018", "AQR-GCA-019", "AQR-GCA-020", "AQR-GCA-021", "AQR-GCA-022", "AQR-GCA-023", "AQR-GCA-043"] }
```

Só as regras que dependem da completude do pacote foram recalculadas; as demais foram copiadas com referência à análise 1.

Versão desatualizada e processo de outra pessoa:

```json
{ "error": { "code": "CONFLITO_DE_VERSAO", "message": "O processo foi alterado por outra ação (versão 5). Atualize e tente de novo." } }
{ "error": { "code": "NAO_ENCONTRADA", "message": "Processo de triagem não encontrado." } }
```

## Armazenamento e retenção

A política institucional de retenção não foi homologada. Por isso:
- **só pacotes sintéticos:** o modo é recusado em produção;
- **conteúdo opcional e cifrado:**
  - só existe com chave configurada;
  - AES-256-GCM, com IV por arquivo e a referência como dado autenticado;
  - nome aleatório; pasta com permissão 700 e arquivos com 600;
  - a chave nunca fica na pasta nem no log;
  - hash conferido na leitura;
- **expurgo verificável:** passado `TRIAGEM_RETENCAO_HORAS`, o arquivo é apagado, a ausência é conferida e o evento `conteudo.expurgado` (com `verificado: true`) é gravado. Metadados e resultados sintéticos ficam;
- **sem chave:** só metadados e resultados. O reprocessamento funciona pelo estado guardado, que não tem o texto integral; só a retomada de uma análise inicial interrompida precisa do conteúdo.

**Bloqueio para documentos reais:**
- política de retenção e de acesso homologada;
- gestão da chave fora do servidor (cofre de segredos);
- backup e expurgo do banco;
- definição de quem acessa.

Nada disso existe ainda, e o código recusa o modo em produção.
