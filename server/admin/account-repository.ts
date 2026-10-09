import type { Account, AccountRole, AccountStatus } from '../../shared/contracts/admin.ts'
import { isAccountRole } from '../../shared/validation/account.ts'
import { integerColumn, optionalTextColumn, textColumn, type Database, type Row } from '../db/database.ts'

/**
 * Acesso à tabela `accounts`. Todas as consultas usam parâmetros (nunca texto concatenado),
 * e a busca escapa os curingas do LIKE.
 */

function toStatus(value: string): AccountStatus {
  if (value === 'ativa' || value === 'inativa') return value
  throw new Error(`Situação inválida no banco: ${value}`)
}

function toRole(value: string): AccountRole {
  if (isAccountRole(value)) return value
  throw new Error(`Papel inválido no banco: ${value}`)
}

export function rowToAccount(row: Row): Account {
  return {
    id: textColumn(row, 'id'),
    usuario: textColumn(row, 'usuario'),
    nome: textColumn(row, 'nome'),
    email: optionalTextColumn(row, 'email'),
    papel: toRole(textColumn(row, 'papel')),
    situacao: toStatus(textColumn(row, 'situacao')),
    criadaEm: textColumn(row, 'criada_em'),
    atualizadaEm: textColumn(row, 'atualizada_em'),
    desativadaEm: optionalTextColumn(row, 'desativada_em'),
    versao: integerColumn(row, 'versao'),
  }
}

/** Escapa `%`, `_` e `\` para que o termo buscado seja literal. */
export function likePattern(term: string): string {
  return `%${term.replace(/[\\%_]/gu, (char) => `\\${char}`)}%`
}

export interface AccountFilter {
  q?: string
  papel?: AccountRole
  situacao?: AccountStatus
  limit: number
  offset: number
}

const COLUMNS = 'id, usuario, nome, email, papel, situacao, criada_em, atualizada_em, desativada_em, versao'

export class AccountRepository {
  private readonly db: Database

  constructor(db: Database) {
    this.db = db
  }

  findById(id: string): Account | undefined {
    const row = this.db.prepare(`SELECT ${COLUMNS} FROM accounts WHERE id = ?`).get(id)
    return row ? rowToAccount(row) : undefined
  }

  usernameExists(usuario: string): boolean {
    return this.db.prepare('SELECT 1 FROM accounts WHERE usuario = ? COLLATE NOCASE').get(usuario) !== undefined
  }

  /** O e-mail já pertence a outra conta? */
  emailTaken(email: string, exceptId?: string): boolean {
    return (
      this.db.prepare('SELECT 1 FROM accounts WHERE email = ? COLLATE NOCASE AND id IS NOT ?').get(email, exceptId ?? null) !==
      undefined
    )
  }

  /** Administradores ativos, sem contar `exceptId`. */
  countActiveAdmins(exceptId?: string): number {
    const row = this.db
      .prepare("SELECT count(*) AS n FROM accounts WHERE papel = 'administrador' AND situacao = 'ativa' AND id IS NOT ?")
      .get(exceptId ?? null)
    return row ? integerColumn(row, 'n') : 0
  }

  list(filter: AccountFilter): { items: Account[]; total: number } {
    const conditions: string[] = []
    const params: Record<string, string | number> = {}
    if (filter.q) {
      conditions.push("(usuario LIKE :q ESCAPE '\\' OR nome LIKE :q ESCAPE '\\' OR coalesce(email, '') LIKE :q ESCAPE '\\')")
      params.q = likePattern(filter.q)
    }
    if (filter.papel) {
      conditions.push('papel = :papel')
      params.papel = filter.papel
    }
    if (filter.situacao) {
      conditions.push('situacao = :situacao')
      params.situacao = filter.situacao
    }
    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
    const totalRow = this.db.prepare(`SELECT count(*) AS n FROM accounts ${where}`).get(params)
    const rows = this.db
      .prepare(`SELECT ${COLUMNS} FROM accounts ${where} ORDER BY nome COLLATE NOCASE, usuario LIMIT :limit OFFSET :offset`)
      .all({ ...params, limit: filter.limit, offset: filter.offset })
    return { items: rows.map(rowToAccount), total: totalRow ? integerColumn(totalRow, 'n') : 0 }
  }

  insert(account: Account): void {
    this.db
      .prepare(
        `INSERT INTO accounts (id, usuario, nome, email, papel, situacao, criada_em, atualizada_em, desativada_em, versao)
         VALUES (:id, :usuario, :nome, :email, :papel, :situacao, :criadaEm, :atualizadaEm, :desativadaEm, :versao)`,
      )
      .run({ ...account })
  }

  /**
   * Grava a nova versão da conta só se a versão no banco ainda for `expectedVersion`
   * (concorrência otimista). Devolve `false` se outra alteração chegou antes.
   */
  update(account: Account, expectedVersion: number): boolean {
    const result = this.db
      .prepare(
        `UPDATE accounts SET nome = :nome, email = :email, papel = :papel, situacao = :situacao,
           atualizada_em = :atualizadaEm, desativada_em = :desativadaEm, versao = :versao
         WHERE id = :id AND versao = :expectedVersion`,
      )
      .run({
        id: account.id,
        nome: account.nome,
        email: account.email,
        papel: account.papel,
        situacao: account.situacao,
        atualizadaEm: account.atualizadaEm,
        desativadaEm: account.desativadaEm,
        versao: account.versao,
        expectedVersion,
      })
    return Number(result.changes) === 1
  }
}
