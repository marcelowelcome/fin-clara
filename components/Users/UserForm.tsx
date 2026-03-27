'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

type UserFormProps = {
  open: boolean
  onClose: () => void
  onSaved: () => void
}

export function UserForm({ open, onClose, onSaved }: UserFormProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('viewer')
  const [loading, setLoading] = useState(false)

  function reset() {
    setEmail('')
    setPassword('')
    setRole('viewer')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, role }),
      })
      const json = await res.json()

      if (json.error) {
        toast.error(json.error.message)
      } else {
        toast.success('Usuario criado com sucesso')
        reset()
        onSaved()
        onClose()
      }
    } catch {
      toast.error('Erro ao criar usuario')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { reset(); onClose() } }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo Usuario</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="user-email">E-mail</Label>
            <Input
              id="user-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="usuario@email.com"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="user-password">Senha</Label>
            <Input
              id="user-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimo 6 caracteres"
              minLength={6}
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Perfil</Label>
            <Select value={role} onValueChange={(v: string | null) => { if (v) setRole(v) }}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="viewer">Visualizador</SelectItem>
                <SelectItem value="holder">Titular</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => { reset(); onClose() }}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Criando...' : 'Criar usuario'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
