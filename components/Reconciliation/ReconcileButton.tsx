'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { VALID_TRANSITIONS, requiresNote, type ReconciliationStatus } from '@/lib/schemas'

type ReconcileButtonProps = {
  transactionId: string
  currentStatus: string
  onComplete: () => void
}

const STATUS_LABELS: Record<string, string> = {
  Conciliado: 'Marcar como Conciliado',
  Pendente: 'Reverter para Pendente',
  Recorrente: 'Marcar como Recorrente',
}

export function ReconcileButton({ transactionId, currentStatus, onComplete }: ReconcileButtonProps) {
  const [noteDialog, setNoteDialog] = useState<{ open: boolean; targetStatus: ReconciliationStatus | null }>({
    open: false,
    targetStatus: null,
  })
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)

  const availableTransitions = VALID_TRANSITIONS[currentStatus as ReconciliationStatus] || []

  async function handleReconcile(newStatus: ReconciliationStatus, noteText?: string) {
    setLoading(true)
    try {
      const res = await fetch('/api/reconcile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactionId,
          newStatus,
          note: noteText,
        }),
      })
      const json = await res.json()
      if (json.error) {
        toast.error(json.error.message)
      } else {
        toast.success(`Status alterado para ${newStatus}`)
        onComplete()
      }
    } catch {
      toast.error('Erro ao atualizar status')
    } finally {
      setLoading(false)
    }
  }

  function onMenuSelect(status: ReconciliationStatus) {
    if (requiresNote(currentStatus as ReconciliationStatus, status)) {
      setNoteDialog({ open: true, targetStatus: status })
      setNote('')
    } else {
      handleReconcile(status)
    }
  }

  if (availableTransitions.length === 0) return null

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger>
          <Button variant="ghost" size="sm" disabled={loading}>
            ...
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {availableTransitions.map((status) => (
            <DropdownMenuItem
              key={status}
              onClick={() => onMenuSelect(status)}
            >
              {STATUS_LABELS[status] || status}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog
        open={noteDialog.open}
        onOpenChange={(open) => setNoteDialog({ open, targetStatus: noteDialog.targetStatus })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Justificativa</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Informe o motivo da reversao de status.
          </p>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Motivo da reversao..."
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setNoteDialog({ open: false, targetStatus: null })}
            >
              Cancelar
            </Button>
            <Button
              disabled={!note.trim() || loading}
              onClick={() => {
                if (noteDialog.targetStatus) {
                  handleReconcile(noteDialog.targetStatus, note)
                  setNoteDialog({ open: false, targetStatus: null })
                }
              }}
            >
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
