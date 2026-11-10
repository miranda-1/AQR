import * as oidc from 'openid-client'

/**
 * Cliente do Keycloak. O protocolo (descoberta, pedido ao endpoint de token, validação do token de
 * identidade: emissor, público, expiração) é da biblioteca `openid-client` (mantida e certificada pela
 * OpenID Foundation); aqui só há a cola. O usuário e a senha chegam ao servidor do AQR pela tela de
 * login do próprio AQR e são repassados ao Keycloak ("direct access grant"), por um cliente
 * CONFIDENCIAL: só quem tem o segredo (o servidor) consegue trocar senha por token. Nada é guardado:
 * nem a senha, nem os tokens; o navegador recebe apenas um cookie de sessão opaco.
 */

export interface KeycloakSettings {
  /** URL do realm, ex.: https://login.exemplo.gov.br/realms/aqr */
  issuer: string
  clientId: string
  /** Segredo do cliente confidencial do AQR (obrigatório para a troca de senha). */
  clientSecret: string
}

export interface Identity {
  sub: string
  usuario: string
  nome: string | null
  email: string | null
}

/** Usuário ou senha errados, conta bloqueada no Keycloak ou acesso ainda sem senha definida. */
export class InvalidCredentialsError extends Error {
  override name = 'InvalidCredentialsError'
}

export class KeycloakClient {
  private configuration: Promise<oidc.Configuration> | null = null

  private readonly settings: KeycloakSettings

  constructor(settings: KeycloakSettings) {
    this.settings = settings
  }

  private config(): Promise<oidc.Configuration> {
    this.configuration ??= oidc
      .discovery(
        new URL(this.settings.issuer),
        this.settings.clientId,
        undefined,
        oidc.ClientSecretPost(this.settings.clientSecret),
        // HTTP só é aceito para o Keycloak local (a configuração recusa HTTP fora de localhost).
        this.settings.issuer.startsWith('http:') ? { execute: [oidc.allowInsecureRequests] } : undefined,
      )
      .catch((error: unknown) => {
        this.configuration = null
        throw error
      })
    return this.configuration
  }

  /**
   * Confere usuário e senha no Keycloak e devolve quem é a pessoa (pelo token de identidade).
   * Rejeita com `InvalidCredentialsError` quando o Keycloak recusa; outros erros são indisponibilidade.
   */
  async passwordLogin(usuario: string, senha: string): Promise<Identity> {
    const config = await this.config()
    let tokens
    try {
      tokens = await oidc.genericGrantRequest(config, 'password', { username: usuario, password: senha, scope: 'openid profile email' })
    } catch (error) {
      if (error instanceof oidc.ResponseBodyError && error.error === 'invalid_grant') throw new InvalidCredentialsError(error.error)
      throw error
    }
    const claims = tokens.claims()
    if (!claims) throw new Error('O Keycloak não devolveu o token de identidade.')
    return {
      sub: claims.sub,
      usuario: typeof claims.preferred_username === 'string' ? claims.preferred_username.trim().toLowerCase() : '',
      nome: typeof claims.name === 'string' ? claims.name : null,
      email: typeof claims.email === 'string' ? claims.email : null,
    }
  }
}
