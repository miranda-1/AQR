/** Limites da leitura de documentos. Protegem o servidor de arquivos grandes ou malformados. */
export interface ReadingLimits {
  /** Tamanho máximo de cada arquivo. */
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
}

/** Limites das imagens avulsas (JPG, PNG), conferidos pelo cabeçalho antes de decodificar. */
export interface ImageLimits {
  maxFileSizeBytes: number
  /** Pixels (largura × altura); acima disto a imagem não é decodificada (bomba de descompressão). */
  maxPixels: number
}

export const defaultImageLimits: ImageLimits = {
  maxFileSizeBytes: 50 * 1024 * 1024,
  maxPixels: 50_000_000,
}
