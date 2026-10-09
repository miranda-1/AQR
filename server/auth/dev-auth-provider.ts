import { DEV_ACTOR_HEADER } from '../../shared/contracts/admin.ts'
import { isAccountRole, USERNAME_PATTERN } from '../../shared/validation/account.ts'
import { textColumn, type Database } from '../db/database.ts'
import type { AuthProvider } from './auth-provider.ts'

/**
 * SÓ PARA DESENVOLVIMENTO. Identifica a pessoa pelo cabeçalho `X-AQR-Dev-Actor` (o usuário
 * digitado no login visual), que precisa ser uma conta **ativa** no banco. Não há senha: por
 * isso o servidor recusa este modo em produção e fora da máquina local (`config.ts`), e a API
 * administrativa recusa requisições que não venham do próprio computador (`admin/routes.ts`).
 */
export function createDevAuthProvider(db: Database): AuthProvider {
  const findActive = db.prepare(
    "SELECT id, usuario, nome, papel FROM accounts WHERE usuario = ? COLLATE NOCASE AND situacao = 'ativa'",
  )
  return {
    kind: 'dev',
    async resolvePrincipal(request) {
      const header = request.headers[DEV_ACTOR_HEADER]
      const usuario = typeof header === 'string' ? header.trim().toLowerCase() : ''
      if (!USERNAME_PATTERN.test(usuario)) return null
      const row = findActive.get(usuario)
      if (!row) return null
      const papel = textColumn(row, 'papel')
      if (!isAccountRole(papel)) return null
      return {
        accountId: textColumn(row, 'id'),
        usuario: textColumn(row, 'usuario'),
        nome: textColumn(row, 'nome'),
        papel,
        origem: 'dev',
      }
    },
  }
}
