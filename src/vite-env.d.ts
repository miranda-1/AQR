/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** "demo" usa o resultado fictício do protótipo; nesta branch (sem servidor), qualquer outro valor compara de verdade no navegador. */
  readonly VITE_COMPARISON_SERVICE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
