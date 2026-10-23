import { isIP } from 'node:net'
import { z } from 'zod'
import { defaultComparisonLimits } from './comparison/limits.ts'

/**
 * Configuração do servidor, lida das variáveis de ambiente. Por padrão o servidor escuta só em
 * 127.0.0.1; no contêiner de hospedagem (`Dockerfile`), HOST=0.0.0.0. Nesta branch o servidor só
 * compara PDFs: não há login no servidor (o login da tela é fictício) nem banco.
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
})

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
  return {
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
