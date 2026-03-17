import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest, requireAdmin } from '@/lib/api-auth'
import { detectRecurrencePatterns } from '@/lib/recurrence'
import type { ApiResponse } from '@/lib/schemas'

export const dynamic = 'force-dynamic'

// POST — trigger recurrence detection
export async function POST(): Promise<NextResponse<ApiResponse<{ patternsCreated: number; transactionsMarked: number }>>> {
  try {
    const [auth, error] = await requireAdmin()
    if (error) return error
    const { supabase, userId } = auth

    const result = await detectRecurrencePatterns(supabase, userId)

    return NextResponse.json({ data: result, error: null })
  } catch (err) {
    console.error('Recurrence detection error:', err)
    return NextResponse.json(
      { data: null, error: { message: 'Erro interno', code: 'INTERNAL_ERROR' } },
      { status: 500 }
    )
  }
}

// GET — list patterns
export async function GET(): Promise<NextResponse<ApiResponse<unknown[]>>> {
  try {
    const [auth, error] = await authenticateRequest()
    if (error) return error
    const { supabase } = auth

    const { data, error: queryError } = await supabase
      .from('recurrence_patterns')
      .select('*')
      .order('merchant_pattern')

    if (queryError) {
      return NextResponse.json(
        { data: null, error: { message: queryError.message, code: 'QUERY_ERROR' } },
        { status: 500 }
      )
    }

    return NextResponse.json({ data: data ?? [], error: null })
  } catch (err) {
    console.error('Recurrence GET error:', err)
    return NextResponse.json(
      { data: null, error: { message: 'Erro interno', code: 'INTERNAL_ERROR' } },
      { status: 500 }
    )
  }
}

// PATCH — toggle pattern active/inactive
export async function PATCH(request: NextRequest): Promise<NextResponse<ApiResponse<unknown>>> {
  try {
    const [auth, error] = await requireAdmin()
    if (error) return error
    const { supabase } = auth

    const { id, active } = await request.json()

    const { data, error: dbError } = await supabase
      .from('recurrence_patterns')
      .update({ active })
      .eq('id', id)
      .select()
      .single()

    if (dbError) {
      return NextResponse.json(
        { data: null, error: { message: dbError.message, code: 'DB_ERROR' } },
        { status: 500 }
      )
    }

    return NextResponse.json({ data, error: null })
  } catch (err) {
    console.error('Recurrence PATCH error:', err)
    return NextResponse.json(
      { data: null, error: { message: 'Erro interno', code: 'INTERNAL_ERROR' } },
      { status: 500 }
    )
  }
}
