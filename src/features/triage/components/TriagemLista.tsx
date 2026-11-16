import { FolderOpen, Plus } from 'lucide-react'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { routes } from '@/config/routes'
import { etapaRotulo, formatarDataHora, idCurto, modalidadeRotulo } from '../model/describe'
import { useCarregar } from '../hooks/use-carregar'
import { useTriagemSession } from '../session/triage-session'
import { Carregando, ErroAcao, RevisaoBadge, SituacaoBadge } from './common'

/** Processos que o servidor deixa esta pessoa ver: os próprios (analista) ou todos (administrador). */
export function TriagemLista({ podeCriar }: { podeCriar: boolean }) {
  const { service } = useTriagemSession()
  const carga = useCarregar((signal) => service.listar({ signal }), 'lista')

  if (carga.estado === 'carregando') return <Carregando texto="Carregando os processos…" />
  if (carga.estado === 'erro') return <ErroAcao erro={carga.erro} />

  const { itens } = carga.dados
  if (itens.length === 0) {
    return (
      <div className="flex flex-col items-start gap-3 rounded-lg bg-white p-6 shadow-surface">
        <FolderOpen aria-hidden className="size-8 text-brand" />
        <p className="font-semibold text-ink">Nenhum processo de triagem ainda.</p>
        <p className="text-sm text-muted-foreground">
          {podeCriar ? 'Envie um pacote sintético de desdobro para começar.' : 'Quando um analista criar um processo, ele aparece aqui para acompanhamento.'}
        </p>
        {podeCriar && (
          <Button asChild>
            <Link to={routes.triageNew} viewTransition>
              <Plus aria-hidden />
              Nova triagem sintética
            </Link>
          </Button>
        )}
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-lg bg-white shadow-surface" role="region" aria-labelledby="lista-titulo" tabIndex={0}>
      <table className="w-full min-w-[64rem] border-collapse text-left text-sm">
        <caption id="lista-titulo" className="sr-only">
          Processos de triagem que você pode acessar
        </caption>
        <thead className="bg-surface-sunken text-xs font-semibold text-muted-foreground uppercase">
          <tr>
            <th scope="col" className="px-4 py-3">Processo</th>
            <th scope="col" className="px-4 py-3">Modalidade e etapa</th>
            <th scope="col" className="px-4 py-3">Criado em</th>
            <th scope="col" className="px-4 py-3">Processamento</th>
            <th scope="col" className="px-4 py-3">Última análise</th>
            <th scope="col" className="px-4 py-3">Revisão humana</th>
            <th scope="col" className="px-4 py-3 text-right">Condições pendentes</th>
            <th scope="col" className="px-4 py-3 text-right">Não avaliáveis</th>
            <th scope="col" className="px-4 py-3"><span className="sr-only">Ação</span></th>
          </tr>
        </thead>
        <tbody>
          {itens.map((item) => (
            <tr key={item.id} className="odd:bg-white even:bg-surface-sunken/50">
              <th scope="row" className="px-4 py-3 align-top font-semibold text-ink">
                <span className="tabular">{idCurto(item.id)}</span>
                {item.referencia && <span className="block text-xs font-normal text-muted-foreground">{item.referencia}</span>}
              </th>
              <td className="px-4 py-3 align-top">
                {modalidadeRotulo[item.modalidade] ?? item.modalidade} · {etapaRotulo[item.etapa] ?? item.etapa}
              </td>
              <td className="px-4 py-3 align-top tabular">{formatarDataHora(item.criadaEm)}</td>
              <td className="px-4 py-3 align-top">
                <SituacaoBadge resumo={item} />
              </td>
              <td className="px-4 py-3 align-top">
                {item.ultimaAnalise ? (
                  <span className="tabular">
                    nº {item.ultimaAnalise.numero} · {formatarDataHora(item.ultimaAnalise.encerradaEm)}
                  </span>
                ) : (
                  '—'
                )}
              </td>
              <td className="px-4 py-3 align-top">{item.achados === null ? '—' : <RevisaoBadge resumo={item} />}</td>
              <td className="px-4 py-3 text-right align-top tabular">{item.condicoesPendentes ?? '—'}</td>
              <td className="px-4 py-3 text-right align-top tabular">{item.naoAvaliaveis ?? '—'}</td>
              <td className="px-4 py-3 text-right align-top">
                <Button asChild variant="outline" size="sm">
                  <Link to={routes.triageProcess(item.id)} viewTransition aria-label={`Abrir o processo ${idCurto(item.id)}`}>
                    Abrir
                  </Link>
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
