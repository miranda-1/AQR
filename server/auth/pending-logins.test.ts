import { PendingLogins } from './pending-logins.ts'

const login = (state: string) => ({ state, nonce: `n-${state}`, verifier: `v-${state}` })

describe('PendingLogins', () => {
  it('cada state serve uma vez e vence no prazo', () => {
    let now = 0
    const pending = new PendingLogins(1000, 10, () => now)
    pending.add(login('a'), '/x')
    expect(pending.take('a')).toMatchObject({ state: 'a', returnTo: '/x' })
    expect(pending.take('a')).toBeUndefined()
    pending.add(login('b'), '/')
    now = 1000
    expect(pending.take('b')).toBeUndefined()
  })

  it('logins abandonados vencidos saem sozinhos', () => {
    let now = 0
    const pending = new PendingLogins(1000, 10, () => now)
    for (const state of ['a', 'b', 'c']) pending.add(login(state), '/')
    now = 1500
    pending.add(login('d'), '/')
    expect(pending.size).toBe(1)
    expect(pending.has('d')).toBe(true)
  })

  it('com o teto cheio, o mais antigo sai para o novo entrar', () => {
    const pending = new PendingLogins(60_000, 3, () => 0)
    for (const state of ['a', 'b', 'c', 'd', 'e']) pending.add(login(state), '/')
    expect(pending.size).toBe(3)
    expect(['a', 'b'].some((state) => pending.has(state))).toBe(false)
    expect(['c', 'd', 'e'].every((state) => pending.has(state))).toBe(true)
  })
})
