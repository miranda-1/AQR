import { mkdirSync } from 'node:fs'
import path from 'node:path'
import { DatabaseSync, type SQLOutputValue } from 'node:sqlite'

export type Database = DatabaseSync
export type Row = Record<string, SQLOutputValue>

/**
 * Abre o banco SQLite (`node:sqlite`, embutido no Node ≥ 22.13). `:memory:` abre um banco
 * temporário (testes). Chaves estrangeiras ligadas e espera curta em caso de bloqueio.
 */
export function openDatabase(location: string): Database {
  if (location !== ':memory:') mkdirSync(path.dirname(path.resolve(location)), { recursive: true })
  const db = new DatabaseSync(location)
  db.exec('PRAGMA foreign_keys = ON')
  db.exec('PRAGMA busy_timeout = 5000')
  if (location !== ':memory:') db.exec('PRAGMA journal_mode = WAL')
  return db
}

/**
 * Executa `work` numa transação: tudo é gravado junto ou nada é gravado. `BEGIN IMMEDIATE`
 * reserva a escrita desde o início, evitando conflito entre duas alterações simultâneas.
 */
export function transaction<T>(db: Database, work: () => T): T {
  db.exec('BEGIN IMMEDIATE')
  try {
    const result = work()
    db.exec('COMMIT')
    return result
  } catch (error) {
    if (db.isTransaction) db.exec('ROLLBACK')
    throw error
  }
}

/** Leitura tipada de colunas, sem conversões silenciosas. */
export function textColumn(row: Row, column: string): string {
  const value = row[column]
  if (typeof value !== 'string') throw new Error(`Coluna ${column} deveria ser texto`)
  return value
}

export function optionalTextColumn(row: Row, column: string): string | null {
  const value = row[column]
  if (value === null || value === undefined) return null
  if (typeof value !== 'string') throw new Error(`Coluna ${column} deveria ser texto`)
  return value
}

export function integerColumn(row: Row, column: string): number {
  const value = row[column]
  if (typeof value === 'bigint') return Number(value)
  if (typeof value !== 'number') throw new Error(`Coluna ${column} deveria ser número`)
  return value
}
