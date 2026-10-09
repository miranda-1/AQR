import type { DocumentRole } from './comparison.ts'

/**
 * Formato de todo erro devolvido pela API. `message` é uma frase em português, pronta para a
 * interface: diz o que houve e como resolver, sem detalhes internos.
 */
export interface ApiErrorBody {
  error: {
    code: string
    message: string
    /** Erros de validação por campo (nome do campo → mensagem). */
    fields?: Record<string, string>
    /** Documento relacionado, nos erros de envio da comparação. */
    document?: DocumentRole
  }
}
