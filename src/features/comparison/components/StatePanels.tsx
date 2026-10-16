import { Check, CircleCheck, FileWarning, FileX, LoaderCircle, RefreshCw, ScanText, ShieldAlert, TriangleAlert, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { routes } from '@/config/routes'
import { cn } from '@/lib/utils'
import { stageLabels, stageOrder, type ComparisonRunState } from '../model/comparison-run'
import type { ComparisonError, ComparisonErrorCode, ComparisonResult, DocumentRole } from '../model/types'
import { AnalysisDetails } from './AnalysisSummary'

function PanelFrame({ children, labelledBy }: { children: ReactNode; labelledBy: string }) {
  return (
    <div className="flex flex-1 items-start justify-center overflow-auto bg-surface-sunken px-4 py-10 sm:items-center">
      <section aria-labelledby={labelledBy} className="w-full max-w-xl rounded-lg bg-white p-6 shadow-surface sm:p-8">
        {children}
      </section>
    </div>
  )
}

export function ProcessingPanel({
  state,
  isDemonstration,
}: {
  state: Extract<ComparisonRunState, { phase: 'preparing' | 'processing' }>
  /** No modo demonstrativo nada é lido nem enviado; o texto avisa isso. */
  isDemonstration: boolean
}) {
  const currentIndex = state.phase === 'processing' ? stageOrder.indexOf(state.stage) : -1
  const title = state.phase === 'preparing' ? 'Preparando a comparação' : 'Comparando os documentos'

  return (
    <PanelFrame labelledBy="processamento-titulo">
      <div className="flex items-center gap-3">
        <LoaderCircle aria-hidden className="size-7 shrink-0 animate-spin text-brand" />
        <h2 id="processamento-titulo" className="text-xl font-bold text-ink">
          {title}
        </h2>
      </div>
      <p className="mt-2 text-[0.9375rem] text-muted-foreground">
        {isDemonstration
          ? 'Simulação de interface: nenhum arquivo está sendo lido ou enviado.'
          : 'Os arquivos são enviados ao servidor do AQR só para esta comparação e não ficam guardados.'}
      </p>
      <ol className="mt-6 space-y-3" aria-label="Etapas">
        {stageOrder.map((stage, index) => {
          const done = index < currentIndex
          const current = index === currentIndex
          return (
            <li
              key={stage}
              aria-current={current ? 'step' : undefined}
              className={cn('flex items-center gap-3 text-[0.9375rem]', done || current ? 'text-ink' : 'text-subtle')}
            >
              <span
                className={cn(
                  'flex size-6 shrink-0 items-center justify-center rounded-full border-2',
                  done && 'border-success bg-success text-white',
                  current && 'border-brand',
                  !done && !current && 'border-line-strong',
                )}
              >
                {done ? <Check aria-hidden className="size-3.5" strokeWidth={3} /> : current ? <span className="size-2 rounded-full bg-brand" /> : null}
              </span>
              <span className={cn(current && 'font-semibold')}>{stageLabels[stage]}</span>
              <span className="sr-only">{done ? '(concluída)' : current ? '(em andamento)' : '(pendente)'}</span>
            </li>
          )
        })}
      </ol>
      <p className="sr-only" role="status">
        {currentIndex >= 0 ? `${stageLabels[stageOrder[currentIndex] ?? 'validating']}…` : 'Preparando…'}
      </p>
    </PanelFrame>
  )
}

const documentNames: Record<DocumentRole, string> = { original: 'documento original', updated: 'documento atualizado' }

const errorContent: Record<
  ComparisonErrorCode,
  { icon: LucideIcon; title: string; body: (doc: string) => string; hint: string }
> = {
  PROCESSING_FAILED: {
    icon: TriangleAlert,
    title: 'A comparação não foi concluída',
    body: () => 'Ocorreu uma falha durante o processamento. Os arquivos selecionados não foram alterados.',
    hint: 'Tente novamente. Se a falha se repetir, confira se o servidor do AQR está funcionando e se os PDFs abrem normalmente.',
  },
  INCOMPATIBLE_DOCUMENT: {
    icon: FileX,
    title: 'Documento incompatível',
    body: (doc) => `Não foi possível abrir o ${doc}. O arquivo pode estar corrompido ou protegido por senha.`,
    hint: 'Gere uma nova cópia do PDF sem senha e selecione-a novamente.',
  },
  NO_EXTRACTABLE_TEXT: {
    icon: ScanText,
    title: 'PDF sem texto para comparar',
    body: (doc) =>
      `O ${doc} parece ser uma digitalização: as páginas são imagens, sem texto selecionável. A comparação depende do texto do documento.`,
    hint: 'O OCR e a comparação visual estão desligados neste servidor, então nenhum método consegue ler o documento. Use a versão gerada digitalmente ou peça ao administrador para ligá-los.',
  },
}

export function ErrorPanel({ error, onRetry }: { error: ComparisonError; onRetry: () => void }) {
  const content = errorContent[error.code]
  const doc = error.document ? documentNames[error.document] : 'documento'

  return (
    <PanelFrame labelledBy="erro-titulo">
      <div role="alert">
        <div className="flex items-start gap-3">
          <content.icon aria-hidden className="mt-0.5 size-7 shrink-0 text-deletion" />
          <h2 id="erro-titulo" className="text-xl font-bold text-ink">
            {content.title}
          </h2>
        </div>
        <p className="mt-3 text-[0.9375rem] text-ink">{content.body(doc)}</p>
        <p className="mt-2 text-[0.9375rem] text-muted-foreground">{content.hint}</p>
      </div>
      <div className="mt-6 flex flex-wrap gap-3">
        <Button asChild>
          <Link to={routes.comparison} viewTransition>
            <FileWarning aria-hidden />
            Escolher outros arquivos
          </Link>
        </Button>
        {error.code === 'PROCESSING_FAILED' && (
          <Button variant="outline" onClick={onRetry}>
            <RefreshCw aria-hidden />
            Tentar novamente
          </Button>
        )}
      </div>
    </PanelFrame>
  )
}

/**
 * Nenhuma diferença detectada. Nunca afirma que os documentos são iguais: diz o que foi analisado
 * e, se a análise foi parcial, o que ficou de fora.
 */
export function NoDifferencesPanel({ result }: { result: ComparisonResult }) {
  const { status } = result.analysis
  const partial = status === 'partial'
  const Icon = partial ? TriangleAlert : status === 'with-caveats' ? ShieldAlert : CircleCheck
  return (
    <div className="flex flex-1 items-start justify-center overflow-auto bg-surface-sunken px-4 py-10">
      <section aria-labelledby="sem-diferencas-titulo" className="w-full max-w-2xl rounded-lg bg-white p-6 shadow-surface sm:p-8">
        <div role="status">
          <div className="flex items-start gap-3">
            <Icon aria-hidden className={cn('mt-0.5 size-7 shrink-0', partial ? 'text-deletion' : status === 'with-caveats' ? 'text-warning' : 'text-success')} />
            <h2 id="sem-diferencas-titulo" className="text-xl font-bold text-ink">
              {partial ? 'Comparação parcial: nenhuma diferença nas áreas analisadas' : 'Nenhuma diferença detectada'}
            </h2>
          </div>
          <p className="mt-3 text-[0.9375rem] text-ink">Nenhuma diferença foi detectada nas áreas analisadas.</p>
          {partial && (
            <p className="mt-2 text-[0.9375rem] font-semibold text-ink">
              A comparação foi parcial. Existem páginas ou elementos que não puderam ser analisados.
            </p>
          )}
          <p className="mt-2 text-[0.9375rem] text-muted-foreground">
            Isso não comprova que os documentos são idênticos: veja abaixo o que foi comparado e com quais métodos.
          </p>
        </div>
        <div className="mt-5 rounded-md bg-surface-sunken p-4">
          <AnalysisDetails result={result} />
        </div>
        <div className="mt-6">
          <Button asChild variant="outline">
            <Link to={routes.comparison} viewTransition>Comparar outros documentos</Link>
          </Button>
        </div>
      </section>
    </div>
  )
}
