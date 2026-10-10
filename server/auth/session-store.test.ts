import { openDatabase, type Database } from '../db/database.ts'
import { migrate } from '../db/migrate.ts'
import { seedAccount } from '../test/accounts.ts'
import { SessionStore } from './session-store.ts'

const MIN = 60_000
const limits = { maxAgeMs: 8 * 60 * MIN, idleMs: 30 * MIN }

describe('SessionStore', () => {
  let db: Database
  let now: number
  let store: SessionStore
  let accountId: string

  beforeEach(() => {
    db = openDatabase(':memory:')
    migrate(db)
    accountId = seedAccount(db, 'ana', 'analista')
    now = 1_000_000_000_000
    store = new SessionStore(db, limits, () => now)
  })
  afterEach(() => db.close())

  it('guarda só o hash do identificador', () => {
    const id = store.create(accountId)
    expect(JSON.stringify(db.prepare('SELECT * FROM sessions').all())).not.toContain(id)
    expect(store.get(id)).toEqual({ accountId, expiresAt: now + 30 * MIN })
  })

  it('cai depois de 30 min sem uso', () => {
    const id = store.create(accountId)
    now += 30 * MIN - 1
    expect(store.get(id, { touch: false })).not.toBeNull()
    now += 1
    expect(store.get(id)).toBeNull()
    // Vencida, é apagada: voltar a usar não ressuscita.
    expect(db.prepare('SELECT count(*) AS n FROM sessions').get()).toEqual({ n: 0 })
  })

  it('o uso adia a queda; consultar o relógio não', () => {
    const id = store.create(accountId)
    now += 20 * MIN
    expect(store.get(id, { touch: false })?.expiresAt).toBe(now + 10 * MIN)
    store.get(id)
    now += 20 * MIN
    expect(store.get(id, { touch: false })?.expiresAt).toBe(now + 10 * MIN)
    now += 10 * MIN
    expect(store.get(id)).toBeNull()
  })

  it('mesmo em uso, cai 8 h depois do login', () => {
    const id = store.create(accountId)
    for (let elapsed = 0; elapsed < 8 * 60 - 10; elapsed += 10) {
      now += 10 * MIN
      expect(store.get(id)).not.toBeNull()
    }
    // Perto do fim, o relógio aponta o limite de 8 h, não os 30 min de inatividade.
    expect(store.get(id, { touch: false })?.expiresAt).toBe(1_000_000_000_000 + limits.maxAgeMs)
    now = 1_000_000_000_000 + limits.maxAgeMs
    expect(store.get(id)).toBeNull()
  })

  it('não regrava o último uso a cada pedido', () => {
    const id = store.create(accountId)
    now += 10_000
    store.get(id)
    expect(db.prepare('SELECT last_seen_at FROM sessions').get()).toEqual({ last_seen_at: 1_000_000_000_000 })
    now += 30_000
    store.get(id)
    expect(db.prepare('SELECT last_seen_at FROM sessions').get()).toEqual({ last_seen_at: now })
  })

  it('a limpeza apaga as vencidas por inatividade e por limite', () => {
    const idle = store.create(accountId)
    now += 20 * MIN
    const fresh = store.create(accountId)
    now += 15 * MIN
    store.purgeExpired()
    expect(store.get(idle, { touch: false })).toBeNull()
    expect(store.get(fresh, { touch: false })).not.toBeNull()
  })
})
