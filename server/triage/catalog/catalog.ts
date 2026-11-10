import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { z } from 'zod'
import {
  condicaoConfirmada,
  condicaoIdSchema,
  definicaoRegraSchema,
  etapas,
  modalidadeSchema,
  type Condicao,
  type DefinicaoRegra,
  type Etapa,
  type Modalidade,
} from '../../../shared/contracts/triage.ts'

/**
 * Catálogo normativo da triagem. Lê o JSON do dossiê como está (sem editá-lo), confere cada regra
 * e devolve as regras normalizadas para o contrato. Recusa o catálogo inteiro, com a lista dos
 * problemas, quando algo não confere: regra habilitada sem fonte, hipótese habilitada, etapa ou
 * modalidade desconhecida, condição humana que não corresponde ao texto do catálogo.
 *
 * Publicação em fonte oficial (`official-confirmed`) não é homologação: a homologação vem só do
 * registro `homologacoes.json`, com ato, data e responsável.
 */

export const CATALOG_FILES = {
  catalogo: 'regras_aqr_gca.json',
  condicoes: 'condicoes-humanas.json',
  homologacoes: 'homologacoes.json',
} as const

export class CatalogError extends Error {
  override name = 'CatalogError'
  readonly problems: string[]

  constructor(problems: string[]) {
    super(`Catálogo de regras recusado: ${problems.join(' | ')}`)
    this.problems = problems
  }
}

// ---------- formato do arquivo de origem (como está no dossiê) ----------

const rawSourceSchema = z.strictObject({
  source_id: z.string().min(1),
  url: z.string(),
  location: z.string(),
  archive_member: z.string().nullable(),
})

const rawRuleSchema = z.strictObject({
  id: z.string(),
  name: z.string(),
  status: z.string(),
  enabled: z.boolean(),
  modalities: z.array(z.string()),
  phase: z.string(),
  preconditions: z.string(),
  inputs: z.array(z.string()),
  extractions_required: z.array(z.string()),
  logic: z.string(),
  severity: z.string(),
  result: z.string(),
  confidence: z.string(),
  evidence_required: z.string(),
  sources: z.array(rawSourceSchema),
  human_review: z.string(),
  positive_synthetic_example: z.string(),
  negative_synthetic_example: z.string(),
})

const rawCatalogSchema = z.strictObject({
  title: z.string(),
  version: z.string().min(1),
  cutoff_date: z.iso.date(),
  warning: z.string(),
  rules: z.array(rawRuleSchema),
})

const conditionsFileSchema = z.strictObject({
  versao: z.string(),
  descricao: z.string(),
  regras: z.array(
    z.strictObject({
      regra: z.string(),
      condicoes: z.array(condicaoIdSchema).min(1),
      precondicaoCatalogo: z.string(),
    }),
  ),
})

const homologationsFileSchema = z.strictObject({
  versao: z.string(),
  descricao: z.string(),
  homologacoes: z.array(
    z.strictObject({ regra: z.string(), ato: z.string().min(1), data: z.iso.date(), responsavel: z.string().min(1) }),
  ),
})

/** Etapas como o catálogo as escreve → etapas do contrato (reconciliação, R3). */
const PHASES: Record<string, readonly Etapa[]> = {
  abertura: ['abertura'],
  análise: ['analise'],
  'abertura ou análise': ['abertura', 'analise'],
  'pós-análise': ['pos-analise'],
  'pós-decisão': ['pos-decisao'],
  todas: etapas,
}

/** Pré-condição que menciona servidor, confirmação ou homologação precisa estar no mapa de condições humanas. */
const HUMAN_PRECONDITION = /servidor|confirmad|homolog/iu

export interface CatalogoNormativo {
  titulo: string
  versao: string
  corte: string
  aviso: string
  /** SHA-256 do arquivo do catálogo, para a trilha de cada avaliação. */
  sha256: string
  regras: DefinicaoRegra[]
}

function issuesOf(error: z.ZodError, prefix: string): string[] {
  return error.issues.map((issue) => `${prefix}${issue.path.length ? ` (${issue.path.join('.')})` : ''}: ${issue.message}`)
}

export interface CatalogInput {
  catalogo: unknown
  condicoes: unknown
  homologacoes: unknown
  /** SHA-256 do arquivo do catálogo como lido do disco. */
  sha256: string
}

/** Confere e normaliza o catálogo. Lança `CatalogError` com todos os problemas encontrados. */
export function parseCatalog(input: CatalogInput): CatalogoNormativo {
  const problems: string[] = []
  const catalog = rawCatalogSchema.safeParse(input.catalogo)
  const conditions = conditionsFileSchema.safeParse(input.condicoes)
  const homologations = homologationsFileSchema.safeParse(input.homologacoes)
  if (!catalog.success) problems.push(...issuesOf(catalog.error, 'catálogo'))
  if (!conditions.success) problems.push(...issuesOf(conditions.error, 'condições humanas'))
  if (!homologations.success) problems.push(...issuesOf(homologations.error, 'homologações'))
  if (!catalog.success || !conditions.success || !homologations.success) throw new CatalogError(problems)

  const byRule = new Map(catalog.data.rules.map((rule) => [rule.id, rule]))
  const conditionsByRule = new Map<string, string[]>()
  for (const entry of conditions.data.regras) {
    const rule = byRule.get(entry.regra)
    if (!rule) problems.push(`condições humanas: a regra ${entry.regra} não está no catálogo`)
    else if (rule.preconditions !== entry.precondicaoCatalogo) {
      problems.push(`condições humanas: a pré-condição de ${entry.regra} mudou no catálogo; revise o mapa ("${rule.preconditions}")`)
    }
    if (conditionsByRule.has(entry.regra)) problems.push(`condições humanas: ${entry.regra} aparece duas vezes`)
    conditionsByRule.set(entry.regra, entry.condicoes)
  }
  const homologationByRule = new Map(homologations.data.homologacoes.map((entry) => [entry.regra, entry]))
  for (const entry of homologations.data.homologacoes) {
    if (!byRule.has(entry.regra)) problems.push(`homologações: a regra ${entry.regra} não está no catálogo`)
  }

  const seen = new Set<string>()
  const regras: DefinicaoRegra[] = []
  for (const rule of catalog.data.rules) {
    if (seen.has(rule.id)) problems.push(`${rule.id}: id repetido`)
    seen.add(rule.id)
    const phase = PHASES[rule.phase]
    if (!phase) problems.push(`${rule.id}: etapa desconhecida "${rule.phase}"`)
    const modalities = rule.modalities.map((modality) => modalidadeSchema.safeParse(modality))
    modalities.forEach((parsed, index) => {
      if (!parsed.success) problems.push(`${rule.id}: modalidade desconhecida "${rule.modalities[index] ?? ''}"`)
    })
    if (HUMAN_PRECONDITION.test(rule.preconditions) && !conditionsByRule.has(rule.id)) {
      problems.push(`${rule.id}: a pré-condição depende de servidor, mas a regra não está no mapa de condições humanas`)
    }
    const homologation = homologationByRule.get(rule.id)
    const candidate = {
      id: rule.id,
      nome: rule.name,
      status: rule.status,
      habilitada: rule.enabled,
      homologacao: homologation
        ? { situacao: 'homologada', ato: homologation.ato, data: homologation.data, responsavel: homologation.responsavel }
        : { situacao: 'nao-homologada' },
      modalidades: modalities.flatMap((parsed) => (parsed.success ? [parsed.data] : [])),
      etapaCatalogo: rule.phase,
      etapas: phase ?? [],
      preCondicao: rule.preconditions,
      condicoes: conditionsByRule.get(rule.id) ?? [],
      insumos: rule.inputs,
      extracoes: rule.extractions_required,
      logica: rule.logic,
      resultado: rule.result,
      severidade: rule.severity,
      confianca: rule.confidence,
      evidenciaExigida: rule.evidence_required,
      revisaoHumana: rule.human_review,
      exemplos: { positivo: rule.positive_synthetic_example, negativo: rule.negative_synthetic_example },
      fontes: rule.sources.map((source) => ({ fonte: source.source_id, url: source.url, local: source.location, membroDoPacote: source.archive_member })),
    }
    const parsed = definicaoRegraSchema.safeParse(candidate)
    if (!parsed.success) problems.push(...issuesOf(parsed.error, rule.id))
    else regras.push(parsed.data)
  }
  if (problems.length > 0) throw new CatalogError(problems)
  return {
    titulo: catalog.data.title,
    versao: catalog.data.version,
    corte: catalog.data.cutoff_date,
    aviso: catalog.data.warning,
    sha256: input.sha256,
    regras,
  }
}

/** Lê os três arquivos de `dir` (em desenvolvimento, `docs/triagem/catalogo`). */
export async function loadCatalog(dir: string): Promise<CatalogoNormativo> {
  const read = (name: string) => readFile(path.join(dir, name))
  const [catalogBytes, conditionsBytes, homologationsBytes] = await Promise.all([
    read(CATALOG_FILES.catalogo),
    read(CATALOG_FILES.condicoes),
    read(CATALOG_FILES.homologacoes),
  ])
  const json = (bytes: Buffer, name: string): unknown => {
    try {
      return JSON.parse(bytes.toString('utf8'))
    } catch {
      throw new CatalogError([`${name}: JSON inválido`])
    }
  }
  return parseCatalog({
    catalogo: json(catalogBytes, CATALOG_FILES.catalogo),
    condicoes: json(conditionsBytes, CATALOG_FILES.condicoes),
    homologacoes: json(homologationsBytes, CATALOG_FILES.homologacoes),
    sha256: createHash('sha256').update(catalogBytes).digest('hex'),
  })
}

/** Regras do catálogo para a modalidade e a etapa, inclusive as que não podem rodar (para a trilha). */
export function regrasAplicaveis(catalogo: CatalogoNormativo, modalidade: Modalidade, etapa: Etapa): DefinicaoRegra[] {
  return catalogo.regras.filter((regra) => regra.modalidades.includes(modalidade) && regra.etapas.includes(etapa))
}

export type Execucao =
  | { situacao: 'executavel' }
  | { situacao: 'bloqueada'; motivo: 'hipotese' | 'desabilitada' }
  | { situacao: 'condicao-pendente'; pendentes: string[] }
  | { situacao: 'nao-aplicavel'; condicoesFalsas: string[] }

/**
 * A regra pode rodar? Hipótese nunca roda. Condição só conta confirmada por servidor: sem a
 * confirmação, a regra fica pendente; confirmada como falsa, a regra não se aplica.
 */
export function podeExecutar(regra: DefinicaoRegra, condicoes: readonly Condicao[]): Execucao {
  if (regra.status === 'hypothesis') return { situacao: 'bloqueada', motivo: 'hipotese' }
  if (!regra.habilitada) return { situacao: 'bloqueada', motivo: 'desabilitada' }
  const pendentes: string[] = []
  const falsas: string[] = []
  for (const id of regra.condicoes) {
    const condicao = condicoes.find((item) => item.id === id)
    const estado = condicao ? condicaoConfirmada(condicao) : 'pendente'
    if (estado === 'pendente') pendentes.push(id)
    else if (!estado) falsas.push(id)
  }
  if (falsas.length > 0) return { situacao: 'nao-aplicavel', condicoesFalsas: falsas }
  if (pendentes.length > 0) return { situacao: 'condicao-pendente', pendentes }
  return { situacao: 'executavel' }
}
