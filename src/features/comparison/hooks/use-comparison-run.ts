import { useCallback, useEffect, useReducer, useState } from 'react'
import { comparisonRunReducer, initialRunState } from '../model/comparison-run'
import type { ComparisonInput, ComparisonService } from '../model/types'

/** Executa uma comparação e expõe o estado para a interface. */
export function useComparisonRun(service: ComparisonService, input: ComparisonInput) {
  const [state, dispatch] = useReducer(comparisonRunReducer, initialRunState)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    dispatch({ type: 'started' })
    // O envio começa no próximo ciclo: uma montagem desfeita na hora (StrictMode, navegação imediata)
    // é cancelada antes de os PDFs saírem, sem criar no servidor uma comparação que ninguém verá.
    const start = setTimeout(() => {
      service
        .compare(input, {
          signal: controller.signal,
          onProgress: (progress) => dispatch({ type: 'progressed', stage: progress.stage }),
        })
        .then((outcome) => dispatch({ type: 'finished', outcome }))
        .catch(() => {
          if (!controller.signal.aborted) {
            dispatch({ type: 'finished', outcome: { status: 'failed', error: { code: 'PROCESSING_FAILED' } } })
          }
        })
    }, 0)
    return () => {
      clearTimeout(start)
      controller.abort()
    }
  }, [service, input, attempt])

  const retry = useCallback(() => setAttempt((value) => value + 1), [])

  return { state, retry }
}
