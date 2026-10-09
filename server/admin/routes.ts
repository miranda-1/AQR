import type { FastifyInstance, FastifyRequest } from 'fastify'
import type { AdminStatus, CurrentAdmin } from '../../shared/contracts/admin.ts'
import type { AuthProvider } from '../auth/auth-provider.ts'
import { principalOf, requireRole } from '../auth/require-role.ts'
import { ApiError } from '../http/errors.ts'

export type AdminMode = 'disabled' | 'dev'

const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]', '::1'])

export function isLoopbackAddress(ip: string): boolean {
  return ip === '::1' || ip.startsWith('127.') || ip.startsWith('::ffff:127.')
}

/**
 * No modo de desenvolvimento, só atende pedidos feitos no próprio computador: endereço de
 * origem local e, se o navegador informar a página de origem (`Origin`), ela também local.
 * Assim, outra máquina na rede ou um site qualquer aberto no navegador não alcançam a API.
 */
function assertLocalRequest(request: FastifyRequest): void {
  const forbidden = new ApiError(403, 'LOCAL_ONLY', 'A administração em modo de desenvolvimento só atende pedidos deste computador.')
  if (!isLoopbackAddress(request.ip)) throw forbidden
  const origin = request.headers.origin
  if (origin) {
    let hostname: string
    try {
      hostname = new URL(origin).hostname
    } catch {
      throw forbidden
    }
    if (!LOOPBACK_HOSTS.has(hostname)) throw forbidden
  }
}

export interface AdminRoutesOptions {
  mode: AdminMode
  /** Presente quando a administração está ligada. */
  auth?: AuthProvider
}

/**
 * API administrativa. `GET /api/admin/status` sempre responde; as demais rotas só existem
 * quando a administração está ligada (modo "dev"). Desligada, respondem 404 como qualquer
 * endereço inexistente.
 */
export function registerAdminRoutes(app: FastifyInstance, options: AdminRoutesOptions): void {
  app.get('/api/admin/status', async (): Promise<AdminStatus> => ({ available: options.mode !== 'disabled', mode: options.mode }))

  const auth = options.auth
  if (options.mode === 'disabled' || !auth) return

  app.register(async (admin) => {
    admin.decorateRequest('principal', null)
    admin.addHook('onRequest', async (request) => assertLocalRequest(request))
    const onlyAdmins = requireRole(auth, 'administrador')

    admin.get('/api/admin/me', { preHandler: onlyAdmins }, async (request): Promise<CurrentAdmin> => {
      const principal = principalOf(request)
      return {
        id: principal.accountId,
        usuario: principal.usuario,
        nome: principal.nome,
        papel: principal.papel,
        origem: principal.origem,
      }
    })
  })
}
