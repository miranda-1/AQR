import { describe, expect, it } from 'vitest'
import { comparisonConfig } from '@/config/comparison'
import { makeFile } from '@/test/files'
import { validatePdfFile } from './file-validation'

describe('validatePdfFile', () => {
  it('aceita um PDF com assinatura válida', async () => {
    await expect(validatePdfFile(makeFile('requerimento.pdf'))).resolves.toEqual({ ok: true })
  })

  it('aceita PDF sem tipo MIME informado pelo sistema', async () => {
    await expect(validatePdfFile(makeFile('requerimento.PDF', '%PDF-1.7', ''))).resolves.toEqual({ ok: true })
  })

  it('rejeita arquivo com outra extensão', async () => {
    const result = await validatePdfFile(makeFile('foto.png', 'x', 'image/png'))
    expect(result).toEqual({ ok: false, message: 'O arquivo precisa ser um PDF (extensão .pdf).' })
  })

  it('rejeita arquivo vazio', async () => {
    const result = await validatePdfFile(makeFile('vazio.pdf', ''))
    expect(result).toEqual({ ok: false, message: 'O arquivo está vazio.' })
  })

  it('rejeita arquivo acima do limite configurado', async () => {
    const file = makeFile('grande.pdf')
    Object.defineProperty(file, 'size', { value: comparisonConfig.maxFileSizeBytes + 1 })
    const result = await validatePdfFile(file)
    expect(result).toEqual({ ok: false, message: 'O arquivo excede o limite de 50 MB.' })
  })

  it('rejeita arquivo .pdf cujo conteúdo não é PDF', async () => {
    const result = await validatePdfFile(makeFile('falso.pdf', 'isto não é um pdf'))
    expect(result).toEqual({ ok: false, message: 'O conteúdo do arquivo não corresponde a um PDF válido.' })
  })
})
