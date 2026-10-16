/** Limites do processamento de PDFs. Protegem o servidor de arquivos grandes ou malformados. */
export interface ComparisonLimits {
  /** Tamanho máximo de cada arquivo (o mesmo do frontend: 50 MB). */
  maxFileSizeBytes: number
  /** Páginas por documento. */
  maxPages: number
  /**
   * Abaixo disto (caracteres visíveis no documento todo), a extração só de texto (`extractDocument`)
   * trata o PDF como digitalizado. A comparação completa decide página a página.
   */
  minTextCharacters: number
  /** Caracteres extraídos por documento; acima disto o processamento é recusado. */
  maxTextCharacters: number
  /** Tempo máximo para abrir e examinar as páginas de um documento. */
  extractionTimeoutMs: number
  /** Palavras dos dois documentos somadas; acima disto a comparação é feita por linhas. */
  maxDiffTokens: number
  /** Edições (palavras ou linhas) que o algoritmo aceita procurar antes de desistir daquele nível. */
  maxEditLength: number
  /** Tempo máximo de cada tentativa de comparação (por palavras e por linhas). */
  diffTimeoutMs: number
  /** Comparação visual das páginas renderizadas. */
  visual: boolean
  /** Largura (pixels) das páginas na comparação visual (1000 ≈ 120 dpi numa página A4). */
  visualWidth: number
  /** OCR das páginas sem texto suficiente. */
  ocr: boolean
  /** Páginas com OCR por documento; as demais ficam marcadas como não lidas. */
  ocrMaxPages: number
  /** Palavra de OCR com confiança abaixo disto (0–100) torna a diferença "conferir". */
  ocrLowConfidence: number
  /** Pasta do modelo de português do OCR (`por.traineddata.gz`). Vazio = o do pacote instalado. */
  ocrLanguagePath: string
  /**
   * Orçamento de tempo da comparação inteira. OCR e comparação visual param ao atingi-lo, e as
   * páginas restantes ficam marcadas como não analisadas, em vez de a tarefa inteira estourar o tempo.
   */
  softBudgetMs: number
}

export const defaultComparisonLimits: ComparisonLimits = {
  maxFileSizeBytes: 50 * 1024 * 1024,
  maxPages: 1000,
  minTextCharacters: 20,
  maxTextCharacters: 5_000_000,
  extractionTimeoutMs: 60_000,
  maxDiffTokens: 300_000,
  maxEditLength: 50_000,
  diffTimeoutMs: 20_000,
  visual: true,
  visualWidth: 1000,
  ocr: true,
  ocrMaxPages: 30,
  ocrLowConfidence: 70,
  ocrLanguagePath: '',
  softBudgetMs: 90_000,
}

/** Fração do tempo máximo da tarefa usada como orçamento: o resto é margem para organizar o resultado. */
export const SOFT_BUDGET_FRACTION = 0.75

/** Limites da comparação a partir da configuração do servidor. */
export function comparisonLimitsFor(settings: {
  maxFileSizeBytes: number
  jobTimeoutMs: number
  visual: boolean
  ocr: boolean
  ocrMaxPages: number
  ocrLanguagePath: string
}): ComparisonLimits {
  return {
    ...defaultComparisonLimits,
    maxFileSizeBytes: settings.maxFileSizeBytes,
    visual: settings.visual,
    ocr: settings.ocr,
    ocrMaxPages: settings.ocrMaxPages,
    ocrLanguagePath: settings.ocrLanguagePath,
    softBudgetMs: Math.round(settings.jobTimeoutMs * SOFT_BUDGET_FRACTION),
    extractionTimeoutMs: Math.min(defaultComparisonLimits.extractionTimeoutMs, Math.round(settings.jobTimeoutMs * 0.5)),
  }
}
