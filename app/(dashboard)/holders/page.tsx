'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { HolderList } from '@/components/Holders/HolderList'
import { HolderForm } from '@/components/Holders/HolderForm'
import { toast } from 'sonner'
import type { Holder } from '@/lib/schemas'

export default function HoldersPage() {
  const [formOpen, setFormOpen] = useState(false)
  const [editingHolder, setEditingHolder] = useState<Holder | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [notifying, setNotifying] = useState(false)

  function handleEdit(holder: Holder) {
    setEditingHolder(holder)
    setFormOpen(true)
  }

  function handleNew() {
    setEditingHolder(null)
    setFormOpen(true)
  }

  function handleSaved() {
    setRefreshKey((k) => k + 1)
  }

  async function handleNotifyHolder(holderId: string, holderName: string) {
    try {
      const res = await fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ holderId }),
      })
      const json = await res.json()
      if (json.error) {
        toast.error(json.error.message)
      } else if (json.data) {
        const { sent, failed } = json.data
        if (sent === 0 && failed === 0) {
          toast.info(`${holderName} nao tem pendencias`)
        } else if (sent > 0) {
          toast.success(`Notificacao enviada para ${holderName}`)
        } else {
          toast.error(`Falha ao notificar ${holderName}`)
        }
      }
    } catch {
      toast.error('Erro ao enviar notificacao')
    }
  }

  async function handleNotifyAll() {
    setNotifying(true)
    try {
      const res = await fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const json = await res.json()
      if (json.error) {
        toast.error(json.error.message)
      } else if (json.data) {
        const { sent, failed } = json.data
        if (sent === 0 && failed === 0) {
          toast.info('Nenhum titular com pendencias para notificar')
        } else {
          toast.success(`${sent} notificacao(es) enviada(s)${failed > 0 ? `, ${failed} falha(s)` : ''}`)
        }
      }
    } catch {
      toast.error('Erro ao enviar notificacoes')
    } finally {
      setNotifying(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Titulares</h1>
          <p className="text-muted-foreground">
            Cadastro de titulares do cartao corporativo
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleNotifyAll} disabled={notifying}>
            {notifying ? 'Enviando...' : 'Notificar todos'}
          </Button>
          <Button onClick={handleNew}>Novo Titular</Button>
        </div>
      </div>

      <HolderList onEdit={handleEdit} onNotify={handleNotifyHolder} refreshKey={refreshKey} />

      <HolderForm
        holder={editingHolder}
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={handleSaved}
      />
    </div>
  )
}
