import type { TipoArquivo } from '../../shared/contracts/triage.ts'
import { hasSuspiciousCompression, isDangerousPath, listZipEntries, readZipEntry } from './zip.ts'

/**
 * Detecção conservadora do tipo real do arquivo, pelo conteúdo (nunca pelo nome). Só diz "pdf",
 * "jpeg", "png", "dxf", "dwg" ou "docx" quando a identificação é confiável; na dúvida, diz
 * "desconhecido". Um ZIP só é DOCX com a estrutura mínima do Word conferida. O conteúdo de DWG,
 * DXF e DOCX não é interpretado aqui.
 *
 * Também aponta suspeitas que pedem isolamento: conteúdo executável, contêiner com nome de outro
 * formato, ZIP com caminho perigoso, compressão desproporcional ou ilegível.
 */

export type MotivoIsolamento = 'conteudo-executavel' | 'conteiner-disfarcado' | 'zip-caminho-perigoso' | 'zip-compressao-suspeita' | 'zip-ilegivel'

export interface DeteccaoTipo {
  tipo: TipoArquivo
  /** `alta` só quando a assinatura e a estrutura mínima conferem. */
  confianca: 'alta' | 'baixa'
  /** Ex.: versão do DWG, motivo de "desconhecido". */
  detalhe?: string
  suspeitas: MotivoIsolamento[]
}

const startsWith = (bytes: Uint8Array, prefix: readonly number[], offset = 0) => prefix.every((byte, index) => bytes[offset + index] === byte)
const ascii = (text: string) => [...text].map((char) => char.charCodeAt(0))

/** Códigos de versão de DWG publicados (R10 a 2018+). Outros "AC10xx" não são aceitos como DWG. */
const DWG_VERSIONS: Record<string, string> = {
  AC1006: 'R10',
  AC1009: 'R11/R12',
  AC1012: 'R13',
  AC1014: 'R14',
  AC1015: '2000',
  AC1018: '2004',
  AC1021: '2007',
  AC1024: '2010',
  AC1027: '2013',
  AC1032: '2018',
}

const DOCX_MAIN = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml'
const MAX_CONTENT_TYPES = 1024 * 1024

function dxfLines(text: string): string[] {
  return text
    // BOM do UTF-8, lido como latin1.
    .replace(/^\u00EF\u00BB\u00BF/u, '')
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
}

/** DXF em texto: começa com o par "0 / SECTION" e termina com "0 / EOF". */
function isAsciiDxf(bytes: Uint8Array): boolean {
  const decoder = new TextDecoder('latin1')
  const head = dxfLines(decoder.decode(bytes.subarray(0, 4096)))
  if (head[0] !== '0' || head[1] !== 'SECTION') return false
  const tail = dxfLines(decoder.decode(bytes.subarray(Math.max(0, bytes.byteLength - 256))))
  return tail.at(-2) === '0' && tail.at(-1) === 'EOF'
}

function detectZip(bytes: Uint8Array): DeteccaoTipo {
  const listing = listZipEntries(bytes)
  if (!listing.ok) return { tipo: 'zip', confianca: 'baixa', detalhe: `ZIP ilegível (${listing.reason})`, suspeitas: ['zip-ilegivel'] }
  const suspeitas: MotivoIsolamento[] = []
  if (listing.entries.some((entry) => isDangerousPath(entry.name))) suspeitas.push('zip-caminho-perigoso')
  if (hasSuspiciousCompression(listing.entries)) suspeitas.push('zip-compressao-suspeita')
  const byName = new Map(listing.entries.map((entry) => [entry.name, entry]))
  const contentTypes = byName.get('[Content_Types].xml')
  const hasWordStructure = contentTypes && byName.has('_rels/.rels') && byName.has('word/document.xml')
  if (hasWordStructure && suspeitas.length === 0) {
    const xml = readZipEntry(bytes, contentTypes, MAX_CONTENT_TYPES)
    const text = xml ? new TextDecoder().decode(xml) : ''
    const declaresMain = new RegExp(`PartName="/word/document\\.xml"[^>]*ContentType="${DOCX_MAIN.replace(/[.+]/gu, '\\$&')}"`, 'u').test(text)
    if (declaresMain) return { tipo: 'docx', confianca: 'alta', suspeitas }
    return { tipo: 'zip', confianca: 'alta', detalhe: 'estrutura do Word sem o tipo de conteúdo de documento', suspeitas }
  }
  return { tipo: 'zip', confianca: 'alta', suspeitas }
}

export function detectarTipo(bytes: Uint8Array): DeteccaoTipo {
  if (bytes.byteLength === 0) return { tipo: 'vazio', confianca: 'alta', suspeitas: [] }
  if (startsWith(bytes, ascii('%PDF-'))) return { tipo: 'pdf', confianca: 'alta', suspeitas: [] }
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return { tipo: 'jpeg', confianca: 'alta', suspeitas: [] }
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return startsWith(bytes, ascii('IHDR'), 12)
      ? { tipo: 'png', confianca: 'alta', suspeitas: [] }
      : { tipo: 'desconhecido', confianca: 'baixa', detalhe: 'assinatura PNG sem cabeçalho IHDR', suspeitas: [] }
  }
  const version = new TextDecoder('latin1').decode(bytes.subarray(0, 6))
  if (/^AC\d{4}$/u.test(version)) {
    const release = DWG_VERSIONS[version]
    return release
      ? { tipo: 'dwg', confianca: 'alta', detalhe: `DWG ${version} (AutoCAD ${release})`, suspeitas: [] }
      : { tipo: 'desconhecido', confianca: 'baixa', detalhe: `parece DWG, versão desconhecida (${version})`, suspeitas: [] }
  }
  if (startsWith(bytes, ascii('AutoCAD Binary DXF\r\n\x1a\x00'))) return { tipo: 'dxf', confianca: 'alta', detalhe: 'DXF binário', suspeitas: [] }
  if (isAsciiDxf(bytes)) return { tipo: 'dxf', confianca: 'alta', detalhe: 'DXF em texto', suspeitas: [] }
  if (startsWith(bytes, ascii('PK\x03\x04')) || startsWith(bytes, ascii('PK\x05\x06'))) return detectZip(bytes)
  if (startsWith(bytes, ascii('Rar!\x1a\x07\x00')) || startsWith(bytes, ascii('Rar!\x1a\x07\x01\x00'))) return { tipo: 'rar', confianca: 'alta', suspeitas: [] }
  const executable =
    startsWith(bytes, ascii('MZ')) ||
    startsWith(bytes, [0x7f, 0x45, 0x4c, 0x46]) ||
    startsWith(bytes, [0xfe, 0xed, 0xfa, 0xce]) ||
    startsWith(bytes, [0xfe, 0xed, 0xfa, 0xcf]) ||
    startsWith(bytes, [0xce, 0xfa, 0xed, 0xfe]) ||
    startsWith(bytes, [0xcf, 0xfa, 0xed, 0xfe]) ||
    startsWith(bytes, ascii('#!'))
  if (executable) return { tipo: 'desconhecido', confianca: 'alta', detalhe: 'conteúdo executável', suspeitas: ['conteudo-executavel'] }
  return { tipo: 'desconhecido', confianca: 'baixa', suspeitas: [] }
}

/** Tipo que cada extensão promete. Extensão fora da lista não promete nada. */
const TIPO_DA_EXTENSAO: Record<string, TipoArquivo> = {
  pdf: 'pdf',
  jpg: 'jpeg',
  jpeg: 'jpeg',
  png: 'png',
  dxf: 'dxf',
  dwg: 'dwg',
  docx: 'docx',
  zip: 'zip',
  rar: 'rar',
}

/** Extensões de contêiner: nelas, um ZIP ou RAR não está disfarçado. */
const EXTENSOES_CONTEINER = new Set(['zip', 'rar', 'docx'])

export function extensaoDe(nome: string): string {
  const base = nome.split(/[\\/]/u).at(-1) ?? nome
  const ponto = base.lastIndexOf('.')
  return ponto <= 0 ? '' : base.slice(ponto + 1).toLowerCase()
}

/** A extensão corresponde ao conteúdo? `indeterminado` para extensão desconhecida ou arquivo vazio. */
export function extensaoConfere(nome: string, tipo: TipoArquivo): boolean | 'indeterminado' {
  const esperado = TIPO_DA_EXTENSAO[extensaoDe(nome)]
  if (esperado === undefined || tipo === 'vazio') return 'indeterminado'
  return esperado === tipo
}

/** Contêiner (ZIP, DOCX, RAR) com nome de formato que não é contêiner: pode esconder outra coisa. */
export function conteinerDisfarcado(nome: string, tipo: TipoArquivo): boolean {
  return (tipo === 'zip' || tipo === 'rar' || tipo === 'docx') && !EXTENSOES_CONTEINER.has(extensaoDe(nome))
}
