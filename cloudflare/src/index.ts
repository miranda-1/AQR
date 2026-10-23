import { Container, getContainer } from '@cloudflare/containers'

/**
 * Worker do AQR na Cloudflare. O site (pasta `dist`, gerada por `npm run build`) é servido direto
 * pelos arquivos estáticos da Cloudflare; só `/api/*` chega aqui e segue para o servidor de comparação,
 * que roda num contêiner (o mesmo `Dockerfile` da raiz do projeto).
 */
export class AqrComparador extends Container {
  defaultPort = 3000
  /** Sem uso por 15 min, o contêiner dorme (e para de custar); o próximo pedido o acorda. */
  sleepAfter = '15m'
  /** O comparador não usa a internet (OCR local, sem APIs externas). */
  enableInternet = false
  envVars = {
    NODE_ENV: 'production',
    HOST: '0.0.0.0',
    PORT: '3000',
    LOG_LEVEL: 'info',
    // A instância "standard-1" tem 4 GiB: duas comparações de até 768 MB cada, com folga.
    COMPARISON_WORKERS: '2',
    COMPARISON_WORKER_MEMORY_MB: '768',
  }
}

interface Env {
  AQR_COMPARADOR: DurableObjectNamespace<AqrComparador>
  ASSETS: Fetcher
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const { pathname } = new URL(request.url)
    // Uma instância só: as tarefas de comparação ficam na memória do servidor, então o envio e as
    // consultas ao andamento precisam chegar ao mesmo contêiner.
    if (pathname.startsWith('/api/')) return getContainer(env.AQR_COMPARADOR).fetch(request)
    return env.ASSETS.fetch(request)
  },
} satisfies ExportedHandler<Env>
