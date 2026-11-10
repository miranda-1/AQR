import type { AccountRole } from './admin.ts'

/** Como o servidor autentica: "visual" (login sem verificação, só desenvolvimento) ou "keycloak" (login real). */
export interface AuthStatus {
  mode: 'visual' | 'keycloak'
}

/** Pedido de link para criar uma nova senha (`POST /api/auth/senha/esqueci`): usuário ou e-mail. */
export interface ForgotPasswordRequest {
  usuario: string
}

/** O que a página de definir a senha mostra sobre o link (`POST /api/auth/senha/verificar`). */
export interface PasswordLinkInfo {
  finalidade: 'convite' | 'recuperacao'
  usuario: string
  /** Primeiro nome, para a saudação. */
  nome: string
}

/** Nova senha pelo link (`POST /api/auth/senha/definir`). */
export interface SetPasswordRequest {
  codigo: string
  senha: string
}

/** Tamanho aceito para a senha nova (o Keycloak pode exigir mais pela política dele). */
export const PASSWORD_MIN_LENGTH = 8
export const PASSWORD_MAX_LENGTH = 128

/** Pedido de login na tela do AQR (`POST /api/auth/entrar`), só no login real. */
export interface LoginRequest {
  usuario: string
  senha: string
}

/** A pessoa conectada, como o servidor a identificou. */
export interface SessionUser {
  usuario: string
  nome: string
  papel: AccountRole
}

/** Relógio da sessão (`GET /api/auth/sessao`): consultá-lo não conta como uso. */
export interface SessionClock {
  /** Quando a sessão cai se não houver uso (30 min sem uso ou 8 h depois do login). */
  expiraEm: string
}
