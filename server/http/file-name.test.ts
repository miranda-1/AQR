import { sanitizeFileName } from './file-name.ts'

describe('sanitizeFileName', () => {
  it('mantém nomes comuns, com acentos', () => {
    expect(sanitizeFileName('Requerimento de licença.pdf')).toBe('Requerimento de licença.pdf')
  })

  it('remove pastas, inclusive tentativas de subir diretórios', () => {
    expect(sanitizeFileName('../../etc/passwd.pdf')).toBe('passwd.pdf')
    expect(sanitizeFileName('C:\\Users\\a\\contrato.pdf')).toBe('contrato.pdf')
    expect(sanitizeFileName('..')).toBe('documento.pdf')
  })

  it('remove caracteres de controle e de direção de texto', () => {
    const rightToLeft = String.fromCodePoint(0x202e)
    expect(sanitizeFileName(`fatura${rightToLeft}fdp.exe`)).toBe('faturafdp.exe')
    expect(sanitizeFileName(`a${String.fromCodePoint(0)}b.pdf`)).toBe('ab.pdf')
  })

  it('usa um nome padrão quando não sobra nada e limita o tamanho preservando a extensão', () => {
    expect(sanitizeFileName(undefined)).toBe('documento.pdf')
    expect(sanitizeFileName('   ')).toBe('documento.pdf')
    const long = sanitizeFileName(`${'a'.repeat(400)}.pdf`)
    expect(long.length).toBeLessThanOrEqual(180)
    expect(long.endsWith('.pdf')).toBe(true)
  })
})
