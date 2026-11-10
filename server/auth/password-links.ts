import { createHash, randomBytes } from 'node:crypto'
import { integerColumn, textColumn, transaction, type Database } from '../db/database.ts'

/**
 * Links do próprio AQR para a pessoa definir a senha (convite) ou criar uma nova (recuperação).
 * O código do link é aleatório (256 bits) e só o hash dele fica no banco. Cada link vale uma vez,
 * vence sozinho e, ao emitir outro, os anteriores da mesma conta deixam de valer.
 */

export type LinkPurpose = 'convite' | 'recuperacao'

export const LINK_LIFETIME_MS: Record<LinkPurpose, number> = {
  convite: 72 * 3600_000,
  recuperacao: 3600_000,
}

/** Página do AQR que recebe o link. O código vai depois do `#`, que não chega a servidores nem a logs. */
export const SET_PASSWORD_PATH = '/definir-senha'

export interface PasswordLink {
  accountId: string
  finalidade: LinkPurpose
}

const hashOf = (token: string): string => createHash('sha256').update(token).digest('hex')
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/u

export class PasswordLinks {
  private readonly db: Database
  private readonly appBaseUrl: string
  private readonly now: () => number

  constructor(db: Database, appBaseUrl: string, now: () => number = Date.now) {
    this.db = db
    this.appBaseUrl = appBaseUrl
    this.now = now
  }

  /** Emite um link novo para a conta e devolve o endereço completo para o e-mail. */
  issue(accountId: string, finalidade: LinkPurpose): string {
    const token = randomBytes(32).toString('base64url')
    const now = this.now()
    transaction(this.db, () => {
      this.revokeAll(accountId)
      this.db
        .prepare('INSERT INTO password_links (token_hash, account_id, finalidade, criado_em, expira_em) VALUES (?, ?, ?, ?, ?)')
        .run(hashOf(token), accountId, finalidade, new Date(now).toISOString(), now + LINK_LIFETIME_MS[finalidade])
    })
    const url = new URL(SET_PASSWORD_PATH, this.appBaseUrl)
    url.hash = token
    return url.href
  }

  /** O link, se ainda vale (não usado e não vencido); `null` em qualquer outro caso. */
  find(token: string): PasswordLink | null {
    if (!TOKEN_PATTERN.test(token)) return null
    const row = this.db
      .prepare('SELECT account_id, finalidade FROM password_links WHERE token_hash = ? AND usado_em IS NULL AND expira_em > ?')
      .get(hashOf(token), this.now())
    if (!row) return null
    const finalidade = textColumn(row, 'finalidade')
    return { accountId: textColumn(row, 'account_id'), finalidade: finalidade === 'convite' ? 'convite' : 'recuperacao' }
  }

  /** Marca o link como usado e invalida os demais da conta. Devolve falso se ele já não valia. */
  consume(token: string, accountId: string): boolean {
    if (!TOKEN_PATTERN.test(token)) return false
    return transaction(this.db, () => {
      const changes = this.db
        .prepare('UPDATE password_links SET usado_em = ? WHERE token_hash = ? AND account_id = ? AND usado_em IS NULL AND expira_em > ?')
        .run(new Date(this.now()).toISOString(), hashOf(token), accountId, this.now()).changes
      if (Number(changes) === 0) return false
      this.revokeAll(accountId)
      return true
    })
  }

  /** Nenhum link da conta vale mais (conta desativada, senha definida ou link novo emitido). */
  revokeAll(accountId: string): void {
    this.db.prepare('UPDATE password_links SET usado_em = ? WHERE account_id = ? AND usado_em IS NULL').run(new Date(this.now()).toISOString(), accountId)
  }

  /** Apaga links vencidos ou usados há mais de 1 dia (limpeza periódica). */
  purge(): void {
    const cutoff = this.now() - 24 * 3600_000
    this.db.prepare('DELETE FROM password_links WHERE expira_em < ? OR (usado_em IS NOT NULL AND usado_em < ?)').run(cutoff, new Date(cutoff).toISOString())
  }

  /** Quantos links válidos a conta tem (testes e diagnóstico). */
  activeCount(accountId: string): number {
    const row = this.db.prepare('SELECT count(*) AS n FROM password_links WHERE account_id = ? AND usado_em IS NULL AND expira_em > ?').get(accountId, this.now())
    return row ? integerColumn(row, 'n') : 0
  }
}

/** Texto do e-mail com o link (sem HTML: nada a renderizar nem a rastrear). */
export function passwordEmail(finalidade: LinkPurpose, nome: string, url: string): { assunto: string; texto: string } {
  const primeiroNome = nome.trim().split(/\s+/u)[0] ?? nome
  if (finalidade === 'convite') {
    return {
      assunto: 'Seu acesso ao AQR',
      texto: [
        `Olá, ${primeiroNome}.`,
        '',
        'Uma conta foi criada para você no AQR (Análise e Qualificação de Requerimentos).',
        'Para começar, defina sua senha pelo link abaixo. Ele vale por 72 horas e só pode ser usado uma vez.',
        '',
        url,
        '',
        'Se você não esperava este e-mail, ignore-o.',
      ].join('\n'),
    }
  }
  return {
    assunto: 'Nova senha do AQR',
    texto: [
      `Olá, ${primeiroNome}.`,
      '',
      'Recebemos um pedido para criar uma nova senha para sua conta no AQR.',
      'Use o link abaixo. Ele vale por 1 hora e só pode ser usado uma vez.',
      '',
      url,
      '',
      'Se não foi você que pediu, ignore este e-mail: sua senha atual continua valendo.',
    ].join('\n'),
  }
}
