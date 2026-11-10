import { IdentityError, type IdentityProfile, type IdentityProvider } from '../auth/identity-provider.ts'

interface FakeUser extends IdentityProfile {
  id: string
  enabled: boolean
  /** E-mail confirmado no Keycloak (padrão: sim; os testes podem desmarcar). */
  emailVerified: boolean
}

/** Provedor de identidades em memória, para testar o provisionamento sem Keycloak. */
export class FakeIdentityProvider implements IdentityProvider {
  readonly users = new Map<string, FakeUser>()
  /** Senhas definidas (só nos testes; o provedor real nunca devolve senha). */
  readonly passwords = new Map<string, string>()
  readonly loggedOut: string[] = []
  /** Quando verdadeiro, toda chamada falha como se o Keycloak estivesse fora do ar. */
  down = false
  /** Senhas que a política do provedor recusa (status 400). */
  rejectPassword: (senha: string) => boolean = () => false
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
    this.users.set(id, { ...profile, id, enabled: true, emailVerified: true })
    return id
  }

  async findUserId(usuario: string): Promise<string | null> {
    this.guard()
    return this.byName(usuario)?.id ?? null
  }

  async findUser(usuario: string): Promise<{ id: string; email: string | null; emailVerified: boolean } | null> {
    this.guard()
    const user = this.byName(usuario)
    return user ? { id: user.id, email: user.email, emailVerified: user.emailVerified } : null
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

  async setPassword(id: string, senha: string): Promise<void> {
    this.guard()
    if (this.rejectPassword(senha)) throw new IdentityError('Invalid password: minimum length 12.', 400)
    const user = this.users.get(id)
    if (user) user.emailVerified = true
    this.passwords.set(id, senha)
  }
}
