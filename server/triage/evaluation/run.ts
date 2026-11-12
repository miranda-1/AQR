import { defaultComparisonLimits } from '../../comparison/limits.ts'
import { defaultImageLimits } from '../../documents/limits.ts'
import { createOcrEngine, type OcrEngine } from '../../documents/ocr/ocr-engine.ts'
import { triarAnexo, type AnexoTriado, type DependenciasTriagem } from '../pipeline.ts'
import { casosDeAvaliacao, type CasoAvaliacao, type Conjunto } from './casos.ts'
import { avaliarClassificacao, type ResultadoClassificacao } from './classificacao.ts'
import { avaliarExtracao, type CampoExtra, type ResultadoCampo } from './extracao.ts'

/**
 * Roda o núcleo da triagem sobre os conjuntos sintéticos e compara com os gabaritos. Os gabaritos
 * nunca são alterados aqui: divergência é resultado a relatar.
 */

export interface CasoExecutado {
  caso: CasoAvaliacao
  anexos: AnexoTriado[]
}

export interface Avaliacao {
  executados: CasoExecutado[]
  classificacao: ResultadoClassificacao[]
  extracao: ResultadoCampo[]
  extras: CampoExtra[]
  ocrDisponivel: boolean
  duracaoMs: number
}

export const LIMITES_AVALIACAO: DependenciasTriagem['limites'] = { reading: defaultComparisonLimits, image: defaultImageLimits }

export async function executarCaso(caso: CasoAvaliacao, deps: DependenciasTriagem): Promise<CasoExecutado> {
  const anexos: AnexoTriado[] = []
  for (const [indice, esperado] of caso.anexos.entries()) {
    const arquivo = caso.arquivos.find((item) => item.nome === esperado.nome)
    if (!arquivo) throw new Error(`${caso.id}: arquivo ${esperado.nome} não gerado`)
    anexos.push(await triarAnexo(`anexo-${indice + 1}`, arquivo.nome, arquivo.bytes, deps))
  }
  return { caso, anexos }
}

export async function avaliar(opcoes: { conjuntos?: Conjunto[]; ocr?: OcrEngine | 'criar' | 'nenhum' } = {}): Promise<Avaliacao> {
  const inicio = Date.now()
  let ocr: OcrEngine | undefined
  let criado = false
  if (opcoes.ocr === 'nenhum') ocr = undefined
  else if (opcoes.ocr === undefined || opcoes.ocr === 'criar') {
    const resultado = await createOcrEngine()
    ocr = resultado.engine
    criado = ocr !== undefined
  } else ocr = opcoes.ocr
  try {
    const deps: DependenciasTriagem = { limites: LIMITES_AVALIACAO, ...(ocr ? { ocr } : {}) }
    const executados: CasoExecutado[] = []
    for (const caso of await casosDeAvaliacao(opcoes.conjuntos)) executados.push(await executarCaso(caso, deps))
    const pares = executados.flatMap(({ caso, anexos }) =>
      caso.anexos.map((esperado, indice) => {
        const triado = anexos[indice]
        if (!triado) throw new Error('anexo sem resultado')
        return { caso, esperado, triado }
      }),
    )
    const classificacao = pares.map(({ caso, esperado, triado }) => avaliarClassificacao(caso, esperado, triado))
    const extracoes = pares.map(({ caso, esperado, triado }) => avaliarExtracao(caso, esperado, triado))
    return {
      executados,
      classificacao,
      extracao: extracoes.flatMap((item) => item.campos),
      extras: extracoes.flatMap((item) => item.extras),
      ocrDisponivel: ocr !== undefined,
      duracaoMs: Date.now() - inicio,
    }
  } finally {
    if (criado) await ocr?.close()
  }
}
