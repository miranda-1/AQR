import { parentPort, workerData } from 'node:worker_threads'
import { createOcrEngine, type OcrEngine } from '../documents/ocr/ocr-engine.ts'
import { triarAnexo, type AnexoTriado } from './pipeline.ts'
import type { TriagemWorkerInput, TriagemWorkerMessage } from './worker-protocol.ts'

/**
 * Thread isolada que lê, classifica e extrai os campos dos anexos de um processo de triagem. Uma
 * por tarefa, com limite de memória e de tempo dado pela fila (`IsolatedWorkerPool`). O OCR é local;
 * nada sai do servidor. As regras rodam no processo principal (são rápidas e precisam do banco).
 */
const port = parentPort
if (!port) throw new Error('worker.ts da triagem deve rodar como worker_thread')

const send = (message: TriagemWorkerMessage) => port.postMessage(message)
const input = workerData as TriagemWorkerInput

let ocr: OcrEngine | undefined
try {
  if (input.ocr) ocr = (await createOcrEngine(input.ocrLanguagePath || undefined)).engine
  const anexos: AnexoTriado[] = []
  for (const [indice, anexo] of input.anexos.entries()) {
    anexos.push(await triarAnexo(anexo.id, anexo.nome, anexo.bytes, { limites: input.limites, ...(ocr ? { ocr } : {}) }))
    send({ type: 'progresso', concluidos: indice + 1, total: input.anexos.length })
  }
  send({ type: 'concluido', anexos })
} catch (error) {
  send({ type: 'falhou', motivo: error instanceof Error ? error.name : 'falha-inesperada' })
} finally {
  await ocr?.close()
}
