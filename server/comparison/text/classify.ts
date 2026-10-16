import type { DifferenceSubtype } from '../../../shared/contracts/comparison.ts'

/**
 * Subtipo de uma diferença de texto, pelo conteúdo dos dois lados. Só reconhece formas explícitas
 * (sem interpretar o sentido): valores com "R$" ou com centavos, datas numéricas ou por extenso,
 * números de documento e números isolados.
 */

const MONTHS = 'janeiro|fevereiro|março|marco|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro'
const MONEY = /R\$\s*\d|\b\d{1,3}(?:\.\d{3})*,\d{2}\b/u
const DATE = new RegExp(`\\b\\d{1,2}[/.-]\\d{1,2}[/.-]\\d{2,4}\\b|\\b\\d{1,2}\\s+de\\s+(?:${MONTHS})(?:\\s+de\\s+\\d{4})?|\\b\\d{4}-\\d{2}-\\d{2}\\b`, 'iu')
const IDENTIFIER =
  /\b(?:n[º°o.]|nº|n\.º|processo|protocolo|cpf|cnpj|matr[ií]cula|of[ií]cio|portaria|decreto|lei|resolu[çc][ãa]o|contrato|edital)\s*[:nº°.]*\s*\d|\b\d{2,}[./-]\d{2,}(?:[./-]\d{1,})+\b/iu
const NUMBER = /^[\d.,%º°/-]+$/u
const DIGIT = /\d/u

export interface TextSide {
  /** Texto do trecho alterado. */
  text: string
  /** Trecho com algumas palavras de contexto antes e depois (para reconhecer "R$" e afins). */
  surroundings: string
  /** Posição vertical do trecho na página (0 = topo). */
  top: number
  bottom: number
}

/** Zona de cabeçalho e rodapé (fração da altura da página). */
const MARGIN_ZONE = 0.08

function isInMargin(side: TextSide): boolean {
  return side.bottom <= MARGIN_ZONE || side.top >= 1 - MARGIN_ZONE
}

export function classifyTextChange(original: TextSide | undefined, updated: TextSide | undefined): DifferenceSubtype {
  const sides = [original, updated].filter((side): side is TextSide => side !== undefined)
  if (sides.length === 0) return 'words'
  const changedDigits = sides.some((side) => DIGIT.test(side.text))

  if (original && updated && sides.every(isInMargin) && sides.every((side) => NUMBER.test(side.text.replace(/\s+/gu, '')))) {
    return 'page-number'
  }
  if (changedDigits && sides.every((side) => MONEY.test(side.surroundings))) return 'money'
  if (changedDigits && sides.every((side) => DATE.test(side.surroundings))) return 'date'
  if (changedDigits && sides.every((side) => IDENTIFIER.test(side.surroundings))) return 'identifier'
  if (sides.every((side) => NUMBER.test(side.text.replace(/\s+/gu, '')) && DIGIT.test(side.text))) return 'number'
  return 'words'
}
