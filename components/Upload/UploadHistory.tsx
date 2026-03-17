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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDateTime } from '@/lib/utils'
import { toast } from 'sonner'

type UploadRecord = {
  id: string
  created_at: string
  filename: string
  total_rows: number
  inserted_rows: number
  skipped_rows: number
}

const CONFIRM_TEXT = 'EXCLUIR'

export function UploadHistory({ refreshKey }: { refreshKey: number }) {
  const [uploads, setUploads] = useState<UploadRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteTarget, setDeleteTarget] = useState<UploadRecord | null>(null)
  const [confirmStep, setConfirmStep] = useState<1 | 2>(1)
  const [confirmInput, setConfirmInput] = useState('')
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    fetch('/api/upload')
      .then((res) => res.json())
      .then((json) => {
        if (json.data) setUploads(json.data)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [refreshKey])

  function openDeleteDialog(upload: UploadRecord) {
    setDeleteTarget(upload)
    setConfirmStep(1)
    setConfirmInput('')
  }

  function closeDialog() {
    setDeleteTarget(null)
    setConfirmStep(1)
    setConfirmInput('')
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)

    try {
      const res = await fetch(`/api/upload?id=${deleteTarget.id}`, { method: 'DELETE' })
      const json = await res.json()

      if (json.error) {
        toast.error(json.error.message)
      } else {
        toast.success(
          `Upload removido: ${json.data.deleted} transacao(es) excluidas`
        )
        setUploads((prev) => prev.filter((u) => u.id !== deleteTarget.id))
      }
    } catch {
      toast.error('Erro ao excluir upload')
    } finally {
      setDeleting(false)
      closeDialog()
    }
  }

  if (loading) {
    return <Skeleton className="h-48 w-full" />
  }

  if (uploads.length === 0) {
    return null
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Historico de Uploads</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Arquivo</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Inseridas</TableHead>
                <TableHead className="text-right">Ignoradas</TableHead>
                <TableHead className="w-24"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {uploads.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="whitespace-nowrap">
                    {formatDateTime(u.created_at)}
                  </TableCell>
                  <TableCell className="max-w-[250px] truncate font-medium">
                    {u.filename}
                  </TableCell>
                  <TableCell className="text-right">
                    {u.total_rows}
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant="default">{u.inserted_rows}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant="secondary">{u.skipped_rows}</Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive"
                      onClick={() => openDeleteDialog(u)}
                    >
                      Excluir
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Double confirmation dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive">
              {confirmStep === 1 ? 'Excluir upload?' : 'Confirmacao final'}
            </DialogTitle>
          </DialogHeader>

          {confirmStep === 1 && deleteTarget && (
            <>
              <div className="space-y-3">
                <p className="text-sm">
                  Voce esta prestes a excluir o upload e <strong>todos os dados associados</strong>:
                </p>
                <div className="rounded-md bg-destructive/10 p-3 text-sm space-y-1">
                  <p><strong>Arquivo:</strong> {deleteTarget.filename}</p>
                  <p><strong>Data:</strong> {formatDateTime(deleteTarget.created_at)}</p>
                  <p><strong>Transacoes que serao excluidas:</strong> {deleteTarget.inserted_rows}</p>
                  <p className="text-destructive font-medium">
                    Todas as transacoes, conciliacoes e historico deste upload serao removidos permanentemente.
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={closeDialog}>
                  Cancelar
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => setConfirmStep(2)}
                >
                  Sim, quero excluir
                </Button>
              </DialogFooter>
            </>
          )}

          {confirmStep === 2 && deleteTarget && (
            <>
              <div className="space-y-3">
                <p className="text-sm">
                  Para confirmar, digite <strong>{CONFIRM_TEXT}</strong> no campo abaixo:
                </p>
                <Input
                  value={confirmInput}
                  onChange={(e) => setConfirmInput(e.target.value)}
                  placeholder={`Digite ${CONFIRM_TEXT} para confirmar`}
                  autoFocus
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setConfirmStep(1)}>
                  Voltar
                </Button>
                <Button
                  variant="destructive"
                  disabled={confirmInput !== CONFIRM_TEXT || deleting}
                  onClick={handleDelete}
                >
                  {deleting ? 'Excluindo...' : 'Excluir permanentemente'}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
