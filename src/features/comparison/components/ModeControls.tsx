import { useId, useMemo } from 'react'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { cn } from '@/lib/utils'
import type { CategoryFilter } from '../hooks/use-difference-navigation'
import { categoryOptions, isCategoryFilter } from '../model/categories'
import { comparisonModes, type ComparisonMode } from '../model/modes'
import type { Difference } from '../model/types'

/** Completo, Conteúdo ou Visual. */
export function ComparisonModeSwitch({
  value,
  onChange,
  className,
  size = 'default',
}: {
  value: ComparisonMode
  onChange: (mode: ComparisonMode) => void
  className?: string
  size?: 'sm' | 'default'
}) {
  return (
    <ToggleGroup
      type="single"
      variant="outline"
      size={size}
      value={value}
      onValueChange={(next) => {
        if (next) onChange(next as ComparisonMode)
      }}
      aria-label="Modo de comparação"
      className={className}
    >
      {comparisonModes.map((mode) => (
        <ToggleGroupItem key={mode.value} value={mode.value} title={mode.description} className={cn('flex-1', size === 'sm' && 'h-8 min-w-0 px-2')}>
          {mode.label}
          <span className="sr-only">: {mode.description}</span>
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}

/** Filtro por categoria (texto, imagens, elementos visuais, estrutura, formatação, para conferir). */
export function CategorySelect({
  value,
  onChange,
  differences,
  className,
  compact = false,
}: {
  value: CategoryFilter
  onChange: (category: CategoryFilter) => void
  /** Diferenças do modo atual, para mostrar quantas há em cada categoria. */
  differences: readonly Difference[]
  className?: string
  /** Barra única: rótulo só para leitores de tela e caixa mais estreita. */
  compact?: boolean
}) {
  const id = useId()
  const counts = useMemo(() => {
    const result = new Map<CategoryFilter, number>([['all', differences.length]])
    for (const difference of differences) {
      result.set(difference.category, (result.get(difference.category) ?? 0) + 1)
      if (difference.evidence === 'needs-review') result.set('needs-review', (result.get('needs-review') ?? 0) + 1)
    }
    return result
  }, [differences])

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <label htmlFor={id} className={cn('text-sm font-semibold whitespace-nowrap text-ink', compact && 'sr-only')}>
        Categoria
      </label>
      <select
        id={id}
        value={value}
        onChange={(event) => {
          if (isCategoryFilter(event.target.value)) onChange(event.target.value)
        }}
        className={cn(
          'min-w-0 flex-1 rounded-md border border-line-strong bg-white px-2 text-sm text-ink focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brand',
          compact ? 'h-8 max-w-44' : 'h-10',
        )}
      >
        {categoryOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {`${option.label} (${counts.get(option.value) ?? 0})`}
          </option>
        ))}
      </select>
    </div>
  )
}
