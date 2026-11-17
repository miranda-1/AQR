import { createServer, type IncomingMessage, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { criarClienteOllama, enderecoLocal, ErroOllama } from './ollama.ts'

describe('cliente do modelo local: só loopback', () => {
  it.each(['http://localhost:11434', 'http://10.0.0.1:11434', 'https://127.0.0.1:11434', 'http://user:senha@127.0.0.1:11434', 'http://127.0.0.2:11434', 'http://[::1]:11434', 'qualquer coisa'])('recusa %s antes de conectar', (endereco) => {
    expect(() => enderecoLocal(endereco)).toThrow(ErroOllama)
  })

  it('aceita http://127.0.0.1', () => {
    expect(enderecoLocal('http://127.0.0.1:11434/')).toBe('http://127.0.0.1:11434')
  })
})

describe('cliente do modelo local: pedido e erros', () => {
  let servidor: Server
  let corpo: Record<string, unknown> = {}
  let resposta: { status: number; texto: string } = { status: 200, texto: '{}' }
  let endereco = ''

  beforeAll(async () => {
    servidor = createServer((req: IncomingMessage, res) => {
      let dados = ''
      req.on('data', (parte: Buffer) => (dados += parte.toString()))
      req.on('end', () => {
        corpo = dados ? (JSON.parse(dados) as Record<string, unknown>) : {}
        res.writeHead(resposta.status, { 'Content-Type': 'application/json' }).end(resposta.texto)
      })
    })
    await new Promise<void>((resolve) => servidor.listen(0, '127.0.0.1', resolve))
    endereco = `http://127.0.0.1:${(servidor.address() as AddressInfo).port}`
  })
  afterAll(() => new Promise<void>((resolve) => servidor.close(() => resolve())))

  it('pede saída por esquema, temperatura 0, semente fixa, sem "thinking" e SEM ferramentas', async () => {
    resposta = { status: 200, texto: JSON.stringify({ message: { content: '{"ok":true}' }, total_duration: 2e9, eval_count: 5, prompt_eval_count: 9 }) }
    const cliente = criarClienteOllama({ endereco, modelo: 'm', timeoutMs: 5000 })
    const r = await cliente.conversar([{ role: 'user', content: 'x' }], { type: 'object' }, { semente: 7, maxTokens: 50 })
    expect(r).toMatchObject({ conteudo: '{"ok":true}', totalMs: 2000, tokensGerados: 5, tokensPrompt: 9 })
    expect(corpo).toMatchObject({ model: 'm', stream: false, think: false, format: { type: 'object' }, options: { temperature: 0, seed: 7, num_predict: 50 } })
    expect(corpo).not.toHaveProperty('tools')
  })

  it('erro HTTP não carrega o conteúdo da resposta', async () => {
    resposta = { status: 500, texto: 'TRECHO SIGILOSO DO DOCUMENTO' }
    const cliente = criarClienteOllama({ endereco, modelo: 'm', timeoutMs: 5000 })
    const erro = await cliente.conversar([{ role: 'user', content: 'x' }], {}, { semente: 1, maxTokens: 1 }).catch((e: unknown) => e)
    expect(erro).toBeInstanceOf(ErroOllama)
    expect(String((erro as Error).message)).not.toContain('SIGILOSO')
  })

  it('registra o modelo pelo digest do manifesto e a licença pela primeira linha', async () => {
    const cliente = criarClienteOllama({ endereco, modelo: 'qwen:4b', timeoutMs: 5000 })
    const respostas = [
      { version: '0.40.16' },
      { models: [{ name: 'qwen:4b', digest: 'a'.repeat(64) }] },
      { details: { family: 'qwen35', parameter_size: '4.2B', quantization_level: 'Q4_K_M', format: 'gguf' }, license: '\nApache License\nVersion 2.0', capabilities: ['completion', 'vision'] },
    ]
    const original = globalThis.fetch
    globalThis.fetch = (async () => new Response(JSON.stringify(respostas.shift()))) as typeof fetch
    try {
      const registro = await cliente.registrar()
      expect(registro).toMatchObject({ runtime: { versao: '0.40.16' }, manifestoSha256: 'a'.repeat(64), quantizacao: 'Q4_K_M', formato: 'gguf', capacidades: ['completion', 'vision'] })
      expect(registro.licenca).toMatch(/^Apache License \(sha256 [0-9a-f]{16}\)$/u)
    } finally {
      globalThis.fetch = original
    }
  })
})
