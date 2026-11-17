# AQR — Análise e Qualificação de Requerimentos

Sistema da SEMADES, da Prefeitura Municipal de Campo Grande/MS.

> **Branch `master`: a versão pública, hospedada de graça na Cloudflare.** Tem só o comparador de PDFs, **real e sem login**: o mesmo motor da branch `dev` roda no próprio navegador (Web Worker), e os PDFs não saem do computador de quem compara. Não há servidor. A triagem documental, a administração de contas, o login (Keycloak) e a infraestrutura de IA ficam na branch **`dev`**, onde o desenvolvimento continua. Hospedagem: [docs/hospedagem-cloudflare.md](docs/hospedagem-cloudflare.md).

## Executar

Requer Node.js 22.13 ou superior.

```bash
npm install
npm run dev          # site em http://localhost:5173
```

| Script | O que faz |
|---|---|
| `npm run dev` | Site em modo de desenvolvimento |
| `npm run build` | Typecheck e build do site (`dist/`) |
| `npm run preview` | Serve o build do site localmente |
| `npm run typecheck` | Verificação de tipos (TypeScript strict) |
| `npm run lint` | ESLint, com regras de acessibilidade |
| `npm test` | Testes do frontend, do motor de comparação (Node) e do corpus sintético |

## O que funciona nesta branch

- Página inicial e navegação, sem login.
- Seleção de PDFs por clique ou arrastar e soltar, com validação local (extensão, tipo, 50 MB, assinatura `%PDF-`).
- **Comparação real no navegador**: o motor de `server/comparison/` (o mesmo da `dev`; aqui ele não é um servidor) roda num Web Worker, com os mesmos limites e o mesmo resultado (ver abaixo e `server/documents/platform/README.md`). Os PDFs ficam só na memória do navegador; o worker é encerrado no fim de cada comparação. O OCR usa os arquivos do tesseract.js servidos pelo próprio site (`/ocr/7.0.0/`), sem CDN.
- `VITE_COMPARISON_SERVICE=demo npm run dev` liga o resultado demonstrativo, com "Simular estado".

## O que a comparação real faz

- Seleção de PDFs por clique ou arrastar e soltar, com validação local (extensão, tipo, 50 MB, assinatura `%PDF-`).
- Comparação **híbrida** dos dois PDFs (no servidor, na `dev`; no navegador, aqui): texto (adições, exclusões, modificações e trechos movidos, com números, datas, valores e identificadores reconhecidos), estrutura (páginas incluídas, excluídas, movidas, repetidas, tamanho e orientação), aparência (imagens, desenhos, fonte, tamanho, cor, posição e diagramação) e documentos digitalizados (OCR local, sem rede). As evidências dos métodos são consolidadas: uma alteração vista pelo texto e pelos pixels aparece uma vez, como confirmada.
- Cada resultado diz **o que foi e o que não foi analisado** (página a página) e a situação: completa, com ressalvas ou parcial. "Nenhuma diferença" nunca é apresentada como prova de que os documentos são iguais.
- Modos Completo, Conteúdo e Visual; filtros por tipo e por categoria; exportação em HTML (com ou sem trechos dos documentos) e JSON, gerada no navegador.
- Visualizador com as páginas reais e os destaques, filtros, lista, navegação (botões e Alt + ↑/↓), modos de visualização, zoom e rolagem sincronizada.
- Os PDFs não são gravados: ficam na memória durante a comparação, e o resultado é descartado assim que chega à tela de quem comparou (ou 5 minutos depois de pronto, se ninguém o buscar).

Critérios de precisão e limitações: [docs/criterios-comparacao.md](docs/criterios-comparacao.md). Algoritmos: [docs/comparador/algoritmos.md](docs/comparador/algoritmos.md). Avaliação no corpus sintético e desempenho (comandos na `dev`): [avaliação](docs/comparador/avaliacao-corpus.md), [desempenho](docs/comparador/desempenho.md).

Nesta branch, os estados podem ser revisados por `/comparacao/resultado?cenario=` com `concluida`, `sem-diferencas`, `erro`, `incompativel` ou `sem-texto`.

## Documentação

- [Contexto, decisões e pendências](docs/CONTEXTO.md)
- [Hospedagem na Cloudflare](docs/hospedagem-cloudflare.md)
- [Arquitetura e contratos](docs/arquitetura.md)
- [Plano do backend](docs/plano-backend.md)
- [Critérios de precisão da comparação](docs/criterios-comparacao.md)
- [Algoritmos do comparador](docs/comparador/algoritmos.md)
- [Relatório final da evolução do comparador](AQR_COMPARADOR_IMPLEMENTACAO_FINAL.md)
- [Identidade visual: decisões e pontos para validação institucional](docs/identidade-visual.md)
- [Acessibilidade](docs/acessibilidade.md)
- [Procedência da marca](src/assets/brand/README.md)
