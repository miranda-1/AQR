import { formatFileSize } from '@/lib/format'

/**
 * Conferência local dos arquivos antes do envio, com os limites que o servidor informa. É só uma
 * ajuda: o servidor confere de novo (tipo real pelo conteúdo, integridade, isolamento de suspeitos).
 */

export interface Limites {
  maxAnexos: number
  maxBytesArquivo: number
  maxBytesPacote: number
}

/** Formatos que a triagem lê; outros são aceitos no pacote, mas conferidos e possivelmente isolados. */
export const FORMATOS_LIDOS: Record<string, string> = {
  pdf: 'PDF',
  jpg: 'JPG',
  jpeg: 'JPG',
  png: 'PNG',
  dwg: 'DWG',
  dxf: 'DXF',
  docx: 'DOCX',
}

export function extensao(nome: string): string {
  const ponto = nome.lastIndexOf('.')
  return ponto > 0 ? nome.slice(ponto + 1).toLowerCase() : ''
}

export interface ArquivoConferido {
  arquivo: File
  formato: string
  avisos: string[]
}

export interface Conferencia {
  arquivos: ArquivoConferido[]
  /** Impedem o envio. */
  erros: string[]
  total: number
}

export function conferirArquivos(arquivos: readonly File[], limites: Limites): Conferencia {
  const erros: string[] = []
  const total = arquivos.reduce((soma, arquivo) => soma + arquivo.size, 0)
  if (arquivos.length > limites.maxAnexos) erros.push(`São ${arquivos.length} arquivos; o limite é de ${limites.maxAnexos} por pacote. Remova ${arquivos.length - limites.maxAnexos}.`)
  if (total > limites.maxBytesPacote) erros.push(`O pacote tem ${formatFileSize(total)}; o limite é de ${formatFileSize(limites.maxBytesPacote)}.`)
  const vistos = new Map<string, number>()
  const conferidos = arquivos.map((arquivo): ArquivoConferido => {
    const avisos: string[] = []
    const ext = extensao(arquivo.name)
    const formato = FORMATOS_LIDOS[ext] ?? (ext ? ext.toUpperCase() : 'sem extensão')
    if (arquivo.size > limites.maxBytesArquivo) erros.push(`${arquivo.name} tem ${formatFileSize(arquivo.size)}; cada arquivo pode ter até ${formatFileSize(limites.maxBytesArquivo)}.`)
    if (arquivo.size === 0) avisos.push('Arquivo vazio: será registrado como ilegível.')
    if (!FORMATOS_LIDOS[ext]) avisos.push('Formato que a triagem não lê: o arquivo será conferido pelo conteúdo e pode ser isolado.')
    const chave = `${arquivo.name}#${arquivo.size}`
    vistos.set(chave, (vistos.get(chave) ?? 0) + 1)
    if ((vistos.get(chave) ?? 0) > 1) avisos.push('Parece repetido (mesmo nome e tamanho de outro arquivo).')
    return { arquivo, formato, avisos }
  })
  return { arquivos: conferidos, erros, total }
}
