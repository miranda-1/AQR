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

  it('deixa a administração desligada por padrão', () => {
    expect(loadConfig({}).adminMode).toBe('disabled')
    expect(loadConfig({ ADMIN_API_MODE: 'dev' }).adminMode).toBe('dev')
  })

  it('recusa iniciar com a administração de desenvolvimento em produção ou exposta na rede', () => {
    expect(() => loadConfig({ NODE_ENV: 'production', ADMIN_API_MODE: 'dev', AUTH_MODE: 'keycloak' })).toThrow(ConfigError)
    expect(() => loadConfig({ ADMIN_API_MODE: 'dev', HOST: '0.0.0.0' })).toThrow(/só funciona com HOST=127.0.0.1/)
    expect(() => loadConfig({ ADMIN_API_MODE: 'producao' })).toThrow(ConfigError)
  })

  it('falha fechado: produção recusa o login visual (que aceita qualquer senha), com ou sem AUTH_MODE', () => {
    expect(() => loadConfig({ NODE_ENV: 'production' })).toThrow(/AUTH_MODE=visual não é permitido em produção/)
    expect(() => loadConfig({ NODE_ENV: 'production', AUTH_MODE: 'visual' })).toThrow(/AUTH_MODE=visual não é permitido em produção/)
    expect(loadConfig({ NODE_ENV: 'development' }).keycloak).toBeNull()
  })

  it('produção recusa configuração de desenvolvimento: localhost e segredos de teste', () => {
    const prod = {
      NODE_ENV: 'production', AUTH_MODE: 'keycloak', KEYCLOAK_ISSUER: 'https://login.exemplo.gov.br/realms/aqr',
      KEYCLOAK_CLIENT_ID: 'aqr-web', APP_BASE_URL: 'https://aqr.exemplo.gov.br',
      KEYCLOAK_ADMIN_CLIENT_ID: 'aqr-admin', KEYCLOAK_ADMIN_CLIENT_SECRET: 'x7Kq-segredo-gerado-no-keycloak-42',
      KEYCLOAK_CLIENT_SECRET: 'P9w-outro-segredo-do-cliente-web-77',
      SMTP_HOST: 'smtp.exemplo.gov.br', SMTP_FROM: 'AQR <nao-responda@exemplo.gov.br>',
    }
    expect(loadConfig(prod).keycloak?.adminClientId).toBe('aqr-admin')
    expect(() => loadConfig({ ...prod, SMTP_SECURITY: 'nenhuma' })).toThrow(/SMTP_SECURITY=nenhuma não é permitido em produção/)
    expect(() => loadConfig({ ...prod, KEYCLOAK_CLIENT_SECRET: 'aqr-web-dev-secret' })).toThrow(/KEYCLOAK_CLIENT_SECRET é um segredo de desenvolvimento/)
    expect(() => loadConfig({ ...prod, KEYCLOAK_CLIENT_SECRET: 'curto' })).toThrow(/KEYCLOAK_CLIENT_SECRET .*curto demais/)
    expect(() => loadConfig({ ...prod, KEYCLOAK_ADMIN_CLIENT_SECRET: 'aqr-admin-dev-secret' })).toThrow(/segredo de desenvolvimento/)
    expect(() => loadConfig({ ...prod, KEYCLOAK_ADMIN_CLIENT_SECRET: 'curto' })).toThrow(/curto demais/)
    expect(() => loadConfig({ ...prod, KEYCLOAK_ISSUER: 'http://localhost:8080/realms/aqr' })).toThrow(/localhost/)
    expect(() => loadConfig({ ...prod, APP_BASE_URL: 'http://localhost:5173' })).toThrow(/localhost/)
  })

  it('valida a configuração do login real com Keycloak', () => {
    const ok = {
      AUTH_MODE: 'keycloak', KEYCLOAK_ISSUER: 'https://login.exemplo.gov.br/realms/aqr/',
      KEYCLOAK_CLIENT_ID: 'aqr-web', APP_BASE_URL: 'https://aqr.exemplo.gov.br',
      KEYCLOAK_ADMIN_CLIENT_ID: 'aqr-admin', KEYCLOAK_ADMIN_CLIENT_SECRET: 'x7Kq-segredo-gerado-no-keycloak-42',
      KEYCLOAK_CLIENT_SECRET: 'P9w-outro-segredo-do-cliente-web-77',
      SMTP_HOST: 'smtp.exemplo.gov.br', SMTP_FROM: 'AQR <nao-responda@exemplo.gov.br>',
    }
    expect(() => loadConfig({ ...ok, KEYCLOAK_CLIENT_SECRET: undefined })).toThrow(/KEYCLOAK_CLIENT_SECRET \(cliente confidencial/)
    expect(loadConfig({ NODE_ENV: 'production', ...ok }).keycloak).toMatchObject({ issuer: 'https://login.exemplo.gov.br/realms/aqr', clientId: 'aqr-web' })
    expect(loadConfig({}).keycloak).toBeNull()
    expect(() => loadConfig({ AUTH_MODE: 'keycloak' })).toThrow(/exige KEYCLOAK_ISSUER/)
    expect(() => loadConfig({ ...ok, KEYCLOAK_ADMIN_CLIENT_SECRET: undefined })).toThrow(/KEYCLOAK_ADMIN_CLIENT_ID e KEYCLOAK_ADMIN_CLIENT_SECRET/)
    expect(() => loadConfig({ ...ok, KEYCLOAK_ISSUER: 'http://login.exemplo.gov.br/realms/aqr' })).toThrow(/HTTPS/)
    expect(() => loadConfig({ ...ok, APP_BASE_URL: 'http://aqr.exemplo.gov.br' })).toThrow(/HTTPS/)
    expect(() => loadConfig({ ...ok, ADMIN_API_MODE: 'dev' })).toThrow(/não pode ser usado com AUTH_MODE=keycloak/)
    // Os e-mails de senha saem pelo AQR: sem SMTP, o login real não inicia.
    expect(() => loadConfig({ ...ok, SMTP_HOST: undefined })).toThrow(/exige SMTP_HOST e SMTP_FROM/)
    expect(() => loadConfig({ ...ok, SMTP_USER: 'aqr' })).toThrow(/SMTP_USER foi definido sem SMTP_PASSWORD/)
    expect(loadConfig({ ...ok, SMTP_PORT: '465', SMTP_SECURITY: 'tls' }).keycloak?.smtp).toMatchObject({ host: 'smtp.exemplo.gov.br', port: 465, seguranca: 'tls', usuario: null })
    expect(loadConfig({ ...ok, KEYCLOAK_ISSUER: 'http://localhost:8080/realms/aqr', APP_BASE_URL: 'http://localhost:5173' }).keycloak?.appBaseUrl).toBe('http://localhost:5173')
  })

  it('recusa valores inválidos com uma mensagem que diz o que corrigir', () => {
    expect(() => loadConfig({ PORT: 'abc' })).toThrow(ConfigError)
    expect(() => loadConfig({ PORT: '70000' })).toThrow(/PORT/)
    expect(() => loadConfig({ NODE_ENV: 'staging' })).toThrow(/Corrija as variáveis de ambiente/)
    expect(() => loadConfig({ COMPARISON_WORKERS: '0' })).toThrow(/COMPARISON_WORKERS/)
  })

  it('triagem: desligada por padrão, recusada em produção e chave do conteúdo validada', () => {
    const padrao = loadConfig({})
    expect([padrao.triagem.modo, padrao.triagem.conteudoChave, padrao.triagem.retencaoHoras]).toEqual(['desativada', null, 72])
    expect(loadConfig({ TRIAGEM_MODO: 'experimental-sintetico', TRIAGEM_CONTEUDO_CHAVE: '' }).triagem.conteudoChave).toBeNull()
    const chave = Buffer.alloc(32, 5).toString('base64')
    expect(loadConfig({ TRIAGEM_CONTEUDO_CHAVE: chave }).triagem.conteudoChave?.length).toBe(32)
    expect(() => loadConfig({ TRIAGEM_CONTEUDO_CHAVE: Buffer.alloc(16).toString('base64') })).toThrow(/32 bytes/)
    expect(() => loadConfig({ TRIAGEM_CONTEUDO_CHAVE: 'não é base64' })).toThrow(/32 bytes/)
    expect(() => loadConfig({ NODE_ENV: 'production', AUTH_MODE: 'keycloak', TRIAGEM_MODO: 'experimental-sintetico' })).toThrow(/TRIAGEM_MODO=experimental-sintetico não é permitido em produção/)
  })
})
