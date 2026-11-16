import { gerarPacote } from '../corpus/generate.ts'
import { PACOTES } from '../corpus/pacotes.ts'
import { LIMITES_AVALIACAO } from '../evaluation/run.ts'
import { casosDeAvaliacao } from '../evaluation/casos.ts'
import { triarAnexo, type AnexoTriado } from '../pipeline.ts'
import { defined } from '../../test/defined.ts'
import { sugerirParaAnalise } from './executar.ts'
import { montarPedido } from './pedido.ts'
import { criarProvedorLocal, criarProvedorSimulado, type PerfilSimulado } from './provedor.ts'
import { IaWorkerPool } from './worker-pool.ts'

/**
 * Provedor simulado e execução isolada (E11.0): thread de verdade, com tempo e memória próprios.
 * Nenhum desfecho do provedor (falha, travamento, estouro de memória, saída fora do esquema) lança
 * erro para quem chama: vira uma execução registrável, e a análise determinística não depende dela.
 */

let anexos: AnexoTriado[]
const pools: IaWorkerPool[] = []
const pool = (timeoutMs = 20_000, memoriaMb = 256) => {
  const criado = new IaWorkerPool({ workers: 1, queueLimit: 4, timeoutMs, memoriaMb })
  pools.push(criado)
  return criado
}

beforeAll(async () => {
  // VAL-01 (planta com área e responsável técnico fora do vocabulário do motor) e a ficha em JPG
  // do DSD-04 lida sem OCR (classe indeterminada, página sem texto): há lacunas para pedir.
  const val01 = defined((await casosDeAvaliacao(['validacao'])).find((caso) => caso.id === 'VAL-01'))
  const dsd04 = await gerarPacote(defined(PACOTES.find((item) => item.id === 'DSD-04')))
  const ficha = defined(dsd04.arquivos.find((arquivo) => /ficha/u.test(arquivo.nome)))
  anexos = []
  for (const [indice, arquivo] of [...val01.arquivos, ficha].entries()) anexos.push(await triarAnexo(`anexo-${indice + 1}`, arquivo.nome, arquivo.bytes, { limites: LIMITES_AVALIACAO }))
}, 60_000)

afterAll(async () => {
  await Promise.all(pools.map((item) => item.close()))
})

const executar = (perfil: PerfilSimulado, opcoes: { timeoutMs?: number; memoriaMb?: number; maxPropostas?: number } = {}) =>
  sugerirParaAnalise(anexos, {
    pool: pool(opcoes.timeoutMs, opcoes.memoriaMb),
    provedor: { tipo: 'simulado', opcoes: { perfil } },
    limites: { maxPaginas: 60, maxPropostas: opcoes.maxPropostas ?? 200 },
  })

describe('pedido ao modelo', () => {
  it('só anexos com lacuna, sem anexo isolado, sem CPF ou CNPJ e só com palavras posicionadas', () => {
    const pedido = montarPedido(anexos, { maxPaginas: 60, maxPropostas: 200 })
    for (const anexo of pedido.anexos) {
      const triado = defined(anexos.find((item) => item.lido.id === anexo.anexoId))
      const temLacuna = triado.classificacao.contrato.classe === 'indeterminada' || triado.campos.some((campo) => campo.contrato.estado === 'nao-encontrado' || campo.contrato.estado === 'ilegivel')
      expect(temLacuna).toBe(true)
      expect(anexo.lacunas.classe || anexo.lacunas.campos.length > 0).toBe(true)
    }
    const texto = JSON.stringify(pedido)
    expect(texto).not.toMatch(/\d{3}\.\d{3}\.\d{3}-\d{2}|\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/u)
    // O pedido não leva nome de arquivo nem dados do processo.
    expect(texto).not.toMatch(/\.pdf"|\.dxf"|\.jpg"|protocol/u)
    expect(pedido.anexos.some((anexo) => anexo.lacunas.campos.length > 0)).toBe(true)
    expect(pedido.anexos.some((anexo) => anexo.paginas.some((pagina) => pagina.semTexto))).toBe(true)
    expect(montarPedido(anexos, { maxPaginas: 1, maxPropostas: 10 }).anexos.flatMap((anexo) => anexo.paginas)).toHaveLength(1)
  })
})

describe('provedor simulado', () => {
  it('é determinístico e se identifica como simulado, sem pesos', async () => {
    const pedido = montarPedido(anexos, { maxPaginas: 60, maxPropostas: 200 })
    const provedor = criarProvedorSimulado({ perfil: 'cooperativo' })
    expect(await provedor.propor(pedido)).toEqual(await criarProvedorSimulado({ perfil: 'cooperativo' }).propor(pedido))
    expect(provedor.modelo).toMatchObject({ provedor: 'simulado', id: 'simulado-cooperativo', pesosSha256: null })
    expect(provedor.modelo.promptSha256).toMatch(/^[0-9a-f]{64}$/u)
    expect(criarProvedorSimulado({ perfil: 'adversario' }).modelo.promptSha256).not.toBe(provedor.modelo.promptSha256)
  })

  it('o provedor local ainda não existe: pedir é erro', () => {
    expect(() => criarProvedorLocal({ endereco: 'unix:/tmp/modelo.sock', modeloId: 'x', modeloVersao: '1', pesosSha256: 'a'.repeat(64), promptSha256: 'b'.repeat(64) })).toThrow(/ainda não implementado/u)
  })
})

describe('execução isolada', () => {
  it('cooperativo: conclui e toda sugestão sai verificada, hipótese ou recusada, sempre sem efeito', async () => {
    const { execucao, sugestoes } = await executar('cooperativo')
    expect(execucao).toMatchObject({ situacao: 'concluida', propostasInvalidas: 0, propostasDescartadasPorLimite: 0 })
    expect(execucao.saidaSha256).toMatch(/^[0-9a-f]{64}$/u)
    expect(sugestoes.every((sugestao) => sugestao.efeito === 'nenhum')).toBe(true)
    expect(sugestoes.every((sugestao) => sugestao.situacao !== 'verificada' || sugestao.nivel === 'A')).toBe(true)
  })

  it('adversário: lixo fora do esquema é descartado e nada que obedece a instrução é verificado', async () => {
    const { execucao, sugestoes } = await executar('adversario')
    expect(execucao.situacao).toBe('concluida')
    expect(execucao.propostasInvalidas).toBeGreaterThan(0)
    const alteradas = sugestoes.filter((sugestao) => sugestao.confiancaDeclarada === 0.99)
    expect(alteradas.length).toBeGreaterThan(0)
    expect(alteradas.every((sugestao) => sugestao.situacao === 'recusada')).toBe(true)
  })

  it('limite de quantidade: o excedente é descartado e contado', async () => {
    const { execucao, sugestoes } = await executar('adversario', { maxPropostas: 2 })
    expect(sugestoes.length + execucao.propostasInvalidas).toBeLessThanOrEqual(2)
    expect(execucao.propostasDescartadasPorLimite).toBeGreaterThan(0)
  })

  it.each([
    ['falha', 'memoria-ou-falha', {}],
    ['saida-invalida', 'saida-invalida', {}],
    ['lento', 'tempo-esgotado', { timeoutMs: 1500 }],
    ['memoria', 'memoria-ou-falha', { memoriaMb: 128 }],
  ] as const)('perfil %s: vira execução "%s", sem lançar erro e sem sugestões', { timeout: 60_000 }, async (perfil, situacao, opcoes) => {
    const { execucao, sugestoes } = await executar(perfil, opcoes)
    expect(execucao.situacao).toBe(situacao)
    expect(sugestoes).toEqual([])
  })

  it('fila cheia ou encerrada: indisponível, sem lançar erro', async () => {
    const fechado = pool()
    await fechado.close()
    const { execucao } = await sugerirParaAnalise(anexos, { pool: fechado, provedor: { tipo: 'simulado', opcoes: { perfil: 'cooperativo' } }, limites: { maxPaginas: 60, maxPropostas: 200 } })
    expect(execucao.situacao).toBe('indisponivel')
  })
})
