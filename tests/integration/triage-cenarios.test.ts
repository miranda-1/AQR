import { mkdtempSync, readdirSync, rmSync } from 'node:fs'
import type { AddressInfo } from 'node:net'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { FastifyInstance } from 'fastify'
import { createHttpTriagemService } from '@/features/triage/services/http-triage-service'
import { TriagemServiceError, type Avaliacao, type TriagemService } from '@/features/triage/model/types'
import { contemPalavraDeDecisao } from '../../shared/contracts/triage.ts'
import { openDatabase, type Database } from '../../server/db/database.ts'
import { migrate } from '../../server/db/migrate.ts'
import { seedAccount } from '../../server/test/accounts.ts'
import { buildTestApp } from '../../server/test/build-test-app.ts'
import { casosDeAvaliacao, type CasoAvaliacao } from '../../server/triage/evaluation/casos.ts'

/**
 * E10.2: os 20 cenários do MVP contra o servidor real (HTTP numa porta de verdade, threads de
 * triagem de verdade, SQLite, conteúdo cifrado), pelo mesmo serviço que a tela usa. Os pacotes são
 * os sintéticos já existentes (DSD, VAL, IND, NOV) e o resultado é conferido com o gabarito
 * congelado de cada um, que nunca é alterado aqui.
 *
 * Como um analista faria: envia o pacote (a análise 1 roda sem nenhuma confirmação), registra as
 * confirmações que o gabarito supõe (completude, condições) e reprocessa (análise 2).
 */

const CATALOGO_DIR = fileURLToPath(new URL('../../docs/triagem/catalogo/', import.meta.url))
const CHAVE = Buffer.alloc(32, 5).toString('base64')
const REGRAS_DO_MVP = ['001', '002', '003', '006', '008', '009', '010', '011', '012', '013', '016', '018', '019', '020', '021', '022', '023', '028', '043'].map((id) => `AQR-GCA-${id}`)

let db: Database
let pasta: string
let app: FastifyInstance
let baseUrl: string
let casos: Map<string, CasoAvaliacao>

async function subir(extra: Record<string, string> = {}): Promise<void> {
  app = await buildTestApp({
    db,
    env: {
      ADMIN_API_MODE: 'dev',
      TRIAGEM_MODO: 'experimental-sintetico',
      TRIAGEM_OCR: 'off',
      TRIAGEM_WORKERS: '2',
      TRIAGEM_QUEUE_LIMIT: '20',
      TRIAGEM_CATALOGO_DIR: CATALOGO_DIR,
      TRIAGEM_CONTEUDO_DIR: pasta,
      TRIAGEM_CONTEUDO_CHAVE: CHAVE,
      ...extra,
    },
  })
  await app.listen({ host: '127.0.0.1', port: 0 })
  baseUrl = `http://127.0.0.1:${(app.server.address() as AddressInfo).port}`
}

beforeAll(async () => {
  db = openDatabase(':memory:')
  migrate(db)
  seedAccount(db, 'ana.analista', 'analista')
  seedAccount(db, 'beto.analista', 'analista')
  seedAccount(db, 'carla.admin', 'administrador')
  pasta = mkdtempSync(path.join(tmpdir(), 'aqr-e10-cenarios-'))
  casos = new Map((await casosDeAvaliacao()).map((caso) => [caso.id, caso]))
  await subir()
}, 120_000)

afterAll(async () => {
  await app.close()
  db.close()
  rmSync(pasta, { recursive: true, force: true })
})

const servico = (usuario: string): TriagemService => createHttpTriagemService({ baseUrl, getActor: () => usuario })
const ana = () => servico('ana.analista')

function caso(id: string): CasoAvaliacao {
  const encontrado = casos.get(id)
  if (!encontrado) throw new Error(`pacote ${id} ausente`)
  return encontrado
}

async function aguardar(service: TriagemService, id: string) {
  for (let tentativa = 0; tentativa < 600; tentativa += 1) {
    const detalhe = await service.detalhe(id)
    if (detalhe.triagem.situacao !== 'processando') return detalhe
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
  throw new Error('a triagem não terminou')
}

async function erroDe(promessa: Promise<unknown>): Promise<TriagemServiceError> {
  try {
    await promessa
  } catch (erro) {
    if (erro instanceof TriagemServiceError) return erro
    throw erro
  }
  throw new Error('esperava um erro da API')
}

function arquivosDe(c: CasoAvaliacao): File[] {
  return c.anexos.map((esperado) => {
    const arquivo = c.arquivos.find((item) => item.nome === esperado.nome)
    if (!arquivo) throw new Error(`${c.id}: ${esperado.nome} ausente`)
    return new File([arquivo.bytes.slice()], arquivo.nome)
  })
}

/** Invariantes de toda análise: 19 regras do MVP, nenhuma palavra de decisão, achado sempre com base. */
function conferirInvariantes(itens: readonly Avaliacao[], completudeConfirmada: boolean): string[] {
  const problemas: string[] = []
  const ids = itens.map((item) => item.regraId).sort()
  if (JSON.stringify(ids) !== JSON.stringify([...REGRAS_DO_MVP].sort())) problemas.push(`regras avaliadas: ${ids.join(',')}`)
  for (const item of itens) {
    if (contemPalavraDeDecisao(item.rascunho)) problemas.push(`${item.regraId}: palavra de decisão no rascunho`)
    if (item.tipo === 'nao-localizado' && !completudeConfirmada) problemas.push(`${item.regraId}: "não localizado" sem completude confirmada`)
    if (item.resultado === 'achado' && item.evidencias.length === 0 && item.valoresConflitantes.length === 0 && item.procura === undefined) {
      problemas.push(`${item.regraId}: achado sem evidência, quadro ou procura`)
    }
  }
  return problemas
}

function conferirGabarito(c: CasoAvaliacao, itens: readonly Avaliacao[]): string[] {
  return Object.entries(c.regras).flatMap(([regraId, esperado]) => {
    const item = itens.find((avaliacao) => avaliacao.regraId === regraId)
    if (!item) return [`${regraId}: não avaliada`]
    if (!esperado.aceitaveis.includes(item.resultado)) return [`${regraId}: ${item.resultado}${item.tipo ? `/${item.tipo}` : ''} (esperado ${esperado.aceitaveis.join('|')}) — ${esperado.motivo}`]
    if (esperado.tipo && item.resultado === 'achado' && item.tipo !== esperado.tipo) return [`${regraId}: tipo ${item.tipo ?? '—'} (esperado ${esperado.tipo})`]
    return []
  })
}

interface Triado {
  id: string
  inicial: Avaliacao[]
  confirmada: Avaliacao[]
}

/** Envia, confere a análise sem confirmação, confirma o que o gabarito supõe e reprocessa. */
async function triar(id: string, service = ana()): Promise<Triado> {
  const c = caso(id)
  const criada = await service.criar({ referencia: `E10-${c.id}`, protocoladoEm: c.entrada.protocoladoEm, modalidade: 'D', etapa: 'abertura' }, arquivosDe(c), `e10-${c.id}-${Math.random()}`)
  const triagemId = criada.triagem.id
  let detalhe = await aguardar(service, triagemId)
  expect(detalhe.triagem.situacao, `${id}: análise inicial`).not.toBe('falhou')
  const inicial = (await service.avaliacoes(triagemId)).itens
  expect(conferirInvariantes(inicial, false), `${id}: análise inicial`).toEqual([])

  const confirmacoes: Parameters<TriagemService['confirmar']>[1][] = []
  if (c.entrada.integridadeDoPacote !== 'desconhecida') confirmacoes.push({ versaoEsperada: 0, tipo: 'integridade', valor: c.entrada.integridadeDoPacote, justificativa: 'Conferido com o protocolo sintético' })
  for (const condicao of c.entrada.condicoesConfirmadas) confirmacoes.push({ versaoEsperada: 0, tipo: 'condicao', condicao: condicao.id, valor: condicao.valor, justificativa: 'Confirmado no teste' })
  for (const entrada of confirmacoes) {
    detalhe = await service.detalhe(triagemId)
    await service.confirmar(triagemId, { ...entrada, versaoEsperada: detalhe.triagem.versao })
  }
  if (confirmacoes.length === 0) return { id: triagemId, inicial, confirmada: inicial }
  detalhe = await service.detalhe(triagemId)
  await service.reprocessar(triagemId, detalhe.triagem.versao)
  await aguardar(service, triagemId)
  const confirmada = (await service.avaliacoes(triagemId)).itens
  expect(conferirInvariantes(confirmada, c.entrada.integridadeDoPacote === 'completo'), `${id}: análise confirmada`).toEqual([])
  return { id: triagemId, inicial, confirmada }
}

const resultado = (itens: readonly Avaliacao[], regra: string) => {
  const item = itens.find((avaliacao) => avaliacao.regraId === `AQR-GCA-${regra}`)
  return item ? `${item.resultado}${item.tipo ? `/${item.tipo}` : ''}` : 'ausente'
}

describe('E10.2: cenários do MVP contra o servidor real', () => {
  it.each([
    ['1. pacote completo', 'DSD-01'],
    ['2. pacote incompleto (sem memorial)', 'DSD-15'],
    ['2. pacote incompleto marcado como parcial', 'DSD-47'],
    ['3. documento ilegível (digitalização muito degradada, sem OCR)', 'DSD-29'],
    ['3. documento ilegível (PDF corrompido)', 'DSD-31'],
    ['3. documento ilegível (arquivo vazio)', 'DSD-33'],
    ['4. documento composto (requerimento e DRT no mesmo PDF)', 'VAL-02'],
    ['4. documento composto (certidão e extrato no mesmo PDF)', 'IND-04'],
    ['4. documento composto (DRT e RRT no mesmo PDF)', 'NOV-12'],
    ['5. matrículas divergentes (prancha)', 'DSD-17'],
    ['5. matrículas divergentes (requerimento × certidão)', 'NOV-15'],
    ['6. múltiplos imóveis, todos com título', 'NOV-05'],
    ['6. múltiplos imóveis, falta um título', 'NOV-06'],
    ['6. múltiplos lotes, falta uma inscrição', 'NOV-07'],
    ['7. DRT inadequada (DRT 03)', 'DSD-08'],
    ['7. DRT inadequada (DRT 02 de projeto)', 'VAL-03'],
    ['8. planta sem título explícito', 'NOV-04'],
    ['9. data de revisão ambígua', 'NOV-03'],
    ['10. área de 1,99 ha', 'DSD-40'],
    ['10. área de 2,00 ha', 'DSD-41'],
    ['10. área de 2,01 ha (11. condição da 028 não confirmada)', 'DSD-42'],
  ])('%s (%s): confere com o gabarito', { timeout: 120_000 }, async (_, id) => {
    const { confirmada } = await triar(id)
    expect(conferirGabarito(caso(id), confirmada)).toEqual([])
  })

  it('10–11. a área lida nos documentos nunca ativa a GDU sozinha', { timeout: 120_000 }, async () => {
    for (const id of ['DSD-40', 'DSD-41', 'DSD-42']) {
      const { confirmada } = await triar(id)
      expect(resultado(confirmada, '028'), id).toBe('condicao-pendente')
    }
  })

  it('12. confirmações humanas mudam as regras aplicáveis (completude e área acima de 2 ha)', { timeout: 120_000 }, async () => {
    const memorial = await triar('DSD-15')
    expect(resultado(memorial.inicial, '013')).toBe('nao-avaliavel')
    expect(resultado(memorial.confirmada, '013')).toBe('achado/nao-localizado')

    const gdu = await triar('DSD-43')
    expect(resultado(gdu.inicial, '028')).toBe('condicao-pendente')
    expect(resultado(gdu.confirmada, '028')).not.toBe('condicao-pendente')
    expect(conferirGabarito(caso('DSD-43'), gdu.confirmada)).toEqual([])
  })

  it('13–14. correção de campo, reprocessamento e histórico preservado', { timeout: 120_000 }, async () => {
    const service = ana()
    const { id, confirmada } = await triar('DSD-16', service)
    expect(resultado(confirmada, '018')).toBe('achado/divergencia')
    const antes = await service.detalhe(id)
    const analiseAntes = antes.triagem.analiseAtual ?? 0
    const avaliacoesAntes = await service.avaliacoes(id, analiseAntes)
    const lote = (await service.campos(id)).itens.find((campo) => campo.campo === 'lote' && campo.valorBruto === 'C3')
    if (!lote) throw new Error('lote C3 ausente')
    const salvo = await service.revisar(id, { versaoEsperada: antes.triagem.versao, decisao: 'corrigido', campoId: lote.id, novoValor: 'F7', justificativa: 'Lote conferido na ART sintética' })
    const reprocesso = await service.reprocessar(id, salvo.triagem.versao)
    expect(reprocesso.alteradas).toEqual(['AQR-GCA-018'])
    // `recalculadas` rotula as regras afetadas pelo que mudou; as 19 rodam sempre (ver E10.4).
    expect(reprocesso.recalculadas).toContain('AQR-GCA-018')
    await aguardar(service, id)
    expect(resultado((await service.avaliacoes(id)).itens, '018')).toBe('sem-achado')
    // A análise anterior continua idêntica, com as mesmas evidências.
    expect(await service.avaliacoes(id, analiseAntes)).toEqual(avaliacoesAntes)
    const final = await service.detalhe(id)
    expect(final.analises.filter((analise) => analise.situacao === 'concluida').map((analise) => analise.numero)).toEqual([1, 2, 3])
    expect(final.revisoes.find((revisao) => revisao.decisao === 'corrigido')?.correcao).toMatchObject({ anterior: 'C3', novo: 'F7' })
  })

  it('15. arquivo expirado: o expurgo apaga o conteúdo cifrado e a evidência registrada continua', { timeout: 120_000 }, async () => {
    const service = ana()
    const { id } = await triar('DSD-01', service)
    const anexo = (await service.anexos(id)).itens[0]
    if (!anexo) throw new Error('sem anexo')
    expect((await service.conteudo(id, anexo.id)).size).toBe(anexo.bytes)
    const arquivosAntes = readdirSync(pasta, { recursive: true }).length
    // O prazo de guarda (imutável no banco) vence: o relógio do processo avança 73 h e o servidor
    // reinicia, expurgando na inicialização. Só o Date é adiantado; os temporizadores seguem reais.
    await app.close()
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(Date.now() + 73 * 3600_000)
    try {
      await subir()
    } finally {
      vi.useRealTimers()
    }
    const depois = ana()
    const anexos = (await depois.anexos(id)).itens
    expect(anexos.every((item) => item.conteudo === 'expurgado')).toBe(true)
    expect((await erroDe(depois.conteudo(id, anexo.id))).status).toBe(404)
    expect(readdirSync(pasta, { recursive: true }).length).toBeLessThan(arquivosAntes)
    const avaliacoes = (await depois.avaliacoes(id)).itens
    expect(avaliacoes.flatMap((item) => item.evidencias).length).toBeGreaterThan(0)
    const eventos = db.prepare("SELECT COUNT(*) AS n FROM triagem_eventos WHERE triagem_id = ? AND acao = 'conteudo.expurgado'").get(id) as { n: number }
    expect(eventos.n).toBe(anexos.length)
  })

  it('15. ambiente sem chave: nada de conteúdo guardado, resultados e evidências continuam', { timeout: 120_000 }, async () => {
    await app.close()
    await subir({ TRIAGEM_CONTEUDO_CHAVE: '' })
    try {
      const service = ana()
      const status = await service.status()
      expect(status.disponivel && status.conteudoArmazenado).toBe(false)
      const { id, confirmada } = await triar('DSD-01', service)
      expect(conferirGabarito(caso('DSD-01'), confirmada)).toEqual([])
      const anexos = (await service.anexos(id)).itens
      expect(anexos.every((item) => item.conteudo === 'nao-armazenado')).toBe(true)
      expect((await erroDe(service.conteudo(id, anexos[0]?.id ?? ''))).status).toBe(404)
    } finally {
      await app.close()
      await subir()
    }
  })

  it('16. tarefa interrompida por reinício e retomada manual', { timeout: 120_000 }, async () => {
    const c = caso('DSD-01')
    const criada = await ana().criar({ referencia: 'E10-interrompida', protocoladoEm: c.entrada.protocoladoEm, modalidade: 'D', etapa: 'abertura' }, arquivosDe(c), `e10-int-${Math.random()}`)
    await app.close()
    await subir()
    const service = ana()
    const interrompida = await service.detalhe(criada.triagem.id)
    expect([interrompida.triagem.situacao, interrompida.triagem.analiseAtual, interrompida.analises[0]?.situacao]).toEqual(['falhou', null, 'interrompida'])
    await service.reprocessar(criada.triagem.id, interrompida.triagem.versao)
    const final = await aguardar(service, criada.triagem.id)
    expect(final.analises.map((analise) => [analise.numero, analise.situacao, analise.motivo])).toEqual([
      [1, 'interrompida', 'inicial'],
      [2, 'concluida', 'retomada'],
    ])
  })

  it('17. conflito de concorrência: duas ações com a mesma versão, só uma vale', { timeout: 120_000 }, async () => {
    const service = ana()
    const { id } = await triar('DSD-16', service)
    const { triagem } = await service.detalhe(id)
    const tentativas = await Promise.allSettled([
      service.revisar(id, { versaoEsperada: triagem.versao, decisao: 'confirmado', regraId: 'AQR-GCA-018', justificativa: 'primeira' }),
      service.revisar(id, { versaoEsperada: triagem.versao, decisao: 'descartado', regraId: 'AQR-GCA-018', justificativa: 'segunda tentativa' }),
    ])
    expect(tentativas.filter((item) => item.status === 'fulfilled')).toHaveLength(1)
    const recusada = tentativas.find((item) => item.status === 'rejected')
    expect(recusada?.status === 'rejected' && recusada.reason instanceof TriagemServiceError && recusada.reason.status).toBe(409)
    const atual = await service.detalhe(id)
    const reprocessos = await Promise.allSettled([service.reprocessar(id, atual.triagem.versao), service.reprocessar(id, atual.triagem.versao)])
    expect(reprocessos.map((item) => item.status).sort()).toEqual(['fulfilled', 'rejected'])
    await aguardar(service, id)
    expect((await service.detalhe(id)).revisoes.filter((revisao) => revisao.regraId === 'AQR-GCA-018')).toHaveLength(1)
  })

  it('18–19. outro analista não enxerga; administrador só consulta', { timeout: 120_000 }, async () => {
    const service = ana()
    const { id } = await triar('DSD-16', service)
    const anexo = (await service.anexos(id)).itens[0]
    const { triagem } = await service.detalhe(id)
    const beto = servico('beto.analista')
    const tentativasBeto = [
      beto.detalhe(id),
      beto.anexos(id),
      beto.avaliacoes(id),
      beto.campos(id),
      beto.conteudo(id, anexo?.id ?? ''),
      beto.revisar(id, { versaoEsperada: triagem.versao, decisao: 'confirmado', regraId: 'AQR-GCA-018', justificativa: '' }),
      beto.confirmar(id, { versaoEsperada: triagem.versao, tipo: 'integridade', valor: 'completo', justificativa: 'tentativa alheia' }),
      beto.reprocessar(id, triagem.versao),
    ]
    for (const tentativa of tentativasBeto) expect((await erroDe(tentativa)).status).toBe(404)
    expect((await beto.listar()).itens.map((item) => item.id)).not.toContain(id)

    const carla = servico('carla.admin')
    expect((await carla.detalhe(id)).triagem.criadaPorMim).toBe(false)
    expect((await carla.conteudo(id, anexo?.id ?? '')).size).toBeGreaterThan(0)
    const c = caso('DSD-01')
    const restritas = [
      carla.criar({ referencia: null, protocoladoEm: c.entrada.protocoladoEm, modalidade: 'D', etapa: 'abertura' }, arquivosDe(c), 'admin-tenta'),
      carla.revisar(id, { versaoEsperada: triagem.versao, decisao: 'confirmado', regraId: 'AQR-GCA-018', justificativa: '' }),
      carla.confirmar(id, { versaoEsperada: triagem.versao, tipo: 'integridade', valor: 'completo', justificativa: 'tentativa do administrador' }),
      carla.reprocessar(id, triagem.versao),
    ]
    for (const tentativa of restritas) expect((await erroDe(tentativa)).status).toBe(403)
    expect((await service.detalhe(id)).triagem.versao).toBe(triagem.versao)
  })

  it('20. triagem desabilitada pelo servidor', async () => {
    const desligado = await buildTestApp({ env: { ADMIN_API_MODE: 'dev' } })
    await desligado.listen({ host: '127.0.0.1', port: 0 })
    try {
      const service = createHttpTriagemService({ baseUrl: `http://127.0.0.1:${(desligado.server.address() as AddressInfo).port}`, getActor: () => 'ana.analista' })
      expect(await service.status()).toEqual({ disponivel: false, modo: 'desativada' })
      const c = caso('DSD-01')
      expect((await erroDe(service.criar({ referencia: null, protocoladoEm: c.entrada.protocoladoEm, modalidade: 'D', etapa: 'abertura' }, arquivosDe(c), 'desligada'))).status).toBe(404)
    } finally {
      await desligado.close()
    }
  })
})
