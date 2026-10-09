const MEGABYTE = 1024 * 1024

/** "api": compara de verdade, no servidor do AQR. "demo": resultado fictício, para revisar a interface. */
export type ComparisonServiceMode = 'api' | 'demo'

/** Lê `VITE_COMPARISON_SERVICE`. O padrão é a comparação real; "demo" liga o protótipo. */
export function readServiceMode(value: string | undefined): ComparisonServiceMode {
  return value === 'demo' ? 'demo' : 'api'
}

export const comparisonConfig = {
  maxFileSizeBytes: 50 * MEGABYTE,
  acceptedMimeTypes: ['application/pdf'],
  acceptedExtensions: ['.pdf'],
  /** Assinatura presente no início de todo arquivo PDF. */
  pdfSignature: '%PDF-',
  serviceMode: readServiceMode(import.meta.env.VITE_COMPARISON_SERVICE),
  /** Intervalo entre as consultas ao andamento da comparação no servidor. */
  pollIntervalMs: 700,
} as const
