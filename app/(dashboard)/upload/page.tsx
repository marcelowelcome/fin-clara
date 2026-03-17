'use client'

import { useState } from 'react'
import { UploadZone } from '@/components/Upload/UploadZone'
import { UploadSummary } from '@/components/Upload/UploadSummary'
import { UploadHistory } from '@/components/Upload/UploadHistory'
import { toast } from 'sonner'

type UploadResult = {
  uploadId: string
  inserted: number
  skipped: number
  errors: string[]
}

export default function UploadPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<UploadResult | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  async function handleConfirmUpload(file: File) {
    setLoading(true)
    setResult(null)

    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      const json = await res.json()

      if (json.error) {
        toast.error(json.error.message)
        return
      }

      setResult(json.data)
      setRefreshKey((k) => k + 1)
      toast.success(
        `Upload concluido: ${json.data.inserted} inseridas, ${json.data.skipped} ignoradas`
      )
    } catch {
      toast.error('Erro ao enviar o arquivo')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Upload CSV</h1>
        <p className="text-muted-foreground">
          Importe o extrato do cartao Clara (.csv)
        </p>
      </div>

      <UploadZone onConfirm={handleConfirmUpload} disabled={loading} />

      {loading && (
        <p className="text-sm text-muted-foreground">Processando arquivo...</p>
      )}

      {result && (
        <UploadSummary
          inserted={result.inserted}
          skipped={result.skipped}
          errors={result.errors}
        />
      )}

      <UploadHistory refreshKey={refreshKey} />
    </div>
  )
}
