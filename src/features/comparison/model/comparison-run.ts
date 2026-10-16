import type { ComparisonError, ComparisonOutcome, ComparisonResult, ComparisonStage } from './types'

/** Estados de uma execução de comparação, do ponto de vista da interface. */
export type ComparisonRunState =
  | { phase: 'preparing' }
  | { phase: 'processing'; stage: ComparisonStage }
  | { phase: 'completed'; result: ComparisonResult }
  | { phase: 'failed'; error: ComparisonError }

export type ComparisonRunAction =
  | { type: 'started' }
  | { type: 'progressed'; stage: ComparisonStage }
  | { type: 'finished'; outcome: ComparisonOutcome }

export const initialRunState: ComparisonRunState = { phase: 'preparing' }

export function comparisonRunReducer(state: ComparisonRunState, action: ComparisonRunAction): ComparisonRunState {
  switch (action.type) {
    case 'started':
      return { phase: 'preparing' }
    case 'progressed':
      // Progresso tardio não deve sobrescrever um resultado final.
      if (state.phase === 'completed' || state.phase === 'failed') return state
      return { phase: 'processing', stage: action.stage }
    case 'finished':
      return action.outcome.status === 'completed'
        ? { phase: 'completed', result: action.outcome.result }
        : { phase: 'failed', error: action.outcome.error }
  }
}

export const stageOrder: readonly ComparisonStage[] = ['validating', 'extracting', 'comparing', 'organizing']

export const stageLabels: Record<ComparisonStage, string> = {
  validating: 'Verificando os arquivos',
  extracting: 'Lendo as páginas: texto, imagens e OCR quando preciso',
  comparing: 'Comparando o texto, a estrutura e a aparência',
  organizing: 'Organizando as diferenças',
}
