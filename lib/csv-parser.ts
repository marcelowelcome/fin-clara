import Papa from 'papaparse'
import { CsvRowSchema, type CsvRow, type TransactionStatus } from '@/lib/schemas'
import { parseCSVDate, parseCSVAmount } from '@/lib/utils'

// Column mapping: Clara CSV header → internal field name
const COLUMN_MAP: Record<string, keyof CsvRow> = {
  'Data da Transação': 'transaction_date',
  'Data da Transacao': 'transaction_date',
  'Extrato da conta': 'billing_period',
  'Transação': 'merchant_name',
  'Transacao': 'merchant_name',
  'Valor em R$': 'amount_brl',
  'Moeda original': 'original_currency',
  'Valor original': 'original_amount',
  'Cartão': 'card_last4',
  'Cartao': 'card_last4',
  'Alias Do Cartão': 'card_alias',
  'Alias Do Cartao': 'card_alias',
  'Status': 'status',
  'Código de autorização': 'auth_code',
  'Codigo de autorizacao': 'auth_code',
  'Categoria da Compra': 'category',
  'Titular': 'holder_name',
}

type RawCsvRow = Record<string, string>

function mapRow(raw: RawCsvRow): CsvRow | null {
  const mapped: Record<string, unknown> = {}

  for (const [csvHeader, internalKey] of Object.entries(COLUMN_MAP)) {
    const value = raw[csvHeader]
    if (value === undefined) continue

    switch (internalKey) {
      case 'transaction_date':
        mapped[internalKey] = parseCSVDate(value)
        break
      case 'amount_brl':
        mapped[internalKey] = parseCSVAmount(value)
        break
      case 'original_amount':
        mapped[internalKey] = value.trim() ? parseCSVAmount(value) : null
        break
      case 'original_currency':
        mapped[internalKey] = value.trim() || null
        break
      case 'billing_period':
        mapped[internalKey] = value.trim() || null
        break
      case 'auth_code':
        mapped[internalKey] = value.trim() || null
        break
      case 'category':
        mapped[internalKey] = value.trim() || null
        break
      case 'status':
        mapped[internalKey] = normalizeStatus(value.trim())
        break
      default:
        mapped[internalKey] = value.trim()
    }
  }

  // Validate with Zod
  const result = CsvRowSchema.safeParse(mapped)
  if (!result.success) {
    console.warn('Row validation failed:', result.error.flatten(), mapped)
    return null
  }

  return result.data
}

function normalizeStatus(raw: string): TransactionStatus {
  const lower = raw.toLowerCase()
  if (lower.includes('autorizada') || lower.includes('authorized')) return 'Autorizada'
  if (lower.includes('recusada') || lower.includes('declined')) return 'Recusada'
  return 'Pendente'
}

export type ParseResult = {
  rows: CsvRow[]
  errors: string[]
  totalLines: number
}

export function parseCSV(buffer: ArrayBuffer): ParseResult {
  // Decode ISO-8859-1 to UTF-8 string
  const text = new TextDecoder('iso-8859-1').decode(buffer)

  const { data, errors } = Papa.parse<RawCsvRow>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim(),
  })

  const parseErrors: string[] = errors.map(
    (e) => `Linha ${e.row}: ${e.message}`
  )

  const rows: CsvRow[] = []
  for (let i = 0; i < data.length; i++) {
    const mapped = mapRow(data[i])
    if (mapped) {
      rows.push(mapped)
    } else {
      parseErrors.push(`Linha ${i + 2}: falha na validacao dos campos`)
    }
  }

  return {
    rows,
    errors: parseErrors,
    totalLines: data.length,
  }
}
