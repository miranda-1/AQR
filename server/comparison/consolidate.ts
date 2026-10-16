import type { DetectionMethod, DocumentRole, NormalizedRect } from '../../shared/contracts/comparison.ts'
import { makeDraft, rectsOf, sideFromRects, type Draft } from './drafts.ts'
import { expand, intersection } from './geometry.ts'
import type { ImageEvent } from './visual/images.ts'
import type { FormattingEvent } from './visual/formatting.ts'
import type { VisualRegion } from './visual/raster-diff.ts'

/**
 * Consolidação das evidências de um par de páginas correspondentes.
 *
 * Cada região em que a comparação visual achou mudança é explicada, nesta ordem, por:
 * 1. uma diferença de texto no mesmo lugar → a diferença de texto ganha o método "visual" e passa a
 *    "corroborada" (não vira uma segunda diferença);
 * 2. uma imagem incluída, excluída, trocada, movida ou redimensionada;
 * 3. uma mudança de formatação (fonte, tamanho, cor, posição);
 * 4. palavras iguais que mudaram de lugar (refluxo do texto depois de uma inclusão ou exclusão) →
 *    explicada, sem diferença própria;
 * 5. nada disso: vira diferença visual. Sobre texto inalterado, "aparência alterada" (conferir); fora
 *    do texto, elemento gráfico incluído, excluído ou alterado.
 *
 * Diferenças independentes nunca são fundidas só por estarem perto: só a região visual é absorvida.
 * Diferenças de texto lidas só por OCR, sem nenhuma mudança visual no lugar, são descartadas como
 * ruído de reconhecimento (a página foi comparada visualmente e nada mudou ali).
 */

/** Folga para considerar que uma região visual e um trecho estão no mesmo lugar. */
const TOUCH = 0.004
/** Tinta mínima (fração da região) para um lado ter conteúdo. */
const INK_PRESENT = 0.01

export interface PagePairEvidence {
  pages: Record<DocumentRole, number>
  /** A comparação visual rodou neste par (as regiões valem como evidência). */
  visualAnalyzed: boolean
  regions: readonly VisualRegion[]
  images: readonly ImageEvent[]
  formatting: readonly FormattingEvent[]
  /** Palavras iguais que mudaram de lugar (refluxo ou reposicionamento). */
  displaced: Record<DocumentRole, readonly NormalizedRect[]>
  /** Todas as palavras de cada página. */
  words: Record<DocumentRole, readonly NormalizedRect[]>
}

export interface PagePairOutcome {
  drafts: Draft[]
  /** Rascunhos de OCR sem mudança visual correspondente, a descartar. */
  discarded: Set<Draft>
}

function touches(rects: readonly NormalizedRect[], region: NormalizedRect): boolean {
  const padded = expand(region, TOUCH)
  return rects.some((rect) => intersection(expand(rect, TOUCH / 2), padded) > 0)
}

function draftRects(draft: Draft, role: DocumentRole, pageNumber: number): NormalizedRect[] {
  const fromSide = rectsOf(draft[role]).filter((entry) => entry.pageNumber === pageNumber).flatMap((entry) => entry.rects)
  const anchor = draft.anchors?.[role]
  if (anchor?.pageNumber === pageNumber && anchor.region) fromSide.push({ ...anchor.region, width: Math.max(anchor.region.width, 0.004) })
  return fromSide
}

function regionTouchesDraft(region: VisualRegion, draft: Draft, pages: Record<DocumentRole, number>): boolean {
  return (
    touches(draftRects(draft, 'original', pages.original), region.original) ||
    touches(draftRects(draft, 'updated', pages.updated), region.updated)
  )
}

const imageNotes: Record<string, string> = {
  image: 'Detectada pelos objetos do PDF.',
  'image-content': 'Aparência da imagem diferente.',
  'image-position': 'Mesma imagem em outra posição.',
  'image-size': 'Mesma imagem com outro tamanho.',
}

function imageDraft(event: ImageEvent, pages: Record<DocumentRole, number>, corroborated: boolean): Draft {
  const draft = makeDraft({
    kind: event.kind,
    category: 'image',
    subtype: event.subtype,
    evidence: corroborated ? 'corroborated' : 'direct',
    methods: corroborated ? ['objects', 'visual'] : ['objects'],
    notes: [imageNotes[event.subtype] ?? ''].filter(Boolean),
  })
  if (event.original) draft.original = sideFromRects(pages.original, [event.original], '', event.detail?.original)
  if (event.updated) draft.updated = sideFromRects(pages.updated, [event.updated], '', event.detail?.updated)
  if (!event.original && event.updated) draft.anchors = { original: { pageNumber: pages.original, region: event.updated } }
  if (!event.updated && event.original) draft.anchors = { updated: { pageNumber: pages.updated, region: event.original } }
  return draft
}

function formattingDraft(event: FormattingEvent, pages: Record<DocumentRole, number>): Draft {
  const methods: DetectionMethod[] = ['text-layer']
  if (event.subtype === 'font' || event.subtype === 'font-size') methods.push('objects')
  if (event.subtype === 'color') methods.push('visual')
  const draft = makeDraft({
    kind: event.subtype === 'text-position' ? 'move' : 'modification',
    category: 'formatting',
    subtype: event.subtype,
    evidence: 'direct',
    methods,
    notes: event.pageWide ? ['A mudança se repete em boa parte da página; os trechos foram agrupados.'] : [],
  })
  draft.original = sideFromRects(pages.original, event.originalRects, event.text, event.detail.original)
  draft.updated = sideFromRects(pages.updated, event.updatedRects, event.text, event.detail.updated)
  return draft
}

function visualDraft(region: VisualRegion, pages: Record<DocumentRole, number>, overText: boolean): Draft {
  const hasOriginal = region.inkOriginal >= INK_PRESENT
  const hasUpdated = region.inkUpdated >= INK_PRESENT
  const kind = hasOriginal && !hasUpdated ? 'deletion' : !hasOriginal && hasUpdated ? 'addition' : 'modification'
  const notes: string[] = ['Detectada só pela comparação visual das páginas.']
  if (overText) notes.push('A aparência mudou numa área com texto, sem mudança no texto extraído, na fonte ou no tamanho.')
  else if (kind === 'modification') notes.push('A causa da mudança não foi identificada por outro método.')
  const draft = makeDraft({
    kind,
    category: 'visual',
    subtype: 'graphic',
    // Inclusão ou exclusão de tinta é uma mudança clara; uma alteração sem causa conhecida pede conferência.
    evidence: kind === 'modification' ? 'needs-review' : 'direct',
    methods: ['visual'],
    notes,
  })
  if (kind !== 'addition') draft.original = sideFromRects(pages.original, [region.original])
  if (kind !== 'deletion') draft.updated = sideFromRects(pages.updated, [region.updated])
  if (kind === 'addition') draft.anchors = { original: { pageNumber: pages.original, region: region.original } }
  if (kind === 'deletion') draft.anchors = { updated: { pageNumber: pages.updated, region: region.updated } }
  return draft
}

/** Consolida as evidências de um par de páginas com os rascunhos de texto que tocam essas páginas. */
export function consolidatePagePair(evidence: PagePairEvidence, textDrafts: readonly Draft[]): PagePairOutcome {
  const { pages, regions } = evidence
  const drafts: Draft[] = []
  const discarded = new Set<Draft>()
  const onPages = textDrafts.filter(
    (draft) => draftRects(draft, 'original', pages.original).length > 0 || draftRects(draft, 'updated', pages.updated).length > 0,
  )
  const remaining = new Set(regions)

  // 1. Texto.
  for (const draft of onPages) {
    const matching = regions.filter((region) => regionTouchesDraft(region, draft, pages))
    if (matching.length > 0) {
      draft.methods.add('visual')
      if (draft.evidence === 'direct') draft.evidence = 'corroborated'
      for (const region of matching) remaining.delete(region)
    } else if (draft.ocrOnly && evidence.visualAnalyzed) {
      discarded.add(draft)
    }
  }

  // 2. Imagens.
  for (const event of evidence.images) {
    const matching = [...remaining].filter(
      (region) =>
        (event.original && touches([event.original], region.original)) || (event.updated && touches([event.updated], region.updated)),
    )
    for (const region of matching) remaining.delete(region)
    drafts.push(imageDraft(event, pages, matching.length > 0))
  }

  // 3. Formatação.
  for (const event of evidence.formatting) {
    const draft = formattingDraft(event, pages)
    const matching = [...remaining].filter((region) => touches(event.originalRects, region.original) || touches(event.updatedRects, region.updated))
    for (const region of matching) remaining.delete(region)
    if (matching.length > 0) {
      draft.methods.add('visual')
      draft.evidence = 'corroborated'
    }
    drafts.push(draft)
  }

  // 4. Refluxo: palavras iguais em outro lugar.
  for (const region of [...remaining]) {
    if (touches(evidence.displaced.original, region.original) || touches(evidence.displaced.updated, region.updated)) remaining.delete(region)
  }

  // 5. O que sobrou é diferença visual.
  for (const region of remaining) {
    const overText = touches(evidence.words.original, region.original) || touches(evidence.words.updated, region.updated)
    drafts.push(visualDraft(region, pages, overText))
  }
  return { drafts, discarded }
}
