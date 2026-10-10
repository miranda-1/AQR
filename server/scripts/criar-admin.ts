import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { parseArgs } from 'node:util'
import { loadConfig } from '../config.ts'
import { openDatabase } from '../db/database.ts'
import { migrate } from '../db/migrate.ts'
import { ApiError } from '../http/errors.ts'
import { createFirstAdmin } from '../admin/first-admin.ts'

/**
 * `npm run admin:criar -- --usuario x --nome "Nome" [--email a@b.gov.br]`: cria o primeiro
 * administrador direto no banco local, sem rede. Fica na auditoria com o ator "sistema".
 */
const { values } = parseArgs({
  options: { usuario: { type: 'string' }, nome: { type: 'string' }, email: { type: 'string' } },
})
if (!values.usuario || !values.nome) {
  console.error('Uso: npm run admin:criar -- --usuario <login> --nome "<Nome completo>" [--email <e-mail>]')
  process.exit(1)
}

const config = loadConfig(process.env)
if (config.databasePath !== ':memory:') mkdirSync(dirname(config.databasePath), { recursive: true })
const db = openDatabase(config.databasePath)
try {
  migrate(db)
  const account = createFirstAdmin(db, { usuario: values.usuario, nome: values.nome, email: values.email ?? null })
  console.log(`Administrador "${account.usuario}" criado em ${config.databasePath}.`)
} catch (error) {
  console.error(error instanceof ApiError ? error.message : 'Não foi possível criar o administrador.')
  process.exitCode = 1
} finally {
  db.close()
}
