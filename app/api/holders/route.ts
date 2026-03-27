import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest, requireAdmin } from '@/lib/api-auth'
import { HolderFormSchema, type ApiResponse } from '@/lib/schemas'

export const dynamic = 'force-dynamic'

// GET — list all holders
export async function GET(): Promise<NextResponse<ApiResponse<unknown[]>>> {
  try {
    const [auth, error] = await authenticateRequest()
    if (error) return error
    const { supabase } = auth

    const { data, error: queryError } = await supabase
      .from('holders')
      .select('*')
      .order('name')

    if (queryError) {
      return NextResponse.json(
        { data: null, error: { message: queryError.message, code: 'QUERY_ERROR' } },
        { status: 500 }
      )
    }

    return NextResponse.json({ data: data ?? [], error: null })
  } catch (err) {
    console.error('Holders GET error:', err)
    return NextResponse.json(
      { data: null, error: { message: 'Erro interno', code: 'INTERNAL_ERROR' } },
      { status: 500 }
    )
  }
}

// POST — create holder
export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<unknown>>> {
  try {
    const [auth, error] = await requireAdmin()
    if (error) return error
    const { supabase } = auth

    const body = await request.json()
    const parsed = HolderFormSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { data: null, error: { message: parsed.error.issues[0]?.message || 'Dados invalidos', code: 'VALIDATION' } },
        { status: 400 }
      )
    }

    const { data, error: dbError } = await supabase
      .from('holders')
      .insert(parsed.data)
      .select()
      .single()

    if (dbError) {
      return NextResponse.json(
        { data: null, error: { message: dbError.message, code: 'DB_ERROR' } },
        { status: 500 }
      )
    }

    return NextResponse.json({ data, error: null }, { status: 201 })
  } catch (err) {
    console.error('Holders POST error:', err)
    return NextResponse.json(
      { data: null, error: { message: 'Erro interno', code: 'INTERNAL_ERROR' } },
      { status: 500 }
    )
  }
}

// PATCH — update holder
export async function PATCH(request: NextRequest): Promise<NextResponse<ApiResponse<unknown>>> {
  try {
    const [auth, error] = await requireAdmin()
    if (error) return error
    const { supabase } = auth

    const body = await request.json()
    const { id, ...rawFields } = body

    if (!id) {
      return NextResponse.json(
        { data: null, error: { message: 'ID obrigatorio', code: 'VALIDATION' } },
        { status: 400 }
      )
    }

    // Only allow known holder fields (prevent mass assignment)
    const allowedKeys = ['name', 'card_alias', 'card_last4', 'email', 'notify_enabled', 'notify_frequency', 'user_id'] as const
    const fields: Record<string, unknown> = {}
    for (const key of allowedKeys) {
      if (key in rawFields) fields[key] = rawFields[key]
    }

    if (Object.keys(fields).length === 0) {
      return NextResponse.json(
        { data: null, error: { message: 'Nenhum campo para atualizar', code: 'VALIDATION' } },
        { status: 400 }
      )
    }

    const { data, error: dbError } = await supabase
      .from('holders')
      .update(fields)
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
    console.error('Holders PATCH error:', err)
    return NextResponse.json(
      { data: null, error: { message: 'Erro interno', code: 'INTERNAL_ERROR' } },
      { status: 500 }
    )
  }
}

// DELETE — remove holder
export async function DELETE(request: NextRequest): Promise<NextResponse<ApiResponse<{ success: boolean }>>> {
  try {
    const [auth, error] = await requireAdmin()
    if (error) return error
    const { supabase } = auth

    const { searchParams } = request.nextUrl
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { data: null, error: { message: 'ID obrigatorio', code: 'VALIDATION' } },
        { status: 400 }
      )
    }

    const { error: dbError } = await supabase
      .from('holders')
      .delete()
      .eq('id', id)

    if (dbError) {
      return NextResponse.json(
        { data: null, error: { message: dbError.message, code: 'DB_ERROR' } },
        { status: 500 }
      )
    }

    return NextResponse.json({ data: { success: true }, error: null })
  } catch (err) {
    console.error('Holders DELETE error:', err)
    return NextResponse.json(
      { data: null, error: { message: 'Erro interno', code: 'INTERNAL_ERROR' } },
      { status: 500 }
    )
  }
}
