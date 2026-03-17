import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api-auth'
import { getHolderPendencies, sendNotification } from '@/lib/notify'
import type { ApiResponse } from '@/lib/schemas'

export const dynamic = 'force-dynamic'

// POST — send notifications
export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<{ sent: number; failed: number }>>> {
  try {
    const [auth, error] = await requireAdmin()
    if (error) return error
    const { supabase } = auth

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
