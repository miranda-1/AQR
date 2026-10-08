import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { cn } from '@/lib/utils'
import type { DifferenceFilter } from '../hooks/use-difference-navigation'
import { differenceKindMeta, differenceKinds } from '../model/difference-kinds'
import type { ComparisonSummary, DifferenceKind } from '../model/types'

const countKey: Record<DifferenceKind, keyof ComparisonSummary> = {
  addition: 'additions',
  deletion: 'deletions',
  modification: 'modifications',
}

interface SummaryFilterProps {
  summary: ComparisonSummary
  filter: DifferenceFilter
  onFilterChange: (filter: DifferenceFilter) => void
  /** Em telas estreitas, mantém os indicadores em uma linha com rolagem horizontal. */
  singleRow?: boolean
}

/**
 * Indicadores da comparação. Cada indicador também filtra a lista e os
 * destaques, e funciona como legenda (cor + ícone + rótulo).
 */
export function SummaryFilter({ summary, filter, onFilterChange, singleRow = false }: SummaryFilterProps) {
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
        <span className="tabular text-lg font-extrabold">{summary.total}</span>
        <span className="text-sm font-semibold">{summary.total === 1 ? 'alteração' : 'alterações'}</span>
      </ToggleGroupItem>
      {differenceKinds.map((kind) => {
        const meta = differenceKindMeta[kind]
        const count = summary[countKey[kind]]
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
