/** Limites do processamento de PDFs. Protegem o servidor de arquivos grandes ou malformados. */
export interface ComparisonLimits {
  /** Tamanho máximo de cada arquivo (o mesmo do frontend: 50 MB). */
  maxFileSizeBytes: number
  /** Páginas por documento. */
  maxPages: number
  /** Abaixo disto (caracteres visíveis no documento todo), o PDF é tratado como digitalizado. */
  minTextCharacters: number
  /** Caracteres extraídos por documento; acima disto o processamento é recusado. */
  maxTextCharacters: number
  /** Tempo máximo para abrir e extrair o texto de um documento. */
  extractionTimeoutMs: number
  /** Palavras dos dois documentos somadas; acima disto a comparação é feita por linhas. */
  maxDiffTokens: number
  /** Edições (palavras ou linhas) que o algoritmo aceita procurar antes de desistir daquele nível. */
  maxEditLength: number
  /** Tempo máximo de cada tentativa de comparação (por palavras e por linhas). */
  diffTimeoutMs: number
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
}
