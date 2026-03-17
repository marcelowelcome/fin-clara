import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getKPIs, getSpendByCategory, getSpendByHolder, getBillingPeriods } from '@/lib/metrics'
import type { ApiResponse } from '@/lib/schemas'

export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse<unknown>>> {
  try {
    const supabase = await createServerSupabaseClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { data: null, error: { message: 'Nao autenticado', code: 'UNAUTHORIZED' } },
        { status: 401 }
      )
    }

    const billingPeriod = request.nextUrl.searchParams.get('billing_period') || undefined

    const [kpis, categorySpend, holderSpend, billingPeriods] = await Promise.all([
      getKPIs(supabase, billingPeriod),
      getSpendByCategory(supabase, billingPeriod),
      getSpendByHolder(supabase, billingPeriod),
      getBillingPeriods(supabase),
    ])

    return NextResponse.json({
      data: { kpis, categorySpend, holderSpend, billingPeriods },
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
