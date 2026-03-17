'use client'

import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatDateTime } from '@/lib/utils'

type LogEntry = {
  id: string
  old_status: string
  new_status: string
  changed_at: string
  note: string | null
}

type ReconcileHistoryProps = {
  transactionId: string
}

export function ReconcileHistory({ transactionId }: ReconcileHistoryProps) {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    fetch(`/api/reconcile/history?transaction_id=${transactionId}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.data) setLogs(json.data)
      })
      .catch(console.error)
  }, [open, transactionId])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger>
        <Button variant="ghost" size="sm">
          Historico
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Historico de Conciliacao</DialogTitle>
        </DialogHeader>
        {logs.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma alteracao registrada.</p>
        ) : (
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {logs.map((log) => (
              <div key={log.id} className="flex flex-col gap-1 border-b pb-2">
                <div className="flex items-center gap-2 text-sm">
                  <Badge variant="outline">{log.old_status}</Badge>
                  <span>→</span>
                  <Badge variant="outline">{log.new_status}</Badge>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {formatDateTime(log.changed_at)}
                  </span>
                </div>
                {log.note && (
                  <p className="text-xs text-muted-foreground">{log.note}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
