import type { DocumentRole } from '../../shared/contracts/comparison.ts'
import type { ExtractedDocument } from '../comparison/pdf/extract.ts'

/**
 * Documento extraído montado à mão, para testar normalização e diferenças sem PDF.
 * `pages` é uma lista de páginas; cada página, uma lista de linhas. As caixas são fictícias
 * mas distintas (uma faixa por linha, uma coluna por palavra).
 */
export function extractedFromText(pages: readonly (readonly string[])[], role: DocumentRole = 'original'): ExtractedDocument {
  let characterCount = 0
  return {
    role,
    pageCount: pages.length,
    pages: pages.map((lines, pageIndex) => ({
      pageNumber: pageIndex + 1,
      lines: lines.map((line, lineIndex) => ({
        words: line
          .split(' ')
          .filter(Boolean)
          .map((text, wordIndex) => {
            characterCount += text.length
            return {
              text,
              source: 'text-layer' as const,
              region: { x: 0.1 + wordIndex * 0.05, y: 0.1 + lineIndex * 0.03, width: 0.04, height: 0.02 },
            }
          }),
      })),
    })),
    get characterCount() {
      return characterCount
    },
  }
}
