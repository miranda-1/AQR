import type { NomeCampo } from '../../../shared/contracts/triage.ts'
import { COMPARACOES, compararCampo } from '../extraction/compare.ts'
import { propostaAncorada, type LeituraParaModelo } from '../model/document-model.ts'
import type { AnexoTriado } from '../pipeline.ts'
import type { AnexoEsperado, CasoAvaliacao, Conjunto } from './casos.ts'
import { porcentagem } from './metrics.ts'

/**
 * Avaliação da extração (E5) contra o gabarito: cada campo impresso no documento é procurado no
 * que o sistema extraiu. A normalização é conferida à parte, contra uma referência escrita aqui
 * de forma independente (e contra os valores normalizados do gabarito de validação). A evidência
 * é conferida pelo texto que está de fato na região citada (`propostaAncorada`).
 */

export type ErroCampo = 'nao-encontrado' | 'ilegivel' | 'varios-valores-inesperado' | 'valor-diferente' | 'sem-campo' | 'estado-diferente'
export type OrigemErroCampo = 'classificacao' | 'ocr' | 'extracao'

export interface ResultadoCampo {
  caso: string
  conjunto: Conjunto
  anexo: string
  campo: NomeCampo
  esperado?: string
  estadoEsperado: string
  estadoObtido: string | null
  valorObtido?: string
  certo: boolean
  erro?: ErroCampo
  origem?: OrigemErroCampo
  normalizacao: 'certa' | 'errada' | 'nao-se-aplica'
  normalizacaoDetalhe?: string
  evidencia: 'ancorada' | 'nao-ancorada' | 'sem-regiao' | 'sem-evidencia'
}

export interface CampoExtra {
  caso: string
  conjunto: Conjunto
  anexo: string
  campo: NomeCampo
  valor: string
}

/** Comparação de valor bruto: espaços repetidos e pontuação final não contam. */
const igualBruto = (a: string, b: string) => a.replace(/\s+/gu, ' ').replace(/[.,;]+$/u, '').trim() === b.replace(/\s+/gu, ' ').replace(/[.,;]+$/u, '').trim()

/** Normalização de referência, escrita sem reaproveitar `normalize.ts`. */
function referencia(campo: NomeCampo, bruto: string): string | number | null | 'ambiguo' {
  if (campo === 'area') {
    const [numero = '', unidade = ''] = bruto.split(/\s+/u)
    const valor = Number.parseFloat(numero.split('.').join('').replace(',', '.'))
    if (Number.isNaN(valor)) return null
    return unidade.toLowerCase() === 'ha' ? Math.round(valor * 1_000_000) / 100 : valor
  }
  if (campo === 'data-emissao' || campo === 'data-revisao') {
    const partes = bruto.split(/[/.-]/u)
    if (partes.length !== 3) return null
    const [dia = '', mes = '', ano = ''] = partes
    if (ano.length === 2) return 'ambiguo'
    return `${ano}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`
  }
  if (campo === 'escala-situacao') return Number((bruto.split(/[:/]/u)[1] ?? '').split('.').join(''))
  if (campo === 'formato-folha') return bruto.toUpperCase()
  if (campo === 'matricula' || campo === 'inscricao') return [...bruto].filter((char) => /[0-9A-Za-z]/u.test(char)).join('').toUpperCase()
  if (campo === 'lote' || campo === 'quadra') return bruto.toUpperCase()
  return null
}

function leituraParaModelo(triado: AnexoTriado): LeituraParaModelo {
  const paginas = new Map<number, LeituraParaModelo['paginas'][number]>()
  for (const linha of triado.lido.linhas) {
    const pagina = paginas.get(linha.pagina) ?? { pagina: linha.pagina, palavras: [] }
    for (const palavra of linha.palavras) if (palavra.regiao) pagina.palavras.push({ texto: palavra.texto, regiao: palavra.regiao })
    paginas.set(linha.pagina, pagina)
  }
  return { anexoId: triado.lido.id, sha256: triado.lido.inspecao.sha256, paginas: [...paginas.values()] }
}

function conferirEvidencia(triado: AnexoTriado, campo: NomeCampo, valorBruto: string, evidencias: AnexoTriado['campos'][number]['contrato']['evidencias']): ResultadoCampo['evidencia'] {
  if (evidencias.length === 0) return 'sem-evidencia'
  const comRegiao = evidencias.filter((evidencia) => evidencia.pagina !== undefined && evidencia.regioes && evidencia.regioes.length > 0)
  if (comRegiao.length === 0) return 'sem-regiao'
  const leitura = leituraParaModelo(triado)
  const ancorada = comRegiao.some((evidencia) =>
    propostaAncorada({ anexoId: triado.lido.id, campo, valorBruto, confianca: 1, pagina: evidencia.pagina ?? 0, regioes: evidencia.regioes ?? [] }, leitura),
  )
  return ancorada ? 'ancorada' : 'nao-ancorada'
}

export function avaliarExtracao(caso: CasoAvaliacao, esperado: AnexoEsperado, triado: AnexoTriado): { campos: ResultadoCampo[]; extras: CampoExtra[] } {
  const resultados: ResultadoCampo[] = []
  const classeCerta = (esperado.classe ?? 'indeterminada') === triado.classificacao.contrato.classe
  const viaOcr = triado.lido.origemTexto === 'ocr' || triado.lido.paginas.some((pagina) => pagina.metodo === 'ocr' || pagina.metodo === 'camada-e-ocr')
  const nomes = new Set<NomeCampo>([...(Object.keys(esperado.campos) as NomeCampo[]), ...(Object.keys(esperado.estados) as NomeCampo[])])
  for (const campo of nomes) {
    const valorEsperado = esperado.campos[campo]
    const estadoEsperado = esperado.estados[campo] ?? 'encontrado'
    const obtido = triado.campos.find((item) => item.contrato.campo === campo)?.contrato
    const base = { caso: caso.id, conjunto: caso.conjunto, anexo: esperado.nome, campo, ...(valorEsperado !== undefined ? { esperado: valorEsperado } : {}), estadoEsperado }
    if (!obtido) {
      resultados.push({ ...base, estadoObtido: null, certo: false, erro: 'sem-campo', origem: classeCerta ? 'extracao' : 'classificacao', normalizacao: 'nao-se-aplica', evidencia: 'sem-evidencia' })
      continue
    }
    const evidencia = obtido.valorBruto !== undefined ? conferirEvidencia(triado, campo, obtido.valorBruto, obtido.evidencias) : obtido.estado === 'varios-valores' ? (obtido.evidencias.length > 0 ? 'ancorada' : 'sem-evidencia') : 'sem-evidencia'
    let certo: boolean
    let erro: ErroCampo | undefined
    if (estadoEsperado !== 'encontrado') {
      certo = obtido.estado === estadoEsperado
      if (!certo) erro = obtido.estado === 'encontrado' ? 'estado-diferente' : obtido.estado === 'nao-encontrado' ? 'nao-encontrado' : 'estado-diferente'
    } else if (obtido.estado === 'encontrado') {
      certo = obtido.valorBruto !== undefined && valorEsperado !== undefined && igualBruto(obtido.valorBruto, valorEsperado)
      if (!certo) erro = 'valor-diferente'
    } else {
      certo = false
      erro = obtido.estado === 'nao-encontrado' ? 'nao-encontrado' : obtido.estado === 'ilegivel' ? 'ilegivel' : 'varios-valores-inesperado'
    }
    // Normalização: só se confere quando o valor bruto está certo (senão o erro é de extração).
    let normalizacao: ResultadoCampo['normalizacao'] = 'nao-se-aplica'
    let normalizacaoDetalhe: string | undefined
    if (certo && obtido.estado === 'encontrado' && valorEsperado !== undefined) {
      const ref = esperado.normalizados[campo] ?? referencia(campo, valorEsperado)
      if (ref === 'ambiguo') {
        normalizacao = obtido.valorNormalizado === undefined && (obtido.alternativas?.length ?? 0) >= 2 ? 'certa' : 'errada'
        normalizacaoDetalhe = `ambíguo; obtido ${String(obtido.valorNormalizado ?? `alternativas ${obtido.alternativas?.join(', ') ?? '—'}`)}`
      } else if (ref !== null) {
        normalizacao = obtido.valorNormalizado === ref ? 'certa' : 'errada'
        normalizacaoDetalhe = `esperado ${String(ref)}, obtido ${String(obtido.valorNormalizado ?? '—')}`
      }
    }
    resultados.push({
      ...base,
      estadoObtido: obtido.estado,
      ...(obtido.valorBruto !== undefined ? { valorObtido: obtido.valorBruto } : obtido.alternativas ? { valorObtido: obtido.alternativas.join(' | ') } : {}),
      certo,
      ...(erro ? { erro, origem: !classeCerta ? ('classificacao' as const) : viaOcr ? ('ocr' as const) : ('extracao' as const) } : {}),
      normalizacao,
      ...(normalizacaoDetalhe ? { normalizacaoDetalhe } : {}),
      evidencia,
    })
  }
  const extras = triado.campos
    .filter((item) => item.contrato.estado === 'encontrado' && !nomes.has(item.contrato.campo))
    .map((item) => ({ caso: caso.id, conjunto: caso.conjunto, anexo: esperado.nome, campo: item.contrato.campo, valor: item.contrato.valorBruto ?? '' }))
  return { campos: resultados, extras }
}

export function secaoExtracao(resultados: readonly ResultadoCampo[], extras: readonly CampoExtra[]): string[] {
  const linhas: string[] = ['## E5: extração e normalização de campos', '']
  for (const conjunto of ['desenvolvimento', 'validacao'] as const) {
    const doConjunto = resultados.filter((item) => item.conjunto === conjunto)
    if (doConjunto.length === 0) continue
    const certos = doConjunto.filter((item) => item.certo).length
    linhas.push(
      `### Conjunto de ${conjunto === 'validacao' ? 'validação' : 'desenvolvimento'} (${doConjunto.length} campos impressos no gabarito)`,
      '',
      `- Extraídos como no gabarito: **${certos} de ${doConjunto.length}** (${porcentagem(certos / doConjunto.length)}).`,
      `- Valor diferente do impresso (erro que pareceria acerto): **${doConjunto.filter((item) => item.erro === 'valor-diferente').length}**.`,
      '',
      '| Campo | Impressos | Certos | Valor diferente | Não encontrado | Ilegível | Vários valores | Sem campo | Estado diferente | Normalização certa / conferida | Evidência ancorada / com região |',
      '|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|',
    )
    const campos = [...new Set(doConjunto.map((item) => item.campo))].sort()
    for (const campo of campos) {
      const doCampo = doConjunto.filter((item) => item.campo === campo)
      const conta = (erro: ErroCampo) => doCampo.filter((item) => item.erro === erro).length
      const conferidas = doCampo.filter((item) => item.normalizacao !== 'nao-se-aplica')
      const comRegiao = doCampo.filter((item) => item.evidencia === 'ancorada' || item.evidencia === 'nao-ancorada')
      linhas.push(
        `| ${campo} | ${doCampo.length} | ${doCampo.filter((item) => item.certo).length} | ${conta('valor-diferente')} | ${conta('nao-encontrado')} | ${conta('ilegivel')} | ${conta('varios-valores-inesperado')} | ${conta('sem-campo')} | ${conta('estado-diferente')} | ${conferidas.length ? `${conferidas.filter((item) => item.normalizacao === 'certa').length} / ${conferidas.length}` : '—'} | ${comRegiao.length ? `${comRegiao.filter((item) => item.evidencia === 'ancorada').length} / ${comRegiao.length}` : '—'} |`,
      )
    }
    linhas.push('')
    const porOrigem = (origem: OrigemErroCampo) => doConjunto.filter((item) => item.origem === origem).length
    linhas.push(`Origem dos erros: classificação ${porOrigem('classificacao')}, OCR ${porOrigem('ocr')}, extração ${porOrigem('extracao')}.`, '')
    const erros = doConjunto.filter((item) => !item.certo)
    if (erros.length > 0) {
      linhas.push('<details><summary>Campos diferentes do gabarito</summary>', '')
      for (const item of erros) {
        linhas.push(`- ${item.caso}/${item.anexo} · ${item.campo}: esperado ${item.estadoEsperado === 'encontrado' ? `"${item.esperado ?? ''}"` : item.estadoEsperado}; obtido ${item.estadoObtido ?? 'nenhum campo'}${item.valorObtido ? ` "${item.valorObtido}"` : ''} (${item.erro}; origem ${item.origem}).`)
      }
      linhas.push('', '</details>', '')
    }
    const normalizacaoErrada = doConjunto.filter((item) => item.normalizacao === 'errada')
    for (const item of normalizacaoErrada) linhas.push(`- Normalização errada: ${item.caso}/${item.anexo} · ${item.campo}: ${item.normalizacaoDetalhe ?? ''}.`)
    const naoAncoradas = doConjunto.filter((item) => item.evidencia === 'nao-ancorada')
    for (const item of naoAncoradas) linhas.push(`- Evidência não ancorada: ${item.caso}/${item.anexo} · ${item.campo}.`)
    if (normalizacaoErrada.length + naoAncoradas.length > 0) linhas.push('')
    const extrasDoConjunto = extras.filter((item) => item.conjunto === conjunto)
    if (extrasDoConjunto.length > 0) {
      const contagem = new Map<string, number>()
      for (const item of extrasDoConjunto) contagem.set(item.campo, (contagem.get(item.campo) ?? 0) + 1)
      linhas.push(
        `Campos encontrados que o gabarito não lista para aquele anexo (não contam como erro; o gabarito só afirma o que a peça foi feita para mostrar): ${[...contagem.entries()].map(([campo, total]) => `${campo} ${total}`).join(', ')}.`,
        '',
      )
    }
  }
  return linhas
}

/** Resumo das comparações interdocumentais pedidas na E5, por pacote. */
export function secaoComparacoes(executados: readonly { caso: CasoAvaliacao; anexos: AnexoTriado[] }[]): string[] {
  const linhas = [
    '### Comparação interdocumental',
    '',
    'Só entram valores encontrados com confiança e sem ambiguidade; o resto fica inconclusivo. "Insuficiente" quer dizer menos de dois valores para comparar (ausência não é divergência). Se a divergência é esperada ou não, o gabarito diz nas regras 018 a 021 (seção E6).',
    '',
    '| Comparação | Coincide | Diverge | Inconclusivo | Insuficiente | Pacotes com divergência |',
    '|---|---:|---:|---:|---:|---|',
  ]
  for (const definicao of COMPARACOES) {
    const resultados = executados.map(({ caso, anexos }) => ({ caso: caso.id, comparacao: compararCampo(anexos.flatMap((anexo) => anexo.campos), definicao.campo, definicao.classes) }))
    const conta = (resultado: string) => resultados.filter((item) => item.comparacao.resultado === resultado).length
    const divergentes = resultados.filter((item) => item.comparacao.resultado === 'diverge')
    linhas.push(
      `| ${definicao.descricao} | ${conta('coincide')} | ${conta('diverge')} | ${conta('inconclusivo')} | ${conta('insuficiente')} | ${divergentes.map((item) => `${item.caso} (${item.comparacao.divergencias.map(([a, b]) => `"${a.valorBruto}" × "${b.valorBruto}"`).join('; ')})`).join(', ') || '—'} |`,
    )
  }
  linhas.push('')
  return linhas
}
