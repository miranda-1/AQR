import { CircleAlert, CircleCheck, FileText, LoaderCircle, Trash2, Upload } from 'lucide-react'
import { useId, useState, type DragEvent } from 'react'
import { Button } from '@/components/ui/button'
import { comparisonConfig } from '@/config/comparison'
import { formatFileSize } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useFileSlot } from '../hooks/use-file-slot'
import type { DocumentRole } from '../model/types'

interface FileSlotProps {
  documentRole: DocumentRole
  title: string
  description: string
}

const accept = [...comparisonConfig.acceptedMimeTypes, ...comparisonConfig.acceptedExtensions].join(',')
const maxSizeLabel = formatFileSize(comparisonConfig.maxFileSizeBytes)

export function FileSlot({ documentRole, title, description }: FileSlotProps) {
  const { file, error, isValidating, select, remove, reportError } = useFileSlot(documentRole)
  const [isDragging, setIsDragging] = useState(false)
  const inputId = useId()
  const titleId = useId()
  const hintId = useId()
  const errorId = useId()

  function handleFiles(list: FileList | null) {
    if (!list || list.length === 0) return
    if (list.length > 1) {
      reportError('Solte apenas um arquivo por vez neste campo.')
      return
    }
    const [candidate] = list
    if (candidate) void select(candidate)
  }

  function handleDragOver(event: DragEvent) {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'copy'
    if (!isDragging) setIsDragging(true)
  }

  function handleDrop(event: DragEvent) {
    event.preventDefault()
    setIsDragging(false)
    handleFiles(event.dataTransfer.files)
  }

  const describedBy = [hintId, error ? errorId : null].filter(Boolean).join(' ')
  const actionLabel = file ? 'Substituir' : 'Selecionar arquivo'

  return (
    <section aria-labelledby={titleId} className="flex min-w-0 flex-col gap-2">
      <div>
        <h2 id={titleId} className="text-base font-bold text-ink">
          {title}
        </h2>
        <p className="text-[0.9375rem] text-muted-foreground">{description}</p>
      </div>

      <div
        onDragOver={handleDragOver}
        onDragEnter={handleDragOver}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={cn(
          'group relative flex min-h-44 flex-1 flex-col justify-center rounded-md border-2 p-4 transition-colors',
          file ? 'border-solid border-transparent bg-white shadow-surface' : 'border-dashed border-line-strong bg-white',
          isDragging && 'border-solid border-brand bg-brand-50',
          error && !isDragging && 'border-deletion-line',
        )}
        data-testid={`slot-${documentRole}`}
      >
        {/* O input real é visualmente oculto; o rótulo estilizado como botão o aciona. */}
        <input
          id={inputId}
          type="file"
          accept={accept}
          className="sr-only"
          aria-describedby={describedBy}
          aria-label={`${actionLabel}: ${title.toLowerCase()} (PDF)`}
          onChange={(event) => {
            handleFiles(event.currentTarget.files)
            event.currentTarget.value = '' // permite selecionar o mesmo arquivo de novo
          }}
        />

        {isValidating ? (
          <div className="flex flex-col items-center gap-2 text-center" role="status">
            <LoaderCircle aria-hidden className="size-8 animate-spin text-brand" />
            <p className="font-medium">Verificando o arquivo…</p>
          </div>
        ) : file ? (
          <div className="flex flex-col gap-4">
            <div className="flex items-start gap-3">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-md bg-brand-50 text-brand">
                <FileText aria-hidden className="size-6" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-ink" title={file.name}>
                  {file.name}
                </p>
                <p className="tabular text-sm text-muted-foreground">{formatFileSize(file.size)}</p>
                <p className="mt-1 flex items-center gap-1.5 text-sm font-medium text-success">
                  <CircleCheck aria-hidden className="size-4" />
                  Arquivo PDF pronto para comparar
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <label
                htmlFor={inputId}
                className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-md border border-line-strong bg-white px-3.5 text-[0.9375rem] font-semibold hover:bg-accent group-has-[input:focus-visible]:outline-2 group-has-[input:focus-visible]:outline-offset-2 group-has-[input:focus-visible]:outline-ring"
              >
                <Upload aria-hidden className="size-4" />
                Substituir
              </label>
              <Button variant="ghost" onClick={remove} className="text-deletion hover:bg-deletion-bg hover:text-deletion">
                <Trash2 aria-hidden />
                Remover
                <span className="sr-only"> {title.toLowerCase()}</span>
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 text-center">
            <Upload aria-hidden className="size-8 text-brand" />
            <div>
              <p className="font-semibold text-ink">Arraste o PDF para cá</p>
              <p className="text-sm text-muted-foreground">ou</p>
            </div>
            <label
              htmlFor={inputId}
              className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-md bg-brand px-4 text-[0.9375rem] font-semibold text-white hover:bg-brand-800 group-has-[input:focus-visible]:outline-2 group-has-[input:focus-visible]:outline-offset-2 group-has-[input:focus-visible]:outline-ring"
            >
              Selecionar arquivo
            </label>
          </div>
        )}
      </div>

      <p id={hintId} className="text-sm text-muted-foreground">
        Formato PDF, até {maxSizeLabel}.
      </p>
      <div aria-live="assertive">
        {error && (
          <p id={errorId} className="flex items-start gap-2 text-[0.9375rem] font-medium text-deletion">
            <CircleAlert aria-hidden className="mt-0.5 size-[1.125rem] shrink-0" />
            {error}
          </p>
        )}
      </div>
    </section>
  )
}
