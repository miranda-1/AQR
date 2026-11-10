import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Condicao, DefinicaoRegra } from '../../../shared/contracts/triage.ts'
import { defined } from '../../test/defined.ts'
import { CatalogError, loadCatalog, parseCatalog, podeExecutar, regrasAplicaveis, type CatalogInput } from './catalog.ts'

const DOCS = fileURLToPath(new URL('../../../docs/triagem/', import.meta.url))
const CATALOG_DIR = path.join(DOCS, 'catalogo')
const readJson = (file: string): unknown => JSON.parse(readFileSync(path.join(DOCS, file), 'utf8'))
const sha256Of = (file: string) => createHash('sha256').update(readFileSync(path.join(DOCS, file))).digest('hex')

/** Hashes registrados em docs/triagem/README.md: as cópias não podem mudar sem nova reconciliação. */
const RECORDED_HASHES = {
  'catalogo/regras_aqr_gca.json': 'fd9b3e3b9db5d16685798f80f64932ceb91dae3f4a4253cda60fe3f966c419eb',
  'casos/casos_sinteticos_complementares_aqr.json': '33b6f6c062e9b3a9bb034f8f2a8d443f6962f1a504c889d72276178c73cd36db',
  'fontes/inventario_fontes.json': 'dc725e3863d70e6459c4d656a9617986e1f36225a42a8d543da2ccaa003e72dc',
}

/** As 23 regras do catálogo que se aplicam a desdobro na abertura (reconciliação, escopo do MVP). */
const DESDOBRO_ABERTURA = [
  'AQR-GCA-001', 'AQR-GCA-002', 'AQR-GCA-003', 'AQR-GCA-006', 'AQR-GCA-008', 'AQR-GCA-009', 'AQR-GCA-010',
  'AQR-GCA-011', 'AQR-GCA-012', 'AQR-GCA-013', 'AQR-GCA-016', 'AQR-GCA-018', 'AQR-GCA-019', 'AQR-GCA-020',
  'AQR-GCA-021', 'AQR-GCA-022', 'AQR-GCA-023', 'AQR-GCA-028', 'AQR-GCA-040', 'AQR-GCA-041', 'AQR-GCA-043',
  'HYP-GCA-045', 'HYP-GCA-047',
]

function baseInput(): CatalogInput & { catalogo: { rules: Record<string, unknown>[] } } {
  return {
    catalogo: structuredClone(readJson('catalogo/regras_aqr_gca.json')) as { rules: Record<string, unknown>[] },
    condicoes: readJson('catalogo/condicoes-humanas.json'),
    homologacoes: readJson('catalogo/homologacoes.json'),
    sha256: '0'.repeat(64),
  }
}

function ruleIn(input: ReturnType<typeof baseInput>, id: string): Record<string, unknown> {
  return defined(input.catalogo.rules.find((rule) => rule.id === id), id)
}

function problemsOf(input: CatalogInput): string[] {
  try {
    parseCatalog(input)
  } catch (error) {
    if (error instanceof CatalogError) return error.problems
    throw error
  }
  return []
}

const confirmed = (id: string, valor: boolean): Condicao => ({
  id,
  valor: { valor, origem: 'confirmado-servidor', confirmadoPor: 'conta-servidor', confirmadoEm: '2026-11-09T12:00:00.000Z' },
  evidencias: [],
})

describe('catálogo normativo', () => {
  it('as cópias em docs/triagem são as registradas', () => {
    for (const [file, hash] of Object.entries(RECORDED_HASHES)) expect(sha256Of(file), file).toBe(hash)
  })

  it('carrega as 47 regras: 40 alertas oficiais habilitados, 7 hipóteses desligadas, nenhuma homologada', async () => {
    const catalog = await loadCatalog(CATALOG_DIR)
    expect(catalog.versao).toBe('1.0-review')
    expect(catalog.sha256).toBe(RECORDED_HASHES['catalogo/regras_aqr_gca.json'])
    expect(catalog.regras).toHaveLength(47)
    const official = catalog.regras.filter((rule) => rule.status === 'official-confirmed')
    const hypotheses = catalog.regras.filter((rule) => rule.status === 'hypothesis')
    expect(official).toHaveLength(40)
    expect(official.every((rule) => rule.habilitada && rule.fontes.length > 0)).toBe(true)
    expect(hypotheses.map((rule) => rule.id)).toEqual(['HYP-GCA-036', 'HYP-GCA-037', 'HYP-GCA-038', 'HYP-GCA-044', 'HYP-GCA-045', 'HYP-GCA-046', 'HYP-GCA-047'])
    expect(hypotheses.every((rule) => !rule.habilitada)).toBe(true)
    // Publicação oficial não é homologação institucional.
    expect(catalog.regras.every((rule) => rule.homologacao.situacao === 'nao-homologada')).toBe(true)
  })

  it('liga as pré-condições de servidor às condições humanas (9 alertas ativos e 3 hipóteses)', async () => {
    const catalog = await loadCatalog(CATALOG_DIR)
    const conditioned = catalog.regras.filter((rule) => rule.condicoes.length > 0)
    expect(conditioned.filter((rule) => rule.habilitada).map((rule) => rule.id)).toEqual([
      'AQR-GCA-024', 'AQR-GCA-028', 'AQR-GCA-029', 'AQR-GCA-030', 'AQR-GCA-033', 'AQR-GCA-034', 'AQR-GCA-035', 'AQR-GCA-039', 'AQR-GCA-042',
    ])
    expect(defined(catalog.regras.find((rule) => rule.id === 'AQR-GCA-028')).condicoes).toEqual(['area-situacao-acima-2ha'])
  })

  it('normaliza as etapas do catálogo sem fundir pós-análise e pós-decisão', async () => {
    const catalog = await loadCatalog(CATALOG_DIR)
    const etapasDe = (id: string) => defined(catalog.regras.find((rule) => rule.id === id)).etapas
    expect(etapasDe('AQR-GCA-021')).toEqual(['abertura', 'analise'])
    expect(etapasDe('AQR-GCA-040')).toEqual(['abertura', 'analise', 'pos-analise', 'pos-decisao'])
    expect(etapasDe('AQR-GCA-039')).toEqual(['pos-analise'])
    expect(etapasDe('AQR-GCA-042')).toEqual(['pos-decisao'])
  })

  it('para desdobro na abertura, aplica as 23 regras previstas na reconciliação', async () => {
    const catalog = await loadCatalog(CATALOG_DIR)
    expect(regrasAplicaveis(catalog, 'D', 'abertura').map((rule) => rule.id)).toEqual(DESDOBRO_ABERTURA)
  })

  it('coincide com a seção 9 do dossiê v1.5, campo a campo', async () => {
    const catalog = await loadCatalog(CATALOG_DIR)
    const dossier = readJson('catalogo/dossie-v1.5-secao9.json') as { regras: Record<string, string | string[] | null>[] }
    expect(dossier.regras.map((rule) => rule.id)).toEqual(catalog.regras.map((rule) => rule.id))
    for (const rule of catalog.regras) {
      const section = defined(dossier.regras.find((item) => item.id === rule.id))
      const fontes = rule.fontes.map((fonte) => `${fonte.fonte} ${fonte.local}${fonte.membroDoPacote ? ` → ${fonte.membroDoPacote}` : ''}`).join('; ')
      expect(
        {
          nome: section.name,
          estado: section.estado,
          modalidades: section.modalidades,
          etapa: section.etapa,
          severidade: section.severidade,
          confianca: section.confianca,
          precondicao: section.precondicao,
          insumos: section.insumos,
          extracoes: section.extracoes,
          logica: section.logica,
          resultado: section.resultado,
          revisao: typeof section.revisao === 'string' ? section.revisao.replace(/\.$/u, '') : section.revisao,
          positivo: section.positivo,
          negativo: section.negativo,
          fundamentacao: section.fundamentacao,
        },
        rule.id,
      ).toEqual({
        nome: rule.nome,
        estado: rule.habilitada ? 'ATIVA COMO ALERTA' : 'HIPÓTESE DESATIVADA',
        modalidades: rule.modalidades,
        etapa: rule.etapaCatalogo,
        severidade: rule.severidade,
        confianca: rule.confianca,
        precondicao: rule.preCondicao,
        insumos: rule.insumos.join(', '),
        extracoes: rule.extracoes.join(', '),
        logica: rule.logica,
        resultado: rule.resultado,
        revisao: rule.revisaoHumana,
        positivo: rule.exemplos.positivo,
        negativo: rule.exemplos.negativo,
        fundamentacao: fontes,
      })
    }
  })
})

describe('recusa do catálogo', () => {
  it('aceita o catálogo como está', () => {
    expect(problemsOf(baseInput())).toEqual([])
  })

  it('recusa regra habilitada sem fundamento', () => {
    const input = baseInput()
    ruleIn(input, 'AQR-GCA-013').sources = []
    expect(problemsOf(input)).toContain('AQR-GCA-013: AQR-GCA-013: regra habilitada sem fundamento em fonte.')
  })

  it('recusa fonte sem endereço válido', () => {
    const input = baseInput()
    const sources = ruleIn(input, 'AQR-GCA-002').sources as { url: string }[]
    defined(sources[0]).url = 'arquivo-local.pdf'
    expect(problemsOf(input).some((problem) => problem.startsWith('AQR-GCA-002 (fontes.0.url)'))).toBe(true)
  })

  it('recusa hipótese habilitada e prefixo que não corresponde ao estado', () => {
    const input = baseInput()
    ruleIn(input, 'HYP-GCA-045').enabled = true
    ruleIn(input, 'AQR-GCA-001').status = 'hypothesis'
    const problems = problemsOf(input)
    expect(problems).toContain('HYP-GCA-045: HYP-GCA-045: hipótese nunca pode ficar habilitada.')
    expect(problems.some((problem) => problem.includes('AQR-GCA-001: o prefixo não corresponde'))).toBe(true)
  })

  it('recusa etapa, modalidade e severidade desconhecidas e id repetido', () => {
    const input = baseInput()
    ruleIn(input, 'AQR-GCA-003').phase = 'protocolo'
    ruleIn(input, 'AQR-GCA-004').modalities = ['RET', 'XYZ']
    ruleIn(input, 'AQR-GCA-005').severity = 'grave'
    input.catalogo.rules.push(structuredClone(ruleIn(input, 'AQR-GCA-006')))
    const problems = problemsOf(input)
    expect(problems).toContain('AQR-GCA-003: etapa desconhecida "protocolo"')
    expect(problems).toContain('AQR-GCA-004: modalidade desconhecida "XYZ"')
    expect(problems.some((problem) => problem.startsWith('AQR-GCA-005 (severidade)'))).toBe(true)
    expect(problems).toContain('AQR-GCA-006: id repetido')
  })

  it('recusa campo inesperado no arquivo de origem', () => {
    const input = baseInput()
    ruleIn(input, 'AQR-GCA-001').automatic_decision = true
    expect(problemsOf(input).some((problem) => problem.startsWith('catálogo'))).toBe(true)
  })

  it('recusa o mapa de condições humanas quando o texto do catálogo muda ou falta uma regra condicionada', () => {
    const changed = baseInput()
    ruleIn(changed, 'AQR-GCA-028').preconditions = 'Área acima de 2 ha'
    expect(problemsOf(changed).some((problem) => problem.includes('pré-condição de AQR-GCA-028 mudou'))).toBe(true)

    const unmapped = baseInput()
    ruleIn(unmapped, 'AQR-GCA-022').preconditions = 'Prancha legível e escala confirmada por servidor'
    expect(problemsOf(unmapped)).toContain('AQR-GCA-022: a pré-condição depende de servidor, mas a regra não está no mapa de condições humanas')
  })

  it('só considera homologada a regra registrada com ato, data e responsável', () => {
    const input = baseInput()
    input.homologacoes = {
      versao: '1',
      descricao: 'teste',
      homologacoes: [{ regra: 'AQR-GCA-002', ato: 'Ato fictício 1/2026', data: '2026-12-01', responsavel: 'Gerência fictícia' }],
    }
    const catalog = parseCatalog(input)
    expect(defined(catalog.regras.find((rule) => rule.id === 'AQR-GCA-002')).homologacao).toEqual({
      situacao: 'homologada',
      ato: 'Ato fictício 1/2026',
      data: '2026-12-01',
      responsavel: 'Gerência fictícia',
    })
    expect(catalog.regras.filter((rule) => rule.homologacao.situacao === 'homologada')).toHaveLength(1)

    input.homologacoes = { versao: '1', descricao: 'teste', homologacoes: [{ regra: 'AQR-GCA-099', ato: 'x', data: '2026-12-01', responsavel: 'y' }] }
    expect(problemsOf(input)).toContain('homologações: a regra AQR-GCA-099 não está no catálogo')
  })
})

describe('execução das regras', () => {
  const rule = async (id: string): Promise<DefinicaoRegra> => defined((await loadCatalog(CATALOG_DIR)).regras.find((item) => item.id === id))

  it('hipótese nunca executa', async () => {
    expect(podeExecutar(await rule('HYP-GCA-045'), [])).toEqual({ situacao: 'bloqueada', motivo: 'hipotese' })
  })

  it('regra sem condição humana executa', async () => {
    expect(podeExecutar(await rule('AQR-GCA-013'), [])).toEqual({ situacao: 'executavel' })
  })

  it('regra condicionada fica pendente sem confirmação de servidor, mesmo com valor declarado ou proposto', async () => {
    const gdu = await rule('AQR-GCA-028')
    expect(podeExecutar(gdu, [])).toEqual({ situacao: 'condicao-pendente', pendentes: ['area-situacao-acima-2ha'] })
    for (const origem of ['declarado', 'proposto-sistema'] as const) {
      const condicao: Condicao = { id: 'area-situacao-acima-2ha', valor: { valor: true, origem }, evidencias: [] }
      expect(podeExecutar(gdu, [condicao]).situacao).toBe('condicao-pendente')
    }
  })

  it('confirmada verdadeira, executa; confirmada falsa, não se aplica', async () => {
    const gdu = await rule('AQR-GCA-028')
    expect(podeExecutar(gdu, [confirmed('area-situacao-acima-2ha', true)])).toEqual({ situacao: 'executavel' })
    expect(podeExecutar(gdu, [confirmed('area-situacao-acima-2ha', false)])).toEqual({ situacao: 'nao-aplicavel', condicoesFalsas: ['area-situacao-acima-2ha'] })
  })
})
