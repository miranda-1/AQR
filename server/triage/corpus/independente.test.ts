import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { contemDocumentoPessoal } from '../../../shared/contracts/triage.ts'
import { gerarIndependente, type PacoteIndependente } from './independente.ts'

/**
 * Congelamento do conjunto independente: o gabarito gerado tem de ser idêntico ao JSON gravado em
 * `docs/triagem/casos/independente-gabarito.json`, cujo SHA-256 também é conferido. Mudar o
 * conjunto depois de ver os resultados do motor faz este teste falhar de propósito.
 */

const ARQUIVO = new URL('../../../docs/triagem/casos/independente-gabarito.json', import.meta.url)
const SHA256_GABARITO_INDEPENDENTE = 'f8d0bd9562f9ff41fc2ca3920433fbc5ff121c896c7357755677a7e627fe5f05'

let pacotes: PacoteIndependente[]
beforeAll(async () => {
  pacotes = await gerarIndependente()
}, 120_000)

describe('conjunto independente congelado', () => {
  it('o gabarito gravado não mudou (hash registrado)', () => {
    const bytes = readFileSync(ARQUIVO)
    expect(createHash('sha256').update(bytes).digest('hex')).toBe(SHA256_GABARITO_INDEPENDENTE)
  })

  it('o gerador produz exatamente o gabarito gravado', () => {
    const gravado: unknown = JSON.parse(readFileSync(ARQUIVO, 'utf8'))
    expect(pacotes.map((pacote) => pacote.gabarito)).toEqual(gravado)
  })

  it('16 pacotes fictícios, sem CPF nem CNPJ, com os bytes que o gabarito descreve', () => {
    expect(pacotes.map((pacote) => pacote.gabarito.id)).toEqual(Array.from({ length: 16 }, (_, indice) => `IND-${String(indice + 1).padStart(2, '0')}`))
    for (const { gabarito, arquivos } of pacotes) {
      for (const anexo of gabarito.anexos) {
        const arquivo = arquivos.find((item) => item.nome === anexo.nome)
        expect(arquivo && createHash('sha256').update(arquivo.bytes).digest('hex')).toBe(anexo.sha256)
      }
    }
    expect(contemDocumentoPessoal(JSON.stringify(pacotes.map((pacote) => pacote.gabarito)))).toBe(false)
  })
})
