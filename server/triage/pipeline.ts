import { anexoSchema, type Anexo } from '../../shared/contracts/triage.ts'
import type { OcrEngine } from '../documents/ocr/ocr-engine.ts'
import { classificarAnexo, type ClassificacaoDetalhada } from './classification/classify.ts'
import { extrairCampos, type CampoDetalhado } from './extraction/extract.ts'
import { lerAnexo, type AnexoLido, type LeituraLimites } from './reading/read.ts'

/**
 * Núcleo experimental da triagem (E4–E6): leitura → classificação → extração → comparação →
 * regras. Recebe arquivos já selecionados para um processo e devolve tudo o que o sistema
 * propõe, com evidência. Não persiste nada, não chama serviço externo e não decide: o resultado é
 * material para revisão de servidor.
 */

export interface DependenciasTriagem {
  limites: LeituraLimites
  ocr?: OcrEngine
  ocrMinConfidence?: number
}

export interface AnexoTriado {
  lido: AnexoLido
  classificacao: ClassificacaoDetalhada
  /** O anexo no formato do contrato (`shared/contracts/triage.ts`). */
  contrato: Anexo
  /** Campos extraídos (E5), cada um com evidência. */
  campos: CampoDetalhado[]
}

const PADRAO_OCR_MIN = 45

export function anexoDoContrato(lido: AnexoLido, classificacao: ClassificacaoDetalhada): Anexo {
  const { inspecao } = lido
  return anexoSchema.parse({
    id: lido.id,
    nome: lido.nome,
    sha256: inspecao.sha256,
    bytes: inspecao.bytes,
    extensao: inspecao.extensao.slice(0, 16),
    tipoReal: inspecao.tipoReal,
    extensaoConfere: inspecao.extensaoConfere,
    integridade: inspecao.integridade,
    isolamento: {
      isolado: inspecao.isolamento.isolado,
      motivos: inspecao.isolamento.motivos,
    },
    paginas: lido.paginas.map((pagina) => ({
      pagina: pagina.pagina,
      conteudo: pagina.conteudo,
      metodo: pagina.metodo,
      ...(pagina.confiancaOcr !== undefined ? { confiancaOcr: pagina.confiancaOcr } : {}),
      rotacao: pagina.rotacao,
    })),
    classificacao: classificacao.contrato,
  })
}

/** Lê, classifica e extrai os campos de um anexo. O id é dado por quem chama (nunca derivado do conteúdo do nome). */
export async function triarAnexo(id: string, nome: string, bytes: Uint8Array, deps: DependenciasTriagem): Promise<AnexoTriado> {
  const lido = await lerAnexo(id, nome, bytes, {
    limites: deps.limites,
    ...(deps.ocr ? { ocr: deps.ocr } : {}),
    ocrMinConfidence: deps.ocrMinConfidence ?? PADRAO_OCR_MIN,
  })
  const classificacao = classificarAnexo(lido)
  return { lido, classificacao, contrato: anexoDoContrato(lido, classificacao), campos: extrairCampos(lido, classificacao) }
}

export async function triarAnexos(arquivos: readonly { nome: string; bytes: Uint8Array }[], deps: DependenciasTriagem): Promise<AnexoTriado[]> {
  const triados: AnexoTriado[] = []
  for (const [indice, arquivo] of arquivos.entries()) triados.push(await triarAnexo(`anexo-${indice + 1}`, arquivo.nome, arquivo.bytes, deps))
  return triados
}
