import { BookOpen, CheckCheck, Eye, FileSearch, Send, ShieldQuestion, X } from 'lucide-react'
import { useId, useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useAcao } from '../hooks/use-acao'
import {
  campoRotulo,
  categoriaDe,
  categorias,
  confiancaRotulo,
  decisaoRotulo,
  formatarDataHora,
  ordemCategorias,
  pedeRevisao,
  resultadoRotulo,
  severidadeRotulo,
  tipoRotulo,
  type Categoria,
} from '../model/describe'
import { regrasLegiveis, tituloDaRegra } from '../model/regras'
import type { AnexoInfo, Avaliacao, Campo, Evidencia } from '../model/types'
import { useTriagemSession } from '../session/triage-session'
import { CategoriaBadge, ErroAcao } from './common'
import type { EvidenciaAberta } from './EvidenceViewer'

interface ContextoRevisao {
  triagemId: string
  versao: number
  /** Analista dono do processo, vendo a análise atual. */
  podeRevisar: boolean
  /** Depois de uma ação: recarrega o processo e mostra a mensagem no topo da página. */
  onAlterado: (mensagem?: string) => void
}

/** Lista das 19 verificações, agrupadas pelas cinco categorias, e o detalhe da escolhida. */
export function Verificacoes({
  avaliacoes,
  anexos,
  campos,
  revisao,
  onAbrirEvidencia,
}: {
  avaliacoes: readonly Avaliacao[]
  anexos: readonly AnexoInfo[]
  campos: readonly Campo[]
  revisao: ContextoRevisao
  onAbrirEvidencia: (aberta: EvidenciaAberta) => void
}) {
  const primeira = avaliacoes.find(pedeRevisao) ?? avaliacoes[0]
  const [escolhida, setEscolhida] = useState<string | undefined>(primeira?.regraId)
  const atual = avaliacoes.find((item) => item.regraId === escolhida) ?? primeira
  const grupos = ordemCategorias
    .map((categoria) => ({ categoria, itens: avaliacoes.filter((item) => categoriaDe(item) === categoria) }))
    .filter((grupo) => grupo.itens.length > 0)

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(16rem,22rem)_1fr]">
      <nav aria-label="Verificações por categoria" className="space-y-4">
        {grupos.map(({ categoria, itens }) => (
          <Grupo key={categoria} categoria={categoria} itens={itens} escolhida={atual?.regraId} onEscolher={setEscolhida} />
        ))}
      </nav>
      {atual && <Detalhe key={atual.regraId} avaliacao={atual} anexos={anexos} campos={campos} revisao={revisao} onAbrirEvidencia={onAbrirEvidencia} />}
    </div>
  )
}

function Grupo({ categoria, itens, escolhida, onEscolher }: { categoria: Categoria; itens: readonly Avaliacao[]; escolhida: string | undefined; onEscolher: (id: string) => void }) {
  const info = categorias[categoria]
  const tituloId = useId()
  return (
    <section aria-labelledby={tituloId}>
      <h3 id={tituloId} className="flex items-center gap-2 text-sm font-bold text-ink">
        <info.icon aria-hidden className="size-4 shrink-0" />
        {info.rotulo} <span className="tabular font-normal text-muted-foreground">({itens.length})</span>
      </h3>
      <ul className="mt-2 space-y-1">
        {itens.map((item) => {
          const revisada = item.revisoes.length > 0
          return (
            <li key={item.regraId}>
              <button
                type="button"
                aria-current={item.regraId === escolhida ? 'true' : undefined}
                onClick={() => onEscolher(item.regraId)}
                className={cn(
                  'flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
                  item.regraId === escolhida ? 'bg-brand-50 font-semibold text-ink' : 'hover:bg-surface-sunken',
                )}
              >
                <span className="tabular shrink-0 text-xs text-muted-foreground">{item.regraId.slice(-3)}</span>
                <span className="min-w-0 flex-1">{tituloDaRegra(item.regraId, item.nome)}</span>
                {pedeRevisao(item) && (
                  <span className={cn('shrink-0 text-xs', revisada ? 'text-addition' : 'text-modification')}>{revisada ? 'revisado' : 'a revisar'}</span>
                )}
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

function Detalhe({
  avaliacao,
  anexos,
  campos,
  revisao,
  onAbrirEvidencia,
}: {
  avaliacao: Avaliacao
  anexos: readonly AnexoInfo[]
  campos: readonly Campo[]
  revisao: ContextoRevisao
  onAbrirEvidencia: (aberta: EvidenciaAberta) => void
}) {
  const categoria = categoriaDe(avaliacao)
  const tituloId = useId()
  const usados = campos.filter((campo) => avaliacao.camposUsados.includes(campo.id))
  const abrir = (evidencia: Evidencia, contexto: string) => {
    const anexo = anexos.find((item) => item.id === evidencia.anexoId)
    if (anexo) onAbrirEvidencia({ anexo, evidencia, contexto })
  }
  const nomeAnexo = (anexoId: string) => {
    const anexo = anexos.find((item) => item.id === anexoId)
    return anexo ? `${anexo.ordem}. ${anexo.nome}` : 'anexo'
  }

  return (
    <article aria-labelledby={tituloId} className="min-w-0 space-y-4 rounded-lg bg-surface-sunken/60 p-4">
      <header className="space-y-2">
        <CategoriaBadge categoria={categoria} />
        <h3 id={tituloId} className="text-xl font-bold text-ink">
          {tituloDaRegra(avaliacao.regraId, avaliacao.nome)}
        </h3>
        {regrasLegiveis[avaliacao.regraId] && <p className="text-[0.9375rem] text-ink">{regrasLegiveis[avaliacao.regraId]?.explicacao}</p>}
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-sm">
          <dt className="text-muted-foreground">Regra</dt>
          <dd><span className="tabular font-semibold">{avaliacao.regraId}</span> · título no catálogo: “{avaliacao.nome}”</dd>
          <dt className="text-muted-foreground">Versão</dt>
          <dd className="tabular break-all">{avaliacao.regraVersao}</dd>
          {avaliacao.aplicacao && (
            <>
              <dt className="text-muted-foreground">Quando se aplica</dt>
              <dd>{avaliacao.aplicacao}</dd>
            </>
          )}
          <dt className="text-muted-foreground">Resultado</dt>
          <dd>
            {resultadoRotulo[avaliacao.resultado]}
            {avaliacao.tipo ? ` (${tipoRotulo[avaliacao.tipo]})` : ''} · severidade do alerta: {severidadeRotulo[avaliacao.severidade]} · confiança: {confiancaRotulo[avaliacao.confianca]}
          </dd>
        </dl>
        <p className="text-sm text-muted-foreground">{categorias[categoria].explicacao}</p>
      </header>

      <p className="rounded-md bg-white p-3 text-[0.9375rem] text-ink shadow-surface">{avaliacao.rascunho}</p>
      {avaliacao.motivo && (
        <p className="text-sm text-ink">
          <strong>Motivo:</strong> {avaliacao.motivo}
        </p>
      )}
      {avaliacao.condicoesPendentes.length > 0 && (
        <p className="flex items-start gap-2 rounded-md bg-move-bg p-3 text-sm text-ink">
          <ShieldQuestion aria-hidden className="mt-0.5 size-4 shrink-0 text-move" />
          Aguarda confirmação do servidor: {avaliacao.condicoesPendentes.join(', ')}. Confirme na seção Enquadramento e reprocesse.
        </p>
      )}

      {avaliacao.valoresConflitantes.length > 0 && (
        <section aria-label="Quadro de valores">
          <h4 className="text-sm font-bold text-ink">Quadro de valores</h4>
          {avaliacao.valoresConflitantes.map((conflito) => (
            <table key={conflito.campo} className="mt-2 w-full border-collapse text-left text-sm">
              <caption className="text-left text-xs font-semibold text-muted-foreground">{campoRotulo[conflito.campo] ?? conflito.campo}</caption>
              <thead>
                <tr className="text-xs text-muted-foreground">
                  <th scope="col" className="py-1 pr-3">Documento</th>
                  <th scope="col" className="py-1 pr-3">Valor como está</th>
                  <th scope="col" className="py-1"><span className="sr-only">Evidência</span></th>
                </tr>
              </thead>
              <tbody>
                {conflito.valores.map((valor, indice) => (
                  <tr key={indice} className="bg-white">
                    <td className="px-2 py-1.5">{nomeAnexo(valor.anexoId)}</td>
                    <td className="px-2 py-1.5 font-semibold">{valor.valorBruto}</td>
                    <td className="px-2 py-1.5 text-right">
                      {valor.evidencias[0] && (
                        <Button type="button" variant="ghost" size="sm" onClick={() => abrir(valor.evidencias[0] as Evidencia, `${avaliacao.regraId} · ${campoRotulo[conflito.campo] ?? conflito.campo} "${valor.valorBruto}"`)}>
                          <Eye aria-hidden />
                          Ver no documento
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ))}
          <p className="mt-2 text-xs text-muted-foreground">O sistema não indica qual documento está correto.</p>
        </section>
      )}

      {usados.length > 0 && (
        <section aria-label="Campos usados pela regra">
          <h4 className="text-sm font-bold text-ink">Campos usados</h4>
          <ul className="mt-2 space-y-1 text-sm">
            {usados.map((campo) => (
              <li key={campo.id} className="flex flex-wrap items-baseline gap-x-2 rounded-md bg-white px-2 py-1.5">
                <span className="font-semibold">{campoRotulo[campo.campo] ?? campo.campo}</span>
                <span>em {nomeAnexo(campo.anexoId)}:</span>
                <span>“{campo.valorBruto ?? campo.alternativas?.join(' | ') ?? '—'}”</span>
                {campo.valorNormalizado !== undefined && <span className="text-muted-foreground">normalizado: {String(campo.valorNormalizado)}{campo.unidade === 'm2' ? ' m²' : ''}</span>}
                {campo.metodo === 'servidor' ? <span className="text-xs font-semibold text-move">corrigido por servidor</span> : <span className="text-xs text-muted-foreground">extraído automaticamente</span>}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-label="Evidências">
        <h4 className="text-sm font-bold text-ink">Evidências</h4>
        {avaliacao.evidencias.length === 0 ? (
          <p className="mt-1 text-sm text-muted-foreground">
            {avaliacao.procura ? 'A ausência foi verificada em todos os anexos recebidos (pacote confirmado como completo).' : 'Sem evidência de documento para esta verificação.'}
          </p>
        ) : (
          <ul className="mt-2 space-y-1">
            {avaliacao.evidencias.map((evidencia, indice) => (
              <li key={indice} className="flex flex-wrap items-center gap-2 rounded-md bg-white px-2 py-1.5 text-sm">
                <FileSearch aria-hidden className="size-4 shrink-0 text-brand" />
                <span className="min-w-0 flex-1">
                  {nomeAnexo(evidencia.anexoId)}
                  {evidencia.pagina ? `, página ${evidencia.pagina}` : ''}
                  {evidencia.trecho ? ` — “${evidencia.trecho}”` : ''}
                </span>
                <Button type="button" variant="ghost" size="sm" onClick={() => abrir(evidencia, `${avaliacao.regraId} · ${tituloDaRegra(avaliacao.regraId, avaliacao.nome)}`)}>
                  <Eye aria-hidden />
                  Ver no documento
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <details className="rounded-md bg-white p-3 text-sm">
        <summary className="flex cursor-pointer items-center gap-2 font-semibold text-ink">
          <BookOpen aria-hidden className="size-4" />
          Fundamento, limitações e revisão exigida
        </summary>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          {avaliacao.fundamentos.map((fonte, indice) => (
            <li key={indice}>
              {fonte.fonte} — {fonte.local}
              {fonte.url && (
                <>
                  {' '}
                  (<a className="text-brand underline" href={fonte.url} target="_blank" rel="noreferrer">fonte oficial</a>)
                </>
              )}
            </li>
          ))}
        </ul>
        {avaliacao.limitacoes.length > 0 && (
          <>
            <p className="mt-3 font-semibold">Limitações</p>
            <ul className="mt-1 list-disc space-y-1 pl-5">
              {avaliacao.limitacoes.map((limitacao) => (
                <li key={limitacao}>{limitacao}</li>
              ))}
            </ul>
          </>
        )}
        <p className="mt-3"><strong>Revisão humana exigida:</strong> {avaliacao.revisaoHumana}.</p>
        <p className="mt-1 text-muted-foreground">{avaliacao.recalculada ? 'Calculada nesta análise.' : `Resultado igual ao da análise nº ${avaliacao.origemAnalise ?? '—'}.`}</p>
      </details>

      <Revisoes avaliacao={avaliacao} />
      {revisao.podeRevisar && <FormRevisao avaliacao={avaliacao} revisao={revisao} />}
    </article>
  )
}

function Revisoes({ avaliacao }: { avaliacao: Avaliacao }) {
  if (avaliacao.revisoes.length === 0) return null
  return (
    <section aria-label="Revisões registradas">
      <h4 className="text-sm font-bold text-ink">Revisões registradas</h4>
      <ul className="mt-2 space-y-1 text-sm">
        {avaliacao.revisoes.map((revisao) => (
          <li key={revisao.id} className="rounded-md bg-white px-2 py-1.5">
            <strong>{decisaoRotulo[revisao.decisao]}</strong> por {revisao.revisor} em {formatarDataHora(revisao.em)}
            {revisao.justificativa && <span className="block text-muted-foreground">“{revisao.justificativa}”</span>}
          </li>
        ))}
      </ul>
    </section>
  )
}

type Decisao = 'confirmado' | 'descartado' | 'encaminhado'

const opcoes: { valor: Decisao; rotulo: string; dica: string; icon: typeof CheckCheck }[] = [
  { valor: 'confirmado', rotulo: 'Confirmar o achado', dica: 'O achado procede e segue para as providências do servidor.', icon: CheckCheck },
  { valor: 'descartado', rotulo: 'Descartar o achado', dica: 'O achado não procede. Exige justificativa.', icon: X },
  { valor: 'encaminhado', rotulo: 'Encaminhar', dica: 'Registrar que a verificação foi encaminhada para outra análise.', icon: Send },
]

function FormRevisao({ avaliacao, revisao }: { avaliacao: Avaliacao; revisao: ContextoRevisao }) {
  const { service } = useTriagemSession()
  const acao = useAcao()
  const achado = avaliacao.resultado === 'achado'
  const disponiveis = achado ? opcoes : opcoes.filter((opcao) => opcao.valor === 'encaminhado')
  const [decisao, setDecisao] = useState<Decisao>(disponiveis[0]?.valor ?? 'encaminhado')
  const [justificativa, setJustificativa] = useState('')
  const justificativaId = useId()
  const exigeJustificativa = decisao === 'descartado'
  const invalida = exigeJustificativa && justificativa.trim().length < 5

  async function enviar(event: FormEvent) {
    event.preventDefault()
    if (invalida) return
    const feito = await acao.executar(
      () => service.revisar(revisao.triagemId, { versaoEsperada: revisao.versao, decisao, regraId: avaliacao.regraId, justificativa: justificativa.trim() }),
      () => `${decisaoRotulo[decisao]}. A revisão ficou registrada com seu usuário e a data.`,
    )
    if (feito) {
      setJustificativa('')
      revisao.onAlterado(`${decisaoRotulo[decisao]} (${avaliacao.regraId}). A revisão ficou registrada com seu usuário e a data.`)
    }
  }

  return (
    <form onSubmit={enviar} className="space-y-3 rounded-md bg-white p-3 shadow-surface" aria-label={`Revisar ${tituloDaRegra(avaliacao.regraId, avaliacao.nome)}`}>
      <fieldset>
        <legend className="text-sm font-bold text-ink">{achado ? 'Sua revisão deste achado' : 'Registrar encaminhamento'}</legend>
        <div className="mt-2 space-y-2">
          {disponiveis.map((opcao) => (
            <label key={opcao.valor} className="flex items-start gap-2 text-sm text-ink" aria-label={`${opcao.rotulo}: ${opcao.dica}`}>
              <input type="radio" name={`decisao-${avaliacao.regraId}`} value={opcao.valor} checked={decisao === opcao.valor} onChange={() => setDecisao(opcao.valor)} className="mt-0.5 size-4 accent-[var(--brand-blue)]" />
              <span>
                <span className="font-semibold">{opcao.rotulo}</span>
                <span className="block text-xs text-muted-foreground">{opcao.dica}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <label htmlFor={justificativaId} className="block text-sm font-semibold text-ink">
        Justificativa{exigeJustificativa ? ' (obrigatória, ao menos 5 caracteres)' : ' (opcional)'}
      </label>
      <textarea
        id={justificativaId}
        value={justificativa}
        onChange={(event) => setJustificativa(event.currentTarget.value)}
        maxLength={2000}
        rows={3}
        aria-invalid={invalida && justificativa.length > 0 ? true : undefined}
        required={exigeJustificativa}
        className="block w-full rounded-md border border-input bg-white p-2 text-sm"
      />
      <p className="text-xs text-muted-foreground">A revisão não altera o resultado da regra nem apaga a evidência: fica registrada ao lado dela.</p>
      {acao.erro !== null && <ErroAcao erro={acao.erro} onAtualizar={() => revisao.onAlterado()} />}
      {acao.sucesso && <p role="status" className="rounded-md bg-addition-bg p-2 text-sm font-semibold text-addition">{acao.sucesso}</p>}
      <Button type="submit" disabled={acao.executando || invalida}>
        {acao.executando ? 'Registrando…' : 'Registrar revisão'}
      </Button>
    </form>
  )
}
