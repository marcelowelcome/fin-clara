'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'

type MonthlyData = {
  period: string
  total: number
}

export function MonthlyChart({ data }: { data: MonthlyData[] }) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Evolucao Mensal</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Sem dados para exibir.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Evolucao Mensal de Gastos</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} margin={{ left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="period"
              tick={{ fontSize: 11 }}
              interval={0}
              angle={-30}
              textAnchor="end"
              height={60}
            />
            <YAxis tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`} />
            <Tooltip formatter={(value) => [formatCurrency(Number(value)), 'Total']} />
            <Bar dataKey="total" fill="hsl(262, 80%, 50%)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
