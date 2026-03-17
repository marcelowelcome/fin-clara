import type { SupabaseClient } from '@supabase/supabase-js'

export type KPIs = {
  totalSpend: number
  transactionCount: number
  pendingCount: number
  reconciledCount: number
  declinedCount: number
}

export type CategorySpend = {
  category: string
  total: number
}

export type HolderSpend = {
  holder_name: string
  card_alias: string
  total: number
  count: number
  pending_count: number
}

export async function getKPIs(
  supabase: SupabaseClient,
  billingPeriod?: string
): Promise<KPIs> {
  // Use left join (no !inner) so transactions without reconciliation are included
  let query = supabase
    .from('transactions')
    .select('amount_brl, status, reconciliation:reconciliations(status)')
    .eq('status', 'Autorizada')

  if (billingPeriod) {
    query = query.eq('billing_period', billingPeriod)
  }

  const { data } = await query

  if (!data) return { totalSpend: 0, transactionCount: 0, pendingCount: 0, reconciledCount: 0, declinedCount: 0 }

  let totalSpend = 0
  let transactionCount = 0
  let pendingCount = 0
  let reconciledCount = 0

  for (const t of data) {
    totalSpend += Number(t.amount_brl)
    transactionCount++

    const recon = t.reconciliation as unknown as { status: string }[] | { status: string } | null
    const reconStatus = Array.isArray(recon) ? recon[0]?.status : recon?.status
    if (reconStatus === 'Pendente' || reconStatus === undefined || reconStatus === null) pendingCount++
    if (reconStatus === 'Conciliado' || reconStatus === 'Recorrente') reconciledCount++
  }

  return { totalSpend, transactionCount, pendingCount, reconciledCount, declinedCount: 0 }
}

export async function getSpendByCategory(
  supabase: SupabaseClient,
  billingPeriod?: string
): Promise<CategorySpend[]> {
  let query = supabase
    .from('transactions')
    .select('category, amount_brl')
    .eq('status', 'Autorizada')

  if (billingPeriod) {
    query = query.eq('billing_period', billingPeriod)
  }

  const { data } = await query

  if (!data) return []

  const map = new Map<string, number>()
  for (const t of data) {
    const cat = t.category || 'Sem categoria'
    map.set(cat, (map.get(cat) || 0) + Number(t.amount_brl))
  }

  return Array.from(map.entries())
    .map(([category, total]) => ({ category, total }))
    .sort((a, b) => b.total - a.total)
}

export async function getSpendByHolder(
  supabase: SupabaseClient,
  billingPeriod?: string
): Promise<HolderSpend[]> {
  let query = supabase
    .from('transactions')
    .select('holder_name, card_alias, amount_brl, status, reconciliation:reconciliations(status)')

  if (billingPeriod) {
    query = query.eq('billing_period', billingPeriod)
  }

  const { data } = await query

  if (!data) return []

  const map = new Map<string, HolderSpend>()
  for (const t of data) {
    if (t.status !== 'Autorizada') continue

    const key = t.card_alias
    const existing = map.get(key) || {
      holder_name: t.holder_name,
      card_alias: t.card_alias,
      total: 0,
      count: 0,
      pending_count: 0,
    }

    existing.total += Number(t.amount_brl)
    existing.count++

    const recon = t.reconciliation as unknown as { status: string }[] | { status: string } | null
    const reconStatus = Array.isArray(recon) ? recon[0]?.status : recon?.status
    if (reconStatus === 'Pendente' || reconStatus === undefined || reconStatus === null) {
      existing.pending_count++
    }

    map.set(key, existing)
  }

  return Array.from(map.values()).sort((a, b) => b.total - a.total)
}

export async function getBillingPeriods(supabase: SupabaseClient): Promise<string[]> {
  const { data } = await supabase
    .from('transactions')
    .select('billing_period')
    .order('billing_period', { ascending: false })

  if (!data) return []
  return Array.from(new Set(data.map((r: { billing_period: string }) => r.billing_period)))
}
