import type { SupabaseClient } from '@supabase/supabase-js'

type Transaction = {
  id: string
  merchant_name: string
  amount_brl: number
  billing_period: string
  transaction_date: string
}

type DetectedPattern = {
  merchant_pattern: string
  avg_amount: number
  transaction_ids: string[]
}

export async function detectRecurrencePatterns(
  supabase: SupabaseClient,
  userId: string
): Promise<{ patternsCreated: number; transactionsMarked: number }> {
  // Fetch all authorized transactions
  const { data: transactions } = await supabase
    .from('transactions')
    .select('id, merchant_name, amount_brl, billing_period, transaction_date')
    .eq('status', 'Autorizada')
    .order('transaction_date', { ascending: true })

  if (!transactions || transactions.length === 0) {
    return { patternsCreated: 0, transactionsMarked: 0 }
  }

  // Group by normalized merchant name
  const groups = new Map<string, Transaction[]>()
  for (const t of transactions) {
    const key = normalizeMerchant(t.merchant_name)
    const group = groups.get(key) || []
    group.push(t)
    groups.set(key, group)
  }

  // Detect patterns: same merchant across multiple billing periods with similar amounts
  const patterns: DetectedPattern[] = []

  groups.forEach((group: Transaction[], merchantKey: string) => {
    if (group.length < 2) return

    // Get unique billing periods
    const periodSet = new Set<string>()
    group.forEach((t: Transaction) => periodSet.add(t.billing_period))
    if (periodSet.size < 2) return

    // Check amount consistency (±5% tolerance)
    const amounts = group.map((t: Transaction) => Number(t.amount_brl))
    const avg = amounts.reduce((a: number, b: number) => a + b, 0) / amounts.length

    const withinTolerance = amounts.every(
      (a: number) => Math.abs(a - avg) / avg <= 0.05
    )

    if (withinTolerance || isParcelamento(group)) {
      patterns.push({
        merchant_pattern: merchantKey,
        avg_amount: avg,
        transaction_ids: group.map((t: Transaction) => t.id),
      })
    }
  })

  // Fetch existing patterns to avoid duplicates (single query)
  const { data: existingPatterns } = await supabase
    .from('recurrence_patterns')
    .select('id, merchant_pattern')

  const existingMap = new Map(
    (existingPatterns || []).map((p) => [p.merchant_pattern, p.id])
  )

  // Separate new vs existing patterns
  const newPatterns = patterns.filter((p) => !existingMap.has(p.merchant_pattern))

  // Batch insert new patterns
  let patternsCreated = 0
  if (newPatterns.length > 0) {
    const { data: created } = await supabase
      .from('recurrence_patterns')
      .insert(
        newPatterns.map((p) => ({
          merchant_pattern: p.merchant_pattern,
          avg_amount: p.avg_amount,
          tolerance_pct: 5,
          created_by: userId,
        }))
      )
      .select('id, merchant_pattern')

    if (created) {
      patternsCreated = created.length
      for (const c of created) {
        existingMap.set(c.merchant_pattern, c.id)
      }
    }
  }

  // Collect all transaction IDs that need marking
  const allTxIds: string[] = []
  const txPatternMap = new Map<string, string>() // txId -> patternId
  const txPatternName = new Map<string, string>() // txId -> merchant_pattern

  for (const pattern of patterns) {
    const patternId = existingMap.get(pattern.merchant_pattern)
    if (!patternId) continue
    for (const txId of pattern.transaction_ids) {
      allTxIds.push(txId)
      txPatternMap.set(txId, patternId)
      txPatternName.set(txId, pattern.merchant_pattern)
    }
  }

  // Batch fetch all reconciliations for these transactions (single query)
  const { data: allRecons } = await supabase
    .from('reconciliations')
    .select('id, transaction_id, status')
    .in('transaction_id', allTxIds)
    .eq('status', 'Pendente')

  if (!allRecons || allRecons.length === 0) {
    return { patternsCreated, transactionsMarked: 0 }
  }

  // Batch update reconciliations
  const reconIds = allRecons.map((r) => r.id)
  const now = new Date().toISOString()

  await supabase
    .from('reconciliations')
    .update({
      status: 'Recorrente',
      is_recurring: true,
      reconciled_by: userId,
      reconciled_at: now,
    })
    .in('id', reconIds)

  // Batch insert logs
  const logs = allRecons.map((r) => ({
    transaction_id: r.transaction_id,
    old_status: 'Pendente',
    new_status: 'Recorrente',
    changed_by: userId,
    note: `Detectado automaticamente como recorrente: ${txPatternName.get(r.transaction_id) || ''}`,
  }))

  if (logs.length > 0) {
    await supabase.from('reconciliation_log').insert(logs)
  }

  // Batch update recurrence_pattern_id grouped by pattern
  const reconsByPattern = new Map<string, string[]>()
  for (const recon of allRecons) {
    const patternId = txPatternMap.get(recon.transaction_id)
    if (patternId) {
      const ids = reconsByPattern.get(patternId) || []
      ids.push(recon.id)
      reconsByPattern.set(patternId, ids)
    }
  }
  for (const [patternId, ids] of reconsByPattern) {
    await supabase
      .from('reconciliations')
      .update({ recurrence_pattern_id: patternId })
      .in('id', ids)
  }

  return { patternsCreated, transactionsMarked: allRecons.length }
}

function normalizeMerchant(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ')
}

function isParcelamento(transactions: Transaction[]): boolean {
  // Check if amounts are identical (parcelamento)
  const amounts = transactions.map((t) => Number(t.amount_brl))
  const first = amounts[0]
  return amounts.every((a) => a === first) && transactions.length >= 2
}
