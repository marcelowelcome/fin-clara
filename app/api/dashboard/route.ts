import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/api-auth'
import { getKPIs, getSpendByCategory, getSpendByHolder, getBillingPeriods, getMonthlySpend } from '@/lib/metrics'
import type { ApiResponse } from '@/lib/schemas'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse<unknown>>> {
  try {
    const [auth, error] = await authenticateRequest()
    if (error) return error
    const { supabase } = auth

    const billingPeriod = request.nextUrl.searchParams.get('billing_period') || undefined

    const [kpis, categorySpend, holderSpend, billingPeriods, monthlySpend] = await Promise.all([
      getKPIs(supabase, billingPeriod),
      getSpendByCategory(supabase, billingPeriod),
      getSpendByHolder(supabase, billingPeriod),
      getBillingPeriods(supabase),
      getMonthlySpend(supabase),
    ])

    return NextResponse.json({
      data: { kpis, categorySpend, holderSpend, billingPeriods, monthlySpend },
      error: null,
    })
  } catch (err) {
    console.error('Dashboard error:', err)
    return NextResponse.json(
      { data: null, error: { message: 'Erro interno', code: 'INTERNAL_ERROR' } },
      { status: 500 }
    )
  }
}
