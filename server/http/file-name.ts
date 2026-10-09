const MAX_LENGTH = 180
const FALLBACK = 'documento.pdf'

/**
 * Nome de arquivo seguro para exibir: sem pastas (evita "../"), sem caracteres de controle ou de
 * direção de texto, sem espaços sobrando e com tamanho limitado. O nome nunca é usado como caminho.
 */
export function sanitizeFileName(name: string | undefined): string {
  if (!name) return FALLBACK
  const base = name.split(/[/\\]/u).pop() ?? ''
  const clean = base
    .normalize('NFC')
    .replace(/[\p{Cc}\p{Cf}]/gu, '')
    .replace(/\s+/gu, ' ')
    .trim()
    .replace(/^\.+/u, '')
  if (!clean) return FALLBACK
  if (clean.length <= MAX_LENGTH) return clean
  const dot = clean.lastIndexOf('.')
  const extension = dot > 0 && clean.length - dot <= 10 ? clean.slice(dot) : ''
  return `${clean.slice(0, MAX_LENGTH - extension.length - 1)}…${extension}`
}
