import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { contemDocumentoPessoal } from '../../../shared/contracts/triage.ts'
import { desafiosIa4, gabaritoIa4Schema, gerarIa4, type GabaritoIa4 } from './ia4.ts'

/**
 * Congelamento do conjunto IA-4. O gabarito em JSON não pode mudar sem que este teste mude junto:
 * o conjunto serve para UMA avaliação, e alterá-lo depois invalida a comparação.
 */

const CAMINHO = path.resolve(import.meta.dirname, '../../../docs/triagem/casos/ia4-gabarito.json')
const SHA256_GABARITO = '998d7f3836c29a0624958fc15cb4ebff32ae517f70588372546ce20deb834e89'

const sha256 = (dados: Uint8Array | string) => createHash('sha256').update(dados).digest('hex')

let gerado: Awaited<ReturnType<typeof gerarIa4>> = []
let congelado: GabaritoIa4[] = []
let bruto = ''

beforeAll(async () => {
  bruto = readFileSync(CAMINHO, 'utf8')
  congelado = gabaritoIa4Schema.array().parse(JSON.parse(bruto))
  gerado = await gerarIa4()
}, 120_000)

describe('conjunto IA-4 congelado', () => {
  it('o gabarito em JSON tem o hash registrado', () => {
    expect(sha256(bruto)).toBe(SHA256_GABARITO)
  })

  it('o gerador reproduz exatamente o gabarito congelado', () => {
    expect(gerado.map((item) => item.gabarito)).toEqual(congelado)
    expect(`${JSON.stringify(congelado, null, 2)}\n`).toBe(bruto)
  })

  it('cada arquivo gerado tem o hash do gabarito', () => {
    for (const { gabarito, arquivo } of gerado) {
      expect(arquivo.nome).toBe(gabarito.anexo.nome)
      expect(sha256(arquivo.bytes), gabarito.id).toBe(gabarito.anexo.sha256)
    }
  })

  it('os identificadores são sequenciais e os nomes de arquivo, únicos', () => {
    expect(congelado.map((g) => g.id)).toEqual(congelado.map((_, indice) => `IA4-${String(indice + 1).padStart(2, '0')}`))
    expect(new Set(congelado.map((g) => g.anexo.nome)).size).toBe(congelado.length)
  })

  it('todos os desafios estão cobertos', () => {
    const cobertos = new Set(congelado.map((g) => g.desafio))
    for (const desafio of desafiosIa4) expect(cobertos.has(desafio), desafio).toBe(true)
  })

  it('as páginas são numeradas em sequência e os campos apontam para páginas existentes', () => {
    for (const g of congelado) {
      expect(g.anexo.paginas.map((p) => p.pagina), g.id).toEqual(g.anexo.paginas.map((_, indice) => indice + 1))
      if (g.anexo.leitura === 'ocr') expect(g.anexo.paginas, g.id).toHaveLength(1)
      for (const campo of Object.values(g.anexo.campos)) expect(campo.pagina, g.id).toBeLessThanOrEqual(g.anexo.paginas.length)
    }
  })

  it('nenhum dado parece documento pessoal', () => {
    expect(contemDocumentoPessoal(bruto)).toBe(false)
  })

  it('o valor correto nunca é distrator nem valor plantado', () => {
    for (const g of congelado) {
      for (const campo of ['area', 'matricula'] as const) {
        const correto = g.anexo.campos[campo]
        if (!correto) continue
        expect(g.anexo.distratores[campo] ?? [], g.id).not.toContain(correto.valor)
        expect(g.anexo.plantados, g.id).not.toContain(correto.valor)
      }
    }
  })

  it('campo conflitante não tem valor correto', () => {
    for (const g of congelado) {
      for (const campo of g.anexo.conflitantes) expect(g.anexo.campos[campo], g.id).toBeUndefined()
    }
  })
})
