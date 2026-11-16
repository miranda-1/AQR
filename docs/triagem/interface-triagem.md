# Interface da triagem documental assistida (E9)

A interface do navegador para a triagem experimental de **desdobro (D) na abertura**, só com pacotes sintéticos. Ela consome a API da E8 (`docs/triagem/api-triagem.md`). Não decide nada, não altera resultado de regra e não apaga evidência.

## Rotas

| Rota | Página | O que faz |
|---|---|---|
| `/triagem` | `src/pages/TriagePage.tsx` | Mostra a disponibilidade e a lista de processos (o analista vê os seus; o administrador vê todos). |
| `/triagem/nova` | `src/pages/TriageNewPage.tsx` | Envio de pacote sintético. Só aparece para quem tem `podeCriar`. |
| `/triagem/processos/:id` | `src/pages/TriageProcessPage.tsx` | Processo: situação, verificações, evidência, documentos, campos, enquadramento e histórico. |

## Mudanças da E10

- **Navegação:** a triagem aparece como "Experimental" na sub-barra e na página inicial. Antes aparecia como "Em breve" ou "Em desenvolvimento".
- **Estados separados:** `EstadoProcesso` (em `components/common.tsx`) mostra processamento ("Análise concluída"), revisão humana dos achados ("1 de 2 achados a revisar", "2 achados revisados"), condições pendentes de confirmação e verificações não avaliáveis. A lista tem uma coluna para cada um. "Achados revisados" não encerra a triagem: com condição pendente, a tela diz isso.
- **Regras legíveis:** `model/regras.ts` tem título e explicação para cada uma das 19 regras. O detalhe mantém o ID AQR-GCA, o título do catálogo, a versão, a condição de aplicação (`aplicacao`, vinda do servidor) e as fontes.
- **Correção:** "Salvar correção e reprocessar" salva a revisão, reprocessa com a versão devolvida e mostra a nova análise. Se o reprocessamento falhar, a tela diz que a correção ficou registrada. "Só salvar a correção" continua disponível. Todas as ações têm guarda contra clique repetido (`useAcao`).
- **Anexo isolado:** o conteúdo não é pedido e o painel explica o motivo, em português.
- **Celular:** os contêineres das tabelas são posicionados (`relative`), e a página não rola na horizontal em 390 px.

## Quem decide se a triagem aparece

O servidor decide. `TriagemSessionProvider` (`src/features/triage/session/triage-session.tsx`) consulta `GET /api/triagem/status` e expõe um destes estados:

- `verificando`;
- `indisponivel` com motivo `desligada`: o servidor está em `TRIAGEM_MODO=desativada`, o padrão, e é sempre esse o caso em produção;
- `indisponivel` com motivo `sem-conexao`: a tela oferece "Tentar de novo";
- `disponivel`, com os limites, as modalidades, a retenção e a pessoa.

A interface não tem flag própria para ligar a triagem. Não há meio de enviar documento real em produção, porque o servidor recusa o modo experimental com `NODE_ENV=production`.

## Organização (`src/features/triage/`)

| Pasta | Conteúdo |
|---|---|
| `model/types.ts` | Tipos inferidos dos contratos zod do servidor (`shared/contracts/triage-api.ts`), `TriagemServiceError` e a interface `TriagemService`. |
| `model/describe.ts` | As cinco categorias (rótulo, explicação, ícone e classe por token), `categoriaDe`, os rótulos em pt-BR e os formatadores. |
| `model/arquivos.ts` | Conferência local dos arquivos contra os limites que o servidor informa. É só para não enviar o que seria recusado; o servidor confere tudo de novo. |
| `services/http-triage-service.ts` | Serviço real, com cookie da mesma origem, cabeçalho de desenvolvimento só local e respostas validadas por zod. Um 401 avisa a sessão. |
| `hooks/` | `useCarregar` (carga com o erro original e o último dado bom), `useProcesso` (consulta a cada 2 s enquanto processa) e `useAcao` (ação com erro e sucesso). |
| `components/` | `TriagemLista`, `NovaTriagemForm`, `ProcessoView`, `Verificacoes`, `Secoes` (visão geral, documentos, campos, enquadramento, histórico), `EvidenceViewer` e `common` (selos, avisos, erros). |
| `test-data/` | `respostas-reais.ts`, com respostas reais da API gravadas a partir do servidor com os pacotes DSD-16 e DSD-15, e `fake-service.ts` (cenários, erros injetados e registro das chamadas). |

## As cinco categorias

`categoriaDe(avaliacao)`:

| Resultado da regra | Categoria na tela |
|---|---|
| achado do tipo `nao-localizado` (só existe com o pacote confirmado como completo) | **Não localizado nos anexos examinados** |
| achado do tipo `condicao-indeterminada` | **Depende de confirmação humana** |
| qualquer outro achado (divergência, formato, assinatura…) | **Possível problema identificado** |
| `condicao-pendente` | **Depende de confirmação humana** |
| `nao-avaliavel` | **Verificação inconclusiva** |
| `sem-achado` e `nao-aplicavel` | **Verificada sem achado** |

As categorias usam a paleta das diferenças do comparador (vermelho, âmbar, ciano e verde dos tokens) e sempre trazem ícone e rótulo. A tela não usa "aprovado", "reprovado", "irregular" nem pontuação; um teste confere isso.

## Evidência no documento

`EvidenceViewer` abre num painel lateral (`Sheet`):

- O conteúdo vem de `GET /api/triagens/:id/anexos/:anexoId/conteudo`, um endpoint autenticado. Fica só na memória da aba, e o URL do blob é revogado ao fechar. Não há recorte guardado no servidor nem endereço público.
- **PDF:** reaproveita o `loadPdf` e o `PdfPageView` do comparador. O `PdfPageView` ganhou a prop opcional `overlay`, uma mudança aditiva. A página abre na página da evidência, a região aparece destacada e há navegação entre páginas, com "Voltar à página da evidência".
- **JPG/PNG:** a imagem tem a região sobreposta. Se a imagem foi lida girada, a região não é desenhada, para não apontar um lugar errado, e a tela explica isso.
- **DXF, DWG, DOCX e outros formatos:** só metadados e trecho lido.
- **Conteúdo indisponível:** `expurgado` (prazo de guarda vencido), `nao-armazenado` (o ambiente não guarda conteúdo) ou 404 do servidor. A tela mostra a mensagem e mantém a evidência estruturada: anexo, classe, página, origem, SHA-256 e trecho.

## Revisão humana

Tudo fica registrado com o autor e a data, e nada altera o resultado da regra:

- **Achado:** confirmar, descartar (justificativa de 5 caracteres ou mais) ou encaminhar.
- **Campo:** correção com o valor novo e justificativa obrigatória. O valor original continua visível no histórico ("C3" → "F7").
- **Enquadramento:** confirmar a modalidade e a etapa, a completude do pacote (com explicação e justificativa obrigatória; o envio nunca marca o pacote como completo) e a condição "área acima de 2 ha" (regra 028).
- Correções e confirmações valem a partir da próxima análise. A tela avisa quando há alterações que pedem reprocessamento.
- Toda ação manda a `versaoEsperada`. No 409, a tela diz que o processo mudou, que a ação não foi registrada, e oferece "Atualizar o processo".

## Reprocessamento e histórico

- "Reprocessar" cria uma nova análise. O servidor recalcula as 19 regras sempre por inteiro, com teste de equivalência, e a mensagem lista as regras que mudaram.
- "Análise exibida" permite ver qualquer análise concluída. As anteriores são só consulta.
- O histórico mostra as análises (motivo, situação, motor e catálogo), as correções de campo (anterior → novo, autor, data), todas as revisões e a comparação regra a regra entre a atual e uma anterior, com a marcação "mudou".
- Análise `falhou` ou `interrompida`: a tela explica que nenhum resultado parcial foi guardado e oferece "Tentar de novo" (retomada).

## Permissões na tela

| Quem | O que pode fazer |
|---|---|
| Analista que criou o processo, na análise atual e fora do processamento | Revisar, corrigir, confirmar e reprocessar. |
| Administrador | Vê todos os processos só para consulta: sem criar, revisar, corrigir, confirmar nem reprocessar. A interface esconde os controles e o servidor responde 403 se forem chamados. |
| Outra pessoa | Recebe 404, e a tela diz que o processo não existe ou não está entre os que ela pode acessar. |

## Testes

| Arquivo | Escopo | O que cobre |
|---|---|---|
| `src/features/triage/triage-ui.test.tsx` | 34 testes, com respostas reais da API e PDF falso de 3 páginas, porque o jsdom não desenha canvas | Triagem desligada e sem conexão; lista do analista e do administrador; envio de vários anexos, remoção, declaração obrigatória, limite e recusa do servidor; mesma chave de idempotência na nova tentativa; consulta automática durante o processamento; análise falhou ou interrompida; categorias e abstenções; quadro de valores; evidência na página certa com destaque e navegação; arquivo expurgado e 404; descarte com justificativa; confirmação pelo teclado; 409; correção de campo; completude; reprocessamento e comparação; análise anterior só para consulta; administrador só consulta; 403; axe na lista, no envio, no processo e no painel de evidência. |
| `tests/integration/triage.test.ts` | Ponta a ponta | O serviço HTTP da tela contra o servidor real em modo experimental, com o pacote completo DSD-16: criar, idempotência, processamento, 19 regras sem palavra de decisão, evidência com região e conteúdo autenticado, isolamento entre analistas, administrador sem alteração, correção, 409, reprocessamento (018 deixa de ter achado, a análise 1 fica intacta), revisão com justificativa. Também cobre a triagem desligada. |

## Telas

Capturas do fluxo real, com o servidor em modo experimental e o pacote sintético DSD-16, em `docs/triagem/telas-e9/`.
