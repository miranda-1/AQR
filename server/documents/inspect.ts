import { createHash } from 'node:crypto'
import type { TipoArquivo } from '../../shared/contracts/triage.ts'
import { DocumentFailure } from './failure.ts'
import { conteinerDisfarcado, detectarTipo, extensaoConfere, extensaoDe, type MotivoIsolamento } from './file-type.ts'
import { prepareImage } from './image.ts'
import type { ImageLimits, ReadingLimits } from './limits.ts'
import { openPdf } from './pdf/load.ts'

/**
 * Primeira olhada num arquivo recebido, antes de qualquer leitura de conteúdo: hash, tipo real,
 * extensão, integridade e isolamento. Arquivo suspeito fica isolado e não é aberto. Informação que
 * não se pode afirmar fica como "não verificada" ou "indeterminado".
 */

export type IntegridadeArquivo = 'legivel' | 'protegido-por-senha' | 'corrompido' | 'vazio' | 'nao-suportado' | 'nao-verificada'
export type MotivoInspecao = MotivoIsolamento | 'imagem-grande-demais'

export interface InspecaoArquivo {
  nome: string
  extensao: string
  sha256: string
  bytes: number
  tipoReal: TipoArquivo
  confiancaTipo: 'alta' | 'baixa'
  detalheTipo?: string
  extensaoConfere: boolean | 'indeterminado'
  integridade: IntegridadeArquivo
  isolamento: { isolado: boolean; motivos: MotivoInspecao[] }
  /** Páginas do PDF legível. */
  paginas?: number
  /** Tamanho declarado da imagem legível. */
  dimensoes?: { largura: number; altura: number }
}

export interface InspectLimits {
  reading: Pick<ReadingLimits, 'maxFileSizeBytes' | 'maxPages'>
  image: ImageLimits
}

/** Formatos cujo conteúdo esta fase reconhece, mas não interpreta. */
const NAO_INTERPRETADOS = new Set<TipoArquivo>(['dxf', 'dwg', 'docx'])

export async function inspecionarArquivo(nome: string, bytes: Uint8Array, limits: InspectLimits): Promise<InspecaoArquivo> {
  const deteccao = detectarTipo(bytes)
  const motivos: MotivoInspecao[] = [...deteccao.suspeitas]
  if (conteinerDisfarcado(nome, deteccao.tipo)) motivos.push('conteiner-disfarcado')
  const base = {
    nome,
    extensao: extensaoDe(nome),
    sha256: createHash('sha256').update(bytes).digest('hex'),
    bytes: bytes.byteLength,
    tipoReal: deteccao.tipo,
    confiancaTipo: deteccao.confianca,
    ...(deteccao.detalhe ? { detalheTipo: deteccao.detalhe } : {}),
    extensaoConfere: extensaoConfere(nome, deteccao.tipo),
  }
  const resultado = (integridade: IntegridadeArquivo, extra: Partial<InspecaoArquivo> = {}): InspecaoArquivo => ({
    ...base,
    integridade,
    isolamento: { isolado: motivos.length > 0, motivos },
    ...extra,
  })

  // Suspeito não é aberto.
  if (motivos.length > 0) return resultado('nao-verificada')
  if (deteccao.tipo === 'vazio') return resultado('vazio')
  if (bytes.byteLength > limits.reading.maxFileSizeBytes) return resultado('nao-suportado')

  if (deteccao.tipo === 'pdf') {
    try {
      const pdf = await openPdf(bytes, nome, limits.reading)
      const paginas = pdf.numPages
      await pdf.loadingTask.destroy()
      return resultado('legivel', { paginas })
    } catch (error) {
      if (!(error instanceof DocumentFailure)) throw error
      if (error.reason === 'protegido-por-senha') return resultado('protegido-por-senha')
      if (error.reason === 'pdf-corrompido' || error.reason === 'assinatura-ausente') return resultado('corrompido')
      return resultado('nao-suportado')
    }
  }

  if (deteccao.tipo === 'jpeg' || deteccao.tipo === 'png') {
    try {
      const { original } = await prepareImage(bytes, nome, limits.image)
      return resultado('legivel', { dimensoes: { largura: original.width, altura: original.height } })
    } catch (error) {
      if (!(error instanceof DocumentFailure)) throw error
      if (error.reason === 'imagem-grande-demais') {
        motivos.push('imagem-grande-demais')
        return resultado('nao-verificada')
      }
      if (error.reason === 'tamanho-excedido') return resultado('nao-suportado')
      return resultado('corrompido')
    }
  }

  if (NAO_INTERPRETADOS.has(deteccao.tipo)) return resultado('nao-verificada')
  return resultado('nao-suportado')
}
