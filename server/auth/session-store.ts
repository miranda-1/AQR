import { randomBytes } from 'node:crypto'

export interface SessionData {
  accountId: string
  idToken: string
}

interface Entry extends SessionData {
  expiresAt: number
}

/**
 * Sessões em memória do servidor: o cookie leva só um identificador aleatório e os tokens nunca
 * saem daqui. Reiniciar o servidor encerra as sessões; com mais de uma instância, trocar por
 * armazenamento compartilhado.
 */
export class SessionStore {
  private readonly entries = new Map<string, Entry>()

  private readonly ttlMs: number

  constructor(ttlMs: number) {
    this.ttlMs = ttlMs
  }

  create(data: SessionData): string {
    const id = randomBytes(32).toString('base64url')
    this.entries.set(id, { ...data, expiresAt: Date.now() + this.ttlMs })
    return id
  }

  get(id: string | undefined): SessionData | null {
    if (!id) return null
    const entry = this.entries.get(id)
    if (!entry) return null
    if (entry.expiresAt < Date.now()) {
      this.entries.delete(id)
      return null
    }
    return entry
  }

  destroy(id: string | undefined): void {
    if (id) this.entries.delete(id)
  }

  purgeExpired(): void {
    const now = Date.now()
    for (const [id, entry] of this.entries) if (entry.expiresAt < now) this.entries.delete(id)
  }

  clear(): void {
    this.entries.clear()
  }
}
