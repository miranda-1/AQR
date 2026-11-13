# Relatório da E7 (persistência e auditoria) e da E8 (API), 12/11/2026

## Push autorizado da E6.1
Antes do push, conferi:
- a branch `dev` e o estado do repositório (só o `AGENTS.md` fora, sem ser incluído);
- o diff de 20 arquivos: sem segredos nem dados privados (a única ocorrência de "CPF" é a menção ao número fictício de teste);
- sem workflow, webhook, implantação ou verificação ligados ao repositório.

Push sem force de `bde806b..59cb942` para a `dev`. A `master` continua em `62a02e0`. Sem release.

## 1. Arquitetura de persistência
- **Banco:** SQLite (`node:sqlite`), migração `0008_triagem`. Tabelas: `triagens`, `triagem_anexos`, `triagem_versoes`, `triagem_analises`, `triagem_leituras`, `triagem_classificacoes`, `triagem_campos`, `triagem_avaliacoes`, `triagem_evidencias`, `triagem_confirmacoes`, `triagem_revisoes`, `triagem_eventos`.
- **Imutabilidade garantida por triggers:**
  - resultados, evidências, confirmações, revisões, eventos e versões são só de inserção;
  - a análise encerrada não muda;
  - os metadados do anexo não mudam, e o conteúdo só passa de `armazenado` a `expurgado`;
  - processo não é excluído, e a identidade e a autoria dele são imutáveis.
- **Integridade:** cada processo tem UUID estável; cada anexo, SHA-256; cada análise guarda a versão do motor (`aqr-triagem@6.1.0`), a versão e o SHA-256 do catálogo, os hashes dos anexos usados e a entrada (enquadramento) aplicada.
- **Serviço** (`server/triage/store/service.ts`):
  - transações `BEGIN IMMEDIATE` e concorrência otimista pela `versao` do processo (409);
  - acesso só do criador ou de administrador;
  - idempotência pela `Idempotency-Key` da pessoa;
  - recuperação de análises interrompidas na inicialização;
  - retomada pelo conteúdo cifrado.
- **Estado para reprocessar:** inspeção, páginas, legibilidade, áreas de assinatura, classificação e campos com evidência, **sem o texto integral** dos documentos.
- **Logs:** a trilha `triagem_eventos` guarda ações, números e ids, nunca trechos nem valores. Os logs operacionais só levam ids e códigos técnicos.

## 2. Migrações
- `0008_triagem` (nova).
- `server/db/migrate.test.ts`: a lista de migrações esperadas passou a incluir a 0008, o mesmo ajuste feito quando a 0007 entrou.

## 3. Endpoints
`GET /api/triagem/status` e, sob `/api/triagens`:
- `POST /`, `GET /`, `GET /:id`;
- `GET /:id/anexos`, `GET /:id/avaliacoes`, `GET /:id/campos`, `GET /:id/anexos/:anexoId/conteudo`;
- `POST /:id/condicoes`, `POST /:id/revisoes`, `POST /:id/reprocessar`.

Detalhes, papéis e exemplos: `docs/triagem/api-triagem.md`.

## 4. Contratos e validações
- `shared/contracts/triage-api.ts` (zod). Entrada estrita: campo desconhecido dá 400, e o cliente não envia resultado de regra. Saída validada antes do envio.
- Limites:
  - quantidade de anexos (`TRIAGEM_MAX_ANEXOS`), tamanho por arquivo (50 MB) e do pacote (`TRIAGEM_MAX_BYTES_PACOTE`);
  - JSON pequeno;
  - fila e threads com limite de memória e de tempo.
- Nomes de arquivo saneados e nunca usados como caminho. Tipo real, integridade, isolamento de suspeitos e ZIP perigoso ou desproporcional são conferidos pelo conteúdo (E3).

## 5. Armazenamento e retenção
- **Modo:** `TRIAGEM_MODO=experimental-sintetico`, recusado em produção.
- **Conteúdo:** só com `TRIAGEM_CONTEUDO_CHAVE`:
  - AES-256-GCM, com IV por arquivo e a referência autenticada;
  - nome aleatório; pasta 700 e arquivos 600;
  - a chave fica na configuração, nunca na pasta nem no log;
  - SHA-256 conferido na leitura; adulteração é recusada.
- **Expurgo verificável:** depois de `TRIAGEM_RETENCAO_HORAS`, com evento `conteudo.expurgado` e `verificado: true`. Sem chave, só metadados e resultados.
- **Bloqueio para documentos reais:** política de retenção e de acesso homologada, cofre de chaves, backup e expurgo do banco. Registrado e não contornado.

## 6. Revisão humana
- **Confirmações** (`triagem_confirmacoes`): modalidade, etapa, completude do pacote (exige justificativa: ação explícita e rastreável) e condições do catálogo, como `area-situacao-acima-2ha`. Sempre com autor e instante; a última de cada tipo vale.
- **Revisões** (`triagem_revisoes`):
  - confirmar ou descartar achado (descartar exige justificativa);
  - encaminhar qualquer resultado;
  - corrigir campo (exige justificativa; guarda o valor anterior e o novo).
- A análise e o campo originais não mudam. O processo passa a `revisado` quando todos os achados da análise atual foram revisados.
- **Papéis:** o analista revisa os próprios processos; o administrador acompanha, mas não revisa nem confirma (separação de funções).

## 7. Reprocessamento
- Nova análise a partir do estado guardado da atual, com as correções (campo novo, `metodo: servidor`, `corrigidoPor`, evidência "corrigido por servidor") e as confirmações.
- **Só as regras afetadas** são recalculadas. O mapa `DEPENDENCIAS` diz, por regra, os campos que ela lê, se depende da completude do pacote e, pelo catálogo, as condições. Modalidade ou etapa nova recalcula tudo.
- As demais regras são copiadas com `recalculada: false` e `origemAnalise`.
- O motor roda inteiro como verificação: regra "não afetada" que muda é recalculada e registrada como `dependenciaNaoPrevista`. Foi essa verificação que expôs o defeito de ordem das leituras, corrigido na E7.
- Sem análise concluída (falhou ou foi interrompida): a **retomada** usa o conteúdo cifrado e volta para a fila.

## 8. Testes e resultados
- **E7, `server/triage/store/service.test.ts`** (14 testes):
  - gravação com versões e hashes; estado sem texto integral;
  - idempotência; integridade transacional (nada fica, nem o conteúdo);
  - imutabilidade por trigger; acesso e evento de acesso negado; concorrência;
  - pacote incompleto × confirmado; correção com reprocessamento das afetadas; revisões;
  - condição da 028; reinício; conteúdo cifrado, adulteração e expurgo; sem chave.
- **E8, `server/triage/api/routes.test.ts`** (10 testes, multipart e threads reais):
  - criação e consulta; corrompidos, extensões falsas e executável isolado;
  - limites; permissões por papel e acesso a processo alheio;
  - idempotência e concorrência (duas ações simultâneas: 201 e 409);
  - pacote incompleto × confirmado; correção seguida de reprocessamento, com a análise 1 preservada;
  - revisões imutáveis e ausência de rotas de decisão;
  - reinício com retomada; triagem desligada por padrão.
- **Configuração:** padrão desligado, recusa em produção e validação da chave.
- **Regressão da comparação de PDFs:** todos os testes existentes passam, sem alteração.
- **Resultado:** lint e typecheck limpos; **605 testes passando, 4 pulados** (Ghostscript ausente, comparação); build aprovado, com `dist-server/server/triage/worker.js` gerado.

Defeitos achados pelos testes e corrigidos:
- leituras voltavam do banco sem ordem;
- no desligamento, a análise ficava "falhou" em vez de "interrompida" (agora o cancelamento é marcado no `preClose`);
- mensagens de limite de upload eram as da comparação;
- chave de conteúdo vazia no `.env.example` derrubaria a inicialização.

## 9. Exemplos
Em `docs/triagem/api-triagem.md`, capturados de uma execução real com o pacote sintético DSD-16:
- criação;
- avaliação 018 com quadro de valores e evidências;
- confirmação da completude, descarte justificado do achado e reprocessamento (9 regras recalculadas, 10 reaproveitadas);
- conflito de versão e processo alheio.

## 10. Commits (locais, sem push)

| Commit | Etapa |
|---|---|
| `df1f541` | E7: persistência, revisão humana e trilha de auditoria |
| `5b06547` | E8: API autenticada e auditável |
| o commit deste relatório | Relatório |

## 11. Limitações e bloqueios
- **Documentos reais:** bloqueados por configuração até haver política de retenção e acesso, cofre de chaves e backup e expurgo do banco.
- **Fila em memória:** a tarefa não sobrevive ao reinício; a análise fica `interrompida` e é retomada manualmente (`reprocessar`) se houver conteúdo cifrado. Não há retomada automática.
- **Tamanho do pacote:** o envio é lido em memória (até `TRIAGEM_MAX_BYTES_PACOTE`); pacotes grandes pedem streaming para disco temporário cifrado.
- **Leitura:** a consulta usa o SQLite local, e uma instância só. Mais de uma instância exigiria banco compartilhado.
- **Evidência visual:** a API entrega o arquivo sintético inteiro, para download. O recorte da página com a região da evidência fica para a interface (E9).
- **Mapa `DEPENDENCIAS`:** é mantido à mão. A verificação pelo motor inteiro acusa omissões, mas não substitui revisão do mapa quando uma regra mudar.
- **Escopo:** a autenticação de desenvolvimento (cabeçalho) só vale localmente; os testes da API usam esse modo, e o login real usa o mesmo `AuthProvider`.

## 12. Prontidão para a E9
O backend oferece tudo o que uma interface de revisão precisa: processos por pessoa, análises versionadas, avaliações com evidência (página e região), quadro de valores, fundamentos e limitações, campos com ids para correção, confirmações e revisões auditadas e reprocessamento incremental.

Pendências para a E9:
- desenhar a tela `/triagem`, mantendo a identidade visual e a tela de login;
- decidir se a evidência visual é recortada no servidor ou no navegador;
- definir o comportamento com a triagem desligada (mensagem "Em desenvolvimento").

Não há bloqueio técnico para começar. Os bloqueios para documentos reais continuam os do item 11.
