import { ArrowRight, Eye, Pencil, ShieldAlert } from 'lucide-react'
import { useId, useState, type FormEvent, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { formatFileSize } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useAcao } from '../hooks/use-acao'
import { useCarregar } from '../hooks/use-carregar'
import {
  campoRotulo,
  categoriaDe,
  categorias,
  classeRotulo,
  confiancaRotulo,
  decisaoRotulo,
  estadoCampoRotulo,
  etapaRotulo,
  formatarDataHora,
  modalidadeRotulo,
  ordemCategorias,
  pedeRevisao,
  resultadoRotulo,
} from '../model/describe'
import type { AnexoInfo, Avaliacao, Campo, Evidencia, TriagemDetalhe } from '../model/types'
import { useTriagemSession } from '../session/triage-session'
import { CategoriaBadge, ErroAcao } from './common'
import type { EvidenciaAberta } from './EvidenceViewer'

// ---------- visão geral ----------

function Numero({ rotulo, valor, detalhe }: { rotulo: string; valor: number | string; detalhe?: ReactNode }) {
  return (
    <div className="rounded-md bg-surface-sunken p-3">
      <dt className="text-sm text-muted-foreground">{rotulo}</dt>
      <dd className="tabular text-2xl font-bold text-ink">{valor}</dd>
      {detalhe && <dd className="text-xs text-muted-foreground">{detalhe}</dd>}
    </div>
  )
}

/** Contagens do que o sistema verificou, sem pontuação nem conclusão sobre o processo. */
export function VisaoGeral({ anexos, campos, avaliacoes }: { anexos: readonly AnexoInfo[]; campos: readonly Campo[]; avaliacoes: readonly Avaliacao[] }) {
  const classificados = anexos.filter((anexo) => anexo.classificacao && anexo.classificacao.classe !== 'indeterminada')
  const extraidos = campos.filter((campo) => campo.estado === 'encontrado')
  const divergencias = avaliacoes.filter((item) => item.tipo === 'divergencia')
  const aRevisar = avaliacoes.filter((item) => pedeRevisao(item) && item.revisoes.length === 0)
  const porCategoria = ordemCategorias.map((categoria) => ({ categoria, total: avaliacoes.filter((item) => categoriaDe(item) === categoria).length }))
  return (
    <div className="space-y-4">
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <Numero rotulo="Documentos recebidos" valor={anexos.length} />
        <Numero rotulo="Classificados" valor={classificados.length} />
        <Numero rotulo="Classe indeterminada" valor={anexos.length - classificados.length} />
        <Numero rotulo="Campos extraídos" valor={extraidos.length} detalhe={`de ${campos.length} procurados`} />
        <Numero rotulo="Possíveis divergências" valor={divergencias.length} />
      </dl>
      <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3" aria-label="Verificações por categoria">
        {porCategoria.map(({ categoria, total }) => (
          <li key={categoria} className="flex items-center justify-between gap-2 rounded-md bg-surface-sunken px-3 py-2 text-sm">
            <CategoriaBadge categoria={categoria} />
            <span className="tabular font-bold text-ink">{total}</span>
          </li>
        ))}
        <li className="flex items-center justify-between gap-2 rounded-md bg-surface-sunken px-3 py-2 text-sm">
          <span className="font-semibold text-ink">Aguardando revisão humana</span>
          <span className="tabular font-bold text-ink">{aRevisar.length}</span>
        </li>
      </ul>
      <p className="text-xs text-muted-foreground">As contagens descrevem as verificações feitas. Elas não aprovam nem reprovam o processo.</p>
    </div>
  )
}

// ---------- documentos ----------

export function Documentos({ anexos, onAbrirEvidencia }: { anexos: readonly AnexoInfo[]; onAbrirEvidencia: (aberta: EvidenciaAberta) => void }) {
  return (
    <ul className="space-y-2">
      {anexos.map((anexo) => {
        const classe = anexo.classificacao?.classe ?? 'indeterminada'
        const primeira: Evidencia | undefined = anexo.classificacao?.evidencias[0] ?? { anexoId: anexo.id, sha256: anexo.sha256, origem: 'metadado-arquivo', ...(anexo.paginas[0] ? { pagina: 1 } : {}) }
        return (
          <li key={anexo.id} className="rounded-md bg-surface-sunken p-3 text-sm">
            <div className="flex flex-wrap items-start gap-2">
              <p className="min-w-0 flex-1 font-semibold text-ink">
                {anexo.ordem}. <span className="break-words">{anexo.nome}</span>
              </p>
              <span className={cn('rounded-sm px-1.5 py-0.5 text-xs font-semibold', classe === 'indeterminada' ? 'bg-white text-ink' : 'bg-brand text-white')}>
                {classeRotulo[classe] ?? classe}
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Tipo real {anexo.tipoReal?.toUpperCase() ?? '—'}
              {anexo.extensaoConfere === false ? ' (extensão não confere com o conteúdo)' : ''} · {formatFileSize(anexo.bytes)} · integridade: {anexo.integridade ?? '—'}
              {anexo.classificacao ? ` · confiança ${confiancaRotulo[anexo.classificacao.confianca]}` : ''} · conteúdo{' '}
              {anexo.conteudo === 'armazenado' ? 'guardado (cifrado)' : anexo.conteudo === 'expurgado' ? 'expurgado' : 'não guardado'}
            </p>
            {anexo.isolado && (
              <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-deletion">
                <ShieldAlert aria-hidden className="size-3.5" />
                Isolado por suspeita ({anexo.motivosIsolamento.join(', ')}): não foi aberto.
              </p>
            )}
            {anexo.justificativa && <p className="mt-1 text-xs text-ink">{anexo.justificativa}</p>}
            {primeira && !anexo.isolado && (
              <Button type="button" variant="ghost" size="sm" className="mt-1 px-1" onClick={() => onAbrirEvidencia({ anexo, evidencia: primeira, contexto: `Classificação: ${classeRotulo[classe] ?? classe}` })}>
                <Eye aria-hidden />
                Abrir o documento
              </Button>
            )}
          </li>
        )
      })}
    </ul>
  )
}

// ---------- campos ----------

export function Campos({
  campos,
  anexos,
  podeCorrigir,
  triagemId,
  versao,
  onAlterado,
  onAbrirEvidencia,
}: {
  campos: readonly Campo[]
  anexos: readonly AnexoInfo[]
  podeCorrigir: boolean
  triagemId: string
  versao: number
  onAlterado: (mensagem?: string) => void
  onAbrirEvidencia: (aberta: EvidenciaAberta) => void
}) {
  const [corrigindo, setCorrigindo] = useState<string | null>(null)
  const porAnexo = anexos.map((anexo) => ({ anexo, campos: campos.filter((campo) => campo.anexoId === anexo.id) })).filter((grupo) => grupo.campos.length > 0)
  return (
    <div className="space-y-4">
      {porAnexo.map(({ anexo, campos: doAnexo }) => (
        <div key={anexo.id}>
          <h3 className="text-sm font-bold text-ink">
            {anexo.ordem}. {anexo.nome} <span className="font-normal text-muted-foreground">({classeRotulo[anexo.classificacao?.classe ?? 'indeterminada']})</span>
          </h3>
          <div className="mt-2 overflow-x-auto" role="region" aria-label={`Campos de ${anexo.nome}`} tabIndex={0}>
            <table className="w-full min-w-[40rem] border-collapse text-left text-sm">
              <thead className="text-xs text-muted-foreground">
                <tr>
                  <th scope="col" className="py-1 pr-2">Campo</th>
                  <th scope="col" className="py-1 pr-2">Estado</th>
                  <th scope="col" className="py-1 pr-2">Valor como está</th>
                  <th scope="col" className="py-1 pr-2">Normalizado</th>
                  <th scope="col" className="py-1 pr-2">Origem</th>
                  <th scope="col" className="py-1"><span className="sr-only">Ações</span></th>
                </tr>
              </thead>
              <tbody>
                {doAnexo.map((campo) => (
                  <tr key={campo.id} className="bg-surface-sunken/60 align-top">
                    <th scope="row" className="px-2 py-1.5 font-semibold">{campoRotulo[campo.campo] ?? campo.campo}</th>
                    <td className="px-2 py-1.5">{estadoCampoRotulo[campo.estado] ?? campo.estado}</td>
                    <td className="px-2 py-1.5">{campo.valorBruto ?? campo.alternativas?.join(' | ') ?? '—'}</td>
                    <td className="px-2 py-1.5">{campo.valorNormalizado !== undefined ? `${String(campo.valorNormalizado)}${campo.unidade === 'm2' ? ' m²' : ''}` : '—'}</td>
                    <td className="px-2 py-1.5">
                      {campo.metodo === 'servidor' ? <span className="font-semibold text-move">Corrigido por servidor</span> : <span className="text-muted-foreground">Automático (confiança {Math.round(campo.confianca * 100)}%)</span>}
                    </td>
                    <td className="px-2 py-1.5 text-right whitespace-nowrap">
                      {campo.evidencias[0] && campo.evidencias[0].origem !== 'servidor' && (
                        <Button type="button" variant="ghost" size="sm" onClick={() => onAbrirEvidencia({ anexo, evidencia: campo.evidencias[0] as Evidencia, contexto: `${campoRotulo[campo.campo] ?? campo.campo}: “${campo.valorBruto ?? ''}”` })} aria-label={`Ver ${campoRotulo[campo.campo] ?? campo.campo} no documento`}>
                          <Eye aria-hidden />
                        </Button>
                      )}
                      {podeCorrigir && (
                        <Button type="button" variant="ghost" size="sm" onClick={() => setCorrigindo(corrigindo === campo.id ? null : campo.id)} aria-expanded={corrigindo === campo.id} aria-label={`Corrigir ${campoRotulo[campo.campo] ?? campo.campo} de ${anexo.nome}`}>
                          <Pencil aria-hidden />
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {podeCorrigir && doAnexo.some((campo) => campo.id === corrigindo) && (
            <Correcao
              campo={doAnexo.find((campo) => campo.id === corrigindo) as Campo}
              triagemId={triagemId}
              versao={versao}
              onFeito={(mensagem) => {
                setCorrigindo(null)
                onAlterado(mensagem)
              }}
            />
          )}
        </div>
      ))}
    </div>
  )
}

function Correcao({ campo, triagemId, versao, onFeito }: { campo: Campo; triagemId: string; versao: number; onFeito: (mensagem: string) => void }) {
  const { service } = useTriagemSession()
  const acao = useAcao()
  const [valor, setValor] = useState(campo.valorBruto ?? '')
  const [justificativa, setJustificativa] = useState('')
  const valorId = useId()
  const justificativaId = useId()
  const invalida = valor.trim().length === 0 || justificativa.trim().length < 5

  async function enviar(event: FormEvent) {
    event.preventDefault()
    if (invalida) return
    const feito = await acao.executar(
      () => service.revisar(triagemId, { versaoEsperada: versao, decisao: 'corrigido', campoId: campo.id, novoValor: valor.trim(), justificativa: justificativa.trim() }),
      () => 'ok',
    )
    if (feito) onFeito(`Correção de ${campoRotulo[campo.campo] ?? campo.campo} registrada (de “${campo.valorBruto ?? '—'}” para “${valor.trim()}”). Reprocesse para aplicá-la às verificações.`)
  }

  return (
    <form onSubmit={enviar} className="mt-2 space-y-2 rounded-md bg-white p-3 shadow-surface" aria-label={`Corrigir ${campoRotulo[campo.campo] ?? campo.campo}`}>
      <p className="text-sm text-ink">
        Valor extraído: <strong>“{campo.valorBruto ?? campo.alternativas?.join(' | ') ?? '—'}”</strong>. O valor original continua registrado; a correção vale a partir da próxima análise.
      </p>
      <label htmlFor={valorId} className="block text-sm font-semibold text-ink">Valor correto</label>
      <input id={valorId} value={valor} maxLength={500} onChange={(event) => setValor(event.currentTarget.value)} className="block h-10 w-full rounded-md border border-input px-2 text-sm" />
      <label htmlFor={justificativaId} className="block text-sm font-semibold text-ink">Justificativa (obrigatória, ao menos 5 caracteres)</label>
      <textarea id={justificativaId} value={justificativa} rows={2} maxLength={2000} onChange={(event) => setJustificativa(event.currentTarget.value)} className="block w-full rounded-md border border-input p-2 text-sm" />
      {acao.erro !== null && <ErroAcao erro={acao.erro} />}
      <Button type="submit" size="sm" disabled={invalida || acao.executando}>
        {acao.executando ? 'Registrando…' : 'Registrar correção'}
      </Button>
    </form>
  )
}

// ---------- enquadramento ----------

const origemRotulo = (origem: string, por?: string, em?: string) =>
  origem === 'confirmado-servidor' ? `confirmado por servidor${por ? '' : ''}${em ? ` em ${formatarDataHora(em)}` : ''}` : origem === 'declarado' ? 'declarado no envio, sem confirmação' : 'proposto pelo sistema'

export function Enquadramento({ detalhe, podeConfirmar, onAlterado }: { detalhe: TriagemDetalhe; podeConfirmar: boolean; onAlterado: (mensagem?: string) => void }) {
  const { enquadramento, triagem } = detalhe
  const condicao = enquadramento.condicoes.find((item) => item.id === 'area-situacao-acima-2ha')
  return (
    <div className="space-y-4">
      <dl className="grid gap-3 sm:grid-cols-2">
        <Item rotulo="Modalidade" valor={modalidadeRotulo[String(enquadramento.modalidade.valor)] ?? String(enquadramento.modalidade.valor)} origem={origemRotulo(enquadramento.modalidade.origem, enquadramento.modalidade.confirmadoPor, enquadramento.modalidade.confirmadoEm)} />
        <Item rotulo="Etapa" valor={etapaRotulo[String(enquadramento.etapa.valor)] ?? String(enquadramento.etapa.valor)} origem={origemRotulo(enquadramento.etapa.origem, enquadramento.etapa.confirmadoPor, enquadramento.etapa.confirmadoEm)} />
        <Item
          rotulo="Completude do pacote"
          valor={{ completo: 'Completo', parcial: 'Parcial', desconhecida: 'Não confirmada', indeterminado: 'Indeterminada' }[String(enquadramento.integridadeDoPacote.valor)] ?? String(enquadramento.integridadeDoPacote.valor)}
          origem={origemRotulo(enquadramento.integridadeDoPacote.origem, undefined, enquadramento.integridadeDoPacote.confirmadoEm)}
        />
        <Item rotulo="Área da situação acima de 2 ha" valor={condicao ? (condicao.valor ? 'Sim' : 'Não') : 'Não confirmada'} origem={condicao ? origemRotulo('confirmado-servidor', undefined, condicao.confirmadoEm) : 'a regra 028 aguarda confirmação'} />
      </dl>
      {podeConfirmar && <Confirmacoes triagemId={triagem.id} versao={triagem.versao} onAlterado={onAlterado} />}
      {detalhe.confirmacoes.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-ink">Confirmações registradas</h3>
          <ul className="mt-2 space-y-1 text-sm">
            {detalhe.confirmacoes.map((confirmacao) => (
              <li key={confirmacao.id} className="rounded-md bg-surface-sunken px-2 py-1.5">
                <strong>{{ modalidade: 'Modalidade', etapa: 'Etapa', integridade: 'Completude do pacote', condicao: `Condição ${confirmacao.chave}` }[confirmacao.tipo]}</strong>: {String(confirmacao.valor)} — por {confirmacao.autor} em {formatarDataHora(confirmacao.em)}
                {confirmacao.justificativa && <span className="block text-muted-foreground">“{confirmacao.justificativa}”</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function Item({ rotulo, valor, origem }: { rotulo: string; valor: string; origem: string }) {
  return (
    <div className="rounded-md bg-surface-sunken p-3">
      <dt className="text-sm text-muted-foreground">{rotulo}</dt>
      <dd className="font-semibold text-ink">{valor}</dd>
      <dd className="text-xs text-muted-foreground">{origem}</dd>
    </div>
  )
}

function Confirmacoes({ triagemId, versao, onAlterado }: { triagemId: string; versao: number; onAlterado: (mensagem?: string) => void }) {
  const { service } = useTriagemSession()
  const acao = useAcao()
  const [completude, setCompletude] = useState<'completo' | 'parcial' | 'desconhecida'>('completo')
  const [justificativaCompletude, setJustificativaCompletude] = useState('')
  const [area, setArea] = useState<'sim' | 'nao'>('nao')
  const [justificativaArea, setJustificativaArea] = useState('')
  const ids = { completude: useId(), area: useId() }

  async function confirmar(entrada: Parameters<typeof service.confirmar>[1], mensagem: string) {
    const feito = await acao.executar(() => service.confirmar(triagemId, entrada), () => mensagem)
    if (feito) onAlterado(`${mensagem} Reprocesse para aplicar às verificações.`)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" disabled={acao.executando} onClick={() => confirmar({ versaoEsperada: versao, tipo: 'modalidade', valor: 'D', justificativa: '' }, 'Modalidade desdobro confirmada.')}>
          Confirmar modalidade: desdobro
        </Button>
        <Button type="button" variant="outline" size="sm" disabled={acao.executando} onClick={() => confirmar({ versaoEsperada: versao, tipo: 'etapa', valor: 'abertura', justificativa: '' }, 'Etapa de abertura confirmada.')}>
          Confirmar etapa: abertura
        </Button>
      </div>

      <form
        className="space-y-2 rounded-md bg-surface-sunken p-3"
        aria-labelledby={ids.completude}
        onSubmit={(event) => {
          event.preventDefault()
          if (justificativaCompletude.trim().length < 5) return
          void confirmar({ versaoEsperada: versao, tipo: 'integridade', valor: completude, justificativa: justificativaCompletude.trim() }, 'Completude do pacote registrada.')
        }}
      >
        <h3 id={ids.completude} className="text-sm font-bold text-ink">Completude do pacote</h3>
        <p className="text-sm text-ink">
          Confirmar como <strong>completo</strong> declara que os anexos recebidos são todo o protocolo. Só assim o sistema passa a apontar documentos
          como <strong>não localizados</strong>. Sem essa confirmação, essas verificações ficam inconclusivas. Confira com o protocolo antes de confirmar.
        </p>
        <div className="flex flex-wrap gap-4 text-sm">
          {(['completo', 'parcial', 'desconhecida'] as const).map((valor) => (
            <label key={valor} className="flex items-center gap-2">
              <input type="radio" name="completude" checked={completude === valor} onChange={() => setCompletude(valor)} className="size-4 accent-[var(--brand-blue)]" />
              {{ completo: 'Completo', parcial: 'Parcial', desconhecida: 'Não sei' }[valor]}
            </label>
          ))}
        </div>
        <label className="block text-sm font-semibold text-ink">
          Justificativa (obrigatória)
          <textarea value={justificativaCompletude} rows={2} maxLength={2000} onChange={(event) => setJustificativaCompletude(event.currentTarget.value)} className="mt-1 block w-full rounded-md border border-input bg-white p-2 text-sm font-normal" placeholder="Ex.: conferido com o protocolo, 8 anexos." />
        </label>
        <Button type="submit" size="sm" disabled={acao.executando || justificativaCompletude.trim().length < 5}>
          Registrar completude
        </Button>
      </form>

      <form
        className="space-y-2 rounded-md bg-surface-sunken p-3"
        aria-labelledby={ids.area}
        onSubmit={(event) => {
          event.preventDefault()
          void confirmar({ versaoEsperada: versao, tipo: 'condicao', condicao: 'area-situacao-acima-2ha', valor: area === 'sim', justificativa: justificativaArea.trim() }, 'Condição de área registrada.')
        }}
      >
        <h3 id={ids.area} className="text-sm font-bold text-ink">Área da situação acima de 2 hectares</h3>
        <p className="text-sm text-ink">A regra da GDU (028) só roda depois desta confirmação. A área extraída dos documentos é só informação e não ativa a regra sozinha.</p>
        <div className="flex gap-4 text-sm">
          {(['sim', 'nao'] as const).map((valor) => (
            <label key={valor} className="flex items-center gap-2">
              <input type="radio" name="area" checked={area === valor} onChange={() => setArea(valor)} className="size-4 accent-[var(--brand-blue)]" />
              {valor === 'sim' ? 'Sim, acima de 2 ha' : 'Não'}
            </label>
          ))}
        </div>
        <label className="block text-sm font-semibold text-ink">
          Justificativa (opcional)
          <textarea value={justificativaArea} rows={2} maxLength={2000} onChange={(event) => setJustificativaArea(event.currentTarget.value)} className="mt-1 block w-full rounded-md border border-input bg-white p-2 text-sm font-normal" />
        </label>
        <Button type="submit" size="sm" disabled={acao.executando}>
          Registrar condição
        </Button>
      </form>
      {acao.erro !== null && <ErroAcao erro={acao.erro} onAtualizar={() => onAlterado()} />}
    </div>
  )
}

// ---------- histórico ----------

export function Historico({ detalhe, triagemId }: { detalhe: TriagemDetalhe; triagemId: string }) {
  const concluidas = detalhe.analises.filter((analise) => analise.situacao === 'concluida')
  const atual = detalhe.triagem.analiseAtual
  // A base escolhida só vale se ainda for uma análise anterior à atual; senão, a penúltima concluída
  // (assim a comparação aparece logo depois de um reprocessamento, sem recarregar a página).
  const [escolhida, setBase] = useState<number | null>(null)
  const anteriores = concluidas.filter((analise) => analise.numero !== atual)
  const base = anteriores.some((analise) => analise.numero === escolhida) ? escolhida : (anteriores.at(-1)?.numero ?? null)
  const correcoes = detalhe.revisoes.filter((revisao) => revisao.decisao === 'corrigido')
  return (
    <div className="space-y-5">
      <div className="overflow-x-auto" role="region" aria-label="Análises do processo" tabIndex={0}>
        <table className="w-full min-w-[40rem] border-collapse text-left text-sm">
          <caption className="text-left text-sm font-bold text-ink">Análises</caption>
          <thead className="text-xs text-muted-foreground">
            <tr>
              <th scope="col" className="py-1 pr-2">Nº</th>
              <th scope="col" className="py-1 pr-2">Motivo</th>
              <th scope="col" className="py-1 pr-2">Situação</th>
              <th scope="col" className="py-1 pr-2">Motor e catálogo</th>
              <th scope="col" className="py-1 pr-2">Encerrada em</th>
            </tr>
          </thead>
          <tbody>
            {detalhe.analises.map((analise) => (
              <tr key={analise.numero} className="bg-surface-sunken/60">
                <th scope="row" className="px-2 py-1.5">
                  {analise.numero}
                  {analise.numero === atual ? ' (atual)' : ''}
                </th>
                <td className="px-2 py-1.5">{{ inicial: 'Envio do pacote', reprocessamento: `Reprocessamento da nº ${analise.baseAnalise ?? '—'}`, retomada: 'Retomada' }[analise.motivo]}</td>
                <td className="px-2 py-1.5">{{ processando: 'Processando', concluida: 'Concluída', falhou: 'Falhou', interrompida: 'Interrompida' }[analise.situacao]}</td>
                <td className="px-2 py-1.5 text-xs">
                  {analise.motorVersao} · catálogo {analise.catalogo.versao} ({analise.catalogo.sha256.slice(0, 12)}…)
                </td>
                <td className="px-2 py-1.5 tabular">{formatarDataHora(analise.encerradaEm)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {correcoes.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-ink">Campos corrigidos por servidor</h3>
          <ul className="mt-2 space-y-1 text-sm">
            {correcoes.map((revisao) => (
              <li key={revisao.id} className="rounded-md bg-surface-sunken px-2 py-1.5">
                <span className="font-semibold">{revisao.campoId?.split(':').at(-1) ? campoRotulo[revisao.campoId.split(':').at(-1) ?? ''] : 'Campo'}</span>: “{revisao.correcao?.anterior ?? '—'}” <ArrowRight aria-label="para" className="inline size-3.5" /> “{revisao.correcao?.novo}” — por {revisao.revisor} em {formatarDataHora(revisao.em)} (na análise nº {revisao.analise})
                <span className="block text-muted-foreground">“{revisao.justificativa}”</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {detalhe.revisoes.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-ink">Todas as revisões</h3>
          <ul className="mt-2 space-y-1 text-sm">
            {detalhe.revisoes.map((revisao) => (
              <li key={revisao.id} className="rounded-md bg-surface-sunken px-2 py-1.5">
                {decisaoRotulo[revisao.decisao]} {revisao.regraId ? `(${revisao.regraId})` : ''} — {revisao.revisor}, {formatarDataHora(revisao.em)}, análise nº {revisao.analise}
              </li>
            ))}
          </ul>
        </div>
      )}

      {concluidas.length > 1 && atual && (
        <div className="space-y-2">
          <label className="flex flex-wrap items-center gap-2 text-sm font-semibold text-ink">
            Comparar a análise atual (nº {atual}) com a nº
            <select value={base ?? ''} onChange={(event) => setBase(Number(event.currentTarget.value))} className="h-9 rounded-md border border-input bg-white px-2 font-normal">
              {anteriores.map((analise) => (
                <option key={analise.numero} value={analise.numero}>
                  {analise.numero}
                </option>
              ))}
            </select>
          </label>
          {base && <Comparacao triagemId={triagemId} base={base} atual={atual} />}
        </div>
      )}
    </div>
  )
}

function Comparacao({ triagemId, base, atual }: { triagemId: string; base: number; atual: number }) {
  const { service } = useTriagemSession()
  const antes = useCarregar((signal) => service.avaliacoes(triagemId, base, { signal }), `comparar#${triagemId}#${base}`)
  const depois = useCarregar((signal) => service.avaliacoes(triagemId, atual, { signal }), `comparar#${triagemId}#${atual}`)
  if (antes.estado === 'erro') return <ErroAcao erro={antes.erro} />
  if (depois.estado === 'erro') return <ErroAcao erro={depois.erro} />
  if (antes.estado !== 'pronto' || depois.estado !== 'pronto') return <p role="status" className="text-sm text-muted-foreground">Carregando a comparação…</p>
  const linhas = depois.dados.itens.map((item) => ({ item, anterior: antes.dados.itens.find((outra) => outra.regraId === item.regraId) }))
  const mudaram = linhas.filter(({ item, anterior }) => !anterior || anterior.resultado !== item.resultado || anterior.tipo !== item.tipo || anterior.rascunho !== item.rascunho)
  return (
    <div className="overflow-x-auto" role="region" aria-label={`Comparação entre as análises ${base} e ${atual}`} tabIndex={0}>
      <p className="mb-2 text-sm text-ink" aria-live="polite">
        {mudaram.length === 0 ? 'Nenhuma verificação mudou.' : `${mudaram.length} ${mudaram.length === 1 ? 'verificação mudou' : 'verificações mudaram'}.`}
      </p>
      <table className="w-full min-w-[44rem] border-collapse text-left text-sm">
        <thead className="text-xs text-muted-foreground">
          <tr>
            <th scope="col" className="py-1 pr-2">Regra e versão</th>
            <th scope="col" className="py-1 pr-2">Análise nº {base}</th>
            <th scope="col" className="py-1 pr-2">Análise nº {atual}</th>
          </tr>
        </thead>
        <tbody>
          {linhas.map(({ item, anterior }) => {
            const mudou = mudaram.some((linha) => linha.item.regraId === item.regraId)
            return (
              <tr key={item.regraId} className={cn(mudou ? 'bg-modification-bg' : 'bg-surface-sunken/60')}>
                <th scope="row" className="px-2 py-1.5 font-normal">
                  <span className="font-semibold">{item.nome}</span>
                  <span className="block text-xs text-muted-foreground">{item.regraVersao}</span>
                  {mudou && <span className="text-xs font-semibold text-modification">mudou</span>}
                </th>
                <td className="px-2 py-1.5">{anterior ? <ResultadoCurto avaliacao={anterior} /> : '—'}</td>
                <td className="px-2 py-1.5"><ResultadoCurto avaliacao={item} /></td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function ResultadoCurto({ avaliacao }: { avaliacao: Avaliacao }) {
  const categoria = categoriaDe(avaliacao)
  return (
    <span className="flex flex-col gap-0.5">
      <CategoriaBadge categoria={categoria} />
      <span className="text-xs text-muted-foreground">{resultadoRotulo[avaliacao.resultado]}</span>
      <span className="sr-only">{categorias[categoria].explicacao}</span>
    </span>
  )
}
