import { createCanvas, loadImage } from '@napi-rs/canvas'
import { PDFDocument, PDFHexString } from 'pdf-lib'
import type { ClasseDocumental, NomeCampo } from '../../../shared/contracts/triage.ts'
import { A4, buildPdf, scanBytes, seeded, type Block, type ScanBlock } from '../../comparison/evaluation/corpus-pdf.ts'
import { makeDocx, makeZip } from './zip.ts'

/**
 * Peças fictícias de um processo de desdobro. Todo dado é inventado; toda peça diz, no topo,
 * que é fictícia e sem validade. Os textos seguem a lista de campos das fichas do dossiê
 * (seção 6), sem reproduzir modelo oficial.
 */

export const AVISO_FICTICIO = 'DOCUMENTO FICTÍCIO PARA TESTE - SEM VALIDADE'

export interface Imovel {
  titular: string
  signatario: string
  /** Qualidade em que o signatário assina o requerimento. */
  qualidadeSignatario: string
  rtNome: string
  rtRegistro: string
  assunto: string
  lote: string
  quadra: string
  parcelamento: string
  bairro: string
  matricula: string
  cartorio: string
  inscricao: string
  /** Como impresso, ex.: "450,00 m²". */
  area: string
  lotesFinais: string
  dataRequerimento: string
  dataEmissaoMatricula: string
  dataRevisao: string
  escalaSituacao: string
  formatoFolha: 'A3' | 'A2' | 'A1' | 'A0'
  gdu: string
}

export const IMOVEL_BASE: Imovel = {
  titular: 'Carla Ficticia de Exemplo',
  signatario: 'Carla Ficticia de Exemplo',
  qualidadeSignatario: 'proprietária',
  rtNome: 'João Exemplo Teste',
  rtRegistro: 'CREA-FIC 000001',
  assunto: 'DESDOBRO',
  lote: 'F7',
  quadra: '12',
  parcelamento: 'Jardim Ficticio',
  bairro: 'Bairro Exemplo',
  matricula: '90417',
  cartorio: '9º Serviço Registral Fictício',
  inscricao: '9999.0001.001',
  area: '450,00 m²',
  lotesFinais: 'F7A (225,00 m²) e F7B (225,00 m²)',
  dataRequerimento: '05/11/2026',
  dataEmissaoMatricula: '20/10/2026',
  dataRevisao: '01/11/2026',
  escalaSituacao: '1:10.000',
  formatoFolha: 'A3',
  gdu: 'GDU-FIC-0001/2026',
}

export type Peca =
  | 'requerimento'
  | 'drt-01'
  | 'drt-03'
  | 'matricula'
  | 'ficha-cadastral'
  | 'art'
  | 'prancha'
  | 'cad'
  | 'memorial'
  | 'gdu'
  | 'procuracao'

export const CLASSE_DA_PECA: Record<Peca, ClasseDocumental> = {
  requerimento: 'requerimento',
  'drt-01': 'drt-01',
  'drt-03': 'drt-03',
  matricula: 'matricula-transcricao',
  'ficha-cadastral': 'inscricao-imobiliaria',
  art: 'art-rrt-similar',
  prancha: 'prancha',
  cad: 'cad',
  memorial: 'memorial',
  gdu: 'gdu-gdr',
  procuracao: 'representacao',
}

export interface TextoDaPeca {
  titulo: string
  linhas: string[]
  campos: Partial<Record<NomeCampo, string>>
  /** Rótulos de assinatura no pé da página, na ordem. */
  assinaturas: string[]
}

/** Texto de cada peça e os campos que ele imprime (o gabarito usa os mesmos valores). */
export function textoDaPeca(peca: Exclude<Peca, 'cad'>, im: Imovel): TextoDaPeca {
  switch (peca) {
    case 'requerimento':
      return {
        titulo: 'REQUERIMENTO PARA PROCESSO CARTOGRÁFICO',
        linhas: [
          `Assunto: ${im.assunto}`,
          `Proprietário(a): ${im.titular}`,
          `Responsável técnico: ${im.rtNome} - ${im.rtRegistro}`,
          `Lote: ${im.lote}   Quadra: ${im.quadra}`,
          `Parcelamento: ${im.parcelamento}   Bairro: ${im.bairro}`,
          `Matrícula: ${im.matricula}   Inscrição imobiliária: ${im.inscricao}`,
          `Assina este requerimento: ${im.signatario}, na qualidade de ${im.qualidadeSignatario}.`,
          `Campo Grande, ${im.dataRequerimento}.`,
        ],
        campos: {
          assunto: im.assunto,
          titular: im.titular,
          'rt-nome': im.rtNome,
          lote: im.lote,
          quadra: im.quadra,
          parcelamento: im.parcelamento,
          bairro: im.bairro,
          matricula: im.matricula,
          inscricao: im.inscricao,
          signatario: im.signatario,
        },
        assinaturas: ['Assinatura do(a) requerente', 'Assinatura do responsável técnico'],
      }
    case 'drt-01':
    case 'drt-03': {
      const tipo = peca === 'drt-01' ? 'DRT 01' : 'DRT 03'
      const assunto = peca === 'drt-01' ? im.assunto : 'RETIFICAÇÃO DE REGISTRO IMOBILIÁRIO'
      return {
        titulo: `DECLARAÇÃO DE RESPONSABILIDADE TÉCNICA - ${tipo}`,
        linhas: [
          `Assunto: ${assunto}`,
          `Declaro ser o responsável técnico pelas peças técnicas deste processo.`,
          `Profissional: ${im.rtNome} - ${im.rtRegistro}`,
          `Lote: ${im.lote}   Quadra: ${im.quadra}   Matrícula: ${im.matricula}`,
          `Campo Grande, ${im.dataRequerimento}.`,
        ],
        campos: { assunto, 'rt-nome': im.rtNome, 'rt-registro': im.rtRegistro, lote: im.lote, quadra: im.quadra, matricula: im.matricula },
        assinaturas: ['Assinatura do responsável técnico'],
      }
    }
    case 'matricula':
      return {
        titulo: `CERTIDÃO DE INTEIRO TEOR - MATRÍCULA Nº ${im.matricula}`,
        linhas: [
          `${im.cartorio}`,
          `Imóvel: lote ${im.lote} da quadra ${im.quadra} do ${im.parcelamento}, com área de ${im.area}.`,
          `Proprietário(a): ${im.titular}.`,
          `Certidão emitida em ${im.dataEmissaoMatricula}.`,
        ],
        campos: {
          matricula: im.matricula,
          cartorio: im.cartorio,
          lote: im.lote,
          quadra: im.quadra,
          parcelamento: im.parcelamento,
          area: im.area,
          titular: im.titular,
          'data-emissao': im.dataEmissaoMatricula,
        },
        assinaturas: [],
      }
    case 'ficha-cadastral':
      return {
        titulo: 'FICHA CADASTRAL IMOBILIÁRIA',
        linhas: [`Inscrição imobiliária: ${im.inscricao}`, `Lote: ${im.lote}   Quadra: ${im.quadra}`, `Bairro: ${im.bairro}`],
        campos: { inscricao: im.inscricao, lote: im.lote, quadra: im.quadra, bairro: im.bairro },
        assinaturas: [],
      }
    case 'art':
      return {
        titulo: 'ANOTAÇÃO DE RESPONSABILIDADE TÉCNICA - ART',
        linhas: [
          `Profissional: ${im.rtNome} - ${im.rtRegistro}`,
          `Contratante: ${im.titular}`,
          `Atividade: projeto de ${im.assunto.toLowerCase()}`,
          `Lote: ${im.lote}   Quadra: ${im.quadra}   Bairro: ${im.bairro}`,
          `Matrícula: ${im.matricula}`,
          'Situação: registrada e quitada (fictícia).',
        ],
        campos: {
          'rt-nome': im.rtNome,
          'rt-registro': im.rtRegistro,
          titular: im.titular,
          lote: im.lote,
          quadra: im.quadra,
          bairro: im.bairro,
          matricula: im.matricula,
        },
        assinaturas: ['Assinatura do profissional'],
      }
    case 'prancha':
      return {
        titulo: `PRANCHA - ${im.assunto}`,
        linhas: [
          `Assunto: ${im.assunto}`,
          `Titular: ${im.titular}`,
          `Lote: ${im.lote}   Quadra: ${im.quadra}`,
          `Parcelamento: ${im.parcelamento}   Bairro: ${im.bairro}`,
          `Matrícula: ${im.matricula}`,
          `Situação atual: lote ${im.lote} - ${im.area}`,
          `Situação final: lotes ${im.lotesFinais}`,
          `Planta de situação - escala ${im.escalaSituacao}`,
          `Formato ${im.formatoFolha}   Data: ${im.dataRevisao}`,
          `Responsável técnico: ${im.rtNome} - ${im.rtRegistro}`,
        ],
        campos: {
          assunto: im.assunto,
          titular: im.titular,
          lote: im.lote,
          quadra: im.quadra,
          parcelamento: im.parcelamento,
          bairro: im.bairro,
          matricula: im.matricula,
          area: im.area,
          'escala-situacao': im.escalaSituacao,
          'formato-folha': im.formatoFolha,
          'data-revisao': im.dataRevisao,
          'rt-nome': im.rtNome,
        },
        assinaturas: ['Assinatura do responsável técnico'],
      }
    case 'memorial':
      return {
        titulo: 'MEMORIAL DESCRITIVO',
        linhas: [
          `Assunto: ${im.assunto}`,
          `Imóvel: lote ${im.lote} da quadra ${im.quadra}, matrícula ${im.matricula}, ${im.parcelamento}.`,
          `Titular: ${im.titular}`,
          `Área total: ${im.area}. Lotes resultantes: ${im.lotesFinais}.`,
          `Data: ${im.dataRevisao}`,
          `Responsável técnico: ${im.rtNome} - ${im.rtRegistro}`,
        ],
        campos: {
          assunto: im.assunto,
          lote: im.lote,
          quadra: im.quadra,
          matricula: im.matricula,
          titular: im.titular,
          area: im.area,
          'data-revisao': im.dataRevisao,
          'rt-nome': im.rtNome,
        },
        assinaturas: ['Assinatura do responsável técnico'],
      }
    case 'gdu':
      return {
        titulo: `GUIA DE DIRETRIZES URBANÍSTICAS - ${im.gdu}`,
        linhas: [`Imóvel: lote ${im.lote} da quadra ${im.quadra}, matrícula ${im.matricula}.`, `Área: ${im.area}.`, 'Diretrizes fictícias para teste.'],
        campos: { lote: im.lote, quadra: im.quadra, matricula: im.matricula, area: im.area },
        assinaturas: [],
      }
    case 'procuracao':
      return {
        titulo: 'PROCURAÇÃO',
        linhas: [
          `Outorgante: ${im.titular}`,
          `Outorgado(a): ${im.signatario}`,
          `Poderes: representar a outorgante no processo de ${im.assunto.toLowerCase()} do lote ${im.lote} da quadra ${im.quadra}.`,
        ],
        campos: { titular: im.titular, signatario: im.signatario, lote: im.lote, quadra: im.quadra },
        assinaturas: ['Assinatura da outorgante'],
      }
  }
}

const SIZES: Record<Imovel['formatoFolha'], readonly [number, number]> = {
  A3: [1190.55, 841.89],
  A2: [1683.78, 1190.55],
  A1: [2383.94, 1683.78],
  A0: [3370.39, 2383.94],
}

/** Rabisco fictício (linhas) na área de assinatura. */
function rubrica(x: number, y: number, seed: number): Block[] {
  const random = seeded(seed)
  const blocks: Block[] = []
  let cx = x
  for (let index = 0; index < 6; index += 1) {
    const width = 14 + random() * 12
    const up = index % 2 === 0
    blocks.push({ kind: 'line', x: cx, y: up ? y + 22 : y, width, height: up ? -22 : 22, stroke: [0.1, 0.14, 0.5], lineWidth: 1.4 })
    cx += width
  }
  return blocks
}

export interface OpcoesPdf {
  /** Assinaturas preenchidas (padrão). `false` deixa as áreas de assinatura vazias. */
  assinado?: boolean
  seed?: number
}

/** PDF com camada de texto. A prancha usa o formato de folha do imóvel. */
export async function pdfDeTexto(texto: TextoDaPeca, opcoes: OpcoesPdf & { folha?: Imovel['formatoFolha'] } = {}): Promise<Uint8Array> {
  const size = opcoes.folha ? SIZES[opcoes.folha] : A4
  const assinado = opcoes.assinado ?? true
  const blocks: Block[] = [
    { kind: 'text', x: 56, y: 40, text: AVISO_FICTICIO, size: 9 },
    { kind: 'text', x: 56, y: 70, text: texto.titulo, size: 14, gap: 12 },
    ...texto.linhas.map((linha): Block => ({ kind: 'text', x: 56, text: linha, size: 11, width: size[0] - 112, gap: 4 })),
  ]
  texto.assinaturas.forEach((rotulo, index) => {
    const top = size[1] - 150 + index * 70
    const left = 56
    blocks.push({ kind: 'line', x: left, y: top + 30, width: 220, height: 0, stroke: [0, 0, 0], lineWidth: 0.6 })
    blocks.push({ kind: 'text', x: left, y: top + 36, text: rotulo, size: 9 })
    if (assinado) blocks.push(...rubrica(left + 20, top + 2, (opcoes.seed ?? 1) * 10 + index))
  })
  return (await buildPdf([{ size, blocks }])).bytes
}

export type Qualidade = 'boa' | 'ruido' | 'muito-degradada'

function scanBlock(texto: TextoDaPeca, qualidade: Qualidade, seed: number, encoding?: 'jpeg' | 'png'): ScanBlock {
  const lines = [AVISO_FICTICIO, '', texto.titulo, '', ...texto.linhas]
  const base: ScanBlock = { kind: 'scan', lines, left: 56, top: 60, size: 12, seed, ...(encoding ? { encoding } : {}) }
  if (qualidade === 'ruido') return { ...base, noise: 0.04, skew: 1.5, blur: 1, dpi: 150 }
  if (qualidade === 'muito-degradada') return { ...base, noise: 0.2, skew: 3, blur: 2, dpi: 60, quality: 35 }
  return { ...base, dpi: 150 }
}

/** PDF só com a imagem da página (digitalização), sem camada de texto. */
export async function pdfDigitalizado(texto: TextoDaPeca, qualidade: Qualidade, seed: number): Promise<Uint8Array> {
  return (await buildPdf([{ blocks: [scanBlock(texto, qualidade, seed)] }])).bytes
}

/** Imagem avulsa (JPG ou PNG) da página, opcionalmente girada 90°. */
export async function imagemAvulsa(texto: TextoDaPeca, formato: 'jpeg' | 'png', qualidade: Qualidade, seed: number, rotacao: 0 | 90 = 0): Promise<Uint8Array> {
  const bytes = scanBytes(scanBlock(texto, qualidade, seed, formato), A4)
  if (rotacao === 0) return new Uint8Array(bytes)
  const image = await loadImage(bytes)
  const canvas = createCanvas(image.height, image.width)
  const context = canvas.getContext('2d')
  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.translate(image.height, 0)
  context.rotate(Math.PI / 2)
  context.drawImage(image, 0, 0)
  return new Uint8Array(formato === 'png' ? canvas.toBuffer('image/png') : canvas.toBuffer('image/jpeg', 85))
}

/** DXF ASCII mínimo com textos do desenho (não há geometria a interpretar nesta fase). */
export function dxfFicticio(im: Imovel): Uint8Array {
  const textos = [AVISO_FICTICIO, `LOTE ${im.lote} QUADRA ${im.quadra}`, `SITUACAO FINAL ${im.lotesFinais}`]
  const pairs: [number, string][] = [
    [0, 'SECTION'], [2, 'HEADER'], [9, '$ACADVER'], [1, 'AC1015'], [0, 'ENDSEC'],
    [0, 'SECTION'], [2, 'ENTITIES'],
  ]
  textos.forEach((texto, index) => {
    pairs.push([0, 'TEXT'], [8, '0'], [10, '0.0'], [20, String(index * 5)], [30, '0.0'], [40, '2.5'], [1, texto])
  })
  pairs.push([0, 'LINE'], [8, '0'], [10, '0.0'], [20, '0.0'], [30, '0.0'], [11, '30.0'], [21, '15.0'], [31, '0.0'])
  pairs.push([0, 'ENDSEC'], [0, 'EOF'])
  return new TextEncoder().encode(pairs.map(([code, value]) => `${String(code).padStart(3)}\n${value}\n`).join(''))
}

/** Arquivo com a assinatura de versão de um DWG (AutoCAD 2018) e corpo fictício: só para reconhecer o tipo. */
export function dwgFicticio(seed: number): Uint8Array {
  const random = seeded(seed)
  const body = Array.from({ length: 250 }, () => Math.floor(random() * 256))
  return new Uint8Array([...new TextEncoder().encode('AC1032'), 0, 0, 0, 0, 0, ...body])
}

export function docxFicticio(texto: TextoDaPeca): Uint8Array {
  return makeDocx([AVISO_FICTICIO, texto.titulo, ...texto.linhas])
}

// ---------- arquivos problemáticos ----------

/** Começa como PDF, mas o resto é ruído: nenhum leitor monta o documento. */
export function pdfCorrompido(seed: number): Uint8Array {
  const random = seeded(seed)
  const noise = Array.from({ length: 2048 }, () => 32 + Math.floor(random() * 90))
  return new Uint8Array([...new TextEncoder().encode('%PDF-1.7\n'), ...noise])
}

/** PDF que declara criptografia com chaves aleatórias (sem senha conhecida), com datas fixas. */
export async function pdfComSenha(): Promise<Uint8Array> {
  const doc = await PDFDocument.create({ updateMetadata: false })
  doc.setCreationDate(new Date(0))
  doc.setModificationDate(new Date(0))
  doc.addPage([A4[0], A4[1]]).drawText('Conteudo ficticio protegido', { x: 72, y: 700, size: 12 })
  const encrypt = doc.context.obj({
    Filter: 'Standard',
    V: 1,
    R: 2,
    Length: 40,
    P: -44,
    O: PDFHexString.of('A3'.repeat(32)),
    U: PDFHexString.of('5C'.repeat(32)),
  })
  doc.context.trailerInfo.Encrypt = doc.context.register(encrypt)
  doc.context.trailerInfo.ID = doc.context.obj([PDFHexString.of('01'.repeat(16)), PDFHexString.of('01'.repeat(16))])
  return doc.save({ useObjectStreams: false })
}

/** Cabeçalho de executável do Windows ("MZ") com corpo fictício. Não executa nada. */
export function executavelFicticio(seed: number): Uint8Array {
  const random = seeded(seed)
  return new Uint8Array([0x4d, 0x5a, 0x90, 0x00, ...Array.from({ length: 508 }, () => Math.floor(random() * 256))])
}

export function zipComum(): Uint8Array {
  return makeZip([{ name: 'leia-me.txt', data: `${AVISO_FICTICIO}\nArquivo compactado comum, sem documento Word.\n` }])
}

/** ZIP com entrada que tentaria sair da pasta ao ser extraída (ensaio T20). */
export function zipCaminhoPerigoso(): Uint8Array {
  return makeZip([
    { name: 'anexos/leia-me.txt', data: `${AVISO_FICTICIO}\n` },
    { name: '../../fora-da-pasta.txt', data: 'entrada com caminho perigoso\n' },
  ])
}

/** Cabeçalho de RAR 5 com corpo fictício (ensaio T33). */
export function rarFicticio(seed: number): Uint8Array {
  const random = seeded(seed)
  return new Uint8Array([0x52, 0x61, 0x72, 0x21, 0x1a, 0x07, 0x01, 0x00, ...Array.from({ length: 120 }, () => Math.floor(random() * 256))])
}

export function textoSimples(): Uint8Array {
  return new TextEncoder().encode(`${AVISO_FICTICIO}\nEste arquivo é texto simples, não é um desenho CAD.\n`)
}
