import type { PasswordLinkInfo } from '../../../shared/contracts/auth'

/**
 * Pedidos das páginas de senha. O servidor do AQR grava a senha no sistema de login e não a guarda;
 * o código do link vai sempre no corpo do pedido, nunca no endereço.
 */
export type ApiResult<T> = { ok: true; data: T } | { ok: false; status: number; message: string; fields: Record<string, string> }

const NETWORK = 'Não foi possível falar com o servidor do AQR. Confira a conexão e tente de novo.'
const UNEXPECTED = 'Algo deu errado. Tente de novo em instantes; se continuar, fale com o suporte da SEMADES.'

async function postJson<T>(url: string, payload: object): Promise<ApiResult<T>> {
  let response: Response
  try {
    response = await fetch(url, {
      method: 'POST',
      credentials: 'same-origin',
      cache: 'no-store',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    })
  } catch {
    return { ok: false, status: 0, message: NETWORK, fields: {} }
  }
  const body: unknown = await response.json().catch(() => null)
  if (response.ok) return { ok: true, data: body as T }
  const error = typeof body === 'object' && body !== null && 'error' in body ? body.error : null
  const message = typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string' ? error.message : UNEXPECTED
  const rawFields = typeof error === 'object' && error !== null && 'fields' in error ? error.fields : null
  const fields: Record<string, string> = {}
  if (typeof rawFields === 'object' && rawFields !== null) {
    for (const [key, value] of Object.entries(rawFields)) if (typeof value === 'string') fields[key] = value
  }
  return { ok: false, status: response.status, message, fields }
}

export function requestPasswordLink(usuario: string): Promise<ApiResult<{ ok: true }>> {
  return postJson('/api/auth/senha/esqueci', { usuario })
}

export function checkPasswordLink(codigo: string): Promise<ApiResult<PasswordLinkInfo>> {
  return postJson('/api/auth/senha/verificar', { codigo })
}

export function setPasswordWithLink(codigo: string, senha: string): Promise<ApiResult<{ usuario: string }>> {
  return postJson('/api/auth/senha/definir', { codigo, senha })
}
