/**
 * Erro de leitura de documento, comum à comparação e à triagem. Carrega o motivo interno e o
 * rótulo do documento que falhou (na comparação, "original" ou "updated"; na triagem, o anexo).
 * Quem chama decide como apresentá-lo: a comparação o converte no seu `ComparisonFailure`.
 */
export type DocumentFailureReason =
  | 'arquivo-vazio'
  | 'tamanho-excedido'
  | 'assinatura-ausente'
  | 'protegido-por-senha'
  | 'pdf-corrompido'
  | 'paginas-demais'
  | 'texto-demais'
  | 'sem-texto'
  | 'tempo-esgotado'
  | 'imagem-invalida'
  | 'imagem-grande-demais'
  | 'falha-inesperada'

export class DocumentFailure<L extends string = string> extends Error {
  override name = 'DocumentFailure'
  readonly reason: DocumentFailureReason
  readonly document: L | undefined

  constructor(reason: DocumentFailureReason, document?: L, options?: { cause?: unknown }) {
    super(`Falha na leitura: ${reason}${document ? ` (documento ${document})` : ''}`, options)
    this.reason = reason
    this.document = document
  }
}
