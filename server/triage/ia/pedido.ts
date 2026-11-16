import type { NomeCampo } from '../../../shared/contracts/triage.ts'
import type { AnexoTriado } from '../pipeline.ts'
import { mascararDocumentos } from '../reading/text.ts'
import type { PaginaParaModelo, PedidoAnexo, PedidoSugestoes } from './provedor.ts'

/**
 * Monta o pedido ao modelo a partir do que o motor determinístico já leu. Recorte mínimo:
 * - só anexos com LACUNA (classe indeterminada; campo não encontrado ou ilegível);
 * - nunca anexo isolado;
 * - só as palavras com posição, com CPF e CNPJ mascarados (o modelo não precisa deles);
 * - no máximo `maxPaginas` páginas no pedido inteiro.
 * O modelo não recebe nome de arquivo, processo, pessoa, catálogo nem regras.
 */
export function montarPedido(anexos: readonly AnexoTriado[], limites: { maxPaginas: number; maxPropostas: number }): PedidoSugestoes {
  const pedido: PedidoAnexo[] = []
  let paginasUsadas = 0
  for (const anexo of anexos) {
    if (anexo.lido.legibilidade === 'isolado') continue
    const campos = [...new Set(anexo.campos.filter((campo) => campo.contrato.estado === 'nao-encontrado' || campo.contrato.estado === 'ilegivel').map((campo) => campo.contrato.campo))] as NomeCampo[]
    const lacunaClasse = anexo.classificacao.contrato.classe === 'indeterminada'
    if (!lacunaClasse && campos.length === 0) continue
    const paginas: PaginaParaModelo[] = []
    for (const pagina of anexo.lido.paginas) {
      if (paginasUsadas >= limites.maxPaginas) break
      const linhas = anexo.lido.linhas
        .filter((linha) => linha.pagina === pagina.pagina)
        .map((linha) => linha.palavras.flatMap((palavra) => (palavra.regiao ? [{ texto: mascararDocumentos(palavra.texto), regiao: palavra.regiao }] : [])))
        .filter((linha) => linha.length > 0)
      paginas.push({ pagina: pagina.pagina, semTexto: linhas.length === 0, linhas })
      paginasUsadas += 1
    }
    if (paginas.length === 0) break
    pedido.push({ anexoId: anexo.lido.id, anexoSha256: anexo.lido.inspecao.sha256, classeAtual: anexo.classificacao.contrato.classe, lacunas: { classe: lacunaClasse, campos }, paginas })
  }
  return { anexos: pedido, maxPropostas: limites.maxPropostas }
}
