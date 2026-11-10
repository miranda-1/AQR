import { inflateRawSync } from 'node:zlib'

/**
 * Leitura defensiva de ZIP, só o necessário para reconhecer o tipo (ex.: DOCX) e apontar ZIP
 * suspeito. Nada é extraído para o disco. Lê o diretório central (não confia nos cabeçalhos
 * locais), limita a quantidade de entradas e o tamanho do que é descomprimido, e recusa ZIP64,
 * entradas cifradas e métodos de compressão diferentes de "armazenado" e "deflate".
 */

export interface ZipEntryInfo {
  name: string
  method: number
  flags: number
  compressedSize: number
  uncompressedSize: number
  localHeaderOffset: number
}

export type ZipListing =
  | { ok: true; entries: ZipEntryInfo[] }
  | { ok: false; reason: 'sem-diretorio' | 'diretorio-invalido' | 'zip64' | 'entradas-demais' }

const EOCD = 0x06054b50
const CENTRAL = 0x02014b50
const LOCAL = 0x04034b50
const MAX_COMMENT = 0xffff

export function listZipEntries(bytes: Uint8Array, options: { maxEntries?: number } = {}): ZipListing {
  const maxEntries = options.maxEntries ?? 5000
  const buffer = Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  if (buffer.length < 22) return { ok: false, reason: 'sem-diretorio' }
  // O fim do diretório central fica nos últimos 22 bytes, mais um comentário de até 64 KB.
  let end = -1
  for (let offset = buffer.length - 22; offset >= Math.max(0, buffer.length - 22 - MAX_COMMENT); offset -= 1) {
    if (buffer.readUInt32LE(offset) === EOCD) {
      end = offset
      break
    }
  }
  if (end < 0) return { ok: false, reason: 'sem-diretorio' }
  const count = buffer.readUInt16LE(end + 10)
  const size = buffer.readUInt32LE(end + 12)
  const start = buffer.readUInt32LE(end + 16)
  if (count === 0xffff || size === 0xffffffff || start === 0xffffffff) return { ok: false, reason: 'zip64' }
  if (count > maxEntries) return { ok: false, reason: 'entradas-demais' }
  if (start + size > end) return { ok: false, reason: 'diretorio-invalido' }

  const entries: ZipEntryInfo[] = []
  let offset = start
  for (let index = 0; index < count; index += 1) {
    if (offset + 46 > end || buffer.readUInt32LE(offset) !== CENTRAL) return { ok: false, reason: 'diretorio-invalido' }
    const nameLength = buffer.readUInt16LE(offset + 28)
    const extraLength = buffer.readUInt16LE(offset + 30)
    const commentLength = buffer.readUInt16LE(offset + 32)
    const next = offset + 46 + nameLength + extraLength + commentLength
    if (next > end) return { ok: false, reason: 'diretorio-invalido' }
    const entry: ZipEntryInfo = {
      name: buffer.toString('utf8', offset + 46, offset + 46 + nameLength),
      flags: buffer.readUInt16LE(offset + 8),
      method: buffer.readUInt16LE(offset + 10),
      compressedSize: buffer.readUInt32LE(offset + 20),
      uncompressedSize: buffer.readUInt32LE(offset + 24),
      localHeaderOffset: buffer.readUInt32LE(offset + 42),
    }
    if (entry.compressedSize === 0xffffffff || entry.uncompressedSize === 0xffffffff || entry.localHeaderOffset === 0xffffffff) {
      return { ok: false, reason: 'zip64' }
    }
    entries.push(entry)
    offset = next
  }
  return { ok: true, entries }
}

/**
 * Conteúdo de uma entrada, descomprimido até `maxBytes`. `null` quando não dá para ler com
 * segurança: cifrada, método não suportado, cabeçalho inválido, dados corrompidos ou maior que o limite.
 */
export function readZipEntry(bytes: Uint8Array, entry: ZipEntryInfo, maxBytes: number): Uint8Array | null {
  if (entry.flags & 0x1) return null
  if (entry.method !== 0 && entry.method !== 8) return null
  if (entry.uncompressedSize > maxBytes) return null
  const buffer = Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const offset = entry.localHeaderOffset
  if (offset + 30 > buffer.length || buffer.readUInt32LE(offset) !== LOCAL) return null
  const dataStart = offset + 30 + buffer.readUInt16LE(offset + 26) + buffer.readUInt16LE(offset + 28)
  const dataEnd = dataStart + entry.compressedSize
  if (dataEnd > buffer.length) return null
  const data = buffer.subarray(dataStart, dataEnd)
  if (entry.method === 0) return new Uint8Array(data)
  try {
    return new Uint8Array(inflateRawSync(data, { maxOutputLength: maxBytes }))
  } catch {
    return null
  }
}

/** Caminho que, ao extrair, sairia da pasta ou apontaria para fora dela. */
export function isDangerousPath(name: string): boolean {
  if (name.startsWith('/') || name.startsWith('\\') || /^[a-z]:/iu.test(name) || name.includes('\0')) return true
  return name.split(/[\\/]/u).some((segment) => segment === '..')
}

/** Descompressão desproporcional (bomba de ZIP): taxa muito alta numa entrada grande, ou total enorme. */
export function hasSuspiciousCompression(entries: readonly ZipEntryInfo[]): boolean {
  let total = 0
  for (const entry of entries) {
    total += entry.uncompressedSize
    if (entry.uncompressedSize > 10 * 1024 * 1024 && entry.uncompressedSize > entry.compressedSize * 100) return true
  }
  return total > 1024 * 1024 * 1024
}
