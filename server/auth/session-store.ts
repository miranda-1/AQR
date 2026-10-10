import { createHash, randomBytes } from 'node:crypto'
import { integerColumn, textColumn, type Database } from '../db/database.ts'

export interface SessionData {
  accountId: string
}

const hashOf = (id: string): string => createHash('sha256').update(id).digest('hex')

/**
 * Sessões no banco do AQR: o cookie leva só um identificador aleatório e o banco guarda apenas
 * o hash dele. Nenhum token do Keycloak é guardado; as sessões sobrevivem a reinícios.
 * Com mais de uma instância, todas precisam apontar para o mesmo banco.
 */
export class SessionStore {
  private readonly db: Database
  private readonly ttlMs: number

  constructor(db: Database, ttlMs: number) {
    this.db = db
    this.ttlMs = ttlMs
  }

  create(data: SessionData): string {
    const id = randomBytes(32).toString('base64url')
    this.db
      .prepare('INSERT INTO sessions (id_hash, account_id, created_at, expires_at) VALUES (?, ?, ?, ?)')
      .run(hashOf(id), data.accountId, new Date().toISOString(), Date.now() + this.ttlMs)
    return id
  }

  get(id: string | undefined): SessionData | null {
    if (!id) return null
    const row = this.db.prepare('SELECT account_id, expires_at FROM sessions WHERE id_hash = ?').get(hashOf(id))
    if (!row) return null
    if (integerColumn(row, 'expires_at') < Date.now()) {
      this.destroy(id)
      return null
    }
    return { accountId: textColumn(row, 'account_id') }
  }

  destroy(id: string | undefined): void {
    if (id) this.db.prepare('DELETE FROM sessions WHERE id_hash = ?').run(hashOf(id))
  }

  purgeExpired(): void {
    this.db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(Date.now())
  }
}
