# AQR — Análise e Qualificação de Requerimentos

Sistema da SEMADES, da Prefeitura Municipal de Campo Grande/MS.

> **Etapa atual:** comparação real de PDFs (frontend + servidor Node.js). O login ainda é **apenas visual**: qualquer usuário e senha preenchidos entram; não há autenticação real.

## Executar

Requer Node.js 22.13 ou superior (para rodar os testes do servidor, 22.18 ou superior).

```bash
npm install
npm run dev:server   # API em http://127.0.0.1:3000
npm run dev          # em outro terminal: site em http://localhost:5173 (o Vite encaminha /api para a API)
```

Para revisar a interface sem servidor, com dados fictícios: `VITE_COMPARISON_SERVICE=demo npm run dev`.

| Script | O que faz |
|---|---|
| `npm run dev` | Site em modo de desenvolvimento |
| `npm run dev:server` | API em modo de desenvolvimento (recarrega ao salvar) |
| `npm run build` | Typecheck e build do site (`dist/`) e da API (`dist-server/`) |
| `npm run start:server` | Inicia a API já compilada |
| `npm run preview` | Serve o build do site localmente |
| `npm run typecheck` | Verificação de tipos (TypeScript strict) |
| `npm run lint` | ESLint, com regras de acessibilidade |
| `npm test` | Testes (frontend, servidor e ponta a ponta) |

Variáveis de ambiente: veja `.env.example`.

## O que funciona

- Seleção de PDFs por clique ou arrastar e soltar, com validação local (extensão, tipo, 50 MB, assinatura `%PDF-`).
- Comparação real do **texto** dos dois PDFs no servidor: adições, exclusões e modificações, com página, posição e contexto (artigo, parágrafo, cláusula ou título). Alterações só visuais não contam; PDFs digitalizados (sem texto) são recusados com uma mensagem clara, sem OCR.
- Visualizador com as páginas reais e os destaques, filtros, lista, navegação (botões e Alt + ↑/↓), modos de visualização, zoom e rolagem sincronizada.
- Os PDFs não são gravados: ficam na memória durante a comparação, e o resultado é descartado 30 minutos depois.

A exportação de relatório ainda está indisponível (sinalizada na interface). Critérios de precisão e limitações: [docs/criterios-comparacao.md](docs/criterios-comparacao.md).

No modo demonstrativo, os estados podem ser revisados por `/comparacao/resultado?cenario=` com `concluida`, `sem-diferencas`, `erro`, `incompativel` ou `sem-texto`.

## Documentação

- [Contexto, decisões e pendências](docs/CONTEXTO.md)
- [Arquitetura e contratos](docs/arquitetura.md)
- [Plano do backend](docs/plano-backend.md)
- [Critérios de precisão da comparação](docs/criterios-comparacao.md)
- [Identidade visual: decisões e pontos para validação institucional](docs/identidade-visual.md)
- [Acessibilidade](docs/acessibilidade.md)
- [Procedência da marca](src/assets/brand/README.md)
