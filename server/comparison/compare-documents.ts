import { randomUUID } from 'node:crypto'
import {
  analysisStatusOf,
  COMPARISON_FORMAT_VERSION,
  summarize,
  type AnalysisWarning,
  type ComparisonProgress,
  type ComparisonResult,
  type DetectionMethod,
  type Difference,
  type DifferenceSide,
  type DocumentRole,
  type MethodCoverage,
  type NormalizedRect,
  type PageAnalysis,
  type PageMatch,
} from '../../shared/contracts/comparison.ts'
import { consolidatePagePair, type PagePairEvidence } from './consolidate.ts'
import { contextLabels, pageLabel } from './context.ts'
import { alignDocuments, type AlignmentLevel } from './diff/align.ts'
import type { Hunk } from './diff/hunks.ts'
import { FULL_PAGE, finalize, makeDraft, sideFromRects, type Draft } from './drafts.ts'
import { ComparisonFailure } from './failure.ts'
import { coveredFraction, iou, rotateRect } from './geometry.ts'
import { defaultComparisonLimits, type ComparisonLimits } from './limits.ts'
import { createOcrEngine, type OcrEngine, type OcrPage } from './ocr/ocr-engine.ts'
import { analyzeDocument, countCharacters, type AnalyzedDocument, type AnalyzedPage, type ExtractedLine } from './pdf/extract.ts'
import { assertPdfBytes } from './pdf/load.ts'
import { renderPage, type Raster } from './pdf/render.ts'
import { anchorAt, locationsOf } from './regions.ts'
import { matchPages, type PageFeatures } from './structure/page-matching.ts'
import { classifyTextChange, type TextSide } from './text/classify.ts'
import { joinTokens, tokenize, type Token, type TokenizedDocument } from './text/tokenize.ts'
import { compareFormatting, POSITION_TOLERANCE, type EqualPair } from './visual/formatting.ts'
import { compareImages } from './visual/images.ts'
import { cropRaster, diffRasters, MIN_REGION_PIXELS, type VisualRegion } from './visual/raster-diff.ts'

export interface SourceDocument {
  fileName: string
  bytes: Uint8Array
}

export interface CompareDocumentsOptions {
  limits?: ComparisonLimits
  signal?: AbortSignal
  onProgress?: (progress: ComparisonProgress) => void
  /** Motor de OCR já criado (testes); sem ele, um é criado se houver páginas que precisem. */
  ocrEngine?: OcrEngine
  /** Recebe o tempo (ms) de cada etapa interna, para medição de desempenho. Não vai para o resultado. */
  onTiming?: (stage: TimingStage, ms: number) => void
}

export type TimingStage = 'exame' | 'ocr' | 'correspondencia' | 'texto' | 'visual' | 'organizacao'

const roles = ['original', 'updated'] as const
type ByRole<T> = Record<DocumentRole, T>

/** Palavras mínimas que um trecho movido precisa ter para ser reconhecido como movimentação. */
const MIN_MOVE_TOKENS = 3
/** Tamanho do resumo do texto de uma página incluída ou excluída. */
const PAGE_EXCERPT = 240

// ---------------------------------------------------------------------------------------------
// OCR

interface OcrOutcome {
  status: 'not-needed' | 'done' | 'skipped-limit' | 'skipped-budget' | 'unavailable' | 'failed'
  confidence?: number
}

function needsOcr(page: AnalyzedPage): boolean {
  return page.content === 'scanned' || page.content === 'insufficient-text' || page.content === 'mixed'
}

/** Palavra de OCR que é só ruído: confiança abaixo do mínimo, ou um sinal solto pouco confiável. */
function isOcrNoise(text: string, confidence: number, minConfidence: number): boolean {
  if (confidence < minConfidence) return true
  return !/[\p{L}\p{N}]/u.test(text) && confidence < 80
}

/**
 * Junta as palavras do OCR às da camada de texto, sem duplicar o que o PDF já tem como texto e
 * sem as leituras que são ruído (pontos de sujeira, rabiscos lidos como letras).
 */
export function mergeOcr(page: AnalyzedPage, ocr: OcrPage, minConfidence = 0): ExtractedLine[] {
  const textWords = page.lines.flatMap((line) => line.words)
  const images = page.objects.images.map((image) => image.region)
  const overlapsText = (region: NormalizedRect) =>
    textWords.some((word) => iou(word.region, region) > 0.2 || coveredFraction(region, word.region) > 0.5)
  const ocrLines: ExtractedLine[] = []
  for (const line of ocr.lines) {
    const words = line.words
      .filter((word) => !isOcrNoise(word.text, word.confidence, minConfidence))
      .filter((word) => !overlapsText(word.region))
      .filter((word) => page.content !== 'mixed' || images.some((image) => coveredFraction(word.region, image) > 0.6))
      .map((word) => ({ text: word.text, region: word.region, source: 'ocr' as const, confidence: word.confidence }))
    if (words.length > 0) ocrLines.push({ words })
  }
  if (page.content === 'mixed') return [...page.lines, ...ocrLines]
  return [...page.lines, ...ocrLines].sort(
    (a, b) => (a.words[0]?.region.y ?? 0) - (b.words[0]?.region.y ?? 0) || (a.words[0]?.region.x ?? 0) - (b.words[0]?.region.x ?? 0),
  )
}

async function runOcr(
  documents: ByRole<AnalyzedDocument>,
  limits: ComparisonLimits,
  budgetEnd: number,
  signal: AbortSignal | undefined,
  provided: OcrEngine | undefined,
): Promise<ByRole<Map<number, OcrOutcome>>> {
  const outcomes: ByRole<Map<number, OcrOutcome>> = { original: new Map(), updated: new Map() }
  const pending = roles.flatMap((role) => documents[role].pages.filter(needsOcr).map((page) => ({ role, page })))
  if (pending.length === 0) return outcomes
  if (!limits.ocr) {
    for (const { role, page } of pending) outcomes[role].set(page.pageNumber, { status: 'unavailable' })
    return outcomes
  }
  let engine = provided
  if (!engine) {
    const created = await createOcrEngine(limits.ocrLanguagePath || undefined)
    engine = created.engine
  }
  if (!engine) {
    for (const { role, page } of pending) outcomes[role].set(page.pageNumber, { status: 'unavailable' })
    return outcomes
  }
  const used: ByRole<number> = { original: 0, updated: 0 }
  try {
    for (const { role, page } of pending) {
      signal?.throwIfAborted()
      if (used[role] >= limits.ocrMaxPages) {
        outcomes[role].set(page.pageNumber, { status: 'skipped-limit' })
        continue
      }
      if (Date.now() > budgetEnd) {
        outcomes[role].set(page.pageNumber, { status: 'skipped-budget' })
        continue
      }
      used[role] += 1
      try {
        const pdfPage = await documents[role].pdf.getPage(page.pageNumber)
        try {
          const ocr = await engine.recognize(pdfPage)
          page.lines = mergeOcr(page, ocr, limits.ocrMinConfidence)
          outcomes[role].set(page.pageNumber, { status: 'done', confidence: ocr.confidence })
        } finally {
          pdfPage.cleanup()
        }
      } catch {
        outcomes[role].set(page.pageNumber, { status: 'failed' })
      }
    }
  } finally {
    if (!provided) await engine.close()
  }
  return outcomes
}

// ---------------------------------------------------------------------------------------------
// Texto

function pageFeatures(document: AnalyzedDocument, tokenized: TokenizedDocument): PageFeatures[] {
  const words = new Map<number, Map<string, number>>()
  const counts = new Map<number, number>()
  for (const token of tokenized.tokens) {
    const page = token.pieces[0]?.pageNumber ?? 1
    const bag = words.get(page) ?? new Map<string, number>()
    bag.set(token.key, (bag.get(token.key) ?? 0) + 1)
    words.set(page, bag)
    counts.set(page, (counts.get(page) ?? 0) + 1)
  }
  return document.pages.map((page) => {
    const features: PageFeatures = {
      pageNumber: page.pageNumber,
      words: words.get(page.pageNumber) ?? new Map(),
      wordCount: counts.get(page.pageNumber) ?? 0,
      ocr: page.lines.some((line) => line.words.some((word) => word.source === 'ocr')),
    }
    if (page.preview) {
      features.previewHash = page.preview.hash
      features.fingerprint = page.preview.fingerprint
    }
    return features
  })
}

function withPages(document: AnalyzedDocument, keep: (pageNumber: number) => boolean): AnalyzedDocument {
  return { ...document, pages: document.pages.filter((page) => keep(page.pageNumber)) }
}

function sideText(tokens: readonly Token[], all: readonly Token[], start: number, end: number): TextSide | undefined {
  const slice = tokens
  if (slice.length === 0) return undefined
  const regions = slice.flatMap((token) => token.pieces.map((piece) => piece.region))
  return {
    text: joinTokens(slice),
    surroundings: joinTokens(all.slice(Math.max(0, start - 3), Math.min(all.length, end + 3))),
    // Laço em vez de Math.min(...lista): um trecho pode ter centenas de milhares de palavras.
    top: regions.reduce((low, region) => Math.min(low, region.y), 1),
    bottom: regions.reduce((high, region) => Math.max(high, region.y + region.height), 0),
  }
}

const subtypeNotes: Partial<Record<Difference['subtype'], string>> = {
  money: 'Valor monetário alterado.',
  date: 'Data alterada.',
  identifier: 'Número de identificação alterado.',
  number: 'Número alterado.',
  'page-number': 'Numeração de página alterada (cabeçalho ou rodapé).',
}

function textDraft(hunk: Hunk, documents: ByRole<TokenizedDocument>, limits: ComparisonLimits, level: AlignmentLevel): Draft {
  const slices: ByRole<Token[]> = {
    original: documents.original.tokens.slice(hunk.original.start, hunk.original.end),
    updated: documents.updated.tokens.slice(hunk.updated.start, hunk.updated.end),
  }
  const hasOriginal = slices.original.length > 0
  const hasUpdated = slices.updated.length > 0
  const kind = hasOriginal && hasUpdated ? 'modification' : hasOriginal ? 'deletion' : 'addition'
  const subtype = classifyTextChange(
    sideText(slices.original, documents.original.tokens, hunk.original.start, hunk.original.end),
    sideText(slices.updated, documents.updated.tokens, hunk.updated.start, hunk.updated.end),
  )
  const all = [...slices.original, ...slices.updated]
  const methods: DetectionMethod[] = []
  if (all.some((token) => token.style.source === 'text-layer')) methods.push('text-layer')
  if (all.some((token) => token.style.source === 'ocr')) methods.push('ocr')
  const lowConfidence = all.some((token) => token.style.source === 'ocr' && (token.style.confidence ?? 0) < limits.ocrLowConfidence)
  const notes: string[] = []
  const subtypeNote = subtypeNotes[subtype]
  if (subtypeNote) notes.push(subtypeNote)
  if (methods.includes('ocr')) notes.push(lowConfidence ? 'Texto reconhecido por OCR com confiança baixa.' : 'Texto reconhecido por OCR.')
  if (level === 'linhas') notes.push('Documentos muito diferentes: comparados linha a linha.')
  if (level === 'paginas') notes.push('Documentos grandes demais para a comparação contínua: comparados página a página.')
  const draft = makeDraft({
    kind,
    category: 'text',
    subtype,
    evidence: lowConfidence ? 'needs-review' : 'direct',
    methods,
    notes,
    ocrOnly: all.length > 0 && all.every((token) => token.style.source === 'ocr'),
  })
  for (const role of roles) {
    const located = locationsOf(slices[role])
    if (located) {
      const side: DifferenceSide = { location: located.location, text: joinTokens(slices[role]) }
      if (located.continuedOn.length > 0) side.continuedOn = located.continuedOn
      draft[role] = side
    } else {
      const anchor = anchorAt(documents[role].tokens, hunk[role].start)
      if (anchor) draft.anchors = { ...draft.anchors, [role]: anchor }
    }
  }
  return draft
}

/** Uma exclusão e uma inclusão com exatamente as mesmas palavras viram um trecho movido. */
function pairMoves(drafts: Draft[], hunks: ReadonlyMap<Draft, { keys: string }>): Draft[] {
  const deletions = new Map<string, Draft[]>()
  for (const draft of drafts) {
    const info = hunks.get(draft)
    if (draft.kind === 'deletion' && info) deletions.set(info.keys, [...(deletions.get(info.keys) ?? []), draft])
  }
  const consumed = new Set<Draft>()
  const result: Draft[] = []
  for (const draft of drafts) {
    const info = hunks.get(draft)
    if (draft.kind !== 'addition' || !info) continue
    const match = deletions.get(info.keys)?.find((candidate) => !consumed.has(candidate))
    if (!match?.original || !draft.updated) continue
    consumed.add(match)
    consumed.add(draft)
    const moved = makeDraft({
      kind: 'move',
      category: 'text',
      subtype: 'words',
      evidence: match.evidence === 'needs-review' || draft.evidence === 'needs-review' ? 'needs-review' : 'direct',
      methods: [...new Set([...match.methods, ...draft.methods])],
      notes: ['Mesmo texto em outra posição do documento.'],
      original: match.original,
      updated: draft.updated,
    })
    result.push(moved)
  }
  return [...drafts.filter((draft) => !consumed.has(draft)), ...result]
}

interface TextComparison {
  drafts: Draft[]
  equalPairs: EqualPair[]
  level: AlignmentLevel
}

function compareText(documents: ByRole<TokenizedDocument>, limits: ComparisonLimits): TextComparison {
  const { hunks, level } = alignDocuments(documents.original, documents.updated, limits)
  const keysOf = new Map<Draft, { keys: string }>()
  const drafts: Draft[] = []
  const equalPairs: EqualPair[] = []
  let o = 0
  let u = 0
  const addEqualUntil = (endO: number) => {
    while (o < endO) {
      const original = documents.original.tokens[o]
      const updated = documents.updated.tokens[u]
      if (original && updated) {
        equalPairs.push({ original, updated, reflowed: false })
      }
      o += 1
      u += 1
    }
  }
  for (const hunk of hunks) {
    addEqualUntil(hunk.original.start)
    o = hunk.original.end
    u = hunk.updated.end
    const draft = textDraft(hunk, documents, limits, level)
    const span = hunk.original.end > hunk.original.start ? documents.original.tokens.slice(hunk.original.start, hunk.original.end) : documents.updated.tokens.slice(hunk.updated.start, hunk.updated.end)
    if (span.length >= MIN_MOVE_TOKENS) keysOf.set(draft, { keys: span.map((token) => token.key).join(' ') })
    drafts.push(draft)
  }
  addEqualUntil(documents.original.tokens.length)
  return { drafts: pairMoves(drafts, keysOf), equalPairs, level }
}

/**
 * Último recurso, quando nem a comparação por linhas cabe nos limites: cada par de páginas
 * correspondentes é comparado separadamente (o texto que mudou de página aparece como exclusão numa
 * e inclusão na outra). As páginas sem par entram inteiras.
 */
function compareTextByPages(
  subset: ByRole<AnalyzedDocument>,
  pairs: readonly { original: number; updated: number }[],
  limits: ComparisonLimits,
): TextComparison {
  const drafts: Draft[] = []
  const equalPairs: EqualPair[] = []
  const present = { original: new Set(subset.original.pages.map((page) => page.pageNumber)), updated: new Set(subset.updated.pages.map((page) => page.pageNumber)) }
  const paired = { original: new Set<number>(), updated: new Set<number>() }
  const groups: { original: number[]; updated: number[] }[] = []
  for (const pair of pairs) {
    if (!present.original.has(pair.original) || !present.updated.has(pair.updated)) continue
    groups.push({ original: [pair.original], updated: [pair.updated] })
    paired.original.add(pair.original)
    paired.updated.add(pair.updated)
  }
  const loneOriginal = [...present.original].filter((page) => !paired.original.has(page))
  const loneUpdated = [...present.updated].filter((page) => !paired.updated.has(page))
  for (const page of loneOriginal) groups.push({ original: [page], updated: [] })
  for (const page of loneUpdated) groups.push({ original: [], updated: [page] })
  for (const group of groups) {
    const documents = {
      original: tokenize(withPages(subset.original, (page) => group.original.includes(page))),
      updated: tokenize(withPages(subset.updated, (page) => group.updated.includes(page))),
    }
    let comparison: TextComparison
    try {
      comparison = compareText(documents, { ...limits, diffTimeoutMs: Math.min(limits.diffTimeoutMs, 2_000) })
    } catch {
      // Página impossível de alinhar dentro dos limites: entra inteira como alterada.
      const hunk: Hunk = { original: { start: 0, end: documents.original.tokens.length }, updated: { start: 0, end: documents.updated.tokens.length } }
      comparison = { drafts: [textDraft(hunk, documents, limits, 'paginas')], equalPairs: [], level: 'paginas' }
    }
    for (const draft of comparison.drafts) drafts.push(draft)
    for (const pair of comparison.equalPairs) equalPairs.push(pair)
  }
  return { drafts, equalPairs, level: 'paginas' }
}

// ---------------------------------------------------------------------------------------------
// Estrutura

/** Palavras de cada página (uma palavra hifenizada entre páginas aparece nas duas). */
function tokensByPage(tokens: readonly Token[]): Map<number, Token[]> {
  const byPage = new Map<number, Token[]>()
  for (const token of tokens) {
    for (const pageNumber of new Set(token.pieces.map((piece) => piece.pageNumber))) {
      const list = byPage.get(pageNumber) ?? []
      list.push(token)
      byPage.set(pageNumber, list)
    }
  }
  return byPage
}

function pageText(byPage: ReadonlyMap<number, readonly Token[]>, pageNumber: number): string {
  const tokens = (byPage.get(pageNumber) ?? []).filter((token) => token.pieces[0]?.pageNumber === pageNumber)
  const text = joinTokens(tokens)
  return text.length > PAGE_EXCERPT ? `${text.slice(0, PAGE_EXCERPT - 1).trimEnd()}…` : text
}

function sizeLabel(page: AnalyzedPage): string {
  const cm = (points: number) => ((points / 72) * 2.54).toFixed(1).replace('.', ',')
  const orientation = page.width > page.height ? 'paisagem' : 'retrato'
  return `${cm(page.width)} × ${cm(page.height)} cm (${orientation})`
}

function structureDrafts(
  matches: readonly PageMatch[],
  documents: ByRole<AnalyzedDocument>,
  tokenized: ByRole<ReadonlyMap<number, readonly Token[]>>,
): Draft[] {
  const drafts: Draft[] = []
  const page = (role: DocumentRole, pageNumber: number) => documents[role].pages[pageNumber - 1]
  // Página de referência no outro documento: a correspondente mais próxima antes desta posição.
  const anchorFor = (role: DocumentRole, index: number): number => {
    const other: DocumentRole = role === 'original' ? 'updated' : 'original'
    for (let cursor = index - 1; cursor >= 0; cursor -= 1) {
      const value = matches[cursor]?.[other]
      if (value !== undefined) return value
    }
    return 1
  }
  matches.forEach((match, index) => {
    if (match.relation === 'added' && match.updated !== undefined) {
      const text = pageText(tokenized.updated, match.updated)
      drafts.push(
        makeDraft({
          kind: 'addition',
          category: 'structure',
          subtype: 'page',
          evidence: 'direct',
          methods: ['structure'],
          notes: ['Página sem correspondente no documento original.'],
          updated: sideFromRects(match.updated, [FULL_PAGE], text),
          anchors: { original: { pageNumber: anchorFor('updated', index), region: { x: 0, y: 1, width: 1, height: 0 } } },
        }),
      )
    } else if (match.relation === 'removed' && match.original !== undefined) {
      const text = pageText(tokenized.original, match.original)
      drafts.push(
        makeDraft({
          kind: 'deletion',
          category: 'structure',
          subtype: 'page',
          evidence: 'direct',
          methods: ['structure'],
          notes: ['Página sem correspondente no documento atualizado.'],
          original: sideFromRects(match.original, [FULL_PAGE], text),
          anchors: { updated: { pageNumber: anchorFor('original', index), region: { x: 0, y: 1, width: 1, height: 0 } } },
        }),
      )
    } else if (match.relation === 'moved' && match.original !== undefined && match.updated !== undefined) {
      drafts.push(
        makeDraft({
          kind: 'move',
          category: 'structure',
          subtype: 'page',
          evidence: 'direct',
          methods: ['structure'],
          notes: [`Página ${match.original} do original corresponde à página ${match.updated} do atualizado, fora da ordem.`],
          original: sideFromRects(match.original, [FULL_PAGE], pageText(tokenized.original, match.original)),
          updated: sideFromRects(match.updated, [FULL_PAGE], pageText(tokenized.updated, match.updated)),
        }),
      )
    }
    if (match.original === undefined || match.updated === undefined) return
    const a = page('original', match.original)
    const b = page('updated', match.updated)
    if (!a || !b) return
    if (a.rotation !== b.rotation) {
      drafts.push(
        makeDraft({
          kind: 'modification',
          category: 'structure',
          subtype: 'page-rotation',
          evidence: 'direct',
          methods: ['structure'],
          notes: ['A rotação declarada da página mudou.'],
          original: sideFromRects(match.original, [FULL_PAGE], '', `Rotação de ${a.rotation}°, ${sizeLabel(a)}`),
          updated: sideFromRects(match.updated, [FULL_PAGE], '', `Rotação de ${b.rotation}°, ${sizeLabel(b)}`),
        }),
      )
    } else if (Math.abs(a.width - b.width) > 2 || Math.abs(a.height - b.height) > 2) {
      drafts.push(
        makeDraft({
          kind: 'modification',
          category: 'structure',
          subtype: 'page-size',
          evidence: 'direct',
          methods: ['structure'],
          notes: ['O tamanho da página mudou.'],
          original: sideFromRects(match.original, [FULL_PAGE], '', sizeLabel(a)),
          updated: sideFromRects(match.updated, [FULL_PAGE], '', sizeLabel(b)),
        }),
      )
    }
  })
  return drafts
}

// ---------------------------------------------------------------------------------------------
// Visual

interface VisualPairResult {
  status: 'analyzed' | 'not-analyzed'
  evidence?: PagePairEvidence
  shiftPixels?: number
}

async function renderPair(
  documents: ByRole<AnalyzedDocument>,
  pages: ByRole<AnalyzedPage>,
  limits: ComparisonLimits,
  rotation: number | undefined,
): Promise<ByRole<Raster>> {
  // Páginas digitalizadas (ou com imagens grandes) são comparadas com o dobro da resolução: um dígito
  // trocado num texto pequeno ocupa poucos pixels a 120 dpi.
  const detailed = [pages.original, pages.updated].some((page) => page.content === 'scanned' || page.content === 'mixed' || page.content === 'insufficient-text')
  const scale = (limits.visualWidth * (detailed ? 2 : 1)) / Math.max(pages.original.width, pages.updated.width, 1)
  const rasters: Partial<ByRole<Raster>> = {}
  for (const role of roles) {
    const pdfPage = await documents[role].pdf.getPage(pages[role].pageNumber)
    try {
      const options = rotation === undefined ? { scale } : { scale, rotation }
      rasters[role] = await renderPage(pdfPage, options)
    } finally {
      pdfPage.cleanup()
    }
  }
  return rasters as ByRole<Raster>
}

function wordRects(tokens: readonly Token[], pageNumber: number): NormalizedRect[] {
  return tokens.flatMap((token) => token.pieces.filter((piece) => piece.pageNumber === pageNumber).map((piece) => piece.region))
}

async function comparePagePairVisually(
  documents: ByRole<AnalyzedDocument>,
  pages: ByRole<AnalyzedPage>,
  tokens: ByRole<readonly Token[]>,
  equalPairs: readonly EqualPair[],
  limits: ComparisonLimits,
): Promise<VisualPairResult> {
  const pageNumbers = { original: pages.original.pageNumber, updated: pages.updated.pageNumber }
  const words = { original: wordRects(tokens.original, pageNumbers.original), updated: wordRects(tokens.updated, pageNumbers.updated) }
  const empty: PagePairEvidence = {
    pages: pageNumbers,
    pointSize: { x: 1 / Math.max(1, pages.original.width), y: 1 / Math.max(1, pages.original.height) },
    visualAnalyzed: true,
    regions: [],
    images: [],
    formatting: [],
    displaced: { original: [], updated: [] },
    words,
  }
  if (pages.original.preview && pages.original.preview.hash === pages.updated.preview?.hash && pages.original.rotation === pages.updated.rotation) {
    return { status: 'analyzed', evidence: empty }
  }

  const rotationMismatch = pages.original.rotation !== pages.updated.rotation
  const rasters = await renderPair(documents, pages, limits, rotationMismatch ? 0 : undefined)
  const scanned = [pages.original, pages.updated].some((page) => page.content === 'scanned' || page.content === 'insufficient-text')
  // Em digitalizações, manchas menores que ~1 mm (3 pt) de lado são sujeira, não conteúdo; e o mínimo
  // de pixels escala com a resolução, para valer a mesma área física da comparação normal.
  const pixelsPerPoint = rasters.original.width / pages.original.width
  const baseScale = limits.visualWidth / Math.max(pages.original.width, 1)
  const minRegionSide = scanned ? Math.round(3 * pixelsPerPoint) : 0
  const minRegionPixels = Math.round(MIN_REGION_PIXELS * (pixelsPerPoint / baseScale) ** 2)
  const diff = diffRasters(rasters.original, rasters.updated, undefined, { minRegionSide, minRegionPixels })
  let regions: VisualRegion[] = diff.regions
  if (rotationMismatch) {
    // Comparadas sem a rotação declarada; as regiões voltam para a orientação exibida de cada página.
    regions = regions.map((region) => ({
      ...region,
      original: rotateRect(region.original, pages.original.rotation),
      updated: rotateRect(region.updated, pages.updated.rotation),
    }))
    return { status: 'analyzed', evidence: { ...empty, regions }, shiftPixels: 0 }
  }

  const images = compareImages({
    original: { images: pages.original.objects.images, raster: rasters.original, widthPt: pages.original.width, heightPt: pages.original.height },
    updated: { images: pages.updated.objects.images, raster: rasters.updated, widthPt: pages.updated.width, heightPt: pages.updated.height },
    visualRegions: regions,
  })
  const formatting = compareFormatting({
    pairs: equalPairs,
    fonts: { original: pages.original.objects.fonts, updated: pages.updated.objects.fonts },
    rasters,
    visualRegions: regions,
  })
  // Palavras iguais que mudaram de lugar (descontado o deslocamento da página inteira, como numa
  // folha escaneada um pouco mais para o lado) explicam a mudança visual em volta delas.
  const globalX = diff.shift.dx / rasters.updated.width
  const globalY = diff.shift.dy / rasters.updated.height
  const displacedPairs = equalPairs.filter((pair) => {
    const a = pair.original.pieces[0]?.region
    const b = pair.updated.pieces[0]?.region
    const tolerance = POSITION_TOLERANCE / 2
    return a && b && (Math.abs(b.x - a.x - globalX) > tolerance || Math.abs(b.y - a.y - globalY) > tolerance)
  })
  return {
    status: 'analyzed',
    shiftPixels: Math.hypot(diff.shift.dx, diff.shift.dy),
    evidence: {
      ...empty,
      regions,
      images,
      formatting,
      displaced: {
        original: displacedPairs.flatMap((pair) => wordRects([pair.original], pageNumbers.original)),
        updated: displacedPairs.flatMap((pair) => wordRects([pair.updated], pageNumbers.updated)),
      },
    },
  }
}

/** Folga (pixels) em volta de cada trecho na reconferência. */
const CONFIRM_PADDING = 6

/**
 * Segunda passada, em resolução dobrada (≈ 240 dpi), só nos recortes das diferenças de texto deste
 * par de páginas que a comparação visual ainda não confirmou: um dígito trocado por outro de desenho
 * parecido muda poucos pixels a 120 dpi. O recorte do original é comparado com o do atualizado,
 * alinhados pelo canto; qualquer região que mude confirma a diferença.
 */
async function confirmAtHigherResolution(
  documents: ByRole<AnalyzedDocument>,
  pages: ByRole<AnalyzedPage>,
  textDrafts: readonly Draft[],
  discarded: ReadonlySet<Draft>,
  limits: ComparisonLimits,
): Promise<void> {
  const pending = textDrafts.filter(
    (draft) =>
      !discarded.has(draft) &&
      !draft.methods.has('visual') &&
      draft.original?.location.pageNumber === pages.original.pageNumber &&
      draft.updated?.location.pageNumber === pages.updated.pageNumber &&
      draft.original.location.region &&
      draft.updated.location.region,
  )
  if (pending.length === 0) return
  const rasters = await renderPair(documents, pages, { ...limits, visualWidth: limits.visualWidth * 2 }, undefined)
  for (const draft of pending) {
    const originalRegion = draft.original?.location.region
    const updatedRegion = draft.updated?.location.region
    if (!originalRegion || !updatedRegion) continue
    const a = cropRaster(rasters.original, originalRegion, CONFIRM_PADDING)
    const b = cropRaster(rasters.updated, updatedRegion, CONFIRM_PADDING)
    if (diffRasters(a, b, { dx: 0, dy: 0 }).regions.length > 0) {
      draft.methods.add('visual')
      if (draft.evidence === 'direct') draft.evidence = 'corroborated'
    }
  }
}

// ---------------------------------------------------------------------------------------------
// Contexto e ordem

function contextFor(
  draft: Draft,
  labels: ByRole<(string | null)[]>,
  tokenized: ByRole<TokenizedDocument>,
): string {
  if (draft.context) return draft.context
  const role: DocumentRole = draft.updated ? 'updated' : 'original'
  const location = draft[role]?.location ?? draft.anchors?.[role]
  if (!location) return pageLabel(1)
  // Centro do primeiro retângulo: a linha em que o trecho começa conta (o título pode estar nela).
  const first = location.regions?.[0] ?? location.region
  const y = first ? first.y + first.height / 2 : 0
  const lines = tokenized[role].lines
  let label: string | null = null
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]
    if (!line) continue
    if (line.pageNumber > location.pageNumber || (line.pageNumber === location.pageNumber && line.top > y)) break
    label = labels[role][index] ?? label
  }
  return label ?? pageLabel(location.pageNumber)
}

function textContext(draft: Draft, labels: ByRole<(string | null)[]>, tokenized: ByRole<TokenizedDocument>): string {
  return contextFor(draft, labels, tokenized)
}

/** Posição de leitura: página e altura no atualizado (ou a posição equivalente). */
function orderKey(draft: Draft, toUpdatedPage: (original: number) => number): [number, number, number] {
  const updated = draft.updated?.location ?? draft.anchors?.updated
  if (updated) return [updated.pageNumber, updated.region?.y ?? 0, updated.region?.x ?? 0]
  const original = draft.original?.location ?? draft.anchors?.original
  if (original) return [toUpdatedPage(original.pageNumber), original.region?.y ?? 0, original.region?.x ?? 0]
  return [0, 0, 0]
}

// ---------------------------------------------------------------------------------------------
// Cobertura

function textCoverage(page: AnalyzedPage, ocr: OcrOutcome | undefined, limits: ComparisonLimits): MethodCoverage {
  switch (page.content) {
    case 'blank':
    case 'graphics':
      return 'not-applicable'
    case 'uncertain':
      return 'not-analyzed'
    case 'text':
      return 'analyzed'
    case 'mixed':
      return 'analyzed'
    case 'scanned':
    case 'insufficient-text':
      if (ocr?.status === 'done') return (ocr.confidence ?? 0) < limits.ocrLowConfidence ? 'low-confidence' : 'analyzed'
      return 'not-analyzed'
  }
}

function textSourceOf(page: AnalyzedPage): PageAnalysis['textSource'] {
  const words = page.lines.flatMap((line) => line.words)
  const hasText = words.some((word) => word.source === 'text-layer')
  const hasOcr = words.some((word) => word.source === 'ocr')
  if (hasText && hasOcr) return 'text-layer+ocr'
  if (hasOcr) return 'ocr'
  return hasText ? 'text-layer' : 'none'
}

function pagesOf(list: readonly number[]): string {
  if (list.length <= 6) return list.join(', ')
  return `${list.slice(0, 6).join(', ')} e mais ${list.length - 6}`
}

const documentName: ByRole<string> = { original: 'original', updated: 'atualizado' }

// ---------------------------------------------------------------------------------------------

/**
 * Compara dois PDFs e devolve o resultado no formato público (`ComparisonResult`, formato 2).
 *
 * Etapas: validação → exame das páginas (texto, objetos, prévia, tipo de conteúdo) → OCR onde falta
 * texto → correspondência entre páginas → comparação do texto → estrutura → comparação visual,
 * imagens e formatação por par de páginas → consolidação → cobertura e ressalvas.
 * Recusa entradas problemáticas com `ComparisonFailure`; o cancelamento por `signal` interrompe entre etapas.
 */
export async function compareDocuments(
  input: Record<DocumentRole, SourceDocument>,
  options: CompareDocumentsOptions = {},
): Promise<ComparisonResult> {
  const { limits = defaultComparisonLimits, signal, onProgress, onTiming } = options
  const budgetEnd = Date.now() + limits.softBudgetMs
  let lap = performance.now()
  const timing = (stage: TimingStage) => {
    const now = performance.now()
    onTiming?.(stage, Math.round(now - lap))
    lap = now
  }

  onProgress?.({ stage: 'validating' })
  for (const role of roles) assertPdfBytes(input[role].bytes, role, limits)
  signal?.throwIfAborted()

  onProgress?.({ stage: 'extracting' })
  const original = await analyzeDocument(input.original.bytes, 'original', limits)
  let updated: AnalyzedDocument
  try {
    updated = await analyzeDocument(input.updated.bytes, 'updated', limits)
  } catch (error) {
    await original.close()
    throw error
  }
  const documents: ByRole<AnalyzedDocument> = { original, updated }
  timing('exame')

  try {
    signal?.throwIfAborted()
    const ocr = await runOcr(documents, limits, budgetEnd, signal, options.ocrEngine)
    signal?.throwIfAborted()
    timing('ocr')

    // Sem texto (nem por OCR) e sem comparação visual, não há como comparar o documento.
    if (!limits.visual) {
      for (const role of roles) {
        const characters = documents[role].pages.reduce((sum, page) => sum + countCharacters(page.lines), 0)
        if (characters < limits.minTextCharacters) throw new ComparisonFailure('sem-texto', role)
      }
    }

    onProgress?.({ stage: 'comparing' })
    const tokenizedAll: ByRole<TokenizedDocument> = { original: tokenize(original), updated: tokenize(updated) }
    const { matches } = matchPages(pageFeatures(original, tokenizedAll.original), pageFeatures(updated, tokenizedAll.updated))
    signal?.throwIfAborted()
    timing('correspondencia')

    const pairedRelations = new Set(['matched', 'ambiguous', 'moved'])
    const pairs = matches.filter(
      (match): match is PageMatch & { original: number; updated: number } =>
        pairedRelations.has(match.relation) && match.original !== undefined && match.updated !== undefined,
    )
    const pairKey = (a: number, b: number) => `${a}:${b}`
    const outOfStream: ByRole<Set<number>> = { original: new Set(), updated: new Set() }
    for (const match of matches) {
      if ((match.relation === 'removed' || match.relation === 'moved') && match.original !== undefined) outOfStream.original.add(match.original)
      if ((match.relation === 'added' || match.relation === 'moved') && match.updated !== undefined) outOfStream.updated.add(match.updated)
    }

    // Página "intacta": todas as palavras dos dois lados são iguais e pareadas entre si; só nela um
    // deslocamento de palavra é mudança de posição (nas outras, é refluxo do texto).
    const tokensPerPage = (tokens: readonly Token[]) => {
      const counts = new Map<number, number>()
      for (const token of tokens) counts.set(token.pieces[0]?.pageNumber ?? 0, (counts.get(token.pieces[0]?.pageNumber ?? 0) ?? 0) + 1)
      return counts
    }
    const pageTokenCounts = { original: tokensPerPage(tokenizedAll.original.tokens), updated: tokensPerPage(tokenizedAll.updated.tokens) }

    const textDrafts: Draft[] = []
    const equalPairs: EqualPair[] = []
    const levels = new Set<AlignmentLevel>()
    const runText = (subset: ByRole<AnalyzedDocument>) => {
      const tokenized = { original: tokenize(subset.original), updated: tokenize(subset.updated) }
      // Primeiro, conta os pares iguais por par de páginas; depois decide se cada página está intacta.
      let comparison: TextComparison
      try {
        comparison = compareText(tokenized, limits)
      } catch (error) {
        if (!(error instanceof ComparisonFailure) || error.reason !== 'comparacao-excedeu-limites') throw error
        comparison = compareTextByPages(subset, pairs, limits)
      }
      const equalPerPair = new Map<string, number>()
      for (const pair of comparison.equalPairs) {
        const key = pairKey(pair.original.pieces[0]?.pageNumber ?? 0, pair.updated.pieces[0]?.pageNumber ?? 0)
        equalPerPair.set(key, (equalPerPair.get(key) ?? 0) + 1)
      }
      for (const pair of comparison.equalPairs) {
        const a = pair.original.pieces[0]?.pageNumber ?? 0
        const b = pair.updated.pieces[0]?.pageNumber ?? 0
        const equal = equalPerPair.get(pairKey(a, b)) ?? 0
        pair.reflowed = !(equal === pageTokenCounts.original.get(a) && equal === pageTokenCounts.updated.get(b))
      }
      // Sem push(...lista): com documentos longos a lista estoura a pilha de chamadas.
      for (const draft of comparison.drafts) textDrafts.push(draft)
      for (const pair of comparison.equalPairs) equalPairs.push(pair)
      levels.add(comparison.level)
    }
    runText({
      original: withPages(original, (page) => !outOfStream.original.has(page)),
      updated: withPages(updated, (page) => !outOfStream.updated.has(page)),
    })
    for (const match of matches) {
      if (match.relation !== 'moved' || match.original === undefined || match.updated === undefined) continue
      const a = match.original
      const b = match.updated
      runText({ original: withPages(original, (page) => page === a), updated: withPages(updated, (page) => page === b) })
    }
    signal?.throwIfAborted()

    const pageTokens = { original: tokensByPage(tokenizedAll.original.tokens), updated: tokensByPage(tokenizedAll.updated.tokens) }
    const structural = structureDrafts(matches, documents, pageTokens)
    timing('texto')

    // Pares iguais agrupados por par de páginas uma vez só (filtrar a lista inteira a cada par de
    // páginas é quadrático e pesa em documentos longos).
    const equalByPair = new Map<string, EqualPair[]>()
    for (const item of equalPairs) {
      const key = pairKey(item.original.pieces[0]?.pageNumber ?? 0, item.updated.pieces[0]?.pageNumber ?? 0)
      const list = equalByPair.get(key) ?? []
      list.push(item)
      equalByPair.set(key, list)
    }

    // Comparação visual, imagens e formatação, par a par.
    const visualStatus: ByRole<Map<number, MethodCoverage>> = { original: new Map(), updated: new Map() }
    const extraDrafts: Draft[] = []
    const discarded = new Set<Draft>()
    let budgetHit = false
    let renderFailures: ByRole<number[]> = { original: [], updated: [] }
    for (const pair of pairs) {
      signal?.throwIfAborted()
      const pages = { original: original.pages[pair.original - 1], updated: updated.pages[pair.updated - 1] }
      if (!pages.original || !pages.updated) continue
      if (!limits.visual || !pages.original.preview || !pages.updated.preview) {
        visualStatus.original.set(pair.original, 'not-analyzed')
        visualStatus.updated.set(pair.updated, 'not-analyzed')
        if (limits.visual) {
          if (!pages.original.preview) renderFailures.original.push(pair.original)
          if (!pages.updated.preview) renderFailures.updated.push(pair.updated)
        }
        continue
      }
      if (Date.now() > budgetEnd) {
        budgetHit = true
        visualStatus.original.set(pair.original, 'not-analyzed')
        visualStatus.updated.set(pair.updated, 'not-analyzed')
        continue
      }
      const pairTokens = { original: pageTokens.original.get(pair.original) ?? [], updated: pageTokens.updated.get(pair.updated) ?? [] }
      const pairEqual = equalByPair.get(pairKey(pair.original, pair.updated)) ?? []
      let result: VisualPairResult
      try {
        result = await comparePagePairVisually(documents, { original: pages.original, updated: pages.updated }, pairTokens, pairEqual, limits)
      } catch {
        result = { status: 'not-analyzed' }
        renderFailures = { original: [...renderFailures.original, pair.original], updated: [...renderFailures.updated, pair.updated] }
      }
      visualStatus.original.set(pair.original, result.status)
      visualStatus.updated.set(pair.updated, result.status)
      if (result.evidence) {
        const outcome = consolidatePagePair(result.evidence, textDrafts)
        for (const draft of outcome.drafts) extraDrafts.push(draft)
        for (const draft of outcome.discarded) discarded.add(draft)
        if (pages.original.rotation === pages.updated.rotation && Date.now() <= budgetEnd) {
          await confirmAtHigherResolution(documents, { original: pages.original, updated: pages.updated }, textDrafts, discarded, limits)
        }
      }
    }
    // Texto de OCR em páginas que não foram comparadas visualmente continua, mas pede conferência.
    for (const draft of textDrafts) {
      if (draft.ocrOnly && !discarded.has(draft) && !draft.methods.has('visual') && draft.evidence === 'direct') {
        draft.evidence = 'needs-review'
        draft.notes.push('Diferença lida só por OCR, sem confirmação visual.')
      }
    }

    timing('visual')
    onProgress?.({ stage: 'organizing' })
    const drafts = [...textDrafts.filter((draft) => !discarded.has(draft)), ...structural, ...extraDrafts]
    const labels = { original: contextLabels(tokenizedAll.original.lines), updated: contextLabels(tokenizedAll.updated.lines) }
    const toUpdatedPage = (pageNumber: number) => {
      const match = matches.find((item) => item.original === pageNumber && item.updated !== undefined)
      if (match?.updated !== undefined) return match.updated
      const before = matches.filter((item) => item.original !== undefined && item.original < pageNumber && item.updated !== undefined).at(-1)
      return (before?.updated ?? 0) + 0.5
    }
    const ordered = drafts
      .map((draft) => ({ draft, key: orderKey(draft, toUpdatedPage) }))
      .sort((a, b) => a.key[0] - b.key[0] || a.key[1] - b.key[1] || a.key[2] - b.key[2])
    const differences = ordered.map(({ draft }, index) =>
      finalize(draft, `d-${String(index + 1).padStart(3, '0')}`, textContext(draft, labels, tokenizedAll)),
    )

    // Cobertura por página.
    const pageMatchOf = (role: DocumentRole, pageNumber: number) => matches.find((match) => match[role] === pageNumber)
    const analysisPages = {} as ByRole<PageAnalysis[]>
    for (const role of roles) {
      analysisPages[role] = documents[role].pages.map((page) => {
        const ocrOutcome = ocr[role].get(page.pageNumber)
        const relation = pageMatchOf(role, page.pageNumber)?.relation
        let visual: MethodCoverage = visualStatus[role].get(page.pageNumber) ?? 'not-applicable'
        if (relation === 'reflowed') {
          const hasGraphics = page.objects.images.length > 0 || page.content === 'graphics' || page.content === 'scanned'
          visual = hasGraphics ? 'not-analyzed' : 'not-applicable'
        }
        if (!limits.visual && (relation === 'matched' || relation === 'ambiguous' || relation === 'moved')) visual = 'not-analyzed'
        const analysis: PageAnalysis = {
          pageNumber: page.pageNumber,
          width: Math.round(page.width * 100) / 100,
          height: Math.round(page.height * 100) / 100,
          rotation: page.rotation,
          content: page.content,
          textSource: textSourceOf(page),
          text: textCoverage(page, ocrOutcome, limits),
          visual,
        }
        if (ocrOutcome?.confidence !== undefined) analysis.ocrConfidence = ocrOutcome.confidence
        return analysis
      })
    }

    // Ressalvas.
    const warnings: AnalysisWarning[] = []
    for (const role of roles) {
      const pagesWith = (predicate: (page: AnalyzedPage) => boolean) => documents[role].pages.filter(predicate).map((page) => page.pageNumber)
      const outcomes = [...ocr[role].entries()]
      const byStatus = (status: OcrOutcome['status']) => outcomes.filter(([, outcome]) => outcome.status === status).map(([page]) => page)
      const done = byStatus('done')
      if (done.length > 0) {
        warnings.push({
          code: 'OCR_USED',
          severity: 'caveat',
          document: role,
          pages: done,
          message: `Páginas ${pagesOf(done)} do documento ${documentName[role]} foram lidas por OCR; o texto reconhecido pode ter erros.`,
        })
      }
      const low = outcomes.filter(([, outcome]) => outcome.status === 'done' && (outcome.confidence ?? 0) < limits.ocrLowConfidence).map(([page]) => page)
      if (low.length > 0) {
        warnings.push({
          code: 'OCR_LOW_CONFIDENCE',
          severity: 'caveat',
          document: role,
          pages: low,
          message: `O OCR teve confiança baixa nas páginas ${pagesOf(low)} do documento ${documentName[role]}. Confira essas páginas.`,
        })
      }
      const missing = [...byStatus('unavailable'), ...byStatus('failed')].filter((pageNumber) => {
        const page = documents[role].pages[pageNumber - 1]
        return page?.content === 'scanned' || page?.content === 'insufficient-text'
      })
      if (missing.length > 0) {
        warnings.push({
          code: 'OCR_UNAVAILABLE',
          severity: 'limitation',
          document: role,
          pages: missing,
          message: `As páginas ${pagesOf(missing)} do documento ${documentName[role]} não têm texto extraível e o OCR não estava disponível: só a aparência foi comparada.`,
        })
      }
      const skipped = [...byStatus('skipped-limit'), ...byStatus('skipped-budget')]
      if (skipped.length > 0) {
        warnings.push({
          code: 'OCR_LIMIT_REACHED',
          severity: 'limitation',
          document: role,
          pages: skipped,
          message: `O limite de OCR foi atingido: as páginas ${pagesOf(skipped)} do documento ${documentName[role]} não tiveram o texto reconhecido.`,
        })
      }
      const mixedWithoutOcr = pagesWith((page) => page.content === 'mixed').filter((pageNumber) => ocr[role].get(pageNumber)?.status !== 'done')
      if (mixedWithoutOcr.length > 0) {
        warnings.push({
          code: 'IMAGE_TEXT_NOT_READ',
          severity: 'caveat',
          document: role,
          pages: mixedWithoutOcr,
          message: `As páginas ${pagesOf(mixedWithoutOcr)} do documento ${documentName[role]} têm imagens grandes cujo texto não foi lido; elas foram comparadas pela aparência.`,
        })
      }
      if (renderFailures[role].length > 0) {
        warnings.push({
          code: 'PAGE_RENDER_FAILED',
          severity: 'limitation',
          document: role,
          pages: [...new Set(renderFailures[role])],
          message: `Não foi possível desenhar as páginas ${pagesOf([...new Set(renderFailures[role])])} do documento ${documentName[role]}: a aparência delas não foi comparada.`,
        })
      }
      const columns = pagesWith((page) => page.readingOrder !== 'stream')
      if (columns.length > 0) {
        warnings.push({
          code: 'READING_ORDER_UNCERTAIN',
          severity: 'info',
          document: role,
          pages: columns,
          message: `As páginas ${pagesOf(columns)} do documento ${documentName[role]} têm colunas ou tabelas; o texto foi lido na ordem estimada pela posição.`,
        })
      }
    }
    const discardedCount = discarded.size
    if (discardedCount > 0) {
      warnings.push({
        code: 'OCR_NOISE_DISCARDED',
        severity: 'info',
        message: `${discardedCount} ${discardedCount === 1 ? 'divergência' : 'divergências'} do OCR sem nenhuma mudança visual no lugar ${discardedCount === 1 ? 'foi descartada' : 'foram descartadas'} como erro de reconhecimento.`,
      })
    }
    if (!limits.visual) {
      warnings.push({
        code: 'VISUAL_UNAVAILABLE',
        severity: 'limitation',
        message: 'A comparação visual está desligada neste servidor: imagens, desenhos e formatação não foram comparados.',
      })
    } else if (budgetHit) {
      const skippedPages = pairs.filter((pair) => visualStatus.updated.get(pair.updated) === 'not-analyzed').map((pair) => pair.updated)
      warnings.push({
        code: 'VISUAL_LIMIT_REACHED',
        severity: 'limitation',
        document: 'updated',
        pages: skippedPages,
        message: `O tempo da comparação acabou antes da comparação visual de todas as páginas: ${skippedPages.length} ${skippedPages.length === 1 ? 'página ficou' : 'páginas ficaram'} sem a comparação da aparência.`,
      })
    }
    const ambiguous = matches.filter((match) => match.relation === 'ambiguous')
    if (ambiguous.length > 0) {
      const list = ambiguous.map((match) => match.updated ?? 0)
      warnings.push({
        code: 'AMBIGUOUS_PAGE_MATCH',
        severity: 'caveat',
        document: 'updated',
        pages: list,
        message: `As páginas ${pagesOf(list)} do documento atualizado se repetem; a correspondência com o original é a mais provável pela ordem, não uma certeza.`,
      })
    }
    if (levels.has('paginas')) {
      warnings.push({
        code: 'TEXT_ALIGNED_BY_LINES',
        severity: 'caveat',
        message:
          'Os documentos são grandes ou diferentes demais para a comparação contínua do texto; ele foi comparado página a página, e texto que mudou de página aparece como exclusão numa página e inclusão na outra.',
      })
    } else if (levels.has('linhas')) {
      warnings.push({
        code: 'TEXT_ALIGNED_BY_LINES',
        severity: 'caveat',
        message: 'Os documentos são grandes ou diferentes demais para a comparação palavra a palavra; o texto foi comparado linha a linha.',
      })
    }
    const noText = roles.flatMap((role) =>
      analysisPages[role].filter((page) => page.text === 'not-analyzed').map((page) => ({ role, page: page.pageNumber })),
    )
    if (noText.length > 0 && !warnings.some((warning) => warning.code === 'OCR_UNAVAILABLE' || warning.code === 'OCR_LIMIT_REACHED')) {
      for (const role of roles) {
        const list = noText.filter((item) => item.role === role).map((item) => item.page)
        if (list.length === 0) continue
        warnings.push({
          code: 'PAGES_WITHOUT_TEXT',
          severity: 'limitation',
          document: role,
          pages: list,
          message: `O texto das páginas ${pagesOf(list)} do documento ${documentName[role]} não pôde ser lido.`,
        })
      }
    }

    timing('organizacao')
    return {
      formatVersion: COMPARISON_FORMAT_VERSION,
      id: randomUUID(),
      isDemonstration: false,
      documents: {
        original: { role: 'original', fileName: input.original.fileName, sizeBytes: input.original.bytes.byteLength, pageCount: original.pageCount },
        updated: { role: 'updated', fileName: input.updated.fileName, sizeBytes: input.updated.bytes.byteLength, pageCount: updated.pageCount },
      },
      summary: summarize(differences),
      differences,
      analysis: {
        status: analysisStatusOf(analysisPages, warnings),
        pages: analysisPages,
        pageMatches: matches,
        warnings,
        methods: { textLayer: true, visual: limits.visual, ocr: limits.ocr },
      },
    }
  } finally {
    await Promise.all([original.close(), updated.close()])
  }
}

