const MEGABYTE = 1024 * 1024

export const comparisonConfig = {
  maxFileSizeBytes: 50 * MEGABYTE,
  acceptedMimeTypes: ['application/pdf'],
  acceptedExtensions: ['.pdf'],
  /** Assinatura presente no início de todo arquivo PDF. */
  pdfSignature: '%PDF-',
} as const
