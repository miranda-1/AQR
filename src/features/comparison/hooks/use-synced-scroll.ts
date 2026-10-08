import { useCallback, useRef, type RefObject, type UIEvent } from 'react'

/**
 * Sincroniza a rolagem vertical de dois painéis de forma proporcional.
 * Ignora o evento de "eco" gerado no painel que foi movido programaticamente.
 */
export function useSyncedScroll(
  first: RefObject<HTMLDivElement | null>,
  second: RefObject<HTMLDivElement | null>,
  enabled: boolean,
) {
  const echo = useRef<HTMLElement | null>(null)
  const paused = useRef(false)

  const sync = useCallback(
    (source: HTMLElement, target: HTMLElement | null) => {
      if (!enabled || !target || paused.current) return
      if (echo.current === source) {
        echo.current = null
        return
      }
      const sourceRange = source.scrollHeight - source.clientHeight
      const ratio = sourceRange > 0 ? source.scrollTop / sourceRange : 0
      const targetTop = ratio * (target.scrollHeight - target.clientHeight)
      if (Math.abs(target.scrollTop - targetTop) < 1) return
      echo.current = target
      target.scrollTop = targetTop
    },
    [enabled],
  )

  const onFirstScroll = useCallback(
    (event: UIEvent<HTMLDivElement>) => sync(event.currentTarget, second.current),
    [sync, second],
  )
  const onSecondScroll = useCallback(
    (event: UIEvent<HTMLDivElement>) => sync(event.currentTarget, first.current),
    [sync, first],
  )

  /** Suspende a sincronização enquanto os dois painéis rolam até uma diferença. */
  const pauseWhile = useCallback((durationMs: number) => {
    paused.current = true
    window.setTimeout(() => {
      paused.current = false
      echo.current = null
    }, durationMs)
  }, [])

  return { onFirstScroll, onSecondScroll, pauseWhile }
}
