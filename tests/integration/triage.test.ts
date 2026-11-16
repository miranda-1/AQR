import { mkdtempSync, rmSync } from 'node:fs'
import type { AddressInfo } from 'node:net'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { FastifyInstance } from 'fastify'
import { createHttpTriagemService } from '@/features/triage/services/http-triage-service'
import { TriagemServiceError, type TriagemService } from '@/features/triage/model/types'
import { contemPalavraDeDecisao } from '../../shared/contracts/triage.ts'
import { openDatabase, type Database } from '../../server/db/database.ts'
import { migrate } from '../../server/db/migrate.ts'
import { seedAccount } from '../../server/test/accounts.ts'
import { buildTestApp } from '../../server/test/build-test-app.ts'
import { gerarPacote } from '../../server/triage/corpus/generate.ts'
import { PACOTES } from '../../server/triage/corpus/pacotes.ts'

/**
 * Ponta a ponta da triagem (E9): o mesmo serviço que a tela usa (`createHttpTriagemService`)
 * conversa por HTTP com o servidor real em modo experimental, com threads de triagem de verdade,
 * SQLite em memória e um pacote sintético completo (DSD-16). Envio → processamento → achado →
 * evidência → correção → reprocessamento → revisão; nenhuma decisão administrativa.
 */

const CATALOGO_DIR = fileURLToPath(new URL('../../docs/triagem/catalogo/', import.meta.url))

let db: Database
let pasta: string
let app: FastifyInstance
let baseUrl: string

beforeAll(async () => {
  db = openDatabase(':memory:')
  migrate(db)
  seedAccount(db, 'ana.analista', 'analista')
  seedAccount(db, 'beto.analista', 'analista')
  seedAccount(db, 'carla.admin', 'administrador')
  pasta = mkdtempSync(path.join(tmpdir(), 'aqr-e2e-triagem-'))
  app = await buildTestApp({
    db,
    env: {
      ADMIN_API_MODE: 'dev',
      TRIAGEM_MODO: 'experimental-sintetico',
      TRIAGEM_OCR: 'off',
      TRIAGEM_WORKERS: '2',
      TRIAGEM_QUEUE_LIMIT: '8',
      TRIAGEM_CATALOGO_DIR: CATALOGO_DIR,
      TRIAGEM_CONTEUDO_DIR: pasta,
      TRIAGEM_CONTEUDO_CHAVE: Buffer.alloc(32, 7).toString('base64'),
    },
  })
  await app.listen({ host: '127.0.0.1', port: 0 })
  baseUrl = `http://127.0.0.1:${(app.server.address() as AddressInfo).port}`
})

afterAll(async () => {
  await app.close()
  db.close()
  rmSync(pasta, { recursive: true, force: true })
})

const servico = (usuario: string): TriagemService => createHttpTriagemService({ baseUrl, getActor: () => usuario })

async function aguardar(service: TriagemService, id: string) {
  for (let tentativa = 0; tentativa < 300; tentativa += 1) {
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

describe('triagem de ponta a ponta', () => {
  it('envia o pacote DSD-16, vê o achado com evidência, corrige, reprocessa e revisa', { timeout: 120_000 }, async () => {
    const ana = servico('ana.analista')
    const status = await ana.status()
    if (!status.disponivel) throw new Error('triagem deveria estar ligada')
    expect(status.pessoa).toMatchObject({ usuario: 'ana.analista', papel: 'analista', podeCriar: true })
    expect(status.conteudoArmazenado).toBe(true)

    const pacote = PACOTES.find((item) => item.id === 'DSD-16')
    if (!pacote) throw new Error('pacote DSD-16 ausente')
    const arquivos = (await gerarPacote(pacote)).arquivos.map((arquivo) => new File([arquivo.bytes.slice()], arquivo.nome))
    const dados = { referencia: 'SINTETICO-E2E', protocoladoEm: '2026-11-05T15:00:00.000Z', modalidade: 'D' as const, etapa: 'abertura' as const }

    const criada = await ana.criar(dados, arquivos, 'chave-e2e-1')
    expect(criada.nova).toBe(true)
    // A mesma chave não cria outro processo.
    const repetida = await ana.criar(dados, arquivos, 'chave-e2e-1')
    expect(repetida).toMatchObject({ nova: false, triagem: { id: criada.triagem.id } })

    const id = criada.triagem.id
    const detalhe = await aguardar(ana, id)
    expect(detalhe.triagem).toMatchObject({ situacao: 'aguardando-revisao', analiseAtual: 1, criadaPorMim: true })
    expect((await ana.listar()).itens.map((item) => item.id)).toEqual([id])

    const avaliacoes = await ana.avaliacoes(id)
    expect(avaliacoes.itens).toHaveLength(19)
    for (const item of avaliacoes.itens) expect(contemPalavraDeDecisao(item.rascunho)).toBe(false)
    const art = avaliacoes.itens.find((item) => item.regraId === 'AQR-GCA-018')
    expect(art).toMatchObject({ resultado: 'achado', tipo: 'divergencia' })
    // Sem confirmação de completude, nenhuma ausência vira "não localizado".
    expect(avaliacoes.itens.some((item) => item.tipo === 'nao-localizado')).toBe(false)

    // Evidência: o valor C3 está na ART, página 1, com região; o arquivo vem do endpoint autenticado.
    const anexos = await ana.anexos(id)
    const valorC3 = art?.valoresConflitantes[0]?.valores.find((valor) => valor.valorBruto === 'C3')
    const anexoArt = anexos.itens.find((anexo) => anexo.id === valorC3?.anexoId)
    expect(anexoArt).toMatchObject({ nome: 'art.pdf', conteudo: 'armazenado' })
    expect(valorC3?.evidencias[0]).toMatchObject({ pagina: 1 })
    expect(valorC3?.evidencias[0]?.regioes?.length).toBeGreaterThan(0)
    const conteudo = await ana.conteudo(id, anexoArt?.id ?? '')
    expect(conteudo.size).toBe(anexoArt?.bytes)

    // Outra analista não vê; o administrador vê, mas não altera.
    expect((await erroDe(servico('beto.analista').detalhe(id))).status).toBe(404)
    const carla = servico('carla.admin')
    expect((await carla.detalhe(id)).triagem.criadaPorMim).toBe(false)
    expect((await erroDe(carla.reprocessar(id, detalhe.triagem.versao))).status).toBe(403)

    // Correção do lote lido na ART; o valor original continua registrado.
    const campos = await ana.campos(id)
    const lote = campos.itens.find((campo) => campo.campo === 'lote' && campo.anexoId === anexoArt?.id)
    expect(lote?.valorBruto).toBe('C3')
    const corrigido = await ana.revisar(id, {
      versaoEsperada: detalhe.triagem.versao,
      decisao: 'corrigido',
      campoId: lote?.id ?? '',
      novoValor: 'F7',
      justificativa: 'Leitura conferida na ART sintética',
    })

    // Versão desatualizada: 409, nada muda.
    const conflito = await erroDe(ana.reprocessar(id, detalhe.triagem.versao))
    expect(conflito).toMatchObject({ status: 409, code: 'CONFLITO_DE_VERSAO' })

    const reprocesso = await ana.reprocessar(id, corrigido.triagem.versao)
    expect(reprocesso.analise).toBe(2)
    expect(reprocesso.alteradas).toContain('AQR-GCA-018')
    const depois = await aguardar(ana, id)
    expect(depois.analises.map((analise) => analise.numero)).toEqual([1, 2])
    expect((await ana.avaliacoes(id, 2)).itens.find((item) => item.regraId === 'AQR-GCA-018')?.resultado).toBe('sem-achado')
    // A análise 1 continua igual no histórico.
    expect((await ana.avaliacoes(id, 1)).itens.find((item) => item.regraId === 'AQR-GCA-018')?.resultado).toBe('achado')
    const camposDepois = await ana.campos(id, 2)
    expect(camposDepois.itens.find((campo) => campo.id === lote?.id)).toMatchObject({ valorBruto: 'F7', metodo: 'servidor' })

    // Revisão humana com justificativa: registrada ao lado do resultado, sem alterá-lo.
    const atual = await ana.detalhe(id)
    await ana.revisar(id, { versaoEsperada: atual.triagem.versao, decisao: 'encaminhado', regraId: 'AQR-GCA-009', justificativa: 'Data do título para conferência' })
    const regra009 = (await ana.avaliacoes(id)).itens.find((item) => item.regraId === 'AQR-GCA-009')
    expect(regra009?.resultado).toBe('achado')
    expect(regra009?.revisoes.map((revisao) => revisao.decisao)).toEqual(['encaminhado'])

    const final = await ana.detalhe(id)
    expect(final.revisoes.map((revisao) => revisao.decisao).sort()).toEqual(['corrigido', 'encaminhado'])
    expect(final.revisoes.find((revisao) => revisao.decisao === 'corrigido')?.correcao).toMatchObject({ anterior: 'C3', novo: 'F7' })
    expect(final.enquadramento.integridadeDoPacote.valor).not.toBe('completo')
  })

  it('com a triagem desligada, a interface recebe só o aviso de indisponível', async () => {
    const desligado = await buildTestApp({ env: { ADMIN_API_MODE: 'dev' } })
    await desligado.listen({ host: '127.0.0.1', port: 0 })
    try {
      const url = `http://127.0.0.1:${(desligado.server.address() as AddressInfo).port}`
      const service = createHttpTriagemService({ baseUrl: url, getActor: () => 'ana.analista' })
      expect(await service.status()).toEqual({ disponivel: false, modo: 'desativada' })
      // Desligada, as rotas de processos nem são registradas.
      expect((await erroDe(service.listar())).status).toBe(404)
    } finally {
      await desligado.close()
    }
  })
})
