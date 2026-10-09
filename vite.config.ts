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
    proxy: { '/api': 'http://127.0.0.1:3000' },
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
        },
      },
    ],
  },
})
