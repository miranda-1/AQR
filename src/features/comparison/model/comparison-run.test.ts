import { describe, expect, it } from 'vitest'
import { demoComparisonResult } from '../mocks/demo-comparison'
import { comparisonRunReducer, initialRunState } from './comparison-run'
import { summarize } from './types'

describe('comparisonRunReducer', () => {
  it('avança de preparação para processamento e conclusão', () => {
    let state = comparisonRunReducer(initialRunState, { type: 'progressed', stage: 'extracting' })
    expect(state).toEqual({ phase: 'processing', stage: 'extracting' })
    state = comparisonRunReducer(state, {
      type: 'finished',
      outcome: { status: 'completed', result: demoComparisonResult },
    })
    expect(state).toEqual({ phase: 'completed', result: demoComparisonResult })
  })

  it('registra falhas com o código do erro', () => {
    const state = comparisonRunReducer(initialRunState, {
      type: 'finished',
      outcome: { status: 'failed', error: { code: 'NO_EXTRACTABLE_TEXT', document: 'original' } },
    })
    expect(state).toEqual({ phase: 'failed', error: { code: 'NO_EXTRACTABLE_TEXT', document: 'original' } })
  })

  it('ignora progresso tardio depois do resultado final', () => {
    const done = comparisonRunReducer(initialRunState, {
      type: 'finished',
      outcome: { status: 'failed', error: { code: 'PROCESSING_FAILED' } },
    })
    expect(comparisonRunReducer(done, { type: 'progressed', stage: 'comparing' })).toBe(done)
  })

  it('recomeça ao receber "started"', () => {
    const done = comparisonRunReducer(initialRunState, {
      type: 'finished',
      outcome: { status: 'completed', result: demoComparisonResult },
    })
    expect(comparisonRunReducer(done, { type: 'started' })).toEqual({ phase: 'preparing' })
  })
})

describe('dados demonstrativos', () => {
  it('têm resumo coerente com a lista de diferenças', () => {
    expect(demoComparisonResult.summary).toEqual(summarize(demoComparisonResult.differences))
    expect(demoComparisonResult.isDemonstration).toBe(true)
  })
})
