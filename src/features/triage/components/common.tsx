import { CircleAlert, CloudOff, FlaskConical, Info, LoaderCircle, RefreshCw } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { categorias, revisaoDe, situacaoDe, type Categoria, type Tom } from '../model/describe'
import { TriagemServiceError, type TriagemResumo } from '../model/types'

const classeDoTom: Record<Tom, string> = {
  andamento: 'border-brand-100 bg-brand-50 text-brand',
  atencao: 'border-modification-line bg-modification-bg text-modification',
  concluido: 'border-addition-line bg-addition-bg text-addition',
  neutro: 'border-line-strong bg-surface-sunken text-ink',
}

/** Selo da revisão humana dos achados (separado do processamento). */
export function RevisaoBadge({ resumo, className }: { resumo: Pick<TriagemResumo, 'achados' | 'pendentesRevisao'>; className?: string }) {
  const revisao = revisaoDe(resumo)
  if (!revisao) return null
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-sm border px-1.5 py-0.5 text-xs leading-none font-semibold whitespace-nowrap', classeDoTom[revisao.tom], className)}>
      <span className="sr-only">Revisão humana: </span>
      {revisao.rotulo}
    </span>
  )
}

/** Selo do processamento: ícone de andamento + rótulo (cor nunca sozinha). */
export function SituacaoBadge({ resumo, className }: { resumo: Pick<TriagemResumo, 'situacao' | 'ultimaAnalise'>; className?: string }) {
  const { rotulo, tom } = situacaoDe(resumo)
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-sm border px-1.5 py-0.5 text-xs leading-none font-semibold whitespace-nowrap',
        tom === 'andamento' && 'border-brand-100 bg-brand-50 text-brand',
        tom === 'atencao' && 'border-modification-line bg-modification-bg text-modification',
        tom === 'concluido' && 'border-addition-line bg-addition-bg text-addition',
        tom === 'neutro' && 'border-line-strong bg-surface-sunken text-ink',
        className,
      )}
    >
      {tom === 'andamento' && <LoaderCircle aria-hidden className="size-3 animate-spin" />}
      {rotulo}
    </span>
  )
}

/** Selo de categoria do resultado, com ícone e rótulo. */
export function CategoriaBadge({ categoria, compacto = false }: { categoria: Categoria; compacto?: boolean }) {
  const info = categorias[categoria]
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-sm border px-1.5 py-0.5 text-xs leading-tight font-semibold', info.classe)}>
      <info.icon aria-hidden className="size-3.5 shrink-0" />
      {compacto ? <span className="sr-only">{info.rotulo}</span> : info.rotulo}
    </span>
  )
}

/**
 * Os quatro estados do processo, separados: processamento, revisão humana dos achados,
 * condições que aguardam confirmação de enquadramento e verificações que não concluíram.
 * Nenhum deles é aprovação; "achados revisados" não resolve condição pendente.
 */
export function EstadoProcesso({ resumo }: { resumo: TriagemResumo }) {
  const processamento = situacaoDe(resumo)
  const revisao = revisaoDe(resumo)
  const condicoes = resumo.condicoesPendentes ?? 0
  const naoAvaliaveis = resumo.naoAvaliaveis ?? 0
  const itemClasse = 'rounded-md bg-surface-sunken px-3 py-2'
  return (
    <section aria-label="Estado do processo" className="space-y-2 rounded-lg bg-white p-3 shadow-surface">
      <dl className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
        <div className={itemClasse}>
          <dt className="text-xs font-semibold text-muted-foreground">Processamento</dt>
          <dd className="font-semibold text-ink">{processamento.rotulo}{resumo.analiseAtual ? ` (análise nº ${resumo.analiseAtual})` : ''}</dd>
        </div>
        <div className={itemClasse}>
          <dt className="text-xs font-semibold text-muted-foreground">Revisão humana dos achados</dt>
          <dd className="font-semibold text-ink">{revisao?.rotulo ?? '—'}</dd>
        </div>
        <div className={itemClasse}>
          <dt className="text-xs font-semibold text-muted-foreground">Condições pendentes de confirmação</dt>
          <dd className={cn('font-semibold', condicoes > 0 ? 'text-move' : 'text-ink')}>
            {condicoes > 0 ? <a href="#enquadramento" className="underline underline-offset-2">{condicoes} a confirmar</a> : 'Nenhuma'}
          </dd>
        </div>
        <div className={itemClasse}>
          <dt className="text-xs font-semibold text-muted-foreground">Verificações não avaliáveis</dt>
          <dd className="font-semibold text-ink">{naoAvaliaveis > 0 ? <a href="#verificacoes" className="underline underline-offset-2">{naoAvaliaveis} inconclusiva{naoAvaliaveis === 1 ? '' : 's'}</a> : 'Nenhuma'}</dd>
        </div>
      </dl>
      {resumo.situacao === 'revisado' && condicoes > 0 && (
        <p className="text-sm text-ink">
          Os achados foram revisados, mas {condicoes === 1 ? 'uma verificação ainda aguarda' : `${condicoes} verificações ainda aguardam`} a confirmação de enquadramento pelo servidor. A triagem não está encerrada.
        </p>
      )}
    </section>
  )
}

/** Faixa fixa do ambiente experimental. */
export function AvisoExperimental({ className }: { className?: string }) {
  return (
    <p className={cn('flex items-start gap-2 rounded-lg bg-brand-50 p-3 text-sm text-ink', className)}>
      <FlaskConical aria-hidden className="mt-0.5 size-4 shrink-0 text-brand" />
      <span>
        <strong>Ambiente experimental, só com pacotes sintéticos.</strong> O catálogo de regras ainda não foi homologado pela GCA. O que aparece aqui
        são verificações técnicas para revisão do servidor: não é decisão administrativa e não é comunicado ao requerente.
      </span>
    </p>
  )
}

export function Carregando({ texto = 'Carregando…' }: { texto?: string }) {
  return (
    <p role="status" className="flex items-center gap-2 py-8 text-[0.9375rem] text-muted-foreground">
      <LoaderCircle aria-hidden className="size-5 animate-spin text-brand" />
      {texto}
    </p>
  )
}

/** Mensagem para a pessoa a partir do erro da API, com orientação por tipo de falha. */
export function mensagemDeErro(erro: unknown): { titulo: string; texto: string; conflito: boolean } {
  if (erro instanceof TriagemServiceError) {
    if (erro.status === 409 && erro.code === 'CONFLITO_DE_VERSAO') {
      return { titulo: 'O processo mudou enquanto você trabalhava', texto: `${erro.message} Sua ação não foi registrada; atualize a página para ver a versão atual.`, conflito: true }
    }
    if (erro.status === 409) return { titulo: 'Ação indisponível agora', texto: erro.message, conflito: true }
    if (erro.status === 403) return { titulo: 'Sem permissão para esta ação', texto: erro.message, conflito: false }
    if (erro.status === 401) return { titulo: 'Sessão encerrada', texto: erro.message, conflito: false }
    if (erro.status === 404) return { titulo: 'Não encontrado', texto: erro.message, conflito: false }
    if (erro.status === 503) return { titulo: 'Serviço ocupado', texto: erro.message, conflito: false }
    if (erro.status === 0) return { titulo: 'Sem conexão com o servidor', texto: erro.message, conflito: false }
    return { titulo: 'Não foi possível concluir', texto: erro.message, conflito: false }
  }
  return { titulo: 'Não foi possível concluir', texto: 'Tente de novo em instantes.', conflito: false }
}

export function ErroAcao({ erro, onAtualizar }: { erro: unknown; onAtualizar?: () => void }) {
  const { titulo, texto, conflito } = mensagemDeErro(erro)
  return (
    <div role="alert" className="flex items-start gap-3 rounded-lg bg-deletion-bg p-3 text-sm text-ink">
      <CircleAlert aria-hidden className="mt-0.5 size-4 shrink-0 text-deletion" />
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-deletion">{titulo}</p>
        <p className="mt-0.5">{texto}</p>
        {conflito && onAtualizar && (
          <Button type="button" variant="outline" size="sm" className="mt-2" onClick={onAtualizar}>
            <RefreshCw aria-hidden />
            Atualizar o processo
          </Button>
        )}
      </div>
    </div>
  )
}

/** Triagem desligada ou servidor fora do ar: informa e não oferece nenhum controle inútil. */
export function TriagemIndisponivel({ motivo, onTentar }: { motivo: 'desligada' | 'sem-conexao'; onTentar: () => void }) {
  return (
    <section aria-labelledby="indisponivel-titulo" className="mt-6 flex items-start gap-4 rounded-lg bg-white p-5 shadow-surface">
      {motivo === 'desligada' ? <Info aria-hidden className="mt-0.5 size-6 shrink-0 text-brand" /> : <CloudOff aria-hidden className="mt-0.5 size-6 shrink-0 text-brand" />}
      <div className="space-y-3 text-[0.9375rem] text-ink">
        <h2 id="indisponivel-titulo" className="text-lg font-bold">
          {motivo === 'desligada' ? 'A triagem não está disponível neste ambiente' : 'Não foi possível consultar a triagem'}
        </h2>
        {motivo === 'desligada' ? (
          <>
            <p>
              A triagem documental está em fase experimental e só funciona em ambientes de teste autorizados, com pacotes sintéticos. Ela não é
              disponibilizada em produção enquanto o catálogo de regras e a política de guarda de documentos não forem homologados.
            </p>
            <p className="text-muted-foreground">As demais ferramentas do AQR continuam disponíveis normalmente.</p>
          </>
        ) : (
          <>
            <p>O servidor do AQR não respondeu. Confira a conexão e tente de novo.</p>
            <Button type="button" variant="outline" onClick={onTentar}>
              <RefreshCw aria-hidden />
              Tentar de novo
            </Button>
          </>
        )}
      </div>
    </section>
  )
}

export function Secao({ id, titulo, descricao, children, acao }: { id: string; titulo: string; descricao?: ReactNode; children: ReactNode; acao?: ReactNode }) {
  return (
    <section aria-labelledby={`${id}-titulo`} id={id} className="scroll-mt-28 rounded-lg bg-white p-4 shadow-surface sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id={`${id}-titulo`} className="text-lg font-bold text-ink">
            {titulo}
          </h2>
          {descricao && <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{descricao}</p>}
        </div>
        {acao}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  )
}
