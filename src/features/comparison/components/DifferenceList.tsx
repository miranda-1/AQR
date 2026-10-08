import { cn } from '@/lib/utils'
import { differenceKindMeta } from '../model/difference-kinds'
import type { Difference } from '../model/types'

interface DifferenceListProps {
  differences: readonly Difference[]
  activeId: string | null
  numbers: ReadonlyMap<string, number>
  onSelect: (id: string) => void
}

function pageLabel(difference: Difference): string {
  const original = difference.original?.location.pageNumber
  const updated = difference.updated?.location.pageNumber
  if (original && updated && original !== updated) return `p. ${original} → p. ${updated}`
  return `p. ${original ?? updated}`
}

function Excerpt({ difference }: { difference: Difference }) {
  const clamp = 'block line-clamp-3 rounded-[3px] px-1 py-0.5'
  return (
    <span className="mt-1.5 block space-y-1 font-document text-[0.9375rem] leading-snug text-ink">
      {difference.original && (
        <span className={cn(clamp, difference.kind === 'deletion' ? 'bg-deletion-bg line-through decoration-deletion' : 'bg-surface-sunken')}>
          <span className="sr-only">Texto original: </span>
          {difference.original.text}
        </span>
      )}
      {difference.updated && (
        <span className={cn(clamp, difference.kind === 'addition' ? 'bg-addition-bg' : 'bg-modification-bg')}>
          <span className="sr-only">Texto atualizado: </span>
          {difference.updated.text}
        </span>
      )}
    </span>
  )
}

export function DifferenceList({ differences, activeId, numbers, onSelect }: DifferenceListProps) {
  if (differences.length === 0) {
    return <p className="px-4 py-6 text-[0.9375rem] text-muted-foreground">Nenhuma diferença deste tipo.</p>
  }

  return (
    <ol className="space-y-1 p-2" aria-label="Diferenças encontradas">
      {differences.map((difference) => {
        const meta = differenceKindMeta[difference.kind]
        const active = difference.id === activeId
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
              <span className="flex items-center gap-2">
                <span
                  className={cn(
                    'inline-flex items-center gap-1 rounded-sm border px-1.5 py-0.5 text-xs font-bold',
                    meta.badgeClass,
                  )}
                >
                  <meta.icon aria-hidden className="size-3.5" strokeWidth={2.5} />
                  {meta.label}
                </span>
                <span className="tabular text-sm font-semibold text-ink">{numbers.get(difference.id)}</span>
                <span className="tabular ml-auto text-sm text-muted-foreground">{pageLabel(difference)}</span>
              </span>
              <span className="mt-1 block text-sm font-medium text-muted-foreground">{difference.context}</span>
              <Excerpt difference={difference} />
            </button>
          </li>
        )
      })}
    </ol>
  )
}
