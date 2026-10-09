import { Util } from 'pdfjs-dist/legacy/build/pdf.mjs'
import type { PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist/legacy/build/pdf.mjs'
import type { DocumentRole, NormalizedRect } from '../../../shared/contracts/comparison.ts'
import { ComparisonFailure } from '../failure.ts'
import type { ComparisonLimits } from '../limits.ts'
import { openPdf } from './load.ts'

/** Uma palavra como aparece na página, com a caixa normalizada (0–1, origem no canto superior esquerdo). */
export interface ExtractedWord {
  text: string
  region: NormalizedRect
}

export interface ExtractedLine {
  words: ExtractedWord[]
}

export interface ExtractedPage {
  pageNumber: number
  lines: ExtractedLine[]
}

export interface ExtractedDocument {
  role: DocumentRole
  pageCount: number
  pages: ExtractedPage[]
  /** Caracteres visíveis (sem espaços) no documento todo. */
  characterCount: number
}

type TextContent = Awaited<ReturnType<PDFPageProxy['getTextContent']>>
type TextItem = Extract<TextContent['items'][number], { str: string }>

interface PositionedChar {
  char: string
  x0: number
  x1: number
  top: number
  bottom: number
}

/** Valores de reserva quando o pdf.js não informa as métricas da fonte. */
const FALLBACK_ASCENT = 0.8
const FALLBACK_DESCENT = -0.2
/** Distância (em alturas de fonte) a partir da qual dois trechos na mesma linha ganham um espaço. */
const WORD_GAP = 0.2
/** Diferença de linha de base (em alturas de fonte) que separa duas linhas. */
const LINE_SHIFT = 0.5

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

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value))
}

function toWords(chars: readonly PositionedChar[], pageWidth: number, pageHeight: number): ExtractedWord[] {
  const words: ExtractedWord[] = []
  let current: PositionedChar[] = []
  const flush = () => {
    const first = current[0]
    const last = current[current.length - 1]
    if (first && last) {
      const top = Math.min(...current.map((char) => char.top))
      const bottom = Math.max(...current.map((char) => char.bottom))
      const x = clamp01(first.x0 / pageWidth)
      const y = clamp01(top / pageHeight)
      words.push({
        text: current.map((char) => char.char).join(''),
        region: {
          x,
          y,
          width: clamp01(last.x1 / pageWidth) - x,
          height: clamp01(bottom / pageHeight) - y,
        },
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
        chars.push({ char: ' ', x0: lastEnd, x1: x, top: 0, bottom: 0 })
      }

      const top = baseline - ascent * fontHeight
      const bottom = baseline - descent * fontHeight
      const weights = symbols.map(glyphWeight)
      const scale = item.width / weights.reduce((sum, weight) => sum + weight, 0)
      let cursor = x
      symbols.forEach((char, index) => {
        const width = (weights[index] ?? 0) * scale
        chars.push({ char, x0: cursor, x1: cursor + width, top, bottom })
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

async function extractPages(pdf: PDFDocumentProxy, role: DocumentRole, limits: ComparisonLimits, deadline: number) {
  const pages: ExtractedPage[] = []
  let characterCount = 0
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    if (Date.now() > deadline) throw new ComparisonFailure('tempo-esgotado', role)
    const page = await pdf.getPage(pageNumber)
    const viewport = page.getViewport({ scale: 1 })
    const content = await page.getTextContent()
    const lines = linesOf(content, viewport.transform, viewport.width, viewport.height)
    page.cleanup()
    for (const line of lines) for (const word of line.words) characterCount += Array.from(word.text).length
    if (characterCount > limits.maxTextCharacters) throw new ComparisonFailure('texto-demais', role)
    pages.push({ pageNumber, lines })
  }
  return { pages, characterCount }
}

/**
 * Abre um PDF e extrai o texto com a posição de cada palavra. Recusa, com `ComparisonFailure`,
 * arquivos inválidos, protegidos, grandes demais, lentos demais ou sem texto (digitalizados).
 */
export async function extractDocument(
  bytes: Uint8Array,
  role: DocumentRole,
  limits: ComparisonLimits,
): Promise<ExtractedDocument> {
  const deadline = Date.now() + limits.extractionTimeoutMs
  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new ComparisonFailure('tempo-esgotado', role)), limits.extractionTimeoutMs)
  })

  let pdf: PDFDocumentProxy | undefined
  let settled = false
  const work = (async () => {
    const opened = await openPdf(bytes, role, limits)
    if (settled) {
      // O tempo esgotou enquanto o arquivo abria: libera o documento e não continua.
      await opened.loadingTask.destroy()
      throw new ComparisonFailure('tempo-esgotado', role)
    }
    pdf = opened
    const { pages, characterCount } = await extractPages(opened, role, limits, deadline)
    if (characterCount < limits.minTextCharacters) throw new ComparisonFailure('sem-texto', role)
    return { role, pageCount: opened.numPages, pages, characterCount }
  })()

  try {
    return await Promise.race([work, timeout])
  } catch (error) {
    if (error instanceof ComparisonFailure) throw error
    throw new ComparisonFailure('falha-inesperada', role, { cause: error })
  } finally {
    settled = true
    clearTimeout(timer)
    // Se o tempo esgotou, a extração ainda pode estar em curso: ela termina e é descartada.
    work.catch(() => undefined)
    await pdf?.loadingTask.destroy()
  }
}
