import { parentPort, workerData } from 'node:worker_threads'
import { compareDocuments } from './compare-documents.ts'
import { ComparisonFailure } from './failure.ts'
import type { WorkerInput, WorkerMessage } from './worker-protocol.ts'

/**
 * Thread isolada que compara um par de PDFs. Uma por tarefa: se travar, estourar a memória ou
 * passar do tempo, o servidor a encerra sem afetar as outras requisições.
 */
const port = parentPort
if (!port) throw new Error('worker.ts deve rodar como worker_thread')

const send = (message: WorkerMessage) => port.postMessage(message)
const input = workerData as WorkerInput

try {
  const result = await compareDocuments(input.documents, {
    limits: input.limits,
    onProgress: ({ stage }) => send({ type: 'progress', stage }),
  })
  send({ type: 'completed', result })
} catch (error) {
  if (error instanceof ComparisonFailure) send({ type: 'failed', error: error.toComparisonError(), reason: error.reason })
  else send({ type: 'failed', error: { code: 'PROCESSING_FAILED' }, reason: 'falha-inesperada' })
}
