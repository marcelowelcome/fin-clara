'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'
import type { KPIs } from '@/lib/metrics'

export function KpiCards({ kpis }: { kpis: KPIs }) {
  const reconciledPct = kpis.transactionCount > 0
    ? Math.round((kpis.reconciledCount / kpis.transactionCount) * 100)
    : 0
  const pendingPct = kpis.transactionCount > 0
    ? Math.round((kpis.pendingCount / kpis.transactionCount) * 100)
    : 0

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Card className="border-l-4 border-l-violet-500">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Total Gasto
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">{formatCurrency(kpis.totalSpend)}</p>
          <p className="text-xs text-muted-foreground">
            em {kpis.transactionCount} transacoes
          </p>
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-blue-500">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Transacoes Autorizadas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">{kpis.transactionCount}</p>
          <p className="text-xs text-muted-foreground">no periodo selecionado</p>
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-emerald-500">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Conciliadas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold text-emerald-600">{kpis.reconciledCount}</p>
          <div className="mt-1">
            <div className="h-2 w-full rounded-full bg-muted">
              <div
                className="h-2 rounded-full bg-emerald-500 transition-all"
                style={{ width: `${reconciledPct}%` }}
              />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{reconciledPct}% do total</p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-amber-500">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Pendentes de Conciliacao
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold text-amber-600">{kpis.pendingCount}</p>
          <div className="mt-1">
            <div className="h-2 w-full rounded-full bg-muted">
              <div
                className="h-2 rounded-full bg-amber-500 transition-all"
                style={{ width: `${pendingPct}%` }}
              />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{pendingPct}% do total</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
