import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { contemDocumentoPessoal } from '../../../shared/contracts/triage.ts'
import { desafiosIa2, gerarIa2, type PacoteIa2 } from './ia2.ts'

/**
 * Congelamento do conjunto IA-2 (E11.1): o gabarito gerado tem de ser idêntico ao JSON gravado em
 * `docs/triagem/casos/ia2-gabarito.json`, cujo SHA-256 também é conferido. Gravado e comitado ANTES
 * da primeira execução de qualquer modelo sobre ele; mudá-lo depois de ver resultados faz este teste
 * falhar.
 */

const ARQUIVO = new URL('../../../docs/triagem/casos/ia2-gabarito.json', import.meta.url)
const SHA256_GABARITO_IA2 = '8dbc358dc11fa8d252b04f023c6618a9a64546890ee603d5412a0962d08c2a8e'

let pacotes: PacoteIa2[]
beforeAll(async () => {
  pacotes = await gerarIa2()
}, 120_000)

describe('conjunto IA-2 congelado', () => {
  it('o gabarito gravado não mudou (hash registrado)', () => {
    expect(createHash('sha256').update(readFileSync(ARQUIVO)).digest('hex')).toBe(SHA256_GABARITO_IA2)
  })

  it('o gerador produz exatamente o gabarito gravado, com os bytes que ele descreve', () => {
    const gravado: unknown = JSON.parse(readFileSync(ARQUIVO, 'utf8'))
    expect(pacotes.map((pacote) => pacote.gabarito)).toEqual(gravado)
    for (const { gabarito, arquivo } of pacotes) expect(createHash('sha256').update(arquivo.bytes).digest('hex')).toBe(gabarito.anexo.sha256)
  })

  it('14 casos fictícios, sem CPF nem CNPJ, cobrindo os sete desafios', () => {
    expect(pacotes.map((pacote) => pacote.gabarito.id)).toEqual(Array.from({ length: 14 }, (_, indice) => `IA2-${String(indice + 1).padStart(2, '0')}`))
    expect(new Set(pacotes.map((pacote) => pacote.gabarito.desafio))).toEqual(new Set(desafiosIa2))
    expect(contemDocumentoPessoal(JSON.stringify(pacotes.map((pacote) => pacote.gabarito)))).toBe(false)
  })

  it('distratores, conflitos e plantados nunca coincidem com o valor certo do campo', () => {
    for (const { gabarito } of pacotes) {
      const { campos, distratores, plantados, conflitantes } = gabarito.anexo
      for (const [campo, certo] of Object.entries(campos)) {
        expect(distratores[campo as keyof typeof distratores] ?? []).not.toContain(certo.valor)
        expect(plantados).not.toContain(certo.valor)
        expect(conflitantes).not.toContain(campo)
      }
    }
  })
})
