import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { contemDocumentoPessoal } from '../../../shared/contracts/triage.ts'
import { gerarIa1, type PacoteIa1 } from './ia1.ts'

/**
 * Congelamento do conjunto IA-1 (E11.0): o gabarito gerado tem de ser idêntico ao JSON gravado em
 * `docs/triagem/casos/ia1-gabarito.json`, cujo SHA-256 também é conferido. O gabarito foi gravado
 * e comitado ANTES da primeira avaliação; mudá-lo depois de ver resultados faz este teste falhar.
 */

const ARQUIVO = new URL('../../../docs/triagem/casos/ia1-gabarito.json', import.meta.url)
const SHA256_GABARITO_IA1 = '8ab0edb9e3ae23354840bed92a9ab598d122b34147242c8b11ebccca7787332d'

let pacotes: PacoteIa1[]
beforeAll(async () => {
  pacotes = await gerarIa1()
}, 120_000)

describe('conjunto IA-1 congelado', () => {
  it('o gabarito gravado não mudou (hash registrado)', () => {
    expect(createHash('sha256').update(readFileSync(ARQUIVO)).digest('hex')).toBe(SHA256_GABARITO_IA1)
  })

  it('o gerador produz exatamente o gabarito gravado, com os bytes que ele descreve', () => {
    const gravado: unknown = JSON.parse(readFileSync(ARQUIVO, 'utf8'))
    expect(pacotes.map((pacote) => pacote.gabarito)).toEqual(gravado)
    for (const { gabarito, arquivo } of pacotes) expect(createHash('sha256').update(arquivo.bytes).digest('hex')).toBe(gabarito.anexo.sha256)
  })

  it('12 casos fictícios, sem CPF nem CNPJ, cobrindo os cinco desafios', () => {
    expect(pacotes.map((pacote) => pacote.gabarito.id)).toEqual(Array.from({ length: 12 }, (_, indice) => `IA1-${String(indice + 1).padStart(2, '0')}`))
    expect(new Set(pacotes.map((pacote) => pacote.gabarito.desafio))).toEqual(new Set(['layout-inedito', 'composto', 'digitalizado', 'conflitante', 'instrucao-maliciosa']))
    expect(contemDocumentoPessoal(JSON.stringify(pacotes.map((pacote) => pacote.gabarito)))).toBe(false)
  })
})
