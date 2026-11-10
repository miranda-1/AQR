import { IdentityProvisioner } from '../admin/identity-sync.ts'
import { KeycloakIdentityProvider } from '../auth/identity-provider.ts'
import { SmtpMailer } from '../auth/mailer.ts'
import { PasswordLinks } from '../auth/password-links.ts'
import type { ServerConfig } from '../config.ts'
import type { Database } from '../db/database.ts'

/** Provisionamento com a configuração do servidor, para os comandos de terminal (`admin:*`). */
export function createProvisioner(keycloak: NonNullable<ServerConfig['keycloak']>, db: Database): { provisioner: IdentityProvisioner; identity: KeycloakIdentityProvider } {
  const identity = new KeycloakIdentityProvider({
    issuer: keycloak.issuer,
    adminClientId: keycloak.adminClientId,
    adminClientSecret: keycloak.adminClientSecret,
  })
  const provisioner = new IdentityProvisioner(identity, db, {
    mailer: new SmtpMailer(keycloak.smtp),
    links: new PasswordLinks(db, keycloak.appBaseUrl),
  })
  return { provisioner, identity }
}
