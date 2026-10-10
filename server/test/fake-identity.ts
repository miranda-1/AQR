import { IdentityError, type IdentityProfile, type IdentityProvider } from '../auth/identity-provider.ts'

interface FakeUser extends IdentityProfile {
  id: string
  enabled: boolean
}

/** Provedor de identidades em memória, para testar o provisionamento sem Keycloak. */
export class FakeIdentityProvider implements IdentityProvider {
  readonly users = new Map<string, FakeUser>()
  readonly emails: string[] = []
  readonly loggedOut: string[] = []
  /** Quando verdadeiro, toda chamada falha como se o Keycloak estivesse fora do ar. */
  down = false
  /** Quando verdadeiro, só o envio de e-mail falha. */
  mailDown = false
  private next = 1

  private guard(): void {
    if (this.down) throw new IdentityError('fora do ar')
  }

  byName(usuario: string): FakeUser | undefined {
    return [...this.users.values()].find((user) => user.usuario === usuario)
  }

  async createUser(profile: IdentityProfile): Promise<string> {
    this.guard()
    if (this.byName(profile.usuario)) throw new IdentityError('já existe', 409)
    const id = `kc-${this.next++}`
    this.users.set(id, { ...profile, id, enabled: true })
    return id
  }

  async findUserId(usuario: string): Promise<string | null> {
    this.guard()
    return this.byName(usuario)?.id ?? null
  }

  async deleteUser(id: string): Promise<void> {
    this.users.delete(id)
  }

  async setEnabled(id: string, enabled: boolean): Promise<void> {
    this.guard()
    const user = this.users.get(id)
    if (user) user.enabled = enabled
  }

  async updateProfile(id: string, profile: IdentityProfile): Promise<void> {
    this.guard()
    const user = this.users.get(id)
    if (user) Object.assign(user, profile)
  }

  async logoutUser(id: string): Promise<void> {
    this.guard()
    this.loggedOut.push(id)
  }

  async sendPasswordEmail(id: string): Promise<void> {
    this.guard()
    if (this.mailDown) throw new IdentityError('SMTP fora do ar')
    this.emails.push(id)
  }
}
