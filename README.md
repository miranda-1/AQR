# AQR — Análise e Qualificação de Requerimentos

Sistema da SEMADES, da Prefeitura Municipal de Campo Grande/MS.

> **Etapa atual: protótipo de frontend.** Não há backend, processamento de PDFs nem IA. Os resultados da comparação são **dados fictícios**, identificados como tal na interface.

## Executar

Requer Node.js 20.19 ou superior.

```bash
npm install
npm run dev        # http://localhost:5173 (abre direto em "Comparar documentos")
```

| Script | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Typecheck e build de produção em `dist/` |
| `npm run preview` | Serve o build localmente |
| `npm run typecheck` | Verificação de tipos (TypeScript strict) |
| `npm run lint` | ESLint, com regras de acessibilidade |
| `npm test` | Testes (Vitest + Testing Library + axe-core) |

## O que funciona de verdade e o que é demonstrativo

| Funciona de verdade | Demonstrativo |
|---|---|
| Navegação pelo menu "Ferramentas", layout responsivo | Resultado da comparação (documento fictício) |
| Seleção de PDFs por clique ou arrastar e soltar, substituição, remoção, inversão | Etapas de "processamento" (tempos fixos) |
| Validação local: extensão, tipo, limite de 50 MB, assinatura `%PDF-` | Estados de erro, acessíveis pelo seletor "Simular estado" |
| Filtros, lista de diferenças, navegação (botões e Alt + ↑/↓), modos de visualização, zoom, rolagem sincronizada | Exportação de relatório (indisponível, sinalizada na interface) |

Os arquivos escolhidos nunca saem do navegador: só os primeiros 5 bytes são lidos, para conferir a assinatura de PDF.

Para revisar um estado específico, use o endereço `/comparacao/resultado?cenario=` com um destes valores: `concluida`, `sem-diferencas`, `erro`, `incompativel` ou `sem-texto`.

## Documentação

- [Arquitetura e contratos para o backend](docs/arquitetura.md)
- [Identidade visual: decisões e pontos para validação institucional](docs/identidade-visual.md)
- [Acessibilidade](docs/acessibilidade.md)
- [Procedência da marca](src/assets/brand/README.md)
