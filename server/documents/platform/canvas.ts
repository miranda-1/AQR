import { createCanvas } from '@napi-rs/canvas'

/**
 * Canvas para desenhar páginas no servidor (`@napi-rs/canvas`, binário pré-compilado, sem rede).
 * A versão do navegador (`canvas.browser.ts`) usa `OffscreenCanvas`. Ver `README.md`.
 */

/** O pedaço da API 2D usado pela leitura (o resto vai direto ao pdf.js). */
export interface PageContext2D {
  fillStyle: unknown
  fillRect(x: number, y: number, width: number, height: number): void
  getImageData(x: number, y: number, width: number, height: number): { data: Uint8ClampedArray }
}

export interface PageCanvas {
  canvas: unknown
  context: PageContext2D
  /** Imagem PNG do canvas, no formato que o Tesseract aceita no ambiente. */
  png(): Promise<Buffer | Blob>
}

export function createPageCanvas(width: number, height: number): PageCanvas {
  const canvas = createCanvas(width, height)
  return { canvas, context: canvas.getContext('2d'), png: async () => canvas.toBuffer('image/png') }
}
