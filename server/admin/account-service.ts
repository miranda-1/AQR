import { randomUUID } from 'node:crypto'
import type {
  Account,
  AccountQuery,
  AuditEvent,
  AuditQuery,
  CreateAccountInput,
  StatusChangeInput,
  UpdateAccountInput,
} from '../../shared/contracts/admin.ts'
import {
  REASON_MAX,
  normalizeEmail,
  normalizeName,
  normalizeUsername,
  validateAccountFields,
} from '../../shared/validation/account.ts'
import type { Principal } from '../auth/principal.ts'
import { transaction, type Database } from '../db/database.ts'
import { ApiError } from '../http/errors.ts'
import { AccountRepository, type AccountFilter } from './account-repository.ts'
import { AuditRepository, type AuditFilter } from './audit-repository.ts'

export interface AuditActor {
  id: string | null
  rotulo: string
  origem: AuditEvent['ator']['origem']
}

interface AccountServiceDependencies {
  now?: () => string
  createId?: () => string
}

const DEFAULT_PAGE_SIZE = 20
const MAX_PAGE_SIZE = 100

function snapshot(account: Account): NonNullable<AuditEvent['detalhes']['antes']> {
  return {
    usuario: account.usuario,
    nome: account.nome,
    email: account.email,
    papel: account.papel,
    situacao: account.situacao,
  }
}

function pagination(page: number | undefined, pageSize: number | undefined): { page: number; pageSize: number; offset: number } {
  const safePage = Number.isInteger(page) && (page ?? 0) > 0 ? (page as number) : 1
  const safePageSize = Number.isInteger(pageSize) && (pageSize ?? 0) > 0 ? Math.min(pageSize as number, MAX_PAGE_SIZE) : DEFAULT_PAGE_SIZE
  return { page: safePage, pageSize: safePageSize, offset: (safePage - 1) * safePageSize }
}

function conflict(): ApiError {
  return new ApiError(
    409,
    'VERSION_CONFLICT',
    'Esta conta foi alterada por outra pessoa. Recarregue a página para ver a versão atual.',
  )
}

function notFound(): ApiError {
  return new ApiError(404, 'ACCOUNT_NOT_FOUND', 'Conta não encontrada.')
}

/** Converte o principal autenticado no ator persistido na auditoria. */
export function actorFromPrincipal(principal: Principal): AuditActor {
  return { id: principal.accountId, rotulo: principal.nome, origem: principal.origem }
}

/**
 * Regras de negócio da administração de contas. Toda mutação e o respectivo evento de
 * auditoria compartilham a mesma transação SQLite.
 */
export class AccountService {
  private readonly db: Database
  private readonly accounts: AccountRepository
  private readonly audits: AuditRepository
  private readonly now: () => string
  private readonly createId: () => string

  constructor(db: Database, dependencies: AccountServiceDependencies = {}) {
    this.db = db
    this.accounts = new AccountRepository(db)
    this.audits = new AuditRepository(db)
    this.now = dependencies.now ?? (() => new Date().toISOString())
    this.createId = dependencies.createId ?? randomUUID
  }

  list(query: AccountQuery = {}) {
    const { page, pageSize, offset } = pagination(query.page, query.pageSize)
    const filter: AccountFilter = { limit: pageSize, offset }
    const q = query.q?.trim()
    if (q) filter.q = q.slice(0, 100)
    if (query.papel) filter.papel = query.papel
    if (query.situacao) filter.situacao = query.situacao
    return { ...this.accounts.list(filter), page, pageSize }
  }

  get(id: string): Account {
    const account = this.accounts.findById(id)
    if (!account) throw notFound()
    return account
  }

  listAudit(query: AuditQuery = {}) {
    const { page, pageSize, offset } = pagination(query.page, query.pageSize)
    const filter: AuditFilter = { limit: pageSize, offset }
    if (query.contaId) filter.contaId = query.contaId
    if (query.acao) filter.acao = query.acao
    return { ...this.audits.list(filter), page, pageSize }
  }

  create(input: CreateAccountInput, actor: AuditActor): Account {
    const usuario = normalizeUsername(input.usuario)
    const nome = normalizeName(input.nome)
    const email = normalizeEmail(input.email)
    const fields = validateAccountFields({ usuario, nome, email, papel: input.papel })
    if (Object.keys(fields).length > 0) {
      throw new ApiError(400, 'VALIDATION_FAILED', 'Revise os campos informados.', { fields })
    }

    return transaction(this.db, () => {
      if (this.accounts.usernameExists(usuario)) {
        throw new ApiError(409, 'USERNAME_TAKEN', 'Este usuário institucional já está em uso.', {
          fields: { usuario: 'Este usuário institucional já está em uso.' },
        })
      }
      if (email && this.accounts.emailTaken(email)) {
        throw new ApiError(409, 'EMAIL_TAKEN', 'Este e-mail já está em uso.', {
          fields: { email: 'Este e-mail já está em uso.' },
        })
      }

      const timestamp = this.now()
      const account: Account = {
        id: this.createId(),
        usuario,
        nome,
        email,
        papel: input.papel,
        situacao: 'ativa',
        criadaEm: timestamp,
        atualizadaEm: timestamp,
        desativadaEm: null,
        versao: 1,
      }
      this.accounts.insert(account)
      this.record('conta.criada', account, actor, { depois: snapshot(account) })
      return account
    })
  }

  update(id: string, input: UpdateAccountInput, actor: AuditActor): Account {
    const nome = normalizeName(input.nome)
    const email = normalizeEmail(input.email)
    const fields = validateAccountFields({ nome, email, papel: input.papel })
    if (Object.keys(fields).length > 0) {
      throw new ApiError(400, 'VALIDATION_FAILED', 'Revise os campos informados.', { fields })
    }

    return transaction(this.db, () => {
      const current = this.accounts.findById(id)
      if (!current) throw notFound()
      if (current.versao !== input.versao) throw conflict()
      if (email && this.accounts.emailTaken(email, id)) {
        throw new ApiError(409, 'EMAIL_TAKEN', 'Este e-mail já está em uso.', {
          fields: { email: 'Este e-mail já está em uso.' },
        })
      }
      if (current.papel === 'administrador' && current.situacao === 'ativa' && input.papel !== 'administrador') {
        this.assertAnotherActiveAdmin(id)
      }

      const updated: Account = {
        ...current,
        nome,
        email,
        papel: input.papel,
        atualizadaEm: this.now(),
        versao: current.versao + 1,
      }
      if (!this.accounts.update(updated, current.versao)) throw conflict()
      const action = current.papel === updated.papel ? 'conta.editada' : 'conta.papel_alterado'
      this.record(action, updated, actor, { antes: snapshot(current), depois: snapshot(updated) })
      return updated
    })
  }

  deactivate(id: string, input: StatusChangeInput, actor: AuditActor): Account {
    if (actor.id === id) {
      throw new ApiError(422, 'SELF_DEACTIVATION', 'Você não pode desativar a própria conta.')
    }
    return this.changeStatus(id, 'inativa', input, actor)
  }

  reactivate(id: string, input: StatusChangeInput, actor: AuditActor): Account {
    return this.changeStatus(id, 'ativa', input, actor)
  }

  private changeStatus(
    id: string,
    situation: Account['situacao'],
    input: StatusChangeInput,
    actor: AuditActor,
  ): Account {
    const reason = input.motivo?.replace(/\p{Cc}/gu, '').trim()
    if (reason && reason.length > REASON_MAX) {
      throw new ApiError(400, 'VALIDATION_FAILED', 'Revise os campos informados.', {
        fields: { motivo: `Use no máximo ${REASON_MAX} caracteres.` },
      })
    }

    return transaction(this.db, () => {
      const current = this.accounts.findById(id)
      if (!current) throw notFound()
      if (current.versao !== input.versao) throw conflict()
      if (current.situacao === situation) return current
      if (situation === 'inativa' && current.papel === 'administrador') this.assertAnotherActiveAdmin(id)

      const timestamp = this.now()
      const updated: Account = {
        ...current,
        situacao: situation,
        atualizadaEm: timestamp,
        desativadaEm: situation === 'inativa' ? timestamp : null,
        versao: current.versao + 1,
      }
      if (!this.accounts.update(updated, current.versao)) throw conflict()
      this.record(situation === 'inativa' ? 'conta.desativada' : 'conta.reativada', updated, actor, {
        antes: snapshot(current),
        depois: snapshot(updated),
        ...(reason ? { motivo: reason } : {}),
      })
      return updated
    })
  }

  private assertAnotherActiveAdmin(accountId: string): void {
    if (this.accounts.countActiveAdmins(accountId) === 0) {
      throw new ApiError(422, 'LAST_ACTIVE_ADMIN', 'Mantenha pelo menos um administrador ativo.')
    }
  }

  private record(
    action: AuditEvent['acao'],
    target: Account,
    actor: AuditActor,
    details: AuditEvent['detalhes'],
  ): void {
    this.audits.insert({
      id: this.createId(),
      ocorridoEm: this.now(),
      ator: actor,
      acao: action,
      alvo: { tipo: 'conta', id: target.id, rotulo: target.nome },
      detalhes: details,
    })
  }
}
