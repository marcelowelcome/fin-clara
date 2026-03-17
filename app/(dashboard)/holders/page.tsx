'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { HolderList } from '@/components/Holders/HolderList'
import { HolderForm } from '@/components/Holders/HolderForm'
import type { Holder } from '@/lib/schemas'

export default function HoldersPage() {
  const [formOpen, setFormOpen] = useState(false)
  const [editingHolder, setEditingHolder] = useState<Holder | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Titulares</h1>
          <p className="text-muted-foreground">
            Cadastro de titulares do cartao corporativo
          </p>
        </div>
        <Button onClick={handleNew}>Novo Titular</Button>
      </div>

      <HolderList onEdit={handleEdit} refreshKey={refreshKey} />

      <HolderForm
        holder={editingHolder}
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={handleSaved}
      />
    </div>
  )
}
