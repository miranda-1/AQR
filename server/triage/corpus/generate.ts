import { createHash } from 'node:crypto'
import type { TipoArquivo } from '../../../shared/contracts/triage.ts'
import {
  CLASSE_DA_PECA,
  docxFicticio,
  dwgFicticio,
  dxfFicticio,
  executavelFicticio,
  IMOVEL_BASE,
  imagemAvulsa,
  pdfComSenha,
  pdfCorrompido,
  pdfDeTexto,
  pdfDigitalizado,
  rarFicticio,
  textoDaPeca,
  textoSimples,
  zipCaminhoPerigoso,
  zipComum,
  type Imovel,
} from './documents.ts'
import { gabaritoPacoteSchema, type GabaritoAnexo, type GabaritoPacote } from './gabarito.ts'
import { PACOTES, type Defeito, type DefinicaoPacote, type EspecAnexo, type Formato } from './pacotes.ts'

/**
 * Gera os pacotes sintéticos: os arquivos e o gabarito de cada um. Determinístico (mesmas
 * sementes, datas fixas nos PDFs e nos ZIPs): duas execuções dão os mesmos bytes.
 */

export interface ArquivoGerado {
  nome: string
  bytes: Uint8Array
}

export interface PacoteGerado {
  gabarito: GabaritoPacote
  arquivos: ArquivoGerado[]
}

export const PROTOCOLADO_EM = '2026-11-05T13:00:00.000Z'

const EXTENSAO_DO_FORMATO: Record<Formato, string> = {
  pdf: 'pdf',
  'pdf-digitalizado': 'pdf',
  jpeg: 'jpg',
  png: 'png',
  dxf: 'dxf',
  dwg: 'dwg',
  docx: 'docx',
}

const TIPO_DO_FORMATO: Record<Formato, TipoArquivo> = {
  pdf: 'pdf',
  'pdf-digitalizado': 'pdf',
  jpeg: 'jpeg',
  png: 'png',
  dxf: 'dxf',
  dwg: 'dwg',
  docx: 'docx',
}

const TIPO_DO_DEFEITO: Record<Defeito, TipoArquivo> = {
  corrompido: 'pdf',
  senha: 'pdf',
  vazio: 'vazio',
  executavel: 'desconhecido',
  'zip-comum': 'zip',
  'zip-caminho-perigoso': 'zip',
  rar: 'rar',
  'texto-simples': 'desconhecido',
}

/** Extensões conhecidas e o tipo de conteúdo que cada uma promete (só para o gabarito). */
const TIPO_DA_EXTENSAO: Record<string, TipoArquivo> = {
  pdf: 'pdf',
  jpg: 'jpeg',
  jpeg: 'jpeg',
  png: 'png',
  dxf: 'dxf',
  dwg: 'dwg',
  docx: 'docx',
  zip: 'zip',
  rar: 'rar',
}

/** Extensões que são contêineres por natureza (DOCX é um ZIP com estrutura própria). */
const EXTENSOES_CONTEINER = new Set(['zip', 'rar', 'docx'])

function extensaoDe(nome: string): string {
  const ponto = nome.lastIndexOf('.')
  return ponto < 0 ? '' : nome.slice(ponto + 1).toLowerCase()
}

function nomePadrao(spec: EspecAnexo): string {
  const raiz = spec.peca === 'cad' ? 'prancha' : spec.peca
  return `${raiz}.${EXTENSAO_DO_FORMATO[spec.formato]}`
}

async function bytesDoAnexo(spec: EspecAnexo, imovel: Imovel, seed: number): Promise<Uint8Array> {
  if (spec.defeito) {
    switch (spec.defeito) {
      case 'corrompido':
        return pdfCorrompido(seed)
      case 'senha':
        return pdfComSenha()
      case 'vazio':
        return new Uint8Array()
      case 'executavel':
        return executavelFicticio(seed)
      case 'zip-comum':
        return zipComum()
      case 'zip-caminho-perigoso':
        return zipCaminhoPerigoso()
      case 'rar':
        return rarFicticio(seed)
      case 'texto-simples':
        return textoSimples()
    }
  }
  if (spec.peca === 'cad') {
    if (spec.formato === 'dxf') return dxfFicticio(imovel)
    if (spec.formato === 'dwg') return dwgFicticio(seed)
    throw new Error(`Formato ${spec.formato} não serve para CAD`)
  }
  const texto = textoDaPeca(spec.peca, imovel)
  switch (spec.formato) {
    case 'pdf':
      return pdfDeTexto(texto, { assinado: spec.assinado ?? true, seed, ...(spec.peca === 'prancha' ? { folha: imovel.formatoFolha } : {}) })
    case 'pdf-digitalizado':
      return pdfDigitalizado(texto, spec.qualidade ?? 'boa', seed)
    case 'jpeg':
    case 'png':
      return imagemAvulsa(texto, spec.formato, spec.qualidade ?? 'boa', seed, spec.rotacao ?? 0)
    case 'docx':
      return docxFicticio(texto)
    case 'dxf':
    case 'dwg':
      throw new Error(`Formato ${spec.formato} só serve para CAD`)
  }
}

/** O que o arquivo É, a partir da definição (nunca do detector de tipo da triagem). */
function gabaritoDoAnexo(spec: EspecAnexo, imovel: Imovel, nome: string, bytes: Uint8Array): GabaritoAnexo {
  const extensao = extensaoDe(nome)
  const tipoReal = spec.defeito ? TIPO_DO_DEFEITO[spec.defeito] : TIPO_DO_FORMATO[spec.formato]
  const esperado = TIPO_DA_EXTENSAO[extensao]
  const extensaoConfere = tipoReal === 'vazio' || esperado === undefined ? 'indeterminado' : esperado === tipoReal

  const motivosIsolamento: GabaritoAnexo['motivosIsolamento'] = []
  if (spec.defeito === 'executavel') motivosIsolamento.push('conteudo-executavel')
  if (spec.defeito === 'zip-caminho-perigoso') motivosIsolamento.push('zip-caminho-perigoso')
  if ((tipoReal === 'zip' || tipoReal === 'rar') && !EXTENSOES_CONTEINER.has(extensao)) motivosIsolamento.push('conteiner-disfarcado')

  const integridade: GabaritoAnexo['integridade'] = spec.defeito
    ? ({ corrompido: 'corrompido', senha: 'protegido-por-senha', vazio: 'vazio' } as const)[spec.defeito as 'corrompido' | 'senha' | 'vazio'] ?? 'nao-suportado'
    : spec.formato === 'dxf' || spec.formato === 'dwg' || spec.formato === 'docx'
      ? 'nao-verificada'
      : 'legivel'

  const leitura: GabaritoAnexo['leitura'] = spec.defeito
    ? 'nenhuma'
    : spec.formato === 'pdf'
      ? 'camada-de-texto'
      : spec.formato === 'pdf-digitalizado' || spec.formato === 'jpeg' || spec.formato === 'png'
        ? 'ocr'
        : 'nao-interpretado'

  const campos: GabaritoAnexo['campos'] = spec.defeito
    ? {}
    : spec.peca === 'cad'
      ? spec.formato === 'dxf'
        ? { lote: imovel.lote, quadra: imovel.quadra }
        : {}
      : textoDaPeca(spec.peca, imovel).campos

  return {
    nome,
    sha256: createHash('sha256').update(bytes).digest('hex'),
    bytes: bytes.byteLength,
    tipoReal,
    extensaoConfere,
    integridade,
    isolar: motivosIsolamento.length > 0,
    motivosIsolamento,
    classe: spec.defeito ? null : CLASSE_DA_PECA[spec.peca],
    leitura,
    ...(leitura === 'ocr' ? { qualidade: spec.qualidade ?? 'boa' } : {}),
    rotacao: spec.rotacao ?? 0,
    campos,
    ...(spec.observacao ? { observacao: spec.observacao } : {}),
  }
}

export async function gerarPacote(definicao: DefinicaoPacote): Promise<PacoteGerado> {
  const imovel: Imovel = { ...IMOVEL_BASE, ...definicao.imovel }
  const numero = Number(definicao.id.slice(4))
  const arquivos: ArquivoGerado[] = []
  const anexos: GabaritoAnexo[] = []
  for (const [index, spec] of definicao.anexos.entries()) {
    const imovelDaPeca: Imovel = { ...imovel, ...spec.imovel }
    const nome = spec.nome ?? nomePadrao(spec)
    const bytes = await bytesDoAnexo(spec, imovelDaPeca, numero * 100 + index)
    arquivos.push({ nome, bytes })
    anexos.push(gabaritoDoAnexo(spec, imovelDaPeca, nome, bytes))
  }
  const gabarito = gabaritoPacoteSchema.parse({
    id: definicao.id,
    titulo: definicao.titulo,
    categorias: definicao.categorias,
    ensaios: definicao.ensaios ?? [],
    entrada: {
      modalidade: 'D',
      etapa: 'abertura',
      protocoladoEm: PROTOCOLADO_EM,
      integridadeDoPacote: definicao.integridadeDoPacote ?? 'completo',
      condicoesConfirmadas: definicao.condicoesConfirmadas ?? [],
    },
    imovel: Object.fromEntries(Object.entries(imovel)),
    anexos,
    regras: definicao.regras,
  })
  return { gabarito, arquivos }
}

export async function gerarCorpus(pacotes: readonly DefinicaoPacote[] = PACOTES): Promise<PacoteGerado[]> {
  const gerados: PacoteGerado[] = []
  for (const pacote of pacotes) gerados.push(await gerarPacote(pacote))
  return gerados
}
