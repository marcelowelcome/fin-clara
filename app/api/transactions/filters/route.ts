import { NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/api-auth'
import type { ApiResponse } from '@/lib/schemas'

export const dynamic = 'force-dynamic'

type FilterOptions = {
  billingPeriods: string[]
  holderNames: string[]
  categories: string[]
}

export async function GET(): Promise<NextResponse<ApiResponse<FilterOptions>>> {
  try {
    const [auth, error] = await authenticateRequest()
    if (error) return error
    const { supabase } = auth

    // Use separate lightweight queries — holders and billing_periods are low cardinality
    const [periods, holders, categories] = await Promise.all([
      supabase
        .from('transactions')
        .select('billing_period')
        .not('billing_period', 'eq', '')
        .order('billing_period', { ascending: false })
        .limit(500),
      supabase
        .from('transactions')
        .select('holder_name')
        .not('holder_name', 'is', null)
        .order('holder_name')
        .limit(500),
      supabase
        .from('transactions')
        .select('category')
        .not('category', 'is', null)
        .order('category')
        .limit(500),
    ])

    const unique = (arr: Record<string, string>[] | null, key: string): string[] => {
      if (!arr) return []
      return Array.from(new Set(arr.map((r) => r[key]).filter(Boolean)))
    }

    return NextResponse.json({
      data: {
        billingPeriods: unique(periods.data, 'billing_period'),
        holderNames: unique(holders.data, 'holder_name'),
        categories: unique(categories.data, 'category'),
      },
      error: null,
    })
  } catch (err) {
    console.error('Filters error:', err)
    return NextResponse.json(
      { data: null, error: { message: 'Erro interno', code: 'INTERNAL_ERROR' } },
      { status: 500 }
    )
  }
}
