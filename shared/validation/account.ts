import { accountRoles, type AccountRole } from '../contracts/admin.ts'

/**
 * Regras dos campos de uma conta, usadas pelo servidor (que decide) e pelo formulário (que avisa
 * antes de enviar). Mensagens em português, prontas para a interface.
 */

/** Login institucional: 3 a 32 caracteres, minúsculos, números, ponto, hífen ou sublinhado. */
export const USERNAME_PATTERN = /^[a-z0-9._-]{3,32}$/u
export const NAME_MAX = 120
export const EMAIL_MAX = 254
export const REASON_MAX = 500
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u

export type FieldErrors = Partial<Record<'usuario' | 'nome' | 'email' | 'papel' | 'motivo', string>>

export function normalizeUsername(value: string): string {
  return value.trim().toLowerCase()
}

/** Nome sem espaços sobrando e sem caracteres de controle. */
export function normalizeName(value: string): string {
  return value.replace(/\p{Cc}/gu, '').replace(/\s+/gu, ' ').trim()
}

/** E-mail vazio vira `null` (o campo é opcional). */
export function normalizeEmail(value: string | null | undefined): string | null {
  const clean = (value ?? '').trim().toLowerCase()
  return clean === '' ? null : clean
}

export function validateUsername(value: string): string | undefined {
  if (!value) return 'Informe o usuário institucional.'
  if (!USERNAME_PATTERN.test(value)) {
    return 'Use de 3 a 32 caracteres: letras minúsculas sem acento, números, ponto, hífen ou sublinhado.'
  }
  return undefined
}

export function validateName(value: string): string | undefined {
  if (!value) return 'Informe o nome.'
  if (value.length > NAME_MAX) return `Use no máximo ${NAME_MAX} caracteres.`
  return undefined
}

export function validateEmail(value: string | null): string | undefined {
  if (value === null) return undefined
  if (value.length > EMAIL_MAX || !EMAIL_PATTERN.test(value)) return 'Informe um e-mail válido, como nome@campogrande.ms.gov.br.'
  return undefined
}

export function validateRole(value: string): string | undefined {
  return (accountRoles as readonly string[]).includes(value) ? undefined : 'Escolha um papel: administrador ou analista.'
}

export function isAccountRole(value: string): value is AccountRole {
  return (accountRoles as readonly string[]).includes(value)
}

/** Valida os campos editáveis; devolve só os campos com erro. */
export function validateAccountFields(fields: {
  usuario?: string
  nome: string
  email: string | null
  papel: string
}): FieldErrors {
  const errors: FieldErrors = {}
  if (fields.usuario !== undefined) {
    const usuario = validateUsername(fields.usuario)
    if (usuario) errors.usuario = usuario
  }
  const nome = validateName(fields.nome)
  if (nome) errors.nome = nome
  const email = validateEmail(fields.email)
  if (email) errors.email = email
  const papel = validateRole(fields.papel)
  if (papel) errors.papel = papel
  return errors
}
