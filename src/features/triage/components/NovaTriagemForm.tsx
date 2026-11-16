import { FileText, LoaderCircle, Send, Trash2, TriangleAlert, Upload } from 'lucide-react'
import { useId, useMemo, useState, type DragEvent, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { Button } from '@/components/ui/button'
import { routes } from '@/config/routes'
import { formatFileSize, pluralize } from '@/lib/format'
import { cn } from '@/lib/utils'
import { conferirArquivos, FORMATOS_LIDOS, type Limites } from '../model/arquivos'
import { etapaRotulo, modalidadeRotulo } from '../model/describe'
import { useTriagemSession } from '../session/triage-session'
import { ErroAcao } from './common'

const OUTRAS_MODALIDADES = ['R', 'DM', 'R/D', 'D/R', 'RET', 'L1'] as const
const OUTRAS_ETAPAS = ['analise', 'pos-analise', 'pos-decisao'] as const

function hoje(): string {
  const agora = new Date()
  return `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}-${String(agora.getDate()).padStart(2, '0')}`
}

function novaChave(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `chave-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

/**
 * Envio de um pacote sintético de desdobro na abertura. O servidor confere tudo de novo; aqui só
 * se evita enviar o que ele recusaria. A chave de idempotência é a mesma até o envio dar certo:
 * clicar duas vezes ou tentar de novo não cria dois processos.
 */
export function NovaTriagemForm({ limites }: { limites: Limites }) {
  const { service } = useTriagemSession()
  const navigate = useNavigate()
  const [arquivos, setArquivos] = useState<File[]>([])
  const [referencia, setReferencia] = useState('')
  const [protocolo, setProtocolo] = useState(hoje)
  const [declaracao, setDeclaracao] = useState(false)
  const [arrastando, setArrastando] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<unknown>(null)
  const [tentouEnviar, setTentouEnviar] = useState(false)
  const [chave] = useState(novaChave)
  const inputId = useId()
  const dicaId = useId()
  const conferencia = useMemo(() => conferirArquivos(arquivos, limites), [arquivos, limites])

  function acrescentar(lista: FileList | null) {
    if (!lista || lista.length === 0) return
    setArquivos((atuais) => [...atuais, ...Array.from(lista)])
    setErro(null)
  }

  function soltar(event: DragEvent) {
    event.preventDefault()
    setArrastando(false)
    acrescentar(event.dataTransfer.files)
  }

  const problemas = [
    ...conferencia.erros,
    ...(arquivos.length === 0 ? ['Selecione ao menos um arquivo.'] : []),
    ...(!declaracao ? ['Confirme que os arquivos são sintéticos.'] : []),
    ...(!protocolo ? ['Informe a data do protocolo.'] : []),
  ]

  async function enviar(event: FormEvent) {
    event.preventDefault()
    setTentouEnviar(true)
    if (problemas.length > 0 || enviando) return
    setEnviando(true)
    setErro(null)
    try {
      // Meio-dia em Campo Grande (15h UTC): a data do protocolo não muda de dia no fuso.
      const criada = await service.criar(
        { referencia: referencia.trim() || null, protocoladoEm: `${protocolo}T15:00:00.000Z`, modalidade: 'D', etapa: 'abertura' },
        arquivos,
        chave,
      )
      navigate(routes.triageProcess(criada.triagem.id), { state: { aviso: criada.nova ? 'Pacote recebido. A análise está na fila.' : 'Este pacote já tinha sido enviado; abrimos o processo existente.' } })
    } catch (falha) {
      setErro(falha)
      setEnviando(false)
    }
  }

  return (
    <form onSubmit={enviar} noValidate className="mt-6 space-y-6" aria-describedby={dicaId}>
      <p id={dicaId} className="sr-only">
        Formulário de envio de pacote sintético para triagem experimental de desdobro na etapa de abertura.
      </p>

      <fieldset className="rounded-lg bg-white p-4 shadow-surface sm:p-5">
        <legend className="sr-only">Enquadramento</legend>
        <h2 className="text-lg font-bold text-ink">Enquadramento</h2>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <div role="radiogroup" aria-labelledby="modalidade-rotulo" className="space-y-2">
            <p id="modalidade-rotulo" className="text-sm font-semibold text-ink">
              Modalidade
            </p>
            <label className="flex items-center gap-2 text-[0.9375rem]">
              <input type="radio" name="modalidade" value="D" checked readOnly className="size-4 accent-[var(--brand-blue)]" />
              {modalidadeRotulo.D}
            </label>
            {OUTRAS_MODALIDADES.map((modalidade) => (
              <label key={modalidade} className="flex items-center gap-2 text-[0.9375rem] text-subtle">
                <input type="radio" name="modalidade" value={modalidade} disabled className="size-4" />
                {modalidade === 'L1' ? 'Loteamento' : modalidadeRotulo[modalidade]} <span className="text-xs">(ainda não suportada)</span>
              </label>
            ))}
          </div>
          <div role="radiogroup" aria-labelledby="etapa-rotulo" className="space-y-2">
            <p id="etapa-rotulo" className="text-sm font-semibold text-ink">
              Etapa
            </p>
            <label className="flex items-center gap-2 text-[0.9375rem]">
              <input type="radio" name="etapa" value="abertura" checked readOnly className="size-4 accent-[var(--brand-blue)]" />
              {etapaRotulo.abertura}
            </label>
            {OUTRAS_ETAPAS.map((etapa) => (
              <label key={etapa} className="flex items-center gap-2 text-[0.9375rem] text-subtle">
                <input type="radio" name="etapa" value={etapa} disabled className="size-4" />
                {etapaRotulo[etapa]} <span className="text-xs">(ainda não suportada)</span>
              </label>
            ))}
          </div>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          A modalidade e a etapa entram como <strong>declaradas</strong>. Você pode confirmá-las depois, na tela do processo.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-semibold text-ink">
            Referência fictícia (opcional)
            <input
              type="text"
              value={referencia}
              maxLength={100}
              onChange={(event) => setReferencia(event.currentTarget.value)}
              className="mt-1 block h-11 w-full rounded-md border border-input bg-white px-3 text-[0.9375rem] font-normal"
              aria-describedby="referencia-dica"
            />
            <span id="referencia-dica" className="mt-1 block text-xs font-normal text-muted-foreground">
              Não use número de processo real.
            </span>
          </label>
          <label className="block text-sm font-semibold text-ink">
            Data do protocolo
            <input
              type="date"
              value={protocolo}
              required
              onChange={(event) => setProtocolo(event.currentTarget.value)}
              className="mt-1 block h-11 w-full rounded-md border border-input bg-white px-3 text-[0.9375rem] font-normal"
            />
          </label>
        </div>
      </fieldset>

      <section aria-labelledby="anexos-titulo" className="rounded-lg bg-white p-4 shadow-surface sm:p-5">
        <h2 id="anexos-titulo" className="text-lg font-bold text-ink">
          Anexos do pacote
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Até {pluralize(limites.maxAnexos, 'arquivo', 'arquivos')}, {formatFileSize(limites.maxBytesArquivo)} cada e {formatFileSize(limites.maxBytesPacote)} no total. Formatos lidos:{' '}
          {[...new Set(Object.values(FORMATOS_LIDOS))].join(', ')}.
        </p>
        <div
          onDragOver={(event) => {
            event.preventDefault()
            setArrastando(true)
          }}
          onDragLeave={() => setArrastando(false)}
          onDrop={soltar}
          className={cn('mt-3 flex flex-col items-center gap-3 rounded-md border-2 border-dashed p-6 text-center', arrastando ? 'border-brand bg-brand-50' : 'border-line-strong')}
          data-testid="area-anexos"
        >
          <Upload aria-hidden className="size-8 text-brand" />
          <p className="text-[0.9375rem] text-ink">Arraste os arquivos para cá ou</p>
          <input
            id={inputId}
            type="file"
            multiple
            className="sr-only"
            aria-label="Selecionar arquivos do pacote"
            onChange={(event) => {
              acrescentar(event.currentTarget.files)
              event.currentTarget.value = ''
            }}
          />
          <Button asChild variant="outline">
            <label htmlFor={inputId} className="cursor-pointer">
              Selecionar arquivos
            </label>
          </Button>
        </div>

        {arquivos.length > 0 && (
          <>
            <p className="mt-4 text-sm font-semibold text-ink" aria-live="polite">
              {pluralize(arquivos.length, 'arquivo selecionado', 'arquivos selecionados')} · {formatFileSize(conferencia.total)}
            </p>
            <ul className="mt-2 space-y-2" aria-label="Arquivos selecionados">
              {conferencia.arquivos.map(({ arquivo, formato, avisos }, indice) => (
                <li key={`${arquivo.name}-${indice}`} className="flex flex-wrap items-start gap-3 rounded-md bg-surface-sunken p-3">
                  <FileText aria-hidden className="mt-0.5 size-5 shrink-0 text-brand" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-ink" title={arquivo.name}>
                      {arquivo.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formato} · {formatFileSize(arquivo.size)}
                    </p>
                    {avisos.map((aviso) => (
                      <p key={aviso} className="mt-1 flex items-center gap-1 text-xs text-modification">
                        <TriangleAlert aria-hidden className="size-3.5 shrink-0" />
                        {aviso}
                      </p>
                    ))}
                  </div>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setArquivos((atuais) => atuais.filter((_, posicao) => posicao !== indice))} aria-label={`Remover ${arquivo.name}`}>
                    <Trash2 aria-hidden />
                    Remover
                  </Button>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <section aria-labelledby="sintetico-titulo" className="rounded-lg bg-white p-4 shadow-surface sm:p-5">
        <h2 id="sintetico-titulo" className="text-lg font-bold text-ink">
          Antes de enviar
        </h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-ink">
          <li>
            O envio <strong>não</strong> marca o pacote como completo. Enquanto você não confirmar a completude na tela do processo, nenhum documento é
            apontado como ausente.
          </li>
          <li>Os arquivos são conferidos pelo conteúdo no servidor; arquivo suspeito é isolado e não é aberto.</li>
        </ul>
        <label className="mt-4 flex items-start gap-2 text-[0.9375rem] text-ink">
          <input type="checkbox" checked={declaracao} onChange={(event) => setDeclaracao(event.currentTarget.checked)} className="mt-1 size-4 accent-[var(--brand-blue)]" />
          <span>
            Declaro que todos os arquivos são <strong>sintéticos</strong> (fictícios), sem dados de requerentes reais.
            <span className="block text-xs text-muted-foreground">
              A declaração não substitui as barreiras do sistema: a triagem só funciona em ambiente de teste e é recusada em produção.
            </span>
          </span>
        </label>
      </section>

      {tentouEnviar && problemas.length > 0 && (
        <div role="alert" className="rounded-lg bg-deletion-bg p-3 text-sm text-ink">
          <p className="font-semibold text-deletion">Confira antes de enviar:</p>
          <ul className="mt-1 list-disc pl-5">
            {problemas.map((problema) => (
              <li key={problema}>{problema}</li>
            ))}
          </ul>
        </div>
      )}
      {erro !== null && <ErroAcao erro={erro} />}

      <div className="flex flex-wrap gap-3">
        <Button type="submit" className="min-h-11" disabled={enviando}>
          {enviando ? <LoaderCircle aria-hidden className="animate-spin" /> : <Send aria-hidden />}
          {enviando ? 'Enviando o pacote…' : 'Enviar para triagem'}
        </Button>
        <Button type="button" variant="outline" className="min-h-11" onClick={() => navigate(routes.triage)} disabled={enviando}>
          Cancelar
        </Button>
      </div>
      {enviando && (
        <p role="status" className="sr-only">
          Enviando o pacote. Aguarde.
        </p>
      )}
    </form>
  )
}
