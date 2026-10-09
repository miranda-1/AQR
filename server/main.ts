import { buildApp } from './app.ts'
import { loadConfig } from './config.ts'

const config = loadConfig(process.env)
const app = await buildApp(config)

async function shutdown() {
  await app.close()
  process.exit(0)
}

process.once('SIGINT', () => void shutdown())
process.once('SIGTERM', () => void shutdown())

try {
  await app.listen({ host: config.host, port: config.port })
} catch (error) {
  app.log.error(error)
  process.exit(1)
}
