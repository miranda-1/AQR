/**
 * Métricas por categoria a partir de pares (esperado, obtido). Nada de taxa global sozinha: cada
 * classe tem precisão, cobertura e abstenção, e a matriz de confusão mostra para onde vão os erros.
 */

export interface Par<T extends string> {
  esperado: T
  obtido: T
}

export interface MetricaCategoria {
  categoria: string
  /** Quantas vezes era esta a resposta certa. */
  esperados: number
  /** Quantas vezes o sistema respondeu esta categoria. */
  propostos: number
  acertos: number
  /** acertos / propostos (null sem propostas). */
  precisao: number | null
  /** acertos / esperados (null sem esperados). */
  cobertura: number | null
  /** Esperados em que o sistema se absteve. */
  abstencoes: number
}

export interface MatrizConfusao {
  linhas: string[]
  colunas: string[]
  /** contagem[esperado][obtido] */
  contagem: Record<string, Record<string, number>>
}

export function metricasPorCategoria<T extends string>(pares: readonly Par<T>[], abstencao: T): MetricaCategoria[] {
  const categorias = [...new Set(pares.flatMap((par) => [par.esperado, par.obtido]))].filter((categoria) => categoria !== abstencao).sort()
  return categorias.map((categoria) => {
    const esperados = pares.filter((par) => par.esperado === categoria).length
    const propostos = pares.filter((par) => par.obtido === categoria).length
    const acertos = pares.filter((par) => par.esperado === categoria && par.obtido === categoria).length
    const abstencoes = pares.filter((par) => par.esperado === categoria && par.obtido === abstencao).length
    return {
      categoria,
      esperados,
      propostos,
      acertos,
      precisao: propostos > 0 ? acertos / propostos : null,
      cobertura: esperados > 0 ? acertos / esperados : null,
      abstencoes,
    }
  })
}

export function matrizDeConfusao<T extends string>(pares: readonly Par<T>[]): MatrizConfusao {
  const linhas = [...new Set(pares.map((par) => par.esperado))].sort()
  const colunas = [...new Set(pares.map((par) => par.obtido))].sort()
  const contagem: MatrizConfusao['contagem'] = {}
  for (const linha of linhas) contagem[linha] = Object.fromEntries(colunas.map((coluna) => [coluna, 0]))
  for (const par of pares) {
    const linha = contagem[par.esperado]
    if (linha) linha[par.obtido] = (linha[par.obtido] ?? 0) + 1
  }
  return { linhas, colunas, contagem }
}

export const porcentagem = (valor: number | null): string => (valor === null ? '—' : `${(valor * 100).toFixed(1).replace('.', ',')}%`)

export function tabelaMetricas(metricas: readonly MetricaCategoria[], rotulo: string): string[] {
  return [
    `| ${rotulo} | Esperados | Propostos | Acertos | Precisão | Cobertura | Abstenções |`,
    '|---|---:|---:|---:|---:|---:|---:|',
    ...metricas.map(
      (item) =>
        `| ${item.categoria} | ${item.esperados} | ${item.propostos} | ${item.acertos} | ${porcentagem(item.precisao)} | ${porcentagem(item.cobertura)} | ${item.abstencoes} |`,
    ),
  ]
}

export function tabelaMatriz(matriz: MatrizConfusao, rotulo: string): string[] {
  return [
    `| ${rotulo} ↓ / obtido → | ${matriz.colunas.join(' | ')} |`,
    `|---|${matriz.colunas.map(() => '---:').join('|')}|`,
    ...matriz.linhas.map((linha) => `| ${linha} | ${matriz.colunas.map((coluna) => {
      const valor = matriz.contagem[linha]?.[coluna] ?? 0
      return valor === 0 ? '·' : linha === coluna ? `**${valor}**` : String(valor)
    }).join(' | ')} |`),
  ]
}
