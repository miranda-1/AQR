import type { DocumentRole } from '../../../shared/contracts/comparison.ts'
import * as documents from '../../documents/pdf/extract.ts'
import { asComparisonFailure } from '../failure.ts'
import type { ComparisonLimits } from '../limits.ts'

/**
 * Exame e extração de PDF da comparação. A leitura mora em `server/documents/`; aqui os tipos
 * ganham o papel do documento na comparação e o erro de leitura vira `ComparisonFailure`, como antes.
 */

export {
  classifyPage,
  countCharacters,
  FINGERPRINT_COLUMNS,
  FINGERPRINT_ROWS,
  PREVIEW_WIDTH,
  type AnalyzedPage,
  type AnalyzeOptions,
  type ExtractedLine,
  type ExtractedPage,
  type ExtractedWord,
  type PagePreview,
} from '../../documents/pdf/extract.ts'

export type ExtractedDocument = documents.ExtractedDocument<DocumentRole>
export type AnalyzedDocument = documents.AnalyzedDocument<DocumentRole>

/** Abre um PDF e examina cada página (texto, imagens, prévia, tipo de conteúdo). Feche com `close()`. */
export async function analyzeDocument(
  bytes: Uint8Array,
  role: DocumentRole,
  limits: ComparisonLimits,
  options: documents.AnalyzeOptions = {},
): Promise<AnalyzedDocument> {
  try {
    return await documents.analyzeDocument(bytes, role, limits, options)
  } catch (error) {
    throw asComparisonFailure(error, role)
  }
}

/** Só o texto: abre, extrai e fecha. Recusa PDF sem texto (`sem-texto`). */
export async function extractDocument(bytes: Uint8Array, role: DocumentRole, limits: ComparisonLimits): Promise<ExtractedDocument> {
  try {
    return await documents.extractDocument(bytes, role, limits)
  } catch (error) {
    throw asComparisonFailure(error, role)
  }
}
