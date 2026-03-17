import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/api-auth'
import type { ApiResponse } from '@/lib/schemas'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse<unknown[]>>> {
  try {
    const [auth, error] = await authenticateRequest()
    if (error) return error
    const { supabase } = auth

    const transactionId = request.nextUrl.searchParams.get('transaction_id')
    if (!transactionId) {
      return NextResponse.json(
        { data: null, error: { message: 'transaction_id obrigatorio', code: 'VALIDATION' } },
        { status: 400 }
      )
    }

    const { data, error: queryError } = await supabase
      .from('reconciliation_log')
      .select('id, old_status, new_status, changed_by, changed_at, note')
      .eq('transaction_id', transactionId)
      .order('changed_at', { ascending: false })

    if (queryError) {
      return NextResponse.json(
        { data: null, error: { message: queryError.message, code: 'QUERY_ERROR' } },
        { status: 500 }
      )
    }

    return NextResponse.json({ data: data ?? [], error: null })
  } catch (err) {
    console.error('History error:', err)
    return NextResponse.json(
      { data: null, error: { message: 'Erro interno', code: 'INTERNAL_ERROR' } },
      { status: 500 }
    )
  }
}
