import { fileURLToPath } from 'node:url'
import { avaliacaoRegraSchema, contemPalavraDeDecisao, processoTriagemSchema } from '../../../shared/contracts/triage.ts'
import { defined } from '../../test/defined.ts'
import { loadCatalog, regrasAplicaveis, type CatalogoNormativo } from '../catalog/catalog.ts'
import { gerarPacote } from '../corpus/generate.ts'
import { PACOTES } from '../corpus/pacotes.ts'
import { casoDeDesenvolvimento } from '../evaluation/casos.ts'
import { entradaDoCaso } from '../evaluation/regras.ts'
import { LIMITES_AVALIACAO } from '../evaluation/run.ts'
import { triarAnexos, type AnexoTriado } from '../pipeline.ts'
import type { EntradaTriagem } from './context.ts'
import { executarTriagem, type ResultadoTriagem } from './engine.ts'
import { converterEmDecisao, DecisaoAutomaticaBloqueada, resumoParaLog, verificarGarantias } from './guard.ts'
import { GARANTIAS, REGRAS } from './rules.ts'

const CATALOGO_DIR = fileURLToPath(new URL('../../../docs/triagem/catalogo/', import.meta.url))

let catalogo: CatalogoNormativo
beforeAll(async () => {
  catalogo = await loadCatalog(CATALOGO_DIR)
})

/** Pacote do corpus de desenvolvimento lido sem OCR (só os que não têm digitalização). */
async function pacote(id: string): Promise<{ entrada: EntradaTriagem; anexos: AnexoTriado[] }> {
  const gerado = await gerarPacote(defined(PACOTES.find((item) => item.id === id)))
  const caso = casoDeDesenvolvimento(gerado.gabarito, gerado.arquivos)
  return { entrada: entradaDoCaso(caso), anexos: await triarAnexos(gerado.arquivos, { limites: LIMITES_AVALIACAO }) }
}

async function triar(id: string, ajuste: (entrada: EntradaTriagem) => EntradaTriagem = (entrada) => entrada): Promise<ResultadoTriagem> {
  const { entrada, anexos } = await pacote(id)
  return executarTriagem(ajuste(entrada), anexos, { catalogo })
}

const avaliacao = (resultado: ResultadoTriagem, numero: string) => defined(resultado.avaliacoes.find((item) => item.contrato.regraId === `AQR-GCA-${numero}`), numero)

describe('motor de regras', () => {
  it('implementa exatamente as 19 regras de documento do catálogo para desdobro na abertura', () => {
    const aplicaveis = regrasAplicaveis(catalogo, 'D', 'abertura')
    const executaveis = aplicaveis.filter((regra) => regra.habilitada && !GARANTIAS[regra.id]).map((regra) => regra.id).sort()
    expect(Object.keys(REGRAS).sort()).toEqual(executaveis)
    expect(executaveis.map((id) => id.slice(-3))).toEqual(['001', '002', '003', '006', '008', '009', '010', '011', '012', '013', '016', '018', '019', '020', '021', '022', '023', '028', '043'])
    expect(Object.keys(GARANTIAS).sort()).toEqual(['AQR-GCA-040', 'AQR-GCA-041'])
    const hipoteses = aplicaveis.filter((regra) => regra.status === 'hypothesis')
    expect(hipoteses.map((regra) => [regra.id, regra.habilitada])).toEqual([['HYP-GCA-045', false], ['HYP-GCA-047', false]])
    expect(defined(aplicaveis.find((regra) => regra.id === 'AQR-GCA-028')).condicoes).toEqual(['area-situacao-acima-2ha'])
  })

  it('pacote completo e coerente: nenhum achado; 028 aguarda servidor; hipóteses não rodam; garantias aplicadas', async () => {
    const resultado = await triar('DSD-01')
    expect(resultado.avaliacoes.filter((item) => item.contrato.resultado === 'achado').map((item) => item.contrato.regraId)).toEqual([])
    expect(avaliacao(resultado, '028').contrato).toMatchObject({ resultado: 'condicao-pendente', condicoesPendentes: ['area-situacao-acima-2ha'] })
    expect(resultado.naoExecutadas.map((item) => item.regraId)).toEqual(['HYP-GCA-045', 'HYP-GCA-047'])
    expect(resultado.garantias.map((item) => item.regraId)).toEqual(['AQR-GCA-040', 'AQR-GCA-041'])
    expect(resultado.avaliacoes).toHaveLength(19)
    expect(processoTriagemSchema.safeParse(resultado.processo).success).toBe(true)
    expect(resultado.processo.situacao).toBe('aguardando-revisao')
    expect(resultado.processo.revisoes).toEqual([])
  })

  it('toda avaliação tem versão, fundamento do catálogo, revisão humana e texto sem palavra de decisão', async () => {
    const resultado = await triar('DSD-16')
    for (const item of resultado.avaliacoes) {
      expect(avaliacaoRegraSchema.safeParse(item.contrato).success).toBe(true)
      expect(item.contrato.regraVersao).toMatch(/^AQR-GCA-\d{3}@1\.0-review\+[0-9a-f]{12}$/u)
      expect(item.contrato.fundamentos.length).toBeGreaterThan(0)
      expect(item.revisaoHumana).toBe('Servidor GCA valida achado e comunicação')
      expect(contemPalavraDeDecisao(item.contrato.rascunho)).toBe(false)
      expect(item.contrato.rascunho).toMatch(/^Verificação técnica experimental, para revisão de servidor/u)
    }
  })

  it('divergência: guarda os dois valores com evidência, sem escolher e sem repetir valores no rascunho', async () => {
    const art = avaliacao(await triar('DSD-16'), '018')
    expect(art.contrato).toMatchObject({ resultado: 'achado', tipo: 'divergencia' })
    const lote = defined(art.valoresConflitantes.find((item) => item.campo === 'lote'))
    expect(lote.valores.map((valor) => valor.valorBruto).sort()).toEqual(['C3', 'F7', 'F7'])
    expect(lote.valores.every((valor) => valor.evidencias.length > 0 && valor.evidencias.every((evidencia) => evidencia.pagina === 1 && (evidencia.regioes?.length ?? 0) > 0))).toBe(true)
    expect(art.contrato.rascunho).not.toContain('C3')
    expect(art.contrato.rascunho).toContain('não indica qual documento está correto')
  })

  it('ausência só é apontada em pacote completo confirmado por servidor', async () => {
    const completo = avaliacao(await triar('DSD-15'), '013')
    expect(completo.contrato).toMatchObject({ resultado: 'achado', tipo: 'nao-localizado' })
    expect(completo.contrato.procura?.integridadeDoPacote).toBe('completo')
    expect(completo.contrato.procura?.anexosProcurados.length).toBe(7)

    const parcial = await triar('DSD-47')
    expect(avaliacao(parcial, '013').contrato.resultado).toBe('nao-avaliavel')
    expect(parcial.avaliacoes.filter((item) => item.contrato.tipo === 'nao-localizado')).toEqual([])

    // "Completo" só declarado (não confirmado por servidor) não basta.
    const declarado = await triar('DSD-15', (entrada) => ({ ...entrada, integridadeDoPacote: { valor: 'completo', origem: 'declarado' } }))
    expect(avaliacao(declarado, '013').contrato.resultado).toBe('nao-avaliavel')
  })

  it('anexo que não pôde ser lido impede concluir ausência', async () => {
    expect(avaliacao(await triar('DSD-31'), '013').contrato.resultado).toBe('nao-avaliavel')
    const isolado = await triar('DSD-37')
    expect(avaliacao(isolado, '011').contrato.resultado).toBe('nao-avaliavel')
    expect(avaliacao(isolado, '043').contrato).toMatchObject({ resultado: 'achado', tipo: 'formato-incompativel' })
  })

  it('028: área acima de 2 ha extraída não ativa a regra; só a confirmação do servidor', async () => {
    const semConfirmacao = avaliacao(await triar('DSD-42'), '028')
    expect(semConfirmacao.contrato.resultado).toBe('condicao-pendente')
    expect(semConfirmacao.contrato.rascunho).toContain('não ativa a regra')
    expect(avaliacao(await triar('DSD-43'), '028').contrato).toMatchObject({ resultado: 'achado', tipo: 'nao-localizado' })
    expect(avaliacao(await triar('DSD-45'), '028').contrato.resultado).toBe('nao-aplicavel')
    // Condição "confirmada" sem ser por servidor continua pendente.
    const declarada = await triar('DSD-43', (entrada) => ({
      ...entrada,
      condicoes: [{ id: 'area-situacao-acima-2ha', valor: { valor: true, origem: 'declarado' }, evidencias: [] }],
    }))
    expect(avaliacao(declarada, '028').contrato.resultado).toBe('condicao-pendente')
  })

  it('009 mostra o intervalo sem decidir o prazo; data ambígua não é resolvida', async () => {
    const longe = avaliacao(await triar('DSD-27'), '009')
    expect(longe.contrato).toMatchObject({ resultado: 'achado', tipo: 'condicao-indeterminada' })
    expect(longe.contrato.rascunho).toContain('87 dias corridos')
    expect(longe.contrato.rascunho).toContain('não decide a contagem')
    expect(longe.contrato.rascunho).not.toMatch(/vencid/u)
    const ambigua = avaliacao(await triar('DSD-26'), '009')
    expect(ambigua.contrato.rascunho).toContain('ambígua')
    expect(avaliacao(await triar('DSD-01'), '009').contrato.resultado).toBe('sem-achado')
  })

  it('representação: compara signatário e titular aparente; não julga poderes', async () => {
    expect(avaliacao(await triar('DSD-01'), '010').contrato.resultado).toBe('nao-aplicavel')
    expect(avaliacao(await triar('DSD-24'), '010').contrato).toMatchObject({ resultado: 'achado', tipo: 'nao-localizado' })
    const comProcuracao = avaliacao(await triar('DSD-25'), '010')
    expect(comProcuracao.contrato.resultado).toBe('sem-achado')
    expect(comProcuracao.contrato.rascunho).toContain('não são julgados')
  })

  it('enquadramento indeterminado: nenhuma regra roda', async () => {
    const resultado = await triar('DSD-01', (entrada) => ({ ...entrada, modalidade: { valor: 'indeterminado', origem: 'proposto-sistema' } }))
    expect(resultado.avaliacoes).toEqual([])
    expect(resultado.avisos.join(' ')).toContain('nenhuma regra foi executada')
  })
})

describe('garantias 040 e 041', () => {
  it('bloqueia qualquer conversão do resultado em decisão administrativa', async () => {
    const resultado = await triar('DSD-06')
    expect(resultado.decisaoAdministrativa).toBeNull()
    expect(resultado.comunicacaoAoRequerente).toBe('bloqueada')
    for (const acao of ['aprovar', 'indeferir', 'arquivar', 'anuir', 'notificar-requerente'] as const) {
      expect(() => converterEmDecisao(resultado, acao)).toThrow(DecisaoAutomaticaBloqueada)
    }
  })

  it('aponta texto com palavra de decisão, CPF sem máscara ou valor de campo no rascunho', async () => {
    const resultado = await triar('DSD-16')
    expect(verificarGarantias(resultado)).toEqual([])
    const adulterado: ResultadoTriagem = structuredClone(resultado)
    const primeira = defined(adulterado.avaliacoes[0])
    primeira.contrato.rascunho = 'Requerimento indeferido.'
    primeira.limitacoes.push('CPF 123.456.789-09')
    const art = defined(adulterado.avaliacoes.find((item) => item.contrato.regraId === 'AQR-GCA-018'))
    const valor = defined(art.valoresConflitantes[0]?.valores[0])
    // Valores curtos (até 2 caracteres, como "C3") não são conferidos, para não confundir com "DRT 01" do texto fixo.
    valor.valorBruto = 'Carla Ficticia de Exemplo'
    art.contrato.rascunho = `${art.contrato.rascunho} Titular: Carla Ficticia de Exemplo.`
    const problemas = verificarGarantias(adulterado)
    expect(problemas.some((problema) => problema.includes('palavra de decisão'))).toBe(true)
    expect(problemas.some((problema) => problema.includes('CPF'))).toBe(true)
    expect(problemas.some((problema) => problema.includes('repete um valor'))).toBe(true)
  })

  it('o resumo para log não leva trecho, valor de campo, nome de arquivo nem de pessoa', async () => {
    const resultado = await triar('DSD-24')
    const texto = JSON.stringify(resumoParaLog(resultado))
    expect(texto).toContain('AQR-GCA-010')
    for (const proibido of ['Pedro', 'Carla', 'requerimento.pdf', '90417', 'F7', 'trecho']) expect(texto).not.toContain(proibido)
  })
})
