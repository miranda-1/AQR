import { randomUUID } from 'node:crypto'
import type { AccountRole, AccountStatus } from '../../shared/contracts/admin.ts'
import type { Database } from '../db/database.ts'

/** Insere uma conta direto no banco (preparação de testes, sem auditoria). Devolve o id. */
export function seedAccount(
  db: Database,
  usuario: string,
  papel: AccountRole = 'administrador',
  situacao: AccountStatus = 'ativa',
): string {
  const id = randomUUID()
  const now = new Date().toISOString()
  db.prepare(
    `INSERT INTO accounts (id, usuario, nome, email, papel, situacao, criada_em, atualizada_em, desativada_em)
     VALUES (?, ?, ?, NULL, ?, ?, ?, ?, ?)`,
  ).run(id, usuario, `Nome de ${usuario}`, papel, situacao, now, now, situacao === 'inativa' ? now : null)
  return id
}
