/// <reference types="vitest/config" />
import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
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
          include: ['server/**/*.test.ts', 'shared/**/*.test.ts'],
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
