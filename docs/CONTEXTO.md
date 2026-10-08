# AQR: contexto do projeto

Leia este arquivo antes de mexer no projeto. Ele resume o que existe, o que já foi decidido e o que falta. **Atualize-o a cada alteração**, junto com o commit (regra no `CLAUDE.md`).

## O que é

AQR (Análise e Qualificação de Requerimentos) é um sistema interno da SEMADES, da Prefeitura Municipal de Campo Grande/MS. Tem dois módulos:

1. **Comparação de PDFs:** prioridade atual. Compara a versão original e a atualizada de um documento e aponta adições, exclusões e modificações.
2. **Triagem documental:** futuro. Vai identificar os tipos de documento de um processo e verificar os documentos obrigatórios. Hoje aparece apenas como "Em desenvolvimento".

O pedido original completo está em `~/Downloads/Prompt_AQR_2.0_Claude_Code.txt`. Os PDFs de marca também estão em `~/Downloads`.

## Estado atual

**Etapa 1, protótipo de frontend:** concluída e em revisão visual pelo responsável.

- Não há backend, processamento real de PDF, IA, banco de dados, autenticação nem deploy. **Não implementar** essas partes sem pedido explícito.
- O resultado da comparação usa **dados fictícios** (`src/features/comparison/mocks/`), identificados na interface.
- Funcionam de verdade:
  - navegação pelo menu "Ferramentas";
  - seleção e validação local dos PDFs (extensão, tipo, limite de 50 MB, assinatura `%PDF-`);
  - filtros, lista de diferenças, navegação (botões e Alt + ↑/↓), modos de visualização, zoom e rolagem sincronizada.
- São demonstrativos: o resultado, as etapas de processamento, os estados de erro (pelo menu "Simular estado" ou por `?cenario=`) e a exportação, que aparece como "indisponível".

**Próxima etapa, depois da aprovação visual:** mecanismo real de comparação de PDFs em TypeScript (Node.js), com testes, critérios de precisão e documentos sintéticos. Só depois disso, a triagem. Os contratos e o ponto de troca estão em `docs/arquitetura.md`.

## Como rodar

```bash
npm install
npm run dev     # http://localhost:5173 — abre direto em "Comparar documentos"
```

Antes de cada commit: `npm run lint`, `npm run typecheck`, `npm test` e `npm run build`.

## Decisões do responsável (não reverter sem pedir)

| Data | Decisão |
|---|---|
| 08/10/2026 | Usar **somente a marca PREFCG**, versão digital azul, sem "Siga @prefcg". A marca SEMADES não entra; a sigla aparece só no rodapé, em texto. |
| 08/10/2026 | Cor da marca unificada em **#283587**, o valor do manual. O arquivo 2026 tinha azuis divergentes. |
| 08/10/2026 | Limite de **50 MB** por PDF. |
| 08/10/2026 | Fonte da interface livre: escolhida **Plus Jakarta Sans** (OFL). As fontes da marca não têm licença web confirmada. |
| 08/10/2026 | **Sem página inicial institucional.** `/` redireciona para `/comparacao`. Nada de hero, seções promocionais ou linguagem de marketing. |
| 08/10/2026 | Barra superior: **menu "Ferramentas" à esquerda** (dropdown que desce da barra, sem overlay), logo AQR ao lado e **PREFCG à direita**. Sem "SEMADES" e sem "Protótipo" na barra. Sem menu lateral. |
| 08/10/2026 | **Sem linhas divisórias** cortando a tela (`border-b/t`, `divide-*`). A separação é feita por fundo tonal, sombra (`shadow-surface`) e espaçamento. |
| 08/10/2026 | Tela principal enxuta: título "Comparar documentos", o texto curto, os dois campos de arquivo, o botão e a seção recolhível "Como funciona". |
| 08/10/2026 | **Logo do AQR: Proposta 3, "Lente Q"**, com a lente centralizada entre o A e o R. Propostas em `docs/propostas-logo-aqr/`. |
| 08/10/2026 | **Toda alteração termina num commit e na atualização deste arquivo.** |

## Histórico

| Data | O que foi feito | Commit |
|---|---|---|
| 08/10/2026 | Análise dos 4 PDFs de marca, plano aprovado, construção do frontend completo (envio, workspace, estados, testes, acessibilidade) | `b7bf5db` |
| 08/10/2026 | Reformulação para ferramenta interna: home removida, menu "Ferramentas", tela enxuta | `b7bf5db` |
| 08/10/2026 | Barra superior reorganizada (Ferramentas à esquerda, PREFCG à direita) e remoção das linhas divisórias | `b7bf5db` |
| 08/10/2026 | Três propostas de logo em PDF; Proposta 3 aplicada no site e no favicon | `b7bf5db`, `d06be0d` |
| 08/10/2026 | Documentação de arquitetura, identidade e acessibilidade | `7674241` |
| 08/10/2026 | Criação deste arquivo de contexto e da regra de commit a cada alteração | ver `git log` |

## Pendências

- **Validação institucional:** 9 pontos em `docs/identidade-visual.md`. Os principais são o uso em sistema web, o tamanho mínimo digital, a posição da marca, o ajuste de cor e a logo do AQR ao lado do PREFCG.
- **Logo do AQR:** converter a palavra em curvas, refinar o desenho e submeter à Diretoria Executiva de Comunicação Social.
- **Arquivos oficiais:** se a Comunicação fornecer SVG ou AI da marca PREFCG digital azul, substituir o arquivo extraído (`src/assets/brand/`).
- **Acessibilidade:** testar com leitores de tela reais (NVDA, JAWS, VoiceOver).
- **Repositório:** sem servidor remoto. Os commits estão só na máquina local; perguntar antes de enviar para GitHub ou GitLab.
- O texto "alterações apenas visuais não são avaliadas", no estado sem diferenças, antecipa um comportamento do mecanismo futuro e deve ser confirmado.

## Onde está cada coisa

| Assunto | Local |
|---|---|
| Rotas | `src/app/routes.tsx`, `src/config/routes.ts` |
| Barra superior e menu | `src/components/layout/AppHeader.tsx`, `ToolsMenu.tsx`, `navigation.ts` |
| Logo AQR | `src/components/layout/AqrLogo.tsx`, `src/assets/aqr/` |
| Marca PREFCG | `src/components/layout/BrandMark.tsx`, `src/assets/brand/` (+ README de procedência) |
| Cores e tokens | `src/styles/tokens.css` → `src/styles/globals.css` |
| Contratos da comparação | `src/features/comparison/model/types.ts` |
| Dados fictícios | `src/features/comparison/mocks/demo-comparison.ts` |
| Serviço simulado (ponto de troca pelo backend) | `src/features/comparison/services/mock-comparison-service.ts` e `src/pages/ComparisonWorkspacePage.tsx` |
| Tela de envio | `src/pages/ComparisonSetupPage.tsx`, `src/features/comparison/components/FileSlot.tsx` |
| Workspace | `src/features/comparison/components/ComparisonWorkspace.tsx` e vizinhos |
| Testes | arquivos `*.test.ts(x)`; acessibilidade em `src/test/a11y.test.tsx` |
| Extração da marca a partir do PDF | `scripts/brand/extract_svg.py` (requer PyMuPDF) |
