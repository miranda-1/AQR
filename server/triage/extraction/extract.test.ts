import type { CampoExtraido, NomeCampo } from '../../../shared/contracts/triage.ts'
import { campoExtraidoSchema } from '../../../shared/contracts/triage.ts'
import { defaultComparisonLimits } from '../../comparison/limits.ts'
import { defaultImageLimits } from '../../documents/limits.ts'
import { defined } from '../../test/defined.ts'
import { makePdf } from '../../test/make-pdf.ts'
import { classificarAnexo } from '../classification/classify.ts'
import { lerAnexo, type AnexoLido } from '../reading/read.ts'
import { linhaDe, type PalavraLida } from '../reading/text.ts'
import { compararCampo } from './compare.ts'
import { extrairCampos, type CampoDetalhado } from './extract.ts'

const OPCOES = { limites: { reading: defaultComparisonLimits, image: defaultImageLimits }, ocrMinConfidence: 45 }

async function extrair(paginas: string[][], nome = 'anexo.pdf', id = 'anexo-1'): Promise<CampoDetalhado[]> {
  const { bytes } = await makePdf(paginas)
  const lido = await lerAnexo(id, nome, bytes, OPCOES)
  return extrairCampos(lido, classificarAnexo(lido))
}

const campo = (campos: readonly CampoDetalhado[], nome: NomeCampo): CampoExtraido => defined(campos.find((item) => item.contrato.campo === nome), nome).contrato

/** Anexo lido por OCR, montado à mão para controlar a confiança de cada palavra. */
function anexoOcr(linhas: [string, number][][], legibilidade: AnexoLido['legibilidade'] = 'legivel'): AnexoLido {
  return {
    id: 'anexo-ocr',
    nome: 'digitalizado.jpg',
    inspecao: {
      nome: 'digitalizado.jpg',
      extensao: 'jpg',
      sha256: 'a'.repeat(64),
      bytes: 10,
      tipoReal: 'jpeg',
      confiancaTipo: 'alta',
      extensaoConfere: true,
      integridade: 'legivel',
      isolamento: { isolado: false, motivos: [] },
    },
    paginas: [{ pagina: 1, conteudo: 'scanned', metodo: 'ocr', confiancaOcr: 80, rotacao: 0 }],
    linhas: linhas.map((palavras, indice) =>
      linhaDe(
        1,
        palavras.map(([texto, confianca], coluna): PalavraLida => ({
          texto,
          confianca,
          origem: 'ocr',
          regiao: { x: 0.05 + coluna * 0.08, y: 0.05 + indice * 0.04, width: 0.07, height: 0.02 },
        })),
      ),
    ),
    origemTexto: 'ocr',
    legibilidade,
    confiancaOcr: 80,
    assinaturas: [],
  }
}

const MATRICULA_OCR = (confiancaNumero: number): [string, number][][] => [
  [['CERTIDÃO', 95], ['DE', 95], ['INTEIRO', 95], ['TEOR', 95], ['-', 95], ['MATRÍCULA', 95], ['Nº', 95], ['90417', confiancaNumero]],
  [['Serviço', 95], ['Registral', 95], ['Fictício', 95]],
]

describe('extração de campos', () => {
  it('preserva o valor como está, registra a normalização à parte e aponta a origem', async () => {
    const campos = await extrair([['CERTIDÃO DE INTEIRO TEOR - MATRÍCULA Nº 090417', 'Imóvel: lote 07 da quadra 03 do Jardim Ficticio, com área de 2,01 ha.', 'Certidão emitida em 03/04/2026.']])
    const area = campo(campos, 'area')
    expect([area.estado, area.valorBruto, area.valorNormalizado, area.unidade]).toEqual(['encontrado', '2,01 ha', 20_100, 'm2'])
    expect(defined(campos.find((item) => item.contrato.campo === 'area')).normalizacao).toContain('ha')
    const evidencia = defined(area.evidencias[0])
    expect([evidencia.anexoId, evidencia.pagina, evidencia.origem]).toEqual(['anexo-1', 1, 'camada-de-texto'])
    expect(evidencia.regioes?.[0]?.width).toBeGreaterThan(0)
    expect(evidencia.trecho).toContain('2,01 ha')
    // Zeros à esquerda ficam.
    expect([campo(campos, 'matricula').valorBruto, campo(campos, 'matricula').valorNormalizado]).toEqual(['090417', '090417'])
    expect(campo(campos, 'lote').valorBruto).toBe('07')
    expect(campo(campos, 'data-emissao').valorNormalizado).toBe('2026-04-03')
    expect(campo(campos, 'parcelamento').valorBruto).toBe('Jardim Ficticio')
  })

  it('corta o valor no rótulo seguinte da mesma linha', async () => {
    const campos = await extrair([['REQUERIMENTO', 'Assunto: DESDOBRO', 'Parcelamento: Jardim Ficticio   Bairro: Bairro Exemplo', 'Lote: F7   Quadra: 12']])
    expect(campo(campos, 'parcelamento').valorBruto).toBe('Jardim Ficticio')
    expect(campo(campos, 'bairro').valorBruto).toBe('Bairro Exemplo')
    expect([campo(campos, 'lote').valorBruto, campo(campos, 'quadra').valorBruto]).toEqual(['F7', '12'])
  })

  it('não toma "área do lote" por número de lote', async () => {
    const campos = await extrair([['PRANCHA - DESDOBRO', 'Lote: 07   Quadra: 03', 'Área do lote: 600,00 m²']])
    expect(campo(campos, 'lote')).toMatchObject({ estado: 'encontrado', valorBruto: '07' })
  })

  it('data com ano de dois dígitos fica com as leituras possíveis e sem valor normalizado', async () => {
    const data = campo(await extrair([['CERTIDÃO DE INTEIRO TEOR - MATRÍCULA Nº 1', 'Certidão emitida em 03/04/26.']]), 'data-emissao')
    expect(data).toMatchObject({ estado: 'encontrado', valorBruto: '03/04/26', alternativas: ['2026-04-03', '1926-04-03'] })
    expect(data.valorNormalizado).toBeUndefined()
    expect(data.confianca).toBeLessThanOrEqual(0.5)
  })

  it('valores diferentes no mesmo anexo viram "vários valores", sem escolher', async () => {
    const matricula = campo(await extrair([['MEMORIAL DESCRITIVO', 'Imóvel: matrícula 90417.', 'Confrontações conforme matrícula 90471.']]), 'matricula')
    expect(matricula.estado).toBe('varios-valores')
    expect(matricula.alternativas).toEqual(['90417', '90471'])
    expect(matricula.valorBruto).toBeUndefined()
  })

  it('não escolhe o titular atual entre os nomes dos atos da matrícula', async () => {
    const titular = campo(
      await extrair([['REGISTRO DE IMÓVEIS FICTÍCIO', 'MATRÍCULA 012345', 'R-1: imóvel transmitido a Ana Antiga Ficticia por compra e venda.', 'R-2: imóvel transmitido a Marta Exemplar Inventada por compra e venda.']]),
      'titular',
    )
    expect(titular.estado).toBe('varios-valores')
    expect(titular.alternativas).toEqual(['Ana Antiga Ficticia', 'Marta Exemplar Inventada'])
  })

  it('proprietário, procurador e responsável técnico são campos diferentes', async () => {
    const requerimento = await extrair([
      ['REQUERIMENTO', 'Proprietário(a): Carla Ficticia', 'Responsável técnico: João Exemplo - CREA-FIC 000001', 'Assina este requerimento: Paula Procuradora, na qualidade de procuradora.'],
    ])
    expect(campo(requerimento, 'titular').valorBruto).toBe('Carla Ficticia')
    expect(campo(requerimento, 'signatario').valorBruto).toBe('Paula Procuradora')
    expect(campo(requerimento, 'rt-nome').valorBruto).toBe('João Exemplo')
    expect(campo(requerimento, 'rt-registro').valorBruto).toBe('CREA-FIC 000001')
    const procuracao = await extrair([['PROCURAÇÃO', 'Outorgante: Carla Ficticia', 'Outorgado(a): Paula Procuradora']])
    expect([campo(procuracao, 'titular').valorBruto, campo(procuracao, 'signatario').valorBruto]).toEqual(['Carla Ficticia', 'Paula Procuradora'])
  })

  it('campo ausente é "não encontrado" neste anexo; com leitura parcial, "ilegível"; nunca com valor', async () => {
    const ficha = await extrair([['FICHA CADASTRAL IMOBILIÁRIA', 'Inscrição imobiliária: 0001.0002.003', 'Lote: 4']])
    expect(campo(ficha, 'bairro')).toMatchObject({ estado: 'nao-encontrado', evidencias: [] })
    expect(campo(ficha, 'bairro').valorBruto).toBeUndefined()
    const parcial = anexoOcr(MATRICULA_OCR(95), 'parcial')
    const campos = extrairCampos(parcial, classificarAnexo(parcial))
    expect(campo(campos, 'data-emissao').estado).toBe('ilegivel')
  })

  it('leitura de OCR pouco confiável vira "ilegível", sem passar por valor certo', () => {
    const fraco = anexoOcr(MATRICULA_OCR(40))
    const matricula = campo(extrairCampos(fraco, classificarAnexo(fraco)), 'matricula')
    expect(matricula).toMatchObject({ estado: 'ilegivel', valorBruto: '90417', metodo: 'ocr+padrao' })
    expect(matricula.confianca).toBeLessThan(0.5)
    const bom = anexoOcr(MATRICULA_OCR(92))
    expect(campo(extrairCampos(bom, classificarAnexo(bom)), 'matricula')).toMatchObject({ estado: 'encontrado', valorBruto: '90417' })
  })

  it('unidade de área ilegível no OCR não é completada', () => {
    const anexo = anexoOcr([...MATRICULA_OCR(95), [['Imóvel:', 95], ['com', 95], ['área', 95], ['de', 95], ['450,00', 93], ['m?.', 87]]])
    expect(campo(extrairCampos(anexo, classificarAnexo(anexo)), 'area')).toMatchObject({ estado: 'ilegivel', valorBruto: '450,00 m?' })
  })

  it('não usa o nome do arquivo', async () => {
    const campos = await extrair([['MEMORIAL DESCRITIVO', 'Perímetro: inicia no vértice V1.']], 'lote-F7-matricula-90417.pdf')
    expect(campo(campos, 'lote').estado).toBe('nao-encontrado')
    expect(campo(campos, 'matricula').estado).toBe('nao-encontrado')
  })

  it('em arquivo composto, os campos vêm só das páginas do documento principal', async () => {
    const campos = await extrair([
      ['REQUERIMENTO', 'Assunto: DESDOBRO', 'Matrícula: 90417'],
      ['DECLARAÇÃO DE RESPONSABILIDADE TÉCNICA - DRT 01', 'Declaro ser o responsável técnico.', 'Matrícula: 11111'],
    ])
    expect(campo(campos, 'matricula')).toMatchObject({ estado: 'encontrado', valorBruto: '90417' })
  })

  it('todo campo com valor tem evidência e segue o contrato', async () => {
    const campos = await extrair([['PRANCHA - DESDOBRO', 'Titular: Carla Ficticia', 'Lote: F7 Quadra: 12', 'Matrícula: 90417', 'Planta de situação - escala 1:10.000', 'Formato A3 Data: 01/11/2026']])
    for (const item of campos) {
      expect(campoExtraidoSchema.safeParse(item.contrato).success).toBe(true)
      if (item.contrato.valorBruto !== undefined) expect(item.contrato.evidencias.length).toBeGreaterThan(0)
    }
    expect(campo(campos, 'escala-situacao').valorNormalizado).toBe(10_000)
    expect(campo(campos, 'formato-folha').valorNormalizado).toBe('A3')
    expect(campo(campos, 'data-revisao').valorNormalizado).toBe('2026-11-01')
  })
})

describe('data de revisão por família de rótulo', () => {
  it('reconhece revisão numerada, abreviada e entre parênteses, com evidência', async () => {
    for (const linha of ['Revisão 01 - 30/10/2026', 'Rev. 02 – 30/10/2026', 'REVISÃO: 2 (30.10.2026)', 'Data da revisão: 30/10/2026']) {
      const data = campo(await extrair([['MEMORIAL DESCRITIVO', 'Perímetro: inicia no vértice V1.', linha]]), 'data-revisao')
      expect(data.estado, linha).toBe('encontrado')
      expect(data.valorNormalizado, linha).toBe('2026-10-30')
      expect(data.evidencias[0]?.trecho, linha).toContain('30')
    }
  })

  it('tabela de revisões com datas diferentes fica com vários valores, sem escolher a última', async () => {
    const data = campo(await extrair([['MEMORIAL DESCRITIVO', 'Revisão 00 - 01/10/2026', 'Revisão 01 - 30/10/2026']]), 'data-revisao')
    expect(data.estado).toBe('varios-valores')
    expect(data.alternativas).toEqual(['01/10/2026', '30/10/2026'])
  })

  it('palavra parecida ou revisão sem data não vira data de revisão', async () => {
    expect(campo(await extrair([['MEMORIAL DESCRITIVO', 'Verso e reverso 12/05/2026', 'Revisão 01']]), 'data-revisao').estado).toBe('nao-encontrado')
  })
})

describe('comparação entre anexos', () => {
  it('divergência guarda os dois valores e as evidências, sem dizer qual está certo', async () => {
    const req = await extrair([['REQUERIMENTO', 'Matrícula: 90417'], []], 'a.pdf', 'anexo-1')
    const memorial = await extrair([['MEMORIAL DESCRITIVO', 'Imóvel: matrícula 90471.']], 'b.pdf', 'anexo-2')
    const comparacao = compararCampo([...req, ...memorial], 'matricula', ['requerimento', 'memorial'])
    expect(comparacao.resultado).toBe('diverge')
    const [a, b] = defined(comparacao.divergencias[0])
    expect([a.valorBruto, b.valorBruto].sort()).toEqual(['90417', '90471'])
    expect(a.evidencias.length + b.evidencias.length).toBeGreaterThanOrEqual(2)
  })

  it('normalização conservadora: separador some, zero à esquerda não', async () => {
    const um = await extrair([['REQUERIMENTO', 'Matrícula: 90.417', 'Lote: 07']], 'a.pdf', 'anexo-1')
    const dois = await extrair([['MEMORIAL DESCRITIVO', 'Imóvel: matrícula 90417, lote 7.']], 'b.pdf', 'anexo-2')
    expect(compararCampo([...um, ...dois], 'matricula', ['requerimento', 'memorial']).resultado).toBe('coincide')
    expect(compararCampo([...um, ...dois], 'lote', ['requerimento', 'memorial']).resultado).toBe('diverge')
  })

  it('campo não encontrado não é divergência; valor ambíguo deixa a comparação inconclusiva', async () => {
    const req = await extrair([['REQUERIMENTO', 'Assunto: DESDOBRO']], 'a.pdf', 'anexo-1')
    const memorial = await extrair([['MEMORIAL DESCRITIVO', 'Imóvel: matrícula 90417.']], 'b.pdf', 'anexo-2')
    const semPar = compararCampo([...req, ...memorial], 'matricula', ['requerimento', 'memorial'])
    expect(semPar.resultado).toBe('insuficiente')
    expect(semPar.ausentes).toEqual([{ anexoId: 'anexo-1', classe: 'requerimento' }])
    const prancha = await extrair([['PRANCHA - DESDOBRO', 'Data: 01/11/26']], 'c.pdf', 'anexo-3')
    const memorial2 = await extrair([['MEMORIAL DESCRITIVO', 'Data: 01/11/2026']], 'd.pdf', 'anexo-4')
    const datas = compararCampo([...prancha, ...memorial2], 'data-revisao', ['prancha', 'memorial'])
    expect(datas.resultado).toBe('inconclusivo')
    expect(datas.inconclusivos[0]?.motivo).toContain('mais de uma leitura')
  })

  it('assunto compara pela modalidade: caixa e complemento não contam, modalidade diferente sim', async () => {
    const req = await extrair([['REQUERIMENTO', 'Assunto: DESDOBRO']], 'a.pdf', 'anexo-1')
    const drt1 = await extrair([['DECLARAÇÃO DE RESPONSABILIDADE TÉCNICA - DRT 01', 'Assunto: Desdobro de lote']], 'b.pdf', 'anexo-2')
    const drt3 = await extrair([['DECLARAÇÃO DE RESPONSABILIDADE TÉCNICA - DRT 03', 'Assunto: RETIFICAÇÃO DE REGISTRO IMOBILIÁRIO']], 'c.pdf', 'anexo-3')
    expect(compararCampo([...req, ...drt1], 'assunto', ['requerimento', 'drt-01']).resultado).toBe('coincide')
    expect(compararCampo([...req, ...drt3], 'assunto', ['requerimento', 'drt-03']).resultado).toBe('diverge')
  })
})
