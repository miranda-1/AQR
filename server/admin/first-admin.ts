import type { Account } from '../../shared/contracts/admin.ts'
import type { Database } from '../db/database.ts'
import { ApiError } from '../http/errors.ts'
import { AccountService } from './account-service.ts'

/** Cria o primeiro administrador; recusa quando já existe um administrador ativo. */
export function createFirstAdmin(db: Database, input: { usuario: string; nome: string; email: string | null }): Account {
  const row = db.prepare("SELECT count(*) AS n FROM accounts WHERE papel = 'administrador' AND situacao = 'ativa'").get()
  if (row && Number(row.n) > 0) {
    throw new ApiError(409, 'ADMIN_EXISTS', 'Já existe um administrador ativo. Use a tela de administração para criar outras contas.')
  }
  return new AccountService(db).create({ ...input, papel: 'administrador' }, { id: null, rotulo: 'sistema', origem: 'sistema' })
}
