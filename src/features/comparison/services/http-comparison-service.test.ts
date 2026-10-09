import { describe, expect, it, vi } from 'vitest'
import { makeFile } from '@/test/files'
import { demoComparisonResult } from '../mocks/demo-comparison'
import type { ComparisonJob, ComparisonStage } from '../model/types'
import { createHttpComparisonService } from './http-comparison-service'

const JOB_ID = '11111111-2222-4333-8444-555555555555'
const input = { original: makeFile('original.pdf'), updated: makeFile('atualizado.pdf') }
const result = { ...demoComparisonResult, isDemonstration: false }

type Reply = Response | Error

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
}

/** `fetch` simulado: responde em ordem e registra as chamadas. */
function fakeFetch(...replies: Reply[]) {
  const calls: { url: string; init: RequestInit | undefined }[] = []
  const fn = vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ url: String(url), init })
    if (init?.method === 'DELETE') return new Response(null, { status: 204 })
    const reply = replies.shift()
    if (!reply) throw new Error('sem resposta preparada')
    if (reply instanceof Error) throw reply
    return reply
  })
  return { fetch: fn as unknown as typeof fetch, calls }
}

const queued: ComparisonJob = { id: JOB_ID, status: 'queued' }

describe('createHttpComparisonService', () => {
  it('envia os dois PDFs e acompanha a tarefa até o resultado', async () => {
    const { fetch, calls } = fakeFetch(
      json(queued, 202),
      json({ id: JOB_ID, status: 'processing', stage: 'extracting' }),
      json({ id: JOB_ID, status: 'processing', stage: 'comparing' }),
      json({ id: JOB_ID, status: 'completed', result }),
    )
    const stages: ComparisonStage[] = []
    const service = createHttpComparisonService({ fetch, pollIntervalMs: 0, baseUrl: 'http://aqr.local' })
    const outcome = await service.compare(input, { onProgress: ({ stage }) => stages.push(stage) })

    expect(outcome).toEqual({ status: 'completed', result })
    expect(stages).toEqual(['validating', 'extracting', 'comparing'])
    expect(calls[0]?.url).toBe('http://aqr.local/api/comparisons')
    expect(calls[0]?.init?.method).toBe('POST')
    const body = calls[0]?.init?.body
    if (!(body instanceof FormData)) throw new Error('corpo deveria ser FormData')
    expect((body.get('original') as File).name).toBe('original.pdf')
    expect((body.get('updated') as File).name).toBe('atualizado.pdf')
    expect(calls[1]?.url).toBe(`http://aqr.local/api/comparisons/${JOB_ID}`)
  })

  it('repassa a falha de domínio do servidor', async () => {
    const { fetch } = fakeFetch(
      json(queued, 202),
      json({ id: JOB_ID, status: 'failed', error: { code: 'NO_EXTRACTABLE_TEXT', document: 'updated' } }),
    )
    const outcome = await createHttpComparisonService({ fetch, pollIntervalMs: 0 }).compare(input)
    expect(outcome).toEqual({ status: 'failed', error: { code: 'NO_EXTRACTABLE_TEXT', document: 'updated' } })
  })

  it('transforma arquivo recusado no envio em documento incompatível', async () => {
    const { fetch } = fakeFetch(
      json({ error: { code: 'NOT_A_PDF', message: 'O documento original não é um PDF válido.', document: 'original' } }, 415),
    )
    const outcome = await createHttpComparisonService({ fetch }).compare(input)
    expect(outcome).toEqual({ status: 'failed', error: { code: 'INCOMPATIBLE_DOCUMENT', document: 'original' } })
  })

  it.each([
    ['servidor ocupado', [json({ error: { code: 'QUEUE_FULL', message: 'Ocupado.' } }, 503)]],
    ['falha de rede no envio', [new TypeError('Failed to fetch')]],
    ['resposta fora do contrato', [json({ id: 1, status: 'inventado' }, 202)]],
    ['tarefa expirada', [json(queued, 202), json({ error: { code: 'COMPARISON_NOT_FOUND', message: 'x' } }, 404)]],
    ['rede cai três vezes seguidas', [json(queued, 202), new TypeError('a'), new TypeError('b'), new TypeError('c')]],
  ])('%s vira falha de processamento', async (_, replies) => {
    const { fetch } = fakeFetch(...replies)
    const outcome = await createHttpComparisonService({ fetch, pollIntervalMs: 0 }).compare(input)
    expect(outcome).toEqual({ status: 'failed', error: { code: 'PROCESSING_FAILED' } })
  })

  it('tolera falhas de rede passageiras durante o acompanhamento', async () => {
    const { fetch } = fakeFetch(json(queued, 202), new TypeError('a'), new TypeError('b'), json({ id: JOB_ID, status: 'completed', result }))
    const outcome = await createHttpComparisonService({ fetch, pollIntervalMs: 0 }).compare(input)
    expect(outcome.status).toBe('completed')
  })

  it('ao cancelar, avisa o servidor para descartar a tarefa', async () => {
    const controller = new AbortController()
    const { fetch, calls } = fakeFetch(json(queued, 202))
    const promise = createHttpComparisonService({ fetch, pollIntervalMs: 10_000 }).compare(input, { signal: controller.signal })
    await vi.waitFor(() => expect(calls).toHaveLength(1))
    controller.abort()
    await expect(promise).rejects.toBeDefined()
    expect(calls.at(-1)).toMatchObject({ url: `/api/comparisons/${JOB_ID}`, init: { method: 'DELETE' } })
  })

  it('não envia nada sem os dois arquivos', async () => {
    const { fetch, calls } = fakeFetch()
    const outcome = await createHttpComparisonService({ fetch }).compare({ original: input.original, updated: null })
    expect(outcome).toEqual({ status: 'failed', error: { code: 'PROCESSING_FAILED' } })
    expect(calls).toHaveLength(0)
  })
})
