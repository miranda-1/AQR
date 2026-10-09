/**
 * Garante que um valor existe em testes, sem recorrer a "!". Mesmo papel de `defined()` em
 * `src/test/files.ts`, que pertence ao projeto do frontend (outro tsconfig).
 */
export function defined<T>(value: T | null | undefined, label = 'valor'): T {
  if (value === null || value === undefined) throw new Error(`${label} ausente no teste`)
  return value
}
