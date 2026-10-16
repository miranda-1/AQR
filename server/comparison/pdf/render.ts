import { createCanvas } from '@napi-rs/canvas'
import type { PDFPageProxy } from 'pdfjs-dist/legacy/build/pdf.mjs'

/**
 * Renderização de páginas no servidor (pdf.js + @napi-rs/canvas, binário pré-compilado, sem rede).
 * O resultado é uma imagem RGBA em memória; nada vai para o disco.
 */

export interface Raster {
  width: number
  height: number
  /** RGBA, 4 bytes por pixel, linha a linha. */
  data: Uint8ClampedArray
}

/** Maior lado aceito, em pixels, para não estourar a memória com páginas gigantes. */
export const MAX_RASTER_SIDE = 4000

export interface RenderOptions {
  /** Pixels por ponto (1 = 72 dpi). */
  scale: number
  /** Rotação usada no desenho (padrão: a da página). 0 desenha a página sem a rotação declarada. */
  rotation?: number
}

/** Escala que faz a página ter `targetWidth` pixels de largura. */
export function scaleForWidth(page: PDFPageProxy, targetWidth: number): number {
  return targetWidth / page.getViewport({ scale: 1 }).width
}

/**
 * Desenha a página na escala pedida. Duas páginas desenhadas na mesma escala têm o conteúdo no
 * mesmo tamanho, mesmo que o papel mude de tamanho, o que permite compará-las pixel a pixel.
 */
export async function renderPage(page: PDFPageProxy, options: RenderOptions): Promise<Raster> {
  const rotation = options.rotation ?? page.rotate
  const base = page.getViewport({ scale: 1, rotation })
  const scale = Math.min(options.scale, MAX_RASTER_SIDE / Math.max(base.width, base.height))
  const viewport = page.getViewport({ scale, rotation })
  const width = Math.max(1, Math.round(viewport.width))
  const height = Math.max(1, Math.round(viewport.height))
  const canvas = createCanvas(width, height)
  const context = canvas.getContext('2d')
  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, width, height)
  // Os tipos do pdf.js descrevem o canvas do navegador; o do @napi-rs/canvas tem a mesma API 2D.
  const renderParameters = { canvasContext: context, canvas, viewport, background: '#ffffff' } as unknown as Parameters<
    PDFPageProxy['render']
  >[0]
  await page.render(renderParameters).promise
  const image = context.getImageData(0, 0, width, height)
  return { width, height, data: image.data }
}

/** Luminância (0–255) de cada pixel. */
export function toGray(raster: Raster): Uint8Array {
  const gray = new Uint8Array(raster.width * raster.height)
  const { data } = raster
  for (let index = 0, pixel = 0; pixel < gray.length; index += 4, pixel += 1) {
    gray[pixel] = ((data[index] ?? 255) * 299 + (data[index + 1] ?? 255) * 587 + (data[index + 2] ?? 255) * 114) / 1000
  }
  return gray
}
