import { randomUUID } from 'node:crypto'
import {
  summarize,
  type ComparisonProgress,
  type ComparisonResult,
  type Difference,
  type DifferenceKind,
  type DocumentRole,
} from '../../shared/contracts/comparison.ts'
import { contextLabels, pageLabel } from './context.ts'
import { alignDocuments } from './diff/align.ts'
import type { Hunk } from './diff/hunks.ts'
import { defaultComparisonLimits, type ComparisonLimits } from './limits.ts'
import { assertPdfBytes } from './pdf/load.ts'
import { extractDocument } from './pdf/extract.ts'
import { anchorAt, locationOf } from './regions.ts'
import { joinTokens, tokenize, type TokenizedDocument } from './text/tokenize.ts'

export interface SourceDocument {
  fileName: string
  bytes: Uint8Array
}

export interface CompareDocumentsOptions {
  limits?: ComparisonLimits
  signal?: AbortSignal
  onProgress?: (progress: ComparisonProgress) => void
}

function kindOf(hunk: Hunk): DifferenceKind {
  const hasOriginal = hunk.original.end > hunk.original.start
  const hasUpdated = hunk.updated.end > hunk.updated.start
  if (hasOriginal && hasUpdated) return 'modification'
  return hasOriginal ? 'deletion' : 'addition'
}

/** Rótulo de contexto de um trecho, pelo documento em que ele existe (de preferência o atualizado). */
function contextOf(
  hunk: Hunk,
  documents: Record<DocumentRole, TokenizedDocument>,
  labels: Record<DocumentRole, (string | null)[]>,
): string {
  const role: DocumentRole = hunk.updated.end > hunk.updated.start ? 'updated' : 'original'
  const document = documents[role]
  const range = hunk[role]
  const token = document.tokens[range.start] ?? document.tokens[range.start - 1]
  if (!token) return pageLabel(1)
  return labels[role][token.lineIndex] ?? pageLabel(token.pieces[0]?.pageNumber ?? 1)
}

function toDifference(
  hunk: Hunk,
  index: number,
  documents: Record<DocumentRole, TokenizedDocument>,
  labels: Record<DocumentRole, (string | null)[]>,
): Difference {
  const kind = kindOf(hunk)
  const difference: Difference = {
    id: `d-${String(index + 1).padStart(3, '0')}`,
    kind,
    context: contextOf(hunk, documents, labels),
  }
  for (const role of ['original', 'updated'] as const) {
    const { tokens } = documents[role]
    const range = hunk[role]
    const slice = tokens.slice(range.start, range.end)
    const location = locationOf(slice)
    if (location) {
      difference[role] = { location, text: joinTokens(slice) }
    } else {
      const anchor = anchorAt(tokens, range.start)
      if (anchor) difference.anchors = { ...difference.anchors, [role]: anchor }
    }
  }
  return difference
}

/**
 * Compara dois PDFs e devolve o resultado no formato público (`ComparisonResult`).
 * Relata as etapas do contrato e recusa entradas problemáticas com `ComparisonFailure` (`failure.ts`).
 * O cancelamento por `signal` interrompe entre as etapas.
 */
export async function compareDocuments(
  input: Record<DocumentRole, SourceDocument>,
  options: CompareDocumentsOptions = {},
): Promise<ComparisonResult> {
  const { limits = defaultComparisonLimits, signal, onProgress } = options

  onProgress?.({ stage: 'validating' })
  for (const role of ['original', 'updated'] as const) assertPdfBytes(input[role].bytes, role, limits)
  signal?.throwIfAborted()

  onProgress?.({ stage: 'extracting' })
  const original = await extractDocument(input.original.bytes, 'original', limits)
  signal?.throwIfAborted()
  const updated = await extractDocument(input.updated.bytes, 'updated', limits)
  signal?.throwIfAborted()

  onProgress?.({ stage: 'comparing' })
  const documents = { original: tokenize(original), updated: tokenize(updated) }
  const { hunks } = alignDocuments(documents.original, documents.updated, limits)
  signal?.throwIfAborted()

  onProgress?.({ stage: 'organizing' })
  const labels = { original: contextLabels(documents.original.lines), updated: contextLabels(documents.updated.lines) }
  const differences = hunks.map((hunk, index) => toDifference(hunk, index, documents, labels))

  return {
    id: randomUUID(),
    isDemonstration: false,
    documents: {
      original: { role: 'original', fileName: input.original.fileName, sizeBytes: input.original.bytes.byteLength, pageCount: original.pageCount },
      updated: { role: 'updated', fileName: input.updated.fileName, sizeBytes: input.updated.bytes.byteLength, pageCount: updated.pageCount },
    },
    summary: summarize(differences),
    differences,
  }
}
