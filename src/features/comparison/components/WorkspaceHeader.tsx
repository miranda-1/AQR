import { ArrowRight, Braces, ChevronDown, CircleCheck, Download, FileText, FlaskConical, Info, LoaderCircle, Plus, TriangleAlert } from 'lucide-react'
import { StatusBadge } from '@/components/common/StatusBadge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { downloadFile, exportFileName, exportHtml, exportJson } from '../export/report'
import type { ComparisonRunState } from '../model/comparison-run'
import type { ComparisonResult, DocumentRole, DocumentSummary } from '../model/types'
import { demoScenarios, isDemoScenario, type DemoScenario } from '../services/mock-comparison-service'

const statusDisplay: Record<ComparisonRunState['phase'], { label: string; icon: typeof CircleCheck; className: string }> = {
  preparing: { label: 'Preparando', icon: LoaderCircle, className: 'text-brand [&_svg]:animate-spin' },
  processing: { label: 'Processando', icon: LoaderCircle, className: 'text-brand [&_svg]:animate-spin' },
  completed: { label: 'Concluída', icon: CircleCheck, className: 'text-success' },
  failed: { label: 'Não concluída', icon: TriangleAlert, className: 'text-deletion' },
}

/** Recursos do modo demonstrativo: cenário simulado e aviso de dados fictícios. */
export interface DemoControls {
  scenario: DemoScenario
  onScenarioChange: (scenario: DemoScenario) => void
  selectedFileNames: string[]
}

interface WorkspaceHeaderProps {
  phase: ComparisonRunState['phase']
  /** Nomes exibidos sob o título; omitido quando não há documentos a identificar. */
  documents?: Record<DocumentRole, Pick<DocumentSummary, 'fileName'>>
  /** Presente só no modo demonstrativo. */
  demo?: DemoControls
  /** Resultado pronto (habilita a exportação). */
  result?: ComparisonResult
  onNewComparison: () => void
}

type ExportKind = 'html' | 'html-sem-trechos' | 'json'

function runExport(result: ComparisonResult, kind: ExportKind) {
  const now = new Date()
  if (kind === 'json') {
    downloadFile(exportJson(result, { includeText: true, now }), exportFileName(result, 'json', now), 'application/json')
    return
  }
  const includeText = kind === 'html'
  downloadFile(exportHtml(result, { includeText, now }), exportFileName(result, 'html', now), 'text/html')
}

function ExportItems({ result }: { result: ComparisonResult }) {
  return (
    <>
      <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground">Gerado no seu navegador; nada é enviado.</DropdownMenuLabel>
      <DropdownMenuItem className="min-h-10" onSelect={() => runExport(result, 'html')}>
        <FileText aria-hidden />
        Relatório para leitura (HTML)
      </DropdownMenuItem>
      <DropdownMenuItem className="min-h-10" onSelect={() => runExport(result, 'html-sem-trechos')}>
        <FileText aria-hidden />
        Relatório sem trechos dos documentos (HTML)
      </DropdownMenuItem>
      <DropdownMenuItem className="min-h-10" onSelect={() => runExport(result, 'json')}>
        <Braces aria-hidden />
        Dados da comparação (JSON)
      </DropdownMenuItem>
    </>
  )
}

function ScenarioOptions({ scenario, onScenarioChange }: Pick<DemoControls, 'scenario' | 'onScenarioChange'>) {
  return (
    <>
      <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground">
        Simular estado (recurso do protótipo, para revisão da interface)
      </DropdownMenuLabel>
      <DropdownMenuRadioGroup
        value={scenario}
        onValueChange={(value) => {
          if (isDemoScenario(value)) onScenarioChange(value)
        }}
      >
        {demoScenarios.map((item) => (
          <DropdownMenuRadioItem key={item.id} value={item.id} className="min-h-10 text-[0.9375rem]">
            {item.label}
          </DropdownMenuRadioItem>
        ))}
      </DropdownMenuRadioGroup>
    </>
  )
}

export function WorkspaceHeader({ phase, documents, demo, result, onNewComparison }: WorkspaceHeaderProps) {
  const status = statusDisplay[phase]

  return (
    <div className="bg-white">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3 lg:px-6">
        <div className="min-w-[min(100%,26rem)] flex-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <h1 className="text-lg font-extrabold tracking-tight text-ink sm:text-xl">Resultado da comparação</h1>
            {demo && (
              <StatusBadge variant="prototype">
                <FlaskConical aria-hidden className="size-3.5" />
                Demonstração com dados fictícios
              </StatusBadge>
            )}
            <span className={cn('inline-flex items-center gap-1.5 text-sm font-semibold', status.className)} role="status">
              <status.icon aria-hidden className="size-4" />
              <span className="sr-only">Situação: </span>
              {status.label}
            </span>
          </div>
          {documents && (
            <p className="mt-1 hidden min-w-0 items-center gap-2 text-sm text-muted-foreground sm:flex">
              <span className="truncate" title={documents.original.fileName}>
                <span className="sr-only">Original: </span>
                {documents.original.fileName}
              </span>
              <ArrowRight aria-hidden className="size-4 shrink-0" />
              <span className="truncate" title={documents.updated.fileName}>
                <span className="sr-only">Atualizado: </span>
                {documents.updated.fileName}
              </span>
            </p>
          )}
        </div>

        {/* Telas largas: ações visíveis. */}
        <div className="hidden flex-wrap items-center gap-2 md:flex">
          {demo && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <FlaskConical aria-hidden />
                  Simular estado
                  <ChevronDown aria-hidden />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-72">
                <ScenarioOptions scenario={demo.scenario} onScenarioChange={demo.onScenarioChange} />
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {result ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Download aria-hidden />
                  Exportar relatório
                  <ChevronDown aria-hidden />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                <ExportItems result={result} />
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                {/* aria-disabled mantém o botão focável para que o motivo seja lido. */}
                <Button variant="outline" aria-disabled="true" onClick={(event) => event.preventDefault()} className="text-muted-foreground">
                  <Download aria-hidden />
                  Exportar relatório
                </Button>
              </TooltipTrigger>
              <TooltipContent>A exportação fica disponível quando a comparação termina.</TooltipContent>
            </Tooltip>
          )}

          <Button onClick={onNewComparison}>
            <Plus aria-hidden />
            Nova comparação
          </Button>
        </div>

        {/* Telas estreitas: ações secundárias agrupadas em "Opções". */}
        <div className="flex w-full items-center gap-2 md:hidden">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="flex-1">
                Opções
                <ChevronDown aria-hidden />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-[min(18rem,calc(100vw-2rem))]">
              {result ? (
                <ExportItems result={result} />
              ) : (
                <DropdownMenuItem disabled className="min-h-10">
                  <Download aria-hidden />
                  Exportar relatório (quando a comparação terminar)
                </DropdownMenuItem>
              )}
              {demo && (
                <>
                  <DropdownMenuSeparator />
                  <ScenarioOptions scenario={demo.scenario} onScenarioChange={demo.onScenarioChange} />
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button onClick={onNewComparison} className="flex-1">
            <Plus aria-hidden />
            Nova comparação
          </Button>
        </div>
      </div>

      {demo && (
        <p className="flex items-start gap-2 bg-modification-bg px-4 py-2 text-sm text-ink lg:px-6">
          <Info aria-hidden className="mt-0.5 size-4 shrink-0 text-modification" />
          {demo.selectedFileNames.length > 0 ? (
            <span>
              Os arquivos selecionados ({demo.selectedFileNames.join(' e ')}) não foram processados. O resultado abaixo usa
              documentos fictícios para demonstrar a interface.
            </span>
          ) : (
            <span>Nenhum arquivo foi selecionado. O resultado abaixo usa documentos fictícios para demonstrar a interface.</span>
          )}
        </p>
      )}
    </div>
  )
}
