import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api-auth'
import {
  ReconcileActionSchema,
  BulkReconcileActionSchema,
  isValidTransition,
  requiresNote,
  type ApiResponse,
  type ReconciliationStatus,
} from '@/lib/schemas'

export const dynamic = 'force-dynamic'

// PATCH — single transaction reconciliation
export async function PATCH(request: NextRequest): Promise<NextResponse<ApiResponse<{ success: boolean }>>> {
  try {
    const [auth, error] = await requireAdmin()
    if (error) return error
    const { supabase, userId } = auth

    const body = await request.json()
    const parsed = ReconcileActionSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { data: null, error: { message: 'Dados invalidos: ' + parsed.error.message, code: 'VALIDATION' } },
        { status: 400 }
      )
    }

    const { transactionId, newStatus, note } = parsed.data

    // Get current reconciliation status
    const { data: current } = await supabase
      .from('reconciliations')
      .select('id, status')
      .eq('transaction_id', transactionId)
      .single()

    if (!current) {
      return NextResponse.json(
        { data: null, error: { message: 'Reconciliacao nao encontrada', code: 'NOT_FOUND' } },
        { status: 404 }
      )
    }

    const oldStatus = current.status as ReconciliationStatus

    if (!isValidTransition(oldStatus, newStatus)) {
      return NextResponse.json(
        { data: null, error: { message: `Transicao de "${oldStatus}" para "${newStatus}" nao permitida`, code: 'INVALID_TRANSITION' } },
        { status: 400 }
      )
    }

    if (requiresNote(oldStatus, newStatus) && !note) {
      return NextResponse.json(
        { data: null, error: { message: 'Justificativa obrigatoria para reverter conciliacao', code: 'NOTE_REQUIRED' } },
        { status: 400 }
      )
    }

    // Update reconciliation
    const { error: updateError } = await supabase
      .from('reconciliations')
      .update({
        status: newStatus,
        note: note || null,
        reconciled_by: userId,
        reconciled_at: new Date().toISOString(),
        is_recurring: newStatus === 'Recorrente',
      })
      .eq('id', current.id)

    if (updateError) {
      return NextResponse.json(
        { data: null, error: { message: updateError.message, code: 'DB_ERROR' } },
        { status: 500 }
      )
    }

    // Log the change
    const { error: logError } = await supabase
      .from('reconciliation_log')
      .insert({
        transaction_id: transactionId,
        old_status: oldStatus,
        new_status: newStatus,
        changed_by: userId,
        note: note || null,
      })

    if (logError) {
      console.error('Error logging reconciliation change:', logError)
    }

    return NextResponse.json({ data: { success: true }, error: null })
  } catch (err) {
    console.error('Reconcile error:', err)
    return NextResponse.json(
      { data: null, error: { message: 'Erro interno', code: 'INTERNAL_ERROR' } },
      { status: 500 }
    )
  }
}

// POST — bulk reconciliation
export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<{ updated: number }>>> {
  try {
    const [auth, error] = await requireAdmin()
    if (error) return error
    const { supabase, userId } = auth

    const body = await request.json()
    const parsed = BulkReconcileActionSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { data: null, error: { message: 'Dados invalidos', code: 'VALIDATION' } },
        { status: 400 }
      )
    }

    const { transactionIds, newStatus, note } = parsed.data

    // Get current statuses
    const { data: currentReconciliations } = await supabase
      .from('reconciliations')
      .select('id, transaction_id, status')
      .in('transaction_id', transactionIds)

    if (!currentReconciliations) {
      return NextResponse.json(
        { data: null, error: { message: 'Nenhuma reconciliacao encontrada', code: 'NOT_FOUND' } },
        { status: 404 }
      )
    }

    // Filter valid transitions
    const validRecs = currentReconciliations.filter((rec) => {
      const oldStatus = rec.status as ReconciliationStatus
      return isValidTransition(oldStatus, newStatus) &&
        (!requiresNote(oldStatus, newStatus) || !!note)
    })

    if (validRecs.length === 0) {
      return NextResponse.json({ data: { updated: 0 }, error: null })
    }

    const validIds = validRecs.map((r) => r.id)
    const now = new Date().toISOString()

    // Batch update all valid reconciliations in ONE query
    await supabase
      .from('reconciliations')
      .update({
        status: newStatus,
        note: note || null,
        reconciled_by: userId,
        reconciled_at: now,
        is_recurring: newStatus === 'Recorrente',
      })
      .in('id', validIds)

    const updated = validRecs.length
    const logs = validRecs.map((rec) => ({
      transaction_id: rec.transaction_id,
      old_status: rec.status,
      new_status: newStatus,
      changed_by: userId,
      note: note || null,
    }))

    // Batch insert logs
    if (logs.length > 0) {
      await supabase.from('reconciliation_log').insert(logs)
    }

    return NextResponse.json({ data: { updated }, error: null })
  } catch (err) {
    console.error('Bulk reconcile error:', err)
    return NextResponse.json(
      { data: null, error: { message: 'Erro interno', code: 'INTERNAL_ERROR' } },
      { status: 500 }
    )
  }
}
