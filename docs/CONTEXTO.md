# AQR: contexto do projeto

Leia este arquivo antes de mexer no projeto. Ele resume o que existe, o que já foi decidido e o que falta. **Atualize-o a cada alteração**, junto com o commit (regra no `CLAUDE.md`).

## O que é

AQR (Análise e Qualificação de Requerimentos) é um sistema interno da SEMADES, da Prefeitura Municipal de Campo Grande/MS. Tem dois módulos:

1. **Comparação de PDFs:** prioridade atual. Compara a versão original e a atualizada de um documento e aponta adições, exclusões e modificações.
2. **Triagem documental:** futuro. Vai identificar os tipos de documento de um processo e verificar os documentos obrigatórios. Hoje aparece apenas como "Em desenvolvimento".

O pedido original completo está em `~/Downloads/Prompt_AQR_2.0_Claude_Code.txt`. Os PDFs de marca também estão em `~/Downloads`.

## Estado atual

**Etapa 1, protótipo de frontend:** concluída e em revisão visual pelo responsável.

- Não há backend, processamento real de PDF, IA, banco de dados, autenticação real nem deploy. **Não implementar** essas partes sem pedido explícito.
- **Login visual** (`/entrar`): aparece antes de qualquer página. Não verifica credenciais: qualquer usuário e senha preenchidos entram. A sessão vale para a aba (`sessionStorage`) e termina ao fechá-la.
- O resultado da comparação usa **dados fictícios** (`src/features/comparison/mocks/`), identificados na interface.
- Funcionam de verdade:
  - login "Noite" (anéis pontilhados parados, cartão com folhas em leque, PREFCG) com a entrada animada: os pontos dos anéis formam o AQR, uma varredura amarela troca os pontos pela logo, e a logo voa até o cabeçalho do site; depois de entrar, a pessoa vai para a página que tinha pedido (ou para o início); "Sair" (menu Ferramentas) faz o caminho inverso, com a logo voltando ao centro e virando pontinhos;
  - página inicial (`/`) com seletor das ferramentas e ilustrações animadas em SVG/CSS (pausadas fora da tela; estáticas com movimento reduzido);
  - navegação pelo menu "Ferramentas";
  - seleção e validação local dos PDFs (extensão, tipo, limite de 50 MB, assinatura `%PDF-`);
  - filtros, lista de diferenças, navegação (botões e Alt + ↑/↓), modos de visualização, zoom e rolagem sincronizada.
- São demonstrativos: o resultado, as etapas de processamento, os estados de erro (pelo menu "Simular estado" ou por `?cenario=`) e a exportação, que aparece como "indisponível".

**Próxima etapa, depois da aprovação visual:** mecanismo real de comparação de PDFs em TypeScript (Node.js), com testes, critérios de precisão e documentos sintéticos. Só depois disso, a triagem. Os contratos e o ponto de troca estão em `docs/arquitetura.md`.

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
```

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
| 08/10/2026 | Barra superior: **menu "Ferramentas" à esquerda** (dropdown que desce da barra, sem overlay), logo AQR ao lado e **PREFCG à direita**. Sem "SEMADES" e sem "Protótipo" na barra. Sem menu lateral. |
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
| 09/10/2026 | Escolhidos os "ícones compactos". Três versões (indicador deslizante, com rótulos, flutuante) em `docs/propostas-topbar/icones-compactos.html` | ver `git log` |

## Pendências

- **Barra superior:** base escolhida, "ícones compactos". Falta escolher a versão em `docs/propostas-topbar/icones-compactos.html` (`#va` indicador deslizante, `#vb` com rótulos, `#vc` flutuante); a escolhida substitui a decisão registrada sobre a barra.
- **Login:** "Sair" foi posto no fim do menu Ferramentas, sem mudar a barra superior. Confirmar com o responsável se o lugar está bom. A autenticação real (credenciais SEMADES) depende de backend e de pedido explícito. Depois, implementar no app (login visual, sem autenticação real). A escolhida entra no app apenas como tela visual: sem autenticação real até haver backend e pedido explícito.
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
| Login e entrada animada | `src/pages/LoginPage.tsx`, `src/features/auth/` (sessão, `RequireAuth`, anéis, formulário, `entry/` com a logo em pontinhos e a passagem para o cabeçalho, `login.css`) |
| Propostas de barra superior | `docs/propostas-topbar/topbar.html` (`#v0` atual, `#v1` a `#v3`) e `icones-compactos.html` (`#v3` original, `#va` a `#vc`) |
| Propostas de login | `docs/propostas-login/`: `propostas.html` (`#opcao-1` a `#opcao-3`) `variacoes-opcao-2.html` (`#2a` a `#2c`) `variacoes-2b.html` (fundos `#f1` a `#f5`) `login-2b-entrada-azul.html` (entrada em azul, `#e1` a `#e3`) `login-ondas.html` (login em azul com ondas, `#w1` a `#w4`; favorita `#w4`) `login-cubos.html` (cubos em onda, `#c1` a `#c5`) `login-aneis-variacoes.html` (variações finais, `#v0` a `#v3`) `login-noite-entradas.html` (entradas da Noite, `#a1` a `#a3`) `login-pontinhos.html` (versões da logo em pontinhos, `#p1` a `#p3`) `login-transicoes.html` (da logo para o site, `#t1` a `#t5`) e `sair-animacoes.html` (saída, `#s1` a `#s3`) |
| Página inicial | `src/pages/HomePage.tsx`, `src/features/home/` (dados em `tools.ts`, opções e demonstração em `components/`, ilustrações SVG + CSS em `illustrations/`) |
| Barra superior e menu | `src/components/layout/AppHeader.tsx`, `ToolsMenu.tsx`, `navigation.ts` |
| Logo AQR | `src/components/layout/AqrLogo.tsx`, `src/assets/aqr/`; apresentação em `docs/logo-aqr/` (HTML de origem + PDF) |
| Marca PREFCG | `src/components/layout/BrandMark.tsx`, `src/assets/brand/` (+ README de procedência) |
| Rodapé (SEMADES, slogan, PREFCG) | `src/components/layout/AppFooter.tsx`, `src/assets/brand/semades-azul.svg`, `slogan-azul.svg` |
| Cores e tokens | `src/styles/tokens.css` → `src/styles/globals.css` |
| Contratos da comparação | `src/features/comparison/model/types.ts` |
| Dados fictícios | `src/features/comparison/mocks/demo-comparison.ts` |
| Serviço simulado (ponto de troca pelo backend) | `src/features/comparison/services/mock-comparison-service.ts` e `src/pages/ComparisonWorkspacePage.tsx` |
| Tela de envio | `src/pages/ComparisonSetupPage.tsx`, `src/features/comparison/components/FileSlot.tsx` |
| Workspace | `src/features/comparison/components/ComparisonWorkspace.tsx` e vizinhos |
| Testes | arquivos `*.test.ts(x)`; acessibilidade em `src/test/a11y.test.tsx` |
| Extração da marca a partir do PDF | `scripts/brand/extract_svg.py` (requer PyMuPDF) |
