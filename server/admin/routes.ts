import type { FastifyInstance, FastifyRequest } from 'fastify'
import type { AdminStatus, CurrentAdmin } from '../../shared/contracts/admin.ts'
import type { AuthProvider } from '../auth/auth-provider.ts'
import { registerEventRoutes } from './event-routes.ts'
import type { IdentityProvisioner } from './identity-sync.ts'
import { principalOf, requireRole } from '../auth/require-role.ts'
import type { Database } from '../db/database.ts'
import { ApiError } from '../http/errors.ts'
import { AccountService, actorFromPrincipal } from './account-service.ts'
import { accountQuery, auditQuery, createInput, idParam, statusChangeInput, updateInput } from './schemas.ts'

export type AdminMode = 'disabled' | 'dev' | 'real'

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
  /** Banco das contas e da auditoria; presente quando a administração está ligada. */
  db?: Database
  /** Provisiona o acesso no Keycloak junto com a conta (login real). Sem ele, só o AQR é alterado. */
  identity?: IdentityProvisioner
}

/**
 * API administrativa. `GET /api/admin/status` sempre responde; as demais rotas só existem
 * quando a administração está ligada (modo "dev"). Desligada, respondem 404 como qualquer
 * endereço inexistente.
 */
export function registerAdminRoutes(app: FastifyInstance, options: AdminRoutesOptions): void {
  app.get('/api/admin/status', async (): Promise<AdminStatus> => ({ available: options.mode !== 'disabled', mode: options.mode }))

  const { auth, db, identity } = options
  if (options.mode === 'disabled' || !auth || !db) return
  const service = new AccountService(db)

  app.register(async (admin) => {
    admin.decorateRequest('principal', null)
    // Só o modo sem autenticação real precisa ficar restrito ao computador local.
    if (options.mode === 'dev') admin.addHook('onRequest', async (request) => assertLocalRequest(request))
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

    admin.get('/api/admin/accounts', { preHandler: onlyAdmins }, async (request) => service.list(accountQuery(request)))

    admin.post('/api/admin/accounts', { preHandler: onlyAdmins }, async (request, reply) => {
      const actor = actorFromPrincipal(principalOf(request))
      const input = createInput(request.body)
      if (!identity) return reply.status(201).send(service.create(input, actor))

      // Primeiro o acesso no Keycloak (sem conta no AQR ninguém entra); se a conta falhar, desfaz.
      const prepared = service.prepareCreate(input, true)
      const keycloakId = await identity.createUser({ usuario: prepared.usuario, nome: prepared.nome, email: prepared.email ?? '' })
      let account
      try {
        account = service.create(prepared, actor)
      } catch (error) {
        await identity.rollbackUser(keycloakId)
        throw error
      }
      return reply.status(201).send(await identity.afterCreate(account, keycloakId, actor.id ?? ''))
    })

    admin.get('/api/admin/accounts/:id', { preHandler: onlyAdmins }, async (request) => service.get(idParam(request)))

    admin.patch('/api/admin/accounts/:id', { preHandler: onlyAdmins }, async (request) => {
      const actor = actorFromPrincipal(principalOf(request))
      const account = service.update(idParam(request), updateInput(request.body), actor)
      return identity ? identity.afterUpdate(account, actor.id ?? '') : account
    })

    admin.post('/api/admin/accounts/:id/desativar', { preHandler: onlyAdmins }, async (request) => {
      const actor = actorFromPrincipal(principalOf(request))
      const account = service.deactivate(idParam(request), statusChangeInput(request.body), actor)
      return identity ? identity.afterStatusChange(account, actor.id ?? '') : account
    })

    admin.post('/api/admin/accounts/:id/reativar', { preHandler: onlyAdmins }, async (request) => {
      const actor = actorFromPrincipal(principalOf(request))
      const account = service.reactivate(idParam(request), statusChangeInput(request.body), actor)
      return identity ? identity.afterStatusChange(account, actor.id ?? '') : account
    })

    // Registros de acesso e de comparações (leitura, só administradores): só com o login real.
    if (options.mode === 'real') registerEventRoutes(admin, db, onlyAdmins)

    if (identity) {
      // Link por e-mail para a pessoa definir ou redefinir a senha (a senha nunca passa pelo AQR).
      admin.post('/api/admin/accounts/:id/redefinir-senha', { preHandler: onlyAdmins }, async (request, reply) => {
        const actor = actorFromPrincipal(principalOf(request))
        await identity.sendPasswordEmail(service.get(idParam(request)), actor.id ?? '')
        return reply.status(204).send()
      })
      // Alinha o Keycloak com a conta (cria o acesso de contas antigas, corrige bloqueio e dados).
      admin.post('/api/admin/accounts/:id/sincronizar', { preHandler: onlyAdmins }, async (request) =>
        identity.sync(service.get(idParam(request)), actorFromPrincipal(principalOf(request)).id ?? ''),
      )
    }

    admin.get('/api/admin/audit-events', { preHandler: onlyAdmins }, async (request) => service.listAudit(auditQuery(request)))
  })
}
