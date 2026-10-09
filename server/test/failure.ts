import { ComparisonFailure } from '../comparison/failure.ts'

/** Espera que a promessa falhe com `ComparisonFailure` e devolve o erro, para inspeção. */
export async function failureOf(promise: Promise<unknown>): Promise<ComparisonFailure> {
  const error = await promise.then(
    () => undefined,
    (reason: unknown) => reason,
  )
  if (!(error instanceof ComparisonFailure)) throw new Error(`Esperava ComparisonFailure, veio ${String(error)}`)
  return error
}
