import type { FastifyInstance } from 'fastify'
import { buildApp } from '../app.ts'
import { loadConfig, type ComparisonSettings, type ServerConfig } from '../config.ts'
import type { IdentityProvider } from '../auth/identity-provider.ts'
import type { Database } from '../db/database.ts'
import type { Mailer } from '../auth/mailer.ts'
import { FakeMailer } from './fake-mailer.ts'

/** Servidor de teste (sem porta, sem log), com ajustes opcionais na configuração. */
export async function buildTestApp(
  overrides: { comparison?: Partial<ComparisonSettings>; env?: Record<string, string>; db?: Database; identityProvider?: IdentityProvider; mailer?: Mailer } = {},
): Promise<FastifyInstance> {
  // SMTP fictício: nos testes o e-mail vai sempre para uma caixa em memória, nunca para a rede.
  const base = loadConfig({ NODE_ENV: 'test', LOG_LEVEL: 'silent', DATABASE_PATH: ':memory:', SMTP_HOST: 'smtp.teste', SMTP_FROM: 'AQR <aqr@teste>', ...overrides.env })
  const config: ServerConfig = { ...base, comparison: { ...base.comparison, ...overrides.comparison } }
  return buildApp(config, {
    db: overrides.db,
    mailer: overrides.mailer ?? new FakeMailer(),
    ...(overrides.identityProvider ? { identityProvider: overrides.identityProvider } : {}),
  })
}

export interface UploadFile {
  field: string
  name: string
  bytes: Uint8Array
  type?: string
}

/** Monta um corpo multipart/form-data de verdade (como o navegador enviaria). */
export async function multipartBody(files: readonly UploadFile[]): Promise<{ payload: Buffer; headers: Record<string, string> }> {
  const form = new FormData()
  for (const file of files) {
    form.append(file.field, new Blob([file.bytes.slice()], { type: file.type ?? 'application/pdf' }), file.name)
  }
  const request = new Request('http://teste.local/', { method: 'POST', body: form })
  return {
    payload: Buffer.from(await request.arrayBuffer()),
    headers: { 'content-type': request.headers.get('content-type') ?? '' },
  }
}
