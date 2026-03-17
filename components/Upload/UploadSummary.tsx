'use client'

import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

type UploadSummaryProps = {
  inserted: number
  skipped: number
  errors: string[]
}

export function UploadSummary({ inserted, skipped, errors }: UploadSummaryProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Resumo do Upload</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-4">
          <div className="flex items-center gap-2">
            <Badge variant="default">{inserted}</Badge>
            <span className="text-sm">transacoes inseridas</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{skipped}</Badge>
            <span className="text-sm">duplicatas ignoradas</span>
          </div>
        </div>

        {errors.length > 0 && (
          <div className="rounded-md bg-destructive/10 p-3">
            <p className="text-sm font-medium text-destructive">
              {errors.length} aviso(s) durante o processamento:
            </p>
            <ul className="mt-1 list-inside list-disc text-xs text-destructive/80">
              {errors.slice(0, 5).map((err, i) => (
                <li key={i}>{err}</li>
              ))}
              {errors.length > 5 && (
                <li>...e mais {errors.length - 5} aviso(s)</li>
              )}
            </ul>
          </div>
        )}

        <div className="flex gap-2">
          <Link
            href="/transactions"
            className="inline-flex h-7 items-center justify-center rounded-lg border border-border bg-background px-2.5 text-sm font-medium hover:bg-muted"
          >
            Ver transacoes
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
