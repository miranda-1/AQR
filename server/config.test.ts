import { ConfigError, loadConfig } from './config.ts'

describe('loadConfig', () => {
  it('usa padrões conservadores: só a máquina local, porta 3000', () => {
    const config = loadConfig({})
    expect(config).toMatchObject({ environment: 'development', host: '127.0.0.1', port: 3000, logLevel: 'info' })
    expect(config.comparison).toEqual({
      workers: 2,
      queueLimit: 8,
      jobTimeoutMs: 120_000,
      resultTtlMs: 1_800_000,
      workerMemoryMb: 768,
      maxFileSizeBytes: 50 * 1024 * 1024,
    })
  })

  it('lê as variáveis de ambiente', () => {
    const config = loadConfig({
      NODE_ENV: 'production',
      HOST: '0.0.0.0',
      PORT: '8080',
      LOG_LEVEL: 'warn',
      COMPARISON_WORKERS: '4',
      COMPARISON_QUEUE_LIMIT: '0',
    })
    expect(config).toMatchObject({ environment: 'production', host: '0.0.0.0', port: 8080, logLevel: 'warn' })
    expect(config.comparison).toMatchObject({ workers: 4, queueLimit: 0 })
  })

  it('recusa valores inválidos com uma mensagem que diz o que corrigir', () => {
    expect(() => loadConfig({ PORT: 'abc' })).toThrow(ConfigError)
    expect(() => loadConfig({ PORT: '70000' })).toThrow(/PORT/)
    expect(() => loadConfig({ NODE_ENV: 'staging' })).toThrow(/Corrija as variáveis de ambiente/)
    expect(() => loadConfig({ COMPARISON_WORKERS: '0' })).toThrow(/COMPARISON_WORKERS/)
  })
})
