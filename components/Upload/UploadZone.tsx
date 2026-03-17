'use client'

import { useCallback, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn, formatCurrency } from '@/lib/utils'
import Papa from 'papaparse'

type PreviewRow = {
  date: string
  merchant: string
  amount: string
  status: string
  holder: string
}

type UploadZoneProps = {
  onConfirm: (file: File) => void
  disabled?: boolean
}

function parsePreview(file: File): Promise<{ rows: PreviewRow[]; totalRows: number }> {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      const parsed = Papa.parse(text, { header: true, skipEmptyLines: true })
      const allRows = parsed.data as Record<string, string>[]
      const totalRows = allRows.length

      const rows: PreviewRow[] = allRows.slice(0, 10).map((r) => ({
        date: r['Data da Transação'] || r['Data da Transacao'] || '',
        merchant: r['Transação'] || r['Transacao'] || '',
        amount: r['Valor em R$'] || '',
        status: r['Status'] || '',
        holder: r['Titular'] || '',
      }))

      resolve({ rows, totalRows })
    }
    reader.readAsText(file, 'utf-8')
  })
}

export function UploadZone({ onConfirm, disabled }: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<{ rows: PreviewRow[]; totalRows: number } | null>(null)
  const [loadingPreview, setLoadingPreview] = useState(false)

  const handleFile = useCallback(async (file: File) => {
    setSelectedFile(file)
    setLoadingPreview(true)
    try {
      const data = await parsePreview(file)
      setPreview(data)
    } catch {
      setPreview(null)
    } finally {
      setLoadingPreview(false)
    }
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      const file = e.dataTransfer.files[0]
      if (file && file.name.endsWith('.csv')) {
        handleFile(file)
      }
    },
    [handleFile]
  )

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) handleFile(file)
    },
    [handleFile]
  )

  function handleCancel() {
    setSelectedFile(null)
    setPreview(null)
  }

  function handleConfirm() {
    if (selectedFile) {
      onConfirm(selectedFile)
      setSelectedFile(null)
      setPreview(null)
    }
  }

  // Show preview if file is selected
  if (preview && selectedFile) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Preview: {selectedFile.name}</span>
            <span className="text-sm font-normal text-muted-foreground">
              {preview.totalRows} linhas no arquivo ({(selectedFile.size / 1024).toFixed(1)} KB)
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="max-h-80 overflow-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Estabelecimento</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Titular</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {preview.rows.map((r, i) => (
                  <TableRow key={i}>
                    <TableCell className="whitespace-nowrap">{r.date}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{r.merchant}</TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      {r.amount ? formatCurrency(parseFloat(r.amount)) : '—'}
                    </TableCell>
                    <TableCell>{r.status}</TableCell>
                    <TableCell>{r.holder}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {preview.totalRows > 10 && (
            <p className="text-xs text-muted-foreground text-center">
              Exibindo 10 de {preview.totalRows} linhas
            </p>
          )}
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={handleCancel} disabled={disabled}>
              Cancelar
            </Button>
            <Button onClick={handleConfirm} disabled={disabled}>
              {disabled ? 'Processando...' : 'Confirmar upload'}
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card
      className={cn(
        'border-2 border-dashed transition-colors',
        isDragging && 'border-primary bg-primary/5',
        disabled && 'opacity-50 pointer-events-none'
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <CardContent className="flex flex-col items-center justify-center gap-4 py-12">
        <div className="text-center">
          <p className="text-lg font-medium">
            Arraste o arquivo CSV aqui
          </p>
          <p className="text-sm text-muted-foreground">
            ou clique para selecionar
          </p>
        </div>

        <label className="cursor-pointer">
          <span className="inline-flex h-8 items-center justify-center rounded-lg border border-border bg-background px-2.5 text-sm font-medium hover:bg-muted">
            Selecionar arquivo .csv
          </span>
          <input
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleFileInput}
            disabled={disabled}
          />
        </label>

        {loadingPreview && (
          <p className="text-sm text-muted-foreground">Carregando preview...</p>
        )}
      </CardContent>
    </Card>
  )
}
