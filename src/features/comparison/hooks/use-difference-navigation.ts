import { useCallback, useMemo, useState } from 'react'
import type { Difference, DifferenceKind } from '../model/types'

export type DifferenceFilter = DifferenceKind | 'all'

/**
 * Navegação entre diferenças: filtro por tipo, seleção, anterior e próxima.
 * Não dá a volta ao chegar nas pontas, para o usuário saber que terminou.
 */
export function useDifferenceNavigation(differences: readonly Difference[]) {
  const [filter, setFilter] = useState<DifferenceFilter>('all')
  const [selectedId, setSelectedId] = useState<string | null>(differences[0]?.id ?? null)

  const visible = useMemo(
    () => (filter === 'all' ? differences : differences.filter((difference) => difference.kind === filter)),
    [differences, filter],
  )

  const activeIndex = visible.findIndex((difference) => difference.id === selectedId)
  const active = activeIndex >= 0 ? visible[activeIndex] : undefined

  const select = useCallback((id: string) => setSelectedId(id), [])

  const goTo = useCallback(
    (offset: 1 | -1) => {
      if (visible.length === 0) return
      const nextIndex = activeIndex < 0 ? 0 : Math.min(Math.max(activeIndex + offset, 0), visible.length - 1)
      setSelectedId(visible[nextIndex]?.id ?? null)
    },
    [activeIndex, visible],
  )

  const changeFilter = useCallback(
    (next: DifferenceFilter) => {
      setFilter(next)
      const nextVisible = next === 'all' ? differences : differences.filter((difference) => difference.kind === next)
      if (!nextVisible.some((difference) => difference.id === selectedId)) {
        setSelectedId(nextVisible[0]?.id ?? null)
      }
    },
    [differences, selectedId],
  )

  return {
    filter,
    setFilter: changeFilter,
    visible,
    active,
    activeIndex,
    select,
    next: useCallback(() => goTo(1), [goTo]),
    previous: useCallback(() => goTo(-1), [goTo]),
    hasNext: activeIndex < visible.length - 1,
    hasPrevious: activeIndex > 0,
  }
}
