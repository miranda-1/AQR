import type { AccountRole } from './admin.ts'

/** Como o servidor autentica: "visual" (login sem verificação, só desenvolvimento) ou "keycloak". */
export interface AuthStatus {
  mode: 'visual' | 'keycloak'
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
