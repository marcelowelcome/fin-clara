import type { SupabaseClient } from '@supabase/supabase-js'
import type { CsvRow } from '@/lib/schemas'

export type DedupResult = {
  newRows: CsvRow[]
  duplicateCount: number
}

export async function dedup(
  rows: CsvRow[],
  supabase: SupabaseClient
): Promise<DedupResult> {
  if (rows.length === 0) {
    return { newRows: [], duplicateCount: 0 }
  }

  const duplicateSet = new Set<number>()

  // Only deduplicate authorized transactions (those with auth_code).
  // Each auth_code is unique per transaction.
  // Recusadas/Pendentes have no auth_code — each row is a separate event, always insert.

  const authorizedIndexes: number[] = []
  for (let i = 0; i < rows.length; i++) {
    if (rows[i].auth_code) {
      authorizedIndexes.push(i)
    }
  }

  if (authorizedIndexes.length > 0) {
    // Step 1: Intra-file dedup (same auth_code within same CSV)
    const seenAuthCodes = new Set<string>()
    for (const i of authorizedIndexes) {
      const key = `${rows[i].transaction_date}|${rows[i].auth_code}|${rows[i].amount_brl}`
      if (seenAuthCodes.has(key)) {
        duplicateSet.add(i)
      } else {
        seenAuthCodes.add(key)
      }
    }

    // Step 2: Check against existing DB records
    const { data: existing } = await supabase
      .from('transactions')
      .select('transaction_date, auth_code, amount_brl')
      .not('auth_code', 'is', null)

    if (existing) {
      const existingKeys = new Set(
        existing.map((e) => `${e.transaction_date}|${e.auth_code}|${e.amount_brl}`)
      )

      for (const i of authorizedIndexes) {
        if (duplicateSet.has(i)) continue
        const key = `${rows[i].transaction_date}|${rows[i].auth_code}|${rows[i].amount_brl}`
        if (existingKeys.has(key)) {
          duplicateSet.add(i)
        }
      }
    }
  }

  const newRows = rows.filter((_, i) => !duplicateSet.has(i))

  return {
    newRows,
    duplicateCount: duplicateSet.size,
  }
}
