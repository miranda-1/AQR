import { useMemo } from 'react'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { cn } from '@/lib/utils'
import type { DifferenceFilter } from '../hooks/use-difference-navigation'
import { differenceKindMeta, differenceKinds } from '../model/difference-kinds'
import type { Difference, DifferenceKind } from '../model/types'

interface SummaryFilterProps {
  /** Diferenças do modo e da categoria escolhidos (base dos contadores). */
  differences: readonly Difference[]
  filter: DifferenceFilter
  onFilterChange: (filter: DifferenceFilter) => void
  /** Em telas estreitas, mantém os indicadores em uma linha com rolagem horizontal. */
  singleRow?: boolean
}

/**
 * Indicadores da comparação. Cada indicador também filtra a lista e os
 * destaques, e funciona como legenda (cor + ícone + rótulo).
 */
export function SummaryFilter({ differences, filter, onFilterChange, singleRow = false }: SummaryFilterProps) {
  const counts = useMemo(() => {
    const result: Record<DifferenceKind, number> = { addition: 0, deletion: 0, modification: 0, move: 0 }
    for (const difference of differences) result[difference.kind] += 1
    return result
  }, [differences])
  const itemClass =
    'h-auto min-h-10 justify-start gap-2 rounded-md border border-line bg-white px-3 py-1 text-left text-ink data-[state=on]:border-brand data-[state=on]:bg-brand-50 data-[state=on]:text-ink data-[state=on]:hover:bg-brand-50 data-[state=on]:shadow-[inset_0_0_0_1px_var(--brand-blue)]'

  return (
    <ToggleGroup
      type="single"
      value={filter}
      onValueChange={(value) => {
        if (value) onFilterChange(value as DifferenceFilter)
      }}
      aria-label="Filtrar diferenças por tipo"
      className={cn('flex gap-2 shadow-none', singleRow ? '-mx-4 w-[calc(100%+2rem)] flex-nowrap overflow-x-auto px-4 py-0.5' : 'flex-wrap')}
      spacing={2}
    >
      <ToggleGroupItem value="all" className={itemClass}>
        <span className="tabular text-lg font-extrabold">{differences.length}</span>
        <span className="text-sm font-semibold">{differences.length === 1 ? 'alteração' : 'alterações'}</span>
      </ToggleGroupItem>
      {differenceKinds
        .filter((kind) => kind !== 'move' || counts.move > 0 || filter === 'move')
        .map((kind) => {
          const meta = differenceKindMeta[kind]
          const count = counts[kind]
          return (
            <ToggleGroupItem key={kind} value={kind} className={itemClass}>
              <span className={cn('flex size-6 items-center justify-center rounded-sm border', meta.badgeClass)}>
                <meta.icon aria-hidden className="size-4" strokeWidth={2.5} />
              </span>
              <span className="tabular text-lg font-extrabold">{count}</span>
              <span className="text-sm font-semibold">{count === 1 ? meta.label : meta.pluralLabel}</span>
            </ToggleGroupItem>
          )
        })}
    </ToggleGroup>
  )
}
