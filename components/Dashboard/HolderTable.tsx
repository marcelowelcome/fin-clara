'use client'

import Link from 'next/link'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'
import type { HolderSpend } from '@/lib/metrics'

const RANK_COLORS = [
  { bg: 'bg-emerald-500', text: 'text-emerald-700', label: 'Excelente' },
  { bg: 'bg-lime-500', text: 'text-lime-700', label: 'Otimo' },
  { bg: 'bg-sky-500', text: 'text-sky-700', label: 'Bom' },
  { bg: 'bg-amber-500', text: 'text-amber-700', label: 'Atencao' },
  { bg: 'bg-orange-500', text: 'text-orange-700', label: 'Pendente' },
  { bg: 'bg-red-500', text: 'text-red-700', label: 'Critico' },
]

function getCompletionColor(pct: number) {
  if (pct >= 90) return RANK_COLORS[0]
  if (pct >= 70) return RANK_COLORS[1]
  if (pct >= 50) return RANK_COLORS[2]
  if (pct >= 30) return RANK_COLORS[3]
  if (pct > 0) return RANK_COLORS[4]
  return RANK_COLORS[5]
}

function getMedal(index: number) {
  if (index === 0) return '🥇'
  if (index === 1) return '🥈'
  if (index === 2) return '🥉'
  return ''
}

export function HolderTable({ data }: { data: HolderSpend[] }) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Ranking de Conciliacao por Titular</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Sem dados para exibir.</p>
        </CardContent>
      </Card>
    )
  }

  // Sort by reconciliation percentage (highest first)
  const sorted = [...data]
    .map((h) => {
      const reconciledCount = h.count - h.pending_count
      const pct = h.count > 0 ? Math.round((reconciledCount / h.count) * 100) : 0
      return { ...h, reconciledCount, pct }
    })
    .sort((a, b) => b.pct - a.pct || a.pending_count - b.pending_count)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ranking de Conciliacao por Titular</CardTitle>
        <p className="text-sm text-muted-foreground">
          Quem esta em dia? Quem precisa de um empurraozinho?
        </p>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12"></TableHead>
              <TableHead>Titular</TableHead>
              <TableHead className="text-right">Total Gasto</TableHead>
              <TableHead className="text-right">Transacoes</TableHead>
              <TableHead className="w-64">Progresso</TableHead>
              <TableHead className="text-right">Pendentes</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((h, idx) => {
              const color = getCompletionColor(h.pct)
              const medal = getMedal(idx)

              return (
                <TableRow key={h.card_alias}>
                  <TableCell className="text-center text-lg">
                    {medal || <span className="text-sm text-muted-foreground">{idx + 1}</span>}
                  </TableCell>
                  <TableCell className="font-medium">{h.holder_name}</TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(h.total)}
                  </TableCell>
                  <TableCell className="text-right">{h.count}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="h-3 w-full rounded-full bg-muted">
                        <div
                          className={`h-3 rounded-full ${color.bg} transition-all duration-500`}
                          style={{ width: `${h.pct}%` }}
                        />
                      </div>
                      <span className={`whitespace-nowrap text-sm font-semibold ${color.text}`}>
                        {h.pct}%
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    {h.pending_count > 0 ? (
                      <span className="inline-flex h-7 min-w-[28px] items-center justify-center rounded-full bg-amber-100 px-2 text-sm font-semibold text-amber-800">
                        {h.pending_count}
                      </span>
                    ) : (
                      <span className="inline-flex h-7 min-w-[28px] items-center justify-center rounded-full bg-emerald-100 px-2 text-sm font-semibold text-emerald-800">
                        0
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/transactions?holder_name=${encodeURIComponent(h.holder_name)}`}
                      className="text-sm text-primary hover:underline"
                    >
                      Ver transacoes
                    </Link>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
