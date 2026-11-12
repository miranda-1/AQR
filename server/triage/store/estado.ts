import { z } from 'zod'
import { anexoSchema, campoExtraidoSchema, classificacaoSchema } from '../../../shared/contracts/triage.ts'
import type { AnexoTriado } from '../pipeline.ts'
import type { LinhaLida } from '../reading/text.ts'

/**
 * Estado de um anexo guardado para reprocessar sem reler o documento: o necessário para as regras
 * (inspeção, páginas, legibilidade, áreas de assinatura, classificação, campos com evidência), **sem
 * o texto integral** das linhas. Os sinais de classificação e as ocorrências de campo ficam sem a
 * linha de texto: as regras só usam classe, peso e valor.
 */

export const FORMATO_ESTADO = 1

const LINHA_VAZIA = (pagina: number): LinhaLida => ({ pagina, palavras: [], texto: '' })

export function estadoDoAnexo(triado: AnexoTriado): unknown {
  const { lido, classificacao, campos, contrato } = triado
  return {
    formato: FORMATO_ESTADO,
    contrato,
    lido: { ...lido, linhas: [] },
    classificacao: {
      ...classificacao,
      sinais: classificacao.sinais.map((sinal) => ({ ...sinal, linha: LINHA_VAZIA(sinal.pagina) })),
    },
    campos: campos.map((campo) => ({
      ...campo,
      ocorrencias: campo.ocorrencias.map((ocorrencia) => ({ ...ocorrencia, linha: LINHA_VAZIA(ocorrencia.linha.pagina), inicio: 0, fim: 0 })),
    })),
  }
}

/** Conferência mínima do que veio do banco antes de entregar às regras. */
const estadoSchema = z.object({
  formato: z.literal(FORMATO_ESTADO),
  contrato: anexoSchema,
  lido: z.object({
    id: z.string().min(1),
    linhas: z.array(z.unknown()).length(0),
    inspecao: z.object({ sha256: z.string().regex(/^[0-9a-f]{64}$/u) }).loose(),
    legibilidade: z.enum(['legivel', 'parcial', 'ilegivel', 'nao-interpretado', 'isolado']),
    paginas: z.array(z.unknown()),
    assinaturas: z.array(z.unknown()),
  }).loose(),
  classificacao: z.object({ contrato: classificacaoSchema, sinais: z.array(z.unknown()), porPagina: z.array(z.unknown()) }).loose(),
  campos: z.array(z.object({ contrato: campoExtraidoSchema, ocorrencias: z.array(z.unknown()) }).loose()),
})

export class EstadoInvalido extends Error {
  override name = 'EstadoInvalido'
}

export function anexoDoEstado(json: string, sha256Esperado: string): AnexoTriado {
  const parsed = estadoSchema.safeParse(JSON.parse(json))
  if (!parsed.success) throw new EstadoInvalido(`Estado guardado do anexo não confere: ${parsed.error.issues[0]?.message ?? 'formato'}`)
  if (parsed.data.lido.inspecao.sha256 !== sha256Esperado || parsed.data.contrato.sha256 !== sha256Esperado) {
    throw new EstadoInvalido('O estado guardado não corresponde ao hash do anexo')
  }
  // Conferido acima o que as regras usam; o restante é o mesmo objeto gravado por `estadoDoAnexo`.
  return parsed.data as unknown as AnexoTriado
}
