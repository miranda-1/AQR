import { GlobalWorkerOptions } from 'pdfjs-dist/legacy/build/pdf.mjs'
import pdfWorkerUrl from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url'
import { compareDocuments } from '../../../../server/comparison/compare-documents.ts'
import { ComparisonFailure } from '../../../../server/comparison/failure.ts'
import type { LocalEngineMessage, LocalEngineRequest } from '../services/local-engine-protocol'
import { localComparisonLimits } from './limits'

/**
 * Motor de comparação do servidor rodando no navegador, num Web Worker próprio. É o mesmo código
 * de `server/comparison/` (só a plataforma muda; ver `server/documents/platform/README.md`). Uma
 * comparação por worker: a página o encerra ao receber o resultado, ao cancelar ou ao passar do
 * tempo, e tudo o que ele guardou na memória vai junto. Os PDFs nunca saem do computador.
 */

// O pdf.js roda numa thread própria (um worker dentro deste worker), com o arquivo servido pelo
// AQR. A porta é entregue pronta porque, sem `window`, o pdf.js não consegue abrir o worker sozinho
// e cairia no modo de mesma thread, em que o worker dele se registra aqui e passa a responder às
// mensagens da página. Ao encerrar este worker, o navegador encerra o do pdf.js junto.
GlobalWorkerOptions.workerPort = new Worker(pdfWorkerUrl, { type: 'module', name: 'aqr-pdfjs' })

const send = (message: LocalEngineMessage) => self.postMessage(message)

self.addEventListener(
  'message',
  (event: MessageEvent<LocalEngineRequest>) => {
    void (async () => {
      try {
        const result = await compareDocuments(event.data.documents, {
          limits: localComparisonLimits,
          onProgress: ({ stage }) => send({ type: 'progress', stage }),
        })
        send({ type: 'completed', result })
      } catch (error) {
        send({ type: 'failed', error: error instanceof ComparisonFailure ? error.toComparisonError() : { code: 'PROCESSING_FAILED' } })
      }
    })()
  },
  { once: true },
)
