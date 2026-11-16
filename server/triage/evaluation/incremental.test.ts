import { loadCatalog } from '../catalog/catalog.ts'
import { casosDeAvaliacao } from './casos.ts'
import { compararEstrategias } from './incremental.ts'
import { CATALOGO_DIR } from './run.ts'

describe('E10.4: reprocessamento incremental × integral', () => {
  it('o que fica gravado é sempre idêntico à execução integral das 19 regras', { timeout: 180_000 }, async () => {
    const catalogo = await loadCatalog(CATALOGO_DIR)
    const casos = (await casosDeAvaliacao(['desenvolvimento', 'novo'])).filter((caso) => ['DSD-15', 'DSD-16', 'DSD-17', 'DSD-42', 'NOV-02', 'NOV-05'].includes(caso.id))
    const medidas = await compararEstrategias(casos, catalogo)
    expect(medidas.length).toBeGreaterThan(30)
    expect(medidas.filter((medida) => medida.divergeDoIntegral).map((medida) => `${medida.caso} ${medida.perturbacao}`)).toEqual([])
    // As perturbações mudam resultados de verdade (o teste não é vazio).
    expect(medidas.some((medida) => medida.alteradas.length > 0)).toBe(true)
  })
})
