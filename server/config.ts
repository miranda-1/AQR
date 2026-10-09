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
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  COMPARISON_WORKERS: z.coerce.number().int().min(1).max(8).default(2),
  COMPARISON_QUEUE_LIMIT: z.coerce.number().int().min(0).max(100).default(8),
  COMPARISON_TIMEOUT_MS: z.coerce.number().int().min(1000).max(600_000).default(120_000),
  COMPARISON_RESULT_TTL_MS: z.coerce.number().int().min(10_000).max(86_400_000).default(30 * 60_000),
  COMPARISON_WORKER_MEMORY_MB: z.coerce.number().int().min(128).max(4096).default(768),
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
}

export interface ServerConfig {
  environment: 'development' | 'test' | 'production'
  host: string
  port: number
  logLevel: 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace' | 'silent'
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
    comparison: {
      workers: data.COMPARISON_WORKERS,
      queueLimit: data.COMPARISON_QUEUE_LIMIT,
      jobTimeoutMs: data.COMPARISON_TIMEOUT_MS,
      resultTtlMs: data.COMPARISON_RESULT_TTL_MS,
      workerMemoryMb: data.COMPARISON_WORKER_MEMORY_MB,
      maxFileSizeBytes: defaultComparisonLimits.maxFileSizeBytes,
    },
  }
}
