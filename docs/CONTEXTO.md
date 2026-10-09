# AQR: contexto do projeto

Leia este arquivo antes de mexer no projeto. Ele resume o que existe, o que já foi decidido e o que falta. **Atualize-o a cada alteração**, junto com o commit (regra no `CLAUDE.md`).

## O que é

AQR (Análise e Qualificação de Requerimentos) é um sistema interno da SEMADES, da Prefeitura Municipal de Campo Grande/MS. Tem dois módulos:

1. **Comparação de PDFs:** prioridade atual. Compara a versão original e a atualizada de um documento e aponta adições, exclusões e modificações.
2. **Triagem documental:** futuro. Vai identificar os tipos de documento de um processo e verificar os documentos obrigatórios. Hoje aparece apenas como "Em desenvolvimento".

O pedido original completo está em `~/Downloads/Prompt_AQR_2.0_Claude_Code.txt`. Os PDFs de marca também estão em `~/Downloads`.

## Estado atual

**Etapa 1, protótipo de frontend:** concluída e em revisão visual pelo responsável.

- Ainda não há backend, processamento real de PDF, banco de dados, autenticação real nem deploy. O backend e o banco estão autorizados e seguem `docs/plano-backend.md`; IA, autenticação real e deploy continuam dependendo de pedido explícito.
- **Login visual** (`/entrar`): aparece antes de qualquer página. Não verifica credenciais: qualquer usuário e senha preenchidos entram. A sessão vale para a aba (`sessionStorage`) e termina ao fechá-la.
- O resultado da comparação usa **dados fictícios** (`src/features/comparison/mocks/`), identificados na interface.
- Funcionam de verdade:
  - login "Noite" (anéis pontilhados parados, cartão com as folhas "Original" e "Atualizado" em leque, PREFCG) com a entrada animada: os pontos dos anéis formam o AQR, uma varredura amarela troca os pontos pela logo, e a logo voa até o cabeçalho do site; depois de entrar, a pessoa vai para a página que tinha pedido (ou para o início); "Sair" (botão de conta) faz o caminho inverso, com a logo voltando ao centro e virando pontinhos;
  - página inicial (`/`) com seletor das ferramentas e ilustrações animadas em SVG/CSS (pausadas fora da tela; estáticas com movimento reduzido);
  - transição "deslizar" entre páginas (View Transitions API, nos navegadores com suporte);
  - navegação pela sub-barra de ferramentas (Início, Comparar PDFs, Triagem documental) e botão de conta com "Sair";
  - seleção e validação local dos PDFs (extensão, tipo, limite de 50 MB, assinatura `%PDF-`);
  - filtros, lista de diferenças, navegação (botões e Alt + ↑/↓), modos de visualização, zoom e rolagem sincronizada.
- São demonstrativos: o resultado, as etapas de processamento, os estados de erro (pelo menu "Simular estado" ou por `?cenario=`) e a exportação, que aparece como "indisponível".

**Etapa 2, backend (autorizada em 09/10/2026, em andamento):** plano aprovado em `docs/plano-backend.md`, executado em commits pequenos, na ordem da seção 9. Entrega 1: comparação real de PDFs com servidor Node.js/TypeScript, preservando `ComparisonService` e o frontend aprovado. Entrega 2: administração de contas (listagem, busca, criação, edição, ativação/desativação, papéis e auditoria básica). **A autenticação real do login continua fora do escopo**: o login visual e a sessão fictícia permanecem. Já existe o servidor (`server/`, Fastify) com a API de comparação por tarefas (`POST/GET/DELETE /api/comparisons`), processada em threads isoladas (`worker_threads`) com fila, limites de tamanho, memória e tempo e resultado em memória por 30 min; o núcleo extrai o texto com posição, calcula as diferenças e monta o resultado no formato do contrato (critérios em `docs/criterios-comparacao.md`). Ainda sem visualizador real nem integração com o frontend. Próximo commit do plano: 8 (frontend ligado ao serviço HTTP). Só depois das duas entregas, a triagem.

## Repositório

- GitHub (**privado**): https://github.com/miranda-1/AQR, branch `master`.
- O remoto usa HTTPS, com autenticação pelo GitHub CLI (`gh`, conta miranda-1). A chave SSH não está configurada neste computador. Para enviar:
  ```bash
  git -c credential.helper= -c 'credential.helper=!gh auth git-credential' push
  ```

## Como rodar

```bash
npm install
npm run dev     # http://localhost:5173 — abre na página inicial (seletor de ferramentas)
npm run dev:server   # em outro terminal: API em http://127.0.0.1:3000 (o Vite encaminha /api para ela)
```

Variáveis do servidor (opcionais): `HOST` (padrão `127.0.0.1`), `PORT` (`3000`), `NODE_ENV`, `LOG_LEVEL`, `COMPARISON_WORKERS` (`2`), `COMPARISON_QUEUE_LIMIT` (`8`), `COMPARISON_TIMEOUT_MS` (`120000`), `COMPARISON_RESULT_TTL_MS` (`1800000`), `COMPARISON_WORKER_MEMORY_MB` (`768`).

Antes de cada commit: `npm run lint`, `npm run typecheck`, `npm test` e `npm run build`.

## Decisões do responsável (não reverter sem pedir)

| Data | Decisão |
|---|---|
| 08/10/2026 | Usar a marca PREFCG na versão digital azul, sem "Siga @prefcg". ~~A marca SEMADES não entra; a sigla aparece só no rodapé, em texto.~~ Parte substituída pela decisão sobre o rodapé, abaixo. |
| 08/10/2026 | Cor da marca unificada em **#283587**, o valor do manual. O arquivo 2026 tinha azuis divergentes. |
| 08/10/2026 | Limite de **50 MB** por PDF. |
| 08/10/2026 | Fonte da interface livre: escolhida **Plus Jakarta Sans** (OFL). As fontes da marca não têm licença web confirmada. |
| 08/10/2026 | ~~Sem página inicial: `/` redireciona para `/comparacao`.~~ **Substituída** pela decisão seguinte, a pedido do responsável. Continua valendo: nada de hero, seções promocionais ou linguagem de marketing. |
| 08/10/2026 | **Página inicial em `/`, como seletor de ferramentas:** "Como podemos ajudar?", com duas opções (Comparar PDFs e Triagem documental) à esquerda e uma demonstração animada à direita, que muda com hover/foco. O clique leva à ferramenta. Logo AQR do cabeçalho aponta para `/`. |
| 08/10/2026 | **Rodapé com marcas, sem texto:** SEMADES, slogan "É fazendo o certo que a gente traz resultado" e PREFCG, na **versão azul e branca** do kit 2026, numa faixa branca e baixa. As versões coloridas foram testadas e recusadas ("ficou muito feio"). O aviso de protótipo saiu do rodapé, mas continua na tela de comparação e no resultado. |
| 09/10/2026 | **Login: base na opção 2 (cartão central).** Cartão branco no centro, sobre fundo claro, com a PREFCG no topo. **Sem aviso de protótipo** na tela de login. **Variação escolhida: 2B (folhas em leque).** |
| 09/10/2026 | **Entrada animada no login:** ao entrar, o cartão sai, a logo do AQR se desenha grande no centro (lente, haste e faixa amarela; A e R entram pelos lados) e então o site abre. |
| 09/10/2026 | ~~Login com fundo pontilhado.~~ Substituída: **o login também tem fundo azul `#283587`**, com **ondas** animadas. A entrada acontece no mesmo azul: o cartão some, a logo em negativo se desenha com uma rajada de anéis saindo da lente, e o azul sobe como cortina revelando o site. O cartão é branco, então a PREFCG continua sobre branco. |
| 09/10/2026 | **Favorita até agora: "anéis pontilhados"** (`login-ondas.html#w4`, captura `favorita-aneis-pontilhados.png`). **Guardar**; não descartar. Em análise, como alternativa: cubos que sobem e descem como ondas (`login-cubos.html`). |
| 09/10/2026 | **Login fechado em "anéis pontilhados"** (cubos descartados). Últimas variações a escolher: original, noite, claro ou lente (`login-aneis-variacoes.html`). |
| 09/10/2026 | **Login: variação "Noite"**: azul profundo, brilho que percorre os anéis, pulso ao digitar, cartão 2B com PREFCG. Falta escolher a animação de entrada. |
| 09/10/2026 | **Entrada: "logo em pontinhos"** (pontos saem dos anéis e formam o AQR). Os traços internos da lente nunca aparecem antes da logo: entram como pontos e, na logo desenhada, crescem logo depois da faixa amarela. |
| 09/10/2026 | **Versão da entrada: "varredura"**: os pontos formam o AQR e uma linha amarela passa trocando os pontos pela logo sólida. Falta escolher a transição da logo para o site. |
| 09/10/2026 | **Transição: a logo voa até o cabeçalho** (branco → azul) enquanto o fundo some. **Login oficial no site** com essa sequência completa. Depois de entrar, volta para a página pedida; sem página pedida, vai para o início. |
| 09/10/2026 | **Anéis do login parados e centralizados.** Só o brilho se move sobre eles, e ao digitar os pontos clareiam (sem mudar de tamanho). **Sair = "logo volta ao centro"**: a logo sai do cabeçalho para o centro, o fundo do login volta, e ela se desfaz em pontinhos que voltam aos anéis. |
| 08/10/2026 | ~~Barra superior: menu "Ferramentas" à esquerda, logo AQR ao lado e PREFCG à direita.~~ **Substituída em 09/10/2026** (abaixo). Continua valendo: sem "SEMADES" e sem "Protótipo" na barra; sem menu lateral. |
| 09/10/2026 | **Barra superior em duas faixas.** Em cima, branca: logo e nome do AQR à esquerda; PREFCG e botão de conta (nome digitado no login, com "Sair") à direita. Embaixo, a **sub-barra "sublinhado"** em azul bem claro: Início, Comparar PDFs e Triagem documental ("Em breve"), com um traço azul que desliza até a ferramenta ativa. Separação por tom, sem linha divisória. |
| 09/10/2026 | **Folhas atrás do cartão de login: "Original" e "Atualizado"**, os dois documentos que o AQR compara, com trechos destacados (cores e marcações do visualizador). Abertas de perto: 60 px para cada lado (22 px no celular). |
| 09/10/2026 | **Transição entre páginas: "deslizar".** A página nova entra no sentido do traço da sub-barra (para a direita, entra pela direita), em cerca de 0,4 s; a barra fica parada. Sem suporte do navegador ou com movimento reduzido, a troca é direta. |
| 09/10/2026 | **Backend autorizado em duas entregas, nesta ordem:** (1) comparação real de PDFs em Node.js/TypeScript, preservando `ComparisonService` e o frontend aprovado; (2) administração de contas. **Sem autenticação real do login nesta etapa.** A API administrativa deve ficar pronta para a autenticação real e nunca exposta sem proteção em produção (modo de desenvolvimento bloqueado em produção). Plano aprovado: `docs/plano-backend.md`. |
| 09/10/2026 | **Provisórias até o commit 10 do plano** (defaults, a confirmar): D1 papéis `administrador` e `analista`, contas só desativadas, nunca excluídas; D2 conta identificada por login institucional imutável (`^[a-z0-9._-]{3,32}$`), nome obrigatório, e-mail opcional, sem senha guardada; D3 só o texto é comparado (formatação e imagens não geram diferença; PDF digitalizado dá "sem texto", sem OCR); D4 telas de administração nos padrões aprovados, acessadas pelo botão de conta, com capturas para aprovação. |
| 09/10/2026 | **Técnicas (tomadas pelo plano):** servidor em `server/` no mesmo `package.json`; tipos compartilhados em `shared/contracts/`, reexportados por `types.ts`; Fastify 5; `pdfjs-dist` no servidor e no navegador (`isEvalSupported: false`); diferenças com `diff` (jsdiff); PDFs de teste com `pdf-lib`; SQLite via `node:sqlite`; nenhum PDF gravado em disco e resultado em memória por 30 min; progresso por polling; proxy `/api` no Vite; servidor só em `127.0.0.1` por padrão; campo opcional `anchors` em `Difference`; serviço real ou demonstrativo por `VITE_COMPARISON_SERVICE`. |
| 09/10/2026 | **Técnica:** `pdfjs-dist` 6 exige Node ≥ 22.13, então o `engines` subiu já no commit 4 (o plano previa no 11). O pdf.js 6 não tem mais a opção `isEvalSupported` (o caminho com `eval` das fontes foi removido); o servidor abre os PDFs sem fontes do sistema, sem `FontFace`, sem buscas de rede e com `stopAtErrors`. |
| 09/10/2026 | **Técnica:** a comparação começa **palavra a palavra no documento inteiro** (e não por linhas, como dizia o plano), para que o mesmo texto em outra diagramação não gere diferença; só cai para linhas acima de 300 mil palavras ou 50 mil edições ou 20 s. A pontuação no início e no fim da palavra vira item próprio, para que uma palavra acrescentada no fim da frase seja adição, e não modificação. |
| 09/10/2026 | **Técnica:** uma thread nova por comparação (em vez de um conjunto fixo de threads), para isolar de verdade: a thread que trava, estoura a memória ou passa do tempo é encerrada sem afetar as outras. No build a thread roda `worker.js`; nos testes e no `tsx`, `worker.ts` (remoção de tipos do Node, Node ≥ 22.18, ou o carregador do `tsx`). O código do servidor só usa sintaxe TypeScript removível (`erasableSyntaxOnly`). |
| 08/10/2026 | **Sem linhas divisórias** cortando a tela (`border-b/t`, `divide-*`). A separação é feita por fundo tonal, sombra (`shadow-surface`) e espaçamento. |
| 08/10/2026 | Tela principal enxuta: título "Comparar documentos", o texto curto, os dois campos de arquivo, o botão e a seção recolhível "Como funciona". |
| 08/10/2026 | **Logo do AQR: Proposta 3, "Lente Q"**, com a lente centralizada entre o A e o R. Propostas em `docs/propostas-logo-aqr/`. |
| 08/10/2026 | **Toda alteração termina num commit e na atualização deste arquivo.** |
| 08/10/2026 | Projeto publicado no repositório privado `miranda-1/AQR` (GitHub). |

## Histórico

| Data | O que foi feito | Commit |
|---|---|---|
| 08/10/2026 | Análise dos 4 PDFs de marca, plano aprovado, construção do frontend completo (envio, workspace, estados, testes, acessibilidade) | `b7bf5db` |
| 08/10/2026 | Reformulação para ferramenta interna: home removida, menu "Ferramentas", tela enxuta | `b7bf5db` |
| 08/10/2026 | Barra superior reorganizada (Ferramentas à esquerda, PREFCG à direita) e remoção das linhas divisórias | `b7bf5db` |
| 08/10/2026 | Três propostas de logo em PDF; Proposta 3 aplicada no site e no favicon | `b7bf5db`, `d06be0d` |
| 08/10/2026 | Documentação de arquitetura, identidade e acessibilidade | `7674241` |
| 08/10/2026 | Criação deste arquivo de contexto e da regra de commit a cada alteração | `10babf0` |
| 08/10/2026 | PDF de apresentação da logo escolhida (9 páginas: conceito, versões, cores, construção, área de proteção, tamanhos mínimos, aplicações, usos incorretos, cores e tipografia) em `docs/logo-aqr/` | `d425de4` |
| 08/10/2026 | Publicação no GitHub (`miranda-1/AQR`, privado) e registro do repositório neste arquivo | `2d85821` |
| 08/10/2026 | Página inicial em `/` (seletor de ferramentas com demonstração animada), substituindo o redirecionamento para `/comparacao` | `cdada4e` |
| 08/10/2026 | Rodapé refeito com as marcas SEMADES, slogan e PREFCG (versão azul), no lugar do texto | `bec11fc` |
| 09/10/2026 | Três propostas de tela de login animada, com PREFCG, em `docs/propostas-login/` (HTML navegável + capturas) | `e8896c3` |
| 09/10/2026 | Responsável escolheu a opção 2 (cartão central). Três variações dela, sem aviso de protótipo, em `docs/propostas-login/variacoes-opcao-2.html` | `390f805` |
| 09/10/2026 | Escolhida a 2B. Cinco fundos possíveis e a entrada animada (logo se desenhando antes de abrir o site) em `docs/propostas-login/variacoes-2b.html` | `15f4092` |
| 09/10/2026 | Login com fundo pontilhado; entrada em tela azul com logo em negativo e três animações de fundo (ondas, linhas, pontos), saída em cortina, em `docs/propostas-login/login-2b-entrada-azul.html` | `c2d0d6e` |
| 09/10/2026 | Escolhida a animação "ondas". Login também em fundo azul, com quatro variações a partir das ondas (anéis, mar, dois focos, anéis pontilhados), em `docs/propostas-login/login-ondas.html` | `103228f` |
| 09/10/2026 | "Anéis pontilhados" guardada como favorita. Cinco versões com cubos em onda (canvas isométrico) em `docs/propostas-login/login-cubos.html` | `1227661` |
| 09/10/2026 | Fechado em anéis pontilhados. Três variações dela (noite, claro, lente) em `docs/propostas-login/login-aneis-variacoes.html` | `70b2350` |
| 09/10/2026 | Escolhida a "Noite". Três animações de entrada (pontilhado continua, logo em pontinhos, anel vira lente) em `docs/propostas-login/login-noite-entradas.html` | `1a81b9b` |
| 09/10/2026 | Escolhida a entrada "logo em pontinhos". Três versões dela (pontos que viram logo, varredura, em sequência) em `docs/propostas-login/login-pontinhos.html`; os traços internos da lente deixam de aparecer soltos antes da logo | `7e74869` |
| 09/10/2026 | Escolhida a "varredura". Cinco transições da logo para o site (cabeçalho, lente, varredura de volta, anéis, persianas) em `docs/propostas-login/login-transicoes.html` | `fb18c8f` |
| 09/10/2026 | Login implementado no site: `/entrar` antes de todas as páginas, fundo Noite, logo em pontinhos com varredura e a logo voando até o cabeçalho; testes de login e acessibilidade | `9f68b6c` |
| 09/10/2026 | Correção: ao digitar no login, os anéis pontilhados saíam do lugar (o pulso desalinhava a camada de pontos e a do brilho). O pulso passou para o conjunto | `e9281f8` |
| 09/10/2026 | Item "Sair" no menu Ferramentas, para voltar ao login sem fechar a aba | `98bd213` |
| 09/10/2026 | Três animações de saída (logo volta ao centro, anéis fecham, varredura de saída) em `docs/propostas-login/sair-animacoes.html` | `8c8811f` |
| 09/10/2026 | Anéis do login parados e centralizados (sem girar nem "respirar"), o que acaba com o salto ao entrar; "Sair" no site com a animação "logo volta ao centro" | `24a5474` |
| 09/10/2026 | Três propostas de barra superior (abas, painel de ferramentas, ícones compactos), mais a atual, em `docs/propostas-topbar/topbar.html` | `23d3bf3` |
| 09/10/2026 | Escolhidos os "ícones compactos". Três versões (indicador deslizante, com rótulos, flutuante) em `docs/propostas-topbar/icones-compactos.html` | `a74d0f8` |
| 09/10/2026 | Versão D: rótulos + indicador deslizante numa sub-barra abaixo da barra principal | `def5b06` |
| 09/10/2026 | Escolhida a sub-barra. Três sub-barras diferentes (sublinhado, azul institucional, com contexto) em `docs/propostas-topbar/sub-barras.html` | `e9a232a` |
| 09/10/2026 | Barra nova no site: duas faixas, sub-barra "sublinhado" com traço deslizante, botão de conta com o nome digitado no login e "Sair"; o menu "Ferramentas" foi removido | `010bfcc` |
| 09/10/2026 | Três propostas de transição entre páginas (deslizar, em cascata, varredura) em `docs/propostas-transicoes/transicoes.html` | `9980b19` |
| 09/10/2026 | Transição "deslizar" entre páginas no site (View Transitions API): só o conteúdo desliza, no sentido do traço da sub-barra | `fb6833c` |
| 09/10/2026 | Envio ao GitHub (`miranda-1/AQR`) de todo o trabalho até `fb6833c`, com o responsável como autor | — |
| 09/10/2026 | Três modelos para as folhas atrás do cartão de login (amarelo e azul, PDFs, original e atualizado) em `docs/propostas-login/folhas-login.html` | `efaf768` |
| 09/10/2026 | Folhas do login no site: "Original" e "Atualizado" com destaques, mais próximas do cartão (60 px para cada lado; 22 px no celular) | `3ad2090` |
| 09/10/2026 | Plano do backend (comparação real e administração de contas) registrado em `docs/plano-backend.md`, com decisões provisórias D1–D4 e defaults técnicos; resumo em `docs/arquitetura.md` (commit 1 do plano) | `ed02c8b` |
| 09/10/2026 | Tipos de dados da comparação movidos para `shared/contracts/comparison.ts` (reexportados por `types.ts`; contrato `ComparisonService` intacto) e campo opcional `anchors` em `Difference` (commit 2 do plano) | `5c783b2` |
| 09/10/2026 | Servidor Fastify em `server/` com `GET /api/health`, configuração validada por variáveis de ambiente (padrão `127.0.0.1:3000`), `npm run dev:server` (tsx), `build:server` (→ `dist-server/`, incluído no `npm run build`), proxy `/api` no Vite e testes divididos em dois projetos do Vitest (`frontend` em jsdom, `servidor` em Node) (commit 3 do plano) | `1819dec` |
| 09/10/2026 | Extração de texto com posição por palavra (`pdfjs-dist` 6, legado para Node) e erros de domínio (`ComparisonFailure`: vazio, tamanho, assinatura, senha, corrompido, páginas, texto demais, sem texto, tempo esgotado), com limites em `server/comparison/limits.ts`; PDFs sintéticos de verdade nos testes (`pdf-lib`, só desenvolvimento), inclusive protegido por senha e só com desenhos; `engines.node` passa a `>=22.13` (exigência do pdfjs-dist 6) (commit 4 do plano) | `a46f5bd` |
| 09/10/2026 | Normalização (NFKC, ligaduras, aspas e traços tipográficos, invisíveis, hifenização de fim de linha) e diferenças palavra a palavra com `diff` (jsdiff), atravessando linhas e páginas; pontuação separada da palavra; trechos a até 2 palavras iguais unidos; queda para comparação por linhas acima dos limites e erro de domínio se nem assim couber (commit 5 do plano) | `33c508c` |
| 09/10/2026 | `compareDocuments` monta o `ComparisonResult` público: tipo, textos, página e região de cada lado, âncoras em adições e exclusões, contexto (artigo/parágrafo, cláusula, capítulo, título), ids e resumo; adições e exclusões puras deslizam até o início da linha; suíte de precisão com PDFs sintéticos (idênticos, outra diagramação, alteração, inserção, remoção, várias páginas, inválido, não-PDF, protegido, sem texto, etapas, cancelamento, 2 × 100 páginas) e `docs/criterios-comparacao.md` (commit 6 do plano) | `bdfa323` |
| 09/10/2026 | API de comparação: `POST /api/comparisons` (multipart com `original` e `updated`; tipo, assinatura `%PDF-` e 50 MB conferidos; nomes de arquivo higienizados), `GET` e `DELETE /api/comparisons/:id`; cada tarefa numa thread própria com limite de memória e de tempo, fila limitada (503 quando cheia), cancelamento, resultado só em memória por 30 min; erros em JSON com mensagem em português; testes de integração com threads e PDFs reais (commit 7 do plano) | ver `git log` |

## Pendências

- **Posição das palavras:** o pdf.js informa a largura de cada trecho, não de cada letra; a caixa de uma palavra no meio da linha é estimada por pesos de largura (IoU médio ≈ 0,79, mínimo ≈ 0,65 na suíte sintética, acima do critério de 0,5). Se os destaques ficarem imprecisos em PDFs reais, ler as larguras dos glifos pela lista de operadores.
- **Escala:** tarefas e resultados ficam na memória de um único processo; reiniciar o servidor apaga as comparações em andamento, e mais de uma instância exigiria um armazenamento compartilhado.
- **Regras de texto a confirmar com o uso real:** maiúsculas, acentos e pontuação contam como diferença; NFKC iguala "1º" e "1o"; palavra com hífen no fim da linha seguida de minúscula é unida ("requeri-" + "mento"), o que também une compostos quebrados na linha ("bem-" + "estar" vira "bemestar") e pode gerar diferença falsa se só um dos documentos quebrar ali.
- **Precisão com documentos reais:** a suíte usa PDFs sintéticos de uma coluna. Validar com requerimentos reais da SEMADES (colunas, tabelas, cabeçalhos e rodapés repetidos, numeração de páginas) antes de desligar o modo demonstrativo; limitações em `docs/criterios-comparacao.md`.
- **Backend:** executar os commits 8 a 20 de `docs/plano-backend.md`, em ordem. **Confirmar D1–D4 com o responsável** no commit 10, antes da entrega 2.
- **Login:** a autenticação real (credenciais SEMADES) depende de backend e de pedido explícito. Depois, implementar no app (login visual, sem autenticação real). A escolhida entra no app apenas como tela visual: sem autenticação real até haver backend e pedido explícito.
- **Validação institucional:** 12 pontos em `docs/identidade-visual.md`. Os principais são o uso em sistema web, o tamanho mínimo digital, a posição da marca, o ajuste de cor e a logo do AQR ao lado do PREFCG.
- **Logo do AQR:** converter a palavra em curvas, refinar o desenho e submeter à Diretoria Executiva de Comunicação Social.
- **Procedência da `prefcg-azul.svg`:** rodar o script de novo na região registrada gera 51 caminhos, mas o arquivo tem 48 (o README diz 48). A diferença vem de antes do rodapé novo e precisa ser explicada ou corrigida.
- **Arquivos oficiais:** se a Comunicação fornecer SVG ou AI da marca PREFCG digital azul, substituir o arquivo extraído (`src/assets/brand/`).
- **Acessibilidade:** testar com leitores de tela reais (NVDA, JAWS, VoiceOver).
- O texto "alterações apenas visuais não são avaliadas", no estado sem diferenças, antecipa um comportamento do mecanismo futuro e deve ser confirmado.

## Onde está cada coisa

| Assunto | Local |
|---|---|
| Rotas | `src/app/routes.tsx`, `src/config/routes.ts` |
| Transição entre páginas | `src/app/page-transition.ts` (sentido), `AppShell.tsx` (`view-transition-name: page`), CSS no fim de `src/styles/globals.css`; links e `navigate` usam `viewTransition` |
| Login e entrada animada | `src/pages/LoginPage.tsx`, `src/features/auth/` (sessão, `RequireAuth`, anéis, formulário, `entry/` com a logo em pontinhos e a passagem para o cabeçalho, `login.css`) |
| Propostas de transição de página | `docs/propostas-transicoes/transicoes.html` (`#t1` a `#t3`) |
| Propostas de barra superior | `docs/propostas-topbar/topbar.html` (`#v0` atual, `#v1` a `#v3`) e `icones-compactos.html` (`#v3` original, `#va` a `#vd`) e `sub-barras.html` (`#vd`, `#e1` a `#e3`) |
| Propostas de login | `docs/propostas-login/`: `propostas.html` (`#opcao-1` a `#opcao-3`) `variacoes-opcao-2.html` (`#2a` a `#2c`) `variacoes-2b.html` (fundos `#f1` a `#f5`) `login-2b-entrada-azul.html` (entrada em azul, `#e1` a `#e3`) `login-ondas.html` (login em azul com ondas, `#w1` a `#w4`; favorita `#w4`) `login-cubos.html` (cubos em onda, `#c1` a `#c5`) `login-aneis-variacoes.html` (variações finais, `#v0` a `#v3`) `login-noite-entradas.html` (entradas da Noite, `#a1` a `#a3`), `folhas-login.html` (folhas do cartão, `#f0` a `#f3`) `login-pontinhos.html` (versões da logo em pontinhos, `#p1` a `#p3`) `login-transicoes.html` (da logo para o site, `#t1` a `#t5`) e `sair-animacoes.html` (saída, `#s1` a `#s3`) |
| Página inicial | `src/pages/HomePage.tsx`, `src/features/home/` (dados em `tools.ts`, opções e demonstração em `components/`, ilustrações SVG + CSS em `illustrations/`) |
| Barra superior e sub-barra | `src/components/layout/AppHeader.tsx`, `ToolsNav.tsx` (sub-barra), `AccountMenu.tsx` (conta e "Sair"), `navigation.ts` (lista de ferramentas) |
| Logo AQR | `src/components/layout/AqrLogo.tsx`, `src/assets/aqr/`; apresentação em `docs/logo-aqr/` (HTML de origem + PDF) |
| Marca PREFCG | `src/components/layout/BrandMark.tsx`, `src/assets/brand/` (+ README de procedência) |
| Rodapé (SEMADES, slogan, PREFCG) | `src/components/layout/AppFooter.tsx`, `src/assets/brand/semades-azul.svg`, `slogan-azul.svg` |
| Cores e tokens | `src/styles/tokens.css` → `src/styles/globals.css` |
| Plano do backend | `docs/plano-backend.md` (decisões, endpoints, migrações, commits) |
| Extração de PDF (servidor) | `server/comparison/pdf/load.ts` (abre em modo restrito), `extract.ts` (palavras e caixas), `server/comparison/failure.ts` (erros de domínio), `limits.ts`; PDFs de teste em `server/test/make-pdf.ts` |
| Diferenças (servidor) | `server/comparison/text/normalize.ts` (chave de cada palavra), `tokenize.ts` (sequência de palavras com posição), `server/comparison/diff/align.ts` (palavras → linhas → erro) e `hunks.ts` (trechos alterados) |
| Resultado da comparação (servidor) | `server/comparison/compare-documents.ts` (`compareDocuments`), `context.ts` (rótulos), `regions.ts` (regiões e âncoras); critérios em `docs/criterios-comparacao.md` |
| API de comparação (servidor) | `server/comparison/routes.ts` (rotas), `worker-pool.ts` (threads, fila, tempo, memória), `worker.ts` (thread), `job-store.ts` (tarefas em memória com TTL); `server/http/errors.ts` (erros JSON), `file-name.ts` (nomes seguros); contratos em `shared/contracts/comparison.ts` (`ComparisonJob`) e `api-error.ts` |
| Servidor | `server/main.ts` (inicia), `server/app.ts` (`buildApp`, rotas; testes com `inject`), `server/config.ts` (variáveis de ambiente); `tsconfig.server.json` e `tsconfig.server.build.json` |
| Contratos da comparação | `src/features/comparison/model/types.ts` (serviço); tipos de dados em `shared/contracts/comparison.ts` |
| Dados fictícios | `src/features/comparison/mocks/demo-comparison.ts` |
| Serviço simulado (ponto de troca pelo backend) | `src/features/comparison/services/mock-comparison-service.ts` e `src/pages/ComparisonWorkspacePage.tsx` |
| Tela de envio | `src/pages/ComparisonSetupPage.tsx`, `src/features/comparison/components/FileSlot.tsx` |
| Workspace | `src/features/comparison/components/ComparisonWorkspace.tsx` e vizinhos |
| Testes | arquivos `*.test.ts(x)`; acessibilidade em `src/test/a11y.test.tsx` |
| Extração da marca a partir do PDF | `scripts/brand/extract_svg.py` (requer PyMuPDF) |
