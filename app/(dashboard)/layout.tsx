import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { Sidebar } from '@/components/Sidebar'
import type { UserRole } from '@/lib/schemas'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createServerSupabaseClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const role: UserRole = profile?.role ?? 'holder'

  return (
    <div className="flex min-h-screen">
      <Sidebar role={role} userEmail={user.email ?? ''} />
      <main className="flex-1 overflow-auto p-6">
        {children}
      </main>
    </div>
  )
}
