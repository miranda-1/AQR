import { integerColumn, transaction, type Database } from './database.ts'
import { migration0001 } from './migrations/0001_contas_e_auditoria.ts'
import { migration0006 } from './migrations/0006_inatividade_e_comparacoes_sem_nomes.ts'
import { migration0005 } from './migrations/0005_sem_id_token_e_auditoria_de_comparacoes.ts'
import { migration0004 } from './migrations/0004_vinculo_keycloak_sub.ts'
import { migration0003 } from './migrations/0003_eventos_de_identidade.ts'
import { migration0002 } from './migrations/0002_sessoes_e_eventos_de_acesso.ts'

export interface Migration {
  version: number
  name: string
  sql: string
}

/** Todas as migrações, em ordem. As migrações ficam em código, para irem junto no build. */
export const migrations: readonly Migration[] = [migration0001, migration0002, migration0003, migration0004, migration0005, migration0006]

/**
 * Aplica as migrações que faltam, cada uma na sua transação, e registra em `schema_migrations`.
 * Rodar de novo não faz nada. Devolve as versões aplicadas agora.
 */
export function migrate(db: Database, list: readonly Migration[] = migrations): number[] {
  db.exec(`CREATE TABLE IF NOT EXISTS schema_migrations (
    version    INTEGER PRIMARY KEY,
    name       TEXT NOT NULL,
    applied_at TEXT NOT NULL
  )`)
  const applied = new Set(
    db.prepare('SELECT version FROM schema_migrations').all().map((row) => integerColumn(row, 'version')),
  )
  const done: number[] = []
  for (const migration of [...list].sort((a, b) => a.version - b.version)) {
    if (applied.has(migration.version)) continue
    transaction(db, () => {
      db.exec(migration.sql)
      db.prepare('INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?)').run(
        migration.version,
        migration.name,
        new Date().toISOString(),
      )
    })
    done.push(migration.version)
  }
  return done
}
