import { relationLabels } from '../../model/describe'
import type { Difference, DifferenceCategory, DifferenceKind, DocumentRole, NormalizedRect, PageAnalysis, PageMatch } from '../../model/types'

/** Destaque a desenhar numa página do PDF. */
export interface PageMark {
  diffId: string
  kind: DifferenceKind
  category: DifferenceCategory
  number: number
  /** "region": o trecho está nesta página. "anchor": o trecho só existe no outro documento. */
  type: 'region' | 'anchor'
  /** Retângulo principal (rolagem e número). */
  region: NormalizedRect | undefined
  /** Demais partes do mesmo trecho nesta página (outras linhas ou colunas), só visuais. */
  parts: NormalizedRect[]
  /** Continuação de um trecho que começou em outra página: sem número próprio. */
  continuation: boolean
  /** Texto (ou descrição) do trecho neste documento, para leitores de tela. */
  text: string
}

function pushMark(pages: Map<number, PageMark[]>, pageNumber: number, mark: PageMark) {
  const list = pages.get(pageNumber) ?? []
  list.push(mark)
  pages.set(pageNumber, list)
}

/**
 * Agrupa por página os destaques de um documento, só das diferenças visíveis no filtro,
 * na ordem de leitura (de cima para baixo, da esquerda para a direita). Um trecho com várias partes
 * vira um destaque com o retângulo principal e as partes; um trecho que continua em outra página
 * ganha um destaque de continuação lá.
 */
export function marksByPage(
  differences: readonly Difference[],
  role: DocumentRole,
  numbers: ReadonlyMap<string, number>,
  visibleIds: ReadonlySet<string>,
): Map<number, PageMark[]> {
  const pages = new Map<number, PageMark[]>()
  for (const difference of differences) {
    if (!visibleIds.has(difference.id)) continue
    const side = difference[role]
    const location = side?.location ?? difference.anchors?.[role]
    if (!location) continue
    const base = {
      diffId: difference.id,
      kind: difference.kind,
      category: difference.category,
      number: numbers.get(difference.id) ?? 0,
      text: side ? side.text || side.detail || '' : '',
    }
    const rects = location.regions ?? []
    pushMark(pages, location.pageNumber, {
      ...base,
      type: side ? 'region' : 'anchor',
      region: rects[0] ?? location.region,
      parts: rects.slice(1),
      continuation: false,
    })
    for (const continued of side?.continuedOn ?? []) {
      const parts = continued.regions ?? (continued.region ? [continued.region] : [])
      pushMark(pages, continued.pageNumber, {
        ...base,
        type: 'region',
        region: parts[0],
        parts: parts.slice(1),
        continuation: true,
      })
    }
  }
  for (const list of pages.values()) {
    list.sort((a, b) => (a.region?.y ?? 0) - (b.region?.y ?? 0) || (a.region?.x ?? 0) - (b.region?.x ?? 0))
  }
  return pages
}

/** O que mostrar no canto da página: correspondência com o outro documento e cobertura. */
export interface PageInfo {
  /** Ex.: "Corresponde à p. 5 do original", "Página incluída". */
  relation?: string
  /** Ex.: "Texto lido por OCR", "Aparência não comparada". */
  notes: string[]
  /** A página tem algum método aplicável sem análise. */
  unanalyzed: boolean
}

const otherName: Record<DocumentRole, string> = { original: 'do atualizado', updated: 'do original' }

export function pageInfos(
  role: DocumentRole,
  pages: readonly PageAnalysis[] | undefined,
  matches: readonly PageMatch[] | undefined,
): Map<number, PageInfo> {
  const infos = new Map<number, PageInfo>()
  const other: DocumentRole = role === 'original' ? 'updated' : 'original'
  for (const match of matches ?? []) {
    const own = match[role]
    if (own === undefined) continue
    const counterpart = match[other]
    let relation: string | undefined
    if (match.relation === 'added' || match.relation === 'removed') relation = `Página ${relationLabels[match.relation].toLowerCase()}`
    else if (match.relation === 'reflowed') relation = 'Sem página correspondente: conteúdo redistribuído'
    else if (counterpart !== undefined && (counterpart !== own || match.relation !== 'matched')) {
      const prefix = match.relation === 'moved' ? 'Movida: corresponde' : match.relation === 'ambiguous' ? 'Provavelmente corresponde' : 'Corresponde'
      relation = `${prefix} à p. ${counterpart} ${otherName[role]}`
    }
    infos.set(own, { relation, notes: [], unanalyzed: false })
  }
  for (const page of pages ?? []) {
    const info = infos.get(page.pageNumber) ?? { notes: [], unanalyzed: false }
    if (page.textSource === 'ocr' || page.textSource === 'text-layer+ocr') {
      info.notes.push(page.text === 'low-confidence' ? 'Texto lido por OCR (confiança baixa)' : 'Texto lido por OCR')
    }
    if (page.text === 'not-analyzed') info.notes.push('Texto não lido')
    if (page.visual === 'not-analyzed') info.notes.push('Aparência não comparada')
    info.unanalyzed = page.text === 'not-analyzed' || page.visual === 'not-analyzed' || page.content === 'uncertain'
    infos.set(page.pageNumber, info)
  }
  return infos
}
