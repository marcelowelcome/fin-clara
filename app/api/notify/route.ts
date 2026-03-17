import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getHolderPendencies, sendNotification } from '@/lib/notify'
import type { ApiResponse } from '@/lib/schemas'

export const dynamic = 'force-dynamic'

// POST — send notifications
export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<{ sent: number; failed: number }>>> {
  try {
    const supabase = await createServerSupabaseClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { data: null, error: { message: 'Nao autenticado', code: 'UNAUTHORIZED' } },
        { status: 401 }
      )
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return NextResponse.json(
        { data: null, error: { message: 'Acesso restrito', code: 'FORBIDDEN' } },
        { status: 403 }
      )
    }

    const body = await request.json().catch(() => ({}))
    const holderId = body.holderId as string | undefined

    const notifications = await getHolderPendencies(supabase, holderId)

    let sent = 0
    let failed = 0

    for (const notification of notifications) {
      const success = await sendNotification(notification)
      if (success) sent++
      else failed++
    }

    return NextResponse.json({
      data: { sent, failed },
      error: null,
    })
  } catch (err) {
    console.error('Notify error:', err)
    return NextResponse.json(
      { data: null, error: { message: 'Erro interno', code: 'INTERNAL_ERROR' } },
      { status: 500 }
    )
  }
}
