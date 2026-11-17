import { comparisonLimitsFor, type ComparisonLimits } from '../../../../server/comparison/limits.ts'
import { LOCAL_COMPARISON_TIMEOUT_MS, LOCAL_MAX_FILE_SIZE_BYTES } from '../services/local-engine-limits'

/**
 * Limites do motor no navegador: os mesmos do servidor (`comparisonLimitsFor`), com o tempo da
 * tarefa da comparação local. OCR e comparação visual param no orçamento (75% do tempo) e marcam
 * as páginas restantes como não analisadas, como no servidor.
 */
export const localComparisonLimits: ComparisonLimits = comparisonLimitsFor({
  maxFileSizeBytes: LOCAL_MAX_FILE_SIZE_BYTES,
  jobTimeoutMs: LOCAL_COMPARISON_TIMEOUT_MS,
  visual: true,
  ocr: true,
  ocrMaxPages: 30,
  ocrLanguagePath: '',
})
