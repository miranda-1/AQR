import type { ReactNode } from 'react'
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Columns2, Link2, Link2Off, ZoomIn, ZoomOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Toggle } from '@/components/ui/toggle'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

export type ViewMode = 'side-by-side' | 'original' | 'updated'

export const zoomLevels = [0.75, 1, 1.25, 1.5, 2] as const

export function ViewModeSwitch({
  value,
  onChange,
  allowSideBySide,
  className,
}: {
  value: ViewMode
  onChange: (mode: ViewMode) => void
  allowSideBySide: boolean
  className?: string
}) {
  return (
    <ToggleGroup
      type="single"
      variant="outline"
      value={value}
      onValueChange={(next) => {
        if (next) onChange(next as ViewMode)
      }}
      aria-label="Modo de visualização"
      className={className}
    >
      {allowSideBySide && <ToggleGroupItem value="side-by-side">Lado a lado</ToggleGroupItem>}
      <ToggleGroupItem value="original" className={cn(!allowSideBySide && 'flex-1')}>
        Original
      </ToggleGroupItem>
      <ToggleGroupItem value="updated" className={cn(!allowSideBySide && 'flex-1')}>
        Atualizado
      </ToggleGroupItem>
    </ToggleGroup>
  )
}

export function SyncScrollToggle({ pressed, onChange }: { pressed: boolean; onChange: (value: boolean) => void }) {
  return (
    <Toggle
      variant="outline"
      pressed={pressed}
      onPressedChange={onChange}
      className="gap-2 data-[state=on]:border-brand data-[state=on]:bg-brand-50 data-[state=on]:text-brand data-[state=on]:hover:bg-brand-100"
    >
      {pressed ? <Link2 aria-hidden /> : <Link2Off aria-hidden />}
      Rolagem sincronizada
    </Toggle>
  )
}

export function ZoomControls({ zoom, onChange, compact = false }: { zoom: number; onChange: (zoom: number) => void; compact?: boolean }) {
  const index = zoomLevels.findIndex((level) => level === zoom)
  const percent = `${Math.round(zoom * 100)}%`
  return (
    <div role="group" aria-label="Zoom" className="flex shrink-0 items-center rounded-md border border-line-strong">
      <Button
        variant="ghost"
        size={compact ? 'icon-sm' : 'icon'}
        className={cn('rounded-r-none', compact && 'size-8')}
        aria-label="Diminuir zoom"
        disabled={index <= 0}
        onClick={() => onChange(zoomLevels[index - 1] ?? zoom)}
      >
        <ZoomOut aria-hidden />
      </Button>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={() => onChange(1)}
            className={cn('tabular border-x border-line px-2 text-sm font-semibold hover:bg-secondary', compact ? 'h-8 min-w-12' : 'h-10 min-w-16')}
            aria-label={`Zoom atual ${percent}. Restaurar para 100%`}
          >
            {percent}
          </button>
        </TooltipTrigger>
        <TooltipContent>Restaurar 100%</TooltipContent>
      </Tooltip>
      <Button
        variant="ghost"
        size={compact ? 'icon-sm' : 'icon'}
        className={cn('rounded-l-none', compact && 'size-8')}
        aria-label="Aumentar zoom"
        disabled={index >= zoomLevels.length - 1}
        onClick={() => onChange(zoomLevels[index + 1] ?? zoom)}
      >
        <ZoomIn aria-hidden />
      </Button>
    </div>
  )
}

interface DifferenceStepperProps {
  position: number
  total: number
  hasPrevious: boolean
  hasNext: boolean
  onPrevious: () => void
  onNext: () => void
  /** Versão para telas estreitas: menos espaço entre os controles. */
  compact?: boolean
  className?: string
}

/** Anterior / próxima. Atalhos: Alt + ↑ e Alt + ↓. */
export function DifferenceStepper({
  position,
  total,
  hasPrevious,
  hasNext,
  onPrevious,
  onNext,
  compact = false,
  className,
}: DifferenceStepperProps) {
  return (
    <div
      role="group"
      aria-label="Navegar entre diferenças"
      className={cn('flex items-center gap-1', compact && '[&_button]:px-2.5', className)}
    >
      <Button variant="outline" onClick={onPrevious} disabled={!hasPrevious} aria-keyshortcuts="Alt+ArrowUp">
        <ChevronUp aria-hidden />
        Anterior
      </Button>
      <span
        className={cn('tabular px-1 text-center text-sm font-semibold whitespace-nowrap text-ink', compact ? 'min-w-12' : 'min-w-16')}
        aria-live="polite"
      >
        {total === 0 ? '0 de 0' : `${position} de ${total}`}
      </span>
      <Button variant="outline" onClick={onNext} disabled={!hasNext} aria-keyshortcuts="Alt+ArrowDown">
        Próxima
        <ChevronDown aria-hidden />
      </Button>
    </div>
  )
}

const viewModeLabels: Record<ViewMode, string> = { 'side-by-side': 'Lado a lado', original: 'Só o original', updated: 'Só o atualizado' }

/** Visualização (lado a lado ou uma versão) e rolagem sincronizada, num menu, para a barra caber numa linha. */
export function ViewMenu({
  value,
  onChange,
  allowSideBySide,
  syncScroll,
  onSyncScrollChange,
  iconOnly = false,
  children,
}: {
  value: ViewMode
  onChange: (mode: ViewMode) => void
  allowSideBySide: boolean
  syncScroll: boolean
  onSyncScrollChange: (value: boolean) => void
  /** Só o ícone (o nome da visualização vai para o rótulo acessível e a dica). */
  iconOnly?: boolean
  /** Conteúdo extra no fim do menu (a legenda dos destaques). */
  children?: ReactNode
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" aria-label={`Visualização: ${viewModeLabels[value]}`} title={`Visualização: ${viewModeLabels[value]}`}>
          <Columns2 aria-hidden />
          {!iconOnly && viewModeLabels[value]}
          <ChevronDown aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-80">
        <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground">Visualização</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={value}
          onValueChange={(next) => {
            if (next === 'side-by-side' || next === 'original' || next === 'updated') onChange(next)
          }}
        >
          {(['side-by-side', 'original', 'updated'] as const)
            .filter((mode) => allowSideBySide || mode !== 'side-by-side')
            .map((mode) => (
              <DropdownMenuRadioItem key={mode} value={mode} className="min-h-10">
                {viewModeLabels[mode]}
              </DropdownMenuRadioItem>
            ))}
        </DropdownMenuRadioGroup>
        {value === 'side-by-side' && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuCheckboxItem checked={syncScroll} onCheckedChange={(checked) => onSyncScrollChange(checked === true)} className="min-h-10">
              Rolagem sincronizada
            </DropdownMenuCheckboxItem>
          </>
        )}
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/**
 * "Números sempre": por padrão, o número de cada diferença aparece só ao passar o mouse sobre o
 * destaque (ou com o foco do teclado); ligado, fica sempre visível.
 */
export function NumbersSwitch({ checked, onChange }: { checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      title="Números das diferenças sempre visíveis (desligado: só ao passar o mouse)"
      onClick={() => onChange(!checked)}
      className={cn(
        'inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md border border-line-strong bg-white px-2 text-sm font-semibold whitespace-nowrap text-ink',
        checked && 'border-brand bg-brand-50 text-brand',
      )}
    >
      <span aria-hidden className={cn('relative h-4 w-7 rounded-full bg-line-strong transition-colors', checked && 'bg-brand')}>
        <span className={cn('absolute top-0.5 left-0.5 size-3 rounded-full bg-white transition-transform', checked && 'translate-x-3')} />
      </span>
      Números<span className="sr-only"> sempre visíveis</span>
    </button>
  )
}

/** Anterior / próxima em botões só com ícone (barra única e modo foco). */
export function CompactStepper({
  position,
  total,
  hasPrevious,
  hasNext,
  onPrevious,
  onNext,
  direction = 'vertical',
}: Omit<DifferenceStepperProps, 'compact' | 'className'> & { direction?: 'vertical' | 'horizontal' }) {
  const [Prev, Next] = direction === 'vertical' ? [ChevronUp, ChevronDown] : [ChevronLeft, ChevronRight]
  return (
    <div role="group" aria-label="Navegar entre diferenças" className="flex shrink-0 items-center gap-1">
      <Button variant="outline" size="icon-sm" onClick={onPrevious} disabled={!hasPrevious} aria-label="Diferença anterior" aria-keyshortcuts="Alt+ArrowUp">
        <Prev aria-hidden />
      </Button>
      <span className="tabular min-w-12 text-center text-sm font-semibold whitespace-nowrap text-ink" aria-live="polite">
        {total === 0 ? '0 de 0' : `${position} de ${total}`}
      </span>
      <Button variant="outline" size="icon-sm" onClick={onNext} disabled={!hasNext} aria-label="Próxima diferença" aria-keyshortcuts="Alt+ArrowDown">
        <Next aria-hidden />
      </Button>
    </div>
  )
}
