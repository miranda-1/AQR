import { cn } from '@/lib/utils'
import type { DocumentRole } from '../model/types'
import { DiffMark, DiffPlaceholder } from './DiffMark'
import type { SimulatedBlock, SimulatedPage } from './simulated-document'

interface SimulatedPageViewProps {
  page: SimulatedPage
  pageCount: number
  role: DocumentRole
  activeId: string | null
  /** Número de cada diferença na lista completa. */
  numbers: ReadonlyMap<string, number>
  /** Diferenças ocultas pelo filtro aparecem sem destaque. */
  visibleIds: ReadonlySet<string>
  onSelect: (id: string) => void
}

const blockClass: Record<SimulatedBlock['type'], string> = {
  title: 'mb-[0.4em] text-center text-[1.35em] font-bold leading-tight',
  heading: 'mt-[1.4em] mb-[0.5em] font-bold',
  paragraph: 'mb-[0.8em]',
  item: 'mb-[0.35em] pl-[1.5em]',
  signature: 'mt-[1.6em] text-center',
}

export function SimulatedPageView({
  page,
  pageCount,
  role,
  activeId,
  numbers,
  visibleIds,
  onSelect,
}: SimulatedPageViewProps) {
  return (
    <article
      data-page-number={page.pageNumber}
      aria-label={`Página ${page.pageNumber} de ${pageCount}`}
      className="relative mx-auto flex w-[calc(min(100cqw-2rem,46rem)*var(--zoom))] min-w-[16rem] flex-col bg-white px-[8%] pt-[7%] pb-[5%] font-document text-[calc(15px*var(--zoom))] leading-[1.55] text-[#111] shadow-[0_1px_2px_rgba(27,32,64,0.12),0_0_0_1px_rgba(27,32,64,0.06)]"
      style={{ minHeight: 'calc(min(100cqw - 2rem, 46rem) * var(--zoom) * 1.3)' }}
    >
      <p className="absolute top-[2.5%] right-[4%] font-sans text-[0.7em] font-semibold text-subtle">
        Documento fictício
      </p>
      <div className="flex-1">
        {page.blocks.map((block, blockIndex) => (
          <p key={blockIndex} className={cn(blockClass[block.type])}>
            {block.segments.map((segment, segmentIndex) => {
              if (typeof segment === 'string') return <span key={segmentIndex}>{segment}</span>
              const number = numbers.get(segment.diffId) ?? 0
              if (!visibleIds.has(segment.diffId)) {
                return 'placeholder' in segment ? null : <span key={segmentIndex}>{segment.text}</span>
              }
              const common = {
                diffId: segment.diffId,
                kind: segment.kind,
                number,
                active: activeId === segment.diffId,
                onSelect,
              }
              return 'placeholder' in segment ? (
                <DiffPlaceholder key={segmentIndex} {...common} role={role} />
              ) : (
                <DiffMark key={segmentIndex} {...common}>
                  {segment.text}
                </DiffMark>
              )
            })}
          </p>
        ))}
      </div>
      <p className="mt-[2em] text-center font-sans text-[0.75em] text-subtle">
        {page.pageNumber} / {pageCount}
      </p>
    </article>
  )
}
