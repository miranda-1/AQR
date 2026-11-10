import { createHash } from 'node:crypto'
import { Util } from 'pdfjs-dist/legacy/build/pdf.mjs'
import type { PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist/legacy/build/pdf.mjs'
import type { NormalizedRect, PageContentType } from '../../../shared/contracts/comparison.ts'
import { DocumentFailure } from '../failure.ts'
import { area, clamp01, rotateRect } from '../geometry.ts'
import type { ReadingLimits } from '../limits.ts'
import { openPdf } from './load.ts'
import { readPageObjects, type PageObjects } from './page-objects.ts'
import { readingOrder, type ReadingOrderKind } from './reading-order.ts'
import { renderPage, scaleForWidth, toGray } from './render.ts'

/** Uma palavra como aparece na página, com a caixa normalizada (0–1, origem no canto superior esquerdo). */
export interface ExtractedWord {
  text: string
  region: NormalizedRect
  /** De onde veio a palavra: camada de texto do PDF ou OCR. */
  source: 'text-layer' | 'ocr'
  /** Fonte da palavra (id do pdf.js na página; ver `PageObjects.fonts`). Só na camada de texto. */
  font?: string
  /** Altura da fonte, em pontos. */
  fontSize?: number
  /** Confiança do OCR (0–100), só em palavras reconhecidas por OCR. */
  confidence?: number
}

export interface ExtractedLine {
  words: ExtractedWord[]
}

export interface ExtractedPage {
  pageNumber: number
  lines: ExtractedLine[]
}

/** `role` é o rótulo do documento na tarefa: na comparação, "original" ou "updated"; na triagem, o anexo. */
export interface ExtractedDocument<L extends string = string> {
  role: L
  pageCount: number
  pages: ExtractedPage[]
  /** Caracteres visíveis (sem espaços) no documento todo. */
  characterCount: number
}

/** Prévia de baixa resolução da página: base para a classificação e para achar páginas iguais. */
export interface PagePreview {
  /** Resumo exato dos pixels da prévia: páginas com o mesmo resumo são visualmente idênticas nesta resolução. */
  hash: string
  /** Página reduzida a uma grade de cinzas (`FINGERPRINT_COLUMNS` × `FINGERPRINT_ROWS`), para semelhança aproximada. */
  fingerprint: Uint8Array
  /** Fração da página com tinta (pixels escuros). */
  inkRatio: number
}

export interface AnalyzedPage extends ExtractedPage {
  /** Tamanho em pontos já com a rotação aplicada. */
  width: number
  height: number
  rotation: number
  readingOrder: ReadingOrderKind
  objects: PageObjects
  /** Ausente quando a página não pôde ser desenhada. */
  preview: PagePreview | undefined
  content: PageContentType
  /** Caracteres visíveis vindos da camada de texto. */
  textCharacters: number
  /** Fração da página coberta por imagens. */
  imageCoverage: number
}

export interface AnalyzedDocument<L extends string = string> extends ExtractedDocument<L> {
  pages: AnalyzedPage[]
  /** PDF aberto, para renderizar páginas e fazer OCR depois. Feche com `close()`. */
  pdf: PDFDocumentProxy
  close: () => Promise<void>
}

type TextContent = Awaited<ReturnType<PDFPageProxy['getTextContent']>>
type TextItem = Extract<TextContent['items'][number], { str: string }>

interface PositionedChar {
  char: string
  x0: number
  x1: number
  top: number
  bottom: number
  font: string
  size: number
}

/** Valores de reserva quando o pdf.js não informa as métricas da fonte. */
const FALLBACK_ASCENT = 0.8
const FALLBACK_DESCENT = -0.2
/** Distância (em alturas de fonte) a partir da qual dois trechos na mesma linha ganham um espaço. */
const WORD_GAP = 0.2
/** Diferença de linha de base (em alturas de fonte) que separa duas linhas. */
const LINE_SHIFT = 0.5

/** Largura da prévia, em pixels (≈ 36 dpi numa página A4). */
export const PREVIEW_WIDTH = 300
/** Grade de semelhança visual (colunas × linhas), igual para qualquer tamanho de página. */
export const FINGERPRINT_COLUMNS = 16
export const FINGERPRINT_ROWS = 20
/** Pixel com luminância abaixo disto conta como tinta. */
const INK_LEVEL = 200
/** Caracteres numa página abaixo dos quais o texto é considerado insuficiente, se houver tinta. */
const MIN_PAGE_CHARACTERS = 20
/** Tinta mínima para uma página contar como não vazia. */
const BLANK_INK = 0.002
/** Fração de imagem que torna uma página sem texto uma digitalização; com texto, uma página mista. */
const SCANNED_IMAGE_COVERAGE = 0.5
const MIXED_IMAGE_COVERAGE = 0.25

/**
 * Largura relativa aproximada de cada caractere em fontes proporcionais. O pdf.js informa só a
 * largura do trecho inteiro; estes pesos repartem essa largura entre os caracteres, o que
 * posiciona melhor as palavras do que uma divisão igual (um "i" é bem mais estreito que um "M").
 */
function glyphWeight(char: string): number {
  if (/\s/u.test(char)) return 0.28
  if (/[.,:;'!|ºª°]/u.test(char)) return 0.3
  if (/[ijlIíìï]/u.test(char)) return 0.24
  if (/[ftr()[\]\-/]/u.test(char)) return 0.34
  if (/[mwMW]/u.test(char)) return 0.86
  if (/[0-9]/u.test(char)) return 0.56
  if (/\p{Lu}/u.test(char)) return 0.68
  return 0.54
}

function at(values: readonly number[], index: number): number {
  return values[index] ?? 0
}

function isTextItem(item: TextContent['items'][number]): item is TextItem {
  return 'str' in item
}

function toWords(chars: readonly PositionedChar[], pageWidth: number, pageHeight: number): ExtractedWord[] {
  const words: ExtractedWord[] = []
  let current: PositionedChar[] = []
  const flush = () => {
    const first = current[0]
    const last = current[current.length - 1]
    if (first && last) {
      // Laço em vez de Math.min(...lista): uma "palavra" sem espaços pode ser enorme.
      const top = current.reduce((low, char) => Math.min(low, char.top), Infinity)
      const bottom = current.reduce((high, char) => Math.max(high, char.bottom), -Infinity)
      const x = clamp01(first.x0 / pageWidth)
      const y = clamp01(top / pageHeight)
      words.push({
        text: current.map((char) => char.char).join(''),
        region: { x, y, width: clamp01(last.x1 / pageWidth) - x, height: clamp01(bottom / pageHeight) - y },
        source: 'text-layer',
        font: first.font,
        fontSize: Math.round(first.size * 100) / 100,
      })
    }
    current = []
  }
  for (const char of chars) {
    if (/\s/u.test(char.char)) flush()
    else current.push(char)
  }
  flush()
  return words
}

/** Monta as linhas de uma página a partir dos trechos de texto do pdf.js, na ordem do conteúdo. */
function linesOf(content: TextContent, viewportTransform: number[], pageWidth: number, pageHeight: number): ExtractedLine[] {
  const lines: ExtractedLine[] = []
  let chars: PositionedChar[] = []
  let lastBaseline = 0
  let lastEnd = 0
  let lastHeight = 0

  const closeLine = () => {
    const words = toWords(chars, pageWidth, pageHeight)
    if (words.length > 0) lines.push({ words })
    chars = []
  }

  for (const item of content.items) {
    if (!isTextItem(item)) continue
    const transform = Util.transform(viewportTransform, item.transform) as number[]
    const fontHeight = Math.hypot(at(transform, 2), at(transform, 3)) || Math.abs(item.height) || 1
    const x = at(transform, 4)
    const baseline = at(transform, 5)
    const style = content.styles[item.fontName]
    const ascent = style && style.ascent > 0 ? style.ascent : FALLBACK_ASCENT
    const descent = style && style.descent < 0 ? style.descent : FALLBACK_DESCENT
    const symbols = Array.from(item.str)

    if (symbols.length > 0) {
      const sameLine =
        chars.length > 0 &&
        Math.abs(baseline - lastBaseline) <= LINE_SHIFT * Math.max(fontHeight, lastHeight) &&
        x >= lastEnd - fontHeight
      if (chars.length > 0 && !sameLine) closeLine()

      const previous = chars[chars.length - 1]
      const startsWithSpace = /^\s/u.test(item.str)
      if (previous && !/\s/u.test(previous.char) && !startsWithSpace && x - lastEnd > WORD_GAP * fontHeight) {
        chars.push({ char: ' ', x0: lastEnd, x1: x, top: 0, bottom: 0, font: item.fontName, size: fontHeight })
      }

      const top = baseline - ascent * fontHeight
      const bottom = baseline - descent * fontHeight
      const weights = symbols.map(glyphWeight)
      const scale = item.width / weights.reduce((sum, weight) => sum + weight, 0)
      let cursor = x
      symbols.forEach((char, index) => {
        const width = (weights[index] ?? 0) * scale
        chars.push({ char, x0: cursor, x1: cursor + width, top, bottom, font: item.fontName, size: fontHeight })
        cursor += width
      })
      lastBaseline = baseline
      lastEnd = x + item.width
      lastHeight = fontHeight
    }
    if (item.hasEOL) closeLine()
  }
  closeLine()
  return lines
}

export function countCharacters(lines: readonly ExtractedLine[]): number {
  let count = 0
  for (const line of lines) for (const word of line.words) count += Array.from(word.text).length
  return count
}

/** Fração aproximada da página coberta por imagens (sobreposições contadas uma vez, por grade). */
function coverageOf(regions: readonly NormalizedRect[]): number {
  if (regions.length === 0) return 0
  if (regions.length === 1) return area(regions[0] ?? { x: 0, y: 0, width: 0, height: 0 })
  const grid = 50
  let covered = 0
  for (let row = 0; row < grid; row += 1) {
    for (let column = 0; column < grid; column += 1) {
      const x = (column + 0.5) / grid
      const y = (row + 0.5) / grid
      if (regions.some((region) => x >= region.x && x <= region.x + region.width && y >= region.y && y <= region.y + region.height)) covered += 1
    }
  }
  return covered / (grid * grid)
}

async function previewOf(page: PDFPageProxy): Promise<PagePreview | undefined> {
  try {
    const raster = await renderPage(page, { scale: scaleForWidth(page, PREVIEW_WIDTH) })
    const gray = toGray(raster)
    let ink = 0
    for (const value of gray) if (value < INK_LEVEL) ink += 1
    const columns = FINGERPRINT_COLUMNS
    const rows = FINGERPRINT_ROWS
    const sums = new Float64Array(columns * rows)
    const counts = new Uint32Array(columns * rows)
    for (let y = 0; y < raster.height; y += 1) {
      const row = Math.min(rows - 1, Math.floor((y * rows) / raster.height))
      for (let x = 0; x < raster.width; x += 1) {
        const cell = row * columns + Math.min(columns - 1, Math.floor((x * columns) / raster.width))
        sums[cell] = (sums[cell] ?? 0) + (gray[y * raster.width + x] ?? 255)
        counts[cell] = (counts[cell] ?? 0) + 1
      }
    }
    const fingerprint = new Uint8Array(columns * rows)
    for (let cell = 0; cell < fingerprint.length; cell += 1) fingerprint[cell] = Math.round((sums[cell] ?? 0) / Math.max(1, counts[cell] ?? 1))
    const hash = createHash('sha256').update(raster.data).digest('hex')
    return { hash, fingerprint, inkRatio: ink / gray.length }
  } catch {
    return undefined
  }
}

/**
 * Classifica a página pelo que a extração e a prévia mostram. A regra é por página (e não pelo
 * documento inteiro), para que um PDF misto não esconda páginas digitalizadas.
 */
export function classifyPage(input: {
  textCharacters: number
  imageCoverage: number
  vectorPaths: number
  images: number
  preview: PagePreview | undefined
}): PageContentType {
  const { textCharacters, imageCoverage, preview } = input
  if (!preview) return 'uncertain'
  if (textCharacters === 0) {
    if (preview.inkRatio < BLANK_INK) return 'blank'
    if (imageCoverage >= SCANNED_IMAGE_COVERAGE) return 'scanned'
    return 'graphics'
  }
  if (imageCoverage >= MIXED_IMAGE_COVERAGE) return 'mixed'
  if (textCharacters < MIN_PAGE_CHARACTERS && preview.inkRatio > 0.03) return 'insufficient-text'
  return 'text'
}

async function analyzePage(
  pdf: PDFDocumentProxy,
  pageNumber: number,
  options: { objects: boolean; preview: boolean },
): Promise<AnalyzedPage> {
  const page = await pdf.getPage(pageNumber)
  try {
    const viewport = page.getViewport({ scale: 1 })
    // O texto é lido na página sem a rotação declarada (onde as linhas são horizontais) e os
    // retângulos são girados depois para a orientação exibida, que é a do visualizador.
    const upright = page.getViewport({ scale: 1, rotation: 0 })
    const content = await page.getTextContent()
    const rawLines = linesOf(content, upright.transform, upright.width, upright.height)
    const ordered = readingOrder(rawLines)
    if (page.rotate % 360 !== 0) {
      for (const line of ordered.lines) for (const word of line.words) word.region = rotateRect(word.region, page.rotate)
    }
    const objects: PageObjects = options.objects
      ? await readPageObjects(page, viewport.transform, viewport.width, viewport.height, Object.keys(content.styles))
      : { images: [], vectorPaths: 0, fonts: new Map() }
    const preview = options.preview ? await previewOf(page) : undefined
    const textCharacters = countCharacters(ordered.lines)
    const imageCoverage = coverageOf(objects.images.map((image) => image.region))
    const content_ = options.preview
      ? classifyPage({ textCharacters, imageCoverage, vectorPaths: objects.vectorPaths, images: objects.images.length, preview })
      : textCharacters > 0
        ? 'text'
        : 'uncertain'
    return {
      pageNumber,
      lines: ordered.lines,
      readingOrder: ordered.kind,
      width: viewport.width,
      height: viewport.height,
      rotation: page.rotate,
      objects,
      preview,
      content: content_,
      textCharacters,
      imageCoverage,
    }
  } finally {
    page.cleanup()
  }
}

export interface AnalyzeOptions {
  /** Lê imagens e fontes (lista de operadores). */
  objects?: boolean
  /** Desenha a prévia de cada página (classificação e semelhança visual). */
  preview?: boolean
}

/**
 * Abre um PDF e examina cada página: texto com posição, fonte e tamanho; imagens; prévia
 * renderizada; tipo de conteúdo. Recusa, com `DocumentFailure`, arquivos inválidos, protegidos,
 * grandes demais ou lentos demais. Não recusa PDFs sem texto: cada página diz o que tem.
 * O PDF fica aberto (`close()` o libera) para a comparação visual e o OCR.
 */
export async function analyzeDocument<L extends string>(
  bytes: Uint8Array,
  role: L,
  limits: ReadingLimits,
  options: AnalyzeOptions = {},
): Promise<AnalyzedDocument<L>> {
  const { objects = true, preview = true } = options
  const deadline = Date.now() + limits.extractionTimeoutMs
  const pdf = await openPdf(bytes, role, limits)
  const close = () => pdf.loadingTask.destroy()
  try {
    const pages: AnalyzedPage[] = []
    let characterCount = 0
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      if (Date.now() > deadline) throw new DocumentFailure('tempo-esgotado', role)
      const page = await analyzePage(pdf, pageNumber, { objects, preview })
      characterCount += page.textCharacters
      if (characterCount > limits.maxTextCharacters) throw new DocumentFailure('texto-demais', role)
      pages.push(page)
    }
    return { role, pageCount: pdf.numPages, pages, characterCount, pdf, close }
  } catch (error) {
    await close()
    if (error instanceof DocumentFailure) throw error
    throw new DocumentFailure('falha-inesperada', role, { cause: error })
  }
}

/**
 * Só o texto, como antes da comparação visual: abre, extrai e fecha. Recusa PDF sem texto
 * (`sem-texto`), porque quem chama não tem outro método para ler o documento.
 */
export async function extractDocument<L extends string>(bytes: Uint8Array, role: L, limits: ReadingLimits): Promise<ExtractedDocument<L>> {
  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new DocumentFailure('tempo-esgotado', role)), limits.extractionTimeoutMs)
  })
  const work = analyzeDocument(bytes, role, limits, { objects: false, preview: false })
  try {
    const analyzed = await Promise.race([work, timeout])
    if (analyzed.characterCount < limits.minTextCharacters) throw new DocumentFailure('sem-texto', role)
    return {
      role,
      pageCount: analyzed.pageCount,
      pages: analyzed.pages.map(({ pageNumber, lines }) => ({ pageNumber, lines })),
      characterCount: analyzed.characterCount,
    }
  } finally {
    clearTimeout(timer)
    // Libera o PDF; se o tempo esgotou, quando a extração terminar.
    work.then((analyzed) => analyzed.close()).catch(() => undefined)
  }
}

