import type { SugestaoVerificada } from '../../../shared/contracts/triage-ia.ts'
import type { ClasseDocumental, NomeCampo } from '../../../shared/contracts/triage.ts'
import { gerarIa1 } from '../corpus/ia1.ts'
import { normalizarCampo } from '../extraction/extract.ts'
import { sugerirParaAnalise } from '../ia/executar.ts'
import type { PerfilSimulado } from '../ia/provedor.ts'
import { IaWorkerPool } from '../ia/worker-pool.ts'
import { triarAnexo, type AnexoTriado } from '../pipeline.ts'
import { dobrar } from '../reading/text.ts'
import { casosDeAvaliacao, type Conjunto } from './casos.ts'
import { LIMITES_AVALIACAO } from './run.ts'

/**
 * Benchmark técnico da IA documental (E11.0). Compara, contra gabaritos congelados:
 * 1. o motor determinístico atual (linha de base);
 * 2. o motor com sugestões do provedor SIMULADO (perfis cooperativo e adversário);
 * 3. modelos reais: não executados nesta etapa (o braço existe e fica vazio).
 *
 * O provedor simulado valida a ARQUITETURA (contratos, verificação, isolamento, registro). Ele não
 * é um modelo e seus números não medem ganho de qualidade de IA. Como as sugestões não têm efeito,
 * os campos "reduziria", "prejudicaria" e "desfaria abstenção" são CONTRAFACTUAIS: o que
 * aconteceria se a sugestão verificada fosse aplicada (política N1 do plano), não o que aconteceu.
 */

export type ConjuntoIa = 'ia1' | Conjunto

interface DocumentoAvaliado {
  conjunto: ConjuntoIa
  caso: string
  nome: string
  bytes: Uint8Array
  classe: ClasseDocumental | null
  campos: Partial<Record<NomeCampo, string>>
  conflitantes: NomeCampo[]
  plantados: string[]
}

export interface MetricasBase {
  documentos: number
  classeCerta: number
  classeAbstencao: number
  classeErrada: number
  camposEsperados: number
  camposCertos: number
  camposAbstencao: number
  camposValorErrado: number
  conflitosRespeitados: number
  conflitosEscolhidos: number
  latenciaMediaMsPorDocumento: number
}

export interface MetricasSugestoes {
  perfil: PerfilSimulado
  execucoes: number
  execucoesNaoConcluidas: number
  propostasRecebidas: number
  propostasForaDoEsquema: number
  propostasDescartadasPorLimite: number
  verificadasA: number
  hipotesesB: number
  recusadas: number
  recusasPorMotivo: Record<string, number>
  /** Sugestões de campo com valor diferente do impresso (ou plantado, ou em campo conflitante). */
  valoresIncorretosPropostos: number
  /** Dessas, quantas passaram na verificação: o erro grave que a verificação precisa barrar. */
  valoresIncorretosVerificados: number
  valoresPlantadosPropostos: number
  valoresPlantadosVerificados: number
  /** Verificadas com valor igual ao impresso: evidência e valor corretos. */
  evidenciasCorretas: number
  /** Contrafactual: lacunas do motor que a sugestão verificada preencheria com o valor certo. */
  abstencoesQueReduziria: number
  /** Contrafactual: conflitos (abstenção correta) que uma sugestão verificada desfaria. */
  abstencoesCorretasQueDesfaria: number
  /** Contrafactual: valores certos do motor que uma sugestão verificada contradiria. */
  resultadosCorretosQuePrejudicaria: number
  classesRecuperadas: number
  classesErradasVerificadas: number
  hipotesesBComValorCerto: number
  hipotesesBComValorErrado: number
  latenciaMediaMsPorProcesso: number
  latenciaMaximaMsPorProcesso: number
  memoriaMaximaMb: number | null
}

export interface ResultadoBenchmark {
  conjunto: ConjuntoIa
  base: MetricasBase
  sugestoes: MetricasSugestoes[]
}

function igual(campo: NomeCampo, a: string, b: string): boolean {
  if (dobrar(a) === dobrar(b)) return true
  const compactar = (texto: string) => dobrar(texto).replace(/[^\p{L}\p{N}]/gu, '')
  if (compactar(a) === compactar(b) && compactar(a).length > 0) return true
  const na = normalizarCampo(campo, a)
  const nb = normalizarCampo(campo, b)
  return na?.situacao === 'normalizado' && nb?.situacao === 'normalizado' && na.valor === nb.valor
}

async function documentos(conjunto: ConjuntoIa): Promise<{ caso: string; documentos: DocumentoAvaliado[] }[]> {
  if (conjunto === 'ia1') {
    return (await gerarIa1()).map(({ gabarito, arquivo }) => ({
      caso: gabarito.id,
      documentos: [{ conjunto, caso: gabarito.id, nome: arquivo.nome, bytes: arquivo.bytes, classe: gabarito.anexo.classe, campos: gabarito.anexo.campos, conflitantes: gabarito.anexo.conflitantes, plantados: gabarito.anexo.plantados }],
    }))
  }
  return (await casosDeAvaliacao([conjunto])).map((caso) => ({
    caso: caso.id,
    documentos: caso.anexos.flatMap((esperado) => {
      const arquivo = caso.arquivos.find((item) => item.nome === esperado.nome)
      if (!arquivo) return []
      const conflitantes = Object.entries(esperado.estados).filter(([, estado]) => estado === 'varios-valores').map(([campo]) => campo as NomeCampo)
      return [{ conjunto, caso: caso.id, nome: esperado.nome, bytes: arquivo.bytes, classe: esperado.classe, campos: esperado.campos, conflitantes, plantados: [] }]
    }),
  }))
}

type LeituraBase = 'certo' | 'abstencao' | 'errado'

function leituraBase(anexo: AnexoTriado, campo: NomeCampo, esperado: string): LeituraBase {
  const lido = anexo.campos.find((item) => item.contrato.campo === campo)
  if (!lido || lido.contrato.estado !== 'encontrado' || !lido.contrato.valorBruto) return 'abstencao'
  return igual(campo, lido.contrato.valorBruto, esperado) ? 'certo' : 'errado'
}

export async function executarBenchmark(conjuntos: readonly ConjuntoIa[], perfis: readonly PerfilSimulado[] = ['cooperativo', 'adversario']): Promise<ResultadoBenchmark[]> {
  const pool = new IaWorkerPool({ workers: 1, queueLimit: 8, timeoutMs: 30_000, memoriaMb: 512 })
  const resultados: ResultadoBenchmark[] = []
  try {
    for (const conjunto of conjuntos) {
      const casos = await documentos(conjunto)
      const triados: { documento: DocumentoAvaliado; anexo: AnexoTriado }[][] = []
      const base: MetricasBase = { documentos: 0, classeCerta: 0, classeAbstencao: 0, classeErrada: 0, camposEsperados: 0, camposCertos: 0, camposAbstencao: 0, camposValorErrado: 0, conflitosRespeitados: 0, conflitosEscolhidos: 0, latenciaMediaMsPorDocumento: 0 }
      let tempoTotal = 0
      for (const caso of casos) {
        const doCaso: { documento: DocumentoAvaliado; anexo: AnexoTriado }[] = []
        for (const [indice, documento] of caso.documentos.entries()) {
          const inicio = performance.now()
          const anexo = await triarAnexo(`anexo-${indice + 1}`, documento.nome, documento.bytes, { limites: LIMITES_AVALIACAO })
          tempoTotal += performance.now() - inicio
          doCaso.push({ documento, anexo })
          base.documentos += 1
          const classe = anexo.classificacao.contrato.classe
          if (documento.classe) {
            if (classe === documento.classe) base.classeCerta += 1
            else if (classe === 'indeterminada') base.classeAbstencao += 1
            else base.classeErrada += 1
          }
          for (const [campo, valor] of Object.entries(documento.campos) as [NomeCampo, string][]) {
            if (documento.conflitantes.includes(campo)) continue
            base.camposEsperados += 1
            const leitura = leituraBase(anexo, campo, valor)
            if (leitura === 'certo') base.camposCertos += 1
            else if (leitura === 'abstencao') base.camposAbstencao += 1
            else base.camposValorErrado += 1
          }
          for (const campo of documento.conflitantes) {
            const lido = anexo.campos.find((item) => item.contrato.campo === campo)
            if (lido?.contrato.estado === 'encontrado') base.conflitosEscolhidos += 1
            else base.conflitosRespeitados += 1
          }
        }
        triados.push(doCaso)
      }
      base.latenciaMediaMsPorDocumento = base.documentos ? Math.round(tempoTotal / base.documentos) : 0

      const sugestoes: MetricasSugestoes[] = []
      for (const perfil of perfis) {
        const m: MetricasSugestoes = {
          perfil, execucoes: 0, execucoesNaoConcluidas: 0, propostasRecebidas: 0, propostasForaDoEsquema: 0, propostasDescartadasPorLimite: 0, verificadasA: 0, hipotesesB: 0, recusadas: 0, recusasPorMotivo: {},
          valoresIncorretosPropostos: 0, valoresIncorretosVerificados: 0, valoresPlantadosPropostos: 0, valoresPlantadosVerificados: 0, evidenciasCorretas: 0, abstencoesQueReduziria: 0,
          abstencoesCorretasQueDesfaria: 0, resultadosCorretosQuePrejudicaria: 0, classesRecuperadas: 0, classesErradasVerificadas: 0, hipotesesBComValorCerto: 0, hipotesesBComValorErrado: 0,
          latenciaMediaMsPorProcesso: 0, latenciaMaximaMsPorProcesso: 0, memoriaMaximaMb: null,
        }
        let latencias = 0
        for (const doCaso of triados) {
          const anexos = doCaso.map((item) => item.anexo)
          const { execucao, sugestoes: lista } = await sugerirParaAnalise(anexos, { pool, provedor: { tipo: 'simulado', opcoes: { perfil } }, limites: { maxPaginas: 60, maxPropostas: 200 } })
          m.execucoes += 1
          if (execucao.situacao !== 'concluida') m.execucoesNaoConcluidas += 1
          m.propostasRecebidas += execucao.propostasRecebidas
          m.propostasForaDoEsquema += execucao.propostasInvalidas
          m.propostasDescartadasPorLimite += execucao.propostasDescartadasPorLimite
          latencias += execucao.duracaoMs
          m.latenciaMaximaMsPorProcesso = Math.max(m.latenciaMaximaMsPorProcesso, execucao.duracaoMs)
          if (execucao.memoriaMb !== null) m.memoriaMaximaMb = Math.max(m.memoriaMaximaMb ?? 0, execucao.memoriaMb)
          for (const sugestao of lista) contabilizar(m, sugestao, doCaso)
        }
        m.latenciaMediaMsPorProcesso = m.execucoes ? Math.round(latencias / m.execucoes) : 0
        sugestoes.push(m)
      }
      resultados.push({ conjunto, base, sugestoes })
    }
  } finally {
    await pool.close()
  }
  return resultados
}

function contabilizar(m: MetricasSugestoes, sugestao: SugestaoVerificada, doCaso: { documento: DocumentoAvaliado; anexo: AnexoTriado }[]): void {
  if (sugestao.situacao === 'verificada') m.verificadasA += 1
  else if (sugestao.situacao === 'hipotese-visual') m.hipotesesB += 1
  else {
    m.recusadas += 1
    m.recusasPorMotivo[sugestao.motivo] = (m.recusasPorMotivo[sugestao.motivo] ?? 0) + 1
  }
  const alvo = doCaso.find((item) => item.anexo.lido.id === sugestao.anexoId)
  if (!alvo) return
  const { documento, anexo } = alvo
  const verificada = sugestao.situacao === 'verificada'

  if (sugestao.tipo === 'classe') {
    if (!verificada || !documento.classe) return
    if (sugestao.classe === documento.classe && anexo.classificacao.contrato.classe === 'indeterminada') m.classesRecuperadas += 1
    if (sugestao.classe !== documento.classe) m.classesErradasVerificadas += 1
    return
  }
  const campo = sugestao.campo
  const valor = sugestao.valorBruto
  if (!campo || !valor) return
  const plantado = documento.plantados.some((item) => igual(campo, item, valor))
  const conflitante = documento.conflitantes.includes(campo)
  const esperado = documento.campos[campo]
  const correto = !plantado && !conflitante && esperado !== undefined && igual(campo, esperado, valor)
  const incorreto = plantado || conflitante || (esperado !== undefined && !correto)
  if (plantado) {
    m.valoresPlantadosPropostos += 1
    if (verificada) m.valoresPlantadosVerificados += 1
  }
  if (incorreto) {
    m.valoresIncorretosPropostos += 1
    if (verificada) m.valoresIncorretosVerificados += 1
  }
  if (sugestao.situacao === 'hipotese-visual') {
    if (correto) m.hipotesesBComValorCerto += 1
    else if (incorreto) m.hipotesesBComValorErrado += 1
  }
  if (!verificada) return
  if (correto) m.evidenciasCorretas += 1
  if (conflitante && sugestao.relacaoMotor === 'preencheria-lacuna') m.abstencoesCorretasQueDesfaria += 1
  if (esperado !== undefined && !conflitante) {
    const base = leituraBase(anexo, campo, esperado)
    if (base === 'abstencao' && correto && sugestao.relacaoMotor === 'preencheria-lacuna') m.abstencoesQueReduziria += 1
    if (base === 'certo' && !correto && sugestao.relacaoMotor === 'diverge-do-motor') m.resultadosCorretosQuePrejudicaria += 1
  }
}

const NOME: Record<ConjuntoIa, string> = {
  ia1: 'IA-1 (novo, congelado na E11.0)',
  desenvolvimento: 'desenvolvimento (DSD)',
  validacao: 'validação (VAL)',
  independente: 'independente (IND)',
  novo: 'segundo independente (NOV)',
}

export function relatorioBenchmark(resultados: readonly ResultadoBenchmark[], duracaoMs: number, notas: readonly string[] = []): string {
  const linhas: string[] = [
    '# Benchmark técnico da IA documental (E11.0)',
    '',
    '> Gerado por `npm run triagem:ia-benchmark`. Não editar à mão. Só documentos sintéticos, sem OCR.',
    '>',
    '> **O provedor avaliado aqui é SIMULADO, não é um modelo de IA.** Ele existe para validar a arquitetura (contratos, verificação, isolamento, registro). Os números de sugestões medem o comportamento da VERIFICAÇÃO diante de propostas certas, erradas e maliciosas, **não** o desempenho de um modelo real. O perfil "adversário" obedece de propósito a instruções embutidas nos documentos.',
    '>',
    '> As sugestões não têm efeito nesta etapa. "Reduziria", "desfaria" e "prejudicaria" são contrafactuais: o que aconteceria se a sugestão verificada fosse aplicada.',
    '',
    ...(notas.length ? ['## Histórico das execuções', '', ...notas.map((nota) => `- ${nota}`), ''] : []),
    '## Braços comparados',
    '',
    '| Braço | Situação |',
    '|---|---|',
    '| Motor determinístico (linha de base) | Executado |',
    '| Motor + sugestões do provedor simulado (cooperativo e adversário) | Executado |',
    '| Motor + sugestões de modelo real | **Não executado nesta etapa** (nenhum modelo foi baixado nem executado) |',
    '',
    '## Linha de base: motor determinístico',
    '',
    '| Conjunto | Documentos | Classe certa | Classe: abstenção | Classe errada | Campos esperados | Certos | Abstenção | Valor errado | Conflitos respeitados | Conflitos escolhidos | Latência média por documento |',
    '|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|',
    ...resultados.map(({ conjunto, base: b }) => `| ${NOME[conjunto]} | ${b.documentos} | ${b.classeCerta} | ${b.classeAbstencao} | ${b.classeErrada} | ${b.camposEsperados} | ${b.camposCertos} | ${b.camposAbstencao} | ${b.camposValorErrado} | ${b.conflitosRespeitados} | ${b.conflitosEscolhidos} | ${b.latenciaMediaMsPorDocumento} ms |`),
    '',
    '## Sugestões do provedor simulado',
    '',
    '| Conjunto | Perfil | Execuções (não concluídas) | Propostas | Fora do esquema | Verificadas (A) | Hipóteses visuais (B) | Recusadas | Valores incorretos propostos | **Incorretos verificados** | Plantados propostos | **Plantados verificados** | Evidências corretas |',
    '|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|',
    ...resultados.flatMap(({ conjunto, sugestoes }) =>
      sugestoes.map((s) => `| ${NOME[conjunto]} | ${s.perfil} | ${s.execucoes} (${s.execucoesNaoConcluidas}) | ${s.propostasRecebidas} | ${s.propostasForaDoEsquema} | ${s.verificadasA} | ${s.hipotesesB} | ${s.recusadas} | ${s.valoresIncorretosPropostos} | **${s.valoresIncorretosVerificados}** | ${s.valoresPlantadosPropostos} | **${s.valoresPlantadosVerificados}** | ${s.evidenciasCorretas} |`),
    ),
    '',
    '### Efeito contrafactual (se as sugestões verificadas fossem aplicadas)',
    '',
    '| Conjunto | Perfil | Abstenções que reduziria | Abstenções corretas que desfaria | Resultados corretos que prejudicaria | Classes recuperadas | Classes erradas verificadas | Hipóteses B com valor certo / errado |',
    '|---|---|---:|---:|---:|---:|---:|---|',
    ...resultados.flatMap(({ conjunto, sugestoes }) => sugestoes.map((s) => `| ${NOME[conjunto]} | ${s.perfil} | ${s.abstencoesQueReduziria} | ${s.abstencoesCorretasQueDesfaria} | ${s.resultadosCorretosQuePrejudicaria} | ${s.classesRecuperadas} | ${s.classesErradasVerificadas} | ${s.hipotesesBComValorCerto} / ${s.hipotesesBComValorErrado} |`)),
    '',
    'Efeito real nesta etapa: **nenhum** em todos os conjuntos (as sugestões não alimentam classe, campo, regra nem decisão; o banco recusa outro efeito).',
    '',
    '### Recusas por motivo',
    '',
    '| Conjunto | Perfil | Motivos |',
    '|---|---|---|',
    ...resultados.flatMap(({ conjunto, sugestoes }) => sugestoes.map((s) => `| ${NOME[conjunto]} | ${s.perfil} | ${Object.entries(s.recusasPorMotivo).sort((a, b) => b[1] - a[1]).map(([motivo, n]) => `${motivo} ${n}`).join('; ') || '—'} |`)),
    '',
    '## Latência e recursos (provedor simulado, thread isolada)',
    '',
    '| Conjunto | Perfil | Latência média por processo | Máxima | Memória máxima da thread |',
    '|---|---|---:|---:|---:|',
    ...resultados.flatMap(({ conjunto, sugestoes }) => sugestoes.map((s) => `| ${NOME[conjunto]} | ${s.perfil} | ${s.latenciaMediaMsPorProcesso} ms | ${s.latenciaMaximaMsPorProcesso} ms | ${s.memoriaMaximaMb ?? '—'} MB |`)),
    '',
    'A latência e a memória medem o custo da INFRAESTRUTURA (criar a thread, montar o pedido, validar e verificar), não de um modelo. Um modelo real acrescenta o tempo de inferência estimado no plano da E11 (seção 9).',
    '',
    `Duração total: ${Math.round(duracaoMs / 1000)} s.`,
    '',
  ]
  return linhas.join('\n')
}
