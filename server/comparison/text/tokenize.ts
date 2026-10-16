import type { NormalizedRect } from '../../../shared/contracts/comparison.ts'
import type { ExtractedDocument, ExtractedWord } from '../pdf/extract.ts'
import { endsWithLineBreakHyphen, normalizeWord, startsWithLowercase } from './normalize.ts'

/** Pedaço visível de uma palavra (uma palavra hifenizada entre linhas tem dois). */
export interface TokenPiece {
  pageNumber: number
  region: NormalizedRect
}

/** Como a palavra foi lida e com que aparência. */
export interface TokenStyle {
  source: 'text-layer' | 'ocr'
  /** Confiança do OCR (0–100). */
  confidence?: number
  /** Fonte (id do pdf.js na página). */
  font?: string
  /** Altura da fonte, em pontos. */
  fontSize?: number
}

export interface Token {
  /** Chave normalizada, usada na comparação. */
  key: string
  /** Texto como aparece no documento (sem o hífen de quebra de linha). */
  text: string
  /** Linha (índice em `TokenizedDocument.lines`) em que a palavra começa. */
  lineIndex: number
  /** Colado ao anterior, sem espaço (pontuação separada da palavra). */
  joinsPrevious: boolean
  pieces: TokenPiece[]
  style: TokenStyle
}

export interface TokenLine {
  pageNumber: number
  /** Texto da linha como aparece no documento. */
  text: string
  /** Topo da linha na página (normalizado), para situar diferenças que não são de texto. */
  top: number
}

export interface TokenizedDocument {
  tokens: Token[]
  lines: TokenLine[]
}

const SURROUNDING_PUNCTUATION = /^([("'«[]*)(.*?)([.,;:!?)"'»\]]*)$/su

/**
 * Separa a pontuação que abre e fecha a palavra ("(prazo", "dias.") em itens próprios, para que
 * acrescentar uma palavra no fim de uma frase seja uma adição, e não a modificação de "dias.".
 * A caixa da palavra é repartida na proporção dos caracteres.
 */
function splitPunctuation(text: string, region: NormalizedRect): { text: string; region: NormalizedRect; joinsPrevious: boolean }[] {
  const match = SURROUNDING_PUNCTUATION.exec(text)
  const [, leading = '', core = '', trailing = ''] = match ?? []
  if (!core || (!leading && !trailing)) return [{ text, region, joinsPrevious: false }]
  const total = Array.from(text).length
  let offset = 0
  return [leading, core, trailing]
    .filter(Boolean)
    .map((part, index) => {
      const length = Array.from(part).length
      const piece = {
        text: part,
        region: { ...region, x: region.x + (region.width * offset) / total, width: (region.width * length) / total },
        joinsPrevious: index > 0,
      }
      offset += length
      return piece
    })
}

function styleOf(word: ExtractedWord): TokenStyle {
  const style: TokenStyle = { source: word.source }
  if (word.confidence !== undefined) style.confidence = word.confidence
  if (word.font !== undefined) style.font = word.font
  if (word.fontSize !== undefined) style.fontSize = word.fontSize
  return style
}

/** Reconstrói o texto de uma sequência de palavras, sem espaço antes da pontuação separada. */
export function joinTokens(tokens: readonly Token[]): string {
  return tokens.map((token, index) => (index > 0 && !token.joinsPrevious ? ` ${token.text}` : token.text)).join('')
}

/** Transforma o documento extraído numa sequência única de palavras, atravessando linhas e páginas. */
export function tokenize(document: ExtractedDocument): TokenizedDocument {
  const tokens: Token[] = []
  const lines: TokenLine[] = []
  /** Palavra hifenizada no fim da linha anterior, esperando a continuação. */
  let pending: Token | undefined

  for (const page of document.pages) {
    for (const line of page.lines) {
      const lineIndex = lines.length
      lines.push({ pageNumber: page.pageNumber, text: line.words.map((word) => word.text).join(' '), top: line.words[0]?.region.y ?? 0 })

      const parts = line.words.flatMap((word) =>
        splitPunctuation(word.text, word.region).map((part) => ({ ...part, style: styleOf(word) })),
      )
      parts.forEach((part, index) => {
        const key = normalizeWord(part.text)
        if (!key) return
        const piece = { pageNumber: page.pageNumber, region: part.region }

        if (pending && index === 0 && startsWithLowercase(key)) {
          pending.key = pending.key.slice(0, -1) + key
          pending.text = pending.text.slice(0, -1) + part.text
          pending.pieces.push(piece)
          if (part.style.confidence !== undefined) {
            pending.style.confidence = Math.min(pending.style.confidence ?? 100, part.style.confidence)
          }
          pending = undefined
          return
        }
        pending = undefined

        const token: Token = {
          key,
          text: part.text,
          lineIndex,
          joinsPrevious: part.joinsPrevious,
          pieces: [piece],
          style: part.style,
        }
        tokens.push(token)
        if (index === parts.length - 1 && endsWithLineBreakHyphen(key)) pending = token
      })
    }
  }
  return { tokens, lines }
}
