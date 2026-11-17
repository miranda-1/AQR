/**
 * Normalização de palavras para a comparação. Só remove diferenças que não são de texto
 * (codificação, ligaduras, aspas e traços tipográficos, caracteres invisíveis). Maiúsculas,
 * acentos e pontuação continuam contando: em texto jurídico, "Art. 1º" e "art. 1º" diferem.
 */

/** Classe de caracteres a partir dos códigos (evita caracteres invisíveis no código-fonte). */
function charClass(...codes: number[]): RegExp {
  return new RegExp(`[${String.fromCodePoint(...codes)}]`, 'gu')
}

/** Hífen condicional, espaços de largura zero, junção de palavras e marca de ordem de bytes. */
const INVISIBLE = charClass(0xad, 0x200b, 0x200c, 0x200d, 0x2060, 0xfeff)
const SINGLE_QUOTES = charClass(0x2018, 0x2019, 0x201a, 0x201b, 0x2032)
const DOUBLE_QUOTES = charClass(0x201c, 0x201d, 0x201e, 0x201f, 0x2033, 0xab, 0xbb)
/** Hífens e travessões tipográficos (U+2010 a U+2015) e o sinal de menos. */
const DASHES = charClass(0x2010, 0x2011, 0x2012, 0x2013, 0x2014, 0x2015, 0x2212)

/** Chave de comparação de uma palavra. Vazia quando a palavra só tinha caracteres invisíveis. */
export function normalizeWord(text: string): string {
  return text
    .normalize('NFKC')
    .replace(INVISIBLE, '')
    .replace(SINGLE_QUOTES, "'")
    .replace(DOUBLE_QUOTES, '"')
    .replace(DASHES, '-')
    .replace(/\s+/gu, '')
}

/** Palavra quebrada no fim da linha ("requeri-"), candidata a ser unida à seguinte. */
export function endsWithLineBreakHyphen(text: string): boolean {
  return text.length > 1 && text.endsWith('-') && /\p{L}-$/u.test(text)
}

/** A continuação de uma palavra hifenizada começa com letra minúscula ("mento"). */
export function startsWithLowercase(text: string): boolean {
  return /^\p{Ll}/u.test(text)
}
