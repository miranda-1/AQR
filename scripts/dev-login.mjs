// `npm run dev:login`: o AQR com o login real, sem precisar saber do Keycloak.
// Sobe o Keycloak e o Mailpit (docker/dev/compose.yml), espera o Keycloak responder e inicia o site e a
// API com as variáveis de docker/dev/aqr-login.env. Os e-mails (convites e "Esqueceu a senha?") ficam
// em http://localhost:8025. SÓ DESENVOLVIMENTO.
import { spawn, spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
process.loadEnvFile(fileURLToPath(new URL('../docker/dev/aqr-login.env', import.meta.url)))

console.log('Subindo o sistema de login (Keycloak) e a caixa de e-mails de teste (Mailpit)…')
const up = spawnSync('docker', ['compose', '-f', 'docker/dev/compose.yml', 'up', '-d'], { cwd: root, stdio: 'inherit' })
if (up.status !== 0) {
  console.error(
    '\nNão foi possível subir os contêineres. Confira se o Docker está instalado e rodando e se o seu usuário pode usá-lo\n' +
      '(no Linux: sudo usermod -aG docker $USER e entre de novo na sessão).',
  )
  process.exit(1)
}

// O Keycloak leva alguns segundos (às vezes mais de um minuto na primeira vez) para importar o realm.
const realm = `${process.env.KEYCLOAK_ISSUER}/.well-known/openid-configuration`
const deadline = Date.now() + 180_000
process.stdout.write('Esperando o Keycloak responder')
for (;;) {
  const ready = await fetch(realm).then((res) => res.ok, () => false)
  if (ready) break
  if (Date.now() > deadline) {
    console.error('\nO Keycloak não respondeu em 3 minutos. Veja o log: docker compose -f docker/dev/compose.yml logs keycloak')
    process.exit(1)
  }
  process.stdout.write('.')
  await new Promise((resolve) => setTimeout(resolve, 2000))
}
console.log(' pronto.\n')
console.log('Site: http://localhost:5173  ·  E-mails de teste: http://localhost:8025')
console.log('Primeiro acesso? Em outro terminal: npm run login:criar-admin -- --usuario <login> --nome "<Nome>" --email <e-mail>\n')

const child = spawn(process.execPath, ['scripts/dev.mjs', ...process.argv.slice(2)], { cwd: root, env: process.env, stdio: 'inherit' })
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal))
child.on('exit', (code) => process.exit(code ?? 0))
