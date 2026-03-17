'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import type { ReconciliationStatus } from '@/lib/schemas'

type BulkReconcileProps = {
  transactionIds: string[]
  onComplete: () => void
}

export function BulkReconcile({ transactionIds, onComplete }: BulkReconcileProps) {
  const [loading, setLoading] = useState(false)

  async function handleBulk(newStatus: ReconciliationStatus) {
    setLoading(true)
    try {
      const res = await fetch('/api/reconcile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactionIds,
          newStatus,
        }),
      })
      const json = await res.json()
      if (json.error) {
        toast.error(json.error.message)
      } else {
        toast.success(`${json.data.updated} transacao(es) atualizadas para ${newStatus}`)
        onComplete()
      }
    } catch {
      toast.error('Erro na conciliacao em lote')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-3 rounded-md border bg-muted/50 p-3">
      <span className="text-sm font-medium">
        {transactionIds.length} selecionada(s)
      </span>
      <Button
        size="sm"
        disabled={loading}
        onClick={() => handleBulk('Conciliado')}
      >
        Conciliar
      </Button>
      <Button
        size="sm"
        variant="outline"
        disabled={loading}
        onClick={() => handleBulk('Recorrente')}
      >
        Marcar Recorrente
      </Button>
    </div>
  )
}
