import { parseArgs } from 'node:util'
import { rowToAccount } from '../admin/account-repository.ts'
import { IdentityProvisioner } from '../admin/identity-sync.ts'
import { KeycloakIdentityProvider } from '../auth/identity-provider.ts'
import { loadConfig } from '../config.ts'
import { openDatabase } from '../db/database.ts'
import { migrate } from '../db/migrate.ts'
import { ApiError } from '../http/errors.ts'

/**
 * `npm run admin:vincular -- --usuario x` (ou `--todos`): vincula contas antigas ao `sub` do usuário
 * correspondente no Keycloak. Roda no servidor, com as mesmas variáveis do AQR (credencial de
 * serviço). Confere o e-mail da conta com o do Keycloak; para contas sem e-mail (como o primeiro
 * administrador) exige `--confirmo-identidade`, declarando que o operador conferiu a pessoa.
 * O vínculo é definitivo: nunca é sobrescrito.
 */
const { values } = parseArgs({
  options: {
    usuario: { type: 'string' },
    todos: { type: 'boolean' },
    'confirmo-identidade': { type: 'boolean' },
  },
})
if (!values.usuario && !values.todos) {
  console.error('Uso: npm run admin:vincular -- --usuario <login> | --todos [--confirmo-identidade]')
  process.exit(1)
}

const config = loadConfig(process.env)
if (!config.keycloak) {
  console.error('Defina AUTH_MODE=keycloak e as variáveis KEYCLOAK_* para vincular contas.')
  process.exit(1)
}
const db = openDatabase(config.databasePath)
let failures = 0
try {
  migrate(db)
  const provisioner = new IdentityProvisioner(
    new KeycloakIdentityProvider({
      issuer: config.keycloak.issuer,
      adminClientId: config.keycloak.adminClientId,
      adminClientSecret: config.keycloak.adminClientSecret,
      appClientId: config.keycloak.clientId,
      appBaseUrl: config.keycloak.appBaseUrl,
    }),
    db,
  )
  const rows = values.todos
    ? db.prepare('SELECT * FROM accounts WHERE keycloak_sub IS NULL ORDER BY usuario').all()
    : db.prepare('SELECT * FROM accounts WHERE usuario = ? COLLATE NOCASE AND keycloak_sub IS NULL').all(values.usuario ?? '')
  if (rows.length === 0) console.log('Nenhuma conta sem vínculo encontrada.')
  for (const row of rows) {
    const account = rowToAccount(row)
    try {
      const sub = await provisioner.linkExisting(account, null, { allowWithoutEmail: values['confirmo-identidade'] === true })
      console.log(`Vinculada: ${account.usuario} → ${sub}`)
    } catch (error) {
      failures += 1
      console.error(`Não vinculada: ${account.usuario}: ${error instanceof ApiError ? error.message : 'falha ao falar com o Keycloak.'}`)
    }
  }
} finally {
  db.close()
}
process.exit(failures > 0 ? 1 : 0)
