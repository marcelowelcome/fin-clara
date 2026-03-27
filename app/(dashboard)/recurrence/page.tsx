'use client'

import { useEffect, useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import { AdminGuard } from '@/components/AdminGuard'
import { formatCurrency } from '@/lib/utils'
import { toast } from 'sonner'

type Pattern = {
  id: string
  merchant_pattern: string
  avg_amount: number
  tolerance_pct: number
  active: boolean
  created_at: string
}

export default function RecurrencePage() {
  const [patterns, setPatterns] = useState<Pattern[]>([])
  const [loading, setLoading] = useState(true)
  const [detecting, setDetecting] = useState(false)

  useEffect(() => {
    fetchPatterns()
  }, [])

  async function fetchPatterns() {
    setLoading(true)
    try {
      const res = await fetch('/api/recurrence')
      const json = await res.json()
      if (json.data) setPatterns(json.data)
    } catch {
      console.error('Error fetching patterns')
    } finally {
      setLoading(false)
    }
  }

  async function handleDetect() {
    setDetecting(true)
    try {
      const res = await fetch('/api/recurrence', { method: 'POST' })
      const json = await res.json()
      if (json.error) {
        toast.error(json.error.message)
      } else if (json.data) {
        const { patternsCreated, transactionsMarked } = json.data
        if (patternsCreated === 0 && transactionsMarked === 0) {
          toast.info('Nenhum novo padrao detectado')
        } else {
          toast.success(
            `${patternsCreated} padrao(es) criado(s), ${transactionsMarked} transacao(es) marcada(s)`
          )
        }
        fetchPatterns()
      }
    } catch {
      toast.error('Erro ao detectar recorrencias')
    } finally {
      setDetecting(false)
    }
  }

  async function handleToggle(id: string, active: boolean) {
    try {
      const res = await fetch('/api/recurrence', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, active }),
      })
      const json = await res.json()
      if (json.error) {
        toast.error(json.error.message)
      } else {
        setPatterns((prev) =>
          prev.map((p) => (p.id === id ? { ...p, active } : p))
        )
        toast.success(active ? 'Padrao ativado' : 'Padrao desativado')
      }
    } catch {
      toast.error('Erro ao atualizar padrao')
    }
  }

  return (
    <AdminGuard>
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Recorrencias</h1>
          <p className="text-muted-foreground">
            Padroes de transacoes recorrentes e parcelamentos
          </p>
        </div>
        <Button onClick={handleDetect} disabled={detecting}>
          {detecting ? 'Detectando...' : 'Detectar recorrencias'}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Como funciona</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-1">
          <p>A deteccao analisa todas as transacoes autorizadas e identifica:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Recorrentes:</strong> mesmo estabelecimento com valores similares (tolerancia de 5%) em faturas diferentes</li>
            <li><strong>Parcelamentos:</strong> mesmo estabelecimento com valor identico repetido em multiplas faturas</li>
          </ul>
          <p>Transacoes pendentes que correspondem a um padrao ativo sao automaticamente marcadas como &quot;Recorrente&quot;.</p>
        </CardContent>
      </Card>

      {loading ? (
        <Skeleton className="h-48 w-full" />
      ) : patterns.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              Nenhum padrao de recorrencia detectado ainda. Clique em &quot;Detectar recorrencias&quot; para analisar.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Estabelecimento</TableHead>
                <TableHead className="text-right">Valor medio</TableHead>
                <TableHead className="text-right">Tolerancia</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-24">Ativo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {patterns.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.merchant_pattern}</TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(p.avg_amount)}
                  </TableCell>
                  <TableCell className="text-right">{p.tolerance_pct}%</TableCell>
                  <TableCell>
                    <Badge variant={p.active ? 'default' : 'secondary'}>
                      {p.active ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={p.active}
                      onCheckedChange={(checked) => handleToggle(p.id, checked)}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
    </AdminGuard>
  )
}
