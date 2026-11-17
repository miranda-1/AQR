import type { TokenLine } from './text/tokenize.ts'

/**
 * Rótulo curto que situa uma diferença no documento ("Art. 5º, § 1º", "Cláusula Terceira",
 * "2.1 Do objeto"). Vem do último título encontrado antes do trecho; sem título, "Página N".
 */

const MAX_LABEL = 60

const ARTICLE = /^(art(?:igo)?\.?\s*\d+[º°o]?(?:-[A-Z])?)/iu
const PARAGRAPH = /^(§\s*\d+[º°o]?|par[áa]grafo\s+[úu]nico)/iu
const NAMED_SECTION = /^((?:cl[áa]usula|cap[íi]tulo|se[çc][ãa]o|t[íi]tulo|anexo)\s+[\p{L}\d]+)/iu
const NUMBERED_HEADING = /^\d+(?:\.\d+)*[.)]?\s+\S/u

function truncate(text: string): string {
  return text.length > MAX_LABEL ? `${text.slice(0, MAX_LABEL - 1).trimEnd()}…` : text
}

function isUppercaseHeading(text: string): boolean {
  const letters = text.match(/\p{L}/gu) ?? []
  return letters.length >= 3 && text.length <= 80 && text === text.toLocaleUpperCase('pt-BR')
}

/** Para cada linha, o rótulo do título mais recente até ela (inclusive), ou `null`. */
export function contextLabels(lines: readonly TokenLine[]): (string | null)[] {
  let section: string | null = null
  let article: string | null = null
  let paragraph: string | null = null

  return lines.map((line) => {
    const text = line.text.trim()
    const articleMatch = ARTICLE.exec(text)
    const paragraphMatch = PARAGRAPH.exec(text)
    const sectionMatch = NAMED_SECTION.exec(text)

    if (articleMatch?.[1]) {
      article = articleMatch[1].replace(/\s+/gu, ' ')
      paragraph = null
    } else if (paragraphMatch?.[1]) {
      paragraph = paragraphMatch[1].replace(/\s+/gu, ' ')
    } else if (sectionMatch?.[1]) {
      section = truncate(sectionMatch[1])
      article = null
      paragraph = null
    } else if ((NUMBERED_HEADING.test(text) && text.length <= 80) || isUppercaseHeading(text)) {
      section = truncate(text)
      article = null
      paragraph = null
    }

    if (article) return truncate(paragraph ? `${article}, ${paragraph}` : article)
    return paragraph ?? section
  })
}

export function pageLabel(pageNumber: number): string {
  return `Página ${pageNumber}`
}
