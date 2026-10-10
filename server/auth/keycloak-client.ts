import * as oidc from 'openid-client'

/**
 * Cliente do Keycloak. Todo o protocolo OIDC (descoberta, PKCE, troca do código, validação de
 * assinatura, emissor, público, expiração e nonce do token) é da biblioteca `openid-client`
 * (mantida e certificada pela OpenID Foundation). Aqui só há a cola. Os tokens ficam no
 * servidor: o navegador recebe apenas um cookie de sessão opaco.
 */

export interface KeycloakSettings {
  /** URL do realm, ex.: https://login.exemplo.gov.br/realms/aqr */
  issuer: string
  clientId: string
  /** Ausente em cliente público (PKCE basta). */
  clientSecret?: string | undefined
}

export interface PendingLogin {
  state: string
  nonce: string
  verifier: string
}

export interface Identity {
  sub: string
  usuario: string
  nome: string | null
  email: string | null
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
        this.settings.clientSecret ? oidc.ClientSecretPost(this.settings.clientSecret) : oidc.None(),
        // HTTP só é aceito para o Keycloak local (a configuração recusa HTTP fora de localhost).
        this.settings.issuer.startsWith('http:') ? { execute: [oidc.allowInsecureRequests] } : undefined,
      )
      .catch((error: unknown) => {
        this.configuration = null
        throw error
      })
    return this.configuration
  }

  async startLogin(redirectUri: string): Promise<{ url: string; pending: PendingLogin }> {
    const config = await this.config()
    const pending: PendingLogin = {
      state: oidc.randomState(),
      nonce: oidc.randomNonce(),
      verifier: oidc.randomPKCECodeVerifier(),
    }
    const url = oidc.buildAuthorizationUrl(config, {
      redirect_uri: redirectUri,
      scope: 'openid profile email',
      state: pending.state,
      nonce: pending.nonce,
      code_challenge: await oidc.calculatePKCECodeChallenge(pending.verifier),
      code_challenge_method: 'S256',
    })
    return { url: url.href, pending }
  }

  /** `callbackUrl` é a URL completa em que o Keycloak devolveu a pessoa (com `code` e `state`). */
  async finishLogin(callbackUrl: URL, pending: PendingLogin): Promise<{ identity: Identity }> {
    const config = await this.config()
    const tokens = await oidc.authorizationCodeGrant(config, callbackUrl, {
      pkceCodeVerifier: pending.verifier,
      expectedState: pending.state,
      expectedNonce: pending.nonce,
      idTokenExpected: true,
    })
    const claims = tokens.claims()
    if (!claims) throw new Error('O Keycloak não devolveu o token de identidade.')
    const usuario = typeof claims.preferred_username === 'string' ? claims.preferred_username.trim().toLowerCase() : ''
    return {
      identity: {
        sub: claims.sub,
        usuario,
        nome: typeof claims.name === 'string' ? claims.name : null,
        email: typeof claims.email === 'string' ? claims.email : null,
      },
    }
  }
}
