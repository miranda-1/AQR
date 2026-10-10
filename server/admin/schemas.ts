import type { FastifyRequest } from 'fastify'
import {
  accountStatuses,
  type AccountQuery,
  type AuditAction,
  type AuditQuery,
  type CreateAccountInput,
  type StatusChangeInput,
  type UpdateAccountInput,
} from '../../shared/contracts/admin.ts'
import { isAccountRole } from '../../shared/validation/account.ts'
import { ApiError } from '../http/errors.ts'

/** Leitura e conferência do que chega nas rotas administrativas. As regras dos campos ficam no serviço. */

const AUDIT_ACTIONS: readonly AuditAction[] = [
  'conta.criada',
  'conta.editada',
  'conta.papel_alterado',
  'conta.desativada',
  'conta.reativada',
]

function invalid(fields: Record<string, string>): ApiError {
  return new ApiError(400, 'VALIDATION_FAILED', 'Revise os campos informados.', { fields })
}

function record(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? Object.fromEntries(Object.entries(value)) : {}
}

function bodyObject(body: unknown): Record<string, unknown> {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    throw new ApiError(400, 'INVALID_JSON', 'Envie os dados em JSON.')
  }
  return record(body)
}

function text(value: unknown, field: string, required: boolean): string {
  if (value === undefined || value === null) {
    if (required) throw invalid({ [field]: 'Preencha este campo.' })
    return ''
  }
  if (typeof value !== 'string') throw invalid({ [field]: 'Valor inválido.' })
  return value
}

function role(value: unknown): CreateAccountInput['papel'] {
  const papel = text(value, 'papel', true)
  if (!isAccountRole(papel)) throw invalid({ papel: 'Escolha um papel: administrador ou analista.' })
  return papel
}

function version(value: unknown): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1) {
    throw invalid({ versao: 'Informe a versão da conta que você está vendo.' })
  }
  return value
}

function numberParam(value: unknown, field: string): number | undefined {
  if (value === undefined || value === '') return undefined
  if (typeof value !== 'string' || !/^\d{1,6}$/u.test(value)) throw invalid({ [field]: 'Use um número inteiro positivo.' })
  return Number(value)
}

export function createInput(body: unknown): CreateAccountInput {
  const data = bodyObject(body)
  return {
    usuario: text(data.usuario, 'usuario', true),
    nome: text(data.nome, 'nome', true),
    email: text(data.email, 'email', false) || null,
    papel: role(data.papel),
  }
}

export function updateInput(body: unknown): UpdateAccountInput {
  const data = bodyObject(body)
  return {
    nome: text(data.nome, 'nome', true),
    email: text(data.email, 'email', false) || null,
    papel: role(data.papel),
    versao: version(data.versao),
  }
}

export function statusChangeInput(body: unknown): StatusChangeInput {
  const data = bodyObject(body)
  const motivo = text(data.motivo, 'motivo', false)
  return { versao: version(data.versao), ...(motivo ? { motivo } : {}) }
}

export function accountQuery(request: FastifyRequest): AccountQuery {
  const params = record(request.query)
  const q = typeof params.q === 'string' ? params.q : ''
  if (q.length > 100) throw invalid({ q: 'Use no máximo 100 caracteres na busca.' })
  const papel = params.papel
  if (papel !== undefined && papel !== '' && (typeof papel !== 'string' || !isAccountRole(papel))) {
    throw invalid({ papel: 'Papel desconhecido.' })
  }
  const situacao = accountStatuses.find((item) => item === params.situacao)
  if (params.situacao !== undefined && params.situacao !== '' && !situacao) throw invalid({ situacao: 'Situação desconhecida.' })
  const page = numberParam(params.page, 'page')
  const pageSize = numberParam(params.pageSize, 'pageSize')
  return {
    q,
    ...(typeof papel === 'string' && isAccountRole(papel) ? { papel } : {}),
    ...(situacao ? { situacao } : {}),
    ...(page ? { page } : {}),
    ...(pageSize ? { pageSize } : {}),
  }
}

export function auditQuery(request: FastifyRequest): AuditQuery {
  const params = record(request.query)
  const acao = AUDIT_ACTIONS.find((item) => item === params.acao)
  if (params.acao !== undefined && params.acao !== '' && !acao) throw invalid({ acao: 'Ação desconhecida.' })
  const page = numberParam(params.page, 'page')
  const pageSize = numberParam(params.pageSize, 'pageSize')
  return {
    ...(typeof params.contaId === 'string' && params.contaId ? { contaId: params.contaId } : {}),
    ...(acao ? { acao } : {}),
    ...(page ? { page } : {}),
    ...(pageSize ? { pageSize } : {}),
  }
}

export function idParam(request: FastifyRequest): string {
  const id = record(request.params).id
  return typeof id === 'string' ? id : ''
}
