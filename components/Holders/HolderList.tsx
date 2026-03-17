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
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import type { Holder } from '@/lib/schemas'

type HolderListProps = {
  onEdit: (holder: Holder) => void
  onNotify?: (holderId: string, holderName: string) => void
  refreshKey: number
}

export function HolderList({ onEdit, onNotify, refreshKey }: HolderListProps) {
  const [holders, setHolders] = useState<Holder[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/holders')
      .then((res) => res.json())
      .then((json) => {
        if (json.data) setHolders(json.data)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [refreshKey])

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Remover o titular "${name}"?`)) return

    const res = await fetch(`/api/holders?id=${id}`, { method: 'DELETE' })
    const json = await res.json()
    if (json.error) {
      toast.error(json.error.message)
    } else {
      toast.success('Titular removido')
      setHolders((prev) => prev.filter((h) => h.id !== id))
    }
  }

  if (loading) {
    return <Skeleton className="h-48 w-full" />
  }

  if (holders.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Nenhum titular cadastrado.
      </p>
    )
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Alias do Cartao</TableHead>
            <TableHead>Ultimos 4</TableHead>
            <TableHead>E-mail</TableHead>
            <TableHead>Login vinculado</TableHead>
            <TableHead>Notificacao</TableHead>
            <TableHead>Frequencia</TableHead>
            <TableHead className="w-24"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {holders.map((h) => (
            <TableRow key={h.id}>
              <TableCell className="font-medium">{h.name}</TableCell>
              <TableCell>{h.card_alias}</TableCell>
              <TableCell>****{h.card_last4}</TableCell>
              <TableCell>{h.email}</TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {h.user_id ? 'Vinculado' : '—'}
              </TableCell>
              <TableCell>
                <Badge variant={h.notify_enabled ? 'default' : 'secondary'}>
                  {h.notify_enabled ? 'Ativa' : 'Desativada'}
                </Badge>
              </TableCell>
              <TableCell className="text-sm capitalize">
                {h.notify_frequency === 'on_demand' ? 'Sob demanda' : h.notify_frequency === 'daily' ? 'Diaria' : 'Semanal'}
              </TableCell>
              <TableCell>
                <div className="flex gap-1">
                  {h.notify_enabled && onNotify && (
                    <Button variant="ghost" size="sm" onClick={() => onNotify(h.id, h.name)}>
                      Notificar
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" onClick={() => onEdit(h)}>
                    Editar
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    onClick={() => handleDelete(h.id, h.name)}
                  >
                    Remover
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
