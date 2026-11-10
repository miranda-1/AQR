import { makeDocx, makeZip } from '../triage/corpus/zip.ts'
import { conteinerDisfarcado, detectarTipo, extensaoConfere, extensaoDe } from './file-type.ts'
import { hasSuspiciousCompression, isDangerousPath, listZipEntries, readZipEntry } from './zip.ts'

const bytes = (text: string) => new Uint8Array([...text].map((char) => char.charCodeAt(0)))
const DXF = '  0\nSECTION\n  2\nENTITIES\n  0\nENDSEC\n  0\nEOF\n'

describe('detecção do tipo real', () => {
  it('reconhece cada formato pela assinatura e estrutura', () => {
    expect(detectarTipo(new Uint8Array())).toMatchObject({ tipo: 'vazio' })
    expect(detectarTipo(bytes('%PDF-1.7\n'))).toMatchObject({ tipo: 'pdf', confianca: 'alta' })
    expect(detectarTipo(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toMatchObject({ tipo: 'jpeg', confianca: 'alta' })
    expect(detectarTipo(bytes('AC1032\0\0\0'))).toMatchObject({ tipo: 'dwg', confianca: 'alta', detalhe: 'DWG AC1032 (AutoCAD 2018)' })
    expect(detectarTipo(bytes(DXF))).toMatchObject({ tipo: 'dxf', confianca: 'alta' })
    expect(detectarTipo(new Uint8Array([0xef, 0xbb, 0xbf, ...bytes(DXF.replace(/\n/gu, '\r\n'))]))).toMatchObject({ tipo: 'dxf' })
    expect(detectarTipo(bytes('AutoCAD Binary DXF\r\n\x1a\x00rest'))).toMatchObject({ tipo: 'dxf', detalhe: 'DXF binário' })
    expect(detectarTipo(makeDocx(['texto']))).toMatchObject({ tipo: 'docx', confianca: 'alta' })
    expect(detectarTipo(makeZip([{ name: 'a.txt', data: 'a' }]))).toMatchObject({ tipo: 'zip', confianca: 'alta' })
    expect(detectarTipo(bytes('Rar!\x1a\x07\x00rest'))).toMatchObject({ tipo: 'rar' })
    expect(detectarTipo(bytes('Rar!\x1a\x07\x01\x00rest'))).toMatchObject({ tipo: 'rar' })
  })

  it('na dúvida, diz desconhecido', () => {
    expect(detectarTipo(bytes('texto qualquer'))).toEqual({ tipo: 'desconhecido', confianca: 'baixa', suspeitas: [] })
    expect(detectarTipo(bytes('  %PDF-1.7'))).toMatchObject({ tipo: 'desconhecido' })
    expect(detectarTipo(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0, 0x58, 0x58, 0x58, 0x58]))).toMatchObject({
      tipo: 'desconhecido',
      detalhe: 'assinatura PNG sem cabeçalho IHDR',
    })
    expect(detectarTipo(bytes('AC1099\0'))).toMatchObject({ tipo: 'desconhecido', detalhe: 'parece DWG, versão desconhecida (AC1099)' })
    // DXF sem o fim "0 / EOF" (truncado) não é aceito.
    expect(detectarTipo(bytes('  0\nSECTION\n  2\nENTITIES\n'))).toMatchObject({ tipo: 'desconhecido' })
  })

  it('qualquer ZIP não é DOCX: exige a estrutura e o tipo de conteúdo do Word', () => {
    const contentTypes = (type: string) =>
      `<Types><Override PartName="/word/document.xml" ContentType="${type}"/></Types>`
    const word = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml'
    const parts = (types: string, extra: { rels?: boolean; document?: boolean } = {}) =>
      makeZip([
        { name: '[Content_Types].xml', data: types },
        ...(extra.rels === false ? [] : [{ name: '_rels/.rels', data: '<Relationships/>' }]),
        ...(extra.document === false ? [] : [{ name: 'word/document.xml', data: '<w:document/>' }]),
      ])
    expect(detectarTipo(parts(contentTypes(word))).tipo).toBe('docx')
    // Mesmo nome de partes, mas modelo (.dotx) ou macro (.docm): não é DOCX.
    expect(detectarTipo(parts(contentTypes(word.replace('document.main', 'template.main')))).tipo).toBe('zip')
    expect(detectarTipo(parts(contentTypes('application/vnd.ms-word.document.macroEnabled.main+xml'))).tipo).toBe('zip')
    expect(detectarTipo(parts(contentTypes(word), { rels: false })).tipo).toBe('zip')
    expect(detectarTipo(parts(contentTypes(word), { document: false })).tipo).toBe('zip')
    expect(detectarTipo(makeZip([{ name: 'word/document.xml', data: '<w:document/>' }])).tipo).toBe('zip')
  })

  it('aponta conteúdo executável e ZIP perigoso ou ilegível', () => {
    expect(detectarTipo(bytes('MZ\x90\0'))).toMatchObject({ tipo: 'desconhecido', suspeitas: ['conteudo-executavel'] })
    expect(detectarTipo(bytes('\x7fELF\x02'))).toMatchObject({ suspeitas: ['conteudo-executavel'] })
    expect(detectarTipo(bytes('#!/bin/sh\n'))).toMatchObject({ suspeitas: ['conteudo-executavel'] })
    expect(detectarTipo(makeZip([{ name: '../../x', data: 'x' }])).suspeitas).toEqual(['zip-caminho-perigoso'])
    const truncated = makeZip([{ name: 'a.txt', data: 'a' }]).subarray(0, 40)
    expect(detectarTipo(truncated)).toMatchObject({ tipo: 'zip', confianca: 'baixa', suspeitas: ['zip-ilegivel'] })
  })

  it('confere a extensão sem confiar nela', () => {
    expect(extensaoDe('pasta/Memorial.Final.PDF')).toBe('pdf')
    expect(extensaoDe('.oculto')).toBe('')
    expect(extensaoDe('sem-extensao')).toBe('')
    expect(extensaoConfere('a.pdf', 'pdf')).toBe(true)
    expect(extensaoConfere('a.jpeg', 'jpeg')).toBe(true)
    expect(extensaoConfere('a.pdf', 'jpeg')).toBe(false)
    expect(extensaoConfere('a.xyz', 'pdf')).toBe('indeterminado')
    expect(extensaoConfere('a.pdf', 'vazio')).toBe('indeterminado')
    expect(conteinerDisfarcado('a.pdf', 'zip')).toBe(true)
    expect(conteinerDisfarcado('a.docx', 'zip')).toBe(false)
    expect(conteinerDisfarcado('a.zip', 'docx')).toBe(false)
    expect(conteinerDisfarcado('a.pdf', 'pdf')).toBe(false)
  })
})

describe('leitura defensiva de ZIP', () => {
  it('lista e lê entradas com limite de tamanho', () => {
    const zip = makeZip([
      { name: 'a.txt', data: 'conteúdo' },
      { name: 'b.bin', data: new Uint8Array(1000), store: true },
    ])
    const listing = listZipEntries(zip)
    if (!listing.ok) throw new Error(listing.reason)
    const [first, second] = listing.entries
    expect(listing.entries.map((entry) => entry.name)).toEqual(['a.txt', 'b.bin'])
    expect(new TextDecoder().decode(readZipEntry(zip, first ?? listing.entries[0] ?? never(), 100) ?? new Uint8Array())).toBe('conteúdo')
    expect(readZipEntry(zip, second ?? never(), 999)).toBeNull()
    expect(readZipEntry(zip, second ?? never(), 1000)?.byteLength).toBe(1000)
  })

  it('recusa entrada cifrada e diretório que aponta para fora do arquivo', () => {
    const zip = makeZip([{ name: 'a.txt', data: 'a' }])
    const listing = listZipEntries(zip)
    if (!listing.ok) throw new Error(listing.reason)
    expect(readZipEntry(zip, { ...(listing.entries[0] ?? never()), flags: 0x1 }, 100)).toBeNull()
    const broken = Buffer.from(zip)
    broken.writeUInt32LE(0xffffffff, broken.length - 6)
    expect(listZipEntries(new Uint8Array(broken))).toEqual({ ok: false, reason: 'zip64' })
    broken.writeUInt32LE(5000, broken.length - 6)
    expect(listZipEntries(new Uint8Array(broken))).toEqual({ ok: false, reason: 'diretorio-invalido' })
    expect(listZipEntries(new Uint8Array(10))).toEqual({ ok: false, reason: 'sem-diretorio' })
  })

  it('aponta caminho perigoso e compressão desproporcional', () => {
    for (const name of ['../x', 'a/../../x', '/etc/passwd', '\\windows', 'C:\\x', 'a\\..\\x']) expect(isDangerousPath(name), name).toBe(true)
    for (const name of ['a/b.txt', 'word/document.xml', 'a..b.txt']) expect(isDangerousPath(name), name).toBe(false)
    const bomb = makeZip([{ name: 'zeros.bin', data: new Uint8Array(12 * 1024 * 1024) }])
    const listing = listZipEntries(bomb)
    if (!listing.ok) throw new Error(listing.reason)
    expect(hasSuspiciousCompression(listing.entries)).toBe(true)
    expect(detectarTipo(bomb).suspeitas).toEqual(['zip-compressao-suspeita'])
  })
})

function never(): never {
  throw new Error('entrada ausente')
}
