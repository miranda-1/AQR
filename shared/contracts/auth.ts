import type { AccountRole } from './admin.ts'

/** Como o servidor autentica: "visual" (login sem verificação, só desenvolvimento) ou "keycloak". */
export interface AuthStatus {
  mode: 'visual' | 'keycloak'
  /** Só no login real: página do Keycloak para receber por e-mail o link de nova senha. */
  recuperarSenhaUrl?: string
}

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
