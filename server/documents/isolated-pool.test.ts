import { IsolatedWorkerPool, QueueFullError, type IsolatedTask } from './isolated-pool.ts'

const workerUrl = new URL('./isolated-pool.fixture-worker.ts', import.meta.url)
type Mensagem = { tipo: 'fim'; valor: number } | { tipo: 'progresso' }
type Resultado = { ok: number } | { erro: 'tempo' | 'quebrou' }

function tarefa(data: Record<string, unknown>, extra: Partial<IsolatedTask<Mensagem, Resultado>> = {}): IsolatedTask<Mensagem, Resultado> & { progressos: number } {
  const task = {
    progressos: 0,
    workerUrl,
    prepare: () => ({ workerData: data }),
    onMessage: (message: Mensagem): Resultado | undefined => {
      if (message.tipo === 'progresso') {
        task.progressos += 1
        return undefined
      }
      return { ok: message.valor }
    },
    onTimeout: (): Resultado => ({ erro: 'tempo' }),
    onCrash: (): Resultado => ({ erro: 'quebrou' }),
    ...extra,
  }
  return task
}

const settings = { workers: 1, queueLimit: 1, jobTimeoutMs: 5000, workerMemoryMb: 128 }

describe('fila isolada de threads', () => {
  it('devolve o resultado da mensagem final e ignora as intermediárias', async () => {
    const pool = new IsolatedWorkerPool(settings)
    const task = tarefa({ acao: 'progresso', valor: 7 })
    expect(await pool.run(task)).toEqual({ ok: 7 })
    expect(task.progressos).toBe(2)
    await pool.close()
  })

  it('transfere os bytes para a thread sem copiar o original do chamador', async () => {
    const pool = new IsolatedWorkerPool(settings)
    const original = new Uint8Array(1234)
    const result = await pool.run(
      tarefa({}, {
        prepare: () => {
          const copy = original.slice()
          return { workerData: { acao: 'responder', bytes: copy }, transferList: [copy.buffer as ArrayBuffer] }
        },
      }),
    )
    expect(result).toEqual({ ok: 1234 })
    expect(original.byteLength).toBe(1234)
    await pool.close()
  })

  it('tempo esgotado e thread que quebra viram os resultados da tarefa', async () => {
    const pool = new IsolatedWorkerPool({ ...settings, jobTimeoutMs: 300 })
    expect(await pool.run(tarefa({ acao: 'travar' }))).toEqual({ erro: 'tempo' })
    expect(await pool.run(tarefa({ acao: 'quebrar' }))).toEqual({ erro: 'quebrou' })
    await pool.close()
  })

  it('fila cheia é recusada com a mensagem configurada; os dados só são montados quando a tarefa começa', async () => {
    const pool = new IsolatedWorkerPool({ ...settings, queueLimit: 1 }, { label: 'Leitura', queueFull: 'Fila de leituras cheia' })
    const ordem: string[] = []
    const primeira = pool.run(tarefa({}, { prepare: () => (ordem.push('primeira'), { workerData: { acao: 'esperar', ms: 200, valor: 1 } }) }))
    const segunda = pool.run(tarefa({}, { prepare: () => (ordem.push('segunda'), { workerData: { acao: 'responder', valor: 2 } }) }))
    expect(pool.canAccept()).toBe(false)
    await expect(pool.run(tarefa({ acao: 'responder' }))).rejects.toThrow(new QueueFullError('Fila de leituras cheia'))
    expect(ordem).toEqual(['primeira'])
    expect(await primeira).toEqual({ ok: 1 })
    expect(await segunda).toEqual({ ok: 2 })
    expect(ordem).toEqual(['primeira', 'segunda'])
    await pool.close()
  })

  it('cancelamento encerra a tarefa em andamento e tira da fila a que espera', async () => {
    const pool = new IsolatedWorkerPool(settings, { label: 'Leitura' })
    const running = new AbortController()
    const waiting = new AbortController()
    const prepared: string[] = []
    const emAndamento = pool.run(tarefa({ acao: 'travar' }, { signal: running.signal }))
    const naFila = pool.run(tarefa({}, { signal: waiting.signal, prepare: () => (prepared.push('fila'), { workerData: { acao: 'responder' } }) }))
    waiting.abort('desistiu')
    await expect(naFila).rejects.toBe('desistiu')
    running.abort()
    // Sem motivo informado, o próprio AbortSignal fornece um AbortError, que a fila repassa.
    await expect(emAndamento).rejects.toMatchObject({ name: 'AbortError' })
    expect(prepared).toEqual([])
    expect(await pool.run(tarefa({ acao: 'responder', valor: 3 }))).toEqual({ ok: 3 })
    await pool.close()
  })

  it('depois de fechada, não aceita mais tarefas', async () => {
    const pool = new IsolatedWorkerPool(settings)
    await pool.close()
    expect(pool.canAccept()).toBe(false)
    await expect(pool.run(tarefa({ acao: 'responder' }))).rejects.toBeInstanceOf(QueueFullError)
  })
})
