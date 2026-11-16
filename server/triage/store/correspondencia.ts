import type { AvaliacaoDetalhada } from '../engine/engine.ts'

/**
 * Correspondência entre um achado de uma análise nova e o mesmo item numa análise anterior em que
 * houve revisão humana. Serve só para MOSTRAR a relação: a revisão continua presa à análise em que
 * foi feita e nunca é transportada sozinha. "Equivalente" exige que tudo o que a pessoa viu ao
 * revisar seja igual; qualquer diferença (ou dúvida) pede revisão nova.
 */

export type DiferencaAchado = 'versao-da-regra' | 'resultado' | 'tipo' | 'condicoes' | 'evidencias' | 'valores' | 'texto'

export const DIFERENCAS_ROTULO: Readonly<Record<DiferencaAchado, string>> = {
  'versao-da-regra': 'versão da regra',
  resultado: 'resultado',
  tipo: 'tipo do achado',
  condicoes: 'condições pendentes',
  evidencias: 'evidências',
  valores: 'valores comparados',
  texto: 'texto do achado',
}

const ordenado = <T,>(lista: readonly T[], chave: (item: T) => string): T[] => [...lista].sort((a, b) => chave(a).localeCompare(chave(b)))

function evidencias(detalhe: AvaliacaoDetalhada): string {
  const normalizadas = detalhe.contrato.evidencias.map((evidencia) => ({
    anexo: evidencia.anexoId,
    sha256: evidencia.sha256,
    pagina: evidencia.pagina ?? null,
    trecho: evidencia.trecho ?? null,
    regioes: (evidencia.regioes ?? []).map((regiao) => [regiao.x, regiao.y, regiao.width, regiao.height].map((valor) => Math.round(valor * 10_000))),
  }))
  return JSON.stringify(ordenado(normalizadas, (item) => JSON.stringify(item)))
}

function valores(detalhe: AvaliacaoDetalhada): string {
  const conflitos = detalhe.valoresConflitantes.map((conflito) => ({
    campo: conflito.campo,
    valores: ordenado(
      conflito.valores.map((valor) => ({ anexo: valor.anexoId, valor: valor.valorBruto })),
      (item) => `${item.anexo}#${item.valor}`,
    ),
  }))
  return JSON.stringify(ordenado(conflitos, (item) => item.campo))
}

export function compararAchados(anterior: AvaliacaoDetalhada, atual: AvaliacaoDetalhada): DiferencaAchado[] {
  if (anterior.contrato.regraId !== atual.contrato.regraId) throw new Error('Comparação entre regras diferentes')
  const diferencas: DiferencaAchado[] = []
  if (anterior.contrato.regraVersao !== atual.contrato.regraVersao) diferencas.push('versao-da-regra')
  if (anterior.contrato.resultado !== atual.contrato.resultado) diferencas.push('resultado')
  if ((anterior.contrato.tipo ?? null) !== (atual.contrato.tipo ?? null)) diferencas.push('tipo')
  if (JSON.stringify([...anterior.contrato.condicoesPendentes].sort()) !== JSON.stringify([...atual.contrato.condicoesPendentes].sort())) diferencas.push('condicoes')
  if (evidencias(anterior) !== evidencias(atual)) diferencas.push('evidencias')
  if (valores(anterior) !== valores(atual)) diferencas.push('valores')
  if (anterior.contrato.rascunho !== atual.contrato.rascunho) diferencas.push('texto')
  return diferencas
}
