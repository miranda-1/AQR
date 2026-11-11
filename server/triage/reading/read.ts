import { createCanvas, loadImage } from '@napi-rs/canvas'
import type { NormalizedRect } from '../../../shared/contracts/comparison.ts'
import { DocumentFailure } from '../../documents/failure.ts'
import { prepareImage } from '../../documents/image.ts'
import { inspecionarArquivo, type InspecaoArquivo, type InspectLimits } from '../../documents/inspect.ts'
import type { ReadingLimits } from '../../documents/limits.ts'
import { isOcrNoise, mergeOcr } from '../../documents/ocr/merge.ts'
import type { OcrEngine, OcrPage } from '../../documents/ocr/ocr-engine.ts'
import { analyzeDocument, type AnalyzedPage } from '../../documents/pdf/extract.ts'
import { renderPage, toGray } from '../../documents/pdf/render.ts'
import { listZipEntries, readZipEntry } from '../../documents/zip.ts'
import { dobrar, linhaDe, linhaSemPosicao, regiaoDe, type LinhaLida, type OrigemTexto, type PalavraLida } from './text.ts'

/**
 * Leitura de um anexo para a triagem: inspeção (E3), depois o texto que der para ler, com a origem
 * de cada palavra. PDF com camada de texto é lido direto; página digitalizada e imagem avulsa, por
 * OCR local; DOCX e DXF, só o texto guardado no arquivo (sem desenhar nada). Arquivo isolado não é
 * aberto. Nada sai do servidor.
 *
 * A leitura nunca "completa" o que não leu: página sem OCR fica `nao-lida`, e a legibilidade do
 * anexo diz o quanto a classificação e a extração podem confiar no texto.
 */

export interface LeituraLimites extends InspectLimits {
  reading: ReadingLimits
}

export interface OpcoesLeitura {
  limites: LeituraLimites
  /** Sem motor de OCR, página digitalizada fica sem leitura. */
  ocr?: OcrEngine
  /** Palavra de OCR abaixo disto é ruído (0–100). */
  ocrMinConfidence: number
}

export type ConteudoPagina = 'text' | 'scanned' | 'mixed' | 'blank'
export type MetodoPagina = 'camada-de-texto' | 'ocr' | 'camada-e-ocr' | 'nao-lida'

export interface PaginaLida {
  pagina: number
  conteudo: ConteudoPagina
  metodo: MetodoPagina
  confiancaOcr?: number
  rotacao: 0 | 90 | 180 | 270
  /** Tamanho da folha em pontos, já com a rotação (só PDF). */
  larguraPt?: number
  alturaPt?: number
}

/**
 * Área de assinatura: o rótulo impresso ("Assinatura do responsável técnico") e o que há no espaço
 * logo acima dele. "vazia" só quando o espaço está nitidamente em branco.
 */
export interface AreaAssinatura {
  pagina: number
  rotulo: string
  regiaoRotulo: NormalizedRect
  regiaoVerificada: NormalizedRect
  /** Fração de pixels escuros no espaço verificado. */
  tinta: number
  situacao: 'preenchida' | 'vazia' | 'indeterminada'
}

/**
 * - `legivel`: há texto suficiente e confiável;
 * - `parcial`: há texto, mas pouco ou com confiança baixa;
 * - `ilegivel`: o arquivo não abre ou nada pôde ser lido;
 * - `nao-interpretado`: formato reconhecido cujo conteúdo esta fase não lê (DWG);
 * - `isolado`: suspeito, não aberto.
 */
export type Legibilidade = 'legivel' | 'parcial' | 'ilegivel' | 'nao-interpretado' | 'isolado'

export interface AnexoLido {
  id: string
  nome: string
  inspecao: InspecaoArquivo
  paginas: PaginaLida[]
  linhas: LinhaLida[]
  origemTexto: OrigemTexto | null
  legibilidade: Legibilidade
  /** Confiança média do OCR no anexo (0–100), quando houve OCR. */
  confiancaOcr?: number
  assinaturas: AreaAssinatura[]
  /** Por que a leitura parou (motivo técnico, sem dado do documento). */
  falha?: string
}

/** Texto mínimo (caracteres sem espaço) para considerar que o anexo foi lido. */
export const MIN_CARACTERES = 20
/** Confiança média do OCR abaixo da qual a leitura é só parcial. */
export const OCR_CONFIAVEL = 70
/** Tamanho máximo do `word/document.xml` lido de um DOCX. */
const MAX_DOCX_XML = 5 * 1024 * 1024
/** Tamanho máximo de texto simples ou DXF examinado. */
const MAX_TEXTO = 2 * 1024 * 1024

const caracteres = (linhas: readonly LinhaLida[]) => linhas.reduce((soma, linha) => soma + linha.texto.replace(/\s/gu, '').length, 0)

function conteudoDe(page: AnalyzedPage): ConteudoPagina {
  if (page.content === 'text' || page.content === 'scanned' || page.content === 'mixed' || page.content === 'blank') return page.content
  return 'mixed'
}

function precisaOcr(page: AnalyzedPage): boolean {
  return page.content === 'scanned' || page.content === 'mixed' || page.content === 'insufficient-text' || page.content === 'graphics'
}

const rotacaoDe = (graus: number): PaginaLida['rotacao'] => {
  const normalizada = ((graus % 360) + 360) % 360
  return normalizada === 90 || normalizada === 180 || normalizada === 270 ? normalizada : 0
}

function palavrasDaPagina(page: AnalyzedPage): LinhaLida[] {
  return page.lines
    .map((line) =>
      linhaDe(
        page.pageNumber,
        line.words.map(
          (word): PalavraLida => ({
            texto: word.text,
            regiao: word.region,
            origem: word.source === 'ocr' ? 'ocr' : 'camada-de-texto',
            ...(word.confidence !== undefined ? { confianca: word.confidence } : {}),
          }),
        ),
      ),
    )
    .filter((linha) => linha.texto.trim().length > 0)
}

// ---------- assinaturas ----------

const ROTULO_ASSINATURA = /^assinatura\b/u
/** Espaço verificado acima do rótulo, em pontos: do traço da linha de assinatura para cima. */
const ESPACO_ACIMA = { de: 34, ate: 8, largura: 240 }
const TINTA_PREENCHIDA = 0.004
const TINTA_VAZIA = 0.0005

async function areasDeAssinatura(page: AnalyzedPage, pdfPage: Parameters<typeof renderPage>[0], linhas: readonly LinhaLida[]): Promise<AreaAssinatura[]> {
  const rotulos = linhas.filter((linha) => linha.palavras.every((palavra) => palavra.origem === 'camada-de-texto') && ROTULO_ASSINATURA.test(dobrar(linha.texto)))
  if (rotulos.length === 0) return []
  const raster = await renderPage(pdfPage, { scale: 1.5 })
  const gray = toGray(raster)
  const areas: AreaAssinatura[] = []
  for (const linha of rotulos) {
    const regiaoRotulo = regiaoDe(linha.palavras)
    if (!regiaoRotulo) continue
    const top = Math.max(0, regiaoRotulo.y - ESPACO_ACIMA.de / page.height)
    const bottom = Math.max(0, regiaoRotulo.y - ESPACO_ACIMA.ate / page.height)
    const left = regiaoRotulo.x
    const width = Math.min(1 - left, ESPACO_ACIMA.largura / page.width)
    const regiaoVerificada = { x: left, y: top, width, height: Math.max(0, bottom - top) }
    const x0 = Math.floor(left * raster.width)
    const x1 = Math.ceil((left + width) * raster.width)
    const y0 = Math.floor(top * raster.height)
    const y1 = Math.ceil(bottom * raster.height)
    let escuros = 0
    let total = 0
    for (let y = y0; y < y1; y += 1) {
      for (let x = x0; x < x1; x += 1) {
        total += 1
        if ((gray[y * raster.width + x] ?? 255) < 128) escuros += 1
      }
    }
    const tinta = total > 0 ? escuros / total : 0
    const situacao = total === 0 ? 'indeterminada' : tinta >= TINTA_PREENCHIDA ? 'preenchida' : tinta <= TINTA_VAZIA ? 'vazia' : 'indeterminada'
    areas.push({ pagina: page.pageNumber, rotulo: linha.texto, regiaoRotulo, regiaoVerificada, tinta, situacao })
  }
  return areas
}

// ---------- formatos sem desenho ----------

function textoDoDocx(bytes: Uint8Array): string[] | null {
  const listing = listZipEntries(bytes)
  if (!listing.ok) return null
  const entry = listing.entries.find((item) => item.name === 'word/document.xml')
  if (!entry) return null
  const xml = readZipEntry(bytes, entry, MAX_DOCX_XML)
  if (!xml) return null
  const texto = new TextDecoder().decode(xml)
  const paragrafos: string[] = []
  for (const paragrafo of texto.split(/<\/w:p>/u)) {
    const partes = [...paragrafo.matchAll(/<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>/gu)].map((match) => match[1] ?? '')
    const linha = decodeXml(partes.join('')).trim()
    if (linha) paragrafos.push(linha)
  }
  return paragrafos
}

function decodeXml(texto: string): string {
  return texto
    .replace(/&lt;/gu, '<')
    .replace(/&gt;/gu, '>')
    .replace(/&quot;/gu, '"')
    .replace(/&apos;/gu, "'")
    .replace(/&amp;/gu, '&')
}

/** Textos das entidades TEXT e MTEXT de um DXF em texto (código de grupo 1). */
function textoDoDxf(bytes: Uint8Array): string[] {
  const linhas = new TextDecoder('latin1').decode(bytes.subarray(0, MAX_TEXTO)).split(/\r?\n/u).map((linha) => linha.trim())
  const textos: string[] = []
  let entidade = ''
  for (let index = 0; index + 1 < linhas.length; index += 2) {
    const codigo = linhas[index]
    const valor = linhas[index + 1] ?? ''
    if (codigo === '0') entidade = valor
    else if (codigo === '1' && (entidade === 'TEXT' || entidade === 'MTEXT') && valor) textos.push(utf8DeLatin1(valor))
  }
  return textos
}

/** DXF moderno grava UTF-8; foi lido como latin1 para não falhar em bytes inválidos. */
function utf8DeLatin1(texto: string): string {
  const bytes = Uint8Array.from([...texto].map((char) => char.charCodeAt(0) & 0xff))
  const decodificado = new TextDecoder('utf-8', { fatal: false }).decode(bytes)
  return decodificado.includes('�') ? texto : decodificado
}

/** Arquivo de tipo desconhecido que é só texto legível (UTF-8 sem caracteres de controle). */
function textoSimples(bytes: Uint8Array): string[] | null {
  if (bytes.byteLength === 0 || bytes.byteLength > MAX_TEXTO) return null
  let texto: string
  try {
    texto = new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } catch {
    return null
  }
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/u.test(texto)) return null
  return texto.split(/\r?\n/u).map((linha) => linha.trim()).filter((linha) => linha.length > 0)
}

// ---------- imagens ----------

async function girarPng(png: Buffer, graus: 90 | 180 | 270): Promise<{ png: Buffer; width: number; height: number }> {
  const image = await loadImage(png)
  const lateral = graus !== 180
  const width = lateral ? image.height : image.width
  const height = lateral ? image.width : image.height
  const canvas = createCanvas(width, height)
  const context = canvas.getContext('2d')
  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, width, height)
  context.translate(width / 2, height / 2)
  context.rotate((graus * Math.PI) / 180)
  context.drawImage(image, -image.width / 2, -image.height / 2)
  return { png: canvas.toBuffer('image/png'), width, height }
}

/**
 * OCR de imagem avulsa. Se a leitura na posição original for fraca, tenta a imagem girada (90°,
 * 270°, 180°) e fica com a de maior confiança; a rotação usada fica registrada.
 */
async function ocrDeImagem(bytes: Uint8Array, id: string, opcoes: OpcoesLeitura & { ocr: OcrEngine }): Promise<{ pagina: OcrPage; rotacao: PaginaLida['rotacao'] }> {
  const prepared = await prepareImage(bytes, id, opcoes.limites.image)
  let melhor = { pagina: await opcoes.ocr.recognizeImage(prepared), rotacao: 0 as PaginaLida['rotacao'] }
  if (melhor.pagina.confidence >= OCR_CONFIAVEL + 10) return melhor
  for (const graus of [90, 270, 180] as const) {
    const girada = await girarPng(prepared.png, graus)
    const pagina = await opcoes.ocr.recognizeImage(girada)
    if (pagina.confidence > melhor.pagina.confidence + 5) melhor = { pagina, rotacao: graus }
    if (melhor.pagina.confidence >= OCR_CONFIAVEL + 10) break
  }
  return melhor
}

function linhasDoOcr(pagina: OcrPage, numero: number, minConfidence: number): LinhaLida[] {
  return pagina.lines
    .map((line) =>
      linhaDe(
        numero,
        line.words
          .filter((word) => !isOcrNoise(word.text, word.confidence, minConfidence))
          .map((word): PalavraLida => ({ texto: word.text, regiao: word.region, origem: 'ocr', confianca: word.confidence })),
      ),
    )
    .filter((linha) => linha.palavras.length > 0)
}

function legibilidadeDoTexto(linhas: readonly LinhaLida[], confiancaOcr: number | undefined): Legibilidade {
  const total = caracteres(linhas)
  if (total === 0) return 'ilegivel'
  if (total < MIN_CARACTERES) return 'parcial'
  if (confiancaOcr !== undefined && confiancaOcr < OCR_CONFIAVEL) return 'parcial'
  return 'legivel'
}

// ---------- leitura ----------

export async function lerAnexo(id: string, nome: string, bytes: Uint8Array, opcoes: OpcoesLeitura): Promise<AnexoLido> {
  const inspecao = await inspecionarArquivo(nome, bytes, opcoes.limites)
  const base = { id, nome, inspecao, paginas: [] as PaginaLida[], linhas: [] as LinhaLida[], origemTexto: null, assinaturas: [] as AreaAssinatura[] }
  if (inspecao.isolamento.isolado) return { ...base, legibilidade: 'isolado' }
  if (inspecao.integridade === 'vazio' || inspecao.integridade === 'corrompido' || inspecao.integridade === 'protegido-por-senha') {
    return { ...base, legibilidade: 'ilegivel', falha: inspecao.integridade }
  }

  switch (inspecao.tipoReal) {
    case 'pdf':
      return lerPdf(base, bytes, opcoes)
    case 'jpeg':
    case 'png': {
      if (inspecao.integridade !== 'legivel') return { ...base, legibilidade: 'ilegivel', falha: inspecao.integridade }
      if (!opcoes.ocr) {
        return { ...base, paginas: [{ pagina: 1, conteudo: 'scanned', metodo: 'nao-lida', rotacao: 0 }], legibilidade: 'ilegivel', falha: 'sem-ocr' }
      }
      try {
        const { pagina, rotacao } = await ocrDeImagem(bytes, id, { ...opcoes, ocr: opcoes.ocr })
        const linhas = linhasDoOcr(pagina, 1, opcoes.ocrMinConfidence)
        return {
          ...base,
          paginas: [{ pagina: 1, conteudo: 'scanned', metodo: 'ocr', confiancaOcr: pagina.confidence, rotacao }],
          linhas,
          origemTexto: 'ocr',
          confiancaOcr: pagina.confidence,
          legibilidade: legibilidadeDoTexto(linhas, pagina.confidence),
        }
      } catch (error) {
        if (!(error instanceof DocumentFailure)) throw error
        return { ...base, legibilidade: 'ilegivel', falha: error.reason }
      }
    }
    case 'docx': {
      const paragrafos = textoDoDocx(bytes)
      if (!paragrafos) return { ...base, legibilidade: 'ilegivel', falha: 'docx-sem-texto' }
      const linhas = paragrafos.map((texto) => linhaSemPosicao(1, texto, 'docx'))
      return { ...base, linhas, origemTexto: 'docx', legibilidade: legibilidadeDoTexto(linhas, undefined) }
    }
    case 'dxf': {
      const linhas = textoDoDxf(bytes).map((texto) => linhaSemPosicao(1, texto, 'dxf'))
      // O DXF é reconhecido pelo tipo; o texto do desenho é complemento, não exigência.
      return { ...base, linhas, origemTexto: linhas.length > 0 ? 'dxf' : null, legibilidade: 'nao-interpretado' }
    }
    case 'dwg':
      return { ...base, legibilidade: 'nao-interpretado' }
    case 'desconhecido': {
      const texto = textoSimples(bytes)
      if (!texto) return { ...base, legibilidade: 'ilegivel', falha: 'formato-desconhecido' }
      const linhas = texto.map((linha) => linhaSemPosicao(1, linha, 'texto-simples'))
      return { ...base, linhas, origemTexto: 'texto-simples', legibilidade: legibilidadeDoTexto(linhas, undefined) }
    }
    default:
      return { ...base, legibilidade: 'ilegivel', falha: 'formato-nao-suportado' }
  }
}

async function lerPdf(
  base: Omit<AnexoLido, 'legibilidade'>,
  bytes: Uint8Array,
  opcoes: OpcoesLeitura,
): Promise<AnexoLido> {
  let documento
  try {
    documento = await analyzeDocument(bytes, base.id, opcoes.limites.reading, { objects: true, preview: true })
  } catch (error) {
    if (!(error instanceof DocumentFailure)) throw error
    return { ...base, legibilidade: 'ilegivel', falha: error.reason }
  }
  try {
    const paginas: PaginaLida[] = []
    const linhas: LinhaLida[] = []
    const assinaturas: AreaAssinatura[] = []
    const confiancas: number[] = []
    let origemOcr = false
    for (const page of documento.pages) {
      const pdfPage = await documento.pdf.getPage(page.pageNumber)
      let metodo: MetodoPagina = page.textCharacters > 0 ? 'camada-de-texto' : 'nao-lida'
      let confiancaOcr: number | undefined
      if (precisaOcr(page) && opcoes.ocr) {
        const ocr = await opcoes.ocr.recognize(pdfPage)
        page.lines = mergeOcr(page, ocr, opcoes.ocrMinConfidence)
        confiancaOcr = ocr.confidence
        confiancas.push(ocr.confidence)
        origemOcr = true
        metodo = page.textCharacters > 0 ? 'camada-e-ocr' : 'ocr'
      }
      const daPagina = palavrasDaPagina(page)
      linhas.push(...daPagina)
      assinaturas.push(...(await areasDeAssinatura(page, pdfPage, daPagina)))
      paginas.push({
        pagina: page.pageNumber,
        conteudo: conteudoDe(page),
        metodo,
        ...(confiancaOcr !== undefined ? { confiancaOcr } : {}),
        rotacao: rotacaoDe(page.rotation),
        larguraPt: page.width,
        alturaPt: page.height,
      })
      pdfPage.cleanup()
    }
    const confiancaOcr = confiancas.length > 0 ? Math.round(confiancas.reduce((soma, valor) => soma + valor, 0) / confiancas.length) : undefined
    const algumaPaginaSemLeitura = paginas.some((pagina) => pagina.metodo === 'nao-lida' && pagina.conteudo !== 'blank')
    let legibilidade = legibilidadeDoTexto(linhas, confiancaOcr)
    if (legibilidade === 'legivel' && algumaPaginaSemLeitura) legibilidade = 'parcial'
    return {
      ...base,
      paginas,
      linhas,
      origemTexto: origemOcr ? (documento.characterCount > 0 ? 'camada-de-texto' : 'ocr') : linhas.length > 0 ? 'camada-de-texto' : null,
      ...(confiancaOcr !== undefined ? { confiancaOcr } : {}),
      assinaturas,
      legibilidade,
      ...(algumaPaginaSemLeitura && !opcoes.ocr ? { falha: 'sem-ocr' } : {}),
    }
  } finally {
    await documento.close()
  }
}
