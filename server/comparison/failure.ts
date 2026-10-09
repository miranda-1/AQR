import type { ComparisonError, ComparisonErrorCode, DocumentRole } from '../../shared/contracts/comparison.ts'

/** Motivo interno da falha, mais detalhado que o código público (vai para o log, não para a interface). */
export type FailureReason =
  | 'arquivo-vazio'
  | 'tamanho-excedido'
  | 'assinatura-ausente'
  | 'protegido-por-senha'
  | 'pdf-corrompido'
  | 'paginas-demais'
  | 'texto-demais'
  | 'sem-texto'
  | 'tempo-esgotado'
  | 'comparacao-excedeu-limites'
  | 'falha-inesperada'

const codeByReason: Record<FailureReason, ComparisonErrorCode> = {
  'arquivo-vazio': 'INCOMPATIBLE_DOCUMENT',
  'tamanho-excedido': 'INCOMPATIBLE_DOCUMENT',
  'assinatura-ausente': 'INCOMPATIBLE_DOCUMENT',
  'protegido-por-senha': 'INCOMPATIBLE_DOCUMENT',
  'pdf-corrompido': 'INCOMPATIBLE_DOCUMENT',
  'paginas-demais': 'INCOMPATIBLE_DOCUMENT',
  'texto-demais': 'INCOMPATIBLE_DOCUMENT',
  'sem-texto': 'NO_EXTRACTABLE_TEXT',
  'tempo-esgotado': 'PROCESSING_FAILED',
  'comparacao-excedeu-limites': 'PROCESSING_FAILED',
  'falha-inesperada': 'PROCESSING_FAILED',
}

/**
 * Erro de domínio da comparação. Carrega o `ComparisonError` público (código + documento)
 * e o motivo interno, para diagnóstico.
 */
export class ComparisonFailure extends Error {
  override name = 'ComparisonFailure'
  readonly reason: FailureReason
  readonly document: DocumentRole | undefined

  constructor(reason: FailureReason, document?: DocumentRole, options?: { cause?: unknown }) {
    super(`Falha na comparação: ${reason}${document ? ` (documento ${document})` : ''}`, options)
    this.reason = reason
    this.document = document
  }

  get code(): ComparisonErrorCode {
    return codeByReason[this.reason]
  }

  toComparisonError(): ComparisonError {
    return this.document ? { code: this.code, document: this.document } : { code: this.code }
  }
}
