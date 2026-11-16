import { mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs'
import type { AddressInfo } from 'node:net'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { FastifyInstance } from 'fastify'
import { DEV_ACTOR_HEADER } from '../../shared/contracts/admin.ts'
import { openDatabase, type Database } from '../../server/db/database.ts'
import { migrate } from '../../server/db/migrate.ts'
import { seedAccount } from '../../server/test/accounts.ts'
import { buildTestApp } from '../../server/test/build-test-app.ts'
import { gerarPacote } from '../../server/triage/corpus/generate.ts'
import { PACOTES } from '../../server/triage/corpus/pacotes.ts'

/**
 * E10.3: auditoria de segurança da triagem pelo HTTP real. Autenticação em todas as rotas,
 * identificadores maliciosos, acesso cruzado a anexo de outro processo, limites do envio,
 * cabeçalhos do conteúdo e ausência de qualquer chamada de rede de saída no código da triagem.
 */

const RAIZ = fileURLToPath(new URL('../../', import.meta.url))
const CATALOGO_DIR = path.join(RAIZ, 'docs/triagem/catalogo/')

let db: Database
let pasta: string
let app: FastifyInstance
let base: string

beforeAll(async () => {
  db = openDatabase(':memory:')
  migrate(db)
  seedAccount(db, 'ana.analista', 'analista')
  seedAccount(db, 'dora.inativa', 'analista', 'inativa')
  pasta = mkdtempSync(path.join(tmpdir(), 'aqr-e10-seguranca-'))
  app = await buildTestApp({
    db,
    env: {
      ADMIN_API_MODE: 'dev',
      TRIAGEM_MODO: 'experimental-sintetico',
      TRIAGEM_OCR: 'off',
      TRIAGEM_WORKERS: '1',
      TRIAGEM_MAX_ANEXOS: '9',
      TRIAGEM_MAX_BYTES_PACOTE: String(64 * 1024),
      TRIAGEM_CATALOGO_DIR: CATALOGO_DIR,
      TRIAGEM_CONTEUDO_DIR: pasta,
      TRIAGEM_CONTEUDO_CHAVE: Buffer.alloc(32, 9).toString('base64'),
    },
  })
  await app.listen({ host: '127.0.0.1', port: 0 })
  base = `http://127.0.0.1:${(app.server.address() as AddressInfo).port}`
}, 60_000)

afterAll(async () => {
  await app.close()
  db.close()
  rmSync(pasta, { recursive: true, force: true })
})

const como = (usuario: string) => ({ [DEV_ACTOR_HEADER]: usuario })

async function enviar(pacote: string, usuario = 'ana.analista', limitar?: number): Promise<Response> {
  const definicao = PACOTES.find((item) => item.id === pacote)
  if (!definicao) throw new Error(pacote)
  const form = new FormData()
  form.append('metadados', JSON.stringify({ referencia: null, protocoladoEm: '2026-11-05T15:00:00.000Z', modalidade: 'D', etapa: 'abertura' }))
  const arquivos = (await gerarPacote(definicao)).arquivos
  for (const arquivo of limitar ? arquivos.slice(0, limitar) : arquivos) form.append('anexos', new Blob([arquivo.bytes.slice()]), arquivo.nome)
  return fetch(`${base}/api/triagens`, { method: 'POST', body: form, headers: { ...como(usuario), 'idempotency-key': `seg-${Math.random()}` } })
}

async function aguardar(id: string) {
  for (let tentativa = 0; tentativa < 300; tentativa += 1) {
    const detalhe = (await (await fetch(`${base}/api/triagens/${id}`, { headers: como('ana.analista') })).json()) as { triagem: { situacao: string } }
    if (detalhe.triagem.situacao !== 'processando') return
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
  throw new Error('não terminou')
}

describe('E10.3: segurança da triagem', () => {
  it('toda rota exige sessão (401) e conta ativa', async () => {
    const id = '00000000-0000-4000-8000-000000000000'
    const rotas: [string, string][] = [
      ['GET', '/api/triagens'],
      ['POST', '/api/triagens'],
      ['GET', `/api/triagens/${id}`],
      ['GET', `/api/triagens/${id}/anexos`],
      ['GET', `/api/triagens/${id}/avaliacoes`],
      ['GET', `/api/triagens/${id}/campos`],
      ['GET', `/api/triagens/${id}/anexos/${id}/conteudo`],
      ['POST', `/api/triagens/${id}/condicoes`],
      ['POST', `/api/triagens/${id}/revisoes`],
      ['POST', `/api/triagens/${id}/reprocessar`],
    ]
    for (const [method, rota] of rotas) {
      const semSessao = await fetch(`${base}${rota}`, { method, ...(method === 'POST' ? { body: '{}', headers: { 'content-type': 'application/json' } } : {}) })
      expect(semSessao.status, `${method} ${rota}`).toBe(401)
      const inativa = await fetch(`${base}${rota}`, { method, headers: { ...como('dora.inativa'), ...(method === 'POST' ? { 'content-type': 'application/json' } : {}) }, ...(method === 'POST' ? { body: '{}' } : {}) })
      expect([401, 403], `${method} ${rota} (conta inativa)`).toContain(inativa.status)
    }
    // O status responde a qualquer um, mas sem dizer quem é a pessoa.
    expect(await (await fetch(`${base}/api/triagem/status`)).json()).toMatchObject({ disponivel: true, pessoa: null })
  })

  it('identificadores maliciosos não chegam ao banco nem ao disco (400/404, nunca 500)', async () => {
    const ataques = ['..%2F..%2Fetc%2Fpasswd', "1'%20OR%20'1'%3D'1", 'x'.repeat(4000), '%00', 'ZmFrZQ']
    for (const ataque of ataques) {
      for (const rota of [`/api/triagens/${ataque}`, `/api/triagens/${ataque}/anexos/${ataque}/conteudo`, `/api/triagens/${ataque}/avaliacoes?analise=${ataque}`]) {
        const resposta = await fetch(`${base}${rota}`, { headers: como('ana.analista') })
        expect([400, 404, 414], rota.slice(0, 80)).toContain(resposta.status)
        const corpo = await resposta.text()
        expect(corpo).not.toMatch(/at \w+ \(|node_modules|SQLITE|\/Users\//u)
      }
    }
  })

  it('anexo de outro processo não é entregue pelo caminho de um processo próprio (IDOR)', { timeout: 120_000 }, async () => {
    const primeiro = ((await (await enviar('DSD-01', 'ana.analista', 2)).json()) as { triagem: { id: string } }).triagem.id
    const segundo = ((await (await enviar('DSD-16', 'ana.analista', 2)).json()) as { triagem: { id: string } }).triagem.id
    await aguardar(primeiro)
    await aguardar(segundo)
    const anexosSegundo = (await (await fetch(`${base}/api/triagens/${segundo}/anexos`, { headers: como('ana.analista') })).json()) as { itens: { id: string }[] }
    const alheio = anexosSegundo.itens[0]?.id ?? ''
    expect((await fetch(`${base}/api/triagens/${primeiro}/anexos/${alheio}/conteudo`, { headers: como('ana.analista') })).status).toBe(404)
    const proprio = await fetch(`${base}/api/triagens/${segundo}/anexos/${alheio}/conteudo`, { headers: como('ana.analista') })
    expect(proprio.status).toBe(200)
    expect(proprio.headers.get('cache-control')).toBe('no-store')
    expect(proprio.headers.get('x-content-type-options')).toBe('nosniff')
    expect(proprio.headers.get('content-type')).toBe('application/octet-stream')
    expect(proprio.headers.get('content-disposition')).toMatch(/^attachment;/u)
    expect(proprio.headers.get('access-control-allow-origin')).toBeNull()
    // Os dados do processo (JSON) também não ficam em cache.
    expect((await fetch(`${base}/api/triagens/${segundo}`, { headers: como('ana.analista') })).headers.get('cache-control')).toBe('no-store')
  })

  it('limites do envio valem no servidor, qualquer que seja o cliente', { timeout: 60_000 }, async () => {
    const grande = new FormData()
    grande.append('metadados', JSON.stringify({ referencia: null, protocoladoEm: '2026-11-05T15:00:00.000Z', modalidade: 'D', etapa: 'abertura' }))
    grande.append('anexos', new Blob([new Uint8Array(70 * 1024)]), 'grande.pdf')
    const demais = await fetch(`${base}/api/triagens`, { method: 'POST', body: grande, headers: { ...como('ana.analista'), 'idempotency-key': 'seg-grande' } })
    // Pacote acima de 64 KiB (limite configurado neste servidor): recusado.
    expect(demais.status).toBe(413)
    const form = new FormData()
    form.append('metadados', JSON.stringify({ referencia: null, protocoladoEm: '2026-11-05T15:00:00.000Z', modalidade: 'D', etapa: 'abertura' }))
    for (let indice = 0; indice < 10; indice += 1) form.append('anexos', new Blob(['%PDF-1.4 x']), `a${indice}.pdf`)
    const muitos = await fetch(`${base}/api/triagens`, { method: 'POST', body: form, headers: { ...como('ana.analista'), 'idempotency-key': 'seg-muitos' } })
    expect([400, 413]).toContain(muitos.status)
    expect(await muitos.json()).toMatchObject({ error: { code: expect.any(String) as unknown } })
  })

  it('nenhum código da triagem ou da leitura de documentos abre conexão de rede (sem IA externa)', () => {
    const arquivos = (dir: string): string[] =>
      readdirSync(dir).flatMap((nome) => {
        const caminho = path.join(dir, nome)
        if (statSync(caminho).isDirectory()) return arquivos(caminho)
        return /\.(ts|tsx)$/u.test(nome) && !/\.test\.tsx?$/u.test(nome) ? [caminho] : []
      })
    const proibido = /from 'node:(https?|net|tls|dgram|http2)'|require\('(https?|net)'\)|\bfetch\(|XMLHttpRequest|WebSocket|api\.openai|anthropic\.com|generativelanguage/u
    const servidor = [...arquivos(path.join(RAIZ, 'server/triage')), ...arquivos(path.join(RAIZ, 'server/documents'))].filter((arquivo) => proibido.test(readFileSync(arquivo, 'utf8')))
    expect(servidor.map((arquivo) => path.relative(RAIZ, arquivo))).toEqual([])
    // No navegador, o único pedido de rede da triagem é para a própria API (mesma origem).
    const tela = arquivos(path.join(RAIZ, 'src/features/triage')).filter((arquivo) => /https?:\/\/(?!127\.0\.0\.1|localhost)/u.test(readFileSync(arquivo, 'utf8').replace(/fundamentos|url: 'https:\/\/cdn\.campogrande/gu, '')))
    expect(tela.filter((arquivo) => !arquivo.includes('test-data')).map((arquivo) => path.relative(RAIZ, arquivo))).toEqual([])
  })
})
