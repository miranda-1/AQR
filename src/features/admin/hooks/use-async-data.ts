import { useCallback, useEffect, useState } from 'react'
import { AccountServiceError } from '../model/types'

export type AsyncData<T> =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; data: T }

/** Mensagem para a pessoa, vinda do erro do serviço ou genérica. */
export function messageOf(error: unknown): string {
  return error instanceof AccountServiceError ? error.message : 'Não foi possível concluir a operação. Tente de novo em instantes.'
}

type Settled<T> = { token: string; outcome: Exclude<AsyncData<T>, { status: 'loading' }> }

/**
 * Carrega dados do serviço e recarrega quando `key` muda. Cancela a consulta anterior e ignora
 * respostas atrasadas. `reload` repete a consulta (botão "Tentar de novo"). O estado
 * "carregando" é derivado: vale enquanto o resultado guardado não for o da consulta atual.
 */
export function useAsyncData<T>(load: (signal: AbortSignal) => Promise<T>, key: string): AsyncData<T> & { reload: () => void } {
  const [settled, setSettled] = useState<Settled<T> | null>(null)
  const [attempt, setAttempt] = useState(0)
  const token = `${key}#${attempt}`

  useEffect(() => {
    const controller = new AbortController()
    load(controller.signal).then(
      (data) => {
        if (!controller.signal.aborted) setSettled({ token, outcome: { status: 'ready', data } })
      },
      (error: unknown) => {
        if (!controller.signal.aborted) setSettled({ token, outcome: { status: 'error', message: messageOf(error) } })
      },
    )
    return () => controller.abort()
    // `load` muda a cada renderização; a consulta só deve repetir quando a chave muda.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  const reload = useCallback(() => setAttempt((value) => value + 1), [])
  const current: AsyncData<T> = settled?.token === token ? settled.outcome : { status: 'loading' }
  return { ...current, reload }
}
