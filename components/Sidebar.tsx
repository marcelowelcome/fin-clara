'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import type { UserRole } from '@/lib/schemas'

type NavItem = {
  label: string
  shortLabel: string
  href: string
  adminOnly?: boolean
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', shortLabel: 'D', href: '/dashboard' },
  { label: 'Transacoes', shortLabel: 'T', href: '/transactions' },
  { label: 'Upload CSV', shortLabel: 'U', href: '/upload', adminOnly: true },
  { label: 'Titulares', shortLabel: 'Ti', href: '/holders', adminOnly: true },
  { label: 'Recorrencias', shortLabel: 'R', href: '/recurrence' },
  { label: 'Usuarios', shortLabel: 'Us', href: '/users', adminOnly: true },
]

export function Sidebar({ role, userEmail }: { role: UserRole; userEmail: string }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [collapsed, setCollapsed] = useState(false)

  const visibleItems = NAV_ITEMS.filter(
    (item) => !item.adminOnly || role === 'admin'
  )

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <aside
      className={cn(
        'flex flex-col border-r bg-sidebar text-sidebar-foreground transition-all duration-200',
        collapsed ? 'w-16' : 'w-60'
      )}
    >
      <div className="flex items-center justify-between border-b p-3">
        {!collapsed && (
          <div className="min-w-0">
            <h1 className="truncate text-sm font-semibold">Clara - Conciliacao</h1>
            <p className="truncate text-xs text-muted-foreground">Welcome Group</p>
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="shrink-0"
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? '»' : '«'}
        </Button>
      </div>

      <nav className="flex-1 space-y-1 p-2">
        {visibleItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            title={item.label}
            className={cn(
              'flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors',
              collapsed && 'justify-center px-0',
              pathname === item.href
                ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                : 'text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground'
            )}
          >
            {collapsed ? item.shortLabel : item.label}
          </Link>
        ))}
      </nav>

      <div className="border-t p-2">
        {!collapsed && (
          <p className="mb-2 truncate px-1 text-xs text-muted-foreground">{userEmail}</p>
        )}
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={handleLogout}
          title="Sair"
        >
          {collapsed ? 'X' : 'Sair'}
        </Button>
      </div>
    </aside>
  )
}
