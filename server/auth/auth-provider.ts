import type { FastifyRequest } from 'fastify'
import type { Principal } from './principal.ts'

/**
 * Ponto de troca da autenticação. Hoje só existe o `DevAuthProvider` (desenvolvimento, máquina
 * local). A autenticação real implementará esta mesma interface (sessão em cookie, provedor
 * institucional), sem mudar rotas, regras de contas ou auditoria. Ver docs/arquitetura.md.
 */
export interface AuthProvider {
  readonly kind: 'dev' | 'real'
  /** A pessoa da requisição, ou `null` se não for possível identificá-la. */
  resolvePrincipal(request: FastifyRequest): Promise<Principal | null>
}
