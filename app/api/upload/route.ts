import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest, requireAdmin } from '@/lib/api-auth'
import { parseCSV } from '@/lib/csv-parser'
import { dedup } from '@/lib/dedup'
import type { ApiResponse } from '@/lib/schemas'

export const dynamic = 'force-dynamic'

type UploadResult = {
  uploadId: string
  inserted: number
  skipped: number
  errors: string[]
}

// GET — list all uploads
export async function GET(): Promise<NextResponse<ApiResponse<unknown[]>>> {
  try {
    const [auth, error] = await authenticateRequest()
    if (error) return error
    const { supabase } = auth

    const { data, error: queryError } = await supabase
      .from('uploads')
      .select('*')
      .order('created_at', { ascending: false })

    if (queryError) {
      return NextResponse.json(
        { data: null, error: { message: queryError.message, code: 'QUERY_ERROR' } },
        { status: 500 }
      )
    }

    return NextResponse.json({ data: data ?? [], error: null })
  } catch (err) {
    console.error('Uploads GET error:', err)
    return NextResponse.json(
      { data: null, error: { message: 'Erro interno', code: 'INTERNAL_ERROR' } },
      { status: 500 }
    )
  }
}

// DELETE — remove upload and all associated data (transactions, reconciliations, logs)
export async function DELETE(request: NextRequest): Promise<NextResponse<ApiResponse<{ deleted: number }>>> {
  try {
    const [auth, error] = await requireAdmin()
    if (error) return error
    const { supabase } = auth

    const uploadId = request.nextUrl.searchParams.get('id')
    if (!uploadId) {
      return NextResponse.json(
        { data: null, error: { message: 'ID do upload obrigatorio', code: 'VALIDATION' } },
        { status: 400 }
      )
    }

    // Get transaction IDs for this upload
    const { data: transactions } = await supabase
      .from('transactions')
      .select('id')
      .eq('upload_id', uploadId)

    const txIds = (transactions || []).map((t) => t.id)

    if (txIds.length > 0) {
      // Delete reconciliation logs
      await supabase
        .from('reconciliation_log')
        .delete()
        .in('transaction_id', txIds)

      // Delete reconciliations
      await supabase
        .from('reconciliations')
        .delete()
        .in('transaction_id', txIds)

      // Delete transactions
      await supabase
        .from('transactions')
        .delete()
        .eq('upload_id', uploadId)
    }

    // Delete the upload record
    const { error: dbError } = await supabase
      .from('uploads')
      .delete()
      .eq('id', uploadId)

    if (dbError) {
      return NextResponse.json(
        { data: null, error: { message: dbError.message, code: 'DB_ERROR' } },
        { status: 500 }
      )
    }

    return NextResponse.json({ data: { deleted: txIds.length }, error: null })
  } catch (err) {
    console.error('Upload DELETE error:', err)
    return NextResponse.json(
      { data: null, error: { message: 'Erro interno', code: 'INTERNAL_ERROR' } },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<UploadResult>>> {
  try {
    const [auth, error] = await requireAdmin()
    if (error) return error
    const { supabase, userId } = auth

    // Read the CSV file from FormData
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json(
        { data: null, error: { message: 'Nenhum arquivo enviado', code: 'NO_FILE' } },
        { status: 400 }
      )
    }

    const maxSize = parseInt(process.env.MAX_UPLOAD_SIZE_BYTES || '10485760', 10)
    if (file.size > maxSize) {
      return NextResponse.json(
        { data: null, error: { message: `Arquivo excede o limite de ${maxSize / 1024 / 1024}MB`, code: 'FILE_TOO_LARGE' } },
        { status: 400 }
      )
    }

    // Parse CSV
    const buffer = await file.arrayBuffer()
    const { rows, errors, totalLines } = parseCSV(buffer)

    if (rows.length === 0) {
      return NextResponse.json(
        { data: null, error: { message: 'Nenhuma transacao valida encontrada no CSV', code: 'EMPTY_CSV' } },
        { status: 400 }
      )
    }

    // Deduplicate against existing data
    const { newRows, duplicateCount } = await dedup(rows, supabase)

    // Create upload log entry first (we need the ID for transactions)
    const { data: upload, error: uploadError } = await supabase
      .from('uploads')
      .insert({
        filename: file.name,
        uploaded_by: userId,
        total_rows: totalLines,
        inserted_rows: newRows.length,
        skipped_rows: duplicateCount,
      })
      .select('id')
      .single()

    if (uploadError || !upload) {
      return NextResponse.json(
        { data: null, error: { message: 'Erro ao registrar upload: ' + uploadError?.message, code: 'DB_ERROR' } },
        { status: 500 }
      )
    }

    // Insert new transactions in batches
    if (newRows.length > 0) {
      const transactionsToInsert = newRows.map((row) => ({
        ...row,
        upload_id: upload.id,
      }))

      // Insert in batches of 100; if a batch fails (remaining duplicates),
      // fall back to one-by-one insert skipping errors
      let actualInserted = 0
      const BATCH_SIZE = 100
      for (let i = 0; i < transactionsToInsert.length; i += BATCH_SIZE) {
        const batch = transactionsToInsert.slice(i, i + BATCH_SIZE)
        const { error: batchError } = await supabase
          .from('transactions')
          .insert(batch)

        if (batchError) {
          // Batch failed — insert one by one, skipping duplicates
          for (const row of batch) {
            const { error: rowError } = await supabase
              .from('transactions')
              .insert(row)
            if (!rowError) actualInserted++
          }
        } else {
          actualInserted += batch.length
        }
      }

      // Update the upload log with the real inserted count
      if (actualInserted !== newRows.length) {
        await supabase
          .from('uploads')
          .update({
            inserted_rows: actualInserted,
            skipped_rows: totalLines - actualInserted,
          })
          .eq('id', upload.id)
      }

      // Create reconciliation entries for each new transaction
      const { data: insertedTransactions } = await supabase
        .from('transactions')
        .select('id, status')
        .eq('upload_id', upload.id)

      if (insertedTransactions) {
        const reconciliations = insertedTransactions.map((t) => ({
          transaction_id: t.id,
          status: t.status === 'Recusada' ? 'N/A' as const : 'Pendente' as const,
          is_recurring: false,
        }))

        const { error: reconcileError } = await supabase
          .from('reconciliations')
          .insert(reconciliations)

        if (reconcileError) {
          console.error('Error creating reconciliations:', reconcileError)
        }
      }
    }

    return NextResponse.json({
      data: {
        uploadId: upload.id,
        inserted: newRows.length,
        skipped: duplicateCount,
        errors,
      },
      error: null,
    })
  } catch (err) {
    console.error('Upload error:', err)
    return NextResponse.json(
      { data: null, error: { message: 'Erro interno no servidor', code: 'INTERNAL_ERROR' } },
      { status: 500 }
    )
  }
}
