import type { ComparisonResult } from '../../../shared/contracts/comparison.ts'
import { compareDocuments } from '../compare-documents.ts'
import { ComparisonFailure } from '../failure.ts'
import { defaultComparisonLimits, type ComparisonLimits } from '../limits.ts'
import { evaluateResult, isClean, type CaseOutcome, type CorpusCase } from './evaluate.ts'

export interface CaseReport {
  id: string
  title: string
  group: CorpusCase['group']
  ms: number
  /** Resultado da conferência (erro de entrada esperado, análise, gabarito). */
  outcome: CaseOutcome
  problems: string[]
  status: string
  result?: ComparisonResult
}

/** Roda um caso do corpus contra o comparador real e confere com o gabarito. */
export async function runCase(item: CorpusCase, limits: ComparisonLimits = defaultComparisonLimits): Promise<CaseReport> {
  const built = await item.build()
  const problems: string[] = []
  const started = performance.now()
  let result: ComparisonResult | undefined
  try {
    result = await compareDocuments(
      { original: { fileName: `${item.id}-original.pdf`, bytes: built.original }, updated: { fileName: `${item.id}-atualizado.pdf`, bytes: built.updated } },
      { limits },
    )
  } catch (error) {
    if (!(error instanceof ComparisonFailure)) throw error
    const got = error.toComparisonError()
    if (!item.expectFailure) problems.push(`falhou sem esperar: ${got.code} (${got.document ?? '-'})`)
    else if (got.code !== item.expectFailure.code || got.document !== item.expectFailure.document) {
      problems.push(`erro ${got.code}/${got.document ?? '-'}, esperava ${item.expectFailure.code}/${item.expectFailure.document ?? '-'}`)
    }
  }
  const ms = Math.round(performance.now() - started)
  const empty: CaseOutcome = { found: [], missed: [], misclassified: [], mislocated: [], falsePositives: [], tolerated: 0 }
  if (!result) {
    return { id: item.id, title: item.title, group: item.group, ms, outcome: empty, problems, status: 'falha esperada' }
  }
  if (item.expectFailure) problems.push(`esperava falha ${item.expectFailure.code}, mas a comparação terminou`)
  const outcome = evaluateResult(result, built.expected, item.tolerated)
  const analysisProblem = item.checkAnalysis?.(result.analysis)
  if (analysisProblem) problems.push(analysisProblem)
  if (!isClean(outcome)) {
    if (outcome.missed.length) problems.push(`omitidas: ${outcome.missed.join('; ')}`)
    for (const item_ of outcome.misclassified) problems.push(`classificação errada: ${item_.label} (veio ${item_.got})`)
    if (outcome.mislocated.length) problems.push(`localização fora da tolerância: ${outcome.mislocated.join('; ')}`)
    if (outcome.falsePositives.length) problems.push(`falsas diferenças: ${outcome.falsePositives.join('; ')}`)
  }
  return { id: item.id, title: item.title, group: item.group, ms, outcome, problems, status: result.analysis.status, result }
}
