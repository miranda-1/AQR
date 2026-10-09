import { ComparisonJobStore } from './job-store.ts'

const result = {
  id: 'r',
  isDemonstration: false,
  documents: {
    original: { role: 'original' as const, fileName: 'a.pdf', sizeBytes: 1, pageCount: 1 },
    updated: { role: 'updated' as const, fileName: 'b.pdf', sizeBytes: 1, pageCount: 1 },
  },
  summary: { total: 0, additions: 0, deletions: 0, modifications: 0 },
  differences: [],
}

describe('ComparisonJobStore', () => {
  it('acompanha a tarefa da fila ao resultado', () => {
    const store = new ComparisonJobStore(1000)
    const { id } = store.create()
    expect(store.get(id)).toEqual({ id, status: 'queued' })
    store.progress({ id, status: 'processing', stage: 'extracting' })
    expect(store.get(id)).toEqual({ id, status: 'processing', stage: 'extracting' })
    store.finish({ id, status: 'completed', result })
    expect(store.get(id)).toMatchObject({ status: 'completed' })
    // Andamento atrasado não desfaz a conclusão.
    store.progress({ id, status: 'processing', stage: 'organizing' })
    expect(store.get(id)).toMatchObject({ status: 'completed' })
  })

  it('descarta o resultado depois do prazo', () => {
    let now = 0
    const store = new ComparisonJobStore(1000, () => now)
    const { id } = store.create()
    store.finish({ id, status: 'failed', error: { code: 'PROCESSING_FAILED' } })
    now = 999
    expect(store.get(id)).toBeDefined()
    now = 1000
    expect(store.get(id)).toBeUndefined()
    expect(store.size).toBe(0)
  })

  it('não expira tarefas em andamento e limpa as vencidas', () => {
    let now = 0
    const store = new ComparisonJobStore(10, () => now)
    const running = store.create()
    const done = store.create()
    store.finish({ id: done.id, status: 'completed', result })
    now = 100
    store.purgeExpired()
    expect(store.get(running.id)).toBeDefined()
    expect(store.get(done.id)).toBeUndefined()
  })

  it('cancelar aborta o sinal e remove a tarefa', () => {
    const store = new ComparisonJobStore(1000)
    const { id, signal } = store.create()
    store.remove(id)
    expect(signal.aborted).toBe(true)
    expect(store.get(id)).toBeUndefined()
  })
})
