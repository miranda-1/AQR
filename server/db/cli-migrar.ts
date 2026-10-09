import { loadConfig } from '../config.ts'
import { openDatabase } from './database.ts'
import { migrate } from './migrate.ts'

/** `npm run db:migrar`: aplica as migrações pendentes no banco configurado (DATABASE_PATH). */
const config = loadConfig(process.env)
const db = openDatabase(config.databasePath)
try {
  const applied = migrate(db)
  console.log(
    applied.length > 0
      ? `Migrações aplicadas em ${config.databasePath}: ${applied.join(', ')}.`
      : `O banco ${config.databasePath} já está atualizado.`,
  )
} finally {
  db.close()
}
