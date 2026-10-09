import type { AccountRole } from '../../shared/contracts/admin.ts'

/** Pessoa identificada numa requisição. Vem sempre de uma conta ativa do banco. */
export interface Principal {
  accountId: string
  usuario: string
  nome: string
  papel: AccountRole
  /** "dev": cabeçalho do modo de desenvolvimento. "real": autenticação real (futura). */
  origem: 'dev' | 'real'
}
