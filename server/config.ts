import { z } from 'zod'

/**
 * Configuração do servidor, lida das variáveis de ambiente. Por padrão o servidor escuta só em
 * 127.0.0.1: nesta etapa não há autenticação real, então ele não deve ficar exposto na rede.
 */
const environmentSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  HOST: z.string().min(1).default('127.0.0.1'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
})

export interface ServerConfig {
  environment: 'development' | 'test' | 'production'
  host: string
  port: number
  logLevel: 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace' | 'silent'
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
  const { NODE_ENV, HOST, PORT, LOG_LEVEL } = parsed.data
  return { environment: NODE_ENV, host: HOST, port: PORT, logLevel: LOG_LEVEL }
}
