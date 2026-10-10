import type { FastifyInstance, FastifyRequest, preHandlerAsyncHookHandler } from 'fastify'
import { accessEventTypes, type AccessEvent, type AccessEventType, type ComparisonUsage } from '../../shared/contracts/admin.ts'
import { integerColumn, optionalTextColumn, textColumn, type Database, type Row } from '../db/database.ts'
import { ApiError } from '../http/errors.ts'

const MAX_PAGE_SIZE = 100

function positiveInt(value: unknown, fallback: number, max: number): number {
  const n = typeof value === 'string' && /^\d{1,7}$/u.test(value) ? Number.parseInt(value, 10) : NaN
  return Number.isInteger(n) && n >= 1 ? Math.min(n, max) : fallback
}

function paging(request: FastifyRequest): { page: number; pageSize: number; offset: number } {
  const query = request.query as Record<string, unknown>
  const pageSize = positiveInt(query.pageSize, 20, MAX_PAGE_SIZE)
  const page = positiveInt(query.page, 1, 1_000_000)
  return { page, pageSize, offset: (page - 1) * pageSize }
}

function text(request: FastifyRequest, key: string): string | null {
  const value = (request.query as Record<string, unknown>)[key]
  if (value === undefined || value === '') return null
  if (typeof value !== 'string' || value.length > 100) throw new ApiError(400, 'VALIDATION_FAILED', `O filtro "${key}" é inválido.`)
  return value.trim() || null
}

const isAccessEventType = (value: string): value is AccessEventType => (accessEventTypes as readonly string[]).includes(value)

interface EventTable<T> {
  path: string
  /** Tabela (apelido `e`) e junções; os filtros usam `e.evento` e `e.usuario`. */
  from: string
  select: string
  events: readonly string[]
  map: (row: Row) => T
}

function register<T>(admin: FastifyInstance, db: Database, onlyAdmins: preHandlerAsyncHookHandler, spec: EventTable<T>): void {
  admin.get(spec.path, { preHandler: onlyAdmins }, async (request) => {
    const { page, pageSize, offset } = paging(request)
    const evento = text(request, 'evento')
    if (evento && !spec.events.includes(evento)) throw new ApiError(400, 'VALIDATION_FAILED', 'O filtro "evento" é inválido.')
    const usuario = text(request, 'usuario')
    const where = [evento ? 'e.evento = ?' : '', usuario ? 'e.usuario = ? COLLATE NOCASE' : ''].filter(Boolean)
    const clause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : ''
    const params = [evento, usuario].filter((value): value is string => value !== null)
    const total = integerColumn(db.prepare(`SELECT count(*) AS n FROM ${spec.from} ${clause}`).get(...params) ?? {}, 'n')
    const rows = db
      .prepare(`SELECT ${spec.select} FROM ${spec.from} ${clause} ORDER BY e.ocorrido_em DESC, e.id DESC LIMIT ? OFFSET ?`)
      .all(...params, pageSize, offset)
    return { items: rows.map(spec.map), total, page, pageSize }
  })
}

const optionalInt = (row: Row, column: string): number | null => (row[column] === null || row[column] === undefined ? null : integerColumn(row, column))

/** Registros de acesso e de comparações: somente leitura e somente para administradores. */
export function registerEventRoutes(admin: FastifyInstance, db: Database, onlyAdmins: preHandlerAsyncHookHandler): void {
  // Quantas comparações cada pessoa fez no período guardado (1 ano), da mais ativa à menos ativa.
  const usage = db.prepare(`
    SELECT e.conta_id, coalesce(a.usuario, e.usuario) AS usuario, a.nome,
           sum(e.evento = 'comparacao.enviada') AS total,
           sum(e.evento = 'comparacao.enviada' AND e.ocorrido_em >= strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-30 days')) AS ultimos_30,
           sum(e.evento = 'comparacao.concluida') AS concluidas,
           sum(e.evento = 'comparacao.falhou') AS falhas,
           max(e.ocorrido_em) AS ultima_em
      FROM comparison_events e LEFT JOIN accounts a ON a.id = e.conta_id
     GROUP BY e.conta_id
    HAVING total > 0
     ORDER BY total DESC, ultima_em DESC
     LIMIT 500`)
  admin.get('/api/admin/comparison-events/resumo', { preHandler: onlyAdmins }, async (): Promise<{ items: ComparisonUsage[] }> => ({
    items: usage.all().map((row) => ({
      contaId: optionalTextColumn(row, 'conta_id'),
      usuario: optionalTextColumn(row, 'usuario'),
      nome: optionalTextColumn(row, 'nome'),
      total: integerColumn(row, 'total'),
      ultimos30Dias: integerColumn(row, 'ultimos_30'),
      concluidas: integerColumn(row, 'concluidas'),
      falhas: integerColumn(row, 'falhas'),
      ultimaEm: textColumn(row, 'ultima_em'),
    })),
  }))

  register<AccessEvent>(admin, db, onlyAdmins, {
    path: '/api/admin/access-events',
    from: 'access_events e LEFT JOIN accounts ator ON ator.id = e.ator_id',
    select: 'e.*, ator.usuario AS ator_usuario',
    events: accessEventTypes,
    map: (row) => {
      const evento = textColumn(row, 'evento')
      const atorId = optionalTextColumn(row, 'ator_id')
      return {
        id: textColumn(row, 'id'),
        ocorridoEm: textColumn(row, 'ocorrido_em'),
        evento: isAccessEventType(evento) ? evento : 'login.falha',
        usuario: optionalTextColumn(row, 'usuario'),
        contaId: optionalTextColumn(row, 'conta_id'),
        ator: atorId ? { id: atorId, usuario: optionalTextColumn(row, 'ator_usuario') } : null,
        ip: optionalTextColumn(row, 'ip'),
        detalhe: optionalTextColumn(row, 'detalhe'),
      }
    },
  })
  register(admin, db, onlyAdmins, {
    path: '/api/admin/comparison-events',
    from: 'comparison_events e',
    select: 'e.*',
    events: ['comparacao.enviada', 'comparacao.concluida', 'comparacao.falhou'],
    map: (row) => ({
      id: textColumn(row, 'id'),
      ocorridoEm: textColumn(row, 'ocorrido_em'),
      evento: textColumn(row, 'evento'),
      usuario: optionalTextColumn(row, 'usuario'),
      contaId: optionalTextColumn(row, 'conta_id'),
      comparacaoId: textColumn(row, 'comparacao_id'),
      diferencas: optionalInt(row, 'diferencas'),
      detalhe: optionalTextColumn(row, 'detalhe'),
    }),
  })
}
