import { useCallback, useMemo, useState } from 'react'
import { inMode, type ComparisonMode } from '../model/modes'
import type { Difference, DifferenceCategory, DifferenceKind } from '../model/types'

export type DifferenceFilter = DifferenceKind | 'all'
/** Categoria escolhida, ou só as diferenças que pedem conferência. */
export type CategoryFilter = DifferenceCategory | 'needs-review' | 'all'

function matchesCategory(difference: Difference, category: CategoryFilter): boolean {
  if (category === 'all') return true
  if (category === 'needs-review') return difference.evidence === 'needs-review'
  return difference.category === category
}

/**
 * Navegação entre diferenças: modo de comparação, filtros por tipo e por categoria, seleção,
 * anterior e próxima. Não dá a volta ao chegar nas pontas, para o usuário saber que terminou.
 */
export function useDifferenceNavigation(differences: readonly Difference[]) {
  const [mode, setModeState] = useState<ComparisonMode>('complete')
  const [filter, setFilterState] = useState<DifferenceFilter>('all')
  const [category, setCategoryState] = useState<CategoryFilter>('all')
  const [selectedId, setSelectedId] = useState<string | null>(differences[0]?.id ?? null)

  /** Diferenças do modo atual (base dos contadores). */
  const inCurrentMode = useMemo(() => differences.filter((difference) => inMode(difference, mode)), [differences, mode])

  const filterFor = useCallback(
    (nextMode: ComparisonMode, nextKind: DifferenceFilter, nextCategory: CategoryFilter) =>
      differences.filter(
        (difference) =>
          inMode(difference, nextMode) &&
          (nextKind === 'all' || difference.kind === nextKind) &&
          matchesCategory(difference, nextCategory),
      ),
    [differences],
  )

  const visible = useMemo(() => filterFor(mode, filter, category), [filterFor, mode, filter, category])
  /** Modo e categoria, sem o filtro de tipo (base dos contadores por tipo). */
  const categoryScoped = useMemo(() => filterFor(mode, 'all', category), [filterFor, mode, category])

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

  /** Ao trocar um filtro, mantém a seleção se ela continuar visível; senão, vai para a primeira. */
  const keepSelection = useCallback(
    (nextVisible: readonly Difference[]) => {
      if (!nextVisible.some((difference) => difference.id === selectedId)) setSelectedId(nextVisible[0]?.id ?? null)
    },
    [selectedId],
  )

  const setFilter = useCallback(
    (next: DifferenceFilter) => {
      setFilterState(next)
      keepSelection(filterFor(mode, next, category))
    },
    [filterFor, keepSelection, mode, category],
  )

  const setCategory = useCallback(
    (next: CategoryFilter) => {
      setCategoryState(next)
      keepSelection(filterFor(mode, filter, next))
    },
    [filterFor, keepSelection, mode, filter],
  )

  const setMode = useCallback(
    (next: ComparisonMode) => {
      setModeState(next)
      keepSelection(filterFor(next, filter, category))
    },
    [filterFor, keepSelection, filter, category],
  )

  return {
    mode,
    setMode,
    filter,
    setFilter,
    category,
    setCategory,
    inCurrentMode,
    categoryScoped,
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
