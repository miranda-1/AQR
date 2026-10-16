import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, List, Maximize, PanelLeftClose, PanelLeftOpen, X } from 'lucide-react'
import { useEffect, useId, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '@/components/ui/button'
import { DropdownMenuLabel, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { useMediaQuery, usePrefersReducedMotion } from '@/hooks/use-media-query'
import { cn } from '@/lib/utils'
import { useDifferenceNavigation } from '../hooks/use-difference-navigation'
import { useSyncedScroll } from '../hooks/use-synced-scroll'
import { differenceKindMeta, differenceKinds } from '../model/difference-kinds'
import type { ComparisonResult, DocumentRole } from '../model/types'
import type { WorkspaceViewState } from '../session/comparison-session'
import { DocumentPane } from '../viewer/DocumentPane'
import type { DocumentSource } from '../viewer/document-source'
import { AnalysisPanel, AnalysisStatusButton } from './AnalysisSummary'
import { DifferenceList } from './DifferenceList'
import { CategorySelect, ComparisonModeSwitch } from './ModeControls'
import { SummaryFilter } from './SummaryFilter'
import { CompactStepper, DifferenceStepper, NumbersSwitch, ViewMenu, ZoomControls, type ViewMode } from './ViewerControls'
import { describeDifference } from '../model/describe'

interface ComparisonWorkspaceProps {
  result: ComparisonResult
  documents: Record<DocumentRole, DocumentSource>
  /** Como a pessoa deixou a tela da última vez (ao voltar de outra página). */
  initialView?: WorkspaceViewState
  /** Recebe o estado da tela a cada mudança, para ele sobreviver à troca de página. */
  onViewChange?: (view: WorkspaceViewState) => void
  /**
   * Ações do resultado (exportar, nova comparação). Com elas, a barra única ganha o título; sem elas
   * (modo demonstrativo, que tem cabeçalho próprio), a barra mostra só os controles.
   */
  actions?: ReactNode
}

const isViewMode = (value: unknown): value is ViewMode => value === 'side-by-side' || value === 'original' || value === 'updated'

/** Rola um painel até o trecho da diferença, deixando-o no terço superior. */
function scrollToDifference(container: HTMLElement | null, id: string, smooth: boolean) {
  const target = container?.querySelector<HTMLElement>(`[data-diff-id="${CSS.escape(id)}"]`)
  if (!container || !target) return
  const offset = target.getBoundingClientRect().top - container.getBoundingClientRect().top
  container.scrollTo({ top: container.scrollTop + offset - container.clientHeight / 3, behavior: smooth ? 'smooth' : 'auto' })
}

function Legend() {
  return (
    <div className="grid gap-2 px-2 pb-2 text-sm">
      <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="sr-only">Legenda dos destaques:</span>
        {differenceKinds.map((kind) => (
          <span key={kind} className={cn(differenceKindMeta[kind].markClass, 'cursor-default font-document text-ink')}>
            {differenceKindMeta[kind].label}
          </span>
        ))}
      </p>
      <p className="text-muted-foreground">
        Texto: fundo colorido. Imagens e elementos visuais: contorno tracejado. Páginas: moldura. Formatação: sublinhado pontilhado.
        Área hachurada: análise incompleta.
      </p>
    </div>
  )
}

export function ComparisonWorkspace({ result, documents, initialView = {}, onViewChange, actions }: ComparisonWorkspaceProps) {
  const isWide = useMediaQuery('(min-width: 1280px)')
  const canSideBySide = useMediaQuery('(min-width: 1024px)')
  const isCompact = !useMediaQuery('(min-width: 768px)')
  const reducedMotion = usePrefersReducedMotion()

  const navigation = useDifferenceNavigation(result.differences, initialView)
  const [preferredMode, setPreferredMode] = useState<ViewMode>(isViewMode(initialView.viewMode) ? initialView.viewMode : 'side-by-side')
  const [syncScroll, setSyncScroll] = useState(initialView.syncScroll ?? true)
  const [zoom, setZoom] = useState(initialView.zoom ?? 1)
  const [listCollapsed, setListCollapsed] = useState(initialView.listCollapsed ?? false)
  const [focus, setFocus] = useState(initialView.focus ?? false)
  const [numbersAlways, setNumbersAlways] = useState(initialView.numbersAlways ?? false)
  // Comparação parcial: os detalhes já começam abertos, para nenhuma limitação ficar escondida.
  const [detailsOpen, setDetailsOpen] = useState(result.analysis.status === 'partial')
  const detailsId = useId()
  const focusButtonRef = useRef<HTMLButtonElement>(null)
  const exitFocusRef = useRef<HTMLButtonElement>(null)

  // Guarda o estado da tela a cada mudança: ao voltar de outra página, tudo está onde ficou.
  const { mode, filter, category } = navigation
  const selectedId = navigation.active?.id ?? null
  useEffect(() => {
    onViewChange?.({ mode, filter, category, selectedId, viewMode: preferredMode, zoom, syncScroll, listCollapsed, focus, numbersAlways })
  }, [onViewChange, mode, filter, category, selectedId, preferredMode, zoom, syncScroll, listCollapsed, focus, numbersAlways])
  const [listSheetOpen, setListSheetOpen] = useState(false)

  const viewMode: ViewMode = !canSideBySide && preferredMode === 'side-by-side' ? 'updated' : preferredMode
  const listDocked = isWide && !listCollapsed && !focus

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

  // Modo foco: F liga e desliga, Esc sai. Não atrapalha quem está digitando ou com um menu aberto.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.altKey || event.ctrlKey || event.metaKey) return
      const target = event.target
      if (target instanceof HTMLElement && (target.isContentEditable || target.closest('input, textarea, select, [role="menu"], [role="dialog"]'))) return
      if (event.key === 'f' || event.key === 'F') {
        event.preventDefault()
        setFocus((value) => !value)
      } else if (event.key === 'Escape' && focus) {
        setFocus(false)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [focus])

  // O foco do teclado acompanha a troca de modo: entra no botão "Sair do foco" e volta ao "Focar".
  const firstRender = useRef(true)
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    ;(focus ? exitFocusRef.current : focusButtonRef.current)?.focus()
  }, [focus])

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

  const paneProps = { activeId, numbers, visibleIds, differences: result.differences, onSelect: navigation.select, pageMatches: result.analysis.pageMatches }
  const activeDifference = navigation.active
  const showOriginal = viewMode !== 'updated'
  const showUpdated = viewMode !== 'original'

  const list = (
    <DifferenceList
      differences={navigation.visible}
      activeId={activeId}
      numbers={numbers}
      onSelect={selectFromList}
      emptyMessage={
        result.differences.length > 0 && navigation.inCurrentMode.length === 0
          ? 'Nenhuma diferença neste modo de comparação. Escolha o modo Completo para ver todas.'
          : 'Nenhuma diferença deste tipo.'
      }
    />
  )

  const modeSwitch = <ComparisonModeSwitch value={navigation.mode} onChange={navigation.setMode} className={cn(isCompact && 'w-full')} size="sm" />
  const numbersSwitch = <NumbersSwitch checked={numbersAlways} onChange={setNumbersAlways} />

  const documentsArea = (
    <div className="flex min-w-0 flex-1 flex-col" style={{ '--zoom': zoom } as CSSProperties}>
      <div className={cn('grid min-h-0 flex-1', viewMode === 'side-by-side' ? 'grid-cols-2 gap-3' : 'grid-cols-1')}>
        {showOriginal && (
          <DocumentPane
            summary={result.documents.original}
            source={documents.original}
            pages={result.analysis.pages.original}
            scrollRef={originalRef}
            onScroll={synced.onFirstScroll}
            {...paneProps}
          />
        )}
        {showUpdated && (
          <DocumentPane
            summary={result.documents.updated}
            source={documents.updated}
            pages={result.analysis.pages.updated}
            scrollRef={updatedRef}
            onScroll={synced.onSecondScroll}
            {...paneProps}
          />
        )}
      </div>
    </div>
  )

  if (focus) {
    // Fora da árvore da página (portal no body): a transição entre páginas cria um contêiner que
    // prenderia o "fixed" e deixaria a barra do AQR por cima.
    return createPortal(
      <section
        aria-label="Modo foco: comparação em tela cheia"
        className={cn('fixed inset-0 z-50 flex flex-col bg-canvas', !numbersAlways && 'diff-numbers-hover')}
      >
        <div className="flex justify-center px-3 pt-2 pb-1">
          <div className="flex max-w-full flex-wrap items-center justify-center gap-2 rounded-lg bg-white/95 px-2 py-1.5 shadow-surface">
            {modeSwitch}
            <CompactStepper {...stepper} />
            {numbersSwitch}
            <ZoomControls zoom={zoom} onChange={setZoom} compact />
            <Button ref={exitFocusRef} variant="outline" size="sm" onClick={() => setFocus(false)} aria-keyshortcuts="Escape">
              <X aria-hidden />
              Sair do foco
            </Button>
          </div>
        </div>
        <div className="flex min-h-0 flex-1 px-3 pb-2">{documentsArea}</div>
        <div className="bg-white pb-[env(safe-area-inset-bottom)] shadow-[0_-2px_8px_-2px_rgba(27,32,64,0.18)]">
          <div className="flex items-center gap-2 px-3 pt-1.5">
            <h2 className="text-sm font-bold text-ink">
              Diferenças <span className="tabular font-semibold text-muted-foreground">({navigation.visible.length})</span>
            </h2>
            {listCollapsed && activeDifference && (
              <span className="min-w-0 truncate text-sm text-muted-foreground">
                {numbers.get(activeDifference.id)}. {describeDifference(activeDifference)}
              </span>
            )}
            <Button variant="ghost" size="sm" className="ml-auto" aria-expanded={!listCollapsed} onClick={() => setListCollapsed((value) => !value)}>
              {listCollapsed ? <ChevronUp aria-hidden /> : <ChevronDown aria-hidden />}
              {listCollapsed ? 'Mostrar diferenças' : 'Minimizar'}
            </Button>
          </div>
          <div className="flex items-center gap-2 px-3 pt-1 pb-2">
            <Button variant="outline" size="icon" onClick={navigation.previous} disabled={!navigation.hasPrevious} aria-label="Diferença anterior">
              <ChevronLeft aria-hidden />
            </Button>
            {listCollapsed ? (
              <span className="tabular text-sm font-semibold text-ink" aria-live="polite">
                {navigation.visible.length === 0 ? '0 de 0' : `${navigation.activeIndex + 1} de ${navigation.visible.length}`}
              </span>
            ) : (
              <ol aria-label="Diferenças encontradas" className="flex min-w-0 flex-1 gap-2 overflow-x-auto py-0.5">
                {navigation.visible.map((difference) => {
                  const meta = differenceKindMeta[difference.kind]
                  const isActive = difference.id === activeId
                  return (
                    <li key={difference.id} className="shrink-0">
                      <button
                        type="button"
                        data-list-diff-id={difference.id}
                        aria-current={isActive ? 'true' : undefined}
                        onClick={() => navigation.select(difference.id)}
                        className={cn('flex max-w-64 min-w-48 items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm', isActive ? 'bg-brand-50 shadow-[inset_0_0_0_2px_var(--brand-blue)]' : 'bg-surface-sunken hover:bg-brand-50')}
                      >
                        <span className={cn('inline-flex size-6 shrink-0 items-center justify-center rounded-sm border', meta.badgeClass)}>
                          <meta.icon aria-hidden className="size-4" strokeWidth={2.5} />
                        </span>
                        <span className="tabular font-bold">{numbers.get(difference.id)}</span>
                        <span className="truncate">{describeDifference(difference)}</span>
                      </button>
                    </li>
                  )
                })}
              </ol>
            )}
            <Button variant="outline" size="icon" onClick={navigation.next} disabled={!navigation.hasNext} aria-label="Próxima diferença" className={cn(listCollapsed && 'mr-auto')}>
              <ChevronRight aria-hidden />
            </Button>
          </div>
        </div>
      </section>,
      document.body,
    )
  }

  return (
    <div className={cn('flex min-h-0 flex-1 flex-col', !numbersAlways && 'diff-numbers-hover')}>
      <div className="result-bar relative z-10 flex flex-wrap items-center gap-1.5 bg-white px-4 py-2 shadow-surface lg:px-5">
        {actions && <h1 className="sr-only">Resultado da comparação</h1>}
        {!result.isDemonstration && (
          <AnalysisStatusButton result={result} expanded={detailsOpen} onToggle={() => setDetailsOpen((value) => !value)} controls={detailsId} />
        )}
        {modeSwitch}
        <CategorySelect value={navigation.category} onChange={navigation.setCategory} differences={navigation.inCurrentMode} className={cn(isCompact && 'w-full')} compact />
        <SummaryFilter differences={navigation.categoryScoped} filter={navigation.filter} onFilterChange={navigation.setFilter} compact />
        {numbersSwitch}
        <div className="ml-auto flex flex-wrap items-center gap-1.5">
          {!isCompact && <CompactStepper {...stepper} />}
          <ViewMenu value={viewMode} onChange={setPreferredMode} allowSideBySide={canSideBySide} syncScroll={syncScroll} onSyncScrollChange={setSyncScroll} iconOnly>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground">Legenda dos destaques</DropdownMenuLabel>
            <Legend />
          </ViewMenu>
          <ZoomControls zoom={zoom} onChange={setZoom} compact />
          <Button ref={focusButtonRef} size="sm" onClick={() => setFocus(true)} aria-keyshortcuts="F">
            <Maximize aria-hidden />
            Focar
          </Button>
          {actions}
        </div>
      </div>
      {!result.isDemonstration && detailsOpen && <AnalysisPanel result={result} id={detailsId} />}

      <div className={cn('flex min-h-0 flex-1 bg-canvas', isCompact ? 'gap-2 p-2' : 'gap-3 p-3')}>
        {listDocked && (
          <aside aria-labelledby="lista-diferencas-titulo" className="flex w-[17rem] shrink-0 flex-col overflow-hidden rounded-lg bg-white shadow-surface">
            <div className="flex min-h-11 items-center justify-between gap-2 pt-1 pr-1 pl-3">
              <h2 id="lista-diferencas-titulo" className="text-base font-bold text-ink">
                Diferenças <span className="tabular font-semibold text-muted-foreground">({navigation.visible.length})</span>
              </h2>
              <Button variant="ghost" size="sm" onClick={() => setListCollapsed(true)}>
                <PanelLeftClose aria-hidden />
                Minimizar
              </Button>
            </div>
            <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto">
              {list}
            </div>
          </aside>
        )}
        {isWide && listCollapsed && (
          <button
            type="button"
            onClick={() => setListCollapsed(false)}
            className="flex w-10 shrink-0 flex-col items-center gap-3 rounded-lg bg-white py-3 text-brand shadow-surface hover:bg-brand-50"
          >
            <PanelLeftOpen aria-hidden className="size-5" />
            <span className="text-sm font-bold [writing-mode:vertical-rl] rotate-180">
              Diferenças <span className="tabular">({navigation.visible.length})</span>
            </span>
            <span className="sr-only">: mostrar a lista</span>
          </button>
        )}
        {!isWide && !isCompact && (
          <Button variant="outline" onClick={() => setListSheetOpen(true)} className="shrink-0 self-start">
            <List aria-hidden />
            Diferenças <span className="tabular text-muted-foreground">({navigation.visible.length})</span>
          </Button>
        )}
        {documentsArea}
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
