import type { FastifyRequest, preHandlerAsyncHookHandler } from 'fastify'
import type { AccountRole } from '../../shared/contracts/admin.ts'
import { ApiError } from '../http/errors.ts'
import type { AuthProvider } from './auth-provider.ts'
import type { Principal } from './principal.ts'

declare module 'fastify' {
  interface FastifyRequest {
    /** Preenchido por `requireRole`; `null` antes disso. */
    principal: Principal | null
  }
}

/**
 * Exige uma pessoa identificada (401) com o papel indicado (403) antes da rota. A pessoa fica
 * em `request.principal`, para a rota e para a auditoria.
 */
export function requireRole(provider: AuthProvider, role: AccountRole): preHandlerAsyncHookHandler {
  return async (request) => {
    const principal = await provider.resolvePrincipal(request)
    if (!principal) {
      throw new ApiError(
        401,
        'UNAUTHENTICATED',
        provider.kind === 'dev'
          ? 'Não foi possível identificar você. Entre no AQR com o usuário de uma conta de administrador ativa.'
          : 'Sua sessão terminou. Entre de novo para continuar.',
      )
    }
    if (principal.papel !== role) {
      throw new ApiError(403, 'FORBIDDEN', 'Sua conta não tem permissão para administrar contas. Fale com um administrador do AQR.')
    }
    request.principal = principal
  }
}

/** A pessoa já verificada por `requireRole` (erro de programação se a rota esqueceu a verificação). */
export function principalOf(request: FastifyRequest): Principal {
  if (!request.principal) throw new Error('Rota administrativa sem requireRole')
  return request.principal
}
