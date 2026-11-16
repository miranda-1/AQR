import { parentPort, workerData } from 'node:worker_threads'
import { criarProvedorSimulado } from './provedor.ts'
import type { IaWorkerInput, IaWorkerMessage } from './worker-protocol.ts'

/**
 * Thread isolada do provedor de IA: separada da thread de leitura e do processo principal, com
 * memória e tempo próprios (`IsolatedWorkerPool`). Se o provedor travar, estourar a memória ou
 * falhar, só esta thread morre; a análise determinística já foi concluída e gravada antes.
 * A saída volta crua: quem valida e verifica é o processo principal.
 */
const port = parentPort
if (!port) throw new Error('worker.ts da IA deve rodar como worker_thread')
const send = (message: IaWorkerMessage) => port.postMessage(message)
const input = workerData as IaWorkerInput

try {
  const provedor = criarProvedorSimulado(input.provedor.opcoes)
  const saida = await provedor.propor(input.pedido)
  send({ type: 'concluido', saida, memoriaMb: Math.round(process.memoryUsage().heapUsed / (1024 * 1024)) })
} catch (error) {
  send({ type: 'falhou', motivo: error instanceof Error ? error.name : 'falha-inesperada' })
}
