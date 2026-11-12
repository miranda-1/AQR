import {
  chaveDeTexto,
  modalidadeDoAssunto,
  normalizarArea,
  normalizarCodigo,
  normalizarData,
  normalizarEscala,
  normalizarFormato,
  normalizarIdentificador,
  numeroBrasileiro,
} from './normalize.ts'

describe('normalização conservadora', () => {
  it('converte hectares em m² sem perder a grandeza nem a unidade original', () => {
    expect(normalizarArea('1,99 ha')).toMatchObject({ situacao: 'normalizado', valor: 19_900 })
    expect(normalizarArea('2,00 ha')).toMatchObject({ situacao: 'normalizado', valor: 20_000 })
    expect(normalizarArea('2,01 ha')).toMatchObject({ situacao: 'normalizado', valor: 20_100 })
    expect(normalizarArea('20.000,00 m²')).toMatchObject({ situacao: 'normalizado', valor: 20_000 })
    expect(normalizarArea('20.100,00 m2')).toMatchObject({ situacao: 'normalizado', valor: 20_100 })
    expect(normalizarArea('450,00 m²')).toMatchObject({ situacao: 'normalizado', valor: 450 })
    expect(normalizarArea('2,01 ha')?.descricao).toContain('ha')
  })

  it('recusa número sem forma brasileira clara e unidade ilegível, em vez de adivinhar', () => {
    expect(numeroBrasileiro('2.5')).toBeNull()
    expect(numeroBrasileiro('20.1000,00')).toBeNull()
    expect(normalizarArea('2.5 ha')).toBeNull()
    expect(normalizarArea('450,00 m?')).toBeNull()
    expect(normalizarArea('450,00')).toBeNull()
  })

  it('normaliza datas dia/mês/ano e não escolhe o século de ano com dois dígitos', () => {
    expect(normalizarData('03/04/2026')).toMatchObject({ situacao: 'normalizado', valor: '2026-04-03' })
    expect(normalizarData('12.05.2026')).toMatchObject({ situacao: 'normalizado', valor: '2026-05-12' })
    expect(normalizarData('03/04/26')).toEqual({ situacao: 'ambiguo', alternativas: ['2026-04-03', '1926-04-03'], descricao: expect.stringContaining('século') })
    expect(normalizarData('31/02/2026')).toBeNull()
    expect(normalizarData('12/05.2026')).toBeNull()
  })

  it('escala, formato e identificadores, preservando zeros à esquerda', () => {
    expect(normalizarEscala('1:10.000')).toMatchObject({ valor: 10_000 })
    expect(normalizarEscala('1/10.000')).toMatchObject({ valor: 10_000 })
    expect(normalizarEscala('1:10000')).toMatchObject({ valor: 10_000 })
    expect(normalizarEscala('1:500')).toMatchObject({ valor: 500 })
    expect(normalizarEscala('10.000')).toBeNull()
    expect(normalizarFormato('a3')).toMatchObject({ valor: 'A3' })
    expect(normalizarFormato('A5')).toBeNull()
    expect(normalizarIdentificador('012345')).toMatchObject({ valor: '012345' })
    expect(normalizarIdentificador('90.417')).toMatchObject({ valor: '90417' })
    expect(normalizarIdentificador('0101.0202.0303')).toMatchObject({ valor: '010102020303' })
    expect(normalizarCodigo('07')).toMatchObject({ valor: '07' })
    expect(normalizarCodigo('7')).toMatchObject({ valor: '7' })
    expect(normalizarCodigo('f7')).toMatchObject({ valor: 'F7' })
  })

  it('texto livre compara sem acento, caixa ou espaços; assunto vira modalidade só quando há uma', () => {
    expect(chaveDeTexto('  João   Exemplo. ')).toBe('joao exemplo')
    expect(modalidadeDoAssunto('DESDOBRO')).toBe('D')
    expect(modalidadeDoAssunto('Desdobro de lote')).toBe('D')
    expect(modalidadeDoAssunto('RETIFICAÇÃO DE REGISTRO IMOBILIÁRIO')).toBe('RET')
    expect(modalidadeDoAssunto('Desdobro e remembramento')).toBeNull()
    expect(modalidadeDoAssunto('Desdobramento')).toBeNull()
    expect(modalidadeDoAssunto('')).toBeNull()
  })
})
