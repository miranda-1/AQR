/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** "api" usa o servidor do AQR; "demo" usa o resultado fictício do protótipo. */
  readonly VITE_COMPARISON_SERVICE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
