'use client'

import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import type { Holder, NotifyFrequency } from '@/lib/schemas'

type HolderFormProps = {
  holder: Holder | null
  open: boolean
  onClose: () => void
  onSaved: () => void
}

export function HolderForm({ holder, open, onClose, onSaved }: HolderFormProps) {
  const [name, setName] = useState('')
  const [cardAlias, setCardAlias] = useState('')
  const [cardLast4, setCardLast4] = useState('')
  const [email, setEmail] = useState('')
  const [notifyEnabled, setNotifyEnabled] = useState(true)
  const [notifyFrequency, setNotifyFrequency] = useState<NotifyFrequency>('weekly')
  const [loading, setLoading] = useState(false)

  const isEditing = !!holder

  useEffect(() => {
    if (holder) {
      setName(holder.name)
      setCardAlias(holder.card_alias)
      setCardLast4(holder.card_last4)
      setEmail(holder.email)
      setNotifyEnabled(holder.notify_enabled)
      setNotifyFrequency(holder.notify_frequency)
    } else {
      setName('')
      setCardAlias('')
      setCardLast4('')
      setEmail('')
      setNotifyEnabled(true)
      setNotifyFrequency('weekly')
    }
  }, [holder])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const body = {
      ...(isEditing ? { id: holder.id } : {}),
      name,
      card_alias: cardAlias,
      card_last4: cardLast4,
      email,
      notify_enabled: notifyEnabled,
      notify_frequency: notifyFrequency,
    }

    try {
      const res = await fetch('/api/holders', {
        method: isEditing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json()

      if (json.error) {
        toast.error(json.error.message)
      } else {
        toast.success(isEditing ? 'Titular atualizado' : 'Titular cadastrado')
        onSaved()
        onClose()
      }
    } catch {
      toast.error('Erro ao salvar titular')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Titular' : 'Novo Titular'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome completo</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="card_alias">Alias do Cartao</Label>
            <Input
              id="card_alias"
              value={cardAlias}
              onChange={(e) => setCardAlias(e.target.value)}
              placeholder="Ex: Marcelo Aveiro - Weddings"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="card_last4">Ultimos 4 digitos</Label>
            <Input
              id="card_last4"
              value={cardLast4}
              onChange={(e) => setCardLast4(e.target.value)}
              maxLength={4}
              placeholder="1234"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="notify">Notificacao ativa</Label>
            <Switch
              id="notify"
              checked={notifyEnabled}
              onCheckedChange={setNotifyEnabled}
            />
          </div>
          <div className="space-y-2">
            <Label>Frequencia</Label>
            <Select value={notifyFrequency} onValueChange={(v) => setNotifyFrequency(v as NotifyFrequency)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Diaria</SelectItem>
                <SelectItem value="weekly">Semanal</SelectItem>
                <SelectItem value="on_demand">Sob demanda</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
