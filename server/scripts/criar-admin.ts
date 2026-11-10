import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { parseArgs } from 'node:util'
import { loadConfig } from '../config.ts'
import { openDatabase } from '../db/database.ts'
import { migrate } from '../db/migrate.ts'
import { ApiError } from '../http/errors.ts'
import { createFirstAdmin } from '../admin/first-admin.ts'
import { createProvisioner } from './provisioner.ts'

/**
 * `npm run admin:criar -- --usuario x --nome "Nome" [--email a@b.gov.br]`: cria o primeiro
 * administrador. Fica na auditoria com o ator "sistema".
 *
 * Com o login real (`AUTH_MODE=keycloak`), cria também o acesso no Keycloak, já vinculado, e mostra
 * no terminal o link do AQR para a pessoa definir a senha, que também vai para o e-mail (obrigatório).
 * Sem o login real, só grava a conta no banco local, sem rede.
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
  const input = { usuario: values.usuario, nome: values.nome, email: values.email ?? null }
  if (!config.keycloak) {
    const account = createFirstAdmin(db, input)
    console.log(`Administrador "${account.usuario}" criado em ${config.databasePath}.`)
  } else if (!input.email) {
    console.error('Com o login real, informe --email: o link para definir a senha vai para ele.')
    process.exitCode = 1
  } else {
    const { provisioner } = createProvisioner(config.keycloak, db)
    // Mesma ordem da tela de administração: primeiro o acesso no sistema de login; se a conta falhar, desfaz.
    const keycloakId = await provisioner.createUser({ usuario: input.usuario.trim().toLowerCase(), nome: input.nome, email: input.email ?? '' })
    let account
    try {
      account = createFirstAdmin(db, input)
    } catch (error) {
      await provisioner.rollbackUser(keycloakId)
      throw error
    }
    provisioner.bind(account, keycloakId, null)
    console.log(`Administrador "${account.usuario}" criado, com acesso ao sistema de login.`)
    try {
      const url = await provisioner.sendLink(account, 'convite')
      console.log(`Link para definir a senha enviado para ${account.email ?? ''}. Também dá para abrir direto (vale 72 h, uma vez):\n${url}`)
    } catch {
      console.error(`O e-mail com o link não foi enviado (confira as variáveis SMTP_*). Para gerar o link aqui no terminal: npm run admin:link-senha -- --usuario ${account.usuario}`)
      process.exitCode = 1
    }
  }
} catch (error) {
  console.error(error instanceof ApiError ? error.message : `Não foi possível criar o administrador (${error instanceof Error ? error.message : 'erro'}).`)
  process.exitCode = 1
} finally {
  db.close()
}
