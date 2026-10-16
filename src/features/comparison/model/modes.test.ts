import { describe, expect, it } from 'vitest'
import { describeDifference } from './describe'
import { inMode } from './modes'
import type { Difference } from './types'

const base: Difference = { id: 'd', kind: 'modification', category: 'text', subtype: 'words', context: 'x', methods: ['text-layer'], evidence: 'direct' }

describe('modos de comparação', () => {
  it('Conteúdo deixa de fora formatação e mudanças só de aparência', () => {
    expect(inMode(base, 'content')).toBe(true)
    expect(inMode({ ...base, category: 'formatting', subtype: 'font' }, 'content')).toBe(false)
    expect(inMode({ ...base, category: 'image', subtype: 'image-position', kind: 'move' }, 'content')).toBe(false)
    expect(inMode({ ...base, category: 'image', subtype: 'image', kind: 'addition' }, 'content')).toBe(true)
    expect(inMode({ ...base, category: 'structure', subtype: 'page', kind: 'deletion' }, 'content')).toBe(true)
  })

  it('Visual deixa de fora o texto e Completo mostra tudo', () => {
    expect(inMode(base, 'visual')).toBe(false)
    expect(inMode({ ...base, category: 'formatting', subtype: 'color' }, 'visual')).toBe(true)
    expect(inMode(base, 'complete')).toBe(true)
  })
})

describe('describeDifference', () => {
  it('descreve pelo subtipo e pelo tipo, sem inventar', () => {
    expect(describeDifference({ kind: 'modification', subtype: 'money' })).toBe('Valor monetário alterado.')
    expect(describeDifference({ kind: 'addition', subtype: 'image' })).toBe('Imagem incluída.')
    expect(describeDifference({ kind: 'move', subtype: 'page' })).toBe('Página movida.')
    expect(describeDifference({ kind: 'modification', subtype: 'font' })).toBe('Fonte alterada, sem mudança no texto.')
  })
})
