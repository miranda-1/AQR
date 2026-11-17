import { OPS, Util } from 'pdfjs-dist/legacy/build/pdf.mjs'
import type { PDFPageProxy } from 'pdfjs-dist/legacy/build/pdf.mjs'
import type { NormalizedRect } from '../../../shared/contracts/comparison.ts'
import { clamp01 } from '../geometry.ts'

/**
 * Objetos de uma página lidos da lista de operadores do pdf.js: onde cada imagem é desenhada e
 * quantos desenhos vetoriais existem. É evidência do próprio arquivo, independente da renderização.
 */

export interface ImagePlacement {
  /** Caixa da imagem na página (normalizada). */
  region: NormalizedRect
  /** Largura e altura da imagem em pixels, como gravada no PDF (0 quando desconhecida). */
  pixelWidth: number
  pixelHeight: number
}

export interface FontDescriptor {
  /** Família genérica informada pelo pdf.js: "serif", "sans-serif" ou "monospace". */
  family: string
  bold: boolean
  italic: boolean
  /**
   * Identidade da fonte: família, estilo, caixa dos glifos e matriz. Duas fontes com a mesma
   * assinatura desenham igual; o pdf.js não expõe o nome PostScript, então não se mostra nome.
   */
  signature: string
}

export interface PageObjects {
  images: ImagePlacement[]
  /** Operadores de desenho vetorial (caminhos preenchidos ou contornados). */
  vectorPaths: number
  fonts: Map<string, FontDescriptor>
}

type Matrix = [number, number, number, number, number, number]

const IDENTITY: Matrix = [1, 0, 0, 1, 0, 0]

function toMatrix(value: unknown): Matrix | undefined {
  if (!Array.isArray(value) && !ArrayBuffer.isView(value)) return undefined
  const numbers = Array.from(value as ArrayLike<unknown>)
  if (numbers.length < 6 || numbers.slice(0, 6).some((item) => typeof item !== 'number')) return undefined
  return numbers.slice(0, 6) as Matrix
}

function multiply(a: Matrix, b: Matrix): Matrix {
  return Util.transform(a, b) as Matrix
}

function unitSquareBounds(matrix: Matrix, viewport: Matrix, width: number, height: number): NormalizedRect {
  const full = multiply(viewport, matrix)
  const corners = [
    [0, 0],
    [1, 0],
    [0, 1],
    [1, 1],
  ].map(([x = 0, y = 0]) => [full[0] * x + full[2] * y + full[4], full[1] * x + full[3] * y + full[5]] as const)
  const xs = corners.map(([x]) => x)
  const ys = corners.map(([, y]) => y)
  const left = clamp01(Math.min(...xs) / width)
  const top = clamp01(Math.min(...ys) / height)
  return { x: left, y: top, width: clamp01(Math.max(...xs) / width) - left, height: clamp01(Math.max(...ys) / height) - top }
}

interface FontLike {
  fallbackName?: unknown
  bold?: unknown
  italic?: unknown
  bbox?: unknown
  fontMatrix?: unknown
  isType3Font?: unknown
  missingFile?: unknown
}

function describeFont(font: FontLike): FontDescriptor {
  const family = typeof font.fallbackName === 'string' ? font.fallbackName : 'desconhecida'
  const bold = font.bold === true
  const italic = font.italic === true
  const numbers = (value: unknown) =>
    Array.isArray(value) || ArrayBuffer.isView(value) ? Array.from(value as ArrayLike<number>).map((item) => Math.round(item * 1000) / 1000).join(',') : ''
  const signature = [family, bold, italic, font.isType3Font === true, font.missingFile === true, numbers(font.bbox), numbers(font.fontMatrix)].join('|')
  return { family, bold, italic, signature }
}

/**
 * Lê a lista de operadores da página: posição das imagens, quantidade de desenhos e as fontes usadas
 * pelos trechos de texto (`fontNames`, os ids do pdf.js).
 */
export async function readPageObjects(
  page: PDFPageProxy,
  viewportTransform: number[],
  viewportWidth: number,
  viewportHeight: number,
  fontNames: Iterable<string>,
): Promise<PageObjects> {
  const list = await page.getOperatorList()
  const viewport = toMatrix(viewportTransform) ?? IDENTITY
  const images: ImagePlacement[] = []
  let vectorPaths = 0
  let ctm: Matrix = IDENTITY
  const stack: Matrix[] = []

  for (let index = 0; index < list.fnArray.length; index += 1) {
    const fn = list.fnArray[index]
    const args: unknown = list.argsArray[index]
    switch (fn) {
      case OPS.save:
        stack.push(ctm)
        break
      case OPS.restore:
        ctm = stack.pop() ?? IDENTITY
        break
      case OPS.transform: {
        const matrix = toMatrix(args)
        if (matrix) ctm = multiply(ctm, matrix)
        break
      }
      case OPS.paintFormXObjectBegin: {
        stack.push(ctm)
        const matrix = Array.isArray(args) ? toMatrix(args[0]) : undefined
        if (matrix) ctm = multiply(ctm, matrix)
        break
      }
      case OPS.paintFormXObjectEnd:
        ctm = stack.pop() ?? IDENTITY
        break
      case OPS.paintImageXObject:
      case OPS.paintInlineImageXObject:
      case OPS.paintImageMaskXObject: {
        const region = unitSquareBounds(ctm, viewport, viewportWidth, viewportHeight)
        const [first, second, third] = Array.isArray(args) ? (args as unknown[]) : []
        const fromObject = first && typeof first === 'object' ? (first as { width?: unknown; height?: unknown }) : undefined
        const pixelWidth = typeof second === 'number' ? second : typeof fromObject?.width === 'number' ? fromObject.width : 0
        const pixelHeight = typeof third === 'number' ? third : typeof fromObject?.height === 'number' ? fromObject.height : 0
        if (region.width > 0 && region.height > 0) images.push({ region, pixelWidth, pixelHeight })
        break
      }
      case OPS.constructPath:
        vectorPaths += 1
        break
      default:
        break
    }
  }

  const fonts = new Map<string, FontDescriptor>()
  for (const name of fontNames) {
    if (fonts.has(name) || !page.commonObjs.has(name)) continue
    const font: unknown = page.commonObjs.get(name)
    if (font && typeof font === 'object') fonts.set(name, describeFont(font as FontLike))
  }
  return { images, vectorPaths, fonts }
}
