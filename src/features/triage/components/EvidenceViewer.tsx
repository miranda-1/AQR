import { ChevronLeft, ChevronRight, FileWarning, LoaderCircle } from 'lucide-react'
import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { loadPdf, type PdfDocumentHandle, type PdfPageSize } from '@/features/comparison/viewer/pdf/load-pdf'
import { PdfPageView } from '@/features/comparison/viewer/pdf/PdfPageView'
import { formatFileSize } from '@/lib/format'
import { classeRotulo } from '../model/describe'
import { TriagemServiceError, type AnexoInfo, type Evidencia } from '../model/types'
import { useTriagemSession } from '../session/triage-session'

/**
 * Evidência no documento original, aberta no navegador. O arquivo vem do endpoint autenticado
 * (só quem pode ver o processo), fica só na memória desta aba e é descartado ao fechar. Nada de
 * recorte guardado no servidor nem endereço público. Sem conteúdo guardado (ou já expurgado),
 * mostra a evidência estruturada e diz que o original não está disponível.
 */

/** O visualizador do comparador pede um papel (original/atualizado); na triagem há um documento só. */
const PAPEL_DOCUMENTO = 'original' as const

export interface EvidenciaAberta {
  anexo: AnexoInfo
  evidencia: Evidencia
  /** Contexto para o título (ex.: regra ou campo). */
  contexto: string
}

function estilo(regiao: { x: number; y: number; width: number; height: number }): CSSProperties {
  const pct = (valor: number) => `${(valor * 100).toFixed(3)}%`
  return { left: pct(regiao.x), top: pct(regiao.y), width: pct(regiao.width), height: pct(regiao.height) }
}

function Destaques({ evidencia, pagina }: { evidencia: Evidencia; pagina: number }) {
  if (evidencia.pagina !== pagina) return null
  return (
    <>
      {(evidencia.regioes ?? []).map((regiao, indice) => (
        <span
          key={indice}
          data-testid="destaque-evidencia"
          className="pointer-events-none absolute z-10 rounded-[2px] outline-2 outline-offset-1 outline-brand [background:color-mix(in_srgb,var(--brand-yellow)_35%,transparent)]"
          style={estilo(regiao)}
        >
          <span className="sr-only">Região da evidência{evidencia.trecho ? `: ${evidencia.trecho}` : ''}</span>
        </span>
      ))}
    </>
  )
}

type Carga = { estado: 'carregando' } | { estado: 'pronto'; blob: Blob } | { estado: 'erro'; mensagem: string }

function useConteudo(triagemId: string, anexo: AnexoInfo): Carga {
  const { service } = useTriagemSession()
  const [carga, setCarga] = useState<{ anexoId: string; valor: Carga } | null>(null)
  // Anexo isolado na inspeção nunca é pedido ao servidor (que também o recusa).
  const disponivel = anexo.conteudo === 'armazenado' && anexo.isolado !== true
  useEffect(() => {
    if (!disponivel) return
    const controller = new AbortController()
    service.conteudo(triagemId, anexo.id, { signal: controller.signal }).then(
      (blob) => setCarga({ anexoId: anexo.id, valor: { estado: 'pronto', blob } }),
      (erro: unknown) => {
        if (controller.signal.aborted) return
        const mensagem =
          erro instanceof TriagemServiceError && erro.status === 404
            ? 'O arquivo original não está mais disponível (prazo de guarda vencido ou não armazenado). A evidência registrada continua abaixo.'
            : erro instanceof TriagemServiceError
              ? erro.message
              : 'Não foi possível abrir o arquivo agora.'
        setCarga({ anexoId: anexo.id, valor: { estado: 'erro', mensagem } })
      },
    )
    return () => controller.abort()
  }, [service, triagemId, anexo.id, disponivel])
  if (!disponivel) {
    return {
      estado: 'erro',
      mensagem: anexo.isolado
        ? `Este anexo foi isolado na inspeção (${anexo.motivosIsolamento.join(', ') || 'conteúdo suspeito'}) e não é aberto. A evidência registrada continua abaixo.`
        : anexo.conteudo === 'expurgado'
          ? 'O arquivo original já foi expurgado (prazo de guarda vencido). A evidência registrada continua abaixo.'
          : 'Este ambiente não guarda o conteúdo dos anexos; só os metadados e a evidência registrada.',
    }
  }
  return carga?.anexoId === anexo.id ? carga.valor : { estado: 'carregando' }
}

function PdfEvidencia({ blob, nome, evidencia }: { blob: Blob; nome: string; evidencia: Evidencia }) {
  const [pdf, setPdf] = useState<{ handle: PdfDocumentHandle; tamanhos: PdfPageSize[] } | 'falhou' | null>(null)
  const [pagina, setPagina] = useState(evidencia.pagina ?? 1)
  useEffect(() => {
    let cancelado = false
    let aberto: PdfDocumentHandle | undefined
    loadPdf(new File([blob], nome, { type: 'application/pdf' }))
      .then(async (handle) => {
        aberto = handle
        const tamanhos = await Promise.all(Array.from({ length: handle.pageCount }, (_, indice) => handle.getPage(indice + 1).then(({ width, height }) => ({ width, height }))))
        if (!cancelado) setPdf({ handle, tamanhos })
      })
      .catch(() => {
        if (!cancelado) setPdf('falhou')
      })
    return () => {
      cancelado = true
      void aberto?.destroy()
    }
  }, [blob, nome])

  if (pdf === null) return <p role="status" className="flex items-center gap-2 py-6 text-sm text-muted-foreground"><LoaderCircle aria-hidden className="size-4 animate-spin text-brand" />Abrindo o documento…</p>
  if (pdf === 'falhou') return <p role="status" className="py-6 text-sm text-ink">Não foi possível desenhar este PDF no navegador. A evidência registrada continua abaixo.</p>
  const total = pdf.tamanhos.length
  const atual = Math.min(Math.max(pagina, 1), total)
  const tamanho = pdf.tamanhos[atual - 1]
  return (
    <div>
      <div className="flex items-center justify-between gap-2" role="group" aria-label="Navegação entre páginas">
        <Button type="button" variant="outline" size="sm" onClick={() => setPagina(atual - 1)} disabled={atual <= 1} aria-label="Página anterior">
          <ChevronLeft aria-hidden />
        </Button>
        <p className="text-sm text-ink" aria-live="polite">
          Página <span className="tabular">{atual}</span> de <span className="tabular">{total}</span>
          {evidencia.pagina === atual ? ' · página da evidência' : ''}
        </p>
        <Button type="button" variant="outline" size="sm" onClick={() => setPagina(atual + 1)} disabled={atual >= total} aria-label="Próxima página">
          <ChevronRight aria-hidden />
        </Button>
      </div>
      {evidencia.pagina !== undefined && evidencia.pagina !== atual && (
        <Button type="button" variant="link" size="sm" className="px-0" onClick={() => setPagina(evidencia.pagina ?? 1)}>
          Voltar à página da evidência ({evidencia.pagina})
        </Button>
      )}
      <div className="mt-3 rounded-md bg-surface-sunken p-3 [container-type:inline-size]" style={{ '--zoom': 1 } as CSSProperties}>
        {tamanho && (
          <PdfPageView
            key={atual}
            pdf={pdf.handle}
            size={tamanho}
            pageNumber={atual}
            pageCount={total}
            role={PAPEL_DOCUMENTO}
            marks={[]}
            activeId={null}
            onSelect={() => undefined}
            overlay={<Destaques evidencia={evidencia} pagina={atual} />}
          />
        )}
      </div>
    </div>
  )
}

function ImagemEvidencia({ blob, evidencia, rotacao, nome }: { blob: Blob; evidencia: Evidencia; rotacao: number; nome: string }) {
  const url = useMemo(() => URL.createObjectURL(blob), [blob])
  useEffect(() => () => URL.revokeObjectURL(url), [url])
  return (
    <div>
      {rotacao !== 0 && (
        <p className="mb-2 rounded-md bg-modification-bg p-2 text-sm text-ink">
          A imagem foi lida girada {rotacao}°. A região da evidência se refere à imagem girada e não é desenhada aqui, para não indicar um lugar errado.
        </p>
      )}
      <div className="relative inline-block max-w-full">
        <img src={url} alt={`Imagem do anexo ${nome}`} className="block max-w-full" />
        {rotacao === 0 && <Destaques evidencia={evidencia} pagina={1} />}
      </div>
    </div>
  )
}

export function EvidenceViewer({ triagemId, aberta, onFechar }: { triagemId: string; aberta: EvidenciaAberta | null; onFechar: () => void }) {
  return (
    <Sheet open={aberta !== null} onOpenChange={(aberto) => !aberto && onFechar()}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-3xl">
        {aberta && <Conteudo triagemId={triagemId} aberta={aberta} />}
      </SheetContent>
    </Sheet>
  )
}

function Conteudo({ triagemId, aberta }: { triagemId: string; aberta: EvidenciaAberta }) {
  const { anexo, evidencia, contexto } = aberta
  const carga = useConteudo(triagemId, anexo)
  const rotacao = anexo.paginas.find((pagina) => pagina.pagina === (evidencia.pagina ?? 1))?.rotacao ?? 0
  const visual = anexo.tipoReal === 'pdf' || anexo.tipoReal === 'jpeg' || anexo.tipoReal === 'png'
  return (
    <>
      <SheetHeader>
        <SheetTitle>Evidência no documento</SheetTitle>
        <SheetDescription>{contexto}</SheetDescription>
      </SheetHeader>
      <div className="space-y-4 px-4 pb-6">
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 rounded-md bg-surface-sunken p-3 text-sm">
          <dt className="font-semibold text-ink">Anexo</dt>
          <dd className="min-w-0 break-words">{anexo.ordem}. {anexo.nome}</dd>
          <dt className="font-semibold text-ink">Classe</dt>
          <dd>{classeRotulo[anexo.classificacao?.classe ?? 'indeterminada'] ?? anexo.classificacao?.classe}</dd>
          <dt className="font-semibold text-ink">Tipo real</dt>
          <dd>{anexo.tipoReal?.toUpperCase() ?? '—'} · {formatFileSize(anexo.bytes)}</dd>
          <dt className="font-semibold text-ink">Página</dt>
          <dd>{evidencia.pagina ?? 'sem página (formato sem desenho)'}</dd>
          <dt className="font-semibold text-ink">Origem</dt>
          <dd>{{ 'camada-de-texto': 'texto do arquivo', ocr: 'leitura por OCR', 'metadado-arquivo': 'metadado do arquivo', servidor: 'informado por servidor', 'modelo-local': 'modelo local' }[evidencia.origem]}</dd>
          <dt className="font-semibold text-ink">SHA-256</dt>
          <dd className="font-mono text-xs break-all">{evidencia.sha256}</dd>
        </dl>
        {evidencia.trecho && (
          <figure className="rounded-md bg-white p-3 shadow-surface">
            <figcaption className="text-xs font-semibold text-muted-foreground uppercase">Trecho lido</figcaption>
            <blockquote className="mt-1 text-[0.9375rem] text-ink">“{evidencia.trecho}”</blockquote>
          </figure>
        )}
        {!visual ? (
          <p className="flex items-start gap-2 rounded-md bg-surface-sunken p-3 text-sm text-ink">
            <FileWarning aria-hidden className="mt-0.5 size-4 shrink-0 text-brand" />
            Este formato ({anexo.tipoReal?.toUpperCase() ?? 'desconhecido'}) não tem visualização no navegador. Use o trecho e os metadados acima.
          </p>
        ) : carga.estado === 'carregando' ? (
          <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground"><LoaderCircle aria-hidden className="size-4 animate-spin text-brand" />Buscando o arquivo…</p>
        ) : carga.estado === 'erro' ? (
          <p role="status" className="flex items-start gap-2 rounded-md bg-modification-bg p-3 text-sm text-ink">
            <FileWarning aria-hidden className="mt-0.5 size-4 shrink-0 text-modification" />
            {carga.mensagem}
          </p>
        ) : anexo.tipoReal === 'pdf' ? (
          <PdfEvidencia blob={carga.blob} nome={anexo.nome} evidencia={evidencia} />
        ) : (
          <ImagemEvidencia blob={carga.blob} evidencia={evidencia} rotacao={rotacao} nome={anexo.nome} />
        )}
        <p className="text-xs text-muted-foreground">Arquivo aberto só nesta aba, a partir do servidor do AQR; ao fechar, ele é descartado.</p>
      </div>
    </>
  )
}
