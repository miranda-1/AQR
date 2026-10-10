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
