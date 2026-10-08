const sizeFormatter = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 })

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} bytes`
  const kb = bytes / 1024
  if (kb < 1024) return `${sizeFormatter.format(kb)} KB`
  return `${sizeFormatter.format(kb / 1024)} MB`
}

export function pluralize(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`
}
