import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import type { ApiResponse } from '@/lib/schemas'

type FilterOptions = {
  billingPeriods: string[]
  cardAliases: string[]
  categories: string[]
}

export async function GET(): Promise<NextResponse<ApiResponse<FilterOptions>>> {
  try {
    const supabase = await createServerSupabaseClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { data: null, error: { message: 'Nao autenticado', code: 'UNAUTHORIZED' } },
        { status: 401 }
      )
    }

    // Fetch distinct values for filters
    const [periods, aliases, categories] = await Promise.all([
      supabase
        .from('transactions')
        .select('billing_period')
        .order('billing_period', { ascending: false }),
      supabase
        .from('transactions')
        .select('card_alias')
        .order('card_alias'),
      supabase
        .from('transactions')
        .select('category')
        .not('category', 'is', null)
        .order('category'),
    ])

    const unique = (arr: Record<string, string>[] | null, key: string): string[] => {
      if (!arr) return []
      return Array.from(new Set(arr.map((r) => r[key]).filter(Boolean)))
    }

    return NextResponse.json({
      data: {
        billingPeriods: unique(periods.data, 'billing_period'),
        cardAliases: unique(aliases.data, 'card_alias'),
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
