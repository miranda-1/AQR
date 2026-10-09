import { ConfigError, loadConfig } from './config.ts'

describe('loadConfig', () => {
  it('usa padrões conservadores: só a máquina local, porta 3000', () => {
    expect(loadConfig({})).toEqual({ environment: 'development', host: '127.0.0.1', port: 3000, logLevel: 'info' })
  })

  it('lê as variáveis de ambiente', () => {
    expect(loadConfig({ NODE_ENV: 'production', HOST: '0.0.0.0', PORT: '8080', LOG_LEVEL: 'warn' })).toEqual({
      environment: 'production',
      host: '0.0.0.0',
      port: 8080,
      logLevel: 'warn',
    })
  })

  it('recusa valores inválidos com uma mensagem que diz o que corrigir', () => {
    expect(() => loadConfig({ PORT: 'abc' })).toThrow(ConfigError)
    expect(() => loadConfig({ PORT: '70000' })).toThrow(/PORT/)
    expect(() => loadConfig({ NODE_ENV: 'staging' })).toThrow(/Corrija as variáveis de ambiente/)
  })
})
