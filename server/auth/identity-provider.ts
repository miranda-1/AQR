import * as oidc from 'openid-client'

/**
 * Provisionamento de identidades no provedor de login (Keycloak), feito só pelo backend com uma
 * credencial de serviço (client credentials). O Keycloak fica escondido: a pessoa define a senha
 * numa página do AQR (link enviado pelo AQR) e o backend a repassa ao Keycloak, sem guardá-la.
 */

export interface IdentityProfile {
  usuario: string
  nome: string
  email: string
}

/** Falha ao falar com o provedor de identidade. */
export class IdentityError extends Error {
  override name = 'IdentityError'
  readonly status: number | null

  constructor(message: string, status: number | null = null) {
    super(message)
    this.status = status
  }
}

export interface IdentityProvider {
  /** Cria o usuário (ativo, sem senha). Devolve o id no provedor. `IdentityError` com status 409 se já existir. */
  createUser(profile: IdentityProfile): Promise<string>
  findUserId(usuario: string): Promise<string | null>
  /** O usuário pelo nome, com o e-mail cadastrado (para conferir a identidade antes de vincular). */
  findUser(usuario: string): Promise<{ id: string; email: string | null; emailVerified: boolean } | null>
  deleteUser(id: string): Promise<void>
  setEnabled(id: string, enabled: boolean): Promise<void>
  updateProfile(id: string, profile: IdentityProfile): Promise<void>
  /** Encerra as sessões da pessoa no provedor. */
  logoutUser(id: string): Promise<void>
  /**
   * Define a senha (definitiva) e marca o e-mail como confirmado, já que a pessoa chegou pelo link
   * enviado a ele. `IdentityError` com status 400 quando a senha não atende à política do provedor.
   */
  setPassword(id: string, senha: string): Promise<void>
}

export interface KeycloakIdentitySettings {
  /** URL do realm, ex.: http://localhost:8080/realms/aqr */
  issuer: string
  /** Cliente de serviço (confidencial) com permissão de gerenciar usuários do realm. */
  adminClientId: string
  adminClientSecret: string
}

function splitName(nome: string): { firstName: string; lastName: string } {
  const [first = '', ...rest] = nome.trim().split(/\s+/)
  return { firstName: first, lastName: rest.join(' ') }
}

export class KeycloakIdentityProvider implements IdentityProvider {
  private readonly settings: KeycloakIdentitySettings
  private readonly adminBase: string
  private configuration: Promise<oidc.Configuration> | null = null
  private token: { value: string; expiresAt: number } | null = null

  constructor(settings: KeycloakIdentitySettings) {
    this.settings = settings
    // https://host/realms/aqr → https://host/admin/realms/aqr
    this.adminBase = settings.issuer.replace('/realms/', '/admin/realms/')
  }

  private config(): Promise<oidc.Configuration> {
    this.configuration ??= oidc
      .discovery(
        new URL(this.settings.issuer),
        this.settings.adminClientId,
        undefined,
        oidc.ClientSecretPost(this.settings.adminClientSecret),
        this.settings.issuer.startsWith('http:') ? { execute: [oidc.allowInsecureRequests] } : undefined,
      )
      .catch((error: unknown) => {
        this.configuration = null
        throw error
      })
    return this.configuration
  }

  private async accessToken(): Promise<string> {
    if (this.token && this.token.expiresAt > Date.now() + 10_000) return this.token.value
    try {
      const tokens = await oidc.clientCredentialsGrant(await this.config())
      this.token = { value: tokens.access_token, expiresAt: Date.now() + (tokens.expires_in ?? 60) * 1000 }
      return this.token.value
    } catch (error) {
      throw new IdentityError(`Não foi possível autenticar o AQR no Keycloak (${error instanceof Error ? error.message : 'erro'}).`)
    }
  }

  private async call(method: string, path: string, body?: unknown): Promise<Response> {
    const token = await this.accessToken()
    let response: Response
    try {
      response = await fetch(`${this.adminBase}${path}`, {
        method,
        headers: { authorization: `Bearer ${token}`, ...(body === undefined ? {} : { 'content-type': 'application/json' }) },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        signal: AbortSignal.timeout(15_000),
      })
    } catch {
      throw new IdentityError('O Keycloak não respondeu.')
    }
    if (!response.ok) {
      // A política de senha do Keycloak explica a recusa em `error_description`; vale repassar à pessoa.
      const body: unknown = response.status === 400 ? await response.json().catch(() => null) : null
      const detail = typeof body === 'object' && body !== null && 'error_description' in body && typeof body.error_description === 'string' ? body.error_description : null
      throw new IdentityError(detail ?? `O Keycloak recusou a operação (${response.status}).`, response.status)
    }
    return response
  }

  async createUser(profile: IdentityProfile): Promise<string> {
    const response = await this.call('POST', '/users', {
      username: profile.usuario,
      email: profile.email,
      ...splitName(profile.nome),
      enabled: true,
      emailVerified: false,
    })
    const id = response.headers.get('location')?.split('/').pop()
    if (!id) throw new IdentityError('O Keycloak não informou o id do usuário criado.')
    return id
  }

  async findUserId(usuario: string): Promise<string | null> {
    const response = await this.call('GET', `/users?username=${encodeURIComponent(usuario)}&exact=true`)
    const list: unknown = await response.json()
    const first: unknown = Array.isArray(list) ? list[0] : undefined
    return typeof first === 'object' && first !== null && 'id' in first && typeof first.id === 'string' ? first.id : null
  }

  async findUser(usuario: string): Promise<{ id: string; email: string | null; emailVerified: boolean } | null> {
    const response = await this.call('GET', `/users?username=${encodeURIComponent(usuario)}&exact=true`)
    const list: unknown = await response.json()
    const first: unknown = Array.isArray(list) ? list[0] : undefined
    if (typeof first !== 'object' || first === null || !('id' in first) || typeof first.id !== 'string') return null
    return {
      id: first.id,
      email: 'email' in first && typeof first.email === 'string' ? first.email : null,
      emailVerified: 'emailVerified' in first && first.emailVerified === true,
    }
  }

  async deleteUser(id: string): Promise<void> {
    await this.call('DELETE', `/users/${encodeURIComponent(id)}`)
  }

  async setEnabled(id: string, enabled: boolean): Promise<void> {
    await this.call('PUT', `/users/${encodeURIComponent(id)}`, { enabled })
  }

  async updateProfile(id: string, profile: IdentityProfile): Promise<void> {
    await this.call('PUT', `/users/${encodeURIComponent(id)}`, { email: profile.email, ...splitName(profile.nome) })
  }

  async logoutUser(id: string): Promise<void> {
    await this.call('POST', `/users/${encodeURIComponent(id)}/logout`)
  }

  async setPassword(id: string, senha: string): Promise<void> {
    await this.call('PUT', `/users/${encodeURIComponent(id)}/reset-password`, { type: 'password', value: senha, temporary: false })
    await this.call('PUT', `/users/${encodeURIComponent(id)}`, { emailVerified: true, requiredActions: [] })
  }
}
