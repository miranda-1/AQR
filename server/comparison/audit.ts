import { randomUUID } from 'node:crypto'
import type { FastifyRequest } from 'fastify'
import type { AuthProvider } from '../auth/auth-provider.ts'
import type { Database } from '../db/database.ts'

/** Ponto de ligação da auditoria nas rotas de comparação (as rotas não conhecem o banco). */
export interface ComparisonAudit {
  submitted(request: FastifyRequest, info: { id: string; original: string; updated: string }): Promise<void>
  finished(id: string, outcome: { status: 'completed'; differences: number } | { status: 'failed'; reason: string }): void
}

/**
 * Registra, para cada comparação, quem a pediu, quando, os NOMES dos arquivos (nunca o conteúdo) e o
 * resultado. Só inserção. Falha de registro não derruba a comparação, mas fica no log do servidor.
 */
export function createComparisonAudit(db: Database, auth: AuthProvider, log: (message: string, error: unknown) => void): ComparisonAudit {
  const insert = db.prepare(
    `INSERT INTO comparison_events (id, ocorrido_em, evento, conta_id, usuario, comparacao_id, arquivo_original, arquivo_atualizado, diferencas, detalhe)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
  const owner = db.prepare("SELECT conta_id, usuario FROM comparison_events WHERE comparacao_id = ? AND evento = 'comparacao.enviada'")
  const now = () => new Date().toISOString()

  return {
    async submitted(request, info) {
      try {
        const principal = await auth.resolvePrincipal(request)
        insert.run(randomUUID(), now(), 'comparacao.enviada', principal?.accountId ?? null, principal?.usuario ?? null, info.id, info.original, info.updated, null, null)
      } catch (error) {
        log('Não foi possível registrar o envio da comparação na auditoria', error)
      }
    },
    finished(id, outcome) {
      try {
        const who = owner.get(id)
        const contaId = typeof who?.conta_id === 'string' ? who.conta_id : null
        const usuario = typeof who?.usuario === 'string' ? who.usuario : null
        if (outcome.status === 'completed') {
          insert.run(randomUUID(), now(), 'comparacao.concluida', contaId, usuario, id, null, null, outcome.differences, null)
        } else {
          insert.run(randomUUID(), now(), 'comparacao.falhou', contaId, usuario, id, null, null, null, outcome.reason)
        }
      } catch (error) {
        log('Não foi possível registrar o resultado da comparação na auditoria', error)
      }
    },
  }
}
