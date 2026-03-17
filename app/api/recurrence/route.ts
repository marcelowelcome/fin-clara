import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { detectRecurrencePatterns } from '@/lib/recurrence'
import type { ApiResponse } from '@/lib/schemas'

export const dynamic = 'force-dynamic'

// POST — trigger recurrence detection
export async function POST(): Promise<NextResponse<ApiResponse<{ patternsCreated: number; transactionsMarked: number }>>> {
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

    const result = await detectRecurrencePatterns(supabase, user.id)

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
    const supabase = await createServerSupabaseClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { data: null, error: { message: 'Nao autenticado', code: 'UNAUTHORIZED' } },
        { status: 401 }
      )
    }

    const { data, error } = await supabase
      .from('recurrence_patterns')
      .select('*')
      .order('merchant_pattern')

    if (error) {
      return NextResponse.json(
        { data: null, error: { message: error.message, code: 'QUERY_ERROR' } },
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

    const { id, active } = await request.json()

    const { data, error } = await supabase
      .from('recurrence_patterns')
      .update({ active })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        { data: null, error: { message: error.message, code: 'DB_ERROR' } },
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
