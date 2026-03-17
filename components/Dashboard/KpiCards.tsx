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

  const items = [
    { title: 'Total Gasto', value: formatCurrency(kpis.totalSpend) },
    { title: 'Transacoes Autorizadas', value: kpis.transactionCount.toString() },
    {
      title: 'Conciliadas',
      value: `${kpis.reconciledCount}`,
      subtitle: `${reconciledPct}% do total`,
    },
    {
      title: 'Pendentes de Conciliacao',
      value: `${kpis.pendingCount}`,
      subtitle: `${pendingPct}% do total`,
    },
  ]

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item) => (
        <Card key={item.title}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {item.title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{item.value}</p>
            {'subtitle' in item && item.subtitle && (
              <p className="text-xs text-muted-foreground">{item.subtitle}</p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
