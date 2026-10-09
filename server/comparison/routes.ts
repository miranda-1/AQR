import type { FastifyInstance } from 'fastify'
import type { ComparisonJob, DocumentRole } from '../../shared/contracts/comparison.ts'
import { ApiError } from '../http/errors.ts'
import { sanitizeFileName } from '../http/file-name.ts'
import type { ComparisonJobStore } from './job-store.ts'
import type { ComparisonWorkerPool } from './worker-pool.ts'

const ACCEPTED_TYPES = new Set(['application/pdf', 'application/x-pdf'])
const PDF_SIGNATURE = [0x25, 0x50, 0x44, 0x46, 0x2d] // %PDF-
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/u
const roles: readonly DocumentRole[] = ['original', 'updated']
const roleLabel: Record<DocumentRole, string> = { original: 'original', updated: 'atualizado' }

interface ComparisonRoutesOptions {
  store: ComparisonJobStore
  pool: ComparisonWorkerPool
  maxFileSizeBytes: number
  resultTtlMs: number
}

function isRole(value: string): value is DocumentRole {
  return (roles as readonly string[]).includes(value)
}

function hasPdfSignature(bytes: Uint8Array): boolean {
  return PDF_SIGNATURE.every((byte, index) => bytes[index] === byte)
}

function notFound(ttlMs: number): ApiError {
  const minutes = Math.round(ttlMs / 60_000)
  return new ApiError(
    404,
    'COMPARISON_NOT_FOUND',
    `Esta comparação não está mais disponível. Os resultados ficam guardados por ${minutes} minutos; envie os arquivos de novo.`,
  )
}

export function registerComparisonRoutes(app: FastifyInstance, options: ComparisonRoutesOptions): void {
  const { store, pool, maxFileSizeBytes, resultTtlMs } = options

  app.post('/api/comparisons', async (request, reply) => {
    if (!request.isMultipart()) {
      throw new ApiError(415, 'MULTIPART_REQUIRED', 'Envie os PDFs como formulário (multipart/form-data), nos campos "original" e "updated".')
    }
    const documents: Partial<Record<DocumentRole, { fileName: string; bytes: Uint8Array }>> = {}

    const parts = request.parts({ limits: { fileSize: maxFileSizeBytes, files: 2, fields: 0, parts: 2 } })
    for await (const part of parts) {
      if (part.type !== 'file' || !isRole(part.fieldname)) {
        throw new ApiError(400, 'UNEXPECTED_FIELD', 'Envie apenas os campos "original" e "updated", com os PDFs.')
      }
      const role = part.fieldname
      if (documents[role]) throw new ApiError(400, 'DUPLICATE_FILE', `Envie só um PDF no campo "${role}".`, { document: role })
      const bytes = new Uint8Array(await part.toBuffer())
      if (!ACCEPTED_TYPES.has(part.mimetype) || !hasPdfSignature(bytes)) {
        throw new ApiError(
          415,
          'NOT_A_PDF',
          `O documento ${roleLabel[role]} não é um PDF válido. Escolha um arquivo .pdf e envie de novo.`,
          { document: role },
        )
      }
      documents[role] = { fileName: sanitizeFileName(part.filename), bytes }
    }

    const original = documents.original
    const updated = documents.updated
    if (!original || !updated) {
      const missing: DocumentRole = original ? 'updated' : 'original'
      throw new ApiError(400, 'MISSING_FILE', `Falta o documento ${roleLabel[missing]}. Envie os dois PDFs.`, { document: missing })
    }
    if (!pool.canAccept()) {
      reply.header('retry-after', '30')
      throw queueFull()
    }

    const { id, signal } = store.create()
    const started = Date.now()
    pool
      .run(
        { original, updated },
        {
          signal,
          onProgress: (stage) => store.progress({ id, status: 'processing', stage }),
          onFailureReason: (reason) => request.log.info({ comparison: id, reason }, 'comparação recusada'),
        },
      )
      .then((outcome) => {
        store.finish({ id, ...outcome })
        request.log.info(
          { comparison: id, status: outcome.status, ms: Date.now() - started, bytes: original.bytes.byteLength + updated.bytes.byteLength },
          'comparação terminada',
        )
      })
      .catch((error: unknown) => {
        if (signal.aborted) return
        // Fila cheia entre a checagem e a execução, ou falha ao iniciar a thread.
        store.finish({ id, status: 'failed', error: { code: 'PROCESSING_FAILED' } })
        request.log.warn({ comparison: id, err: error instanceof Error ? error.name : 'desconhecido' }, 'comparação não iniciada')
      })

    const job: ComparisonJob = { id, status: 'queued' }
    return reply.status(202).header('location', `/api/comparisons/${id}`).send(job)
  })

  app.get<{ Params: { id: string } }>('/api/comparisons/:id', async (request, reply) => {
    const { id } = request.params
    const job = UUID.test(id) ? store.get(id) : undefined
    if (!job) throw notFound(resultTtlMs)
    return reply.header('cache-control', 'no-store').send(job)
  })

  app.delete<{ Params: { id: string } }>('/api/comparisons/:id', async (request, reply) => {
    const { id } = request.params
    if (UUID.test(id)) store.remove(id)
    return reply.status(204).send()
  })
}

function queueFull(): ApiError {
  return new ApiError(
    503,
    'QUEUE_FULL',
    'O servidor está ocupado com outras comparações. Tente de novo em alguns instantes.',
  )
}
