import {
  categoryLabels,
  contentLabels,
  coverageLabels,
  describeDifference,
  evidenceLabels,
  methodsText,
  pageSpan,
  relationLabels,
  statusLabels,
} from '../model/describe'
import { differenceKindMeta } from '../model/difference-kinds'
import type { ComparisonResult, Difference, DifferenceSide, DocumentRole } from '../model/types'

/**
 * Exportação do resultado, feita no navegador (nada volta ao servidor):
 * - JSON: o resultado no formato do contrato (formato 2), para outros sistemas;
 * - HTML: relatório autônomo para leitura e impressão, com a situação da análise, as ressalvas,
 *   os métodos e cada diferença.
 * Com `includeText: false`, os trechos dos documentos saem do relatório e do JSON (ficam só tipo,
 * página, local e método), para compartilhar sem expor o conteúdo.
 */

export interface ExportOptions {
  includeText: boolean
  /** Momento da exportação (injetável nos testes). */
  now?: Date
}

const MAX_EXCERPT = 300

function truncate(text: string): string {
  return text.length > MAX_EXCERPT ? `${text.slice(0, MAX_EXCERPT - 1).trimEnd()}…` : text
}

function stripSide(side: DifferenceSide | undefined): DifferenceSide | undefined {
  if (!side) return undefined
  const stripped: DifferenceSide = { ...side, text: '' }
  return stripped
}

/** Cópia do resultado sem os trechos de texto dos documentos. */
export function withoutText(result: ComparisonResult): ComparisonResult {
  return {
    ...result,
    differences: result.differences.map((difference) => {
      const copy: Difference = { ...difference }
      const original = stripSide(difference.original)
      const updated = stripSide(difference.updated)
      if (original) copy.original = original
      if (updated) copy.updated = updated
      return copy
    }),
  }
}

export function exportJson(result: ComparisonResult, options: ExportOptions): string {
  const now = options.now ?? new Date()
  const payload = {
    exportedAt: now.toISOString(),
    exportedBy: 'AQR — comparação de PDFs',
    includesDocumentText: options.includeText,
    result: options.includeText ? result : withoutText(result),
  }
  return JSON.stringify(payload, null, 2)
}

function escapeHtml(value: string): string {
  return value.replace(/&/gu, '&amp;').replace(/</gu, '&lt;').replace(/>/gu, '&gt;').replace(/"/gu, '&quot;').replace(/'/gu, '&#39;')
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(date)
}

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`
}

function sideCell(side: DifferenceSide | undefined, includeText: boolean): string {
  if (!side) return '<span class="muted">—</span>'
  const parts: string[] = []
  if (side.detail) parts.push(`<div class="detail">${escapeHtml(side.detail)}</div>`)
  if (side.text) parts.push(includeText ? `<div class="excerpt">${escapeHtml(truncate(side.text))}</div>` : '<div class="muted">(trecho omitido)</div>')
  return parts.join('') || '<span class="muted">—</span>'
}

const roleName: Record<DocumentRole, string> = { original: 'Original', updated: 'Atualizado' }

/** Relatório HTML autônomo (CSS embutido, sem scripts nem recursos externos). */
export function exportHtml(result: ComparisonResult, options: ExportOptions): string {
  const now = options.now ?? new Date()
  const { analysis, summary } = result
  const numbers = new Map(result.differences.map((difference, index) => [difference.id, index + 1]))
  const rows = result.differences
    .map((difference) => {
      const kind = differenceKindMeta[difference.kind].label
      const notes = difference.notes?.length ? `<div class="muted">${escapeHtml(difference.notes.join(' '))}</div>` : ''
      return `<tr>
  <td class="num">${numbers.get(difference.id) ?? ''}</td>
  <td><strong>${escapeHtml(kind)}</strong><br>${escapeHtml(categoryLabels[difference.category].label)}</td>
  <td>${escapeHtml(pageSpan(difference))}</td>
  <td>${escapeHtml(describeDifference(difference))}<div class="muted">${escapeHtml(difference.context)}</div>${notes}</td>
  <td>${sideCell(difference.original, options.includeText)}</td>
  <td>${sideCell(difference.updated, options.includeText)}</td>
  <td>${escapeHtml(evidenceLabels[difference.evidence].label)}<div class="muted">${escapeHtml(methodsText(difference.methods))}</div></td>
</tr>`
    })
    .join('\n')

  const warnings = analysis.warnings.length
    ? `<ul>${analysis.warnings.map((warning) => `<li><strong>${warning.severity === 'limitation' ? 'Limitação' : warning.severity === 'caveat' ? 'Ressalva' : 'Informação'}:</strong> ${escapeHtml(warning.message)}</li>`).join('')}</ul>`
    : '<p>Nenhuma ressalva.</p>'

  const pageRows = (['original', 'updated'] as const)
    .flatMap((role) =>
      analysis.pages[role].map(
        (page) =>
          `<tr><td>${roleName[role]}</td><td class="num">${page.pageNumber}</td><td>${escapeHtml(contentLabels[page.content])}</td><td>${escapeHtml(coverageLabels[page.text])}${page.ocrConfidence !== undefined ? ` (OCR, confiança ${page.ocrConfidence})` : ''}</td><td>${escapeHtml(coverageLabels[page.visual])}</td></tr>`,
      ),
    )
    .join('\n')

  const matches = analysis.pageMatches
    .filter((match) => match.relation !== 'matched' || match.original !== match.updated)
    .map((match) => `<li>${escapeHtml(relationLabels[match.relation])}: original ${match.original ?? '—'} → atualizado ${match.updated ?? '—'}</li>`)
    .join('')

  const categories = (Object.keys(summary.byCategory) as (keyof typeof summary.byCategory)[])
    .map((category) => `${escapeHtml(categoryLabels[category].plural)}: ${summary.byCategory[category]}`)
    .join(' · ')

  const methods = [
    'texto do PDF',
    analysis.methods.visual ? 'comparação visual' : 'comparação visual desligada',
    analysis.methods.ocr ? 'OCR local quando necessário' : 'OCR desligado',
  ].join('; ')

  const statusClass = analysis.status === 'complete' ? 'ok' : analysis.status === 'with-caveats' ? 'caveat' : 'partial'
  const statusMessage =
    analysis.status === 'partial'
      ? 'A comparação foi parcial. Existem páginas ou elementos que não puderam ser analisados.'
      : analysis.status === 'with-caveats'
        ? 'Todas as páginas foram examinadas, mas parte da análise tem qualidade reduzida (ver ressalvas).'
        : 'Todas as páginas foram examinadas por todos os métodos aplicáveis.'

  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Relatório de comparação — AQR</title>
<style>
  /* Mesmos valores de src/styles/tokens.css: o relatório é autônomo e não carrega o CSS do site. */
  :root { --ink: #1b2040; --muted: #4a5072; --brand: #283587; --sunken: #f4f5f9; --ok: #11663a; --ok-bg: #e2f3e8; --warn: #864300; --warn-bg: #fdf0d9; --bad: #a31f1a; --bad-bg: #fbe7e5; }
  * { box-sizing: border-box; }
  body { margin: 0; padding: 24px; font: 15px/1.5 system-ui, -apple-system, "Segoe UI", sans-serif; color: var(--ink); background: #fff; }
  h1 { margin: 0 0 4px; font-size: 22px; color: var(--brand); }
  h2 { margin: 28px 0 8px; font-size: 17px; color: var(--brand); }
  .muted { color: var(--muted); font-size: 13px; }
  .status { padding: 10px 14px; border-radius: 6px; margin: 12px 0; }
  .status.ok { background: var(--ok-bg); } .status.caveat { background: var(--warn-bg); } .status.partial { background: var(--bad-bg); }
  .demo { padding: 8px 12px; background: var(--warn-bg); border-radius: 6px; font-weight: 700; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; }
  th, td { text-align: left; vertical-align: top; padding: 6px 8px; }
  thead th { background: var(--sunken); font-size: 13px; }
  tbody tr:nth-child(even) { background: #fafbfd; }
  td.num { font-variant-numeric: tabular-nums; white-space: nowrap; }
  .excerpt { font-family: Georgia, "Times New Roman", serif; }
  .detail { font-size: 13px; }
  @media print { body { padding: 0; } h2 { break-after: avoid; } tr { break-inside: avoid; } }
</style>
</head>
<body>
<h1>Relatório de comparação de PDFs</h1>
<p class="muted">AQR — Análise e Qualificação de Requerimentos · SEMADES · Prefeitura de Campo Grande. Gerado em ${escapeHtml(formatDate(now))}.</p>
${result.isDemonstration ? '<p class="demo">Demonstração com dados fictícios: este relatório não resulta da comparação de documentos reais.</p>' : ''}
<table>
<thead><tr><th scope="col">Documento</th><th scope="col">Arquivo</th><th scope="col">Páginas</th><th scope="col">Tamanho</th></tr></thead>
<tbody>
<tr><td>Original</td><td>${escapeHtml(result.documents.original.fileName)}</td><td class="num">${result.documents.original.pageCount}</td><td class="num">${formatSize(result.documents.original.sizeBytes)}</td></tr>
<tr><td>Atualizado</td><td>${escapeHtml(result.documents.updated.fileName)}</td><td class="num">${result.documents.updated.pageCount}</td><td class="num">${formatSize(result.documents.updated.sizeBytes)}</td></tr>
</tbody>
</table>

<div class="status ${statusClass}"><strong>${escapeHtml(statusLabels[analysis.status])}.</strong> ${escapeHtml(statusMessage)}</div>

<h2>Resumo</h2>
<p><strong>${summary.total}</strong> ${summary.total === 1 ? 'diferença' : 'diferenças'}: ${summary.additions} adições, ${summary.deletions} exclusões, ${summary.modifications} modificações, ${summary.moves} movimentações. ${summary.needsReview} para conferir.</p>
<p>${categories}</p>
${summary.total === 0 ? '<p><strong>Nenhuma diferença foi detectada nas áreas analisadas.</strong> Isso não comprova que os documentos são idênticos.</p>' : ''}

<h2>Ressalvas</h2>
${warnings}

<h2>Métodos</h2>
<p>${escapeHtml(methods)}.</p>
<p class="muted">"Confirmada": dois métodos independentes apontam a diferença. "Detectada": um método a encontrou diretamente no arquivo. "Conferir": evidência fraca ou classificação incerta.</p>

<h2>Diferenças</h2>
${
  result.differences.length === 0
    ? '<p>Nenhuma diferença detectada.</p>'
    : `<table>
<thead><tr><th scope="col">Nº</th><th scope="col">Tipo</th><th scope="col">Página</th><th scope="col">O que mudou</th><th scope="col">Original</th><th scope="col">Atualizado</th><th scope="col">Evidência</th></tr></thead>
<tbody>
${rows}
</tbody>
</table>`
}
${options.includeText ? '' : '<p class="muted">Os trechos dos documentos foram omitidos deste relatório.</p>'}

<h2>Correspondência entre páginas</h2>
${matches ? `<ul>${matches}</ul>` : '<p>Cada página do original corresponde à página de mesmo número no atualizado.</p>'}

<h2>Cobertura por página</h2>
<table>
<thead><tr><th scope="col">Documento</th><th scope="col">Página</th><th scope="col">Conteúdo</th><th scope="col">Texto</th><th scope="col">Aparência</th></tr></thead>
<tbody>
${pageRows}
</tbody>
</table>

<p class="muted" style="margin-top:24px">A comparação é automática e não interpreta o sentido do texto. Assinaturas digitalizadas são tratadas como imagem; a autenticidade de assinaturas digitais não é verificada.</p>
</body>
</html>
`
}

/** Nome de arquivo seguro para a exportação. */
export function exportFileName(result: ComparisonResult, extension: 'html' | 'json', now = new Date()): string {
  const base = result.documents.updated.fileName.replace(/\.pdf$/iu, '').replace(/[^\p{L}\p{N}._-]+/gu, '-').replace(/^-+|-+$/gu, '').slice(0, 60) || 'comparacao'
  const stamp = now.toISOString().slice(0, 16).replace(/[:T]/gu, '-')
  return `comparacao-${base}-${stamp}.${extension}`
}

/** Entrega o conteúdo como download, sem passar pelo servidor. */
export function downloadFile(content: string, fileName: string, type: string): void {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.append(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
