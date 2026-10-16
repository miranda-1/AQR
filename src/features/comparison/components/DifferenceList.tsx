import { CircleAlert } from 'lucide-react'
import { cn } from '@/lib/utils'
import { categoryIcons } from '../model/categories'
import { categoryLabels, describeDifference, evidenceLabels, methodsText, pageSpan } from '../model/describe'
import { differenceKindMeta } from '../model/difference-kinds'
import type { Difference, DifferenceSide } from '../model/types'

interface DifferenceListProps {
  differences: readonly Difference[]
  activeId: string | null
  numbers: ReadonlyMap<string, number>
  onSelect: (id: string) => void
  /** Texto quando o filtro não deixa nenhuma diferença. */
  emptyMessage?: string
}

function sideContent(side: DifferenceSide): string {
  if (side.text && side.detail) return `${side.detail}: ${side.text}`
  return side.text || side.detail || ''
}

function Excerpt({ difference }: { difference: Difference }) {
  const clamp = 'block line-clamp-3 rounded-[3px] px-1 py-0.5'
  const original = difference.original ? sideContent(difference.original) : ''
  const updated = difference.updated ? sideContent(difference.updated) : ''
  if (!original && !updated) return null
  const isText = difference.category === 'text' || difference.category === 'structure'
  return (
    <span className={cn('mt-1.5 block space-y-1 text-[0.9375rem] leading-snug text-ink', isText && 'font-document')}>
      {original && (
        <span className={cn(clamp, difference.kind === 'deletion' ? 'bg-deletion-bg line-through decoration-deletion' : 'bg-surface-sunken')}>
          <span className="font-sans text-xs font-bold text-muted-foreground">Original: </span>
          {original}
        </span>
      )}
      {updated && (
        <span className={cn(clamp, difference.kind === 'addition' ? 'bg-addition-bg' : difference.kind === 'move' ? 'bg-move-bg' : 'bg-modification-bg')}>
          <span className="font-sans text-xs font-bold text-muted-foreground">Atualizado: </span>
          {updated}
        </span>
      )}
    </span>
  )
}

export function DifferenceList({ differences, activeId, numbers, onSelect, emptyMessage = 'Nenhuma diferença deste tipo.' }: DifferenceListProps) {
  if (differences.length === 0) {
    return <p className="px-4 py-6 text-[0.9375rem] text-muted-foreground">{emptyMessage}</p>
  }

  return (
    <ol className="space-y-1 p-2" aria-label="Diferenças encontradas">
      {differences.map((difference) => {
        const meta = differenceKindMeta[difference.kind]
        const CategoryIcon = categoryIcons[difference.category]
        const active = difference.id === activeId
        const review = difference.evidence === 'needs-review'
        return (
          <li key={difference.id}>
            <button
              type="button"
              onClick={() => onSelect(difference.id)}
              aria-current={active ? 'true' : undefined}
              data-list-diff-id={difference.id}
              className={cn(
                'relative block w-full overflow-hidden rounded-md px-3 py-2.5 text-left transition-colors hover:bg-brand-50 focus-visible:-outline-offset-2',
                active && 'bg-brand-50',
              )}
            >
              {active && <span aria-hidden className="absolute inset-y-0 left-0 w-1 bg-brand" />}
              <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className={cn('inline-flex items-center gap-1 rounded-sm border px-1.5 py-0.5 text-xs font-bold', meta.badgeClass)}>
                  <meta.icon aria-hidden className="size-3.5" strokeWidth={2.5} />
                  {meta.label}
                </span>
                <span className="inline-flex items-center gap-1 rounded-sm bg-surface-sunken px-1.5 py-0.5 text-xs font-semibold text-ink">
                  <CategoryIcon aria-hidden className="size-3.5" />
                  {categoryLabels[difference.category].label}
                </span>
                {review && (
                  <span className="inline-flex items-center gap-1 rounded-sm bg-warning-bg px-1.5 py-0.5 text-xs font-bold text-warning">
                    <CircleAlert aria-hidden className="size-3.5" />
                    {evidenceLabels['needs-review'].label}
                  </span>
                )}
                <span className="tabular text-sm font-semibold text-ink">{numbers.get(difference.id)}</span>
                <span className="tabular ml-auto text-sm text-muted-foreground">{pageSpan(difference)}</span>
              </span>
              <span className="mt-1 block text-sm font-semibold text-ink">{describeDifference(difference)}</span>
              <span className="block text-sm font-medium text-muted-foreground">{difference.context}</span>
              <Excerpt difference={difference} />
              <span className="mt-1 block text-xs text-muted-foreground">
                {evidenceLabels[difference.evidence].label} por {methodsText(difference.methods)}.
                {difference.notes && difference.notes.length > 0 && <> {difference.notes.join(' ')}</>}
              </span>
            </button>
          </li>
        )
      })}
    </ol>
  )
}
