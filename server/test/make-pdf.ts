import { PDFDocument, PDFHexString, StandardFonts, rgb } from 'pdf-lib'
import type { NormalizedRect } from '../../shared/contracts/comparison.ts'

/**
 * Gera PDFs sintéticos de verdade para os testes (pdf-lib, só em desenvolvimento).
 * Cada palavra desenhada é devolvida com a página e o retângulo esperados, que servem de
 * gabarito para medir a posição devolvida pela extração e pela comparação.
 */

export interface PdfLayout {
  /** Tamanho da fonte em pontos. Padrão: 12. */
  fontSize?: number
  /** Margem em pontos. Padrão: 72 (1 polegada). */
  margin?: number
  /** Distância entre linhas, em múltiplos do tamanho da fonte. Padrão: 1,5. */
  lineHeight?: number
  /**
   * Largura máxima da linha, em pontos. Quando presente, os parágrafos são quebrados
   * automaticamente (permite gerar o mesmo texto em outra diagramação).
   */
  wrapWidth?: number
}

export interface ExpectedWord {
  text: string
  pageNumber: number
  region: NormalizedRect
}

export interface SyntheticPdf {
  bytes: Uint8Array
  words: ExpectedWord[]
}

const PAGE_WIDTH = 595.28
const PAGE_HEIGHT = 841.89

/**
 * Cria um PDF A4. `pages` é uma lista de páginas; cada página, uma lista de parágrafos.
 * Sem `wrapWidth`, cada parágrafo ocupa uma linha.
 */
export async function makePdf(pages: readonly (readonly string[])[], layout: PdfLayout = {}): Promise<SyntheticPdf> {
  const { fontSize = 12, margin = 72, lineHeight = 1.5, wrapWidth } = layout
  const doc = await PDFDocument.create()
  doc.setCreationDate(new Date(0))
  doc.setModificationDate(new Date(0))
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const ascent = font.heightAtSize(fontSize, { descender: false })
  const descent = font.heightAtSize(fontSize) - ascent
  const spaceWidth = font.widthOfTextAtSize(' ', fontSize)
  const words: ExpectedWord[] = []

  pages.forEach((paragraphs, pageIndex) => {
    const page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT])
    let baseline = PAGE_HEIGHT - margin - ascent
    for (const paragraph of paragraphs) {
      for (const line of wrap(paragraph, (text) => font.widthOfTextAtSize(text, fontSize), wrapWidth)) {
        page.drawText(line, { x: margin, y: baseline, size: fontSize, font, color: rgb(0, 0, 0) })
        let x = margin
        for (const word of line.split(' ')) {
          const width = font.widthOfTextAtSize(word, fontSize)
          if (word) {
            words.push({
              text: word,
              pageNumber: pageIndex + 1,
              region: {
                x: x / PAGE_WIDTH,
                y: (PAGE_HEIGHT - baseline - ascent) / PAGE_HEIGHT,
                width: width / PAGE_WIDTH,
                height: (ascent + descent) / PAGE_HEIGHT,
              },
            })
          }
          x += width + spaceWidth
        }
        baseline -= fontSize * lineHeight
      }
    }
  })

  return { bytes: await doc.save({ useObjectStreams: false }), words }
}

function wrap(paragraph: string, measure: (text: string) => number, maxWidth: number | undefined): string[] {
  if (maxWidth === undefined) return [paragraph]
  const lines: string[] = []
  let current = ''
  for (const word of paragraph.split(' ')) {
    const candidate = current ? `${current} ${word}` : word
    if (current && measure(candidate) > maxWidth) {
      lines.push(current)
      current = word
    } else {
      current = candidate
    }
  }
  if (current) lines.push(current)
  return lines
}

/** PDF válido só com desenhos (como um documento digitalizado): nenhuma camada de texto. */
export async function makeImageOnlyPdf(pageCount = 1): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  for (let index = 0; index < pageCount; index += 1) {
    const page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT])
    for (let row = 0; row < 30; row += 1) {
      page.drawRectangle({ x: 72, y: 760 - row * 22, width: 300 + (row % 5) * 30, height: 9, color: rgb(0.2, 0.2, 0.2) })
    }
  }
  return doc.save({ useObjectStreams: false })
}

/**
 * PDF que declara criptografia com senha de abertura. As chaves são aleatórias, então
 * nenhum leitor consegue abri-lo sem a senha (que não existe).
 */
export async function makePasswordProtectedPdf(): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]).drawText('Conteúdo protegido', { x: 72, y: 700, size: 12 })
  const encrypt = doc.context.obj({
    Filter: 'Standard',
    V: 1,
    R: 2,
    Length: 40,
    P: -44,
    O: PDFHexString.of('A3'.repeat(32)),
    U: PDFHexString.of('5C'.repeat(32)),
  })
  doc.context.trailerInfo.Encrypt = doc.context.register(encrypt)
  doc.context.trailerInfo.ID = doc.context.obj([PDFHexString.of('01'.repeat(16)), PDFHexString.of('01'.repeat(16))])
  return doc.save({ useObjectStreams: false })
}
