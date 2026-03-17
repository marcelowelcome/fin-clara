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

  // Fetch existing patterns to avoid duplicates
  const { data: existingPatterns } = await supabase
    .from('recurrence_patterns')
    .select('merchant_pattern')

  const existingSet = new Set(
    (existingPatterns || []).map((p) => p.merchant_pattern)
  )

  let patternsCreated = 0
  let transactionsMarked = 0

  for (const pattern of patterns) {
    // Create pattern if new
    let patternId: string | null = null

    if (!existingSet.has(pattern.merchant_pattern)) {
      const { data: created } = await supabase
        .from('recurrence_patterns')
        .insert({
          merchant_pattern: pattern.merchant_pattern,
          avg_amount: pattern.avg_amount,
          tolerance_pct: 5,
          created_by: userId,
        })
        .select('id')
        .single()

      if (created) {
        patternId = created.id
        patternsCreated++
      }
    } else {
      // Get existing pattern ID
      const { data: existing } = await supabase
        .from('recurrence_patterns')
        .select('id')
        .eq('merchant_pattern', pattern.merchant_pattern)
        .single()
      patternId = existing?.id || null
    }

    if (!patternId) continue

    // Mark pending reconciliations as Recorrente
    for (const txId of pattern.transaction_ids) {
      const { data: recon } = await supabase
        .from('reconciliations')
        .select('id, status')
        .eq('transaction_id', txId)
        .single()

      if (recon && recon.status === 'Pendente') {
        await supabase
          .from('reconciliations')
          .update({
            status: 'Recorrente',
            is_recurring: true,
            recurrence_pattern_id: patternId,
            reconciled_by: userId,
            reconciled_at: new Date().toISOString(),
          })
          .eq('id', recon.id)

        // Log the change
        await supabase
          .from('reconciliation_log')
          .insert({
            transaction_id: txId,
            old_status: 'Pendente',
            new_status: 'Recorrente',
            changed_by: userId,
            note: `Detectado automaticamente como recorrente: ${pattern.merchant_pattern}`,
          })

        transactionsMarked++
      }
    }
  }

  return { patternsCreated, transactionsMarked }
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
