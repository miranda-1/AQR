import { gerarCorpus, type PacoteGerado } from '../triage/corpus/generate.ts'
import { makeZip } from '../triage/corpus/zip.ts'
import { defined } from '../test/defined.ts'
import { inspecionarArquivo, type InspectLimits } from './inspect.ts'
import { defaultImageLimits } from './limits.ts'

const LIMITS: InspectLimits = { reading: { maxFileSizeBytes: 50 * 1024 * 1024, maxPages: 1000 }, image: defaultImageLimits }

let corpus: PacoteGerado[]
beforeAll(async () => {
  corpus = await gerarCorpus()
}, 120_000)

describe('inspeção de arquivos', () => {
  it('confere com o gabarito de todos os anexos do corpus: tipo, extensão, integridade e isolamento', async () => {
    let total = 0
    for (const { gabarito, arquivos } of corpus) {
      for (const anexo of gabarito.anexos) {
        const bytes = defined(arquivos.find((arquivo) => arquivo.nome === anexo.nome)).bytes
        const inspecao = await inspecionarArquivo(anexo.nome, bytes, LIMITS)
        const id = `${gabarito.id}/${anexo.nome}`
        expect(
          {
            sha256: inspecao.sha256,
            tipoReal: inspecao.tipoReal,
            extensaoConfere: inspecao.extensaoConfere,
            integridade: inspecao.integridade,
            isolado: inspecao.isolamento.isolado,
            motivos: [...inspecao.isolamento.motivos].sort(),
          },
          id,
        ).toEqual({
          sha256: anexo.sha256,
          tipoReal: anexo.tipoReal,
          extensaoConfere: anexo.extensaoConfere,
          integridade: anexo.integridade,
          isolado: anexo.isolar,
          motivos: [...anexo.motivosIsolamento].sort(),
        })
        total += 1
      }
    }
    expect(total).toBeGreaterThan(300)
  }, 120_000)

  it('PDF legível informa as páginas; imagem legível, as dimensões', async () => {
    const pacote = defined(corpus.find((item) => item.gabarito.id === 'DSD-04'))
    const pdf = await inspecionarArquivo('memorial.pdf', defined(pacote.arquivos.find((arquivo) => arquivo.nome === 'memorial.pdf')).bytes, LIMITS)
    expect(pdf).toMatchObject({ integridade: 'legivel', paginas: 1, confiancaTipo: 'alta' })
    const jpg = await inspecionarArquivo('ficha-cadastral.jpg', defined(pacote.arquivos.find((arquivo) => arquivo.nome === 'ficha-cadastral.jpg')).bytes, LIMITS)
    expect(jpg).toMatchObject({ integridade: 'legivel', dimensoes: { largura: 1240, altura: 1754 } })
  })

  it('arquivo maior que o limite não é aberto', async () => {
    const pacote = defined(corpus[0])
    const bytes = defined(pacote.arquivos[0]).bytes
    const pequeno = { ...LIMITS, reading: { ...LIMITS.reading, maxFileSizeBytes: 100 } }
    expect((await inspecionarArquivo('requerimento.pdf', bytes, pequeno)).integridade).toBe('nao-suportado')
  })

  it('imagem gigante em pixels é isolada sem ser decodificada', async () => {
    const header = Buffer.alloc(33)
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(header, 0)
    header.writeUInt32BE(13, 8)
    header.write('IHDR', 12, 'latin1')
    header.writeUInt32BE(100_000, 16)
    header.writeUInt32BE(100_000, 20)
    const inspecao = await inspecionarArquivo('foto.png', new Uint8Array(header), LIMITS)
    expect(inspecao).toMatchObject({ tipoReal: 'png', integridade: 'nao-verificada', isolamento: { isolado: true, motivos: ['imagem-grande-demais'] } })
  })

  it('JPG truncado é corrompido; DOCX disfarçado de PDF é isolado', async () => {
    const pacote = defined(corpus.find((item) => item.gabarito.id === 'DSD-04'))
    const jpg = defined(pacote.arquivos.find((arquivo) => arquivo.nome === 'ficha-cadastral.jpg')).bytes
    expect((await inspecionarArquivo('ficha.jpg', jpg.subarray(0, 40), LIMITS)).integridade).toBe('corrompido')

    const docx = defined(corpus.find((item) => item.gabarito.id === 'DSD-14')?.arquivos.find((arquivo) => arquivo.nome === 'memorial.docx')).bytes
    const disfarcado = await inspecionarArquivo('memorial.pdf', docx, LIMITS)
    expect(disfarcado).toMatchObject({ tipoReal: 'docx', extensaoConfere: false, isolamento: { isolado: true, motivos: ['conteiner-disfarcado'] } })
  })

  it('ZIP suspeito não é aberto, nem para conferir se é DOCX', async () => {
    const zip = makeZip([
      { name: '[Content_Types].xml', data: '<Types/>' },
      { name: '../fora.txt', data: 'x' },
    ])
    expect(await inspecionarArquivo('pacote.zip', zip, LIMITS)).toMatchObject({
      tipoReal: 'zip',
      integridade: 'nao-verificada',
      isolamento: { isolado: true, motivos: ['zip-caminho-perigoso'] },
    })
  })
})
