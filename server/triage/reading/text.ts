import type { NormalizedRect } from '../../../shared/contracts/comparison.ts'
import { unionRect } from '../../documents/geometry.ts'

/**
 * Texto lido de um anexo, no formato que a classificação e a extração usam: linhas com as palavras
 * e a posição de cada uma. Funciona igual para camada de texto, OCR, DOCX e DXF (estes dois sem
 * posição, porque o conteúdo não é desenhado nesta fase).
 */

export type OrigemTexto = 'camada-de-texto' | 'ocr' | 'docx' | 'dxf' | 'texto-simples'

export interface PalavraLida {
  texto: string
  /** Ausente quando o formato não tem página desenhada (DOCX, DXF, texto simples). */
  regiao?: NormalizedRect
  origem: OrigemTexto
  /** Confiança do OCR (0–100). */
  confianca?: number
}

export interface LinhaLida {
  pagina: number
  palavras: PalavraLida[]
  texto: string
}

/** Sem acento, minúsculas e espaços simples: só para procurar, nunca para mostrar ou guardar. */
export function dobrar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/\s+/gu, ' ')
    .trim()
}

/** Monta a linha. O texto fica em NFC, para que as posições de caractere valham em toda a triagem. */
export function linhaDe(pagina: number, palavras: PalavraLida[]): LinhaLida {
  const normalizadas = palavras.map((palavra) => ({ ...palavra, texto: palavra.texto.normalize('NFC') }))
  return { pagina, palavras: normalizadas, texto: normalizadas.map((palavra) => palavra.texto).join(' ') }
}

/** Linha sem posição (DOCX, DXF): uma "palavra" por termo separado por espaço. */
export function linhaSemPosicao(pagina: number, texto: string, origem: OrigemTexto): LinhaLida {
  const palavras = texto
    .split(/\s+/u)
    .filter((parte) => parte.length > 0)
    .map((parte): PalavraLida => ({ texto: parte, origem }))
  return linhaDe(pagina, palavras)
}

/**
 * Palavras da linha que formam o trecho `[inicio, fim)` do texto da linha (índices de caractere).
 * Usado para localizar a região exata de um valor.
 */
export function palavrasDoTrecho(linha: LinhaLida, inicio: number, fim: number): PalavraLida[] {
  const escolhidas: PalavraLida[] = []
  let cursor = 0
  for (const palavra of linha.palavras) {
    const comeco = cursor
    const termino = cursor + palavra.texto.length
    if (termino > inicio && comeco < fim) escolhidas.push(palavra)
    cursor = termino + 1
  }
  return escolhidas
}

/** Região que cobre as palavras (só as que têm posição). */
export function regiaoDe(palavras: readonly PalavraLida[]): NormalizedRect | undefined {
  return unionRect(palavras.flatMap((palavra) => (palavra.regiao ? [palavra.regiao] : [])))
}

/** Menor confiança de OCR entre as palavras (100 quando nenhuma veio de OCR). */
export function confiancaMinima(palavras: readonly PalavraLida[]): number {
  const valores = palavras.flatMap((palavra) => (palavra.origem === 'ocr' ? [palavra.confianca ?? 0] : []))
  return valores.length === 0 ? 100 : Math.min(...valores)
}

/** CPF e CNPJ mascarados (AQR-GCA-041): nada de documento pessoal completo em trecho de evidência. */
export function mascararDocumentos(texto: string): string {
  return texto
    .replace(/\b(\d{2})\.?\d{3}\.?\d{3}\/?\d{4}-?(\d{2})\b/gu, '$1.***.***/****-$2')
    .replace(/\b(\d{3})\.?\d{3}\.?\d{3}-?(\d{2})\b/gu, '$1.***.***-$2')
}

/** Trecho curto para evidência: mascarado e limitado. */
export function trechoDeEvidencia(texto: string, limite = 200): string {
  const mascarado = mascararDocumentos(texto.replace(/\s+/gu, ' ').trim())
  return mascarado.length <= limite ? mascarado : `${mascarado.slice(0, limite - 1)}…`
}
