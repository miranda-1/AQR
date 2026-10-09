import type { Difference, DifferenceKind, DocumentRole, NormalizedRect } from '../../model/types'

/** Destaque a desenhar numa página do PDF. */
export interface PageMark {
  diffId: string
  kind: DifferenceKind
  number: number
  /** "region": o trecho está nesta página. "anchor": o trecho só existe no outro documento. */
  type: 'region' | 'anchor'
  region: NormalizedRect | undefined
  /** Texto do trecho neste documento (vazio nos marcadores de posição). */
  text: string
}

/**
 * Agrupa por página os destaques de um documento, só das diferenças visíveis no filtro,
 * na ordem de leitura (de cima para baixo, da esquerda para a direita).
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
    const mark: PageMark = {
      diffId: difference.id,
      kind: difference.kind,
      number: numbers.get(difference.id) ?? 0,
      type: side ? 'region' : 'anchor',
      region: location.region,
      text: side?.text ?? '',
    }
    const list = pages.get(location.pageNumber) ?? []
    list.push(mark)
    pages.set(location.pageNumber, list)
  }
  for (const list of pages.values()) {
    list.sort((a, b) => (a.region?.y ?? 0) - (b.region?.y ?? 0) || (a.region?.x ?? 0) - (b.region?.x ?? 0))
  }
  return pages
}
