import { describe, expect, it, vi } from 'vitest'
import { readServiceMode } from '@/config/comparison'
import { makeFile } from '@/test/files'
import { demoComparisonResult } from '../mocks/demo-comparison'
import type { ComparisonStage } from '../model/types'
import { createLocalComparisonService, type EngineWorker } from './local-comparison-service'
import type { LocalEngineMessage, LocalEngineRequest } from './local-engine-protocol'

const input = { original: makeFile('original.pdf'), updated: makeFile('atualizado.pdf') }
const result = { ...demoComparisonResult, isDemonstration: false }

/** Web Worker simulado: guarda o pedido e deixa o teste responder como o motor. */
function fakeWorker() {
  const listeners: Record<string, ((event: MessageEvent<LocalEngineMessage>) => void)[]> = {}
  const state = { request: undefined as LocalEngineRequest | undefined, transfer: [] as Transferable[], terminated: false }
  const worker: EngineWorker = {
    postMessage(message, transfer) {
      state.request = message
      state.transfer = transfer
    },
    addEventListener(type: string, listener: (event: MessageEvent<LocalEngineMessage>) => void) {
      ;(listeners[type] ??= []).push(listener)
    },
    terminate: vi.fn(() => {
      state.terminated = true
    }),
  }
  const emit = (type: string, data?: LocalEngineMessage) => {
    for (const listener of listeners[type] ?? []) listener(new MessageEvent(type, { data }))
  }
  return { worker, state, reply: (message: LocalEngineMessage) => emit('message', message), crash: () => emit('error') }
}

/** Espera o serviço ler os arquivos e entregar o pedido ao worker. */
const posted = (state: { request: LocalEngineRequest | undefined }) => vi.waitFor(() => expect(state.request).toBeDefined())

describe('createLocalComparisonService', () => {
  it('entrega os dois PDFs ao motor, repassa as etapas e devolve o resultado', async () => {
    const fake = fakeWorker()
    const stages: ComparisonStage[] = []
    const comparing = createLocalComparisonService({ createWorker: () => fake.worker }).compare(input, { onProgress: ({ stage }) => stages.push(stage) })
    await posted(fake.state)

    expect(fake.state.request?.documents.original.fileName).toBe('original.pdf')
    expect(fake.state.request?.documents.updated.fileName).toBe('atualizado.pdf')
    expect(new TextDecoder().decode(fake.state.request?.documents.original.bytes.subarray(0, 5))).toBe('%PDF-')
    // Os bytes são transferidos ao worker, não copiados.
    expect(fake.state.transfer).toHaveLength(2)

    fake.reply({ type: 'progress', stage: 'extracting' })
    fake.reply({ type: 'progress', stage: 'extracting' })
    fake.reply({ type: 'progress', stage: 'comparing' })
    fake.reply({ type: 'completed', result })
    await expect(comparing).resolves.toEqual({ status: 'completed', result })
    expect(stages).toEqual(['extracting', 'comparing'])
    // O worker é encerrado no fim, levando consigo tudo o que guardou na memória.
    expect(fake.state.terminated).toBe(true)
  })

  it('repassa a falha de domínio do motor (documento incompatível)', async () => {
    const fake = fakeWorker()
    const comparing = createLocalComparisonService({ createWorker: () => fake.worker }).compare(input)
    await posted(fake.state)
    fake.reply({ type: 'failed', error: { code: 'INCOMPATIBLE_DOCUMENT', document: 'updated' } })
    await expect(comparing).resolves.toEqual({ status: 'failed', error: { code: 'INCOMPATIBLE_DOCUMENT', document: 'updated' } })
    expect(fake.state.terminated).toBe(true)
  })

  it('falha do worker vira PROCESSING_FAILED, e a comparação seguinte usa um worker novo', async () => {
    const first = fakeWorker()
    const second = fakeWorker()
    const workers = [first, second]
    const service = createLocalComparisonService({ createWorker: () => workers.shift()?.worker ?? fakeWorker().worker })

    const failing = service.compare(input)
    await posted(first.state)
    first.crash()
    await expect(failing).resolves.toEqual({ status: 'failed', error: { code: 'PROCESSING_FAILED' } })
    expect(first.state.terminated).toBe(true)

    const recovered = service.compare(input)
    await posted(second.state)
    second.reply({ type: 'completed', result })
    await expect(recovered).resolves.toEqual({ status: 'completed', result })
  })

  it('não conseguir abrir o worker vira PROCESSING_FAILED', async () => {
    const service = createLocalComparisonService({
      createWorker: () => {
        throw new Error('Worker indisponível')
      },
    })
    await expect(service.compare(input)).resolves.toEqual({ status: 'failed', error: { code: 'PROCESSING_FAILED' } })
  })

  it('tempo esgotado encerra o worker e vira PROCESSING_FAILED', async () => {
    const fake = fakeWorker()
    const comparing = createLocalComparisonService({ createWorker: () => fake.worker, timeoutMs: 20 }).compare(input)
    await expect(comparing).resolves.toEqual({ status: 'failed', error: { code: 'PROCESSING_FAILED' } })
    expect(fake.state.terminated).toBe(true)
    // Uma resposta atrasada do motor não muda mais nada.
    fake.reply({ type: 'completed', result })
  })

  it('cancelar encerra o worker e rejeita com o motivo do cancelamento', async () => {
    const fake = fakeWorker()
    const controller = new AbortController()
    const comparing = createLocalComparisonService({ createWorker: () => fake.worker }).compare(input, { signal: controller.signal })
    await posted(fake.state)
    controller.abort(new DOMException('cancelado', 'AbortError'))
    await expect(comparing).rejects.toMatchObject({ name: 'AbortError' })
    expect(fake.state.terminated).toBe(true)
  })

  it('sem os dois arquivos não abre o worker', async () => {
    const createWorker = vi.fn(() => fakeWorker().worker)
    await expect(createLocalComparisonService({ createWorker }).compare({ original: input.original, updated: null })).resolves.toEqual({
      status: 'failed',
      error: { code: 'PROCESSING_FAILED' },
    })
    expect(createWorker).not.toHaveBeenCalled()
  })
})

describe('readServiceMode', () => {
  it('reconhece a comparação no navegador ("local") ao lado da do servidor e da demonstrativa', () => {
    expect(readServiceMode('local')).toBe('local')
    expect(readServiceMode('demo')).toBe('demo')
    expect(readServiceMode(undefined)).toBe('api')
    expect(readServiceMode('qualquer')).toBe('api')
  })
})
