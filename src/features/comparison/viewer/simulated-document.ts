import type { DifferenceKind } from '../model/types'

/**
 * Representação simplificada de um documento usada APENAS pelo protótipo
 * para desenhar páginas em HTML. Quando a comparação real existir, o
 * visualizador passará a desenhar as páginas do PDF e a destacar as regiões
 * informadas em `Difference.original/updated.location`.
 */
export type SimulatedSegment =
  | string
  | { diffId: string; kind: DifferenceKind; text: string }
  /** Marca a posição de um trecho que só existe no outro documento. */
  | { diffId: string; kind: DifferenceKind; placeholder: true }

export interface SimulatedBlock {
  type: 'title' | 'heading' | 'paragraph' | 'item' | 'signature'
  segments: SimulatedSegment[]
}

export interface SimulatedPage {
  pageNumber: number
  blocks: SimulatedBlock[]
}

export interface SimulatedDocument {
  pages: SimulatedPage[]
}
