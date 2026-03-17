import { Suspense } from 'react'
import { TransactionFilters } from '@/components/Transactions/TransactionFilters'
import { TransactionTable } from '@/components/Transactions/TransactionTable'
import { Skeleton } from '@/components/ui/skeleton'

export default function TransactionsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Transacoes</h1>
        <p className="text-muted-foreground">
          Listagem e conciliacao de transacoes do cartao Clara
        </p>
      </div>

      <Suspense fallback={<Skeleton className="h-10 w-full" />}>
        <TransactionFilters />
      </Suspense>

      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <TransactionTable />
      </Suspense>
    </div>
  )
}
