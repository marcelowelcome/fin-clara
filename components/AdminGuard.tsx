'use client'

import { useRole } from '@/lib/role-context'
import { Card, CardContent } from '@/components/ui/card'

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const role = useRole()

  if (role !== 'admin') {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">
            Acesso restrito a administradores.
          </p>
        </CardContent>
      </Card>
    )
  }

  return <>{children}</>
}
