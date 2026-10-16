import { ChevronDown, Info, ShieldAlert, ShieldCheck, TriangleAlert, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { contentLabels, coverageLabels, relationLabels, statusLabels } from '../model/describe'
import type { AnalysisStatus, AnalysisWarning, ComparisonResult, DocumentRole, PageAnalysis, PageMatch } from '../model/types'

const statusDisplay: Record<AnalysisStatus, { icon: LucideIcon; className: string; message: string }> = {
  complete: {
    icon: ShieldCheck,
    className: 'bg-addition-bg text-ink [&_[data-icon]]:text-success',
    message: 'Todas as páginas foram examinadas por todos os métodos aplicáveis.',
  },
  'with-caveats': {
    icon: ShieldAlert,
    className: 'bg-warning-bg text-ink [&_[data-icon]]:text-warning',
    message: 'Todas as páginas foram examinadas, mas parte da análise tem qualidade reduzida. Veja as ressalvas.',
  },
  partial: {
    icon: TriangleAlert,
    className: 'bg-deletion-bg text-ink [&_[data-icon]]:text-deletion',
    message: 'A comparação foi parcial. Existem páginas ou elementos que não puderam ser analisados.',
  },
}

const severityIcon: Record<AnalysisWarning['severity'], { icon: LucideIcon; className: string; label: string }> = {
  info: { icon: Info, className: 'text-brand', label: 'Informação' },
  caveat: { icon: ShieldAlert, className: 'text-warning', label: 'Ressalva' },
  limitation: { icon: TriangleAlert, className: 'text-deletion', label: 'Limitação' },
}

const roleNames: Record<DocumentRole, string> = { original: 'Original', updated: 'Atualizado' }

function count(pages: readonly PageAnalysis[], predicate: (page: PageAnalysis) => boolean): number {
  return pages.filter(predicate).length
}

/** Uma frase por documento: quantas páginas, de que tipo, e o que ficou sem análise. */
function coverageSentence(pages: readonly PageAnalysis[]): string {
  const parts: string[] = []
  const byContent = new Map<PageAnalysis['content'], number>()
  for (const page of pages) byContent.set(page.content, (byContent.get(page.content) ?? 0) + 1)
  for (const [content, total] of byContent) parts.push(`${total} ${contentLabels[content]}`)
  const ocr = count(pages, (page) => page.textSource === 'ocr' || page.textSource === 'text-layer+ocr')
  const noText = count(pages, (page) => page.text === 'not-analyzed')
  const noVisual = count(pages, (page) => page.visual === 'not-analyzed')
  const sentence = [`${pages.length} ${pages.length === 1 ? 'página' : 'páginas'} (${parts.join(', ')})`]
  if (ocr > 0) sentence.push(`${ocr} lida${ocr === 1 ? '' : 's'} por OCR`)
  if (noText > 0) sentence.push(`${noText} sem leitura do texto`)
  if (noVisual > 0) sentence.push(`${noVisual} sem comparação da aparência`)
  return sentence.join('; ')
}

function nonTrivialMatches(matches: readonly PageMatch[]): PageMatch[] {
  return matches.filter((match) => match.relation !== 'matched' || match.original !== match.updated)
}

function PageTable({ role, pages }: { role: DocumentRole; pages: readonly PageAnalysis[] }) {
  return (
    <div className="max-h-64 overflow-auto rounded-md bg-white">
      <table className="w-full text-left text-sm">
        <caption className="sr-only">Cobertura por página do documento {roleNames[role].toLowerCase()}</caption>
        <thead className="sticky top-0 bg-surface-sunken">
          <tr>
            <th scope="col" className="px-2 py-1 font-semibold">
              Página
            </th>
            <th scope="col" className="px-2 py-1 font-semibold">
              Conteúdo
            </th>
            <th scope="col" className="px-2 py-1 font-semibold">
              Texto
            </th>
            <th scope="col" className="px-2 py-1 font-semibold">
              Aparência
            </th>
          </tr>
        </thead>
        <tbody>
          {pages.map((page) => (
            <tr key={page.pageNumber}>
              <th scope="row" className="tabular px-2 py-1 font-medium">
                {page.pageNumber}
              </th>
              <td className="px-2 py-1">{contentLabels[page.content]}</td>
              <td className={cn('px-2 py-1', page.text === 'not-analyzed' && 'font-semibold text-deletion')}>
                {coverageLabels[page.text]}
                {page.textSource === 'ocr' || page.textSource === 'text-layer+ocr'
                  ? ` (OCR${page.ocrConfidence !== undefined ? `, confiança ${page.ocrConfidence}` : ''})`
                  : ''}
              </td>
              <td className={cn('px-2 py-1', page.visual === 'not-analyzed' && 'font-semibold text-deletion')}>{coverageLabels[page.visual]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function matchText(match: PageMatch): string {
  const label = relationLabels[match.relation]
  if (match.original !== undefined && match.updated !== undefined) return `${label}: p. ${match.original} do original → p. ${match.updated} do atualizado`
  if (match.original !== undefined) return `${label}: p. ${match.original} do original`
  return `${label}: p. ${match.updated ?? '?'} do atualizado`
}

export function AnalysisDetails({ result }: { result: ComparisonResult }) {
  const { analysis } = result
  const matches = nonTrivialMatches(analysis.pageMatches)
  const methods = [
    'texto do PDF',
    analysis.methods.visual ? 'comparação visual (páginas, imagens, desenhos e formatação)' : null,
    analysis.methods.ocr ? 'OCR nas páginas sem texto' : null,
  ].filter(Boolean)
  const disabled = [!analysis.methods.visual ? 'comparação visual' : null, !analysis.methods.ocr ? 'OCR' : null].filter(Boolean)

  return (
    <div className="space-y-4 text-[0.9375rem] text-ink">
      {analysis.warnings.length > 0 && (
        <section aria-label="Ressalvas da análise">
          <h3 className="text-sm font-bold">Ressalvas</h3>
          <ul className="mt-1 space-y-1.5">
            {analysis.warnings.map((warning, index) => {
              const severity = severityIcon[warning.severity]
              return (
                <li key={`${warning.code}-${index}`} className="flex items-start gap-2">
                  <severity.icon aria-hidden className={cn('mt-0.5 size-4 shrink-0', severity.className)} />
                  <span>
                    <span className="sr-only">{severity.label}: </span>
                    {warning.message}
                  </span>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      <section aria-label="Métodos usados">
        <h3 className="text-sm font-bold">Métodos usados</h3>
        <p className="mt-1">
          {methods.join('; ')}.{disabled.length > 0 && ` Desligados neste servidor: ${disabled.join(' e ')}.`}
        </p>
      </section>

      <section aria-label="Páginas examinadas">
        <h3 className="text-sm font-bold">Páginas examinadas</h3>
        <ul className="mt-1 space-y-1">
          {(['original', 'updated'] as const).map((role) => (
            <li key={role}>
              <span className="font-semibold">{roleNames[role]}:</span> {coverageSentence(analysis.pages[role])}.
            </li>
          ))}
        </ul>
        <details className="mt-2">
          <summary className="cursor-pointer text-sm font-semibold text-brand">Ver página a página</summary>
          <div className="mt-2 grid gap-3 md:grid-cols-2">
            {(['original', 'updated'] as const).map((role) => (
              <div key={role}>
                <p className="mb-1 text-sm font-semibold">{roleNames[role]}</p>
                <PageTable role={role} pages={analysis.pages[role]} />
              </div>
            ))}
          </div>
        </details>
      </section>

      <section aria-label="Correspondência entre páginas">
        <h3 className="text-sm font-bold">Correspondência entre páginas</h3>
        {matches.length === 0 ? (
          <p className="mt-1">Cada página do original corresponde à página de mesmo número no atualizado.</p>
        ) : (
          <ul className="mt-1 max-h-48 space-y-0.5 overflow-auto">
            {matches.slice(0, 200).map((match, index) => (
              <li key={`${match.original ?? '-'}-${match.updated ?? '-'}-${index}`}>{matchText(match)}</li>
            ))}
            {matches.length > 200 && <li>e mais {matches.length - 200}.</li>}
          </ul>
        )}
      </section>
    </div>
  )
}

const shortStatus: Record<AnalysisStatus, string> = {
  complete: 'Concluída',
  'with-caveats': 'Com ressalvas',
  partial: 'Parcial',
}

/**
 * Selo da situação da análise, na barra do resultado. Abre e fecha o painel de detalhes
 * (`AnalysisPanel`). A cor acompanha a situação; o texto diz a situação, então a cor não é o único sinal.
 */
export function AnalysisStatusButton({
  result,
  expanded,
  onToggle,
  controls,
}: {
  result: ComparisonResult
  expanded: boolean
  onToggle: () => void
  controls: string
}) {
  const { status, warnings } = result.analysis
  const display = statusDisplay[status]
  const relevant = warnings.filter((warning) => warning.severity !== 'info').length
  return (
    <button
      type="button"
      aria-expanded={expanded}
      aria-controls={controls}
      onClick={onToggle}
      title={`${statusLabels[status]}. ${display.message}`}
      className={cn('inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md px-2.5 text-sm font-semibold whitespace-nowrap', display.className)}
    >
      <display.icon data-icon aria-hidden className="size-4" />
      <span className="sr-only">Situação da análise: </span>
      <span aria-hidden>{shortStatus[status]}</span>
      <span className="sr-only">{statusLabels[status]}</span>
      {relevant > 0 && <span className="tabular font-bold">({relevant})</span>}
      <span className="sr-only">. {expanded ? 'Ocultar' : 'Ver'} detalhes da análise</span>
      <ChevronDown aria-hidden className={cn('size-4 transition-transform', expanded && 'rotate-180')} />
    </button>
  )
}

/** Detalhes da situação da análise, abaixo da barra (abertos sozinhos quando a comparação é parcial). */
export function AnalysisPanel({ result, id }: { result: ComparisonResult; id: string }) {
  const { status, warnings } = result.analysis
  const display = statusDisplay[status]
  const relevant = warnings.filter((warning) => warning.severity !== 'info').length
  return (
    <section id={id} aria-label="Situação da análise" className={cn('px-4 py-3 lg:px-6', display.className)}>
      <p className="flex items-start gap-2 text-[0.9375rem]">
        <display.icon data-icon aria-hidden className="mt-0.5 size-5 shrink-0" />
        <span>
          <strong className="font-bold">{statusLabels[status]}.</strong> {display.message}
          {relevant > 0 && ` (${relevant} ${relevant === 1 ? 'ressalva' : 'ressalvas'})`}
        </span>
      </p>
      <div className="mt-2 rounded-md bg-white/70 p-3">
        <AnalysisDetails result={result} />
      </div>
    </section>
  )
}
