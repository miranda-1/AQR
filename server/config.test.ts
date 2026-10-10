import { ConfigError, loadConfig } from './config.ts'

describe('loadConfig', () => {
  it('usa padrões conservadores: só a máquina local, porta 3000', () => {
    const config = loadConfig({})
    expect(config).toMatchObject({
      environment: 'development',
      host: '127.0.0.1',
      port: 3000,
      logLevel: 'info',
      databasePath: 'data/aqr.sqlite',
    })
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

  it('deixa a administração desligada por padrão', () => {
    expect(loadConfig({}).adminMode).toBe('disabled')
    expect(loadConfig({ ADMIN_API_MODE: 'dev' }).adminMode).toBe('dev')
  })

  it('recusa iniciar com a administração de desenvolvimento em produção ou exposta na rede', () => {
    expect(() => loadConfig({ NODE_ENV: 'production', ADMIN_API_MODE: 'dev' })).toThrow(/não é permitido em produção/)
    expect(() => loadConfig({ ADMIN_API_MODE: 'dev', HOST: '0.0.0.0' })).toThrow(/só funciona com HOST=127.0.0.1/)
    expect(() => loadConfig({ ADMIN_API_MODE: 'producao' })).toThrow(ConfigError)
    expect(loadConfig({ NODE_ENV: 'production' }).adminMode).toBe('disabled')
  })

  it('valida a configuração do login real com Keycloak', () => {
    const ok = {
      AUTH_MODE: 'keycloak', KEYCLOAK_ISSUER: 'https://login.exemplo.gov.br/realms/aqr/',
      KEYCLOAK_CLIENT_ID: 'aqr-web', APP_BASE_URL: 'https://aqr.exemplo.gov.br',
    }
    expect(loadConfig({ NODE_ENV: 'production', ...ok }).keycloak).toMatchObject({ issuer: 'https://login.exemplo.gov.br/realms/aqr', clientId: 'aqr-web' })
    expect(loadConfig({}).keycloak).toBeNull()
    expect(() => loadConfig({ AUTH_MODE: 'keycloak' })).toThrow(/exige KEYCLOAK_ISSUER/)
    expect(() => loadConfig({ ...ok, KEYCLOAK_ISSUER: 'http://login.exemplo.gov.br/realms/aqr' })).toThrow(/HTTPS/)
    expect(() => loadConfig({ ...ok, APP_BASE_URL: 'http://aqr.exemplo.gov.br' })).toThrow(/HTTPS/)
    expect(() => loadConfig({ ...ok, ADMIN_API_MODE: 'dev' })).toThrow(/não pode ser usado com AUTH_MODE=keycloak/)
    expect(loadConfig({ ...ok, KEYCLOAK_ISSUER: 'http://localhost:8080/realms/aqr', APP_BASE_URL: 'http://localhost:5173' }).keycloak?.appBaseUrl).toBe('http://localhost:5173')
  })

  it('recusa valores inválidos com uma mensagem que diz o que corrigir', () => {
    expect(() => loadConfig({ PORT: 'abc' })).toThrow(ConfigError)
    expect(() => loadConfig({ PORT: '70000' })).toThrow(/PORT/)
    expect(() => loadConfig({ NODE_ENV: 'staging' })).toThrow(/Corrija as variáveis de ambiente/)
    expect(() => loadConfig({ COMPARISON_WORKERS: '0' })).toThrow(/COMPARISON_WORKERS/)
  })
})
