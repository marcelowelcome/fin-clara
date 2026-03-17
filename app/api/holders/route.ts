import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { HolderFormSchema, type ApiResponse } from '@/lib/schemas'

// GET — list all holders
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
      .from('holders')
      .select('*')
      .order('name')

    if (error) {
      return NextResponse.json(
        { data: null, error: { message: error.message, code: 'QUERY_ERROR' } },
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
        { data: null, error: { message: 'Acesso restrito a administradores', code: 'FORBIDDEN' } },
        { status: 403 }
      )
    }

    const body = await request.json()
    const parsed = HolderFormSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { data: null, error: { message: parsed.error.issues[0]?.message || 'Dados invalidos', code: 'VALIDATION' } },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('holders')
      .insert(parsed.data)
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        { data: null, error: { message: error.message, code: 'DB_ERROR' } },
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

    const body = await request.json()
    const { id, ...fields } = body

    if (!id) {
      return NextResponse.json(
        { data: null, error: { message: 'ID obrigatorio', code: 'VALIDATION' } },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('holders')
      .update(fields)
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

    const { searchParams } = request.nextUrl
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { data: null, error: { message: 'ID obrigatorio', code: 'VALIDATION' } },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from('holders')
      .delete()
      .eq('id', id)

    if (error) {
      return NextResponse.json(
        { data: null, error: { message: error.message, code: 'DB_ERROR' } },
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
