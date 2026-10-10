import { randomUUID } from 'node:crypto'
import type { Database } from '../db/database.ts'

/** Quem enviou a comparação (conta do login real). */
export interface ComparisonRequester {
  accountId: string
  usuario: string
}

/** Ponto de ligação da auditoria nas rotas de comparação (as rotas não conhecem o banco). */
export interface ComparisonAudit {
  submitted(id: string, requester: ComparisonRequester): void
  finished(id: string, outcome: { status: 'completed'; differences: number } | { status: 'failed'; reason: string }): void
}

/** Por quanto tempo o registro das comparações é mantido (decisão do responsável). */
export const COMPARISON_EVENTS_RETENTION = '1 ano'

/**
 * Registra, para cada comparação, só quem a pediu, quando e o resultado (número de diferenças ou
 * código do erro). Nada do conteúdo nem os nomes dos arquivos. Só inserção. Falha de registro não
 * derruba a comparação, mas fica no log do servidor.
 */
export function createComparisonAudit(db: Database, log: (message: string, error: unknown) => void): ComparisonAudit {
  const insert = db.prepare(
    `INSERT INTO comparison_events (id, ocorrido_em, evento, conta_id, usuario, comparacao_id, diferencas, detalhe)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  )
  const owner = db.prepare("SELECT conta_id, usuario FROM comparison_events WHERE comparacao_id = ? AND evento = 'comparacao.enviada'")
  const now = () => new Date().toISOString()

  return {
    submitted(id, requester) {
      try {
        insert.run(randomUUID(), now(), 'comparacao.enviada', requester.accountId, requester.usuario, id, null, null)
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
          insert.run(randomUUID(), now(), 'comparacao.concluida', contaId, usuario, id, outcome.differences, null)
        } else {
          insert.run(randomUUID(), now(), 'comparacao.falhou', contaId, usuario, id, null, outcome.reason)
        }
      } catch (error) {
        log('Não foi possível registrar o resultado da comparação na auditoria', error)
      }
    },
  }
}

/** Apaga do registro das comparações o que passou do prazo de retenção (o banco recusa apagar antes). */
export function purgeOldComparisonEvents(db: Database): number {
  const result = db.prepare("DELETE FROM comparison_events WHERE ocorrido_em < strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-1 year')").run()
  return Number(result.changes)
}
