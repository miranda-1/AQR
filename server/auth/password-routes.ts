import { randomUUID } from 'node:crypto'
import type { FastifyInstance, FastifyRequest } from 'fastify'
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH, type PasswordLinkInfo } from '../../shared/contracts/auth.ts'
import { optionalTextColumn, textColumn, type Database } from '../db/database.ts'
import { ApiError } from '../http/errors.ts'
import { IdentityError, type IdentityProvider } from './identity-provider.ts'
import { createAttemptLimiter } from './keycloak-auth.ts'
import type { Mailer } from './mailer.ts'
import { passwordEmail, type PasswordLinks } from './password-links.ts'

/**
 * Senha pelas páginas do próprio AQR (o Keycloak fica escondido):
 * - `POST /api/auth/senha/esqueci`: envia o link de nova senha. A resposta é sempre a mesma, exista
 *   a conta ou não, para não revelar quem tem acesso; o e-mail sai em segundo plano.
 * - `POST /api/auth/senha/verificar`: diz se o link ainda vale e de quem é (a página mostra o usuário).
 * - `POST /api/auth/senha/definir`: grava a senha no Keycloak, invalida o link e encerra as sessões.
 * O código do link vai no corpo do pedido, nunca no endereço (não aparece em logs).
 */

export interface PasswordRoutesOptions {
  db: Database
  identity: IdentityProvider
  links: PasswordLinks
  mailer: Mailer
  /** Pedidos aceitos por origem (IP ou bloco /64 do IPv6), a cada minuto. */
  attemptsPerMinute: number
}

type PasswordEvent = 'senha.recuperacao_pedida' | 'senha.definida'

const LINK_INVALIDO = 'Este link não vale mais: ele já foi usado, venceu ou foi substituído por outro. Peça um novo na tela de entrada, em "Esqueceu a senha?".'
const MUITOS = 'Foram muitas tentativas em pouco tempo. Aguarde um minuto e tente de novo.'

function readString(body: unknown, key: string): string {
  if (typeof body !== 'object' || body === null || !(key in body)) return ''
  const value: unknown = (body as Record<string, unknown>)[key]
  return typeof value === 'string' ? value : ''
}

export function registerPasswordRoutes(app: FastifyInstance, options: PasswordRoutesOptions): void {
  const { db, identity, links, mailer } = options
  const tooMany = createAttemptLimiter(options.attemptsPerMinute)
  const guard = (request: FastifyRequest) => {
    if (tooMany(request.ip)) throw new ApiError(429, 'MUITAS_TENTATIVAS', MUITOS)
  }
  const insertEvent = db.prepare('INSERT INTO access_events (id, ocorrido_em, evento, usuario, conta_id, ip, detalhe) VALUES (?, ?, ?, ?, ?, ?, ?)')
  const record = (evento: PasswordEvent, request: FastifyRequest, usuario: string | null, contaId: string | null, detalhe: string) => {
    insertEvent.run(randomUUID(), new Date().toISOString(), evento, usuario, contaId, request.ip, detalhe)
  }
  const findForReset = db.prepare('SELECT id, usuario, nome, email, situacao, keycloak_sub FROM accounts WHERE usuario = ? COLLATE NOCASE OR email = ? COLLATE NOCASE')
  const findById = db.prepare('SELECT id, usuario, nome, situacao, keycloak_sub FROM accounts WHERE id = ?')

  /** O link e a conta dele, só se o link vale e a conta está ativa e com acesso. */
  const resolveLink = (codigo: string) => {
    const link = links.find(codigo)
    const row = link ? findById.get(link.accountId) : undefined
    if (!link || !row || textColumn(row, 'situacao') !== 'ativa') return null
    const sub = optionalTextColumn(row, 'keycloak_sub')
    if (!sub) return null
    return { link, sub, accountId: textColumn(row, 'id'), usuario: textColumn(row, 'usuario'), nome: textColumn(row, 'nome') }
  }

  app.post('/api/auth/senha/esqueci', async (request, reply) => {
    guard(request)
    const typed = readString(request.body, 'usuario').trim()
    if (!typed || typed.length > 254) throw new ApiError(400, 'VALIDATION_FAILED', 'Informe seu usuário ou e-mail.')
    const row = findForReset.get(typed, typed)
    const usuario = row ? textColumn(row, 'usuario') : typed.toLowerCase()
    const contaId = row ? textColumn(row, 'id') : null
    const email = row ? optionalTextColumn(row, 'email') : null
    const motivo = !row
      ? 'sem_conta'
      : textColumn(row, 'situacao') !== 'ativa'
        ? 'conta_inativa'
        : !email
          ? 'sem_email'
          : !optionalTextColumn(row, 'keycloak_sub')
            ? 'sem_acesso'
            : null
    if (motivo || !row || !email) {
      record('senha.recuperacao_pedida', request, usuario, contaId, motivo ?? 'recusado')
    } else {
      const url = links.issue(textColumn(row, 'id'), 'recuperacao')
      // Em segundo plano: o tempo da resposta não pode revelar se a conta existe.
      void mailer
        .send({ para: email, ...passwordEmail('recuperacao', textColumn(row, 'nome'), url) })
        .then(() => record('senha.recuperacao_pedida', request, usuario, contaId, 'enviado'))
        .catch((error: unknown) => {
          request.log.error({ err: error }, 'Não foi possível enviar o e-mail de nova senha')
          if (db.isOpen) record('senha.recuperacao_pedida', request, usuario, contaId, 'falha_email')
        })
    }
    return reply.status(202).send({ ok: true })
  })

  app.post('/api/auth/senha/verificar', async (request): Promise<PasswordLinkInfo> => {
    guard(request)
    const found = resolveLink(readString(request.body, 'codigo'))
    if (!found) throw new ApiError(410, 'LINK_INVALIDO', LINK_INVALIDO)
    return { finalidade: found.link.finalidade, usuario: found.usuario, nome: found.nome.trim().split(/\s+/u)[0] ?? found.nome }
  })

  app.post('/api/auth/senha/definir', async (request) => {
    guard(request)
    const codigo = readString(request.body, 'codigo')
    const senha = readString(request.body, 'senha')
    const found = resolveLink(codigo)
    if (!found) throw new ApiError(410, 'LINK_INVALIDO', LINK_INVALIDO)
    if (senha.length < PASSWORD_MIN_LENGTH || senha.length > PASSWORD_MAX_LENGTH) {
      throw new ApiError(422, 'SENHA_FRACA', `A senha precisa ter de ${PASSWORD_MIN_LENGTH} a ${PASSWORD_MAX_LENGTH} caracteres.`, {
        fields: { senha: `Use de ${PASSWORD_MIN_LENGTH} a ${PASSWORD_MAX_LENGTH} caracteres.` },
      })
    }
    if (senha.toLowerCase().includes(found.usuario.toLowerCase())) {
      throw new ApiError(422, 'SENHA_FRACA', 'A senha não pode conter o seu usuário.', { fields: { senha: 'A senha não pode conter o seu usuário.' } })
    }
    try {
      await identity.setPassword(found.sub, senha)
    } catch (error) {
      if (error instanceof IdentityError && error.status === 400) {
        throw new ApiError(422, 'SENHA_FRACA', 'Esta senha não atende às regras de segurança. Use uma senha mais longa, misturando letras, números e símbolos, e diferente das anteriores.', {
          fields: { senha: 'Escolha uma senha mais forte.' },
        })
      }
      request.log.error({ err: error }, 'Não foi possível gravar a senha no sistema de login')
      throw new ApiError(503, 'INDISPONIVEL', 'O sistema de login está indisponível agora. Seu link continua valendo; tente de novo em alguns minutos.')
    }
    links.consume(codigo, found.accountId)
    // Senha nova: nenhuma sessão aberta com a senha antiga continua valendo.
    db.prepare('DELETE FROM sessions WHERE account_id = ?').run(found.accountId)
    await identity.logoutUser(found.sub).catch(() => undefined)
    record('senha.definida', request, found.usuario, found.accountId, found.link.finalidade)
    return { usuario: found.usuario }
  })
}
