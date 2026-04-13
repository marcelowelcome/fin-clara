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

  // No intra-file dedup: the Clara CSV can have legitimately identical rows
  // for installments (parcelas) that share auth_code, date, amount, and merchant_name.
  // Every row in a single CSV is a distinct transaction.

  // Only dedup against existing DB records (cross-upload dedup).
  // This prevents double-counting when the same CSV is uploaded again
  // without deleting the previous upload first.

  // Build a frequency map of existing DB records
  const { data: existing } = await supabase
    .from('transactions')
    .select('transaction_date, auth_code, amount_brl, merchant_name')

  if (!existing || existing.length === 0) {
    return { newRows: rows, duplicateCount: 0 }
  }

  // Count occurrences of each key in the DB
  const dbCounts = new Map<string, number>()
  for (const e of existing) {
    const key = `${e.transaction_date}|${e.auth_code ?? ''}|${e.amount_brl}|${e.merchant_name}`
    dbCounts.set(key, (dbCounts.get(key) || 0) + 1)
  }

  // Count occurrences of each key in the CSV and mark excess as duplicates
  const csvCounts = new Map<string, number>()
  const duplicateSet = new Set<number>()

  for (let i = 0; i < rows.length; i++) {
    const key = `${rows[i].transaction_date}|${rows[i].auth_code ?? ''}|${rows[i].amount_brl}|${rows[i].merchant_name}`
    const csvCount = (csvCounts.get(key) || 0) + 1
    csvCounts.set(key, csvCount)

    const dbCount = dbCounts.get(key) || 0
    // If this occurrence already exists in the DB, it's a duplicate
    if (csvCount <= dbCount) {
      duplicateSet.add(i)
    }
  }

  const newRows = rows.filter((_, i) => !duplicateSet.has(i))

  return {
    newRows,
    duplicateCount: duplicateSet.size,
  }
}
