import { createHash } from 'node:crypto'
import { inflateRawSync } from 'node:zlib'
import { loadImage, createCanvas } from '@napi-rs/canvas'
import { contemDocumentoPessoal } from '../../../shared/contracts/triage.ts'
import { ComparisonFailure } from '../../comparison/failure.ts'
import { defaultComparisonLimits } from '../../comparison/limits.ts'
import { analyzeDocument } from '../../comparison/pdf/extract.ts'
import { openPdf } from '../../comparison/pdf/load.ts'
import { defined } from '../../test/defined.ts'
import { loadCatalog, regrasAplicaveis } from '../catalog/catalog.ts'
import { AVISO_FICTICIO } from './documents.ts'
import { categoriasCorpus, type GabaritoAnexo } from './gabarito.ts'
import { gerarCorpus, type ArquivoGerado, type PacoteGerado } from './generate.ts'

const CATALOG_DIR = new URL('../../../docs/triagem/catalogo/', import.meta.url).pathname

let corpus: PacoteGerado[]
beforeAll(async () => {
  corpus = await gerarCorpus()
}, 120_000)

const arquivoDe = (pacote: PacoteGerado, nome: string): ArquivoGerado => defined(pacote.arquivos.find((arquivo) => arquivo.nome === nome), nome)
const todosOsAnexos = () => corpus.flatMap((pacote) => pacote.gabarito.anexos.map((anexo) => ({ pacote, anexo, bytes: arquivoDe(pacote, anexo.nome).bytes })))
const comeca = (bytes: Uint8Array, prefixo: readonly number[]) => prefixo.every((byte, index) => bytes[index] === byte)
const ascii = (texto: string) => [...texto].map((char) => char.charCodeAt(0))
const normalizar = (texto: string) => texto.replace(/\s+/gu, ' ').trim()

/** Lê as entradas de um ZIP gravado sem descritor de dados (como o do corpus), sem o detector da triagem. */
function entradasZip(bytes: Uint8Array): Map<string, string> {
  const buffer = Buffer.from(bytes)
  const entradas = new Map<string, string>()
  let offset = 0
  while (buffer.readUInt32LE(offset) === 0x04034b50) {
    const method = buffer.readUInt16LE(offset + 8)
    const size = buffer.readUInt32LE(offset + 18)
    const nameLength = buffer.readUInt16LE(offset + 26)
    const extraLength = buffer.readUInt16LE(offset + 28)
    const name = buffer.toString('utf8', offset + 30, offset + 30 + nameLength)
    const start = offset + 30 + nameLength + extraLength
    const data = buffer.subarray(start, start + size)
    entradas.set(name, (method === 8 ? inflateRawSync(data) : data).toString('utf8'))
    offset = start + size
  }
  return entradas
}

/** Assinatura de conteúdo esperada para cada tipo real, verificada de forma independente. */
function conteudoConfere(anexo: GabaritoAnexo, bytes: Uint8Array): boolean {
  switch (anexo.tipoReal) {
    case 'pdf':
      return comeca(bytes, ascii('%PDF-'))
    case 'jpeg':
      return comeca(bytes, [0xff, 0xd8, 0xff])
    case 'png':
      return comeca(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    case 'dxf':
      return new TextDecoder().decode(bytes).startsWith('  0\nSECTION\n')
    case 'dwg':
      return comeca(bytes, ascii('AC1032'))
    case 'docx':
      return entradasZip(bytes).has('word/document.xml')
    case 'zip':
      return comeca(bytes, ascii('PK')) && !entradasZip(bytes).has('word/document.xml')
    case 'rar':
      return comeca(bytes, ascii('Rar!'))
    case 'vazio':
      return bytes.byteLength === 0
    case 'desconhecido':
      return ![ascii('%PDF-'), [0xff, 0xd8, 0xff], ascii('PK'), ascii('Rar!'), ascii('AC10')].some((prefixo) => comeca(bytes, prefixo))
  }
}

async function textoDoPdf(bytes: Uint8Array): Promise<string> {
  const analyzed = await analyzeDocument(bytes, 'original', defaultComparisonLimits, { objects: false, preview: false })
  try {
    return normalizar(analyzed.pages.flatMap((page) => page.lines.flatMap((line) => line.words.map((word) => word.text))).join(' '))
  } finally {
    await analyzed.close()
  }
}

/** Fração de pixels escuros: pega imagem em branco ou toda preta (erro de desenho). */
async function tintaDaImagem(bytes: Uint8Array): Promise<number> {
  const image = await loadImage(Buffer.from(bytes))
  const canvas = createCanvas(image.width, image.height)
  const context = canvas.getContext('2d')
  context.drawImage(image, 0, 0)
  const data = context.getImageData(0, 0, image.width, image.height).data
  let escuros = 0
  for (let index = 0; index < data.length; index += 4) if ((data[index] ?? 255) < 128) escuros += 1
  return escuros / (data.length / 4)
}

describe('corpus sintético de desdobro', () => {
  it('tem pelo menos 30 pacotes, com ids únicos e em sequência', () => {
    expect(corpus.length).toBeGreaterThanOrEqual(30)
    expect(corpus.map((pacote) => pacote.gabarito.id)).toEqual(corpus.map((_, index) => `DSD-${String(index + 1).padStart(2, '0')}`))
  })

  it('cobre todas as categorias pedidas', () => {
    for (const categoria of categoriasCorpus) {
      expect(corpus.filter((pacote) => pacote.gabarito.categorias.includes(categoria)).length, categoria).toBeGreaterThanOrEqual(2)
    }
    const areas = corpus.filter((pacote) => pacote.gabarito.categorias.includes('limite-2ha')).map((pacote) => pacote.gabarito.imovel.area)
    expect(new Set(areas)).toEqual(new Set(['19.900,00 m²', '20.000,00 m²', '20.100,00 m²']))
  })

  it('é determinístico: duas gerações dão os mesmos bytes', async () => {
    const segunda = await gerarCorpus()
    const hashes = (pacotes: PacoteGerado[]) =>
      pacotes.flatMap((pacote) => pacote.arquivos.map((arquivo) => `${pacote.gabarito.id}/${arquivo.nome}:${createHash('sha256').update(arquivo.bytes).digest('hex')}`))
    expect(hashes(segunda)).toEqual(hashes(corpus))
  }, 120_000)

  it('o gabarito registra o hash e o tamanho de cada arquivo', () => {
    for (const { anexo, bytes } of todosOsAnexos()) {
      expect(anexo.sha256).toBe(createHash('sha256').update(bytes).digest('hex'))
      expect(anexo.bytes).toBe(bytes.byteLength)
    }
  })

  it('o tipo real do gabarito confere com o conteúdo dos bytes', () => {
    for (const { pacote, anexo, bytes } of todosOsAnexos()) expect(conteudoConfere(anexo, bytes), `${pacote.gabarito.id}/${anexo.nome}`).toBe(true)
  })

  it('PDFs com texto trazem o aviso de ficção e todos os campos do gabarito', async () => {
    for (const { pacote, anexo, bytes } of todosOsAnexos().filter((item) => item.anexo.leitura === 'camada-de-texto')) {
      const texto = await textoDoPdf(bytes)
      expect(texto, `${pacote.gabarito.id}/${anexo.nome}`).toContain(AVISO_FICTICIO)
      for (const valor of Object.values(anexo.campos)) expect(texto, `${pacote.gabarito.id}/${anexo.nome}: ${valor}`).toContain(normalizar(valor))
    }
  }, 120_000)

  it('PDFs digitalizados não têm camada de texto', async () => {
    for (const { pacote, anexo, bytes } of todosOsAnexos().filter((item) => item.anexo.leitura === 'ocr' && item.anexo.tipoReal === 'pdf')) {
      const analyzed = await analyzeDocument(bytes, 'original', defaultComparisonLimits, { objects: true, preview: true })
      expect(analyzed.pages.map((page) => page.content), `${pacote.gabarito.id}/${anexo.nome}`).toEqual(['scanned'])
      await analyzed.close()
    }
  }, 120_000)

  it('imagens avulsas têm conteúdo (nem em branco nem pretas) e a orientação do gabarito', async () => {
    for (const { pacote, anexo, bytes } of todosOsAnexos().filter((item) => item.anexo.tipoReal === 'jpeg' || item.anexo.tipoReal === 'png')) {
      const tinta = await tintaDaImagem(bytes)
      expect(tinta, `${pacote.gabarito.id}/${anexo.nome}`).toBeGreaterThan(0.002)
      expect(tinta, `${pacote.gabarito.id}/${anexo.nome}`).toBeLessThan(0.3)
      const image = await loadImage(Buffer.from(bytes))
      expect(image.width > image.height, `${pacote.gabarito.id}/${anexo.nome}`).toBe(anexo.rotacao === 90)
    }
  }, 120_000)

  it('arquivos defeituosos falham do jeito que o gabarito diz', async () => {
    for (const { pacote, anexo, bytes } of todosOsAnexos().filter((item) => item.anexo.integridade === 'corrompido' || item.anexo.integridade === 'protegido-por-senha')) {
      const failure = await openPdf(bytes, 'original', defaultComparisonLimits).then(
        () => undefined,
        (error: unknown) => error,
      )
      expect(failure, `${pacote.gabarito.id}/${anexo.nome}`).toBeInstanceOf(ComparisonFailure)
      expect((failure as ComparisonFailure).reason).toBe(anexo.integridade === 'corrompido' ? 'pdf-corrompido' : 'protegido-por-senha')
    }
  })

  it('DOCX e DXF trazem o texto fictício; ZIP perigoso tem a entrada que sairia da pasta', () => {
    for (const { pacote, anexo, bytes } of todosOsAnexos()) {
      const id = `${pacote.gabarito.id}/${anexo.nome}`
      if (anexo.tipoReal === 'docx') {
        const documento = defined(entradasZip(bytes).get('word/document.xml'), id)
        expect(documento, id).toContain(AVISO_FICTICIO)
        for (const valor of Object.values(anexo.campos)) expect(documento, id).toContain(valor)
      }
      if (anexo.tipoReal === 'dxf') expect(new TextDecoder().decode(bytes), id).toContain(`LOTE ${anexo.campos.lote ?? ''} QUADRA ${anexo.campos.quadra ?? ''}`)
      if (anexo.motivosIsolamento.includes('zip-caminho-perigoso')) expect([...entradasZip(bytes).keys()].some((nome) => nome.startsWith('../')), id).toBe(true)
    }
  })

  it('não há CPF nem CNPJ em nenhum arquivo nem no gabarito', async () => {
    for (const { pacote, anexo, bytes } of todosOsAnexos()) {
      const id = `${pacote.gabarito.id}/${anexo.nome}`
      const texto = anexo.leitura === 'camada-de-texto' ? await textoDoPdf(bytes) : new TextDecoder('latin1').decode(bytes)
      expect(contemDocumentoPessoal(texto), id).toBe(false)
    }
    expect(contemDocumentoPessoal(JSON.stringify(corpus.map((pacote) => pacote.gabarito)))).toBe(false)
  }, 120_000)

  it('as expectativas citam só regras do catálogo que se aplicam a desdobro na abertura e podem rodar', async () => {
    const catalogo = await loadCatalog(CATALOG_DIR)
    const executaveis = new Set(
      regrasAplicaveis(catalogo, 'D', 'abertura')
        .filter((regra) => regra.habilitada && !['AQR-GCA-040', 'AQR-GCA-041'].includes(regra.id))
        .map((regra) => regra.id),
    )
    expect(executaveis.size).toBe(19)
    for (const pacote of corpus) {
      for (const regra of Object.keys(pacote.gabarito.regras)) expect(executaveis.has(regra), `${pacote.gabarito.id}: ${regra}`).toBe(true)
    }
  })

  it('o gabarito é coerente: só aponta ausência do que não está entre os anexos legíveis', () => {
    const CLASSE_DA_REGRA: Record<string, (anexo: GabaritoAnexo) => boolean> = {
      'AQR-GCA-002': (anexo) => anexo.classe === 'requerimento',
      'AQR-GCA-003': (anexo) => anexo.classe === 'drt-01',
      'AQR-GCA-006': (anexo) => anexo.classe === 'inscricao-imobiliaria',
      'AQR-GCA-008': (anexo) => anexo.classe === 'matricula-transcricao',
      'AQR-GCA-011': (anexo) => anexo.classe === 'art-rrt-similar',
      'AQR-GCA-013': (anexo) => anexo.classe === 'memorial' && anexo.tipoReal === 'pdf',
    }
    for (const pacote of corpus) {
      const { gabarito } = pacote
      for (const [regra, presente] of Object.entries(CLASSE_DA_REGRA)) {
        const expectativa = gabarito.regras[regra]
        if (!expectativa) continue
        const temDocumento = gabarito.anexos.some(presente)
        const id = `${gabarito.id}: ${regra}`
        if (expectativa.tipo === 'nao-localizado') expect(temDocumento, id).toBe(false)
        if (expectativa.aceitaveis.includes('sem-achado')) expect(temDocumento, id).toBe(true)
        // Pacote não confirmado como completo nunca aponta documento faltante.
        if (gabarito.entrada.integridadeDoPacote !== 'completo') expect(expectativa.aceitaveis, id).not.toContain('achado')
      }
    }
  })

  it('a regra da GDU acima de 2 ha depende de confirmação de servidor', () => {
    for (const pacote of corpus.filter((item) => item.gabarito.categorias.includes('limite-2ha'))) {
      const { gabarito } = pacote
      const confirmacao = gabarito.entrada.condicoesConfirmadas.find((condicao) => condicao.id === 'area-situacao-acima-2ha')
      const esperado = defined(gabarito.regras['AQR-GCA-028'], gabarito.id).aceitaveis
      if (!confirmacao) expect(esperado, gabarito.id).toEqual(['condicao-pendente'])
      else if (!confirmacao.valor) expect(esperado, gabarito.id).toEqual(['nao-aplicavel'])
      else expect(esperado, gabarito.id).toEqual([gabarito.anexos.some((anexo) => anexo.classe === 'gdu-gdr') ? 'sem-achado' : 'achado'])
    }
  })
})
