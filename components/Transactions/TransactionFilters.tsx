'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'

type FilterOptions = {
  billingPeriods: string[]
  cardAliases: string[]
  categories: string[]
}

export function TransactionFilters() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [options, setOptions] = useState<FilterOptions>({
    billingPeriods: [],
    cardAliases: [],
    categories: [],
  })

  useEffect(() => {
    fetch('/api/transactions/filters')
      .then((res) => res.json())
      .then((json) => {
        if (json.data) setOptions(json.data)
      })
      .catch(console.error)
  }, [])

  const updateParam = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value && value !== 'all') {
        params.set(key, value)
      } else {
        params.delete(key)
      }
      params.set('page', '1')
      router.push(`?${params.toString()}`)
    },
    [router, searchParams]
  )

  const clearFilters = useCallback(() => {
    router.push('/transactions')
  }, [router])

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="w-48">
        <label className="mb-1 block text-xs text-muted-foreground">Fatura</label>
        <Select
          value={searchParams.get('billing_period') ?? 'all'}
          onValueChange={(v) => updateParam('billing_period', v)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Todas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {options.billingPeriods.map((p) => (
              <SelectItem key={p} value={p}>{p}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="w-48">
        <label className="mb-1 block text-xs text-muted-foreground">Titular</label>
        <Select
          value={searchParams.get('card_alias') ?? 'all'}
          onValueChange={(v) => updateParam('card_alias', v)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Todos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {options.cardAliases.map((a) => (
              <SelectItem key={a} value={a}>{a}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="w-40">
        <label className="mb-1 block text-xs text-muted-foreground">Status</label>
        <Select
          value={searchParams.get('status') ?? 'all'}
          onValueChange={(v) => updateParam('status', v)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Todos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="Autorizada">Autorizada</SelectItem>
            <SelectItem value="Recusada">Recusada</SelectItem>
            <SelectItem value="Pendente">Pendente</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="w-40">
        <label className="mb-1 block text-xs text-muted-foreground">Conciliacao</label>
        <Select
          value={searchParams.get('reconciliation_status') ?? 'all'}
          onValueChange={(v) => updateParam('reconciliation_status', v)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Todos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="Pendente">Pendente</SelectItem>
            <SelectItem value="Conciliado">Conciliado</SelectItem>
            <SelectItem value="N/A">N/A</SelectItem>
            <SelectItem value="Recorrente">Recorrente</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="w-40">
        <label className="mb-1 block text-xs text-muted-foreground">Categoria</label>
        <Select
          value={searchParams.get('category') ?? 'all'}
          onValueChange={(v) => updateParam('category', v)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Todas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {options.categories.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="w-52">
        <label className="mb-1 block text-xs text-muted-foreground">Buscar</label>
        <Input
          placeholder="Nome do estabelecimento"
          defaultValue={searchParams.get('search') ?? ''}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              updateParam('search', (e.target as HTMLInputElement).value)
            }
          }}
        />
      </div>

      <Button variant="ghost" size="sm" onClick={clearFilters}>
        Limpar filtros
      </Button>
    </div>
  )
}
