import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
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
    const supabase = await createServerSupabaseClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { data: null, error: { message: 'Nao autenticado', code: 'UNAUTHORIZED' } },
        { status: 401 }
      )
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return NextResponse.json(
        { data: null, error: { message: 'Acesso restrito a administradores', code: 'FORBIDDEN' } },
        { status: 403 }
      )
    }

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
        reconciled_by: user.id,
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
        changed_by: user.id,
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
    const supabase = await createServerSupabaseClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { data: null, error: { message: 'Nao autenticado', code: 'UNAUTHORIZED' } },
        { status: 401 }
      )
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return NextResponse.json(
        { data: null, error: { message: 'Acesso restrito a administradores', code: 'FORBIDDEN' } },
        { status: 403 }
      )
    }

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

    let updated = 0
    const logs: {
      transaction_id: string
      old_status: string
      new_status: string
      changed_by: string
      note: string | null
    }[] = []

    for (const rec of currentReconciliations) {
      const oldStatus = rec.status as ReconciliationStatus

      if (!isValidTransition(oldStatus, newStatus)) continue
      if (requiresNote(oldStatus, newStatus) && !note) continue

      const { error } = await supabase
        .from('reconciliations')
        .update({
          status: newStatus,
          note: note || null,
          reconciled_by: user.id,
          reconciled_at: new Date().toISOString(),
          is_recurring: newStatus === 'Recorrente',
        })
        .eq('id', rec.id)

      if (!error) {
        updated++
        logs.push({
          transaction_id: rec.transaction_id,
          old_status: oldStatus,
          new_status: newStatus,
          changed_by: user.id,
          note: note || null,
        })
      }
    }

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
