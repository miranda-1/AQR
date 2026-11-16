import { createHash } from 'node:crypto'
import { openDatabase } from '../../db/database.ts'
import { migrate } from '../../db/migrate.ts'
import { seedAccount } from '../../test/accounts.ts'
import type { CatalogoNormativo } from '../catalog/catalog.ts'
import { executarTriagem } from '../engine/engine.ts'
import { triarAnexo } from '../pipeline.ts'
import { TriagemService, type Ator } from '../store/service.ts'
import type { CasoAvaliacao } from './casos.ts'
import { LIMITES_AVALIACAO } from './run.ts'

/**
 * E10.4: reprocessamento incremental × execução integral, com dados sintéticos.
 *
 * O serviço sempre roda as 19 regras (integral) e grava esse resultado. A estratégia incremental
 * pura reaproveitaria, sem recalcular, toda regra fora do mapa `DEPENDENCIAS` afetado pela mudança.
 * Para cada perturbação (confirmação de completude, condição da 028, correção de campo que diverge
 * ou que harmoniza valores), medimos:
 * - se o que ficou gravado é idêntico a uma execução integral feita do zero (deve ser sempre);
 * - quantas regras o incremental puro teria deixado erradas ("dependência não prevista").
 */

export interface PerturbacaoMedida {
  caso: string
  perturbacao: string
  recalculadas: number
  reaproveitadas: number
  alteradas: string[]
  /** Regras que o incremental puro teria reaproveitado com resultado desatualizado. */
  naoPrevistas: string[]
  /** O gravado difere da execução integral do zero (nunca deve acontecer). */
  divergeDoIntegral: boolean
}

const sha = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex')

function mutar(valor: string): string {
  // Troca o último dígito, ou acrescenta um sufixo: sempre um valor diferente e plausível.
  const ultimo = /\d(?!.*\d)/u.exec(valor)
  if (ultimo) return `${valor.slice(0, ultimo.index)}${(Number(ultimo[0]) + 1) % 10}${valor.slice(ultimo.index + 1)}`
  return `${valor} B`
}

export async function compararEstrategias(casos: readonly CasoAvaliacao[], catalogo: CatalogoNormativo): Promise<PerturbacaoMedida[]> {
  const db = openDatabase(':memory:')
  migrate(db)
  const ator: Ator = { accountId: seedAccount(db, 'ana.analista', 'analista'), usuario: 'ana.analista', papel: 'analista' }
  const servico = new TriagemService({ db, catalogo, conteudo: null, retencaoHoras: 72 })
  const medidas: PerturbacaoMedida[] = []
  try {
    for (const caso of casos) {
      const arquivos = caso.anexos.map((esperado) => {
        const arquivo = caso.arquivos.find((item) => item.nome === esperado.nome)
        if (!arquivo) throw new Error(`${caso.id}: ${esperado.nome}`)
        return { nome: arquivo.nome, bytes: arquivo.bytes, sha256: sha(arquivo.bytes) }
      })
      const criado = servico.criar(ator, { referencia: caso.id, protocoladoEm: caso.entrada.protocoladoEm, modalidade: 'D', etapa: 'abertura' }, arquivos)
      if (!criado.analise) throw new Error(`${caso.id}: sem análise`)
      const triados = []
      for (const anexo of criado.anexos) triados.push(await triarAnexo(anexo.id, anexo.nome, arquivos[anexo.ordem - 1]?.bytes ?? new Uint8Array(), { limites: LIMITES_AVALIACAO }))
      servico.concluirAnalise(criado.analise.id, triados)
      const id = criado.triagem.id
      const versao = () => servico.repo.triagem(id)?.versao ?? 0
      const atual = () => {
        const triagem = servico.repo.triagem(id)
        const analise = triagem?.analiseAtual ? servico.repo.analisePorNumero(id, triagem.analiseAtual) : undefined
        if (!analise) throw new Error(`${caso.id}: sem análise atual`)
        return analise
      }

      const medir = (perturbacao: string) => {
        const feito = servico.reprocessar(ator, id, versao())
        const integral = executarTriagem(feito.analise.entrada as Parameters<typeof executarTriagem>[0], servico.anexosDaAnalise(feito.analise), { catalogo })
        const gravadas = servico.repo.avaliacoes(feito.analise.id).map((item) => JSON.stringify(item.detalhe))
        const esperadas = [...integral.avaliacoes].sort((a, b) => a.contrato.regraId.localeCompare(b.contrato.regraId)).map((detalhe) => JSON.stringify(detalhe))
        const evento = db
          .prepare("SELECT detalhes FROM triagem_eventos WHERE triagem_id = ? AND acao = 'analise.concluida' ORDER BY ocorrido_em DESC, rowid DESC LIMIT 1")
          .get(id) as { detalhes: string } | undefined
        const detalhes = JSON.parse(evento?.detalhes ?? '{}') as { dependenciaNaoPrevista?: string[] }
        medidas.push({
          caso: caso.id,
          perturbacao,
          recalculadas: feito.recalculadas.length,
          reaproveitadas: feito.reaproveitadas.length,
          alteradas: feito.alteradas,
          naoPrevistas: detalhes.dependenciaNaoPrevista ?? [],
          divergeDoIntegral: JSON.stringify(gravadas) !== JSON.stringify(esperadas),
        })
      }

      // 1. Completude confirmada como no gabarito (ou "completo", se o gabarito não diz).
      const integridade = caso.entrada.integridadeDoPacote === 'desconhecida' ? 'completo' : caso.entrada.integridadeDoPacote
      servico.confirmar(ator, id, versao(), { tipo: 'integridade', valor: integridade, justificativa: 'Perturbação sintética (E10.4).' })
      medir(`completude: ${integridade}`)
      // 2–3. Condição da 028 confirmada nos dois sentidos.
      for (const valor of [true, false]) {
        servico.confirmar(ator, id, versao(), { tipo: 'condicao', condicao: 'area-situacao-acima-2ha', valor, justificativa: 'Perturbação sintética (E10.4).' })
        medir(`área acima de 2 ha: ${valor ? 'sim' : 'não'}`)
      }
      // 4. Correção que diverge: um campo de cada nome, num anexo, recebe outro valor.
      const campos = servico.anexosDaAnalise(atual()).flatMap((anexo) => anexo.campos.map((campo) => campo.contrato)).filter((campo) => campo.valorBruto)
      const porNome = new Map<string, typeof campos>()
      for (const campo of campos) porNome.set(campo.campo, [...(porNome.get(campo.campo) ?? []), campo])
      for (const [nome, lista] of porNome) {
        const alvo = lista[0]
        if (!alvo?.valorBruto) continue
        servico.revisar(ator, id, versao(), { decisao: 'corrigido', campoId: alvo.id, novoValor: mutar(alvo.valorBruto), justificativa: 'Perturbação sintética (E10.4).' })
        medir(`correção divergente: ${nome}`)
        // 5. Correção que harmoniza: o mesmo campo volta ao valor mais frequente nos outros anexos.
        const frequencias = new Map<string, number>()
        for (const campo of lista.slice(1)) if (campo.valorBruto) frequencias.set(campo.valorBruto, (frequencias.get(campo.valorBruto) ?? 0) + 1)
        const maisComum = [...frequencias.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? alvo.valorBruto
        servico.revisar(ator, id, versao(), { decisao: 'corrigido', campoId: alvo.id, novoValor: maisComum, justificativa: 'Perturbação sintética (E10.4).' })
        medir(`correção que harmoniza: ${nome}`)
      }
    }
  } finally {
    db.close()
  }
  return medidas
}

export function resumoIncremental(medidas: readonly PerturbacaoMedida[]): string {
  const total = medidas.length
  const divergencias = medidas.filter((medida) => medida.divergeDoIntegral)
  const comNaoPrevistas = medidas.filter((medida) => medida.naoPrevistas.length > 0)
  const regrasAfetadas = new Map<string, number>()
  for (const medida of comNaoPrevistas) for (const regra of medida.naoPrevistas) regrasAfetadas.set(regra, (regrasAfetadas.get(regra) ?? 0) + 1)
  const porTipo = new Map<string, { total: number; naoPrevistas: number; alteradas: number }>()
  for (const medida of medidas) {
    const tipo = medida.perturbacao.split(':')[0] ?? medida.perturbacao
    const atual = porTipo.get(tipo) ?? { total: 0, naoPrevistas: 0, alteradas: 0 }
    atual.total += 1
    atual.naoPrevistas += medida.naoPrevistas.length > 0 ? 1 : 0
    atual.alteradas += medida.alteradas.length > 0 ? 1 : 0
    porTipo.set(tipo, atual)
  }
  const linhas = [
    `- Reprocessamentos medidos: ${total} (em ${new Set(medidas.map((medida) => medida.caso)).size} pacotes sintéticos).`,
    `- Gravado diferente da execução integral do zero: **${divergencias.length}**.`,
    `- Reprocessamentos em que o incremental puro teria deixado regra desatualizada: **${comNaoPrevistas.length}** (${regrasAfetadas.size} regras distintas).`,
    '',
    '| Perturbação | Reprocessamentos | Com resultado alterado | Incremental puro erraria |',
    '|---|---:|---:|---:|',
    ...[...porTipo.entries()].map(([tipo, valor]) => `| ${tipo} | ${valor.total} | ${valor.alteradas} | ${valor.naoPrevistas} |`),
  ]
  if (regrasAfetadas.size > 0) {
    linhas.push('', '| Regra fora do mapa de dependências que mudou | Vezes |', '|---|---:|', ...[...regrasAfetadas.entries()].sort((a, b) => b[1] - a[1]).map(([regra, vezes]) => `| ${regra} | ${vezes} |`))
    linhas.push('', 'Exemplos:', ...comNaoPrevistas.slice(0, 12).map((medida) => `- ${medida.caso}, ${medida.perturbacao}: ${medida.naoPrevistas.join(', ')}`))
  }
  return linhas.join('\n')
}
