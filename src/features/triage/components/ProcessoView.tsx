import { ArrowLeft, CircleAlert, History, LoaderCircle, RefreshCw } from 'lucide-react'
import { useState } from 'react'
import { Link, useLocation } from 'react-router'
import { Button } from '@/components/ui/button'
import { routes } from '@/config/routes'
import { useAcao } from '../hooks/use-acao'
import { useProcesso } from '../hooks/use-processo'
import { etapaRotulo, formatarData, formatarDataHora, idCurto, modalidadeRotulo } from '../model/describe'
import { TriagemServiceError, type TriagemDetalhe } from '../model/types'
import { useTriagemSession } from '../session/triage-session'
import { AvisoExperimental, Carregando, ErroAcao, Secao, SituacaoBadge } from './common'
import { EvidenceViewer, type EvidenciaAberta } from './EvidenceViewer'
import { Campos, Documentos, Enquadramento, Historico, VisaoGeral } from './Secoes'
import { Verificacoes } from './Verificacoes'

function avisoDe(state: unknown): string | null {
  return typeof state === 'object' && state !== null && 'aviso' in state && typeof state.aviso === 'string' ? state.aviso : null
}

/** Correções ou confirmações registradas depois do início da análise atual: pedem reprocessamento. */
function alteracoesPendentes(detalhe: TriagemDetalhe): number {
  const atual = detalhe.analises.find((analise) => analise.numero === detalhe.triagem.analiseAtual)
  if (!atual) return 0
  const depois = (em: string) => em > atual.iniciadaEm
  return detalhe.confirmacoes.filter((item) => depois(item.em)).length + detalhe.revisoes.filter((item) => item.decisao === 'corrigido' && depois(item.em)).length
}

const SECOES = [
  ['visao-geral', 'Visão geral'],
  ['verificacoes', 'Verificações'],
  ['documentos', 'Documentos'],
  ['campos', 'Campos extraídos'],
  ['enquadramento', 'Enquadramento'],
  ['historico', 'Histórico'],
] as const

export function ProcessoView({ id }: { id: string }) {
  const { service } = useTriagemSession()
  const location = useLocation()
  const [analiseEscolhida, setAnaliseEscolhida] = useState<number | null>(null)
  const { detalhe, numero, avaliacoes, anexos, campos } = useProcesso(id, analiseEscolhida)
  const [mensagem, setMensagem] = useState<string | null>(() => avisoDe(location.state))
  const [evidencia, setEvidencia] = useState<EvidenciaAberta | null>(null)
  const reprocesso = useAcao()

  const dados = detalhe.estado === 'pronto' ? detalhe.dados : detalhe.ultimo
  if (!dados) {
    if (detalhe.estado === 'erro') {
      const naoEncontrado = detalhe.erro instanceof TriagemServiceError && detalhe.erro.status === 404
      return (
        <div className="space-y-4">
          <ErroAcao erro={naoEncontrado ? new TriagemServiceError(404, 'NAO_ENCONTRADA', 'Este processo não existe ou não está entre os que você pode acessar.') : detalhe.erro} />
          <Button asChild variant="outline"><Link to={routes.triage}><ArrowLeft aria-hidden />Voltar aos processos</Link></Button>
        </div>
      )
    }
    return <Carregando texto="Carregando o processo…" />
  }

  const { triagem } = dados
  const naAtual = numero === triagem.analiseAtual
  const podeAlterar = triagem.criadaPorMim && naAtual && triagem.situacao !== 'processando'
  const pendentes = triagem.criadaPorMim ? alteracoesPendentes(dados) : 0
  const onAlterado = (texto?: string) => {
    if (texto) setMensagem(texto)
    reprocesso.limpar()
    detalhe.recarregar()
  }

  async function reprocessar() {
    setMensagem(null)
    const feito = await reprocesso.executar(() => service.reprocessar(triagem.id, triagem.versao), () => '')
    if (feito) {
      // A mensagem vai para o mesmo aviso das outras ações: a próxima ação a substitui.
      setMensagem(
        feito.alteradas.length > 0
          ? `Análise nº ${feito.analise} criada. ${feito.alteradas.length} ${feito.alteradas.length === 1 ? 'verificação mudou' : 'verificações mudaram'} (${feito.alteradas.join(', ')}). A análise anterior continua no histórico.`
          : `Análise nº ${feito.analise} criada. Nenhuma verificação mudou. A análise anterior continua no histórico.`,
      )
      setAnaliseEscolhida(null)
      detalhe.recarregar()
    }
  }

  const listaAnexos = anexos.estado === 'pronto' ? anexos.dados.itens : (anexos.ultimo?.itens ?? [])
  const listaCampos = campos.estado === 'pronto' ? campos.dados.itens : (campos.ultimo?.itens ?? [])
  const listaAvaliacoes = avaliacoes.estado === 'pronto' ? avaliacoes.dados.itens : (avaliacoes.ultimo?.itens ?? [])
  const concluidas = dados.analises.filter((analise) => analise.situacao === 'concluida')

  return (
    <div className="space-y-5">
      <Button asChild variant="link" className="px-0">
        <Link to={routes.triage} viewTransition><ArrowLeft aria-hidden />Todos os processos</Link>
      </Button>
      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-extrabold tracking-tight text-ink">Processo {idCurto(triagem.id)}</h1>
          <SituacaoBadge resumo={triagem} />
        </div>
        <p className="text-sm text-muted-foreground">
          {triagem.referencia ? `${triagem.referencia} · ` : ''}
          {modalidadeRotulo[triagem.modalidade] ?? triagem.modalidade} · {etapaRotulo[triagem.etapa] ?? triagem.etapa} · protocolo em {formatarData(triagem.protocoladoEm)} · criado em {formatarDataHora(triagem.criadaEm)} · versão {triagem.versao}
        </p>
        {!triagem.criadaPorMim && (
          <p className="text-sm text-ink">Você acompanha este processo. Confirmações, revisões e reprocessamento são feitos pelo analista que o criou.</p>
        )}
      </header>
      <AvisoExperimental />

      {mensagem && (
        <p role="status" className="rounded-lg bg-addition-bg p-3 text-sm font-semibold text-addition">
          {mensagem}
        </p>
      )}
      {reprocesso.erro !== null && <ErroAcao erro={reprocesso.erro} onAtualizar={() => onAlterado()} />}

      {triagem.situacao === 'processando' ? (
        <section aria-labelledby="processando-titulo" className="flex items-start gap-3 rounded-lg bg-white p-5 shadow-surface">
          <LoaderCircle aria-hidden className="mt-0.5 size-6 shrink-0 animate-spin text-brand" />
          <div>
            <h2 id="processando-titulo" className="text-lg font-bold text-ink">Análise em andamento</h2>
            <p className="mt-1 text-[0.9375rem] text-ink">
              O servidor está lendo, classificando e verificando os anexos. Esta página consulta o andamento sozinha; você pode sair e voltar depois.
            </p>
            <p role="status" className="sr-only">Análise em andamento.</p>
          </div>
        </section>
      ) : triagem.analiseAtual === null ? (
        <section aria-labelledby="falha-titulo" className="flex items-start gap-3 rounded-lg bg-white p-5 shadow-surface">
          <CircleAlert aria-hidden className="mt-0.5 size-6 shrink-0 text-modification" />
          <div className="space-y-2">
            <h2 id="falha-titulo" className="text-lg font-bold text-ink">
              {triagem.ultimaAnalise?.situacao === 'interrompida' ? 'A análise foi interrompida' : 'A análise não foi concluída'}
            </h2>
            <p className="text-[0.9375rem] text-ink">
              {triagem.ultimaAnalise?.situacao === 'interrompida'
                ? 'O servidor foi desligado ou reiniciado durante o processamento. Nenhum resultado parcial foi guardado.'
                : `A análise falhou por um motivo técnico${dados.analises.at(-1)?.falha ? ` (${dados.analises.at(-1)?.falha})` : ''}. Nenhum resultado parcial foi guardado.`}
            </p>
            {triagem.criadaPorMim ? (
              <>
                <p className="text-sm text-muted-foreground">Você pode tentar de novo. Isso só funciona se o conteúdo dos anexos estiver guardado neste ambiente; senão, envie o pacote outra vez.</p>
                <Button type="button" onClick={reprocessar} disabled={reprocesso.executando}>
                  <RefreshCw aria-hidden />
                  {reprocesso.executando ? 'Retomando…' : 'Tentar de novo'}
                </Button>
              </>
            ) : null}
          </div>
        </section>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3 rounded-lg bg-white p-3 shadow-surface">
            <label className="flex items-center gap-2 text-sm font-semibold text-ink">
              <History aria-hidden className="size-4" />
              Análise exibida
              <select
                value={numero ?? ''}
                onChange={(event) => setAnaliseEscolhida(Number(event.currentTarget.value) === triagem.analiseAtual ? null : Number(event.currentTarget.value))}
                className="h-9 rounded-md border border-input bg-white px-2 font-normal"
              >
                {concluidas.map((analise) => (
                  <option key={analise.numero} value={analise.numero}>
                    nº {analise.numero}{analise.numero === triagem.analiseAtual ? ' (atual)' : ''} — {formatarDataHora(analise.encerradaEm)}
                  </option>
                ))}
              </select>
            </label>
            {!naAtual && <p className="text-sm text-modification">Você está vendo uma análise anterior. Ela é só consulta: revisões são feitas na análise atual.</p>}
            {podeAlterar && (
              <Button type="button" variant={pendentes > 0 ? 'default' : 'outline'} size="sm" className="ml-auto" onClick={reprocessar} disabled={reprocesso.executando}>
                <RefreshCw aria-hidden className={reprocesso.executando ? 'animate-spin' : undefined} />
                {reprocesso.executando ? 'Reprocessando…' : 'Reprocessar'}
              </Button>
            )}
          </div>
          {podeAlterar && pendentes > 0 && (
            <p className="rounded-lg bg-move-bg p-3 text-sm text-ink">
              Há {pendentes} {pendentes === 1 ? 'alteração registrada' : 'alterações registradas'} (correção ou confirmação) depois da análise nº {triagem.analiseAtual}. Reprocesse para aplicá-las: uma
              nova análise é criada e a atual continua no histórico.
            </p>
          )}

          <nav aria-label="Seções do processo" className="flex flex-wrap gap-2">
            {SECOES.map(([ancora, rotulo]) => (
              <a key={ancora} href={`#${ancora}`} className="rounded-md bg-white px-3 py-1.5 text-sm font-semibold text-brand shadow-surface outline-none hover:bg-brand-50 focus-visible:ring-[3px] focus-visible:ring-ring/50">
                {rotulo}
              </a>
            ))}
          </nav>

          {avaliacoes.estado === 'erro' ? (
            <ErroAcao erro={avaliacoes.erro} onAtualizar={() => onAlterado()} />
          ) : listaAvaliacoes.length === 0 ? (
            <Carregando texto="Carregando a análise…" />
          ) : (
            <>
              <Secao id="visao-geral" titulo={`Visão geral da análise nº ${numero ?? ''}`}>
                <VisaoGeral anexos={listaAnexos} campos={listaCampos} avaliacoes={listaAvaliacoes} />
              </Secao>
              <Secao id="verificacoes" titulo="Verificações" descricao="As 19 verificações do catálogo para desdobro na abertura, agrupadas pelo tipo de resultado. Escolha uma para ver a evidência, o fundamento e registrar sua revisão.">
                <Verificacoes
                  avaliacoes={listaAvaliacoes}
                  anexos={listaAnexos}
                  campos={listaCampos}
                  revisao={{ triagemId: triagem.id, versao: triagem.versao, podeRevisar: podeAlterar, onAlterado }}
                  onAbrirEvidencia={setEvidencia}
                />
              </Secao>
              <Secao id="documentos" titulo="Documentos recebidos" descricao="Classificação de cada anexo pelo conteúdo (nunca pelo nome do arquivo), com a justificativa.">
                <Documentos anexos={listaAnexos} onAbrirEvidencia={setEvidencia} />
              </Secao>
              <Secao id="campos" titulo="Campos extraídos" descricao="Valores como estão nos documentos e, à parte, a forma normalizada. Correções feitas por servidor ficam identificadas e o valor original continua registrado.">
                <Campos campos={listaCampos} anexos={listaAnexos} podeCorrigir={podeAlterar} triagemId={triagem.id} versao={triagem.versao} onAlterado={onAlterado} onAbrirEvidencia={setEvidencia} />
              </Secao>
            </>
          )}
          <Secao id="enquadramento" titulo="Enquadramento e confirmações" descricao="O que foi declarado no envio e o que um servidor confirmou. Confirmações valem a partir da próxima análise.">
            <Enquadramento detalhe={dados} podeConfirmar={podeAlterar} onAlterado={onAlterado} />
          </Secao>
          <Secao id="historico" titulo="Histórico" descricao="Todas as análises continuam disponíveis. Nada é apagado: correções e revisões ficam registradas com autor e data.">
            <Historico detalhe={dados} triagemId={triagem.id} />
          </Secao>
        </>
      )}

      <EvidenceViewer triagemId={triagem.id} aberta={evidencia} onFechar={() => setEvidencia(null)} />
    </div>
  )
}
