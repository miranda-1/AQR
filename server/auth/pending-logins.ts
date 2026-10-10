import type { PendingLogin } from './keycloak-client.ts'

export type PendingEntry = PendingLogin & { returnTo: string; expiresAt: number }

/**
 * Logins em andamento (entre "Entrar" e o retorno do Keycloak), pelo `state`. Vencem em `ttlMs` e
 * têm teto: ao passar dele, os mais antigos saem. Como a inserção segue a ordem de vencimento, a
 * limpeza para no primeiro ainda válido.
 */
export class PendingLogins {
  private readonly entries = new Map<string, PendingEntry>()
  private readonly ttlMs: number
  private readonly max: number
  private readonly now: () => number

  constructor(ttlMs: number, max: number, now: () => number = Date.now) {
    this.ttlMs = ttlMs
    this.max = max
    this.now = now
  }

  add(login: PendingLogin, returnTo: string): void {
    this.prune(1)
    this.entries.set(login.state, { ...login, returnTo, expiresAt: this.now() + this.ttlMs })
  }

  /** Tira e devolve o login do `state`, se ainda valer (cada `state` serve uma vez só). */
  take(state: string): PendingEntry | undefined {
    const entry = this.entries.get(state)
    this.entries.delete(state)
    return entry && entry.expiresAt > this.now() ? entry : undefined
  }

  has(state: string): boolean {
    return this.entries.has(state)
  }

  get size(): number {
    return this.entries.size
  }

  /** Apaga os vencidos e abre `room` vagas abaixo do teto. */
  prune(room = 0): void {
    const now = this.now()
    for (const [state, entry] of this.entries) {
      if (entry.expiresAt > now && this.entries.size + room <= this.max) break
      this.entries.delete(state)
    }
  }
}
