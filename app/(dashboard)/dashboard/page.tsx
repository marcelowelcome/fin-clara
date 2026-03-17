'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { KpiCards } from '@/components/Dashboard/KpiCards'
import { HolderTable } from '@/components/Dashboard/HolderTable'
import { InvoiceChart } from '@/components/Dashboard/InvoiceChart'
import { MonthlyChart } from '@/components/Dashboard/MonthlyChart'
import type { KPIs, HolderSpend, CategorySpend, MonthlySpend } from '@/lib/metrics'

export default function DashboardPage() {
  const [billingPeriods, setBillingPeriods] = useState<string[]>([])
  const [selectedPeriod, setSelectedPeriod] = useState<string>('')
  const [kpis, setKpis] = useState<KPIs | null>(null)
  const [holderData, setHolderData] = useState<HolderSpend[]>([])
  const [categoryData, setCategoryData] = useState<CategorySpend[]>([])
  const [monthlyData, setMonthlyData] = useState<MonthlySpend[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async (period: string) => {
    setLoading(true)
    const params = period ? `?billing_period=${encodeURIComponent(period)}` : ''

    try {
      const res = await fetch(`/api/dashboard${params}`)
      const json = await res.json()
      if (json.data) {
        setKpis(json.data.kpis)
        setHolderData(json.data.holderSpend)
        setCategoryData(json.data.categorySpend || [])
        setMonthlyData(json.data.monthlySpend || [])
        if (json.data.billingPeriods) {
          setBillingPeriods(json.data.billingPeriods)
        }
      }
    } catch (err) {
      console.error('Dashboard fetch error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData(selectedPeriod)
  }, [selectedPeriod, fetchData])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Como anda a conciliacao? Bora conferir!
          </p>
        </div>

        <div className="w-64">
          <Select
            value={selectedPeriod || 'all'}
            onValueChange={(v: string | null) => setSelectedPeriod(!v || v === 'all' ? '' : v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Todas as faturas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as faturas</SelectItem>
              {billingPeriods.map((p) => (
                <SelectItem key={p} value={p}>{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
          <Skeleton className="h-48" />
        </div>
      ) : (
        <>
          {kpis && <KpiCards kpis={kpis} />}

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <MonthlyChart data={monthlyData} />
            <InvoiceChart data={categoryData} />
          </div>

          <HolderTable data={holderData} />
        </>
      )}
    </div>
  )
}
