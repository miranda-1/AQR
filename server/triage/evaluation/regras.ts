import type { Condicao } from '../../../shared/contracts/triage.ts'
import type { CatalogoNormativo } from '../catalog/catalog.ts'
import type { EntradaTriagem } from '../engine/context.ts'
import { executarTriagem, type AvaliacaoDetalhada, type ResultadoTriagem } from '../engine/engine.ts'
import { propostaAncorada, type LeituraParaModelo } from '../model/document-model.ts'
import type { AnexoTriado } from '../pipeline.ts'
import type { CasoAvaliacao, Conjunto } from './casos.ts'
import type { ResultadoClassificacao } from './classificacao.ts'
import type { ResultadoCampo } from './extracao.ts'
import { porcentagem } from './metrics.ts'

/** Avaliação do motor de regras (E6) contra as expectativas dos gabaritos. */

export const SERVIDOR_SINTETICO = 'servidor-sintetico'

/** Entrada do processo como o servidor que abriu a triagem a informou no cenário. */
export function entradaDoCaso(caso: CasoAvaliacao): EntradaTriagem {
  const confirmado = { origem: 'confirmado-servidor' as const, confirmadoPor: SERVIDOR_SINTETICO, confirmadoEm: caso.entrada.protocoladoEm }
  const condicoes: Condicao[] = caso.entrada.condicoesConfirmadas.map((condicao) => ({ id: condicao.id, valor: { valor: condicao.valor, ...confirmado }, evidencias: [] }))
  return {
    processoId: caso.id,
    referencia: null,
    protocoladoEm: caso.entrada.protocoladoEm,
    modalidade: { valor: caso.entrada.modalidade, ...confirmado },
    etapa: { valor: caso.entrada.etapa, ...confirmado },
    integridadeDoPacote: { valor: caso.entrada.integridadeDoPacote, ...confirmado },
    condicoes,
    criadoPor: SERVIDOR_SINTETICO,
    criadoEm: caso.entrada.protocoladoEm,
  }
}

export type ErroRegra = 'falso-alerta' | 'achado-nao-detectado' | 'abstencao-indevida' | 'tipo-de-achado-diferente' | 'resultado-diferente'
export type OrigemErroRegra = 'classificacao' | 'ocr' | 'extracao' | 'condicao' | 'regra'

export interface ResultadoRegraAvaliada {
  caso: string
  conjunto: Conjunto
  regraId: string
  aceitaveis: string[]
  tipoEsperado?: string
  obtido: string
  tipoObtido?: string
  certo: boolean
  erro?: ErroRegra
  origem?: OrigemErroRegra
  motivoGabarito: string
  /** Evidência do achado confere com os anexos (hash, página) e, nas divergências, com o texto da região. */
  evidencia?: 'correta' | 'incorreta'
  rascunho: string
}

function leitura(anexo: AnexoTriado): LeituraParaModelo {
  const paginas = new Map<number, LeituraParaModelo['paginas'][number]>()
  for (const linha of anexo.lido.linhas) {
    const pagina = paginas.get(linha.pagina) ?? { pagina: linha.pagina, palavras: [] }
    for (const palavra of linha.palavras) if (palavra.regiao) pagina.palavras.push({ texto: palavra.texto, regiao: palavra.regiao })
    paginas.set(linha.pagina, pagina)
  }
  return { anexoId: anexo.lido.id, sha256: anexo.lido.inspecao.sha256, paginas: [...paginas.values()] }
}

/** Toda evidência aponta para um anexo do pacote (mesmo hash) e uma página que existe; valores conflitantes estão na região citada. */
export function conferirEvidencias(avaliacao: AvaliacaoDetalhada, anexos: readonly AnexoTriado[]): boolean {
  const porId = new Map(anexos.map((anexo) => [anexo.lido.id, anexo]))
  for (const evidencia of avaliacao.contrato.evidencias) {
    const anexo = porId.get(evidencia.anexoId)
    if (!anexo || anexo.lido.inspecao.sha256 !== evidencia.sha256) return false
    if (evidencia.pagina !== undefined && anexo.lido.paginas.length > 0 && !anexo.lido.paginas.some((pagina) => pagina.pagina === evidencia.pagina)) return false
  }
  for (const conflito of avaliacao.valoresConflitantes) {
    for (const valor of conflito.valores) {
      const anexo = porId.get(valor.anexoId)
      if (!anexo) return false
      const comRegiao = valor.evidencias.filter((evidencia) => evidencia.pagina !== undefined && evidencia.regioes?.length)
      if (comRegiao.length === 0) continue
      const ancorada = comRegiao.some((evidencia) =>
        propostaAncorada({ anexoId: anexo.lido.id, campo: conflito.campo, valorBruto: valor.valorBruto, confianca: 1, pagina: evidencia.pagina ?? 0, regioes: evidencia.regioes ?? [] }, leitura(anexo)),
      )
      if (!ancorada) return false
    }
  }
  return true
}

export function triarCaso(caso: CasoAvaliacao, anexos: readonly AnexoTriado[], catalogo: CatalogoNormativo): ResultadoTriagem {
  return executarTriagem(entradaDoCaso(caso), anexos, { catalogo })
}

export function avaliarRegras(
  caso: CasoAvaliacao,
  anexos: readonly AnexoTriado[],
  triagem: ResultadoTriagem,
  classificacao: readonly ResultadoClassificacao[],
  extracao: readonly ResultadoCampo[],
): ResultadoRegraAvaliada[] {
  const resultados: ResultadoRegraAvaliada[] = []
  for (const [regraId, expectativa] of Object.entries(caso.regras)) {
    const avaliacao = triagem.avaliacoes.find((item) => item.contrato.regraId === regraId)
    const obtido = avaliacao?.contrato.resultado ?? 'nao-executada'
    const tipoObtido = avaliacao?.contrato.tipo
    const aceito = (expectativa.aceitaveis as string[]).includes(obtido)
    const tipoCerto = !(obtido === 'achado' && expectativa.tipo && tipoObtido !== expectativa.tipo)
    const certo = aceito && tipoCerto
    let erro: ErroRegra | undefined
    if (!certo) {
      if (aceito) erro = 'tipo-de-achado-diferente'
      else if (obtido === 'achado') erro = 'falso-alerta'
      else if (expectativa.aceitaveis.length === 1 && expectativa.aceitaveis[0] === 'achado') erro = 'achado-nao-detectado'
      else if (obtido === 'nao-avaliavel' || obtido === 'condicao-pendente') erro = 'abstencao-indevida'
      else erro = 'resultado-diferente'
    }
    let origem: OrigemErroRegra | undefined
    if (erro) {
      const errosClasse = classificacao.filter((item) => item.caso === caso.id && item.origemErro)
      const errosCampo = extracao.filter((item) => item.caso === caso.id && !item.certo)
      if (errosClasse.some((item) => item.origemErro === 'leitura-ocr')) origem = 'ocr'
      else if (errosClasse.length > 0) origem = 'classificacao'
      else if (errosCampo.some((item) => item.origem === 'ocr')) origem = 'ocr'
      else if (errosCampo.some((item) => item.origem === 'extracao')) origem = 'extracao'
      else if (obtido === 'condicao-pendente') origem = 'condicao'
      else origem = 'regra'
    }
    resultados.push({
      caso: caso.id,
      conjunto: caso.conjunto,
      regraId,
      aceitaveis: expectativa.aceitaveis,
      ...(expectativa.tipo ? { tipoEsperado: expectativa.tipo } : {}),
      obtido,
      ...(tipoObtido ? { tipoObtido } : {}),
      certo,
      ...(erro ? { erro } : {}),
      ...(origem ? { origem } : {}),
      motivoGabarito: expectativa.motivo,
      ...(avaliacao && obtido === 'achado' ? { evidencia: conferirEvidencias(avaliacao, anexos) ? ('correta' as const) : ('incorreta' as const) } : {}),
      rascunho: avaliacao?.contrato.rascunho ?? '',
    })
  }
  return resultados
}

export function secaoRegras(resultados: readonly ResultadoRegraAvaliada[], triagens: readonly { caso: CasoAvaliacao; triagem: ResultadoTriagem }[]): string[] {
  const linhas: string[] = ['## E6: motor de regras', '']
  for (const conjunto of ['desenvolvimento', 'validacao'] as const) {
    const doConjunto = resultados.filter((item) => item.conjunto === conjunto)
    if (doConjunto.length === 0) continue
    const certos = doConjunto.filter((item) => item.certo).length
    const conta = (lista: readonly ResultadoRegraAvaliada[], erro: ErroRegra) => lista.filter((item) => item.erro === erro).length
    const achados = doConjunto.filter((item) => item.obtido === 'achado')
    linhas.push(
      `### Conjunto de ${conjunto === 'validacao' ? 'validação' : 'desenvolvimento'} (${doConjunto.length} expectativas de regra)`,
      '',
      `- Resultado aceito pelo gabarito: **${certos} de ${doConjunto.length}** (${porcentagem(certos / doConjunto.length)}).`,
      `- Falsos alertas: **${conta(doConjunto, 'falso-alerta')}**; achados esperados não detectados: **${conta(doConjunto, 'achado-nao-detectado')}**; abstenções indevidas: **${conta(doConjunto, 'abstencao-indevida')}**; tipo de achado diferente: **${conta(doConjunto, 'tipo-de-achado-diferente')}**; outro resultado: **${conta(doConjunto, 'resultado-diferente')}**.`,
      `- Evidência dos achados (hash e página conferem; valores conflitantes na região citada): ${achados.filter((item) => item.evidencia === 'correta').length} corretas de ${achados.length}.`,
      '',
      '| Regra | Expectativas | Aceitas | Falso alerta | Não detectado | Abstenção indevida | Tipo diferente | Outro | Obtidos (sem-achado / achado / não avaliável / pendente / não aplicável) |',
      '|---|---:|---:|---:|---:|---:|---:|---:|---|',
    )
    for (const regraId of [...new Set(doConjunto.map((item) => item.regraId))].sort()) {
      const daRegra = doConjunto.filter((item) => item.regraId === regraId)
      const obtidos = (valor: string) => daRegra.filter((item) => item.obtido === valor).length
      linhas.push(
        `| ${regraId} | ${daRegra.length} | ${daRegra.filter((item) => item.certo).length} | ${conta(daRegra, 'falso-alerta')} | ${conta(daRegra, 'achado-nao-detectado')} | ${conta(daRegra, 'abstencao-indevida')} | ${conta(daRegra, 'tipo-de-achado-diferente')} | ${conta(daRegra, 'resultado-diferente')} | ${obtidos('sem-achado')} / ${obtidos('achado')} / ${obtidos('nao-avaliavel')} / ${obtidos('condicao-pendente')} / ${obtidos('nao-aplicavel')} |`,
      )
    }
    linhas.push('')
    const erros = doConjunto.filter((item) => !item.certo)
    const origens = ['classificacao', 'ocr', 'extracao', 'condicao', 'regra'] as const
    linhas.push(`Origem dos erros: ${origens.map((origem) => `${origem} ${erros.filter((item) => item.origem === origem).length}`).join(', ')}.`, '')
    if (erros.length > 0) {
      linhas.push('Resultados diferentes do gabarito:', '')
      for (const item of erros) {
        linhas.push(`- ${item.caso} · ${item.regraId}: esperado ${item.aceitaveis.join(' ou ')}${item.tipoEsperado ? ` (${item.tipoEsperado})` : ''}; obtido **${item.obtido}**${item.tipoObtido ? ` (${item.tipoObtido})` : ''} — ${item.erro}, origem ${item.origem}. Gabarito: ${item.motivoGabarito}`)
      }
      linhas.push('')
    }
  }
  const todas = triagens.flatMap(({ triagem }) => triagem.avaliacoes)
  const distribuicao = new Map<string, Map<string, number>>()
  for (const avaliacao of todas) {
    const porResultado = distribuicao.get(avaliacao.contrato.regraId) ?? new Map<string, number>()
    porResultado.set(avaliacao.contrato.resultado, (porResultado.get(avaliacao.contrato.resultado) ?? 0) + 1)
    distribuicao.set(avaliacao.contrato.regraId, porResultado)
  }
  linhas.push(
    '### Estados de todas as avaliações (com e sem expectativa no gabarito)',
    '',
    '| Regra | sem-achado | achado | não avaliável | condição pendente | não aplicável |',
    '|---|---:|---:|---:|---:|---:|',
    ...[...distribuicao.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([regraId, mapa]) => `| ${regraId} | ${mapa.get('sem-achado') ?? 0} | ${mapa.get('achado') ?? 0} | ${mapa.get('nao-avaliavel') ?? 0} | ${mapa.get('condicao-pendente') ?? 0} | ${mapa.get('nao-aplicavel') ?? 0} |`),
    '',
    `Regras não executadas em todos os pacotes: ${[...new Set(triagens.flatMap(({ triagem }) => triagem.naoExecutadas.map((item) => `${item.regraId} (${item.motivo})`)))].join('; ')}.`,
    `Garantias aplicadas como invariantes: ${[...new Set(triagens.flatMap(({ triagem }) => triagem.garantias.map((item) => item.regraId)))].join(', ')}.`,
    '',
  )
  return linhas
}

/** Exemplos de triagem para o relatório: rascunho, evidência e quadro de valores, sem decisão. */
export function secaoExemplos(triagens: readonly { caso: CasoAvaliacao; triagem: ResultadoTriagem }[], exemplos: readonly [string, string][]): string[] {
  const linhas = ['## Exemplos de triagem', '']
  for (const [casoId, regraId] of exemplos) {
    const item = triagens.find(({ caso }) => caso.id === casoId)
    const avaliacao = item?.triagem.avaliacoes.find((valor) => valor.contrato.regraId === regraId)
    if (!item || !avaliacao) continue
    linhas.push(
      `### ${casoId} · ${regraId} (${avaliacao.nomeRegra}): ${avaliacao.contrato.resultado}${avaliacao.contrato.tipo ? ` / ${avaliacao.contrato.tipo}` : ''}`,
      '',
      `*${item.caso.titulo}*`,
      '',
      `- Versão da regra: \`${avaliacao.contrato.regraVersao}\`; severidade do alerta: ${avaliacao.contrato.severidade}; confiança: ${avaliacao.confianca}.`,
      `- Rascunho: ${avaliacao.contrato.rascunho}`,
      ...(avaliacao.contrato.motivo ? [`- Motivo: ${avaliacao.contrato.motivo}`] : []),
      ...avaliacao.contrato.evidencias.slice(0, 4).map((evidencia) => `- Evidência: ${evidencia.anexoId}, hash ${evidencia.sha256.slice(0, 12)}…${evidencia.pagina ? `, página ${evidencia.pagina}` : ''}${evidencia.regioes?.[0] ? `, região x=${evidencia.regioes[0].x.toFixed(3)} y=${evidencia.regioes[0].y.toFixed(3)}` : ''}${evidencia.trecho ? `, trecho "${evidencia.trecho}"` : ''} (${evidencia.origem}).`),
      ...avaliacao.valoresConflitantes.map((conflito) => `- Valores de ${conflito.campo}: ${conflito.valores.map((valor) => `"${valor.valorBruto}" (${valor.classe}, ${valor.anexoId})`).join(' × ')}.`),
      ...(avaliacao.contrato.procura ? [`- Anexos procurados (pacote ${avaliacao.contrato.procura.integridadeDoPacote}): ${avaliacao.contrato.procura.anexosProcurados.map((anexo) => `${anexo.anexoId}=${anexo.classe}`).join(', ')}.`] : []),
      `- Fundamento: ${avaliacao.contrato.fundamentos.map((fonte) => `${fonte.fonte} (${fonte.local})`).join('; ')}.`,
      ...avaliacao.limitacoes.slice(0, 3).map((limitacao) => `- Limitação: ${limitacao}`),
      `- Revisão humana: ${avaliacao.revisaoHumana}.`,
      '',
    )
  }
  return linhas
}
