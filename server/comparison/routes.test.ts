import type { FastifyInstance } from 'fastify'
import type { ApiErrorBody } from '../../shared/contracts/api-error.ts'
import type { ComparisonJob } from '../../shared/contracts/comparison.ts'
import { buildTestApp, multipartBody, type UploadFile } from '../test/build-test-app.ts'
import { makeImageOnlyPdf, makePdf } from '../test/make-pdf.ts'

/**
 * Testes de integração da API: requisições multipart de verdade, threads de comparação de
 * verdade (worker_threads) e PDFs gerados de verdade.
 */

const ORIGINAL = [['Art. 1º O prazo para o requerimento é de dez dias corridos.', 'Art. 2º Esta norma entra em vigor.']]
const UPDATED = [['Art. 1º O prazo para o requerimento é de quinze dias corridos.', 'Art. 2º Esta norma entra em vigor.']]

async function upload(app: FastifyInstance, files: UploadFile[]) {
  const { payload, headers } = await multipartBody(files)
  return app.inject({ method: 'POST', url: '/api/comparisons', payload, headers })
}

async function pair(original = ORIGINAL, updated = UPDATED): Promise<UploadFile[]> {
  return [
    { field: 'original', name: 'original.pdf', bytes: (await makePdf(original)).bytes },
    { field: 'updated', name: 'atualizado.pdf', bytes: (await makePdf(updated)).bytes },
  ]
}

async function waitForEnd(app: FastifyInstance, id: string): Promise<ComparisonJob> {
  const deadline = Date.now() + 20_000
  while (Date.now() < deadline) {
    const response = await app.inject({ method: 'GET', url: `/api/comparisons/${id}` })
    const job = response.json<ComparisonJob>()
    if (job.status === 'completed' || job.status === 'failed') return job
    await new Promise((resolve) => setTimeout(resolve, 50))
  }
  throw new Error('A comparação não terminou a tempo')
}

function errorOf(body: string): ApiErrorBody['error'] {
  return (JSON.parse(body) as ApiErrorBody).error
}

describe('API de comparação', () => {
  let app: FastifyInstance
  beforeAll(async () => {
    app = await buildTestApp()
  })
  afterAll(() => app.close())

  it('aceita dois PDFs, processa numa thread e devolve o resultado do contrato', { timeout: 30_000 }, async () => {
    const files = await pair()
    files[0] = { field: 'original', name: '../../segredo/original.pdf', bytes: files[0]?.bytes ?? new Uint8Array() }
    const response = await upload(app, files)
    expect(response.statusCode).toBe(202)
    const job = response.json<ComparisonJob>()
    expect(job.status).toBe('queued')
    expect(response.headers.location).toBe(`/api/comparisons/${job.id}`)

    const finished = await waitForEnd(app, job.id)
    if (finished.status !== 'completed') throw new Error(`Esperava conclusão, veio ${finished.status}`)
    expect(finished.result.isDemonstration).toBe(false)
    expect(finished.result.documents.original.fileName).toBe('original.pdf')
    expect(finished.result.documents.updated.fileName).toBe('atualizado.pdf')
    expect(finished.result.summary).toEqual({ total: 1, additions: 0, deletions: 0, modifications: 1 })
    expect(finished.result.differences[0]).toMatchObject({ kind: 'modification', context: 'Art. 1º' })
  })

  it('termina com erro de domínio quando o PDF não tem texto', { timeout: 30_000 }, async () => {
    const files = await pair()
    files[0] = { field: 'original', name: 'digitalizado.pdf', bytes: await makeImageOnlyPdf() }
    const job = (await upload(app, files)).json<ComparisonJob>()
    expect(await waitForEnd(app, job.id)).toEqual({
      id: job.id,
      status: 'failed',
      error: { code: 'NO_EXTRACTABLE_TEXT', document: 'original' },
    })
  })

  it('recusa envio sem multipart', async () => {
    const response = await app.inject({ method: 'POST', url: '/api/comparisons', payload: { original: 'x' } })
    expect(response.statusCode).toBe(415)
    expect(errorOf(response.body).code).toBe('MULTIPART_REQUIRED')
  })

  it('recusa quando falta um dos documentos, apontando qual', async () => {
    const [original] = await pair()
    const response = await upload(app, [original ?? { field: 'original', name: 'a.pdf', bytes: new Uint8Array() }])
    expect(response.statusCode).toBe(400)
    expect(errorOf(response.body)).toMatchObject({ code: 'MISSING_FILE', document: 'updated' })
    expect(errorOf(response.body).message).toBe('Falta o documento atualizado. Envie os dois PDFs.')
  })

  it('recusa campos inesperados', async () => {
    const files = await pair()
    const response = await upload(app, [{ field: 'outro', name: 'x.pdf', bytes: files[0]?.bytes ?? new Uint8Array() }])
    expect(response.statusCode).toBe(400)
    expect(errorOf(response.body).code).toBe('UNEXPECTED_FIELD')
  })

  it('recusa arquivo que não é PDF, pelo tipo ou pela assinatura', async () => {
    const [original, updated] = await pair()
    const text = new TextEncoder().encode('não sou um PDF')
    const byType = await upload(app, [original ?? { field: 'original', name: '', bytes: text }, { field: 'updated', name: 'b.txt', bytes: text, type: 'text/plain' }])
    expect(byType.statusCode).toBe(415)
    expect(errorOf(byType.body)).toMatchObject({ code: 'NOT_A_PDF', document: 'updated' })

    const bySignature = await upload(app, [{ field: 'original', name: 'falso.pdf', bytes: text }, updated ?? { field: 'updated', name: '', bytes: text }])
    expect(bySignature.statusCode).toBe(415)
    expect(errorOf(bySignature.body)).toMatchObject({ code: 'NOT_A_PDF', document: 'original' })
  })

  it('devolve 404 para tarefas inexistentes ou ids inválidos', async () => {
    for (const id of ['00000000-0000-4000-8000-000000000000', '../../etc', 'abc']) {
      const response = await app.inject({ method: 'GET', url: `/api/comparisons/${encodeURIComponent(id)}` })
      expect(response.statusCode).toBe(404)
      expect(errorOf(response.body).code).toBe('COMPARISON_NOT_FOUND')
    }
  })

  it('cancela e descarta uma tarefa', { timeout: 30_000 }, async () => {
    const job = (await upload(app, await pair())).json<ComparisonJob>()
    const deleted = await app.inject({ method: 'DELETE', url: `/api/comparisons/${job.id}` })
    expect(deleted.statusCode).toBe(204)
    expect((await app.inject({ method: 'GET', url: `/api/comparisons/${job.id}` })).statusCode).toBe(404)
  })
})

describe('API de comparação: limites', () => {
  it('recusa arquivo acima do tamanho máximo com 413', async () => {
    const app = await buildTestApp({ comparison: { maxFileSizeBytes: 500 } })
    try {
      const response = await upload(app, await pair())
      expect(response.statusCode).toBe(413)
      expect(errorOf(response.body).code).toBe('FILE_TOO_LARGE')
    } finally {
      await app.close()
    }
  })

  it('responde 503 quando a fila está cheia', { timeout: 30_000 }, async () => {
    const app = await buildTestApp({ comparison: { workers: 1, queueLimit: 0 } })
    try {
      const first = await upload(app, await pair())
      expect(first.statusCode).toBe(202)
      const second = await upload(app, await pair())
      expect(second.statusCode).toBe(503)
      expect(second.headers['retry-after']).toBe('30')
      expect(errorOf(second.body).code).toBe('QUEUE_FULL')
    } finally {
      await app.close()
    }
  })

  it('encerra a thread que passa do tempo máximo', { timeout: 30_000 }, async () => {
    const app = await buildTestApp({ comparison: { jobTimeoutMs: 1 } })
    try {
      const job = (await upload(app, await pair())).json<ComparisonJob>()
      expect(await waitForEnd(app, job.id)).toEqual({ id: job.id, status: 'failed', error: { code: 'PROCESSING_FAILED' } })
    } finally {
      await app.close()
    }
  })
})
