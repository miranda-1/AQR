import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { contemDocumentoPessoal } from '../../../shared/contracts/triage.ts'
import { desafiosIa3, gerarIa3, type PacoteIa3 } from './ia3.ts'

/**
 * Congelamento do conjunto IA-3 (E11.3, avaliação final da verificação reforçada): gravado e
 * comitado ANTES de a verificação reforçada ser escrita. Mudar o gabarito depois de ver
 * resultados faz este teste falhar.
 */

const ARQUIVO = new URL('../../../docs/triagem/casos/ia3-gabarito.json', import.meta.url)
const SHA256_GABARITO_IA3 = 'c9ca2b60d766b2e453121e7f00e9bb68524f44f0b7e431bef2afdba97b93d5b2'

let pacotes: PacoteIa3[]
beforeAll(async () => {
  pacotes = await gerarIa3()
}, 120_000)

describe('conjunto IA-3 congelado', () => {
  it('o gabarito gravado não mudou (hash registrado)', () => {
    expect(createHash('sha256').update(readFileSync(ARQUIVO)).digest('hex')).toBe(SHA256_GABARITO_IA3)
  })

  it('o gerador produz exatamente o gabarito gravado, com os bytes que ele descreve', () => {
    const gravado: unknown = JSON.parse(readFileSync(ARQUIVO, 'utf8'))
    expect(pacotes.map((pacote) => pacote.gabarito)).toEqual(gravado)
    for (const { gabarito, arquivo } of pacotes) expect(createHash('sha256').update(arquivo.bytes).digest('hex')).toBe(gabarito.anexo.sha256)
  })

  it('35 casos fictícios, sem CPF nem CNPJ, cobrindo todos os desafios', () => {
    expect(pacotes).toHaveLength(35)
    expect(new Set(pacotes.map((pacote) => pacote.gabarito.desafio))).toEqual(new Set(desafiosIa3))
    expect(contemDocumentoPessoal(JSON.stringify(pacotes.map((pacote) => pacote.gabarito)))).toBe(false)
  })

  it('o valor certo nunca coincide com distrator nem plantado, e campo conflitante não tem valor certo', () => {
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
