import { ArrowRight } from 'lucide-react'
import { useId } from 'react'
import { Link } from 'react-router'
import { StatusBadge } from '@/components/common/StatusBadge'
import { cn } from '@/lib/utils'
import type { HomeTool } from '../tools'

interface ToolOptionProps {
  tool: HomeTool
  active: boolean
  /** Chamado no hover e no foco: atualiza a demonstração ao lado. */
  onActivate: () => void
}

/**
 * Opção da página inicial. É um link: o clique (ou o toque, sem hover) leva à ferramenta.
 * A opção ativa tem marcador lateral, ícone preenchido, seta deslocada e mais elevação, além da cor.
 */
export function ToolOption({ tool, active, onActivate }: ToolOptionProps) {
  const titleId = useId()
  const statusId = useId()
  const descriptionId = useId()
  const inDevelopment = tool.status === 'in-development'

  return (
    <Link
      to={tool.to}
      onMouseEnter={onActivate}
      onFocus={onActivate}
      aria-labelledby={inDevelopment ? `${titleId} ${statusId}` : titleId}
      aria-describedby={descriptionId}
      data-active={active}
      className={cn(
        'group relative flex items-center gap-4 rounded-xl bg-white py-5 pr-5 pl-6 transition-[box-shadow,transform] duration-200 ease-out focus-visible:outline-[3px] focus-visible:outline-offset-[3px] sm:gap-5',
        active ? 'shadow-raised motion-safe:-translate-y-0.5' : 'shadow-surface',
      )}
    >
      <span
        aria-hidden
        className={cn(
          'absolute inset-y-4 left-0 w-1 rounded-r-full bg-brand transition-opacity duration-200',
          active ? 'opacity-100' : 'opacity-0',
        )}
      />
      <span
        aria-hidden
        className={cn(
          'flex size-12 shrink-0 items-center justify-center rounded-lg transition-colors duration-200',
          active ? 'bg-brand text-white' : 'bg-brand-50 text-brand',
        )}
      >
        <tool.icon className="size-6" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span id={titleId} className={cn('text-lg font-bold', active ? 'text-brand' : 'text-ink')}>
            {tool.title}
          </span>
          {inDevelopment && (
            <StatusBadge variant="development">
              <span id={statusId}>Em desenvolvimento</span>
            </StatusBadge>
          )}
        </span>
        <span id={descriptionId} className="mt-1 block text-[0.9375rem] text-muted-foreground">
          {tool.description}
        </span>
      </span>
      <ArrowRight
        aria-hidden
        className={cn(
          'size-5 shrink-0 transition-[color,transform] duration-200',
          active ? 'text-brand motion-safe:translate-x-1' : 'text-subtle',
        )}
      />
    </Link>
  )
}
