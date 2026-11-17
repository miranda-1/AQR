/// <reference types="vitest/config" />
import { existsSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

const raiz = fileURLToPath(new URL('.', import.meta.url))
const requireDaqui = createRequire(import.meta.url)

/**
 * Motor de comparação no navegador: um import de `server/.../x.ts` que tenha `x.browser.ts` ao
 * lado passa a usar a versão do navegador (ver `server/documents/platform/README.md`).
 */
function versoesDoNavegador(): Plugin {
  const pastaDoServidor = `${path.join(raiz, 'server')}${path.sep}`
  return {
    name: 'aqr-versoes-do-navegador',
    enforce: 'pre',
    async resolveId(source, importer, options) {
      if (!importer || !source.startsWith('.')) return null
      const resolvido = await this.resolve(source, importer, { ...options, skipSelf: true })
      if (!resolvido || !resolvido.id.startsWith(pastaDoServidor) || !resolvido.id.endsWith('.ts') || resolvido.id.endsWith('.browser.ts')) return null
      const doNavegador = resolvido.id.replace(/\.ts$/, '.browser.ts')
      return existsSync(doNavegador) ? doNavegador : null
    },
  }
}

/** Pasta dos arquivos do OCR no site (a mesma de `server/documents/platform/ocr.browser.ts`). */
const PASTA_DO_OCR = 'ocr/7.0.0'

/**
 * Arquivos do OCR no navegador, servidos pelo próprio AQR (nada da CDN do tesseract.js): o worker,
 * o núcleo WebAssembly (variantes só LSTM, com e sem SIMD) e o modelo de português.
 */
function arquivosDoOcr(): Plugin {
  const pasta = (pacote: string) => path.dirname(requireDaqui.resolve(`${pacote}/package.json`))
  const arquivos: Record<string, () => string> = {
    'worker.min.js': () => path.join(pasta('tesseract.js'), 'dist', 'worker.min.js'),
    'tesseract-core-lstm.wasm.js': () => path.join(pasta('tesseract.js-core'), 'tesseract-core-lstm.wasm.js'),
    'tesseract-core-simd-lstm.wasm.js': () => path.join(pasta('tesseract.js-core'), 'tesseract-core-simd-lstm.wasm.js'),
    'tesseract-core-relaxedsimd-lstm.wasm.js': () => path.join(pasta('tesseract.js-core'), 'tesseract-core-relaxedsimd-lstm.wasm.js'),
    'por.traineddata.gz': () => path.join(pasta('@tesseract.js-data/por'), '4.0.0_best_int', 'por.traineddata.gz'),
  }
  const tipo = (nome: string) => (nome.endsWith('.js') ? 'text/javascript' : 'application/gzip')
  return {
    name: 'aqr-arquivos-do-ocr',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const prefixo = `${server.config.base}${PASTA_DO_OCR}/`
        const nome = req.url?.startsWith(prefixo) ? req.url.slice(prefixo.length).split('?')[0] : undefined
        const origem = nome ? arquivos[nome] : undefined
        if (!nome || !origem) return next()
        res.setHeader('Content-Type', tipo(nome))
        res.end(readFileSync(origem()))
      })
    },
    generateBundle() {
      // Só no build do site (o do Web Worker não precisa repetir os arquivos).
      if (this.environment.name !== 'client') return
      for (const [nome, origem] of Object.entries(arquivos)) this.emitFile({ type: 'asset', fileName: `${PASTA_DO_OCR}/${nome}`, source: readFileSync(origem()) })
    },
  }
}

export default defineConfig({
  // No desenvolvimento, o worker do motor passa pelos plugins da página; nos testes (Vitest), o
  // servidor usa sempre as versões do Node.
  plugins: [react(), tailwindcss(), arquivosDoOcr(), ...(process.env.VITEST ? [] : [versoesDoNavegador()])],
  worker: {
    format: 'es',
    plugins: () => [versoesDoNavegador()],
  },
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: {
    // No desenvolvimento, a API (npm run dev:server) fica na mesma origem do site.
    // `AQR_API_URL` permite apontar para outra API (por exemplo, numa porta diferente).
    proxy: { '/api': process.env.AQR_API_URL ?? 'http://127.0.0.1:3000' },
  },
  test: {
    globals: true,
    projects: [
      {
        extends: true,
        test: {
          name: 'frontend',
          environment: 'jsdom',
          include: ['src/**/*.test.{ts,tsx}'],
          setupFiles: ['./src/test/setup.ts'],
          css: false,
          // As telas são testadas com o serviço demonstrativo; o real tem testes próprios.
          env: { VITE_COMPARISON_SERVICE: 'demo' },
        },
      },
      {
        extends: true,
        test: {
          name: 'servidor',
          environment: 'node',
          include: ['server/**/*.test.ts', 'shared/**/*.test.ts', 'scripts/ia-local/**/*.test.ts'],
          exclude: ['server/comparison/evaluation/**'],
        },
      },
      {
        // Corpus sintético com gabarito (texto, imagens, estrutura, aparência, digitalizados).
        extends: true,
        test: {
          name: 'corpus',
          environment: 'node',
          include: ['server/comparison/evaluation/**/*.test.ts'],
        },
      },
      {
        // Ponta a ponta: serviços do frontend contra o servidor real, numa porta de verdade.
        extends: true,
        test: {
          name: 'integracao',
          environment: 'node',
          include: ['tests/integration/**/*.test.ts'],
        },
      },
    ],
  },
})
