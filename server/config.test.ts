import { ConfigError, loadConfig } from './config.ts'

describe('loadConfig', () => {
  it('usa padrões conservadores: só a máquina local, porta 3000', () => {
    const config = loadConfig({})
    expect(config).toMatchObject({
      environment: 'development',
      host: '127.0.0.1',
      port: 3000,
      logLevel: 'info',
    })
    expect(config.comparison).toEqual({
      workers: 2,
      queueLimit: 8,
      jobTimeoutMs: 120_000,
      resultTtlMs: 300_000,
      workerMemoryMb: 768,
      maxFileSizeBytes: 50 * 1024 * 1024,
      visual: true,
      ocr: true,
      ocrMaxPages: 30,
      ocrLanguagePath: '',
    })
  })

  it('liga e desliga a comparação visual e o OCR', () => {
    const config = loadConfig({ COMPARISON_VISUAL: 'off', COMPARISON_OCR: 'off', COMPARISON_OCR_MAX_PAGES: '5' })
    expect(config.comparison).toMatchObject({ visual: false, ocr: false, ocrMaxPages: 5 })
    expect(() => loadConfig({ COMPARISON_OCR: 'sim' })).toThrow(ConfigError)
  })

  it('confia só nos proxies informados, nunca em "todos"', () => {
    expect(loadConfig({}).trustProxy).toEqual([])
    expect(loadConfig({ TRUST_PROXY: '10.0.0.5, 10.1.0.0/16,fd00::/8' }).trustProxy).toEqual(['10.0.0.5', '10.1.0.0/16', 'fd00::/8'])
    for (const bad of ['true', '*', '10.0.0.0/33', 'proxy.local', '10.0.0.1/8/1']) {
      expect(() => loadConfig({ TRUST_PROXY: bad }), bad).toThrow(ConfigError)
    }
  })

  it('lê as variáveis de ambiente', () => {
    const config = loadConfig({
      NODE_ENV: 'development',
      HOST: '0.0.0.0',
      PORT: '8080',
      LOG_LEVEL: 'warn',
      COMPARISON_WORKERS: '4',
      COMPARISON_QUEUE_LIMIT: '0',
    })
    expect(config).toMatchObject({ environment: 'development', host: '0.0.0.0', port: 8080, logLevel: 'warn' })
    expect(config.comparison).toMatchObject({ workers: 4, queueLimit: 0 })
  })

  it('roda em produção sem login no servidor (o login da tela é fictício)', () => {
    expect(loadConfig({ NODE_ENV: 'production', HOST: '0.0.0.0' })).toMatchObject({ environment: 'production', host: '0.0.0.0' })
  })

  it('recusa valores inválidos com uma mensagem que diz o que corrigir', () => {
    expect(() => loadConfig({ PORT: 'abc' })).toThrow(ConfigError)
    expect(() => loadConfig({ PORT: '70000' })).toThrow(/PORT/)
    expect(() => loadConfig({ NODE_ENV: 'staging' })).toThrow(/Corrija as variáveis de ambiente/)
    expect(() => loadConfig({ COMPARISON_WORKERS: '0' })).toThrow(/COMPARISON_WORKERS/)
  })
})
