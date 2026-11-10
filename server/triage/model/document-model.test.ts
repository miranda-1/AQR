import { nenhumModelo, propostaAncorada, type LeituraParaModelo, type PropostaCampo } from './document-model.ts'

const leitura: LeituraParaModelo = {
  anexoId: 'anexo-1',
  sha256: 'a'.repeat(64),
  paginas: [
    {
      pagina: 1,
      palavras: [
        { texto: 'Matrícula', regiao: { x: 0.1, y: 0.2, width: 0.12, height: 0.02 } },
        { texto: 'nº', regiao: { x: 0.23, y: 0.2, width: 0.03, height: 0.02 } },
        { texto: '90.417', regiao: { x: 0.27, y: 0.2, width: 0.08, height: 0.02 } },
        { texto: 'Lote', regiao: { x: 0.1, y: 0.5, width: 0.06, height: 0.02 } },
        { texto: 'F7', regiao: { x: 0.17, y: 0.5, width: 0.04, height: 0.02 } },
      ],
    },
  ],
}

const proposta = (extra: Partial<PropostaCampo>): PropostaCampo => ({
  anexoId: 'anexo-1',
  campo: 'matricula',
  valorBruto: '90.417',
  confianca: 0.9,
  pagina: 1,
  regioes: [{ x: 0.25, y: 0.19, width: 0.12, height: 0.04 }],
  ...extra,
})

describe('encaixe de modelo local', () => {
  it('nesta fase não há modelo: nenhuma proposta', async () => {
    expect(nenhumModelo.local).toBe(true)
    expect(await nenhumModelo.proporClasses(leitura)).toEqual([])
    expect(await nenhumModelo.proporCampos(leitura, ['matricula'])).toEqual([])
  })

  it('aceita só proposta cujo valor está no texto da região citada', () => {
    expect(propostaAncorada(proposta({}), leitura)).toBe(true)
    // Valor inventado, região errada, página errada, anexo errado ou sem região: recusada.
    expect(propostaAncorada(proposta({ valorBruto: '90.471' }), leitura)).toBe(false)
    expect(propostaAncorada(proposta({ regioes: [{ x: 0.1, y: 0.49, width: 0.12, height: 0.04 }] }), leitura)).toBe(false)
    expect(propostaAncorada(proposta({ pagina: 2 }), leitura)).toBe(false)
    expect(propostaAncorada(proposta({ anexoId: 'anexo-2' }), leitura)).toBe(false)
    expect(propostaAncorada(proposta({ regioes: [] }), leitura)).toBe(false)
    expect(propostaAncorada(proposta({ valorBruto: '  ' }), leitura)).toBe(false)
  })

  it('confere sem diferenciar maiúsculas nem espaços repetidos', () => {
    const lote = proposta({ campo: 'lote', valorBruto: 'lote  f7', regioes: [{ x: 0.09, y: 0.49, width: 0.15, height: 0.04 }] })
    expect(propostaAncorada(lote, leitura)).toBe(true)
  })
})
