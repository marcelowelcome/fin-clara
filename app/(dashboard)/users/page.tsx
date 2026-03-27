'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { UserList } from '@/components/Users/UserList'
import { UserForm } from '@/components/Users/UserForm'
import { PermissionsMatrix } from '@/components/Users/PermissionsMatrix'
import { AdminGuard } from '@/components/AdminGuard'

export default function UsersPage() {
  const [formOpen, setFormOpen] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  return (
    <AdminGuard>
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Usuarios</h1>
          <p className="text-muted-foreground">
            Gerenciamento de acesso ao sistema
          </p>
        </div>
        <Button onClick={() => setFormOpen(true)}>Novo Usuario</Button>
      </div>

      <PermissionsMatrix />

      <UserList refreshKey={refreshKey} />

      <UserForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={() => setRefreshKey((k) => k + 1)}
      />
    </div>
    </AdminGuard>
  )
}
