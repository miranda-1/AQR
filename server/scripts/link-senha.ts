import { parseArgs } from 'node:util'
import { rowToAccount } from '../admin/account-repository.ts'
import { PasswordLinks } from '../auth/password-links.ts'
import { loadConfig } from '../config.ts'
import { openDatabase, optionalTextColumn } from '../db/database.ts'
import { migrate } from '../db/migrate.ts'

/**
 * `npm run admin:link-senha -- --usuario x`: gera no terminal um link do AQR para a pessoa definir a
 * senha (vale 72 h, uma vez), sem e-mail. Para o operador do servidor, quando o SMTP falhar. Os
 * links anteriores da conta deixam de valer.
 */
const { values } = parseArgs({ options: { usuario: { type: 'string' } } })
if (!values.usuario) {
  console.error('Uso: npm run admin:link-senha -- --usuario <login>')
  process.exit(1)
}

const config = loadConfig(process.env)
if (!config.keycloak) {
  console.error('Defina AUTH_MODE=keycloak e as demais variáveis do login real para gerar links de senha.')
  process.exit(1)
}
const db = openDatabase(config.databasePath)
try {
  migrate(db)
  const row = db.prepare('SELECT * FROM accounts WHERE usuario = ? COLLATE NOCASE').get(values.usuario)
  if (!row) {
    console.error(`Não há conta "${values.usuario}" no AQR.`)
    process.exitCode = 1
  } else if (!optionalTextColumn(row, 'keycloak_sub')) {
    console.error('A conta ainda não tem acesso ao sistema de login. Use "Sincronizar acesso" na administração ou npm run admin:vincular.')
    process.exitCode = 1
  } else if (rowToAccount(row).situacao !== 'ativa') {
    console.error('A conta está desativada. Reative-a antes de gerar o link.')
    process.exitCode = 1
  } else {
    const url = new PasswordLinks(db, config.keycloak.appBaseUrl).issue(rowToAccount(row).id, 'convite')
    console.log(`Link para definir a senha de "${rowToAccount(row).usuario}" (vale 72 h, uma vez):\n${url}`)
  }
} finally {
  db.close()
}
