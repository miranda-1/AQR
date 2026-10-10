import type { FieldErrors } from '../../../../shared/validation/account'
import { AccountServiceError } from '../model/types'

const knownFields = ['usuario', 'nome', 'email', 'papel', 'motivo'] as const

/** Erros por campo vindos do servidor, só dos campos que o formulário conhece. */
export function fieldErrorsOf(error: unknown): FieldErrors {
  const result: FieldErrors = {}
  if (!(error instanceof AccountServiceError) || !error.fields) return result
  for (const field of knownFields) {
    const message = error.fields[field]
    if (message) result[field] = message
  }
  return result
}
