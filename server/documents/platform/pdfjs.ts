import { createRequire } from 'node:module'
import path from 'node:path'
import type { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs'

/**
 * Opções do pdf.js que dependem do ambiente. No servidor: as fontes padrão (PDF sem fonte embutida)
 * vêm da pasta do pacote, no disco. A versão do navegador está em `pdfjs.browser.ts`.
 */
type DocumentInitParameters = NonNullable<Parameters<typeof getDocument>[0]>

export const pdfjsPlatformOptions: DocumentInitParameters = {
  standardFontDataUrl: `${path.join(path.dirname(createRequire(import.meta.url).resolve('pdfjs-dist/package.json')), 'standard_fonts')}${path.sep}`,
}
