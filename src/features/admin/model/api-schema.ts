import * as z from 'zod/mini'
import { accessEventTypes } from '../../../../shared/contracts/admin'
import type { AccessEventPage, Account, AccountPage, AdminStatus, AuditPage, ComparisonUsage } from './types'

/** Validação das respostas da API de contas: fora do contrato vira erro, não quebra a interface. */

const role = z.enum(['administrador', 'analista'])
const text = z.string()
const nullableText = z.nullable(z.string())

const account = z.object({
  id: text,
  usuario: text,
  nome: text,
  email: nullableText,
  papel: role,
  situacao: z.enum(['ativa', 'inativa']),
  criadaEm: text,
  atualizadaEm: text,
  desativadaEm: nullableText,
  versao: z.number(),
  aviso: z.optional(text),
})

const snapshot = z.object({
  usuario: z.optional(text),
  nome: z.optional(text),
  email: z.optional(nullableText),
  papel: z.optional(role),
  situacao: z.optional(z.enum(['ativa', 'inativa'])),
})

const auditEvent = z.object({
  id: text,
  ocorridoEm: text,
  ator: z.object({ id: nullableText, rotulo: text, origem: z.enum(['dev', 'real', 'sistema']) }),
  acao: z.enum(['conta.criada', 'conta.editada', 'conta.papel_alterado', 'conta.desativada', 'conta.reativada']),
  alvo: z.object({ tipo: z.literal('conta'), id: text, rotulo: text }),
  detalhes: z.object({ antes: z.optional(snapshot), depois: z.optional(snapshot), motivo: z.optional(text) }),
})

const pageOf = <T extends z.ZodMiniType>(item: T) =>
  z.object({ items: z.array(item), total: z.number(), page: z.number(), pageSize: z.number() })

const accessEvent = z.object({
  id: text,
  ocorridoEm: text,
  evento: z.enum(accessEventTypes),
  usuario: nullableText,
  contaId: nullableText,
  ator: z.nullable(z.object({ id: text, usuario: nullableText })),
  ip: nullableText,
  detalhe: nullableText,
})

const comparisonUsage = z.object({
  contaId: nullableText,
  usuario: nullableText,
  nome: nullableText,
  total: z.number(),
  ultimos30Dias: z.number(),
  concluidas: z.number(),
  falhas: z.number(),
  ultimaEm: text,
})

const status = z.object({ available: z.boolean(), mode: z.enum(['disabled', 'dev', 'real']) })
export const apiErrorSchema = z.object({
  error: z.object({ code: text, message: text, fields: z.optional(z.record(z.string(), z.string())) }),
})

export function parseAccount(value: unknown): Account | undefined {
  const parsed = account.safeParse(value)
  return parsed.success ? parsed.data : undefined
}

export function parseAccountPage(value: unknown): AccountPage | undefined {
  const parsed = pageOf(account).safeParse(value)
  return parsed.success ? parsed.data : undefined
}

export function parseAuditPage(value: unknown): AuditPage | undefined {
  const parsed = pageOf(auditEvent).safeParse(value)
  return parsed.success ? parsed.data : undefined
}

export function parseAdminStatus(value: unknown): AdminStatus | undefined {
  const parsed = status.safeParse(value)
  return parsed.success ? parsed.data : undefined
}

export function parseAccessEventPage(value: unknown): AccessEventPage | undefined {
  const parsed = pageOf(accessEvent).safeParse(value)
  return parsed.success ? parsed.data : undefined
}

export function parseComparisonUsage(value: unknown): ComparisonUsage[] | undefined {
  const parsed = z.object({ items: z.array(comparisonUsage) }).safeParse(value)
  return parsed.success ? parsed.data.items : undefined
}
