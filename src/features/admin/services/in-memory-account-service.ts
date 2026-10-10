import {
  normalizeEmail,
  normalizeName,
  normalizeUsername,
  validateAccountFields,
} from '../../../../shared/validation/account'
import {
  AccountServiceError,
  type Account,
  type AccountService,
  type AuditAction,
  type AuditEvent,
  type AccessEvent,
  type ComparisonUsage,
} from '../model/types'

export interface InMemoryAccountServiceOptions {
  /** Padrão: disponível, em modo de desenvolvimento. */
  available?: boolean
  accounts?: Account[]
  audit?: AuditEvent[]
  /** Quem faz as alterações (vai para a auditoria). */
  actor?: string
  /** Modo anunciado quando disponível (padrão `dev`; `real` simula o login real). */
  mode?: 'dev' | 'real'
  accessEvents?: AccessEvent[]
  comparisonUsage?: ComparisonUsage[]
  /** Atraso simulado, em ms, para testar estados de carregamento. */
  delayMs?: number
}

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

function paginate<T>(items: T[], page = 1, pageSize = 20) {
  const size = Math.min(Math.max(pageSize, 1), 100)
  const current = Math.max(page, 1)
  return { items: items.slice((current - 1) * size, current * size), total: items.length, page: current, pageSize: size }
}

/** Serviço de contas na memória, com as mesmas regras do servidor. Usado nos testes e nas demonstrações. */
export function createInMemoryAccountService(options: InMemoryAccountServiceOptions = {}): AccountService {
  const available = options.available ?? true
  const accounts = new Map((options.accounts ?? []).map((account) => [account.id, account]))
  const audit: AuditEvent[] = [...(options.audit ?? [])]
  let counter = 0
  const nextId = () => `id-${++counter}`
  const now = () => new Date(Date.UTC(2026, 9, 10, 12, 0, counter)).toISOString()

  const notFound = () => new AccountServiceError(404, 'ACCOUNT_NOT_FOUND', 'Conta não encontrada.')
  const find = (id: string) => {
    const account = accounts.get(id)
    if (!account) throw notFound()
    return account
  }
  const conflict = () =>
    new AccountServiceError(409, 'VERSION_CONFLICT', 'Esta conta foi alterada por outra pessoa. Recarregue a página para ver a versão atual.')
  const otherActiveAdmins = (id: string) =>
    [...accounts.values()].filter((a) => a.id !== id && a.papel === 'administrador' && a.situacao === 'ativa').length

  function record(acao: AuditAction, target: Account, detalhes: AuditEvent['detalhes']) {
    audit.unshift({
      id: nextId(),
      ocorridoEm: now(),
      ator: { id: null, rotulo: options.actor ?? 'teste', origem: 'dev' },
      acao,
      alvo: { tipo: 'conta', id: target.id, rotulo: target.nome },
      detalhes,
    })
  }
  const snap = (a: Account) => ({ usuario: a.usuario, nome: a.nome, email: a.email, papel: a.papel, situacao: a.situacao })

  function checkFields(fields: ReturnType<typeof validateAccountFields>) {
    if (Object.keys(fields).length > 0) {
      throw new AccountServiceError(400, 'VALIDATION_FAILED', 'Revise os campos informados.', Object.fromEntries(Object.entries(fields)))
    }
  }

  async function guarded<T>(work: () => T): Promise<T> {
    if (options.delayMs) await wait(options.delayMs)
    return work()
  }

  function changeStatus(id: string, situacao: Account['situacao'], versao: number, motivo?: string): Account {
    const current = find(id)
    if (current.versao !== versao) throw conflict()
    if (situacao === 'inativa' && current.papel === 'administrador' && otherActiveAdmins(id) === 0) {
      throw new AccountServiceError(422, 'LAST_ACTIVE_ADMIN', 'Mantenha pelo menos um administrador ativo.')
    }
    const updated: Account = {
      ...current,
      situacao,
      desativadaEm: situacao === 'inativa' ? now() : null,
      atualizadaEm: now(),
      versao: current.versao + 1,
    }
    accounts.set(id, updated)
    record(situacao === 'inativa' ? 'conta.desativada' : 'conta.reativada', updated, {
      antes: snap(current),
      depois: snap(updated),
      ...(motivo ? { motivo } : {}),
    })
    return updated
  }

  return {
    getStatus: () => guarded(() => ({ available, mode: available ? (options.mode ?? 'dev') : 'disabled' })),
    listAccounts: (query = {}) =>
      guarded(() => {
        const q = (query.q ?? '').trim().toLowerCase()
        const found = [...accounts.values()]
          .filter((a) => !query.papel || a.papel === query.papel)
          .filter((a) => !query.situacao || a.situacao === query.situacao)
          .filter((a) => !q || [a.usuario, a.nome, a.email ?? ''].some((v) => v.toLowerCase().includes(q)))
          .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
        return paginate(found, query.page, query.pageSize)
      }),
    getAccount: (id) => guarded(() => find(id)),
    createAccount: (input) =>
      guarded(() => {
        const usuario = normalizeUsername(input.usuario)
        const nome = normalizeName(input.nome)
        const email = normalizeEmail(input.email)
        checkFields(validateAccountFields({ usuario, nome, email, papel: input.papel }))
        if ([...accounts.values()].some((a) => a.usuario === usuario)) {
          throw new AccountServiceError(409, 'USERNAME_TAKEN', 'Este usuário institucional já está em uso.', {
            usuario: 'Este usuário institucional já está em uso.',
          })
        }
        if (email && [...accounts.values()].some((a) => a.email === email)) {
          throw new AccountServiceError(409, 'EMAIL_TAKEN', 'Este e-mail já está em uso.', { email: 'Este e-mail já está em uso.' })
        }
        const stamp = now()
        const account: Account = {
          id: nextId(), usuario, nome, email, papel: input.papel, situacao: 'ativa',
          criadaEm: stamp, atualizadaEm: stamp, desativadaEm: null, versao: 1,
        }
        accounts.set(account.id, account)
        record('conta.criada', account, { depois: snap(account) })
        return account
      }),
    updateAccount: (id, input) =>
      guarded(() => {
        const current = find(id)
        const nome = normalizeName(input.nome)
        const email = normalizeEmail(input.email)
        checkFields(validateAccountFields({ nome, email, papel: input.papel }))
        if (current.versao !== input.versao) throw conflict()
        if (email && [...accounts.values()].some((a) => a.id !== id && a.email === email)) {
          throw new AccountServiceError(409, 'EMAIL_TAKEN', 'Este e-mail já está em uso.', { email: 'Este e-mail já está em uso.' })
        }
        if (current.papel === 'administrador' && current.situacao === 'ativa' && input.papel !== 'administrador' && otherActiveAdmins(id) === 0) {
          throw new AccountServiceError(422, 'LAST_ACTIVE_ADMIN', 'Mantenha pelo menos um administrador ativo.')
        }
        const updated: Account = { ...current, nome, email, papel: input.papel, atualizadaEm: now(), versao: current.versao + 1 }
        accounts.set(id, updated)
        record(current.papel === updated.papel ? 'conta.editada' : 'conta.papel_alterado', updated, {
          antes: snap(current),
          depois: snap(updated),
        })
        return updated
      }),
    deactivateAccount: (id, input) => guarded(() => changeStatus(id, 'inativa', input.versao, input.motivo)),
    reactivateAccount: (id, input) => guarded(() => changeStatus(id, 'ativa', input.versao, input.motivo)),
    sendPasswordLink: (id) => guarded(() => void find(id)),
    syncIdentity: (id) => guarded(() => find(id)),
    listAudit: (query = {}) =>
      guarded(() =>
        paginate(
          audit.filter((e) => (!query.contaId || e.alvo.id === query.contaId) && (!query.acao || e.acao === query.acao)),
          query.page,
          query.pageSize,
        ),
      ),
    listAccessEvents: (query = {}) =>
      guarded(() =>
        paginate(
          (options.accessEvents ?? []).filter(
            (e) => (!query.evento || e.evento === query.evento) && (!query.usuario || e.usuario?.toLowerCase() === query.usuario.toLowerCase()),
          ),
          query.page,
          query.pageSize,
        ),
      ),
    listComparisonUsage: () => guarded(() => options.comparisonUsage ?? []),
  }
}
