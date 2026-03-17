import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase-server'
import type { ApiResponse } from '@/lib/schemas'

type UserRecord = {
  id: string
  email: string
  role: string
  created_at: string
}

// GET — list all users with their profiles
export async function GET(): Promise<NextResponse<ApiResponse<UserRecord[]>>> {
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

    // Use service role to list auth users
    const adminClient = await createServiceRoleClient()
    const { data: { users }, error } = await adminClient.auth.admin.listUsers()

    if (error) {
      return NextResponse.json(
        { data: null, error: { message: error.message, code: 'AUTH_ERROR' } },
        { status: 500 }
      )
    }

    // Get profiles for roles
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, role, created_at')

    const profileMap = new Map(
      (profiles || []).map((p) => [p.id, p])
    )

    const result: UserRecord[] = users.map((u) => {
      const p = profileMap.get(u.id)
      return {
        id: u.id,
        email: u.email ?? '',
        role: p?.role ?? 'holder',
        created_at: u.created_at,
      }
    })

    return NextResponse.json({ data: result, error: null })
  } catch (err) {
    console.error('Users GET error:', err)
    return NextResponse.json(
      { data: null, error: { message: 'Erro interno', code: 'INTERNAL_ERROR' } },
      { status: 500 }
    )
  }
}

// POST — create new user
export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<{ id: string }>>> {
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

    const { email, password, role } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { data: null, error: { message: 'E-mail e senha obrigatorios', code: 'VALIDATION' } },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { data: null, error: { message: 'Senha deve ter no minimo 6 caracteres', code: 'VALIDATION' } },
        { status: 400 }
      )
    }

    const adminClient = await createServiceRoleClient()

    // Create auth user
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

    if (createError) {
      return NextResponse.json(
        { data: null, error: { message: createError.message, code: 'AUTH_ERROR' } },
        { status: 500 }
      )
    }

    // Update profile role if admin
    if (role === 'admin' && newUser.user) {
      await adminClient
        .from('profiles')
        .update({ role: 'admin' })
        .eq('id', newUser.user.id)
    }

    return NextResponse.json(
      { data: { id: newUser.user.id }, error: null },
      { status: 201 }
    )
  } catch (err) {
    console.error('Users POST error:', err)
    return NextResponse.json(
      { data: null, error: { message: 'Erro interno', code: 'INTERNAL_ERROR' } },
      { status: 500 }
    )
  }
}

// PATCH — update user role
export async function PATCH(request: NextRequest): Promise<NextResponse<ApiResponse<{ success: boolean }>>> {
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

    const { userId, role } = await request.json()

    if (!userId || !role) {
      return NextResponse.json(
        { data: null, error: { message: 'Dados invalidos', code: 'VALIDATION' } },
        { status: 400 }
      )
    }

    // Prevent removing own admin
    if (userId === user.id && role !== 'admin') {
      return NextResponse.json(
        { data: null, error: { message: 'Voce nao pode remover seu proprio acesso admin', code: 'SELF_DEMOTE' } },
        { status: 400 }
      )
    }

    const adminClient = await createServiceRoleClient()
    const { error } = await adminClient
      .from('profiles')
      .update({ role })
      .eq('id', userId)

    if (error) {
      return NextResponse.json(
        { data: null, error: { message: error.message, code: 'DB_ERROR' } },
        { status: 500 }
      )
    }

    return NextResponse.json({ data: { success: true }, error: null })
  } catch (err) {
    console.error('Users PATCH error:', err)
    return NextResponse.json(
      { data: null, error: { message: 'Erro interno', code: 'INTERNAL_ERROR' } },
      { status: 500 }
    )
  }
}

// DELETE — remove user
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

    const userId = request.nextUrl.searchParams.get('id')
    if (!userId) {
      return NextResponse.json(
        { data: null, error: { message: 'ID obrigatorio', code: 'VALIDATION' } },
        { status: 400 }
      )
    }

    // Prevent self-deletion
    if (userId === user.id) {
      return NextResponse.json(
        { data: null, error: { message: 'Voce nao pode excluir sua propria conta', code: 'SELF_DELETE' } },
        { status: 400 }
      )
    }

    const adminClient = await createServiceRoleClient()

    // Delete auth user (profile is cascade deleted via FK)
    const { error } = await adminClient.auth.admin.deleteUser(userId)

    if (error) {
      return NextResponse.json(
        { data: null, error: { message: error.message, code: 'AUTH_ERROR' } },
        { status: 500 }
      )
    }

    return NextResponse.json({ data: { success: true }, error: null })
  } catch (err) {
    console.error('Users DELETE error:', err)
    return NextResponse.json(
      { data: null, error: { message: 'Erro interno', code: 'INTERNAL_ERROR' } },
      { status: 500 }
    )
  }
}
