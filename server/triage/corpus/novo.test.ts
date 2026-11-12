import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { contemDocumentoPessoal } from '../../../shared/contracts/triage.ts'
import { gerarNovo, type PacoteNovo } from './novo.ts'

/**
 * Congelamento do segundo conjunto independente (NOV): o gabarito gerado tem de ser idêntico ao JSON gravado em
 * `docs/triagem/casos/novo-gabarito.json`, cujo SHA-256 também é conferido. Mudar o
 * conjunto depois de ver os resultados do motor faz este teste falhar de propósito.
 */

const ARQUIVO = new URL('../../../docs/triagem/casos/novo-gabarito.json', import.meta.url)
const SHA256_GABARITO_NOVO = '35326fc748e1ac9baafe557a03b4092010acfd7df29ea4c3ce48898d9c73ed7b'

let pacotes: PacoteNovo[]
beforeAll(async () => {
  pacotes = await gerarNovo()
}, 120_000)

describe('segundo conjunto independente congelado (NOV)', () => {
  it('o gabarito gravado não mudou (hash registrado)', () => {
    const bytes = readFileSync(ARQUIVO)
    expect(createHash('sha256').update(bytes).digest('hex')).toBe(SHA256_GABARITO_NOVO)
  })

  it('o gerador produz exatamente o gabarito gravado', () => {
    const gravado: unknown = JSON.parse(readFileSync(ARQUIVO, 'utf8'))
    expect(pacotes.map((pacote) => pacote.gabarito)).toEqual(gravado)
  })

  it('16 pacotes fictícios, sem CPF nem CNPJ, com os bytes que o gabarito descreve', () => {
    expect(pacotes.map((pacote) => pacote.gabarito.id)).toEqual(Array.from({ length: 16 }, (_, indice) => `NOV-${String(indice + 1).padStart(2, '0')}`))
    for (const { gabarito, arquivos } of pacotes) {
      for (const anexo of gabarito.anexos) {
        const arquivo = arquivos.find((item) => item.nome === anexo.nome)
        expect(arquivo && createHash('sha256').update(arquivo.bytes).digest('hex')).toBe(anexo.sha256)
      }
    }
    expect(contemDocumentoPessoal(JSON.stringify(pacotes.map((pacote) => pacote.gabarito)))).toBe(false)
  })
})
