import { Resend } from 'resend'
import type { SupabaseClient } from '@supabase/supabase-js'
import { formatCurrency, formatDate } from '@/lib/utils'

function getResendClient() {
  return new Resend(process.env.RESEND_API_KEY)
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

type PendingTransaction = {
  transaction_date: string
  merchant_name: string
  amount_brl: number
}

type HolderNotification = {
  holderId: string
  holderName: string
  email: string
  pendingCount: number
  transactions: PendingTransaction[]
}

export async function getHolderPendencies(
  supabase: SupabaseClient,
  holderId?: string
): Promise<HolderNotification[]> {
  // Fetch holders with notifications enabled
  let holdersQuery = supabase
    .from('holders')
    .select('id, name, card_alias, email')
    .eq('notify_enabled', true)

  if (holderId) {
    holdersQuery = holdersQuery.eq('id', holderId)
  }

  const { data: holders } = await holdersQuery

  if (!holders || holders.length === 0) return []

  // Fetch ALL pending transactions for all holders in ONE query
  const cardAliases = holders.map((h) => h.card_alias)
  const { data: allTransactions } = await supabase
    .from('transactions')
    .select(`
      transaction_date,
      merchant_name,
      amount_brl,
      card_alias,
      reconciliation:reconciliations!inner(status)
    `)
    .in('card_alias', cardAliases)
    .eq('reconciliation.status', 'Pendente')
    .order('transaction_date', { ascending: false })

  // Group by card_alias
  const txByAlias = new Map<string, PendingTransaction[]>()
  for (const t of allTransactions || []) {
    const alias = t.card_alias as string
    const list = txByAlias.get(alias) || []
    list.push({
      transaction_date: t.transaction_date,
      merchant_name: t.merchant_name,
      amount_brl: Number(t.amount_brl),
    })
    txByAlias.set(alias, list)
  }

  const notifications: HolderNotification[] = []
  for (const holder of holders) {
    const pending = txByAlias.get(holder.card_alias) || []
    if (pending.length > 0) {
      notifications.push({
        holderId: holder.id,
        holderName: holder.name,
        email: holder.email,
        pendingCount: pending.length,
        transactions: pending,
      })
    }
  }

  return notifications
}

export async function sendNotification(notification: HolderNotification): Promise<boolean> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const fromEmail = process.env.NOTIFY_FROM_EMAIL || 'noreply@welcomeweddings.com.br'
  const fromName = process.env.NOTIFY_FROM_NAME || 'Welcome Group'

  const totalPending = notification.transactions.reduce((sum, t) => sum + t.amount_brl, 0)

  const transactionRows = notification.transactions
    .slice(0, 20) // Limit to 20 in email
    .map(
      (t) =>
        `<tr>
          <td style="padding:8px;border-bottom:1px solid #eee">${formatDate(t.transaction_date)}</td>
          <td style="padding:8px;border-bottom:1px solid #eee">${escapeHtml(t.merchant_name)}</td>
          <td style="padding:8px;border-bottom:1px solid #eee;text-align:right">${formatCurrency(t.amount_brl)}</td>
        </tr>`
    )
    .join('')

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
      <h2>Ola, ${escapeHtml(notification.holderName)}!</h2>
      <p>Voce tem <strong>${notification.pendingCount} transacao(es)</strong> pendentes de conciliacao,
         totalizando <strong>${formatCurrency(totalPending)}</strong>.</p>

      <table style="width:100%;border-collapse:collapse;margin:16px 0">
        <thead>
          <tr style="background:#f5f5f5">
            <th style="padding:8px;text-align:left">Data</th>
            <th style="padding:8px;text-align:left">Estabelecimento</th>
            <th style="padding:8px;text-align:right">Valor</th>
          </tr>
        </thead>
        <tbody>
          ${transactionRows}
        </tbody>
      </table>

      ${notification.pendingCount > 20 ? `<p style="color:#666">...e mais ${notification.pendingCount - 20} transacao(es).</p>` : ''}

      <p>
        <a href="${appUrl}/transactions" style="display:inline-block;padding:10px 20px;background:#000;color:#fff;text-decoration:none;border-radius:4px">
          Acessar a plataforma
        </a>
      </p>

      <p style="color:#999;font-size:12px;margin-top:24px">
        Clara - Conciliacao — Welcome Group
      </p>
    </div>
  `

  try {
    const { error } = await getResendClient().emails.send({
      from: `${fromName} <${fromEmail}>`,
      to: notification.email,
      subject: `${notification.pendingCount} transacao(es) pendente(s) de conciliacao`,
      html,
    })

    if (error) {
      console.error('Resend error:', error)
      return false
    }
    return true
  } catch (err) {
    console.error('Email send error:', err)
    return false
  }
}
