/**
 * Login real pela tela do AQR: envia usuário e senha ao servidor (`POST /api/auth/entrar`), que os
 * confere no Keycloak e devolve só um cookie de sessão HttpOnly. A senha não fica guardada em lugar nenhum.
 */
export type PasswordLoginResult = { ok: true; nome: string } | { ok: false; message: string }

const NETWORK = 'Não foi possível falar com o servidor do AQR. Confira a conexão e tente de novo.'
const UNEXPECTED = 'Não foi possível entrar agora. Tente de novo em instantes; se continuar, fale com o suporte da SEMADES.'

export async function loginWithPassword(usuario: string, senha: string): Promise<PasswordLoginResult> {
  let response: Response
  try {
    response = await fetch('/api/auth/entrar', {
      method: 'POST',
      credentials: 'same-origin',
      cache: 'no-store',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ usuario, senha }),
    })
  } catch {
    return { ok: false, message: NETWORK }
  }
  const body: unknown = await response.json().catch(() => null)
  if (response.ok) {
    const nome = typeof body === 'object' && body !== null && 'nome' in body && typeof body.nome === 'string' ? body.nome : usuario
    return { ok: true, nome }
  }
  const error = typeof body === 'object' && body !== null && 'error' in body ? body.error : null
  const message = typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string' ? error.message : UNEXPECTED
  return { ok: false, message }
}
