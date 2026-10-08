import { ChevronDown, ChevronUp, Link2, Link2Off, ZoomIn, ZoomOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
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

export function ZoomControls({ zoom, onChange }: { zoom: number; onChange: (zoom: number) => void }) {
  const index = zoomLevels.findIndex((level) => level === zoom)
  const percent = `${Math.round(zoom * 100)}%`
  return (
    <div role="group" aria-label="Zoom" className="flex items-center rounded-md border border-line-strong">
      <Button
        variant="ghost"
        size="icon"
        className="rounded-r-none"
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
            className="tabular h-10 min-w-16 border-x border-line px-2 text-sm font-semibold hover:bg-secondary"
            aria-label={`Zoom atual ${percent}. Restaurar para 100%`}
          >
            {percent}
          </button>
        </TooltipTrigger>
        <TooltipContent>Restaurar 100%</TooltipContent>
      </Tooltip>
      <Button
        variant="ghost"
        size="icon"
        className="rounded-l-none"
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
