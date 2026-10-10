import { isIP } from 'node:net'
import { z } from 'zod'
import { defaultComparisonLimits } from './comparison/limits.ts'

/**
 * Configuração do servidor, lida das variáveis de ambiente. Por padrão o servidor escuta só em
 * 127.0.0.1: nesta etapa não há autenticação real, então ele não deve ficar exposto na rede.
 */
const environmentSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  HOST: z.string().min(1).default('127.0.0.1'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  /**
   * Proxies reversos confiáveis (IPs ou faixas CIDR, separados por vírgula), para o IP real de quem
   * acessa vir de `X-Forwarded-For`. Vazio: nenhum (o IP registrado é o da conexão).
   */
  TRUST_PROXY: z.string().default(''),
  /** Inícios de login e retornos do Keycloak aceitos por IP, a cada minuto. */
  AUTH_LOGIN_ATTEMPTS_PER_MINUTE: z.coerce.number().int().min(1).max(100_000).default(30),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  COMPARISON_WORKERS: z.coerce.number().int().min(1).max(8).default(2),
  COMPARISON_QUEUE_LIMIT: z.coerce.number().int().min(0).max(100).default(8),
  COMPARISON_TIMEOUT_MS: z.coerce.number().int().min(1000).max(600_000).default(120_000),
  COMPARISON_RESULT_TTL_MS: z.coerce.number().int().min(10_000).max(3_600_000).default(5 * 60_000),
  COMPARISON_WORKER_MEMORY_MB: z.coerce.number().int().min(128).max(4096).default(768),
  /** Comparação visual das páginas (imagens, desenhos, formatação). */
  COMPARISON_VISUAL: z.enum(['on', 'off']).default('on'),
  /** OCR local (Tesseract) das páginas sem texto extraível. */
  COMPARISON_OCR: z.enum(['on', 'off']).default('on'),
  COMPARISON_OCR_MAX_PAGES: z.coerce.number().int().min(0).max(1000).default(30),
  /** Pasta com `por.traineddata.gz`; vazio = o modelo do pacote `@tesseract.js-data/por`. */
  COMPARISON_OCR_LANG_PATH: z.string().default(''),
  DATABASE_PATH: z.string().min(1).default('data/aqr.sqlite'),
  ADMIN_API_MODE: z.enum(['disabled', 'dev']).default('disabled'),
  /** "keycloak": login real; exige as variáveis KEYCLOAK_* e APP_BASE_URL e liga a administração. */
  AUTH_MODE: z.enum(['visual', 'keycloak']).default('visual'),
  KEYCLOAK_ISSUER: z.url().optional(),
  KEYCLOAK_CLIENT_ID: z.string().min(1).optional(),
  KEYCLOAK_CLIENT_SECRET: z.string().min(1).optional(),
  APP_BASE_URL: z.url().optional(),
  /** Credencial de serviço do AQR no Keycloak (cria usuários e envia convites); nunca vai ao navegador. */
  KEYCLOAK_ADMIN_CLIENT_ID: z.string().min(1).optional(),
  KEYCLOAK_ADMIN_CLIENT_SECRET: z.string().min(1).optional(),
})

/** Segredos que existem nos arquivos de desenvolvimento do repositório; nunca valem em produção. */
const DEV_ONLY_SECRETS = new Set(['aqr-admin-dev-secret', 'aqr-web-dev-secret'])

const LOOPBACK_HOSTS = new Set(['127.0.0.1', '::1', 'localhost'])

export interface ComparisonSettings {
  /** Comparações processadas ao mesmo tempo (uma thread isolada cada). */
  workers: number
  /** Comparações esperando vaga; acima disto a API responde 503. */
  queueLimit: number
  /** Tempo máximo de uma comparação, da entrada na thread ao resultado. */
  jobTimeoutMs: number
  /** Por quanto tempo o resultado fica disponível depois de pronto. */
  resultTtlMs: number
  /** Memória máxima de cada thread de comparação. */
  workerMemoryMb: number
  /** Tamanho máximo de cada PDF recebido. */
  maxFileSizeBytes: number
  /** Comparação visual ligada. */
  visual: boolean
  /** OCR ligado. */
  ocr: boolean
  /** Páginas com OCR por documento. */
  ocrMaxPages: number
  /** Pasta do modelo de português do OCR (vazio = o do pacote instalado). */
  ocrLanguagePath: string
}

export interface ServerConfig {
  environment: 'development' | 'test' | 'production'
  host: string
  port: number
  logLevel: 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace' | 'silent'
  /** Proxies reversos confiáveis; vazio = nenhum. */
  trustProxy: string[]
  comparison: ComparisonSettings
  /** Arquivo do banco SQLite (contas e auditoria). `:memory:` nos testes. */
  databasePath: string
  /**
   * Administração de contas. "disabled" (padrão): desligada. "dev": ligada sem autenticação real,
   * identificando a pessoa por `X-AQR-Dev-Actor`; só fora de produção e só na máquina local.
   */
  adminMode: 'disabled' | 'dev'
  /** Login real com Keycloak; `null` no login visual (desenvolvimento). */
  keycloak: {
    issuer: string
    clientId: string
    clientSecret: string
    appBaseUrl: string
    adminClientId: string
    adminClientSecret: string
    /** Inícios de login e retornos do Keycloak aceitos por IP, a cada minuto. */
    loginAttemptsPerMinute: number
  } | null
}

export class ConfigError extends Error {
  override name = 'ConfigError'
}

/** Lê e valida a configuração. Variável inválida interrompe a inicialização com uma mensagem clara. */
export function loadConfig(env: Record<string, string | undefined>): ServerConfig {
  const parsed = environmentSchema.safeParse(env)
  if (!parsed.success) {
    const problems = parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; ')
    throw new ConfigError(`Configuração do servidor inválida (${problems}). Corrija as variáveis de ambiente e inicie de novo.`)
  }
  const data = parsed.data
  // Falha fechado: o login visual aceita qualquer usuário e senha, então nunca pode rodar em produção.
  if (data.NODE_ENV === 'production' && data.AUTH_MODE !== 'keycloak') {
    throw new ConfigError(
      'AUTH_MODE=visual não é permitido em produção: o login fictício aceita qualquer usuário e senha. Defina AUTH_MODE=keycloak (e as variáveis KEYCLOAK_*) ou não inicie em produção.',
    )
  }
  if (data.ADMIN_API_MODE === 'dev' && data.NODE_ENV === 'production') {
    throw new ConfigError(
      'ADMIN_API_MODE=dev não é permitido em produção: esse modo não tem autenticação real. Use ADMIN_API_MODE=disabled até a autenticação real existir.',
    )
  }
  if (data.ADMIN_API_MODE === 'dev' && !LOOPBACK_HOSTS.has(data.HOST)) {
    throw new ConfigError(
      `ADMIN_API_MODE=dev só funciona com HOST=127.0.0.1 (agora: ${data.HOST}). Sem autenticação real, a administração não pode ficar exposta na rede.`,
    )
  }
  let keycloak: ServerConfig['keycloak'] = null
  if (data.AUTH_MODE === 'keycloak') {
    if (!data.KEYCLOAK_ISSUER || !data.KEYCLOAK_CLIENT_ID || !data.KEYCLOAK_CLIENT_SECRET || !data.APP_BASE_URL) {
      throw new ConfigError(
        'AUTH_MODE=keycloak exige KEYCLOAK_ISSUER, KEYCLOAK_CLIENT_ID, KEYCLOAK_CLIENT_SECRET (cliente confidencial do AQR, que confere as senhas) e APP_BASE_URL. Defina as quatro e inicie de novo.',
      )
    }
    if (!data.KEYCLOAK_ADMIN_CLIENT_ID || !data.KEYCLOAK_ADMIN_CLIENT_SECRET) {
      throw new ConfigError('AUTH_MODE=keycloak exige KEYCLOAK_ADMIN_CLIENT_ID e KEYCLOAK_ADMIN_CLIENT_SECRET (credencial de serviço para criar usuários e enviar convites).')
    }
    if (data.ADMIN_API_MODE === 'dev') {
      throw new ConfigError('ADMIN_API_MODE=dev não pode ser usado com AUTH_MODE=keycloak: o login real já liga a administração.')
    }
    for (const [name, value] of [['KEYCLOAK_ISSUER', data.KEYCLOAK_ISSUER], ['APP_BASE_URL', data.APP_BASE_URL]] as const) {
      const url = new URL(value)
      if (url.protocol !== 'https:' && !LOOPBACK_HOSTS.has(url.hostname)) {
        throw new ConfigError(`${name} precisa usar HTTPS (HTTP só é aceito em localhost).`)
      }
    }
    if (data.NODE_ENV === 'production') {
      // Nada de configuração local de desenvolvimento em produção.
      for (const [name, value] of [['KEYCLOAK_ISSUER', data.KEYCLOAK_ISSUER], ['APP_BASE_URL', data.APP_BASE_URL]] as const) {
        if (LOOPBACK_HOSTS.has(new URL(value).hostname)) {
          throw new ConfigError(`${name} aponta para localhost, que é só de desenvolvimento. Use o endereço HTTPS de produção.`)
        }
      }
      if (DEV_ONLY_SECRETS.has(data.KEYCLOAK_CLIENT_SECRET) || data.KEYCLOAK_CLIENT_SECRET.length < 24) {
        throw new ConfigError('KEYCLOAK_CLIENT_SECRET é um segredo de desenvolvimento ou curto demais (mínimo de 24 caracteres). Gere um segredo novo no Keycloak de produção.')
      }
      if (DEV_ONLY_SECRETS.has(data.KEYCLOAK_ADMIN_CLIENT_SECRET) || data.KEYCLOAK_ADMIN_CLIENT_SECRET.length < 24) {
        throw new ConfigError('KEYCLOAK_ADMIN_CLIENT_SECRET é um segredo de desenvolvimento ou curto demais (mínimo de 24 caracteres). Gere um segredo novo no Keycloak de produção.')
      }
    }
    keycloak = {
      issuer: data.KEYCLOAK_ISSUER.replace(/\/$/, ''),
      clientId: data.KEYCLOAK_CLIENT_ID,
      clientSecret: data.KEYCLOAK_CLIENT_SECRET,
      appBaseUrl: data.APP_BASE_URL,
      adminClientId: data.KEYCLOAK_ADMIN_CLIENT_ID,
      adminClientSecret: data.KEYCLOAK_ADMIN_CLIENT_SECRET,
      loginAttemptsPerMinute: data.AUTH_LOGIN_ATTEMPTS_PER_MINUTE,
    }
  }
  return {
    keycloak,
    environment: data.NODE_ENV,
    host: data.HOST,
    port: data.PORT,
    logLevel: data.LOG_LEVEL,
    trustProxy: parseTrustProxy(data.TRUST_PROXY),
    comparison: {
      workers: data.COMPARISON_WORKERS,
      queueLimit: data.COMPARISON_QUEUE_LIMIT,
      jobTimeoutMs: data.COMPARISON_TIMEOUT_MS,
      resultTtlMs: data.COMPARISON_RESULT_TTL_MS,
      workerMemoryMb: data.COMPARISON_WORKER_MEMORY_MB,
      maxFileSizeBytes: defaultComparisonLimits.maxFileSizeBytes,
      visual: data.COMPARISON_VISUAL === 'on',
      ocr: data.COMPARISON_OCR === 'on',
      ocrMaxPages: data.COMPARISON_OCR_MAX_PAGES,
      ocrLanguagePath: data.COMPARISON_OCR_LANG_PATH,
    },
    databasePath: data.DATABASE_PATH,
    adminMode: data.ADMIN_API_MODE,
  }
}

/** Lista de proxies confiáveis: só IPs ou faixas CIDR explícitos, nunca "todos". */
function parseTrustProxy(value: string): string[] {
  const entries = value.split(',').map((item) => item.trim()).filter(Boolean)
  for (const entry of entries) {
    const [address = '', bits, extra] = entry.split('/')
    const version = isIP(address)
    const maxBits = version === 6 ? 128 : 32
    const validBits = bits === undefined || (/^\d{1,3}$/u.test(bits) && Number(bits) <= maxBits)
    if (version === 0 || !validBits || extra !== undefined) {
      throw new ConfigError(`TRUST_PROXY: "${entry}" não é um IP nem uma faixa CIDR. Informe só os endereços do proxy reverso.`)
    }
  }
  return entries
}
