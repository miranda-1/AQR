import type { PDFDocumentProxy } from 'pdfjs-dist/legacy/build/pdf.mjs'
import type { DocumentRole } from '../../../shared/contracts/comparison.ts'
import * as documents from '../../documents/pdf/load.ts'
import { asComparisonFailure } from '../failure.ts'
import type { ComparisonLimits } from '../limits.ts'

/**
 * Abertura de PDF da comparação. A leitura mora em `server/documents/`; aqui só se converte o
 * erro de leitura (`DocumentFailure`) no erro da comparação (`ComparisonFailure`), como antes.
 */

/** Confere o que dá para conferir sem abrir o PDF: tamanho e assinatura `%PDF-`. */
export function assertPdfBytes(bytes: Uint8Array, role: DocumentRole, limits: ComparisonLimits): void {
  try {
    documents.assertPdfBytes(bytes, role, limits)
  } catch (error) {
    throw asComparisonFailure(error, role)
  }
}

/** Abre o PDF em modo restrito (sem fontes do sistema, sem rede). */
export async function openPdf(bytes: Uint8Array, role: DocumentRole, limits: ComparisonLimits): Promise<PDFDocumentProxy> {
  try {
    return await documents.openPdf(bytes, role, limits)
  } catch (error) {
    throw asComparisonFailure(error, role)
  }
}
