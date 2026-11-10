import { parentPort, workerData } from 'node:worker_threads'

/** Thread de teste da fila isolada: faz o que `acao` manda. Só para `isolated-pool.test.ts`. */
const port = parentPort
if (!port) throw new Error('isolated-pool.fixture-worker.ts deve rodar como worker_thread')

const input = workerData as { acao: 'responder' | 'progresso' | 'esperar' | 'travar' | 'quebrar'; valor?: number; ms?: number; bytes?: Uint8Array }

if (input.acao === 'responder') port.postMessage({ tipo: 'fim', valor: input.bytes?.byteLength ?? input.valor ?? 0 })
if (input.acao === 'progresso') {
  port.postMessage({ tipo: 'progresso' })
  port.postMessage({ tipo: 'progresso' })
  port.postMessage({ tipo: 'fim', valor: input.valor ?? 0 })
}
if (input.acao === 'esperar') setTimeout(() => port.postMessage({ tipo: 'fim', valor: input.valor ?? 0 }), input.ms ?? 100)
if (input.acao === 'travar') setInterval(() => undefined, 1000)
if (input.acao === 'quebrar') throw new Error('falha de propósito')
