import { List, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { useMediaQuery, usePrefersReducedMotion } from '@/hooks/use-media-query'
import { cn } from '@/lib/utils'
import { useDifferenceNavigation } from '../hooks/use-difference-navigation'
import { useSyncedScroll } from '../hooks/use-synced-scroll'
import { differenceKindMeta, differenceKinds } from '../model/difference-kinds'
import type { ComparisonResult, DocumentRole } from '../model/types'
import { DocumentPane } from '../viewer/DocumentPane'
import type { DocumentSource } from '../viewer/document-source'
import { DifferenceList } from './DifferenceList'
import { SummaryFilter } from './SummaryFilter'
import { DifferenceStepper, SyncScrollToggle, ViewModeSwitch, ZoomControls, type ViewMode } from './ViewerControls'

interface ComparisonWorkspaceProps {
  result: ComparisonResult
  documents: Record<DocumentRole, DocumentSource>
}

/** Rola um painel até o trecho da diferença, deixando-o no terço superior. */
function scrollToDifference(container: HTMLElement | null, id: string, smooth: boolean) {
  const target = container?.querySelector<HTMLElement>(`[data-diff-id="${CSS.escape(id)}"]`)
  if (!container || !target) return
  const offset = target.getBoundingClientRect().top - container.getBoundingClientRect().top
  container.scrollTo({ top: container.scrollTop + offset - container.clientHeight / 3, behavior: smooth ? 'smooth' : 'auto' })
}

function Legend() {
  return (
    <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
      <span className="sr-only">Legenda dos destaques:</span>
      {differenceKinds.map((kind) => (
        <span key={kind} className={cn(differenceKindMeta[kind].markClass, 'cursor-default font-document text-ink')}>
          {differenceKindMeta[kind].label}
        </span>
      ))}
    </p>
  )
}

export function ComparisonWorkspace({ result, documents }: ComparisonWorkspaceProps) {
  const isWide = useMediaQuery('(min-width: 1280px)')
  const canSideBySide = useMediaQuery('(min-width: 1024px)')
  const isCompact = !useMediaQuery('(min-width: 768px)')
  const reducedMotion = usePrefersReducedMotion()

  const navigation = useDifferenceNavigation(result.differences)
  const [preferredMode, setPreferredMode] = useState<ViewMode>('side-by-side')
  const [syncScroll, setSyncScroll] = useState(true)
  const [zoom, setZoom] = useState(1)
  const [listCollapsed, setListCollapsed] = useState(false)
  const [listSheetOpen, setListSheetOpen] = useState(false)

  const viewMode: ViewMode = !canSideBySide && preferredMode === 'side-by-side' ? 'updated' : preferredMode
  const listDocked = isWide && !listCollapsed

  const originalRef = useRef<HTMLDivElement>(null)
  const updatedRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const synced = useSyncedScroll(originalRef, updatedRef, syncScroll && viewMode === 'side-by-side')

  const numbers = useMemo(
    () => new Map(result.differences.map((difference, index) => [difference.id, index + 1])),
    [result.differences],
  )
  const visibleIds = useMemo(() => new Set(navigation.visible.map((difference) => difference.id)), [navigation.visible])
  const activeId = navigation.active?.id ?? null

  // Ao mudar a diferença ativa, leva os dois documentos (e a lista) até ela.
  useEffect(() => {
    if (!activeId) return
    synced.pauseWhile(reducedMotion ? 50 : 600)
    const frame = requestAnimationFrame(() => {
      scrollToDifference(originalRef.current, activeId, !reducedMotion)
      scrollToDifference(updatedRef.current, activeId, !reducedMotion)
      listRef.current
        ?.querySelector(`[data-list-diff-id="${CSS.escape(activeId)}"]`)
        ?.scrollIntoView({ block: 'nearest', behavior: reducedMotion ? 'auto' : 'smooth' })
    })
    return () => cancelAnimationFrame(frame)
  }, [activeId, viewMode, zoom, reducedMotion, synced])

  // Atalhos: Alt + ↓ (próxima) e Alt + ↑ (anterior).
  const { next, previous } = navigation
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (!event.altKey || event.ctrlKey || event.metaKey) return
      if (event.key === 'ArrowDown') {
        event.preventDefault()
        next()
      } else if (event.key === 'ArrowUp') {
        event.preventDefault()
        previous()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [next, previous])

  function selectFromList(id: string) {
    navigation.select(id)
    setListSheetOpen(false)
  }

  const stepper = {
    position: navigation.activeIndex + 1,
    total: navigation.visible.length,
    hasPrevious: navigation.hasPrevious,
    hasNext: navigation.hasNext,
    onPrevious: navigation.previous,
    onNext: navigation.next,
  }

  const paneProps = { activeId, numbers, visibleIds, onSelect: navigation.select }
  const showOriginal = viewMode !== 'updated'
  const showUpdated = viewMode !== 'original'

  const list = (
    <DifferenceList
      differences={navigation.visible}
      activeId={activeId}
      numbers={numbers}
      onSelect={selectFromList}
    />
  )

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-x-6 gap-y-2 bg-white px-4 pt-1 pb-3 shadow-surface lg:px-6">
        <SummaryFilter
          summary={result.summary}
          filter={navigation.filter}
          onFilterChange={navigation.setFilter}
          singleRow={isCompact}
        />
        {!isCompact && <DifferenceStepper {...stepper} />}
      </div>

      <div className={cn('flex min-h-0 flex-1 bg-canvas', isCompact ? 'gap-2 p-2' : 'gap-3 p-3')}>
        {listDocked && (
          <aside aria-labelledby="lista-diferencas-titulo" className="flex w-[22rem] shrink-0 flex-col overflow-hidden rounded-lg bg-white shadow-surface">
            <div className="flex min-h-12 items-center justify-between gap-2 pt-1 pr-2 pl-4">
              <h2 id="lista-diferencas-titulo" className="text-base font-bold text-ink">
                Diferenças <span className="tabular font-semibold text-muted-foreground">({navigation.visible.length})</span>
              </h2>
              <Button variant="ghost" size="sm" onClick={() => setListCollapsed(true)}>
                <PanelLeftClose aria-hidden />
                Ocultar lista
              </Button>
            </div>
            <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto">
              {list}
            </div>
          </aside>
        )}

        <div className="flex min-w-0 flex-1 flex-col" style={{ '--zoom': zoom } as CSSProperties}>
          <div
            className={cn(
              'flex items-center gap-x-3 gap-y-2 pb-3',
              isCompact ? 'flex-nowrap' : 'flex-wrap',
            )}
          >
            {!listDocked && (
              <Button
                variant="outline"
                onClick={() => (isWide ? setListCollapsed(false) : setListSheetOpen(true))}
                className={cn(isCompact && 'hidden')}
              >
                {isWide ? <PanelLeftOpen aria-hidden /> : <List aria-hidden />}
                {isWide ? 'Mostrar lista' : 'Diferenças'}
                <span className="tabular text-muted-foreground">({navigation.visible.length})</span>
              </Button>
            )}
            <ViewModeSwitch
              value={viewMode}
              onChange={setPreferredMode}
              allowSideBySide={canSideBySide}
              className={cn(isCompact && 'min-w-0 flex-1')}
            />
            {viewMode === 'side-by-side' && <SyncScrollToggle pressed={syncScroll} onChange={setSyncScroll} />}
            <ZoomControls zoom={zoom} onChange={setZoom} />
            {!isCompact && (
              <div className="ml-auto">
                <Legend />
              </div>
            )}
          </div>

          <div className={cn('grid min-h-0 flex-1', viewMode === 'side-by-side' ? 'grid-cols-2 gap-3' : 'grid-cols-1')}>
            {showOriginal && (
              <DocumentPane
                summary={result.documents.original}
                source={documents.original}
                scrollRef={originalRef}
                onScroll={synced.onFirstScroll}
                {...paneProps}
              />
            )}
            {showUpdated && (
              <DocumentPane
                summary={result.documents.updated}
                source={documents.updated}
                scrollRef={updatedRef}
                onScroll={synced.onSecondScroll}
                {...paneProps}
              />
            )}
          </div>

        </div>
      </div>

      {isCompact && (
        <div className="flex items-center justify-between gap-2 bg-white px-3 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-[0_-2px_8px_-2px_rgba(27,32,64,0.12)]">
          <Button variant="outline" onClick={() => setListSheetOpen(true)} className="px-3">
            <List aria-hidden />
            Lista
          </Button>
          <DifferenceStepper {...stepper} compact />
        </div>
      )}

      {!isWide && (
        <Sheet open={listSheetOpen} onOpenChange={setListSheetOpen}>
          <SheetContent
            side={isCompact ? 'bottom' : 'left'}
            className={cn('gap-0 p-0', isCompact ? 'max-h-[80dvh]' : 'w-[min(24rem,90vw)] sm:max-w-none')}
          >
            <SheetHeader className="px-4 pt-3 pb-1 pr-14">
              <SheetTitle className="text-base">Diferenças ({navigation.visible.length})</SheetTitle>
              <SheetDescription className="text-sm">Selecione uma diferença para localizá-la nos documentos.</SheetDescription>
            </SheetHeader>
            <div className="min-h-0 flex-1 overflow-y-auto">{list}</div>
          </SheetContent>
        </Sheet>
      )}
    </div>
  )
}
