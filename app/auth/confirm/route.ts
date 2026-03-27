import { NextResponse, type NextRequest } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type') as 'recovery' | 'email' | 'signup' | undefined

  const redirectUrl = request.nextUrl.clone()

  if (!tokenHash || !type) {
    redirectUrl.pathname = '/login'
    redirectUrl.searchParams.set('error', 'link_invalido')
    return NextResponse.redirect(redirectUrl)
  }

  const supabase = await createServerSupabaseClient()

  const { error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type,
  })

  if (error) {
    redirectUrl.pathname = '/login'
    redirectUrl.searchParams.set('error', 'link_expirado')
    return NextResponse.redirect(redirectUrl)
  }

  // Token verified — session is now active
  if (type === 'recovery') {
    redirectUrl.pathname = '/reset-password'
  } else {
    redirectUrl.pathname = '/dashboard'
  }
  redirectUrl.search = ''
  return NextResponse.redirect(redirectUrl)
}
