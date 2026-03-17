'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrency, formatDate } from '@/lib/utils'
import { BulkReconcile } from '@/components/Reconciliation/BulkReconcile'
import { toast } from 'sonner'
import type { ReconciliationStatus } from '@/lib/schemas'

type TransactionRow = {
  id: string
  transaction_date: string
  merchant_name: string
  amount_brl: number
  card_alias: string
  status: string
  category: string | null
  holder_name: string
  reconciliation: {
    status: string
    note: string | null
    is_recurring: boolean
  } | null
}

const RECON_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  Pendente: 'outline',
  Conciliado: 'default',
  'N/A': 'secondary',
  Recorrente: 'secondary',
}

async function quickReconcile(
  transactionId: string,
  newStatus: ReconciliationStatus,
  note?: string
): Promise<boolean> {
  const res = await fetch('/api/reconcile', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ transactionId, newStatus, note }),
  })
  const json = await res.json()
  if (json.error) {
    toast.error(json.error.message)
    return false
  }
  return true
}

function exportToCsv(rows: TransactionRow[]) {
  const header = 'Data,Estabelecimento,Categoria,Valor,Titular,Conciliacao\n'
  const body = rows
    .map((t) => {
      const recon = t.reconciliation?.status ?? ''
      return [
        t.transaction_date,
        `"${t.merchant_name.replace(/"/g, '""')}"`,
        `"${(t.category || '').replace(/"/g, '""')}"`,
        t.amount_brl.toFixed(2).replace('.', ','),
        `"${t.holder_name.replace(/"/g, '""')}"`,
        recon,
      ].join(',')
    })
    .join('\n')

  const blob = new Blob(['\uFEFF' + header + body], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `transacoes-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export function TransactionTable() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [transactions, setTransactions] = useState<TransactionRow[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)

  const page = parseInt(searchParams.get('page') || '1', 10)
  const limit = 50

  const fetchTransactions = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams(searchParams.toString())
    if (!params.has('limit')) params.set('limit', String(limit))

    const res = await fetch(`/api/transactions?${params}`)
    const json = await res.json()

    if (json.data) {
      setTransactions(json.data.transactions)
      setTotal(json.data.total)
    }
    setLoading(false)
  }, [searchParams])

  useEffect(() => {
    fetchTransactions()
  }, [fetchTransactions])

  const totalPages = Math.ceil(total / limit)

  function goToPage(p: number) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', String(p))
    router.push(`?${params.toString()}`)
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    if (selected.size === transactions.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(transactions.map((t) => t.id)))
    }
  }

  async function handleExport() {
    setExporting(true)
    try {
      const params = new URLSearchParams(searchParams.toString())
      params.set('limit', '10000')
      params.delete('page')
      const res = await fetch(`/api/transactions?${params}`)
      const json = await res.json()
      if (json.data?.transactions) {
        exportToCsv(json.data.transactions)
        toast.success(`${json.data.transactions.length} transacoes exportadas`)
      }
    } catch {
      toast.error('Erro ao exportar')
    } finally {
      setExporting(false)
    }
  }

  async function handleQuickAction(id: string, newStatus: ReconciliationStatus) {
    setActionLoading(id)
    const ok = await quickReconcile(id, newStatus)
    if (ok) {
      toast.success(newStatus === 'Conciliado' ? 'Conciliado' : 'Marcado como recorrente')
      fetchTransactions()
    }
    setActionLoading(null)
  }

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 10 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {selected.size > 0 && (
        <BulkReconcile
          transactionIds={Array.from(selected)}
          onComplete={() => {
            setSelected(new Set())
            fetchTransactions()
          }}
        />
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={selected.size === transactions.length && transactions.length > 0}
                  onCheckedChange={toggleSelectAll}
                />
              </TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Estabelecimento</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead>Titular</TableHead>
              <TableHead>Conciliacao</TableHead>
              <TableHead className="w-48">Acoes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                  Nenhuma transacao encontrada.
                </TableCell>
              </TableRow>
            ) : (
              transactions.map((t) => {
                const reconStatus = t.reconciliation?.status ?? ''
                const isActionable = reconStatus === 'Pendente'
                const isLoading = actionLoading === t.id

                return (
                  <TableRow key={t.id}>
                    <TableCell>
                      <Checkbox
                        checked={selected.has(t.id)}
                        onCheckedChange={() => toggleSelect(t.id)}
                      />
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {formatDate(t.transaction_date)}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {t.merchant_name}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {t.category || '—'}
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap font-medium">
                      {formatCurrency(t.amount_brl)}
                    </TableCell>
                    <TableCell className="text-sm">
                      {t.holder_name}
                    </TableCell>
                    <TableCell>
                      <Badge variant={RECON_VARIANT[reconStatus] || 'outline'}>
                        {reconStatus || '—'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {isActionable && (
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            disabled={isLoading}
                            onClick={() => handleQuickAction(t.id, 'Conciliado')}
                          >
                            Conciliar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={isLoading}
                            onClick={() => handleQuickAction(t.id, 'Recorrente')}
                          >
                            Recorrente
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination + Export */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <p className="text-sm text-muted-foreground">
            {total} transacao(es) — Pagina {page} de {totalPages || 1}
          </p>
          <Button
            variant="outline"
            size="sm"
            disabled={exporting || total === 0}
            onClick={handleExport}
          >
            {exporting ? 'Exportando...' : 'Exportar CSV'}
          </Button>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => goToPage(page - 1)}
          >
            Anterior
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => goToPage(page + 1)}
          >
            Proxima
          </Button>
        </div>
      </div>
    </div>
  )
}
