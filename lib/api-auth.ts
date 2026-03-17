import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { ApiResponse } from '@/lib/schemas'

type AuthResult = {
  supabase: SupabaseClient
  userId: string
  role: 'admin' | 'holder'
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AuthError = NextResponse<ApiResponse<any>>

/**
 * Authenticate the current request and return supabase client + user info.
 * Returns [authResult, null] on success, [null, errorResponse] on failure.
 */
export async function authenticateRequest(): Promise<[AuthResult, null] | [null, AuthError]> {
  const supabase = await createServerSupabaseClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return [null, NextResponse.json(
      { data: null, error: { message: 'Nao autenticado', code: 'UNAUTHORIZED' } },
      { status: 401 }
    )]
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  return [{
    supabase,
    userId: user.id,
    role: (profile?.role as 'admin' | 'holder') || 'holder',
  }, null]
}

/**
 * Authenticate and require admin role.
 */
export async function requireAdmin(): Promise<[AuthResult, null] | [null, AuthError]> {
  const [auth, error] = await authenticateRequest()
  if (error) return [null, error]

  if (auth.role !== 'admin') {
    return [null, NextResponse.json(
      { data: null, error: { message: 'Acesso restrito a administradores', code: 'FORBIDDEN' } },
      { status: 403 }
    )]
  }

  return [auth, null]
}
