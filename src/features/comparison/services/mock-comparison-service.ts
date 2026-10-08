import { stageOrder } from '../model/comparison-run'
import type { ComparisonOutcome, ComparisonService, CompareOptions } from '../model/types'
import { demoComparisonResult, demoNoDifferencesResult } from '../mocks/demo-comparison'

/** Cenários que o protótipo consegue simular, para revisão de interface. */
export type DemoScenario = 'concluida' | 'sem-diferencas' | 'erro' | 'incompativel' | 'sem-texto'

export const demoScenarios: readonly { id: DemoScenario; label: string }[] = [
  { id: 'concluida', label: 'Comparação concluída' },
  { id: 'sem-diferencas', label: 'Nenhuma diferença encontrada' },
  { id: 'erro', label: 'Erro de processamento' },
  { id: 'incompativel', label: 'Documento incompatível' },
  { id: 'sem-texto', label: 'PDF digitalizado sem texto' },
]

export function isDemoScenario(value: string | null): value is DemoScenario {
  return demoScenarios.some((scenario) => scenario.id === value)
}

const outcomes: Record<DemoScenario, ComparisonOutcome> = {
  concluida: { status: 'completed', result: demoComparisonResult },
  'sem-diferencas': { status: 'completed', result: demoNoDifferencesResult },
  erro: { status: 'failed', error: { code: 'PROCESSING_FAILED' } },
  incompativel: { status: 'failed', error: { code: 'INCOMPATIBLE_DOCUMENT', document: 'updated' } },
  'sem-texto': { status: 'failed', error: { code: 'NO_EXTRACTABLE_TEXT', document: 'original' } },
}

function wait(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(signal.reason)
    const timer = setTimeout(resolve, ms)
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(timer)
        reject(signal.reason)
      },
      { once: true },
    )
  })
}

/**
 * Serviço demonstrativo. NÃO lê nem envia os arquivos: apenas percorre as
 * etapas com atrasos fixos e devolve o resultado fictício do cenário escolhido.
 */
export function createMockComparisonService(scenario: DemoScenario, stepDelayMs = 650): ComparisonService {
  return {
    async compare(_input, options: CompareOptions = {}) {
      const { signal, onProgress } = options
      await wait(stepDelayMs, signal)
      for (const stage of stageOrder) {
        onProgress?.({ stage })
        await wait(stepDelayMs, signal)
        if (stage === 'extracting' && scenario !== 'concluida' && scenario !== 'sem-diferencas') break
      }
      return outcomes[scenario]
    },
  }
}
