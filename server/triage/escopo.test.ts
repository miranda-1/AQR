import { fileURLToPath } from 'node:url'
import { etapas, modalidades } from '../../shared/contracts/triage.ts'
import { loadCatalog, regrasAplicaveis } from './catalog/catalog.ts'
import { GARANTIAS, REGRAS } from './engine/rules.ts'
import { ESCOPOS_SUPORTADOS, escopoSuportado, etapasSuportadas, mensagemEscopoNaoSuportado, modalidadesSuportadas } from './escopo.ts'

const CATALOGO_DIR = fileURLToPath(new URL('../../docs/triagem/catalogo/', import.meta.url))

describe('escopo operacional da triagem (B1)', () => {
  it('só desdobro na abertura é suportado; todo outro par do contrato é recusado', () => {
    expect(ESCOPOS_SUPORTADOS.map(({ modalidade, etapa }) => [modalidade, etapa])).toEqual([['D', 'abertura']])
    const suportados = modalidades.flatMap((modalidade) => etapas.filter((etapa) => escopoSuportado(modalidade, etapa)).map((etapa) => `${modalidade}/${etapa}`))
    expect(suportados).toEqual(['D/abertura'])
    expect([escopoSuportado('indeterminado', 'abertura'), escopoSuportado('D', 'indeterminado')]).toEqual([false, false])
    expect([modalidadesSuportadas(), etapasSuportadas()]).toEqual([['D'], ['abertura']])
    expect(mensagemEscopoNaoSuportado()).toMatch(/desdobro na abertura/u)
  })

  it('os enums do contrato não foram reduzidos (dados históricos e modalidades futuras)', () => {
    expect(modalidades).toHaveLength(16)
    expect(etapas).toEqual(['abertura', 'analise', 'pos-analise', 'pos-decisao'])
  })

  it('todo escopo suportado tem cada regra habilitada do catálogo implementada no motor ou tratada como garantia', async () => {
    const catalogo = await loadCatalog(CATALOGO_DIR)
    for (const { modalidade, etapa } of ESCOPOS_SUPORTADOS) {
      const habilitadas = regrasAplicaveis(catalogo, modalidade, etapa).filter((regra) => regra.habilitada)
      expect(habilitadas.length, `${modalidade}/${etapa}`).toBeGreaterThan(0)
      const semFuncao = habilitadas.filter((regra) => !REGRAS[regra.id] && !GARANTIAS[regra.id]).map((regra) => regra.id)
      expect(semFuncao, `${modalidade}/${etapa}`).toEqual([])
    }
  })
})
