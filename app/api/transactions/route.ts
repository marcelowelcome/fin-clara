import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/api-auth'
import type { ApiResponse } from '@/lib/schemas'

export const dynamic = 'force-dynamic'

type TransactionsResult = {
  transactions: Record<string, unknown>[]
  total: number
  page: number
  limit: number
}

export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse<TransactionsResult>>> {
  try {
    const [auth, error] = await authenticateRequest()
    if (error) return error
    const { supabase } = auth

    const searchParams = request.nextUrl.searchParams
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)))
    const billingPeriod = searchParams.get('billing_period')
    const cardAlias = searchParams.get('card_alias')
    const status = searchParams.get('status')
    const reconciliationStatus = searchParams.get('reconciliation_status')
    const category = searchParams.get('category')
    const search = searchParams.get('search')
    const sortBy = searchParams.get('sort_by') || 'transaction_date'
    const sortOrder = searchParams.get('sort_order') === 'asc'

    // Build query with join to reconciliations
    let query = supabase
      .from('transactions')
      .select(`
        *,
        reconciliation:reconciliations!inner(
          status,
          note,
          is_recurring,
          reconciled_by,
          reconciled_at
        )
      `, { count: 'exact' })

    // Apply filters
    if (billingPeriod) {
      query = query.eq('billing_period', billingPeriod)
    }
    if (cardAlias) {
      query = query.eq('card_alias', cardAlias)
    }
    if (status) {
      query = query.eq('status', status)
    }
    if (reconciliationStatus) {
      query = query.eq('reconciliation.status', reconciliationStatus)
    }
    if (category) {
      query = query.eq('category', category)
    }
    if (search) {
      // Escape SQL LIKE wildcards to prevent pattern injection
      const escaped = search.replace(/[%_\\]/g, '\\$&')
      query = query.ilike('merchant_name', `%${escaped}%`)
    }

    // Apply sorting and pagination
    const from = (page - 1) * limit
    const to = from + limit - 1

    query = query
      .order(sortBy, { ascending: sortOrder })
      .range(from, to)

    const { data: transactions, count, error: queryError } = await query

    if (queryError) {
      return NextResponse.json(
        { data: null, error: { message: queryError.message, code: 'QUERY_ERROR' } },
        { status: 500 }
      )
    }

    return NextResponse.json({
      data: {
        transactions: transactions ?? [],
        total: count ?? 0,
        page,
        limit,
      },
      error: null,
    })
  } catch (err) {
    console.error('Transactions error:', err)
    return NextResponse.json(
      { data: null, error: { message: 'Erro interno no servidor', code: 'INTERNAL_ERROR' } },
      { status: 500 }
    )
  }
}
