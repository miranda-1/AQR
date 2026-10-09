import { createRequire } from 'node:module'
import path from 'node:path'
import { getDocument, PasswordException } from 'pdfjs-dist/legacy/build/pdf.mjs'
import type { PDFDocumentProxy } from 'pdfjs-dist/legacy/build/pdf.mjs'
import type { DocumentRole } from '../../../shared/contracts/comparison.ts'
import { ComparisonFailure } from '../failure.ts'
import type { ComparisonLimits } from '../limits.ts'

const PDF_SIGNATURE = '%PDF-'

const standardFontDataUrl = `${path.join(
  path.dirname(createRequire(import.meta.url).resolve('pdfjs-dist/package.json')),
  'standard_fonts',
)}${path.sep}`

/** Confere o que dá para conferir sem abrir o PDF: tamanho e assinatura `%PDF-`. */
export function assertPdfBytes(bytes: Uint8Array, role: DocumentRole, limits: ComparisonLimits): void {
  if (bytes.byteLength === 0) throw new ComparisonFailure('arquivo-vazio', role)
  if (bytes.byteLength > limits.maxFileSizeBytes) throw new ComparisonFailure('tamanho-excedido', role)
  const header = new TextDecoder('latin1').decode(bytes.subarray(0, PDF_SIGNATURE.length))
  if (header !== PDF_SIGNATURE) throw new ComparisonFailure('assinatura-ausente', role)
}

/**
 * Abre o PDF com o pdf.js em modo restrito: sem fontes do sistema, sem conversão de fontes,
 * sem buscas de rede. Erros do pdf.js viram `ComparisonFailure` com o documento certo.
 */
export async function openPdf(bytes: Uint8Array, role: DocumentRole, limits: ComparisonLimits): Promise<PDFDocumentProxy> {
  assertPdfBytes(bytes, role, limits)
  const task = getDocument({
    // O pdf.js transfere (e esvazia) o buffer recebido; a cópia preserva o do chamador.
    data: bytes.slice(),
    disableFontFace: true,
    useSystemFonts: false,
    isOffscreenCanvasSupported: false,
    useWorkerFetch: false,
    stopAtErrors: true,
    standardFontDataUrl,
    verbosity: 0,
  })
  let pdf: PDFDocumentProxy
  try {
    pdf = await task.promise
  } catch (error) {
    await task.destroy()
    if (error instanceof PasswordException) throw new ComparisonFailure('protegido-por-senha', role, { cause: error })
    // InvalidPDFException, FormatError e afins: o arquivo não pode ser lido como PDF.
    throw new ComparisonFailure('pdf-corrompido', role, { cause: error })
  }
  if (pdf.numPages > limits.maxPages) {
    await task.destroy()
    throw new ComparisonFailure('paginas-demais', role)
  }
  return pdf
}
