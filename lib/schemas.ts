import { z } from 'zod'

// ─── Enums ───────────────────────────────────────────────────────────────────

export const TransactionStatus = z.enum(['Autorizada', 'Recusada', 'Pendente'])
export type TransactionStatus = z.infer<typeof TransactionStatus>

export const ReconciliationStatus = z.enum(['Pendente', 'Conciliado', 'N/A', 'Recorrente'])
export type ReconciliationStatus = z.infer<typeof ReconciliationStatus>

export const UserRole = z.enum(['admin', 'holder'])
export type UserRole = z.infer<typeof UserRole>

export const NotifyFrequency = z.enum(['daily', 'weekly', 'on_demand'])
export type NotifyFrequency = z.infer<typeof NotifyFrequency>

// ─── Database Row Types ──────────────────────────────────────────────────────

export const ProfileSchema = z.object({
  id: z.string().uuid(),
  role: UserRole,
  holder_id: z.string().uuid().nullable(),
  created_at: z.string(),
})
export type Profile = z.infer<typeof ProfileSchema>

export const HolderSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  card_alias: z.string(),
  card_last4: z.string(),
  email: z.string().email(),
  notify_enabled: z.boolean(),
  notify_frequency: NotifyFrequency,
  user_id: z.string().uuid().nullable(),
  created_at: z.string(),
})
export type Holder = z.infer<typeof HolderSchema>

export const TransactionSchema = z.object({
  id: z.string().uuid(),
  transaction_date: z.string(),
  billing_period: z.string().nullable(),
  merchant_name: z.string(),
  amount_brl: z.number(),
  original_amount: z.number().nullable(),
  original_currency: z.string().nullable(),
  card_last4: z.string(),
  card_alias: z.string(),
  status: TransactionStatus,
  auth_code: z.string().nullable(),
  category: z.string().nullable(),
  holder_name: z.string(),
  upload_id: z.string().uuid(),
  created_at: z.string(),
})
export type Transaction = z.infer<typeof TransactionSchema>

export const UploadSchema = z.object({
  id: z.string().uuid(),
  created_at: z.string(),
  filename: z.string(),
  uploaded_by: z.string().uuid(),
  total_rows: z.number(),
  inserted_rows: z.number(),
  skipped_rows: z.number(),
})
export type Upload = z.infer<typeof UploadSchema>

export const ReconciliationSchema = z.object({
  id: z.string().uuid(),
  transaction_id: z.string().uuid(),
  status: ReconciliationStatus,
  note: z.string().nullable(),
  reconciled_by: z.string().uuid().nullable(),
  reconciled_at: z.string().nullable(),
  is_recurring: z.boolean(),
  recurrence_pattern_id: z.string().uuid().nullable(),
})
export type Reconciliation = z.infer<typeof ReconciliationSchema>

export const ReconciliationLogSchema = z.object({
  id: z.string().uuid(),
  transaction_id: z.string().uuid(),
  old_status: ReconciliationStatus,
  new_status: ReconciliationStatus,
  changed_by: z.string().uuid(),
  changed_at: z.string(),
  note: z.string().nullable(),
})
export type ReconciliationLog = z.infer<typeof ReconciliationLogSchema>

export const RecurrencePatternSchema = z.object({
  id: z.string().uuid(),
  merchant_pattern: z.string(),
  avg_amount: z.number(),
  tolerance_pct: z.number(),
  active: z.boolean(),
  created_by: z.string().uuid(),
  created_at: z.string(),
})
export type RecurrencePattern = z.infer<typeof RecurrencePatternSchema>

// ─── CSV Import Types ────────────────────────────────────────────────────────

export const CsvRowSchema = z.object({
  transaction_date: z.string(),
  billing_period: z.string().nullable(),
  merchant_name: z.string(),
  amount_brl: z.number(),
  original_amount: z.number().nullable(),
  original_currency: z.string().nullable(),
  card_last4: z.string(),
  card_alias: z.string(),
  status: TransactionStatus,
  auth_code: z.string().nullable(),
  category: z.string().nullable(),
  holder_name: z.string(),
})
export type CsvRow = z.infer<typeof CsvRowSchema>

// ─── API Response ────────────────────────────────────────────────────────────

export type ApiResponse<T> = {
  data: T | null
  error: { message: string; code?: string } | null
}

// ─── Transaction with Reconciliation (joined) ───────────────────────────────

export type TransactionWithReconciliation = Transaction & {
  reconciliation: Pick<Reconciliation, 'status' | 'note' | 'is_recurring'> | null
}

// ─── Reconciliation Action ───────────────────────────────────────────────────

export const ReconcileActionSchema = z.object({
  transactionId: z.string().uuid(),
  newStatus: ReconciliationStatus,
  note: z.string().optional(),
})
export type ReconcileAction = z.infer<typeof ReconcileActionSchema>

export const BulkReconcileActionSchema = z.object({
  transactionIds: z.array(z.string().uuid()).min(1),
  newStatus: ReconciliationStatus,
  note: z.string().optional(),
})
export type BulkReconcileAction = z.infer<typeof BulkReconcileActionSchema>

// ─── Holder Form ─────────────────────────────────────────────────────────────

export const HolderFormSchema = z.object({
  name: z.string().min(1, 'Nome e obrigatorio'),
  card_alias: z.string().min(1, 'Alias do cartao e obrigatorio'),
  card_last4: z.string().length(4, 'Ultimos 4 digitos do cartao'),
  email: z.string().email('E-mail invalido'),
  notify_enabled: z.boolean(),
  notify_frequency: NotifyFrequency,
})
export type HolderForm = z.infer<typeof HolderFormSchema>

// ─── State Machine: valid reconciliation transitions ─────────────────────────

export const VALID_TRANSITIONS: Record<ReconciliationStatus, ReconciliationStatus[]> = {
  'Pendente': ['Conciliado', 'Recorrente'],
  'Conciliado': ['Pendente'],
  'Recorrente': ['Conciliado'],
  'N/A': [],
}

export function isValidTransition(
  from: ReconciliationStatus,
  to: ReconciliationStatus
): boolean {
  return VALID_TRANSITIONS[from].includes(to)
}

export function requiresNote(
  from: ReconciliationStatus,
  to: ReconciliationStatus
): boolean {
  return from === 'Conciliado' && to === 'Pendente'
}
