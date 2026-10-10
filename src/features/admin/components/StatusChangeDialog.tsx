import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { REASON_MAX } from '../../../../shared/validation/account'
import { messageOf } from '../hooks/use-async-data'
import type { Account } from '../model/types'
import { fieldClass, labelClass } from './field-styles'

interface StatusChangeDialogProps {
  account: Account
  /** Executa a mudança; rejeita com `AccountServiceError` se o servidor recusar. */
  onConfirm: (motivo: string) => Promise<void>
}

/** Confirmação de desativar ou reativar. Desativar bloqueia o acesso; a conta e o histórico ficam. */
export function StatusChangeDialog({ account, onConfirm }: StatusChangeDialogProps) {
  const deactivating = account.situacao === 'ativa'
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | undefined>()
  const [working, setWorking] = useState(false)

  async function confirm() {
    setWorking(true)
    setError(undefined)
    try {
      await onConfirm(reason.trim())
      setOpen(false)
      setReason('')
    } catch (failure) {
      setError(messageOf(failure))
    } finally {
      setWorking(false)
    }
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) setError(undefined)
      }}
    >
      <AlertDialogTrigger asChild>
        <Button type="button" variant={deactivating ? 'destructive' : 'default'} className="min-h-11">
          {deactivating ? 'Desativar conta' : 'Reativar conta'}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogTitle className="text-xl font-extrabold text-ink">
          {deactivating ? `Desativar a conta de ${account.nome}?` : `Reativar a conta de ${account.nome}?`}
        </AlertDialogTitle>
        <AlertDialogDescription className="mt-2 text-muted-foreground">
          {deactivating
            ? 'A pessoa deixa de poder usar o AQR. A conta não é excluída: os dados e o histórico continuam guardados e você pode reativá-la depois.'
            : 'A pessoa volta a poder usar o AQR com o papel que a conta tem agora.'}
        </AlertDialogDescription>
        <div className="mt-5">
          <label htmlFor="motivo-situacao" className={labelClass}>Motivo (opcional)</label>
          <textarea
            id="motivo-situacao"
            value={reason}
            maxLength={REASON_MAX}
            rows={3}
            onChange={(event) => setReason(event.target.value)}
            className={`${fieldClass} h-auto py-2.5`}
          />
          <p className="mt-1.5 text-sm text-muted-foreground">Fica registrado na auditoria.</p>
        </div>
        {error && <p role="alert" className="mt-4 rounded-lg bg-deletion-bg p-3 text-deletion">{error}</p>}
        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <AlertDialogCancel asChild>
            <Button type="button" variant="outline" className="min-h-11">Cancelar</Button>
          </AlertDialogCancel>
          <Button
            type="button"
            variant={deactivating ? 'destructive' : 'default'}
            disabled={working}
            onClick={() => void confirm()}
            className="min-h-11"
          >
            {working ? 'Aguarde…' : deactivating ? 'Desativar' : 'Reativar'}
          </Button>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  )
}
