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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDateTime } from '@/lib/utils'
import { toast } from 'sonner'

type UserRecord = {
  id: string
  email: string
  role: string
  created_at: string
}

const CONFIRM_TEXT = 'EXCLUIR'

export function UserList({ refreshKey }: { refreshKey: number }) {
  const [users, setUsers] = useState<UserRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteTarget, setDeleteTarget] = useState<UserRecord | null>(null)
  const [confirmStep, setConfirmStep] = useState<1 | 2>(1)
  const [confirmInput, setConfirmInput] = useState('')
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    setLoading(true)
    fetch('/api/users')
      .then((res) => res.json())
      .then((json) => {
        if (json.data) setUsers(json.data)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [refreshKey])

  async function handleRoleChange(userId: string, newRole: string) {
    const res = await fetch('/api/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, role: newRole }),
    })
    const json = await res.json()
    if (json.error) {
      toast.error(json.error.message)
    } else {
      toast.success('Perfil atualizado')
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
      )
    }
  }

  function openDeleteDialog(user: UserRecord) {
    setDeleteTarget(user)
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
      const res = await fetch(`/api/users?id=${deleteTarget.id}`, { method: 'DELETE' })
      const json = await res.json()
      if (json.error) {
        toast.error(json.error.message)
      } else {
        toast.success('Usuario removido')
        setUsers((prev) => prev.filter((u) => u.id !== deleteTarget.id))
      }
    } catch {
      toast.error('Erro ao excluir usuario')
    } finally {
      setDeleting(false)
      closeDialog()
    }
  }

  if (loading) return <Skeleton className="h-48 w-full" />

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>E-mail</TableHead>
              <TableHead>Perfil</TableHead>
              <TableHead>Criado em</TableHead>
              <TableHead className="w-24"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((u) => (
              <TableRow key={u.id}>
                <TableCell className="font-medium">{u.email}</TableCell>
                <TableCell>
                  <Select
                    value={u.role}
                    onValueChange={(v: string | null) => {
                      if (v) handleRoleChange(u.id, v)
                    }}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">
                        <Badge variant="default">Admin</Badge>
                      </SelectItem>
                      <SelectItem value="holder">
                        <Badge variant="secondary">Titular</Badge>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {formatDateTime(u.created_at)}
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
      </div>

      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive">
              {confirmStep === 1 ? 'Excluir usuario?' : 'Confirmacao final'}
            </DialogTitle>
          </DialogHeader>

          {confirmStep === 1 && deleteTarget && (
            <>
              <div className="space-y-3">
                <p className="text-sm">
                  Voce esta prestes a excluir permanentemente o usuario:
                </p>
                <div className="rounded-md bg-destructive/10 p-3 text-sm space-y-1">
                  <p><strong>E-mail:</strong> {deleteTarget.email}</p>
                  <p><strong>Perfil:</strong> {deleteTarget.role}</p>
                  <p className="text-destructive font-medium">
                    O usuario perdera todo o acesso ao sistema.
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={closeDialog}>Cancelar</Button>
                <Button variant="destructive" onClick={() => setConfirmStep(2)}>
                  Sim, quero excluir
                </Button>
              </DialogFooter>
            </>
          )}

          {confirmStep === 2 && (
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
                <Button variant="outline" onClick={() => setConfirmStep(1)}>Voltar</Button>
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
