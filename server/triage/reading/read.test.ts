import { defaultComparisonLimits } from '../../comparison/limits.ts'
import { defaultImageLimits } from '../../documents/limits.ts'
import { defined } from '../../test/defined.ts'
import { gerarPacote } from '../corpus/generate.ts'
import { PACOTES } from '../corpus/pacotes.ts'
import { lerAnexo } from './read.ts'
import { mascararDocumentos, trechoDeEvidencia } from './text.ts'

const OPCOES = { limites: { reading: defaultComparisonLimits, image: defaultImageLimits }, ocrMinConfidence: 45 }

async function arquivo(pacoteId: string, nome: string): Promise<Uint8Array> {
  const pacote = await gerarPacote(defined(PACOTES.find((item) => item.id === pacoteId)))
  return defined(pacote.arquivos.find((item) => item.nome === nome)).bytes
}

describe('leitura de anexos da triagem', () => {
  it('lê PDF com camada de texto, com posição e tamanho da folha', async () => {
    const lido = await lerAnexo('anexo-1', 'prancha.pdf', await arquivo('DSD-01', 'prancha.pdf'), OPCOES)
    expect(lido.legibilidade).toBe('legivel')
    expect(lido.origemTexto).toBe('camada-de-texto')
    expect(lido.linhas.map((linha) => linha.texto)).toContain('Planta de situação - escala 1:10.000')
    expect(lido.paginas[0]).toMatchObject({ pagina: 1, conteudo: 'text', metodo: 'camada-de-texto' })
    expect(Math.round(lido.paginas[0]?.larguraPt ?? 0)).toBe(1191)
    const palavra = defined(lido.linhas.flatMap((linha) => linha.palavras).find((item) => item.texto === '1:10.000'))
    expect(palavra.regiao?.width).toBeGreaterThan(0)
  })

  it('vê a área de assinatura preenchida e a nitidamente vazia', async () => {
    const assinada = await lerAnexo('a', 'prancha.pdf', await arquivo('DSD-01', 'prancha.pdf'), OPCOES)
    const vazia = await lerAnexo('a', 'prancha.pdf', await arquivo('DSD-23', 'prancha.pdf'), OPCOES)
    expect(assinada.assinaturas.map((item) => [item.rotulo, item.situacao])).toEqual([['Assinatura do responsável técnico', 'preenchida']])
    expect(vazia.assinaturas.map((item) => item.situacao)).toEqual(['vazia'])
    expect(vazia.assinaturas[0]?.regiaoVerificada.height).toBeGreaterThan(0)
  })

  it('lê o texto de DOCX e de DXF sem inventar página nem região', async () => {
    const docx = await lerAnexo('a', 'memorial.docx', await arquivo('DSD-14', 'memorial.docx'), OPCOES)
    expect(docx.origemTexto).toBe('docx')
    expect(docx.linhas.map((linha) => linha.texto)).toContain('MEMORIAL DESCRITIVO')
    expect(docx.linhas.flatMap((linha) => linha.palavras).every((palavra) => palavra.regiao === undefined)).toBe(true)
    const dxf = await lerAnexo('a', 'prancha.dxf', await arquivo('DSD-01', 'prancha.dxf'), OPCOES)
    expect(dxf.legibilidade).toBe('nao-interpretado')
    expect(dxf.linhas.map((linha) => linha.texto)).toContain('LOTE F7 QUADRA 12')
  })

  it('não abre arquivo isolado e não lê arquivo corrompido, vazio ou protegido', async () => {
    const isolado = await lerAnexo('a', 'art.pdf', await arquivo('DSD-37', 'art.pdf'), OPCOES)
    expect([isolado.legibilidade, isolado.linhas.length, isolado.paginas.length]).toEqual(['isolado', 0, 0])
    expect((await lerAnexo('a', 'memorial.pdf', await arquivo('DSD-31', 'memorial.pdf'), OPCOES)).legibilidade).toBe('ilegivel')
    expect((await lerAnexo('a', 'matricula.pdf', await arquivo('DSD-32', 'matricula.pdf'), OPCOES)).falha).toBe('protegido-por-senha')
    expect((await lerAnexo('a', 'ficha.pdf', new Uint8Array(), OPCOES)).falha).toBe('vazio')
  })

  it('reconhece texto simples com extensão de CAD como texto, não como desenho', async () => {
    const lido = await lerAnexo('a', 'prancha.dwg', await arquivo('DSD-36', 'prancha.dwg'), OPCOES)
    expect([lido.inspecao.tipoReal, lido.origemTexto]).toEqual(['desconhecido', 'texto-simples'])
  })

  it('mascara CPF e CNPJ no trecho de evidência', () => {
    expect(mascararDocumentos('CPF 123.456.789-09 e CNPJ 12.345.678/0001-95')).toBe('CPF 123.***.***-09 e CNPJ 12.***.***/****-95')
    expect(trechoDeEvidencia('a'.repeat(300), 50)).toHaveLength(50)
  })
})
