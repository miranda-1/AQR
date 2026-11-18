import { createHash, randomUUID } from 'node:crypto'
import { mkdtempSync, readdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { FastifyInstance } from 'fastify'
import { DEV_ACTOR_HEADER } from '../../../shared/contracts/admin.ts'
import { contemPalavraDeDecisao } from '../../../shared/contracts/triage.ts'
import { openDatabase, type Database } from '../../db/database.ts'
import { migrate } from '../../db/migrate.ts'
import { seedAccount } from '../../test/accounts.ts'
import { buildTestApp } from '../../test/build-test-app.ts'
import { defined } from '../../test/defined.ts'
import { gerarPacote } from '../corpus/generate.ts'
import { PACOTES } from '../corpus/pacotes.ts'
import { etapasSuportadas, modalidadesSuportadas } from '../escopo.ts'
import { TriagemRepository } from '../store/repository.ts'

/**
 * API de triagem (E8) de ponta a ponta: multipart de verdade, threads de triagem de verdade (sem
 * OCR, pacotes de texto), banco SQLite em memória e autenticação de desenvolvimento por cabeçalho
 * (só local). Só pacotes sintéticos.
 */

const CATALOGO_DIR = fileURLToPath(new URL('../../../docs/triagem/catalogo/', import.meta.url))
const CHAVE = Buffer.alloc(32, 3).toString('base64')

let db: Database
let pasta: string
let app: FastifyInstance

async function montar(extra: Record<string, string> = {}): Promise<FastifyInstance> {
  return buildTestApp({
    db,
    env: {
      ADMIN_API_MODE: 'dev',
      TRIAGEM_MODO: 'experimental-sintetico',
      TRIAGEM_OCR: 'off',
      TRIAGEM_WORKERS: '2',
      TRIAGEM_QUEUE_LIMIT: '8',
      TRIAGEM_MAX_ANEXOS: '12',
      TRIAGEM_CATALOGO_DIR: CATALOGO_DIR,
      TRIAGEM_CONTEUDO_DIR: pasta,
      TRIAGEM_CONTEUDO_CHAVE: CHAVE,
      ...extra,
    },
  })
}

beforeEach(async () => {
  db = openDatabase(':memory:')
  migrate(db)
  seedAccount(db, 'ana.analista', 'analista')
  seedAccount(db, 'beto.analista', 'analista')
  seedAccount(db, 'carla.admin', 'administrador')
  seedAccount(db, 'dora.inativa', 'analista', 'inativa')
  pasta = mkdtempSync(path.join(tmpdir(), 'aqr-api-triagem-'))
  app = await montar()
})

afterEach(async () => {
  await app.close()
  db.close()
  rmSync(pasta, { recursive: true, force: true })
})

const METADADOS = { referencia: 'SINTETICO-001', protocoladoEm: '2026-11-05T13:00:00.000Z', modalidade: 'D', etapa: 'abertura' }
const como = (usuario: string) => ({ [DEV_ACTOR_HEADER]: usuario })

async function corpoMultipart(arquivos: { nome: string; bytes: Uint8Array }[], metadados: unknown = METADADOS) {
  const form = new FormData()
  form.append('metadados', JSON.stringify(metadados))
  for (const arquivo of arquivos) form.append('anexos', new Blob([arquivo.bytes.slice()]), arquivo.nome)
  const request = new Request('http://teste.local/', { method: 'POST', body: form })
  return { payload: Buffer.from(await request.arrayBuffer()), headers: { 'content-type': request.headers.get('content-type') ?? '' } }
}

async function arquivosDe(pacoteId: string) {
  return (await gerarPacote(defined(PACOTES.find((item) => item.id === pacoteId)))).arquivos
}

async function enviar(pacoteId: string, usuario = 'ana.analista', extra: Record<string, string> = {}) {
  const { payload, headers } = await corpoMultipart(await arquivosDe(pacoteId))
  return app.inject({ method: 'POST', url: '/api/triagens', payload, headers: { ...headers, ...como(usuario), ...extra } })
}

interface Detalhe {
  triagem: { id: string; situacao: string; versao: number; analiseAtual: number | null }
  analises: { numero: number; situacao: string; motorVersao: string; catalogo: { sha256: string }; anexosSha256: string[] }[]
}

async function aguardar(id: string, usuario = 'ana.analista'): Promise<Detalhe> {
  for (let tentativa = 0; tentativa < 300; tentativa += 1) {
    const resposta = await app.inject({ method: 'GET', url: `/api/triagens/${id}`, headers: como(usuario) })
    const detalhe = resposta.json<Detalhe>()
    if (detalhe.triagem.situacao !== 'processando') return detalhe
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
  throw new Error('triagem não terminou')
}

async function triado(pacoteId: string): Promise<Detalhe> {
  const resposta = await enviar(pacoteId)
  expect(resposta.statusCode).toBe(202)
  return aguardar(resposta.json<{ triagem: { id: string } }>().triagem.id)
}

interface Avaliacoes {
  analise: number
  decisaoAdministrativa: null
  itens: { regraId: string; resultado: string; tipo?: string; rascunho: string; evidencias: { sha256: string }[]; recalculada: boolean; fundamentos: unknown[]; revisoes: unknown[]; historicoRevisao?: unknown }[]
}

async function avaliacoes(id: string, analise?: number): Promise<Avaliacoes> {
  const resposta = await app.inject({ method: 'GET', url: `/api/triagens/${id}/avaliacoes${analise ? `?analise=${analise}` : ''}`, headers: como('ana.analista') })
  expect(resposta.statusCode).toBe(200)
  return resposta.json<Avaliacoes>()
}

const regra = (lista: Avaliacoes, numero: string) => defined(lista.itens.find((item) => item.regraId === `AQR-GCA-${numero}`))

describe('API de triagem (E8)', () => {
  it('cria, processa na fila e consulta processo, anexos e avaliações com evidências e versões', async () => {
    const arquivos = await arquivosDe('DSD-01')
    const { payload, headers } = await corpoMultipart(arquivos)
    const criada = await app.inject({ method: 'POST', url: '/api/triagens', payload, headers: { ...headers, ...como('ana.analista') } })
    expect(criada.statusCode).toBe(202)
    const corpo = criada.json<{ triagem: { id: string; situacao: string }; anexos: { sha256: string }[] }>()
    expect(criada.headers.location).toBe(`/api/triagens/${corpo.triagem.id}`)
    expect(corpo.anexos.map((anexo) => anexo.sha256)).toEqual(arquivos.map((arquivo) => createHash('sha256').update(arquivo.bytes).digest('hex')))

    const detalhe = await aguardar(corpo.triagem.id)
    expect([detalhe.triagem.situacao, detalhe.triagem.analiseAtual]).toEqual(['aguardando-revisao', 1])
    expect(detalhe.analises[0]).toMatchObject({ numero: 1, situacao: 'concluida', motorVersao: 'aqr-triagem@6.1.0' })
    expect(detalhe.analises[0]?.anexosSha256).toHaveLength(8)

    const anexos = (await app.inject({ method: 'GET', url: `/api/triagens/${corpo.triagem.id}/anexos`, headers: como('ana.analista') })).json<{ itens: { tipoReal: string; classificacao: { classe: string }; conteudo: string }[] }>()
    expect(anexos.itens.map((anexo) => anexo.classificacao.classe)).toEqual(['requerimento', 'drt-01', 'matricula-transcricao', 'inscricao-imobiliaria', 'art-rrt-similar', 'prancha', 'cad', 'memorial'])
    expect(anexos.itens.every((anexo) => anexo.conteudo === 'armazenado')).toBe(true)

    const lista = await avaliacoes(corpo.triagem.id)
    expect(lista.itens).toHaveLength(19)
    expect(lista.decisaoAdministrativa).toBeNull()
    const hashes = new Set(corpo.anexos.map((anexo) => anexo.sha256))
    for (const item of lista.itens) {
      expect(item.fundamentos.length).toBeGreaterThan(0)
      expect(item.evidencias.every((evidencia) => hashes.has(evidencia.sha256))).toBe(true)
      expect(contemPalavraDeDecisao(item.rascunho)).toBe(false)
    }
    // Pacote ainda não confirmado como completo: nenhuma ausência é apontada.
    expect(lista.itens.filter((item) => item.tipo === 'nao-localizado')).toEqual([])
  })

  it('arquivos corrompidos, extensões falsas e executáveis: aceitos no pacote, conferidos pelo conteúdo e isolados', async () => {
    const corrompido = (await arquivosDe('DSD-31')).find((arquivo) => arquivo.nome === 'memorial.pdf')
    const jpgComoPdf = (await arquivosDe('DSD-34')).find((arquivo) => arquivo.nome === 'matricula.pdf')
    const executavel = (await arquivosDe('DSD-37')).find((arquivo) => arquivo.nome === 'art.pdf')
    const { payload, headers } = await corpoMultipart([defined(corrompido), defined(jpgComoPdf), defined(executavel)])
    const criada = await app.inject({ method: 'POST', url: '/api/triagens', payload, headers: { ...headers, ...como('ana.analista') } })
    expect(criada.statusCode).toBe(202)
    const id = criada.json<{ triagem: { id: string } }>().triagem.id
    await aguardar(id)
    const anexos = (await app.inject({ method: 'GET', url: `/api/triagens/${id}/anexos`, headers: como('ana.analista') })).json<{ itens: { integridade: string; isolado: boolean; tipoReal: string; extensaoConfere: boolean | string; motivosIsolamento: string[] }[] }>()
    expect(anexos.itens.map((anexo) => [anexo.tipoReal, anexo.integridade, anexo.isolado, anexo.extensaoConfere])).toEqual([
      ['pdf', 'corrompido', false, true],
      ['jpeg', 'legivel', false, false],
      // Executável com nome .pdf: a extensão promete PDF e o conteúdo não é PDF.
      ['desconhecido', 'nao-verificada', true, false],
    ])
    expect(anexos.itens[2]?.motivosIsolamento).toEqual(['conteudo-executavel'])
    expect(regra(await avaliacoes(id), '043')).toMatchObject({ resultado: 'achado', tipo: 'formato-incompativel' })
  })

  it('histórico de revisão pela API: decisão idêntica mantida com vínculo; achado modificado recusa o vínculo (409)', async () => {
    const { triagem } = await triado('DSD-16')
    const id = triagem.id
    const versao = async () => (await app.inject({ method: 'GET', url: `/api/triagens/${id}`, headers: como('ana.analista') })).json<Detalhe>().triagem.versao
    const revisar = async (corpo: Record<string, unknown>) => app.inject({ method: 'POST', url: `/api/triagens/${id}/revisoes`, payload: { versaoEsperada: await versao(), ...corpo }, headers: como('ana.analista') })
    const r009 = (await revisar({ decisao: 'confirmado', regraId: 'AQR-GCA-009', justificativa: 'conferido' })).json<{ revisaoId: string }>().revisaoId
    const r018 = (await revisar({ decisao: 'confirmado', regraId: 'AQR-GCA-018', justificativa: 'conferido' })).json<{ revisaoId: string }>().revisaoId
    const campos = (await app.inject({ method: 'GET', url: `/api/triagens/${id}/campos`, headers: como('ana.analista') })).json<{ itens: { id: string; campo: string; valorBruto?: string }[] }>()
    const lote = defined(campos.itens.find((campo) => campo.campo === 'lote' && campo.valorBruto === 'C3'))
    expect((await revisar({ decisao: 'corrigido', campoId: lote.id, novoValor: 'F7', justificativa: 'Conferido na ART.' })).statusCode).toBe(201)
    expect((await app.inject({ method: 'POST', url: `/api/triagens/${id}/reprocessar`, payload: { versaoEsperada: await versao() }, headers: como('ana.analista') })).statusCode).toBe(201)
    const atuais = await avaliacoes(id)
    expect(regra(atuais, '009')).toMatchObject({ historicoRevisao: { situacao: 'equivalente', analise: 1, diferencas: [], revisoes: [{ id: r009, decisao: 'confirmado' }] }, revisoes: [] })
    expect(regra(atuais, '018')).toMatchObject({ historicoRevisao: { situacao: 'modificado', analise: 1 } })
    // A análise 1 não ganha histórico e continua com suas revisões.
    expect(regra(await avaliacoes(id, 1), '009')).toMatchObject({ revisoes: [{ id: r009 }] })
    expect(regra(await avaliacoes(id, 1), '009')).not.toHaveProperty('historicoRevisao')

    const recusada = await revisar({ decisao: 'confirmado', regraId: 'AQR-GCA-018', justificativa: 'manter', baseRevisaoId: r018 })
    expect(recusada.statusCode).toBe(400)
    const mantida = await revisar({ decisao: 'confirmado', regraId: 'AQR-GCA-009', justificativa: 'Mantida a decisão da análise nº 1.', baseRevisaoId: r009 })
    expect(mantida.statusCode).toBe(201)
    expect(regra(await avaliacoes(id), '009').revisoes).toMatchObject([{ decisao: 'confirmado', baseRevisaoId: r009, analise: 2 }])
  })

  it('regressão (E10.3): o conteúdo de anexo isolado nunca é entregue, nem antes da inspeção', async () => {
    const executavel = (await arquivosDe('DSD-37')).find((arquivo) => arquivo.nome === 'art.pdf')
    const requerimento = (await arquivosDe('DSD-01')).find((arquivo) => arquivo.nome === 'requerimento.pdf')
    const { payload, headers } = await corpoMultipart([defined(requerimento), defined(executavel)])
    const criada = await app.inject({ method: 'POST', url: '/api/triagens', payload, headers: { ...headers, ...como('ana.analista') } })
    const id = criada.json<{ triagem: { id: string } }>().triagem.id
    const anexosAntes = (await app.inject({ method: 'GET', url: `/api/triagens/${id}/anexos`, headers: como('ana.analista') })).json<{ itens: { id: string }[] }>()
    const [legivel, suspeito] = anexosAntes.itens
    // Antes da inspeção (análise em andamento), nada é entregue.
    const cedo = await app.inject({ method: 'GET', url: `/api/triagens/${id}/anexos/${defined(legivel).id}/conteudo`, headers: como('ana.analista') })
    if (cedo.statusCode !== 200) expect(cedo.json()).toMatchObject({ error: { code: 'SEM_ANALISE' } })
    await aguardar(id)
    const negado = await app.inject({ method: 'GET', url: `/api/triagens/${id}/anexos/${defined(suspeito).id}/conteudo`, headers: como('ana.analista') })
    expect(negado.statusCode).toBe(403)
    expect(negado.json()).toMatchObject({ error: { code: 'ANEXO_ISOLADO' } })
    expect(negado.body).not.toContain('MZ')
    const eventos = db.prepare("SELECT count(*) AS n FROM triagem_eventos WHERE acao = 'acesso.negado' AND triagem_id = ?").get(id) as { n: number }
    expect(eventos.n).toBe(1)
    // O administrador também não recebe.
    expect((await app.inject({ method: 'GET', url: `/api/triagens/${id}/anexos/${defined(suspeito).id}/conteudo`, headers: como('carla.admin') })).statusCode).toBe(403)
    // O anexo legível continua disponível, como download e sem cache.
    const ok = await app.inject({ method: 'GET', url: `/api/triagens/${id}/anexos/${defined(legivel).id}/conteudo`, headers: como('ana.analista') })
    expect(ok.statusCode).toBe(200)
    expect(ok.headers).toMatchObject({ 'content-type': 'application/octet-stream', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' })
    expect(String(ok.headers['content-disposition'])).toMatch(/^attachment;/)
  })

  it('limites: sem anexos, anexos demais, pacote grande demais, metadados inválidos e sem multipart', async () => {
    const vazio = await corpoMultipart([])
    expect((await app.inject({ method: 'POST', url: '/api/triagens', payload: vazio.payload, headers: { ...vazio.headers, ...como('ana.analista') } })).json<{ error: { code: string } }>().error.code).toBe('SEM_ANEXOS')
    const muitos = Array.from({ length: 13 }, (_, indice) => ({ nome: `a${indice}.pdf`, bytes: new TextEncoder().encode(`%PDF-1.7 ${indice}`) }))
    const excesso = await corpoMultipart(muitos)
    const respostaExcesso = await app.inject({ method: 'POST', url: '/api/triagens', payload: excesso.payload, headers: { ...excesso.headers, ...como('ana.analista') } })
    expect([respostaExcesso.statusCode, respostaExcesso.json<{ error: { code: string } }>().error.code]).toEqual([400, 'ANEXOS_DEMAIS'])
    const invalido = await corpoMultipart([{ nome: 'a.pdf', bytes: new Uint8Array([1]) }], { ...METADADOS, modalidade: 'X' })
    expect((await app.inject({ method: 'POST', url: '/api/triagens', payload: invalido.payload, headers: { ...invalido.headers, ...como('ana.analista') } })).statusCode).toBe(400)
    expect((await app.inject({ method: 'POST', url: '/api/triagens', payload: {}, headers: como('ana.analista') })).statusCode).toBe(415)

    await app.close()
    app = await montar({ TRIAGEM_MAX_BYTES_PACOTE: '4096' })
    const grande = await corpoMultipart([{ nome: 'a.pdf', bytes: new Uint8Array(3000) }, { nome: 'b.pdf', bytes: new Uint8Array(3000) }])
    const respostaGrande = await app.inject({ method: 'POST', url: '/api/triagens', payload: grande.payload, headers: { ...grande.headers, ...como('ana.analista') } })
    expect([respostaGrande.statusCode, respostaGrande.json<{ error: { code: string } }>().error.code]).toEqual([413, 'PACOTE_GRANDE_DEMAIS'])
    expect(db.prepare('SELECT count(*) AS n FROM triagens').get()).toEqual({ n: 0 })
  })

  it('permissões por papel e isolamento entre processos', async () => {
    const { triagem } = (await enviar('DSD-01')).json<{ triagem: { id: string } }>()
    await aguardar(triagem.id)
    // Sem identificação, conta inativa, outro computador.
    expect((await app.inject({ method: 'GET', url: '/api/triagens' })).statusCode).toBe(401)
    expect((await app.inject({ method: 'GET', url: '/api/triagens', headers: como('dora.inativa') })).statusCode).toBe(401)
    expect((await app.inject({ method: 'GET', url: '/api/triagens', headers: como('ana.analista'), remoteAddress: '10.0.0.7' })).statusCode).toBe(403)
    // Outro analista: não vê nem altera (404, sem revelar que existe).
    expect((await app.inject({ method: 'GET', url: `/api/triagens/${triagem.id}`, headers: como('beto.analista') })).statusCode).toBe(404)
    expect((await app.inject({ method: 'GET', url: `/api/triagens/${triagem.id}/avaliacoes`, headers: como('beto.analista') })).statusCode).toBe(404)
    expect((await app.inject({ method: 'POST', url: `/api/triagens/${triagem.id}/reprocessar`, payload: { versaoEsperada: 2 }, headers: como('beto.analista') })).statusCode).toBe(404)
    expect((await app.inject({ method: 'GET', url: '/api/triagens', headers: como('beto.analista') })).json<{ total: number }>().total).toBe(0)
    // Administrador: acompanha todos, mas não cria nem altera a análise.
    expect((await app.inject({ method: 'GET', url: `/api/triagens/${triagem.id}`, headers: como('carla.admin') })).statusCode).toBe(200)
    expect((await app.inject({ method: 'GET', url: '/api/triagens', headers: como('carla.admin') })).json<{ total: number }>().total).toBe(1)
    expect((await enviar('DSD-01', 'carla.admin')).statusCode).toBe(403)
    expect((await app.inject({ method: 'POST', url: `/api/triagens/${triagem.id}/revisoes`, payload: { versaoEsperada: 2, decisao: 'encaminhado', regraId: 'AQR-GCA-001' }, headers: como('carla.admin') })).statusCode).toBe(403)
    expect((await app.inject({ method: 'POST', url: `/api/triagens/${triagem.id}/condicoes`, payload: { versaoEsperada: 2, tipo: 'integridade', valor: 'completo', justificativa: 'conferido' }, headers: como('carla.admin') })).statusCode).toBe(403)
    // Conteúdo sintético: só para quem pode ver o processo, sempre como download.
    const anexos = (await app.inject({ method: 'GET', url: `/api/triagens/${triagem.id}/anexos`, headers: como('ana.analista') })).json<{ itens: { id: string; sha256: string }[] }>()
    const primeiro = defined(anexos.itens[0])
    const download = await app.inject({ method: 'GET', url: `/api/triagens/${triagem.id}/anexos/${primeiro.id}/conteudo`, headers: como('ana.analista') })
    expect(download.statusCode).toBe(200)
    expect(download.headers['content-disposition']).toMatch(/^attachment;/u)
    expect(createHash('sha256').update(download.rawPayload).digest('hex')).toBe(primeiro.sha256)
    expect((await app.inject({ method: 'GET', url: `/api/triagens/${triagem.id}/anexos/${primeiro.id}/conteudo`, headers: como('beto.analista') })).statusCode).toBe(404)
  })

  it('idempotência e concorrência', async () => {
    const primeira = await enviar('DSD-01', 'ana.analista', { 'idempotency-key': 'pacote-sintetico-01' })
    const segunda = await enviar('DSD-01', 'ana.analista', { 'idempotency-key': 'pacote-sintetico-01' })
    expect([primeira.statusCode, segunda.statusCode]).toEqual([202, 200])
    const id = primeira.json<{ triagem: { id: string } }>().triagem.id
    expect(segunda.json<{ triagem: { id: string }; nova: boolean }>()).toMatchObject({ triagem: { id }, nova: false })
    expect(db.prepare('SELECT count(*) AS n FROM triagens').get()).toEqual({ n: 1 })
    const detalhe = await aguardar(id)
    // Duas ações com a mesma versão: a primeira vale, a segunda recebe 409.
    const pedidos = await Promise.all(
      [1, 2].map(() => app.inject({ method: 'POST', url: `/api/triagens/${id}/reprocessar`, payload: { versaoEsperada: detalhe.triagem.versao }, headers: como('ana.analista') })),
    )
    expect(pedidos.map((pedido) => pedido.statusCode).sort()).toEqual([201, 409])
    expect((await aguardar(id)).analises).toHaveLength(2)
  })

  it('pacote incompleto × confirmado como completo; a confirmação é explícita, justificada e auditada', async () => {
    const detalhe = await triado('DSD-15')
    const id = detalhe.triagem.id
    expect(regra(await avaliacoes(id), '013').resultado).toBe('nao-avaliavel')
    const semJustificativa = await app.inject({ method: 'POST', url: `/api/triagens/${id}/condicoes`, payload: { versaoEsperada: detalhe.triagem.versao, tipo: 'integridade', valor: 'completo' }, headers: como('ana.analista') })
    expect(semJustificativa.statusCode).toBe(400)
    const confirmada = await app.inject({ method: 'POST', url: `/api/triagens/${id}/condicoes`, payload: { versaoEsperada: detalhe.triagem.versao, tipo: 'integridade', valor: 'completo', justificativa: 'Conferido com o protocolo sintético.' }, headers: como('ana.analista') })
    expect(confirmada.statusCode).toBe(201)
    const reprocessada = await app.inject({ method: 'POST', url: `/api/triagens/${id}/reprocessar`, payload: { versaoEsperada: detalhe.triagem.versao + 1 }, headers: como('ana.analista') })
    expect(reprocessada.statusCode).toBe(201)
    expect(reprocessada.json<{ recalculadas: string[] }>().recalculadas).toContain('AQR-GCA-013')
    expect(regra(await avaliacoes(id), '013')).toMatchObject({ resultado: 'achado', tipo: 'nao-localizado' })
    // A primeira análise continua consultável, como estava.
    expect(regra(await avaliacoes(id, 1), '013').resultado).toBe('nao-avaliavel')
    const final = (await app.inject({ method: 'GET', url: `/api/triagens/${id}`, headers: como('ana.analista') })).json<{ enquadramento: { integridadeDoPacote: { valor: string; origem: string } }; confirmacoes: { autor: string }[] }>()
    expect(final.enquadramento.integridadeDoPacote).toMatchObject({ valor: 'completo', origem: 'confirmado-servidor' })
    expect(final.confirmacoes[0]?.autor).toBe('ana.analista')
  })

  it('correção humana de campo seguida de reprocessamento: só as afetadas, evidências e versões preservadas', async () => {
    const detalhe = await triado('DSD-17')
    const id = detalhe.triagem.id
    expect(regra(await avaliacoes(id), '020').resultado).toBe('achado')
    const campos = (await app.inject({ method: 'GET', url: `/api/triagens/${id}/campos`, headers: como('ana.analista') })).json<{ itens: { id: string; campo: string; valorBruto?: string }[] }>()
    const errado = defined(campos.itens.find((campo) => campo.campo === 'matricula' && campo.valorBruto === '90471'))
    const revisao = await app.inject({ method: 'POST', url: `/api/triagens/${id}/revisoes`, payload: { versaoEsperada: detalhe.triagem.versao, decisao: 'corrigido', campoId: errado.id, novoValor: '90417', justificativa: 'Conferido na prancha sintética.' }, headers: como('ana.analista') })
    expect(revisao.statusCode).toBe(201)
    // Versão desatualizada: 409.
    expect((await app.inject({ method: 'POST', url: `/api/triagens/${id}/reprocessar`, payload: { versaoEsperada: detalhe.triagem.versao }, headers: como('ana.analista') })).statusCode).toBe(409)
    const reprocessada = await app.inject({ method: 'POST', url: `/api/triagens/${id}/reprocessar`, payload: { versaoEsperada: detalhe.triagem.versao + 1 }, headers: como('ana.analista') })
    const { recalculadas, reaproveitadas } = reprocessada.json<{ recalculadas: string[]; reaproveitadas: string[] }>()
    expect(recalculadas).toContain('AQR-GCA-020')
    expect(reaproveitadas).toContain('AQR-GCA-021')
    const segunda = await avaliacoes(id)
    expect([segunda.analise, regra(segunda, '020').resultado, regra(segunda, '021').recalculada]).toEqual([2, 'sem-achado', false])
    const primeira = await avaliacoes(id, 1)
    expect(regra(primeira, '020').resultado).toBe('achado')
    expect(regra(primeira, '020').evidencias.length).toBeGreaterThan(0)
  })

  it('revisões não podem ser editadas nem apagadas e não há rota de decisão administrativa', async () => {
    const detalhe = await triado('DSD-16')
    const id = detalhe.triagem.id
    const revisao = await app.inject({ method: 'POST', url: `/api/triagens/${id}/revisoes`, payload: { versaoEsperada: detalhe.triagem.versao, decisao: 'confirmado', regraId: 'AQR-GCA-018' }, headers: como('ana.analista') })
    expect(revisao.statusCode).toBe(201)
    const revisaoId = revisao.json<{ revisaoId: string }>().revisaoId
    for (const metodo of ['PUT', 'PATCH', 'DELETE'] as const) {
      expect((await app.inject({ method: metodo, url: `/api/triagens/${id}/revisoes/${revisaoId}`, headers: como('ana.analista') })).statusCode).toBe(404)
    }
    for (const acao of ['aprovar', 'indeferir', 'deferir', 'arquivar', 'anuir', 'comunicar', 'resultado']) {
      expect((await app.inject({ method: 'POST', url: `/api/triagens/${id}/${acao}`, payload: {}, headers: como('ana.analista') })).statusCode, acao).toBe(404)
    }
    // O cliente não consegue mandar resultado de regra: campos fora do contrato são recusados.
    const forjada = await app.inject({ method: 'POST', url: `/api/triagens/${id}/revisoes`, payload: { versaoEsperada: detalhe.triagem.versao + 1, decisao: 'confirmado', regraId: 'AQR-GCA-001', resultado: 'sem-achado' }, headers: como('ana.analista') })
    expect(forjada.statusCode).toBe(400)
    const corpo = JSON.stringify((await app.inject({ method: 'GET', url: `/api/triagens/${id}/avaliacoes`, headers: como('ana.analista') })).json())
    expect(contemPalavraDeDecisao(corpo)).toBe(false)
  })

  it('reinício durante o processamento: o processo não fica preso e pode ser retomado pelo conteúdo cifrado', async () => {
    const { triagem } = (await enviar('DSD-01')).json<{ triagem: { id: string } }>()
    // Desliga antes de a thread terminar e sobe de novo com o mesmo banco.
    await app.close()
    app = await montar()
    const detalhe = (await app.inject({ method: 'GET', url: `/api/triagens/${triagem.id}`, headers: como('ana.analista') })).json<Detalhe>()
    // A thread leva mais que o desligamento imediato: a análise inicial fica interrompida, nunca presa.
    expect([detalhe.triagem.situacao, detalhe.triagem.analiseAtual, detalhe.analises[0]?.situacao]).toEqual(['falhou', null, 'interrompida'])
    const retomada = await app.inject({ method: 'POST', url: `/api/triagens/${triagem.id}/reprocessar`, payload: { versaoEsperada: detalhe.triagem.versao }, headers: como('ana.analista') })
    expect(retomada.statusCode).toBe(202)
    const final = await aguardar(triagem.id)
    expect(final.triagem.situacao).toBe('aguardando-revisao')
    expect(final.analises.map((analise) => [analise.numero, analise.situacao])).toEqual([[1, 'interrompida'], [2, 'concluida']])
  })

  it('status decidido pelo servidor: limites, conteúdo e papel de quem pergunta', async () => {
    const analista = (await app.inject({ method: 'GET', url: '/api/triagem/status', headers: como('ana.analista') })).json<{ disponivel: boolean; pessoa: { papel: string; podeCriar: boolean }; limites: { maxAnexos: number }; conteudoArmazenado: boolean; modalidadesSuportadas: string[] }>()
    expect(analista).toMatchObject({ disponivel: true, modo: 'experimental-sintetico', modalidadesSuportadas: ['D'], etapasSuportadas: ['abertura'], conteudoArmazenado: true, limites: { maxAnexos: 12 }, pessoa: { papel: 'analista', podeCriar: true } })
    expect((await app.inject({ method: 'GET', url: '/api/triagem/status', headers: como('carla.admin') })).json()).toMatchObject({ pessoa: { papel: 'administrador', podeCriar: false } })
    expect((await app.inject({ method: 'GET', url: '/api/triagem/status' })).json()).toMatchObject({ disponivel: true, pessoa: null })
  })

  it('resumo, anexos e avaliações trazem o que a interface precisa', async () => {
    const detalhe = await triado('DSD-16')
    const lista = (await app.inject({ method: 'GET', url: '/api/triagens', headers: como('ana.analista') })).json<{ itens: { modalidade: string; etapa: string; achados: number; pendentesRevisao: number; ultimaAnalise: { situacao: string; encerradaEm: string } }[] }>()
    const item = defined(lista.itens[0])
    expect([item.modalidade, item.etapa, item.ultimaAnalise.situacao]).toEqual(['D', 'abertura', 'concluida'])
    expect(item.achados).toBeGreaterThan(0)
    expect(item.pendentesRevisao).toBe(item.achados)
    const anexos = (await app.inject({ method: 'GET', url: `/api/triagens/${detalhe.triagem.id}/anexos`, headers: como('ana.analista') })).json<{ itens: { paginas: { pagina: number; rotacao: number }[] }[] }>()
    expect(anexos.itens[0]?.paginas).toEqual([expect.objectContaining({ pagina: 1, rotacao: 0 })])
    const art = regra(await avaliacoes(detalhe.triagem.id), '018') as unknown as { camposUsados: string[] }
    expect(art.camposUsados.length).toBeGreaterThan(0)
    const reprocessada = await app.inject({ method: 'POST', url: `/api/triagens/${detalhe.triagem.id}/reprocessar`, payload: { versaoEsperada: detalhe.triagem.versao }, headers: como('ana.analista') })
    // Sem correção nem confirmação, nada muda.
    expect(reprocessada.json<{ alteradas: string[] }>().alteradas).toEqual([])
  })

  it('triagem desligada por padrão: as rotas não existem', async () => {
    await app.close()
    app = await buildTestApp({ db, env: { ADMIN_API_MODE: 'dev' } })
    expect((await app.inject({ method: 'GET', url: '/api/triagem/status' })).json()).toEqual({ disponivel: false, modo: 'desativada' })
    expect((await app.inject({ method: 'GET', url: '/api/triagens', headers: como('ana.analista') })).statusCode).toBe(404)
  })
})

/**
 * Escopo operacional (B1): o contrato aceita todas as modalidades e etapas do catálogo, mas a API só
 * executa triagem nos enquadramentos com implementação validada. Os pedidos aqui vão direto à API,
 * sem a interface, como faria um cliente HTTP próprio.
 */
describe('API de triagem: escopo operacional (B1)', () => {
  const contagens = () => ({
    triagens: db.prepare('SELECT count(*) AS n FROM triagens').get(),
    analises: db.prepare('SELECT count(*) AS n FROM triagem_analises').get(),
    anexos: db.prepare('SELECT count(*) AS n FROM triagem_anexos').get(),
    eventos: db.prepare('SELECT count(*) AS n FROM triagem_eventos').get(),
    confirmacoes: db.prepare('SELECT count(*) AS n FROM triagem_confirmacoes').get(),
  })
  const arquivosCifrados = () => readdirSync(pasta, { recursive: true }).length

  async function criarCom(metadados: unknown, usuario = 'ana.analista', extra: Record<string, string> = {}) {
    const { payload, headers } = await corpoMultipart(await arquivosDe('DSD-01'), metadados)
    return app.inject({ method: 'POST', url: '/api/triagens', payload, headers: { ...headers, ...como(usuario), ...extra } })
  }

  /** Enquadramento gravado antes da política (dado histórico), direto no banco, sem passar pelo serviço. */
  function confirmacaoHistorica(triagemId: string, tipo: 'modalidade' | 'etapa', valor: string) {
    const autor = db.prepare('SELECT id FROM accounts WHERE usuario = ?').get('ana.analista') as { id: string }
    new TriagemRepository(db).inserirConfirmacao({ id: randomUUID(), triagemId, tipo, chave: tipo, valor, justificativa: '', autorId: autor.id, autorRotulo: 'ana.analista', em: '2026-11-10T12:00:00.000Z' })
  }

  it('desdobro na abertura continua sendo triado normalmente', async () => {
    const detalhe = await triado('DSD-01')
    expect([detalhe.triagem.situacao, detalhe.analises[0]?.situacao]).toEqual(['aguardando-revisao', 'concluida'])
    expect((await avaliacoes(detalhe.triagem.id)).itens).toHaveLength(19)
  })

  it.each([
    ['modalidade não suportada', { modalidade: 'L1', etapa: 'abertura' }],
    ['modalidade sem regra implementada', { modalidade: 'CERT-MED', etapa: 'abertura' }],
    ['modalidade com o mesmo mapa de regras no catálogo, mas sem validação', { modalidade: 'R/D', etapa: 'abertura' }],
    ['etapa não suportada', { modalidade: 'D', etapa: 'analise' }],
    ['etapa posterior não suportada', { modalidade: 'D', etapa: 'pos-decisao' }],
    ['combinação inválida', { modalidade: 'RET', etapa: 'pos-analise' }],
  ])('%s: recusada com 422 antes de qualquer efeito persistente', async (_caso, enquadramento) => {
    const antes = contagens()
    const resposta = await criarCom({ ...METADADOS, ...enquadramento }, 'ana.analista', { 'idempotency-key': 'escopo-fora-01' })
    expect(resposta.statusCode).toBe(422)
    const erro = resposta.json<{ error: { code: string; message: string } }>().error
    expect(erro.code).toBe('ESCOPO_NAO_SUPORTADO')
    expect(erro.message).toMatch(/desdobro na abertura/u)
    // Nada criado: nem processo, nem análise, nem anexo, nem evento, nem conteúdo cifrado em disco.
    expect(contagens()).toEqual(antes)
    expect(arquivosCifrados()).toBe(0)
    expect((await app.inject({ method: 'GET', url: '/api/triagens', headers: como('ana.analista') })).json<{ total: number }>().total).toBe(0)
    // A chave de idempotência não ficou presa ao pedido recusado: o pedido válido com ela cria o processo.
    expect((await criarCom(METADADOS, 'ana.analista', { 'idempotency-key': 'escopo-fora-01' })).statusCode).toBe(202)
  })

  it('valor fora do contrato continua erro de validação (400), distinto de escopo não suportado', async () => {
    const resposta = await criarCom({ ...METADADOS, modalidade: 'X' })
    expect([resposta.statusCode, resposta.json<{ error: { code: string } }>().error.code]).toEqual([400, 'ENTRADA_INVALIDA'])
  })

  it('autenticação e papel são conferidos antes do escopo', async () => {
    const fora = { ...METADADOS, modalidade: 'L1' }
    const { payload, headers } = await corpoMultipart(await arquivosDe('DSD-01'), fora)
    expect((await app.inject({ method: 'POST', url: '/api/triagens', payload, headers })).statusCode).toBe(401)
    expect((await criarCom(fora, 'dora.inativa')).statusCode).toBe(401)
    expect((await criarCom(fora, 'carla.admin')).statusCode).toBe(403)
    expect((await app.inject({ method: 'POST', url: '/api/triagens', payload, headers: { ...headers, ...como('ana.analista') }, remoteAddress: '10.0.0.7' })).statusCode).toBe(403)
    expect(contagens().triagens).toEqual({ n: 0 })
  })

  it('confirmar modalidade ou etapa fora do escopo é recusado sem alterar o processo', async () => {
    const detalhe = await triado('DSD-01')
    const id = detalhe.triagem.id
    const versao = detalhe.triagem.versao
    for (const corpo of [
      { versaoEsperada: versao, tipo: 'modalidade', valor: 'L1', justificativa: '' },
      { versaoEsperada: versao, tipo: 'etapa', valor: 'analise', justificativa: '' },
    ]) {
      const resposta = await app.inject({ method: 'POST', url: `/api/triagens/${id}/condicoes`, payload: corpo, headers: como('ana.analista') })
      expect([resposta.statusCode, resposta.json<{ error: { code: string } }>().error.code]).toEqual([422, 'ESCOPO_NAO_SUPORTADO'])
    }
    const depois = (await app.inject({ method: 'GET', url: `/api/triagens/${id}`, headers: como('ana.analista') })).json<{ triagem: { versao: number }; confirmacoes: unknown[]; enquadramento: { modalidade: { valor: string }; etapa: { valor: string } } }>()
    expect([depois.triagem.versao, depois.confirmacoes, depois.enquadramento.modalidade.valor, depois.enquadramento.etapa.valor]).toEqual([versao, [], 'D', 'abertura'])
    // Confirmar o enquadramento suportado continua possível; a permissão segue valendo para os outros.
    expect((await app.inject({ method: 'POST', url: `/api/triagens/${id}/condicoes`, payload: { versaoEsperada: versao, tipo: 'modalidade', valor: 'D', justificativa: '' }, headers: como('ana.analista') })).statusCode).toBe(201)
    expect((await app.inject({ method: 'POST', url: `/api/triagens/${id}/condicoes`, payload: { versaoEsperada: versao + 1, tipo: 'modalidade', valor: 'L1', justificativa: '' }, headers: como('beto.analista') })).statusCode).toBe(404)
    expect((await app.inject({ method: 'POST', url: `/api/triagens/${id}/condicoes`, payload: { versaoEsperada: versao + 1, tipo: 'modalidade', valor: 'L1', justificativa: '' }, headers: como('carla.admin') })).statusCode).toBe(403)
  })

  it('processo histórico fora do escopo: consulta preservada; reprocessamento recusado sem nova análise; volta ao escopo e reprocessa', async () => {
    const detalhe = await triado('DSD-01')
    const id = detalhe.triagem.id
    confirmacaoHistorica(id, 'modalidade', 'L1')
    const antes = contagens()

    // Consulta: processo, lista, avaliações e campos da análise já concluída continuam disponíveis.
    const consultado = (await app.inject({ method: 'GET', url: `/api/triagens/${id}`, headers: como('ana.analista') })).json<{ enquadramento: { modalidade: { valor: string; origem: string } }; analises: unknown[] }>()
    expect([consultado.enquadramento.modalidade, consultado.analises.length]).toEqual([expect.objectContaining({ valor: 'L1', origem: 'confirmado-servidor' }), 1])
    expect((await app.inject({ method: 'GET', url: '/api/triagens', headers: como('ana.analista') })).json<{ itens: { modalidade: string }[] }>().itens[0]?.modalidade).toBe('L1')
    expect((await avaliacoes(id, 1)).itens).toHaveLength(19)
    expect((await app.inject({ method: 'GET', url: `/api/triagens/${id}/campos`, headers: como('ana.analista') })).statusCode).toBe(200)
    expect((await app.inject({ method: 'GET', url: `/api/triagens/${id}`, headers: como('carla.admin') })).statusCode).toBe(200)

    // Reprocessar não contorna a política: 422, sem análise nova, sem evento, mesma versão.
    const reprocessada = await app.inject({ method: 'POST', url: `/api/triagens/${id}/reprocessar`, payload: { versaoEsperada: detalhe.triagem.versao }, headers: como('ana.analista') })
    expect([reprocessada.statusCode, reprocessada.json<{ error: { code: string } }>().error.code]).toEqual([422, 'ESCOPO_NAO_SUPORTADO'])
    expect(contagens()).toEqual(antes)
    const depois = await aguardar(id)
    expect([depois.triagem.versao, depois.triagem.analiseAtual, depois.analises.length]).toEqual([detalhe.triagem.versao, 1, 1])
    // A permissão continua antes do escopo: outro analista não vê o processo.
    expect((await app.inject({ method: 'POST', url: `/api/triagens/${id}/reprocessar`, payload: { versaoEsperada: detalhe.triagem.versao }, headers: como('beto.analista') })).statusCode).toBe(404)
    expect((await app.inject({ method: 'POST', url: `/api/triagens/${id}/reprocessar`, payload: { versaoEsperada: detalhe.triagem.versao }, headers: como('carla.admin') })).statusCode).toBe(403)

    // Revisão humana sobre a análise já existente continua registrável (não executa o motor).
    const revisao = await app.inject({ method: 'POST', url: `/api/triagens/${id}/revisoes`, payload: { versaoEsperada: detalhe.triagem.versao, decisao: 'encaminhado', regraId: 'AQR-GCA-001' }, headers: como('ana.analista') })
    expect(revisao.statusCode).toBe(201)

    // O servidor confirma o enquadramento suportado: o reprocessamento volta a ser possível.
    const confirmada = await app.inject({ method: 'POST', url: `/api/triagens/${id}/condicoes`, payload: { versaoEsperada: detalhe.triagem.versao + 1, tipo: 'modalidade', valor: 'D', justificativa: 'Conferido.' }, headers: como('ana.analista') })
    expect(confirmada.statusCode).toBe(201)
    const ok = await app.inject({ method: 'POST', url: `/api/triagens/${id}/reprocessar`, payload: { versaoEsperada: detalhe.triagem.versao + 2 }, headers: como('ana.analista') })
    expect(ok.statusCode).toBe(201)
    // Trilha preservada: as duas confirmações (histórica e nova) e a revisão continuam registradas.
    const final = (await app.inject({ method: 'GET', url: `/api/triagens/${id}`, headers: como('ana.analista') })).json<{ confirmacoes: { valor: string }[]; revisoes: unknown[]; analises: unknown[] }>()
    expect([final.confirmacoes.map((c) => c.valor), final.revisoes.length, final.analises.length]).toEqual([['L1', 'D'], 1, 2])
  })

  it('retomada de processo histórico fora do escopo também é recusada antes de decifrar ou enfileirar', async () => {
    const { triagem } = (await criarCom(METADADOS)).json<{ triagem: { id: string } }>()
    await app.close()
    app = await montar()
    const interrompido = (await app.inject({ method: 'GET', url: `/api/triagens/${triagem.id}`, headers: como('ana.analista') })).json<Detalhe>()
    expect([interrompido.triagem.situacao, interrompido.triagem.analiseAtual]).toEqual(['falhou', null])
    confirmacaoHistorica(triagem.id, 'etapa', 'pos-decisao')
    const antes = contagens()
    const retomada = await app.inject({ method: 'POST', url: `/api/triagens/${triagem.id}/reprocessar`, payload: { versaoEsperada: interrompido.triagem.versao }, headers: como('ana.analista') })
    expect([retomada.statusCode, retomada.json<{ error: { code: string } }>().error.code]).toEqual([422, 'ESCOPO_NAO_SUPORTADO'])
    expect(contagens()).toEqual(antes)
    const depois = (await app.inject({ method: 'GET', url: `/api/triagens/${triagem.id}`, headers: como('ana.analista') })).json<Detalhe>()
    expect([depois.triagem.situacao, depois.analises.map((a) => a.situacao)]).toEqual(['falhou', ['interrompida']])
  })

  it('status informa o escopo derivado da mesma política que a API aplica', async () => {
    const status = (await app.inject({ method: 'GET', url: '/api/triagem/status', headers: como('ana.analista') })).json<{ modalidadesSuportadas: string[]; etapasSuportadas: string[] }>()
    expect([status.modalidadesSuportadas, status.etapasSuportadas]).toEqual([modalidadesSuportadas(), etapasSuportadas()])
  })
})
