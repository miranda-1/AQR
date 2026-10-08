import { useEffect } from 'react'
import { appConfig } from '@/config/app'

/** Atualiza o título da aba, importante para leitores de tela ao trocar de página. */
export function useDocumentTitle(pageTitle: string) {
  useEffect(() => {
    document.title = `${pageTitle} | ${appConfig.name}`
  }, [pageTitle])
}
