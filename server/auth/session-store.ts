import { createHash, randomBytes } from 'node:crypto'
import { integerColumn, textColumn, type Database } from '../db/database.ts'

export interface SessionData {
  accountId: string
  /** Quando a sessão cai se não houver mais uso (ms desde 1970): o menor entre inatividade e limite. */
  expiresAt: number
}

export interface SessionLimits {
  /** Limite absoluto, contado do login. */
  maxAgeMs: number
  /** Tempo sem uso depois do qual a sessão cai. */
  idleMs: number
}

const hashOf = (id: string): string => createHash('sha256').update(id).digest('hex')
/** O último uso só é regravado depois deste intervalo, para não escrever no banco a cada pedido. */
const TOUCH_EVERY_MS = 30_000

/**
 * Sessões no banco do AQR: o cookie leva só um identificador aleatório e o banco guarda apenas
 * o hash dele. Nenhum token do Keycloak é guardado; as sessões sobrevivem a reinícios.
 * A sessão cai depois de `idleMs` sem uso ou `maxAgeMs` depois do login, o que vier primeiro.
 * Com mais de uma instância, todas precisam apontar para o mesmo banco.
 */
export class SessionStore {
  private readonly db: Database
  private readonly limits: SessionLimits
  private readonly now: () => number

  constructor(db: Database, limits: SessionLimits, now: () => number = Date.now) {
    this.db = db
    this.limits = limits
    this.now = now
  }

  create(accountId: string): string {
    const id = randomBytes(32).toString('base64url')
    const now = this.now()
    this.db
      .prepare('INSERT INTO sessions (id_hash, account_id, created_at, expires_at, last_seen_at) VALUES (?, ?, ?, ?, ?)')
      .run(hashOf(id), accountId, new Date(now).toISOString(), now + this.limits.maxAgeMs, now)
    return id
  }

  /**
   * Sessão válida do identificador, ou `null`. Com `touch` (padrão), o pedido conta como uso e
   * adia a queda por inatividade; sem ele (consulta do relógio da sessão), nada muda.
   */
  get(id: string | undefined, { touch = true }: { touch?: boolean } = {}): SessionData | null {
    if (!id) return null
    const hash = hashOf(id)
    const row = this.db.prepare('SELECT account_id, expires_at, last_seen_at FROM sessions WHERE id_hash = ?').get(hash)
    if (!row) return null
    const now = this.now()
    const hardLimit = integerColumn(row, 'expires_at')
    let lastSeen = integerColumn(row, 'last_seen_at')
    if (hardLimit <= now || lastSeen + this.limits.idleMs <= now) {
      this.db.prepare('DELETE FROM sessions WHERE id_hash = ?').run(hash)
      return null
    }
    if (touch && now - lastSeen >= TOUCH_EVERY_MS) {
      this.db.prepare('UPDATE sessions SET last_seen_at = ? WHERE id_hash = ?').run(now, hash)
      lastSeen = now
    }
    return { accountId: textColumn(row, 'account_id'), expiresAt: Math.min(hardLimit, lastSeen + this.limits.idleMs) }
  }

  /** Conta o pedido como uso (no máximo uma gravação a cada 30 s). */
  touch(id: string): void {
    const now = this.now()
    this.db
      .prepare('UPDATE sessions SET last_seen_at = ? WHERE id_hash = ? AND last_seen_at <= ? AND expires_at > ?')
      .run(now, hashOf(id), now - TOUCH_EVERY_MS, now)
  }

  destroy(id: string | undefined): void {
    if (id) this.db.prepare('DELETE FROM sessions WHERE id_hash = ?').run(hashOf(id))
  }

  purgeExpired(): void {
    const now = this.now()
    this.db.prepare('DELETE FROM sessions WHERE expires_at <= ? OR last_seen_at <= ?').run(now, now - this.limits.idleMs)
  }
}
