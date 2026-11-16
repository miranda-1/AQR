# Relatório da E9: interface de triagem documental assistida

**Data:** 16/11/2026 · **Branch:** `dev` · **Push:** nenhum dos commits da E9 foi enviado (aguarda nova autorização).

## 1. Resumo

A tela `/triagem` deixou de ser um "Em desenvolvimento" e virou a interface da triagem experimental de **desdobro na abertura**, só com pacotes sintéticos. Ela cobre:

- a lista de processos;
- o envio de um pacote;
- o acompanhamento do processamento;
- o resultado nas **cinco categorias**;
- a evidência aberta **no PDF, na página certa, com a região destacada**;
- a revisão humana com justificativa, a correção de campo e as confirmações de enquadramento;
- o reprocessamento e o histórico com comparação entre análises.

O fluxo inteiro foi exercitado no navegador contra o servidor real, sem erro no console. Isso revelou **dois defeitos**, corrigidos com teste de regressão (seção 7).

Antes da E9, o push da E7–E8 (3 commits, `59cb942..8f00908`) foi feito depois de conferir a branch, o diff, os segredos e a ausência de implantação.

## 2. O que respeita das restrições

| Restrição | Como foi atendida |
|---|---|
| Só pacotes sintéticos | O servidor decide se a triagem aparece (`GET /api/triagem/status`) e recusa o modo experimental em produção. A declaração "os arquivos são sintéticos" é obrigatória no envio, mas a tela diz que ela **não substitui** as barreiras do sistema. Não há flag no frontend nem outro meio de enviar documento. |
| Nunca marcar o pacote como completo | O envio não marca; a completude só é registrada por confirmação do analista, com justificativa obrigatória e explicação do efeito. Sem ela, nenhuma ausência vira "não localizado": aparece como "verificação inconclusiva". |
| Sem aprovação, irregularidade ou pontuação | Não há "aprovado", "reprovado", "irregular" nem pontuação. A visão geral diz que as contagens "não aprovam nem reprovam o processo". Os testes conferem a ausência dessas palavras. |
| Não editar resultado de regra nem apagar evidência | A revisão fica ao lado do resultado. A correção de campo mantém o valor original e só vale a partir da próxima análise. As análises anteriores ficam só para consulta. |
| Sem recortes permanentes nem URLs públicas | O arquivo vem do endpoint autenticado, fica só na memória da aba e é descartado ao fechar. O destaque é desenhado por cima, no navegador. |
| Limites do servidor | O formulário lê os limites do status e só evita enviar o que seria recusado; o servidor confere tudo de novo. Não há upload em partes nem nada que contorne os limites. |
| Sem E10 e sem IA | Nada foi feito nessa direção. |
| `AGENTS.md`, dossiê, `master`, force push, release | Nada disso foi tocado. O `AGENTS.md` continua fora dos commits. |

## 3. Fluxo real (telas)

As capturas são do app rodando localmente: servidor em `TRIAGEM_MODO=experimental-sintetico`, frontend em modo de desenvolvimento e o pacote sintético DSD-16, de 8 arquivos. Estão em `docs/triagem/telas-e9/`.

| # | Tela | Arquivo |
|---|---|---|
| 1 | Lista vazia do analista | `01-lista-vazia.png` |
| 2 | Nova triagem: desdobro e abertura, outras modalidades "ainda não suportada", 8 anexos, declaração | `02-nova-triagem.png` |
| 3 | "Análise em andamento" (a página consulta sozinha a cada 2 s) | `03-processando.png` |
| 4 | Visão geral: contagens por categoria, sem pontuação | `04-resultado.png` |
| 5 | Achado de divergência da regra 018 (lote F7 × C3) com quadro de valores | `05-achado-divergencia.png` |
| 6 | **Evidência no PDF da ART: página 1 de 1, "C3" destacado no documento** | `06-evidencia-no-pdf.png` |
| 7 | Correção do lote com justificativa | `07-correcao-de-campo.png` |
| 8 | Depois do reprocessamento: análise nº 2, "1 verificação mudou (AQR-GCA-018)" | `08-depois-do-reprocessamento.png` |
| 9 | Histórico: análises, correção "C3" → "F7" e comparação 1 × 2 com "mudou" | `09-historico-comparacao.png` |
| 10 | Descarte de achado com justificativa obrigatória | `10-revisao-com-justificativa.png`, `10b-revisao-registrada.png` |
| 11 | Lista com o processo | `11-lista-com-processo.png` |
| 12 | Celular, 390 px | `12-celular.png` |
| 13 | Administrador: só consulta, sem nenhum botão de ação (contados 0 no teste do navegador) | `13-administrador-consulta.png` |

## 4. Arquivos e componentes

**Novos** (`src/features/triage/`):

| Arquivo | Função |
|---|---|
| `model/types.ts` | Tipos inferidos dos contratos zod do servidor, `TriagemServiceError` e a interface `TriagemService`. |
| `model/describe.ts` | As 5 categorias, `categoriaDe`, os rótulos em pt-BR e os formatadores. |
| `model/arquivos.ts` | Conferência dos arquivos contra os limites do servidor. |
| `services/http-triage-service.ts` | Serviço real, com cookie, cabeçalho de desenvolvimento só local, zod nas respostas e aviso de sessão no 401. |
| `session/triage-session.tsx` | Disponibilidade decidida pelo servidor: verificando, desligada, sem conexão ou disponível. |
| `hooks/use-carregar.ts`, `use-processo.ts`, `use-acao.ts` | Carga com o erro original, consulta durante o processamento e ações com erro e sucesso. |
| `components/TriagemLista.tsx` | Tabela de processos. |
| `components/NovaTriagemForm.tsx` | Envio com arrastar e soltar, remoção, limites, declaração e chave de idempotência. |
| `components/ProcessoView.tsx` | Cabeçalho, estados, seletor de análise, reprocessar e seções. |
| `components/Verificacoes.tsx` | Categorias, detalhe da regra, quadro de valores, campos usados, evidências, fundamento e revisão. |
| `components/Secoes.tsx` | Visão geral, documentos, campos com correção, enquadramento com confirmações, histórico com comparação. |
| `components/EvidenceViewer.tsx` | Painel de evidência: PDF, imagem, metadados, indisponível. |
| `components/common.tsx` | Selos, aviso experimental, erros por status (401, 403, 404, 409, 503, rede) e indisponível. |
| `test-data/respostas-reais.ts`, `fake-service.ts` | Respostas reais da API e serviço de teste. |

**Páginas:** `src/pages/TriagePage.tsx` (reescrita), `TriageNewPage.tsx` e `TriageProcessPage.tsx`.

**Alterados:**

- `src/app/App.tsx`: `TriagemSessionProvider`.
- `src/app/routes.tsx` e `src/config/routes.ts`: `/triagem/nova` e `/triagem/processos/:id`.
- `src/test/render.tsx`: serviço de triagem nos testes; por padrão, desligado.
- `src/features/comparison/viewer/pdf/PdfPageView.tsx`: prop opcional `overlay`. A mudança é aditiva e o comparador não muda.

**Backend da E9:** o commit `578876e` traz o status com limites e pessoa, o resumo com contagens, as páginas dos anexos, os `camposUsados` e as regras `alteradas` no reprocessamento.

**Documentos:**

- `docs/triagem/interface-triagem.md`: guia técnico novo.
- `docs/arquitetura.md`: seção nova.
- `docs/identidade-visual.md`: item 13, uso das cores de estado nas categorias e do amarelo como marca-texto sobre o PDF, para validação institucional.
- `docs/CONTEXTO.md`.

## 5. Reprocessamento incremental (revisão pedida)

Mantida a decisão do `578876e`: **as 19 regras são sempre recalculadas por inteiro**. O resultado gravado é igual ao de uma execução completa, e há testes de equivalência para correção de campo, completude e condição. O mapa de dependências só rotula as regras e acusa dependência não prevista; o reprocessamento devolve as `alteradas`, que a tela mostra.

## 6. Testes

| Conjunto | Resultado |
|---|---|
| `npm run lint` | sem avisos |
| `npm run typecheck` | sem erros |
| `npm test` | **74 arquivos, 644 testes passando, 4 pulados**. Os pulados são os mesmos de antes e dependem do Ghostscript, que não está instalado. |
| `npm run build` | ok (frontend e servidor) |

**`src/features/triage/triage-ui.test.tsx`** tem 34 testes, com respostas reais da API e PDF falso de 3 páginas, porque o jsdom não desenha canvas. Cobertura por item pedido:

| Item pedido | Coberto |
|---|---|
| Envio de vários anexos | Remover um arquivo, referência, declaração obrigatória, dados enviados (D, abertura, protocolo às 15h UTC) e navegação ao processo. |
| Carregamento e processamento | Consulta automática até concluir; análise falhou ou interrompida com "Tentar de novo". |
| Achados e abstenções | Contagens 1, 2 e 16 nas categorias. O pacote não confirmado dá "inconclusiva" e nunca "não localizado". Condição pendente da 028. Ausência de palavras de decisão. |
| Evidência na página correta | Página 1 de 3 com "página da evidência", destaque presente; na página 2 sem destaque; "Voltar à página da evidência"; Esc fecha. |
| Correção humana | Valor anterior visível, justificativa obrigatória, chamada com `campoId` e `novoValor`. |
| Confirmação e descarte | Descarte bloqueado sem justificativa de 5 caracteres ou mais; confirmação feita só pelo teclado. |
| Reprocessamento e histórico | Versão esperada enviada, mensagem com as alteradas, comparação 1 × 2 com "mudou", correção "C3" no histórico, análise anterior só para consulta. |
| Permissões | Administrador: lista sem "Nova triagem", processo sem nenhum controle de alteração, formulário de envio bloqueado. 403 com mensagem clara. 404 de processo alheio. |
| Desligada | Lista e processo mostram indisponível, sem controles. Sem conexão com "Tentar de novo". |
| Arquivo indisponível após a retenção | `expurgado`, sem buscar o arquivo; 404 do servidor. DXF só com metadados. |
| 409 | "O processo mudou enquanto você trabalhava", "Sua ação não foi registrada", "Atualizar o processo" recarrega. |
| Idempotência e erros de envio | A mesma chave é usada na nova tentativa depois de um 503; limite de quantidade recusado no navegador; recusa do servidor (422) mostrada. |
| Teclado e acessibilidade | axe (WCAG 2.2 AA, menos contraste) na lista, no envio, no processo e no painel de evidência aberto; verificação escolhida e revisão feitas pelo teclado. |
| Regressão da comparação | Os testes e o `a11y.test.tsx` do comparador continuam passando com o `overlay` novo. |

**`tests/integration/triage.test.ts`** é o ponta a ponta. O serviço HTTP da tela conversa com o servidor real, numa porta de verdade, em modo experimental, com o **pacote completo DSD-16**. Percorre:

- criação e repetição com a mesma chave (o processo não se repete);
- processamento em thread;
- 19 regras, sem palavra de decisão;
- 018 com evidência na página 1, com região;
- conteúdo autenticado com o tamanho certo;
- outro analista recebe 404 e o administrador recebe 403 ao reprocessar;
- correção C3 → F7;
- 409 com a versão antiga;
- reprocessamento: 018 passa a "sem achado" e a análise 1 continua com o achado;
- campo marcado como corrigido por servidor;
- revisão "encaminhado" sem alterar o resultado;
- completude nunca marcada sozinha.

Também confere a triagem desligada.

## 7. Defeitos achados e corrigidos

1. **Comparação do histórico não aparecia logo depois de reprocessar.** A análise-base era escolhida só na primeira renderização, quando havia uma análise só. Agora a base é calculada a cada renderização: a anterior escolhida, se ainda valer, ou a penúltima concluída. Achado pelo teste de reprocessamento.
2. **O aviso do reprocessamento escondia o da ação seguinte.** Depois de reprocessar e descartar um achado, a revisão era gravada, mas o topo continuava com "Análise nº 2 criada…". Agora todas as ações usam o mesmo aviso, e a mais recente substitui a anterior. Achado no navegador e coberto por teste.

## 8. Limitações

- **Só desdobro na abertura.** As outras modalidades e etapas aparecem desabilitadas como "ainda não suportada".
- **Andamento por consulta a cada 2 s.** A API não envia eventos. Não há porcentagem de upload, porque o `fetch` não informa o progresso do envio; aparece só "Enviando o pacote…".
- **PDF baixado inteiro para a aba** (até 50 MB por arquivo, o limite do servidor). Não há zoom no painel de evidência.
- **Imagem lida girada não tem destaque**, de propósito, para não apontar o lugar errado. A tela explica.
- **DXF, DWG, DOCX e outros formatos:** só metadados e trecho; não há visualização.
- **"Encaminhar"** é a única opção de revisão para o que não é achado.
- **Contraste não é verificado no jsdom.** As cores vêm dos tokens já conferidos em `docs/acessibilidade.md`. Não houve teste com leitor de tela real; há axe e teclado.
- **Capturas em 1366 px e 390 px.** As outras larguras não foram conferidas uma a uma.
- **No login visual de desenvolvimento,** a pessoa é identificada por cabeçalho aceito só em pedidos locais. Com Keycloak, vale o cookie.

## 9. Problemas de uso observados (não corrigidos, para decisão)

1. **Selos desatualizados.** A navegação mostra "Em breve" e a página inicial mostra "Em desenvolvimento" para a triagem, que agora funciona na `dev`. Foram mantidos porque mudar o selo é decisão sua, e na `master` a triagem nem existe.
2. **"Revisado" pode sugerir que acabou.** Depois de revisar todos os achados, o processo fica "Revisado" mesmo com a regra 028 ainda dependendo de confirmação. Na visão geral, "Aguardando revisão humana 0" ao lado de "Depende de confirmação humana 2" pode confundir.
3. **Nomes e versões das regras vêm crus do catálogo.** Exemplos: "Planta e CAD para R D DM RET", "ART RRT" e a versão "AQR-GCA-018@1.0-review+fd9b3e3b9db5". São fiéis à fonte, mas difíceis de ler.
4. **Corrigir e reprocessar são dois passos.** A tela avisa que há alterações pendentes, mas é fácil esquecer de reprocessar.
5. **Lista longa de "sem achado".** As 16 regras sem achado ocupam muito espaço, e não há como recolher o grupo.
6. **Não há aviso ao sair de um formulário preenchido** (envio, correção, revisão).
7. **O número do processo é parte de um identificador técnico** ("05815118"). A referência fictícia ajuda, mas é opcional.

## 10. Commits (locais, sem push)

| Commit | O que traz |
|---|---|
| `578876e` | Estende a API da triagem para a interface e garante o reprocessamento integral. |
| `4cd1948` | Implementa a interface de triagem documental assistida (E9), com os 34 testes de interface. |
| `39555b7` | Testa a triagem de ponta a ponta com o servidor real. |
| *(este)* | Documentação, telas, relatório e `CONTEXTO.md`. |

O envio depende de nova autorização. Quando ela vier, usar o comando de `docs/CONTEXTO.md` → Repositório, depois de conferir de novo a branch, o diff, os segredos e a ausência de implantação.

## 11. Prontidão para a E10

O escopo da E10 não está nos documentos do repositório (o plano E0–E11 está no dossiê privado). Do lado da E9, o que já está pronto e o que precisa ser decidido antes:

- **Pronto:** a interface consome só a API e os contratos zod. Qualquer novo tipo de resultado ou de origem de evidência entra pelo contrato e por `categoriaDe`. A origem `modelo-local` já tem rótulo no painel de evidência. Os testes de interface e o ponta a ponta acusam divergência entre a tela e a API.
- **Decidir antes:**
  - os pontos de uso da seção 9, principalmente o selo "Em breve" e o significado de "Revisado";
  - o push dos commits da E9;
  - se a E10 envolver um modelo, como a tela distingue o que veio de regra e o que veio de modelo. Hoje só há regras determinísticas.
- **Bloqueios para documentos reais:** continuam os da E7 e da E8 (retenção e acesso homologados, chave em cofre, backup e expurgo, homologação das regras pela GCA). Nada na E9 muda isso.
