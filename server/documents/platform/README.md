# Plataforma da leitura de documentos

O motor de comparação (`server/comparison/`) e a leitura compartilhada (`server/documents/`) são
TypeScript comum. Só três pontos dependem do ambiente em que rodam, e ficam isolados aqui:

| Módulo | No servidor (Node.js) | No navegador (`*.browser.ts`) |
|---|---|---|
| `canvas.ts` | `@napi-rs/canvas` | `OffscreenCanvas` |
| `pdfjs.ts` | fontes padrão lidas do disco | fontes padrão servidas pelo próprio AQR; fábricas de canvas e filtros sem `document` |
| `ocr.ts` | modelo de português lido do disco | worker, núcleo WebAssembly e modelo servidos pelo próprio AQR (`/ocr/`) |

Cada `*.browser.ts` tem as mesmas exportações do módulo do servidor (conferido pelo TypeScript com
`satisfies typeof import(...)`). No build do navegador (`vite.config.ts`, plugin
`versoesDoNavegador`), um import de `x.ts` que tenha um `x.browser.ts` ao lado passa a usar este. O
servidor nunca carrega os `*.browser.ts`.

O navegador roda o motor num Web Worker (`src/features/comparison/local-engine/`), usado pela
versão pública (comparação no próprio computador, sem servidor).
