import { classificacaoSchema } from '../../../shared/contracts/triage.ts'
import { defaultComparisonLimits } from '../../comparison/limits.ts'
import { defaultImageLimits } from '../../documents/limits.ts'
import { makePdf } from '../../test/make-pdf.ts'
import { buildPdf } from '../../comparison/evaluation/corpus-pdf.ts'
import { paginaDeTexto } from '../corpus/documents.ts'
import { gerarPacote } from '../corpus/generate.ts'
import { PACOTES } from '../corpus/pacotes.ts'
import { defined } from '../../test/defined.ts'
import { lerAnexo } from '../reading/read.ts'
import { classificarAnexo } from './classify.ts'

const OPCOES = { limites: { reading: defaultComparisonLimits, image: defaultImageLimits }, ocrMinConfidence: 45 }

async function classificar(paginas: string[][], nome = 'anexo.pdf') {
  const { bytes } = await makePdf(paginas)
  const classificacao = classificarAnexo(await lerAnexo('anexo-1', nome, bytes, OPCOES))
  expect(classificacaoSchema.safeParse(classificacao.contrato).success).toBe(true)
  return classificacao
}

async function arquivoDoCorpus(pacoteId: string, nome: string): Promise<Uint8Array> {
  const pacote = await gerarPacote(defined(PACOTES.find((item) => item.id === pacoteId)))
  return defined(pacote.arquivos.find((item) => item.nome === nome)).bytes
}

describe('classificação documental', () => {
  it('distingue DRT 01 de DRT 03 pelo número do título', async () => {
    const um = await classificar([['DECLARAÇÃO DE RESPONSABILIDADE TÉCNICA - DRT 01', 'Assunto: DESDOBRO', 'Declaro ser o responsável técnico.']])
    const tres = await classificar([['DECLARAÇÃO DE RESPONSABILIDADE TÉCNICA - DRT 03', 'Assunto: RETIFICAÇÃO', 'Declaro ser o responsável técnico.']])
    expect([um.contrato.classe, um.contrato.confianca]).toEqual(['drt-01', 'alta'])
    expect([tres.contrato.classe, tres.contrato.confianca]).toEqual(['drt-03', 'alta'])
    expect(um.contrato.evidencias[0]?.trecho).toContain('DRT 01')
    expect(um.justificativa).toContain('título de DRT 01')
  })

  it('distingue DRT 02 de projeto e de implantação; sem o tipo, não escolhe', async () => {
    const projeto = await classificar([['DRT 02 - DECLARAÇÃO DE RESPONSABILIDADE TÉCNICA', 'PROJETO', 'Modalidade: Desdobro']])
    const implantacao = await classificar([['DECLARAÇÃO DE RESPONSABILIDADE TÉCNICA - DRT 02 - IMPLANTAÇÃO']])
    const semTipo = await classificar([['DECLARAÇÃO DE RESPONSABILIDADE TÉCNICA - DRT 02', 'Lote 4, Quadra 2']])
    expect(projeto.contrato.classe).toBe('drt-02-projeto')
    expect(implantacao.contrato.classe).toBe('drt-02-implantacao')
    expect(semTipo.contrato.classe).toBe('indeterminada')
    expect(semTipo.contrato.alternativas.map((item) => item.classe).sort()).toEqual(['drt-02-implantacao', 'drt-02-projeto'])
  })

  it('distingue memorial de prancha, mesmo quando um cita o outro', async () => {
    const memorial = await classificar([['MEMORIAL DESCRITIVO', 'Conforme a prancha anexa, escala 1:500.', 'Perímetro: inicia no vértice V1.']])
    const prancha = await classificar([['PRANCHA - DESDOBRO', 'Planta de situação - escala 1:10.000', 'Formato A3', 'Ver memorial descritivo.']])
    expect(memorial.contrato.classe).toBe('memorial')
    expect(prancha.contrato.classe).toBe('prancha')
  })

  it('distingue matrícula de cadastro imobiliário, mesmo com o cadastro citando a matrícula', async () => {
    const matricula = await classificar([['CERTIDÃO DE INTEIRO TEOR - MATRÍCULA Nº 4321', 'Serviço Registral Fictício', 'Certidão emitida em 01/02/2026.']])
    const cadastro = await classificar([['EXTRATO DO CADASTRO IMOBILIÁRIO - IPTU', 'Inscrição imobiliária: 0001.0002.003', 'Matrícula: 4321']])
    expect(matricula.contrato.classe).toBe('matricula-transcricao')
    expect(cadastro.contrato.classe).toBe('inscricao-imobiliaria')
  })

  it('não toma declaração técnica por ART/RRT', async () => {
    const art = await classificar([['ANOTAÇÃO DE RESPONSABILIDADE TÉCNICA - ART', 'Profissional: Fulano Ficticio - CREA-FIC 1', 'Contratante: Beltrana Ficticia']])
    const rrt = await classificar([['REGISTRO DE RESPONSABILIDADE TÉCNICA - RRT', 'Profissional: Fulano Ficticio - CAU-FIC 1']])
    const declaracao = await classificar([['DECLARAÇÃO', 'Declaro que a ART será emitida depois.', 'Fulano Ficticio']])
    expect(art.contrato.classe).toBe('art-rrt-similar')
    expect(rrt.contrato.classe).toBe('art-rrt-similar')
    expect(declaracao.contrato.classe).toBe('indeterminada')
  })

  it('aponta documento composto sem dividir o arquivo', async () => {
    const composto = await classificar([
      ['REQUERIMENTO', 'Assunto: DESDOBRO', 'Assina este requerimento: Fulana Ficticia.'],
      ['DECLARAÇÃO DE RESPONSABILIDADE TÉCNICA - DRT 01', 'Declaro ser o responsável técnico.'],
    ])
    expect(composto.contrato.classe).toBe('requerimento')
    expect(composto.composto).toBe(true)
    expect(composto.classesComEvidencia).toEqual(['requerimento', 'drt-01'])
    expect(composto.contrato.alternativas).toContainEqual({ classe: 'drt-01', confianca: 'media' })
    // Composto não tem confiança alta: pede revisão.
    expect(composto.contrato.confianca).toBe('media')
    expect(composto.porPagina.map((pagina) => pagina.classe)).toEqual(['requerimento', 'drt-01'])
  })

  describe('prancha pela estrutura, sem "prancha" ou "planta" no título', () => {
    async function folha(titulo: string, linhas: string[], tamanho?: 'A1' | 'A3') {
      const pagina = paginaDeTexto({ titulo, linhas, campos: {}, assinaturas: [] }, tamanho ? { folha: tamanho } : {})
      const { bytes } = await buildPdf([pagina])
      return classificarAnexo(await lerAnexo('anexo-1', 'folha.pdf', bytes, OPCOES))
    }

    it('folha grande com dois ou mais sinais de prancha no corpo: prancha, confiança média, justificada', async () => {
      const resultado = await folha('LEVANTAMENTO DO LOTE 3 - FOLHA 1/1', ['Quadro de áreas', 'Proprietário: Fulano Ficticio', 'Situação atual: lote 3 - 300,00 m²', 'Esc.: 1/10.000'], 'A1')
      expect([resultado.contrato.classe, resultado.contrato.confianca]).toEqual(['prancha', 'media'])
      expect(resultado.justificativa).toContain('estrutura de prancha')
    })

    it('não basta a folha grande: um sinal só, ou folha A4, fica indeterminada', async () => {
      expect((await folha('LEVANTAMENTO DO LOTE 3', ['Quadro de áreas', 'Proprietário: Fulano', 'Observações gerais', 'Esc.: 1/10.000'], 'A1')).contrato.classe).toBe('indeterminada')
      expect((await folha('LEVANTAMENTO DO LOTE 3', ['Quadro de áreas', 'Proprietário: Fulano', 'Situação atual: lote 3', 'Esc.: 1/10.000'])).contrato.classe).toBe('indeterminada')
    })

    it('folha grande com título de outra classe continua sendo a outra classe', async () => {
      const resultado = await folha('MEMORIAL DESCRITIVO', ['Perímetro: inicia no vértice V1.', 'Situação atual: lote 3', 'Esc.: 1/10.000'], 'A3')
      expect(resultado.contrato.classe).toBe('memorial')
    })
  })

  it('classifica pelo conteúdo, não pelo nome do arquivo', async () => {
    const paginas = [['MEMORIAL DESCRITIVO', 'Perímetro: inicia no vértice V1.']]
    expect((await classificar(paginas, 'requerimento.pdf')).contrato.classe).toBe('memorial')
    expect((await classificar(paginas, 'art.pdf')).contrato.classe).toBe('memorial')
    expect((await classificar([['Texto qualquer sem título reconhecível', 'linha dois']], 'memorial.pdf')).contrato.classe).toBe('indeterminada')
  })

  it('sem evidência suficiente fica indeterminada; sinal só de corpo não decide', async () => {
    const fraco = await classificar([['Documento anexo', 'Contratante: Fulana Ficticia', 'Atividade: levantamento']])
    expect(fraco.contrato.classe).toBe('indeterminada')
    expect(fraco.justificativa).toMatch(/insuficientes|Nenhum título/u)
  })

  it('desenho CAD pelo tipo real; arquivo isolado, ilegível ou texto simples fica indeterminado sem evidência inventada', async () => {
    const dwg = classificarAnexo(await lerAnexo('a', 'prancha.dwg', await arquivoDoCorpus('DSD-02', 'prancha.dwg'), OPCOES))
    expect([dwg.contrato.classe, dwg.contrato.metodo, dwg.contrato.confianca]).toEqual(['cad', 'tipo-de-arquivo', 'alta'])
    const dxfComoTexto = classificarAnexo(await lerAnexo('a', 'qualquer.txt', await arquivoDoCorpus('DSD-01', 'prancha.dxf'), OPCOES))
    expect(dxfComoTexto.contrato.classe).toBe('cad')

    const isolado = classificarAnexo(await lerAnexo('a', 'art.pdf', await arquivoDoCorpus('DSD-37', 'art.pdf'), OPCOES))
    expect([isolado.contrato.classe, isolado.contrato.evidencias.length]).toEqual(['indeterminada', 0])
    const corrompido = classificarAnexo(await lerAnexo('a', 'memorial.pdf', await arquivoDoCorpus('DSD-31', 'memorial.pdf'), OPCOES))
    expect(corrompido.contrato.classe).toBe('indeterminada')
    const texto = classificarAnexo(await lerAnexo('a', 'prancha.dwg', await arquivoDoCorpus('DSD-36', 'prancha.dwg'), OPCOES))
    expect(texto.contrato.classe).toBe('indeterminada')
  })

  it('lê e classifica DOCX pelo texto do documento', async () => {
    const docx = classificarAnexo(await lerAnexo('a', 'memorial.docx', await arquivoDoCorpus('DSD-14', 'memorial.docx'), OPCOES))
    expect(docx.contrato.classe).toBe('memorial')
    // DOCX não tem página desenhada: a evidência não inventa página nem região.
    expect(docx.contrato.evidencias.every((evidencia) => evidencia.pagina === undefined && evidencia.regioes === undefined)).toBe(true)
  })

  it('página digitalizada sem OCR fica sem leitura e sem classe', async () => {
    const lido = await lerAnexo('a', 'matricula.pdf', await arquivoDoCorpus('DSD-03', 'matricula.pdf'), OPCOES)
    expect(lido.paginas[0]?.metodo).toBe('nao-lida')
    expect(lido.legibilidade).toBe('ilegivel')
    expect(classificarAnexo(lido).contrato.classe).toBe('indeterminada')
  })
})
