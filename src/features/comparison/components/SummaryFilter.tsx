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
  /** Barra única: só ícone e número (o rótulo fica para leitores de tela e para a dica). */
  compact?: boolean
}

/**
 * Indicadores da comparação. Cada indicador também filtra a lista e os
 * destaques, e funciona como legenda (cor + ícone + rótulo).
 */
export function SummaryFilter({ differences, filter, onFilterChange, singleRow = false, compact = false }: SummaryFilterProps) {
  const counts = useMemo(() => {
    const result: Record<DifferenceKind, number> = { addition: 0, deletion: 0, modification: 0, move: 0 }
    for (const difference of differences) result[difference.kind] += 1
    return result
  }, [differences])
  const itemClass = compact
    ? 'h-8 min-h-8 justify-start gap-1 rounded-md border border-line bg-white px-1.5 text-ink data-[state=on]:border-brand data-[state=on]:bg-brand-50 data-[state=on]:text-ink data-[state=on]:hover:bg-brand-50 data-[state=on]:shadow-[inset_0_0_0_1px_var(--brand-blue)]'
    : 'h-auto min-h-10 justify-start gap-2 rounded-md border border-line bg-white px-3 py-1 text-left text-ink data-[state=on]:border-brand data-[state=on]:bg-brand-50 data-[state=on]:text-ink data-[state=on]:hover:bg-brand-50 data-[state=on]:shadow-[inset_0_0_0_1px_var(--brand-blue)]'

  return (
    <ToggleGroup
      type="single"
      value={filter}
      onValueChange={(value) => {
        if (value) onFilterChange(value as DifferenceFilter)
      }}
      aria-label="Filtrar diferenças por tipo"
      className={cn('flex shadow-none', compact ? 'shrink-0 flex-nowrap gap-1' : 'gap-2', !compact && (singleRow ? '-mx-4 w-[calc(100%+2rem)] flex-nowrap overflow-x-auto px-4 py-0.5' : 'flex-wrap'))}
      spacing={compact ? 1 : 2}
    >
      <ToggleGroupItem value="all" className={itemClass}>
        <span className={cn('tabular font-extrabold', compact ? 'text-base' : 'text-lg')}>{differences.length}</span>
        <span className={cn('text-sm font-semibold', compact && 'sr-only')}>{differences.length === 1 ? 'alteração' : 'alterações'}</span>
      </ToggleGroupItem>
      {differenceKinds
        .filter((kind) => kind !== 'move' || counts.move > 0 || filter === 'move')
        .map((kind) => {
          const meta = differenceKindMeta[kind]
          const count = counts[kind]
          return (
            <ToggleGroupItem key={kind} value={kind} className={itemClass} title={compact ? meta.pluralLabel : undefined}>
              <span className={cn('flex items-center justify-center rounded-sm border', compact ? 'size-5' : 'size-6', meta.badgeClass)}>
                <meta.icon aria-hidden className={compact ? 'size-3.5' : 'size-4'} strokeWidth={2.5} />
              </span>
              <span className={cn('tabular font-extrabold', compact ? 'text-base' : 'text-lg')}>{count}</span>
              <span className={cn('text-sm font-semibold', compact && 'sr-only')}>{count === 1 ? meta.label : meta.pluralLabel}</span>
            </ToggleGroupItem>
          )
        })}
    </ToggleGroup>
  )
}
