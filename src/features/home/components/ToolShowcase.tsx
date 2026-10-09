import { ArrowRight } from 'lucide-react'
import { useRef } from 'react'
import { Link } from 'react-router'
import { StatusBadge } from '@/components/common/StatusBadge'
import { useInView } from '@/hooks/use-in-view'
import { cn } from '@/lib/utils'
import { ToolIllustration } from '../illustrations/ToolIllustration'
import type { HomeTool, HomeToolId } from '../tools'

interface ToolShowcaseProps {
  tools: readonly HomeTool[]
  active: HomeTool
  /** Contador de ativações por ferramenta: a ilustração reinicia do começo ao ser ativada. */
  runs: Record<HomeToolId, number>
}

/**
 * Demonstração da ferramenta ativa. As camadas de todas as ferramentas ocupam a mesma
 * célula do grid, então a troca é um cruzamento de opacidade sem mudança de layout.
 * O painel inteiro é clicável; fica fora da ordem de tabulação porque as opções já levam ao mesmo lugar.
 */
export function ToolShowcase({ tools, active, runs }: ToolShowcaseProps) {
  const ref = useRef<HTMLAnchorElement>(null)
  const inView = useInView(ref)

  return (
    <Link
      ref={ref}
      to={active.to}
      tabIndex={-1}
      className="group grid h-full rounded-xl bg-white p-6 shadow-surface transition-shadow duration-200 hover:shadow-raised sm:p-8 lg:p-10"
    >
      {tools.map((tool) => {
        const isActive = tool.id === active.id
        return (
          <div
            key={tool.id}
            aria-hidden={!isActive}
            className={cn(
              'col-start-1 row-start-1 flex min-w-0 flex-col transition-opacity duration-300 ease-out',
              isActive ? 'opacity-100' : 'pointer-events-none opacity-0',
            )}
          >
            <div className="flex flex-1 items-center justify-center py-2 sm:py-4">
              <ToolIllustration
                key={runs[tool.id]}
                kind={tool.illustration}
                running={isActive && inView}
                className="h-auto w-full max-w-[30rem]"
              />
            </div>
            <div className="mt-6 flex flex-wrap items-center gap-x-2 gap-y-1">
              <h2 className="text-xl font-bold text-ink">{tool.title}</h2>
              {tool.status === 'in-development' && <StatusBadge variant="development">Em desenvolvimento</StatusBadge>}
            </div>
            <p className="mt-2 text-[0.9375rem] text-muted-foreground">{tool.explanation}</p>
            <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-brand">
              Clique para acessar
              <ArrowRight aria-hidden className="size-4 transition-transform duration-200 motion-safe:group-hover:translate-x-0.5" />
            </span>
          </div>
        )
      })}
    </Link>
  )
}
