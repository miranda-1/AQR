import { randomUUID } from 'node:crypto'
import type { Account } from '../../shared/contracts/admin.ts'
import { IdentityError, type IdentityProfile, type IdentityProvider } from '../auth/identity-provider.ts'
import type { Database } from '../db/database.ts'
import { ApiError } from '../http/errors.ts'

type IdentityEvent =
  | 'identidade.criada'
  | 'identidade.convite_enviado'
  | 'identidade.senha_redefinicao_enviada'
  | 'identidade.bloqueada'
  | 'identidade.reativada'
  | 'identidade.sincronizada'
  | 'identidade.vinculada'
  | 'identidade.falha'

/** Conta devolvida pela API, com um aviso quando a parte do Keycloak não pôde ser concluída. */
export type AccountWithNotice = Account & { aviso?: string }

const NOT_IN_KEYCLOAK = 'Esta conta ainda não está vinculada a um usuário do Keycloak. Use "Sincronizar com o Keycloak" para criar ou vincular o acesso.'

/**
 * Mantém a identidade da pessoa no Keycloak alinhada com a conta do AQR. A conta do AQR é a
 * fonte da verdade (papel e situação); o Keycloak só autentica. Nenhuma senha passa por aqui: a
 * pessoa define a própria senha pelo link que o Keycloak envia por e-mail.
 */
export class IdentityProvisioner {
  private readonly provider: IdentityProvider
  private readonly insertEvent: ReturnType<Database['prepare']>
  private readonly db: Database

  constructor(provider: IdentityProvider, db: Database) {
    this.provider = provider
    this.db = db
    this.insertEvent = db.prepare(
      'INSERT INTO access_events (id, ocorrido_em, evento, usuario, conta_id, ator_id, detalhe) VALUES (?, ?, ?, ?, ?, ?, ?)',
    )
  }

  private record(evento: IdentityEvent, account: Pick<Account, 'id' | 'usuario'>, actorId: string | null, detalhe: string | null = null): void {
    this.insertEvent.run(randomUUID(), new Date().toISOString(), evento, account.usuario, account.id, actorId, detalhe)
  }

  /**
   * Vincula a conta ao `sub` do Keycloak (uma única vez, para sempre). Se a conta já estiver
   * vinculada a outro `sub`, ou o `sub` a outra conta, recusa: nunca sobrescreve um vínculo.
   */
  bind(account: Pick<Account, 'id' | 'usuario'>, sub: string, actorId: string | null): void {
    let changes: number | bigint
    try {
      changes = this.db.prepare('UPDATE accounts SET keycloak_sub = ? WHERE id = ? AND keycloak_sub IS NULL').run(sub, account.id).changes
    } catch {
      throw new ApiError(409, 'VINCULO_DIVERGENTE', 'Esta identidade do Keycloak já está vinculada a outra conta do AQR.')
    }
    if (Number(changes) === 0) {
      const current = this.db.prepare('SELECT keycloak_sub FROM accounts WHERE id = ?').get(account.id)
      if (current?.keycloak_sub !== sub) {
        throw new ApiError(409, 'VINCULO_DIVERGENTE', 'A conta já está vinculada a outra identidade do Keycloak. O vínculo não pode ser trocado.')
      }
      return
    }
    this.record('identidade.vinculada', account, actorId, `sub=${sub}`)
  }

  /**
   * Vincula uma conta antiga ao usuário que já existe no Keycloak. A identidade é conferida pelo
   * e-mail: o do Keycloak precisa ser o da conta e estar confirmado (senão a própria pessoa poderia
   * trocar o e-mail no Keycloak para o de outra conta e ganhar o vínculo). `allowWithoutEmail` é só para o operador no
   * servidor (`npm run admin:vincular`), para contas criadas sem e-mail (ex.: o primeiro administrador).
   */
  async linkExisting(account: Account, actorId: string | null, options: { allowWithoutEmail?: boolean } = {}): Promise<string> {
    const found = await this.provider.findUser(account.usuario)
    if (!found) throw new ApiError(409, 'NOT_IN_KEYCLOAK', NOT_IN_KEYCLOAK)
    const sameEmail = account.email !== null && found.email !== null && account.email.toLowerCase() === found.email.toLowerCase()
    if (sameEmail && !found.emailVerified) {
      throw new ApiError(
        409,
        'EMAIL_NAO_CONFIRMADO',
        'O e-mail do usuário no Keycloak ainda não foi confirmado. Confirme-o no Keycloak (ou peça à pessoa para confirmar) antes de vincular: o vínculo não pode ser desfeito.',
      )
    }
    if (!sameEmail && !(options.allowWithoutEmail && account.email === null)) {
      throw new ApiError(
        409,
        'EMAIL_DIVERGENTE',
        'O e-mail do usuário no Keycloak não é o da conta do AQR. Corrija um dos dois antes de vincular: o vínculo não pode ser desfeito.',
      )
    }
    this.bind(account, found.id, actorId)
    return found.id
  }

  /** O `sub` a que a conta está vinculada, ou null (contas antigas ainda sem vínculo). */
  private boundSub(accountId: string): string | null {
    const row = this.db.prepare('SELECT keycloak_sub FROM accounts WHERE id = ?').get(accountId)
    return typeof row?.keycloak_sub === 'string' ? row.keycloak_sub : null
  }

  private fail(account: Account, actorId: string, error: unknown, message: string): string {
    this.record('identidade.falha', account, actorId, error instanceof Error ? error.message : 'erro desconhecido')
    return message
  }

  /** Cria o usuário no Keycloak antes da conta existir no AQR (sem conta no AQR ninguém entra, então a ordem é segura). */
  async createUser(profile: IdentityProfile): Promise<string> {
    try {
      return await this.provider.createUser(profile)
    } catch (error) {
      if (error instanceof IdentityError && error.status === 409) {
        throw new ApiError(409, 'USERNAME_TAKEN', 'Este usuário ou e-mail já existe no Keycloak.', {
          fields: { usuario: 'Este usuário ou e-mail já existe no Keycloak.' },
        })
      }
      throw new ApiError(502, 'IDENTITY_UNAVAILABLE', 'Não foi possível criar o acesso no Keycloak. Nenhuma conta foi criada; tente de novo em instantes.')
    }
  }

  /** Desfaz a criação no Keycloak quando a conta não pôde ser gravada no AQR. */
  async rollbackUser(id: string): Promise<void> {
    await this.provider.deleteUser(id).catch(() => undefined)
  }

  async afterCreate(account: Account, keycloakId: string, actorId: string): Promise<AccountWithNotice> {
    this.bind(account, keycloakId, actorId)
    this.record('identidade.criada', account, actorId)
    try {
      await this.provider.sendPasswordEmail(keycloakId)
      this.record('identidade.convite_enviado', account, actorId)
      return account
    } catch (error) {
      return {
        ...account,
        aviso: this.fail(account, actorId, error, 'Conta criada, mas o e-mail de convite não foi enviado. Use "Enviar link para definir a senha" na página da conta.'),
      }
    }
  }

  async afterStatusChange(account: Account, actorId: string): Promise<AccountWithNotice> {
    const active = account.situacao === 'ativa'
    // Desativada, a conta perde na hora as sessões abertas no AQR: nem um cookie antigo volta a
    // valer se ela for reativada depois.
    if (!active) this.db.prepare('DELETE FROM sessions WHERE account_id = ?').run(account.id)
    try {
      const id = this.boundSub(account.id)
      if (!id) return { ...account, aviso: this.fail(account, actorId, new Error('usuário ausente'), NOT_IN_KEYCLOAK) }
      await this.provider.setEnabled(id, active)
      if (!active) await this.provider.logoutUser(id)
      this.record(active ? 'identidade.reativada' : 'identidade.bloqueada', account, actorId)
      return account
    } catch (error) {
      return {
        ...account,
        aviso: this.fail(
          account,
          actorId,
          error,
          `Situação alterada no AQR${active ? '' : ' (o acesso já está bloqueado)'}, mas o Keycloak não foi atualizado. Use "Sincronizar com o Keycloak" para concluir.`,
        ),
      }
    }
  }

  async afterUpdate(account: Account, actorId: string): Promise<AccountWithNotice> {
    if (!account.email) return account
    try {
      const id = this.boundSub(account.id)
      if (!id) return { ...account, aviso: this.fail(account, actorId, new Error('usuário ausente'), NOT_IN_KEYCLOAK) }
      await this.provider.updateProfile(id, { usuario: account.usuario, nome: account.nome, email: account.email })
      return account
    } catch (error) {
      return { ...account, aviso: this.fail(account, actorId, error, 'Conta salva no AQR, mas nome e e-mail não foram atualizados no Keycloak. Use "Sincronizar com o Keycloak".') }
    }
  }

  /** Reenvia o e-mail para a pessoa definir (ou redefinir) a senha. Recusa conta inativa ou sem e-mail. */
  async sendPasswordEmail(account: Account, actorId: string): Promise<void> {
    if (account.situacao !== 'ativa') {
      throw new ApiError(422, 'ACCOUNT_INACTIVE', 'A conta está desativada. Reative-a antes de enviar o link de senha.')
    }
    if (!account.email) {
      throw new ApiError(422, 'EMAIL_REQUIRED', 'A conta não tem e-mail. Edite a conta e informe o e-mail antes de enviar o link.')
    }
    try {
      const id = this.boundSub(account.id)
      if (!id) throw new ApiError(409, 'NOT_IN_KEYCLOAK', NOT_IN_KEYCLOAK)
      // Redefinir senha costuma ser resposta a um acesso indevido: encerra já as sessões da conta no
      // AQR (valem em seguida) e, se possível, as do Keycloak, antes mesmo de o e-mail sair.
      this.db.prepare('DELETE FROM sessions WHERE account_id = ?').run(account.id)
      await this.provider.logoutUser(id).catch(() => undefined)
      await this.provider.sendPasswordEmail(id)
      this.record('identidade.senha_redefinicao_enviada', account, actorId, 'sessoes_encerradas')
    } catch (error) {
      if (error instanceof ApiError) throw error
      this.record('identidade.falha', account, actorId, error instanceof Error ? error.message : 'erro')
      throw new ApiError(502, 'IDENTITY_UNAVAILABLE', 'Não foi possível enviar o e-mail agora. Tente de novo em instantes.')
    }
  }

  /** Alinha o Keycloak com a conta: cria o usuário (e envia o convite) se faltar; senão, situação e dados. */
  async sync(account: Account, actorId: string): Promise<AccountWithNotice> {
    if (!account.email) {
      throw new ApiError(422, 'EMAIL_REQUIRED', 'A conta não tem e-mail. Edite a conta e informe o e-mail antes de sincronizar.')
    }
    const profile = { usuario: account.usuario, nome: account.nome, email: account.email }
    try {
      const bound = this.boundSub(account.id)
      const byName = bound ? null : await this.provider.findUser(account.usuario)
      if (!bound && !byName) {
        const id = await this.provider.createUser(profile)
        this.bind(account, id, actorId)
        if (account.situacao === 'inativa') await this.provider.setEnabled(id, false)
        this.record('identidade.criada', account, actorId)
        if (account.situacao === 'ativa') {
          await this.provider.sendPasswordEmail(id)
          this.record('identidade.convite_enviado', account, actorId)
        }
        return account
      }
      // Conta já vinculada: usa sempre o sub gravado (nunca procura pelo nome). Senão, vincula conferindo o e-mail.
      const target = bound ?? (await this.linkExisting(account, actorId))
      await this.provider.updateProfile(target, profile)
      await this.provider.setEnabled(target, account.situacao === 'ativa')
      this.record('identidade.sincronizada', account, actorId)
      return account
    } catch (error) {
      if (error instanceof ApiError) throw error
      this.record('identidade.falha', account, actorId, error instanceof Error ? error.message : 'erro')
      throw new ApiError(502, 'IDENTITY_UNAVAILABLE', 'Não foi possível sincronizar com o Keycloak agora. Tente de novo em instantes.')
    }
  }
}
