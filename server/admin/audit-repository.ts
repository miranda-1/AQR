import type { AuditAction, AuditEvent } from '../../shared/contracts/admin.ts'
import { integerColumn, optionalTextColumn, textColumn, type Database, type Row } from '../db/database.ts'

const ACTIONS: readonly AuditAction[] = ['conta.criada', 'conta.editada', 'conta.papel_alterado', 'conta.desativada', 'conta.reativada']

function toAction(value: string): AuditAction {
  const action = ACTIONS.find((item) => item === value)
  if (!action) throw new Error(`Ação de auditoria inválida no banco: ${value}`)
  return action
}

function toOrigin(value: string): AuditEvent['ator']['origem'] {
  if (value === 'dev' || value === 'real' || value === 'sistema') return value
  throw new Error(`Origem inválida no banco: ${value}`)
}

function parseDetails(value: string): AuditEvent['detalhes'] {
  const parsed: unknown = JSON.parse(value)
  return typeof parsed === 'object' && parsed !== null ? (parsed as AuditEvent['detalhes']) : {}
}

function rowToEvent(row: Row): AuditEvent {
  return {
    id: textColumn(row, 'id'),
    ocorridoEm: textColumn(row, 'ocorrido_em'),
    ator: { id: optionalTextColumn(row, 'ator_id'), rotulo: textColumn(row, 'ator_rotulo'), origem: toOrigin(textColumn(row, 'ator_origem')) },
    acao: toAction(textColumn(row, 'acao')),
    alvo: { tipo: 'conta', id: textColumn(row, 'alvo_id'), rotulo: textColumn(row, 'alvo_rotulo') },
    detalhes: parseDetails(textColumn(row, 'detalhes')),
  }
}

export interface AuditFilter {
  contaId?: string
  acao?: AuditAction
  limit: number
  offset: number
}

/** Trilha de auditoria: só inserção e leitura (o banco recusa alterar ou apagar). */
export class AuditRepository {
  private readonly db: Database

  constructor(db: Database) {
    this.db = db
  }

  insert(event: AuditEvent): void {
    this.db
      .prepare(
        `INSERT INTO audit_events (id, ocorrido_em, ator_id, ator_rotulo, ator_origem, acao, alvo_tipo, alvo_id, alvo_rotulo, detalhes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        event.id,
        event.ocorridoEm,
        event.ator.id,
        event.ator.rotulo,
        event.ator.origem,
        event.acao,
        event.alvo.tipo,
        event.alvo.id,
        event.alvo.rotulo,
        JSON.stringify(event.detalhes),
      )
  }

  list(filter: AuditFilter): { items: AuditEvent[]; total: number } {
    const conditions: string[] = []
    const params: Record<string, string | number> = {}
    if (filter.contaId) {
      conditions.push('alvo_id = :contaId')
      params.contaId = filter.contaId
    }
    if (filter.acao) {
      conditions.push('acao = :acao')
      params.acao = filter.acao
    }
    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
    const totalRow = this.db.prepare(`SELECT count(*) AS n FROM audit_events ${where}`).get(params)
    const rows = this.db
      .prepare(`SELECT * FROM audit_events ${where} ORDER BY ocorrido_em DESC, rowid DESC LIMIT :limit OFFSET :offset`)
      .all({ ...params, limit: filter.limit, offset: filter.offset })
    return { items: rows.map(rowToEvent), total: totalRow ? integerColumn(totalRow, 'n') : 0 }
  }
}
