'use client'

import { useCallback, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

type UploadZoneProps = {
  onFileSelected: (file: File) => void
  disabled?: boolean
}

export function UploadZone({ onFileSelected, disabled }: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

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
        setSelectedFile(file)
        onFileSelected(file)
      }
    },
    [onFileSelected]
  )

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) {
        setSelectedFile(file)
        onFileSelected(file)
      }
    },
    [onFileSelected]
  )

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

        {selectedFile && (
          <p className="text-sm text-muted-foreground">
            Selecionado: <strong>{selectedFile.name}</strong>{' '}
            ({(selectedFile.size / 1024).toFixed(1)} KB)
          </p>
        )}
      </CardContent>
    </Card>
  )
}
