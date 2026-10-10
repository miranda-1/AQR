import type { FastifyInstance, FastifyRequest, preHandlerAsyncHookHandler } from 'fastify'
import { integerColumn, optionalTextColumn, textColumn, type Database, type Row } from '../db/database.ts'
import { ApiError } from '../http/errors.ts'

const MAX_PAGE_SIZE = 100

function positiveInt(value: unknown, fallback: number, max: number): number {
  const n = typeof value === 'string' ? Number.parseInt(value, 10) : NaN
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
  return value
}

interface EventTable<T> {
  path: string
  table: 'access_events' | 'comparison_events'
  map: (row: Row) => T
}

function register<T>(admin: FastifyInstance, db: Database, onlyAdmins: preHandlerAsyncHookHandler, spec: EventTable<T>): void {
  admin.get(spec.path, { preHandler: onlyAdmins }, async (request) => {
    const { page, pageSize, offset } = paging(request)
    const evento = text(request, 'evento')
    const usuario = text(request, 'usuario')
    const where = [evento ? 'evento = ?' : '', usuario ? 'usuario = ? COLLATE NOCASE' : ''].filter(Boolean)
    const clause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : ''
    const params = [evento, usuario].filter((value): value is string => value !== null)
    const total = integerColumn(db.prepare(`SELECT count(*) AS n FROM ${spec.table} ${clause}`).get(...params) ?? {}, 'n')
    const rows = db
      .prepare(`SELECT * FROM ${spec.table} ${clause} ORDER BY ocorrido_em DESC, id DESC LIMIT ? OFFSET ?`)
      .all(...params, pageSize, offset)
    return { items: rows.map(spec.map), total, page, pageSize }
  })
}

const optionalInt = (row: Row, column: string): number | null => (row[column] === null || row[column] === undefined ? null : integerColumn(row, column))

/** Registros de acesso e de comparações: somente leitura e somente para administradores. */
export function registerEventRoutes(admin: FastifyInstance, db: Database, onlyAdmins: preHandlerAsyncHookHandler): void {
  register(admin, db, onlyAdmins, {
    path: '/api/admin/access-events',
    table: 'access_events',
    map: (row) => ({
      id: textColumn(row, 'id'),
      ocorridoEm: textColumn(row, 'ocorrido_em'),
      evento: textColumn(row, 'evento'),
      usuario: optionalTextColumn(row, 'usuario'),
      contaId: optionalTextColumn(row, 'conta_id'),
      atorId: optionalTextColumn(row, 'ator_id'),
      ip: optionalTextColumn(row, 'ip'),
      detalhe: optionalTextColumn(row, 'detalhe'),
    }),
  })
  register(admin, db, onlyAdmins, {
    path: '/api/admin/comparison-events',
    table: 'comparison_events',
    map: (row) => ({
      id: textColumn(row, 'id'),
      ocorridoEm: textColumn(row, 'ocorrido_em'),
      evento: textColumn(row, 'evento'),
      usuario: optionalTextColumn(row, 'usuario'),
      contaId: optionalTextColumn(row, 'conta_id'),
      comparacaoId: textColumn(row, 'comparacao_id'),
      arquivoOriginal: optionalTextColumn(row, 'arquivo_original'),
      arquivoAtualizado: optionalTextColumn(row, 'arquivo_atualizado'),
      diferencas: optionalInt(row, 'diferencas'),
      detalhe: optionalTextColumn(row, 'detalhe'),
    }),
  })
}
