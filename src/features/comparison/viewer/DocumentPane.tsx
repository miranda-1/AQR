import { useCallback, useState, type Ref, type UIEvent } from 'react'
import { cn } from '@/lib/utils'
import type { DocumentRole, DocumentSummary } from '../model/types'
import type { DocumentSource } from './document-source'
import { SimulatedPageView } from './SimulatedPageView'

export const roleLabels: Record<DocumentRole, string> = {
  original: 'Original',
  updated: 'Atualizado',
}

interface DocumentPaneProps {
  summary: DocumentSummary
  source: DocumentSource
  activeId: string | null
  numbers: ReadonlyMap<string, number>
  visibleIds: ReadonlySet<string>
  onSelect: (id: string) => void
  scrollRef: Ref<HTMLDivElement>
  onScroll?: (event: UIEvent<HTMLDivElement>) => void
  className?: string
}

/** Página que ocupa a faixa superior (30%) da área visível. */
function currentPageOf(container: HTMLElement): number {
  const pages = container.querySelectorAll<HTMLElement>('[data-page-number]')
  const threshold = container.scrollTop + container.clientHeight * 0.3
  let current = 1
  for (const page of pages) {
    if (page.offsetTop <= threshold) current = Number(page.dataset.pageNumber)
  }
  return current
}

export function DocumentPane({
  summary,
  source,
  activeId,
  numbers,
  visibleIds,
  onSelect,
  scrollRef,
  onScroll,
  className,
}: DocumentPaneProps) {
  const [currentPage, setCurrentPage] = useState(1)
  const label = roleLabels[summary.role]

  const handleScroll = useCallback(
    (event: UIEvent<HTMLDivElement>) => {
      setCurrentPage(currentPageOf(event.currentTarget))
      onScroll?.(event)
    },
    [onScroll],
  )

  return (
    <section
      aria-label={`Documento ${label.toLowerCase()}`}
      className={cn('flex min-h-0 min-w-0 flex-col overflow-hidden rounded-lg bg-white shadow-surface', className)}
    >
      <header className="flex min-h-11 items-center gap-2 bg-white px-3 py-1.5">
        <span
          className={cn(
            'shrink-0 rounded-sm px-1.5 py-0.5 text-xs font-bold',
            summary.role === 'original' ? 'bg-surface-sunken text-ink' : 'bg-brand text-white',
          )}
        >
          {label}
        </span>
        <span className="min-w-0 truncate text-sm font-medium text-ink" title={summary.fileName}>
          {summary.fileName}
        </span>
        <span className="tabular ml-auto shrink-0 text-sm text-muted-foreground">
          Página {currentPage} de {summary.pageCount}
        </span>
      </header>
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        // Região rolável precisa ser alcançável pelo teclado (WCAG 2.1.1).
        role="region"
        tabIndex={0}
        aria-label={`Páginas do documento ${label.toLowerCase()}`}
        className="relative min-h-0 flex-1 overflow-auto bg-surface-sunken [container-type:inline-size]"
      >
        <div className="flex flex-col items-center gap-4 px-4 py-4">
          {source.kind === 'simulated' ? (
            source.document.pages.map((page) => (
              <SimulatedPageView
                key={page.pageNumber}
                page={page}
                pageCount={summary.pageCount}
                role={summary.role}
                activeId={activeId}
                numbers={numbers}
                visibleIds={visibleIds}
                onSelect={onSelect}
              />
            ))
          ) : (
            <p className="max-w-md py-10 text-center text-[0.9375rem] text-muted-foreground">
              As páginas de {source.file.name} aparecerão aqui. Use a lista para ver o texto de cada diferença.
            </p>
          )}
        </div>
      </div>
    </section>
  )
}
