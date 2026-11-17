import { classifyTextChange, type TextSide } from './classify.ts'

const side = (text: string, surroundings = text, top = 0.5): TextSide => ({ text, surroundings, top, bottom: top + 0.02 })

describe('classifyTextChange', () => {
  it('reconhece valores, datas, identificadores e números', () => {
    expect(classifyTextChange(side('15.000,00', 'valor de R$ 15.000,00 conforme'), side('18.000,00', 'valor de R$ 18.000,00 conforme'))).toBe('money')
    expect(classifyTextChange(side('10/03/2026', 'em 10/03/2026 pela'), side('02/06/2026', 'em 02/06/2026 pela'))).toBe('date')
    expect(classifyTextChange(side('4521/2026', 'processo nº 4521/2026'), side('4581/2026', 'processo nº 4581/2026'))).toBe('identifier')
    expect(classifyTextChange(side('12', 'de 12 unidades'), side('15', 'de 15 unidades'))).toBe('number')
  })

  it('numeração no rodapé é numeração de página', () => {
    expect(classifyTextChange(side('3', 'Página 1 de 3', 0.95), side('4', 'Página 1 de 4', 0.95))).toBe('page-number')
  })

  it('o resto é texto comum', () => {
    expect(classifyTextChange(side('omissos'), side('excepcionais'))).toBe('words')
    expect(classifyTextChange(undefined, side('simplificada'))).toBe('words')
  })
})
