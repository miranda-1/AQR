/** Cria um File de teste. Por padrão, um PDF mínimo com assinatura válida. */
export function makeFile(name: string, content = '%PDF-1.4\n%teste\n', type = 'application/pdf'): File {
  return new File([content], name, { type })
}

/** Garante que um valor existe em testes, sem recorrer a "!". */
export function defined<T>(value: T | null | undefined, label = 'valor'): T {
  if (value === null || value === undefined) throw new Error(`${label} ausente no teste`)
  return value
}
