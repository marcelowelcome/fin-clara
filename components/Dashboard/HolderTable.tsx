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
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'
import type { HolderSpend } from '@/lib/metrics'

export function HolderTable({ data }: { data: HolderSpend[] }) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Gastos por Titular</CardTitle>
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
        <CardTitle>Gastos por Titular</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Titular</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">Transacoes</TableHead>
              <TableHead className="text-right">Pendentes</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((h) => (
              <TableRow key={h.card_alias}>
                <TableCell className="font-medium">{h.holder_name}</TableCell>
                <TableCell className="text-right">
                  {formatCurrency(h.total)}
                </TableCell>
                <TableCell className="text-right">{h.count}</TableCell>
                <TableCell className="text-right">
                  {h.pending_count > 0 ? (
                    <Badge variant="outline">{h.pending_count}</Badge>
                  ) : (
                    <Badge variant="secondary">0</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <Link
                    href={`/transactions?card_alias=${encodeURIComponent(h.card_alias)}`}
                    className="text-sm text-primary hover:underline"
                  >
                    Ver transacoes
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
