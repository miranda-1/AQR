import type { Difference } from './types'

/**
 * Modos de comparação. O servidor sempre devolve todas as diferenças; o modo só escolhe quais
 * aparecem, para a pessoa se concentrar no que procura.
 *
 * - Completo: tudo, com as ressalvas.
 * - Conteúdo: o que muda a informação — texto (inclusive OCR), páginas incluídas, excluídas ou
 *   movidas, imagens incluídas, excluídas ou trocadas, e elementos gráficos incluídos, excluídos ou
 *   alterados (carimbos, assinaturas, desenhos). Deixa de fora fonte, cor, tamanho e posição.
 * - Visual: a aparência — imagens (inclusive posição e tamanho), elementos gráficos, formatação do
 *   texto, tamanho e orientação das páginas, páginas incluídas, excluídas ou movidas. Deixa de fora
 *   as diferenças só de texto.
 *
 * Não há julgamento de relevância: a separação segue a categoria de cada diferença.
 */
export type ComparisonMode = 'complete' | 'content' | 'visual'

export const comparisonModes: readonly { value: ComparisonMode; label: string; description: string }[] = [
  { value: 'complete', label: 'Completo', description: 'Todas as diferenças encontradas.' },
  { value: 'content', label: 'Conteúdo', description: 'Texto, números, páginas, imagens e elementos incluídos ou excluídos.' },
  { value: 'visual', label: 'Visual', description: 'Imagens, desenhos, fontes, cores, tamanhos, posições e páginas.' },
]

const appearanceOnly = new Set<Difference['subtype']>(['image-position', 'image-size', 'page-size', 'page-rotation'])

export function inMode(difference: Difference, mode: ComparisonMode): boolean {
  if (mode === 'complete') return true
  if (mode === 'content') {
    if (difference.category === 'formatting') return false
    return !appearanceOnly.has(difference.subtype)
  }
  return difference.category !== 'text'
}
