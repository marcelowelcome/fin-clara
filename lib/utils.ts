import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { format, parse } from "date-fns"
import { ptBR } from "date-fns/locale"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ─── Formatadores pt-BR ──────────────────────────────────────────────────────

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

export function formatCurrency(value: number): string {
  return currencyFormatter.format(value)
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00')
  return format(date, 'dd/MM/yyyy', { locale: ptBR })
}

export function formatDateTime(dateStr: string): string {
  const date = new Date(dateStr)
  return format(date, "dd/MM/yyyy 'as' HH:mm", { locale: ptBR })
}

export function parseCSVDate(dateStr: string): string {
  const trimmed = dateStr.trim()
  // Already ISO format (YYYY-MM-DD) — return as-is
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed
  }
  // DD/MM/YYYY format — convert to ISO
  if (trimmed.includes('/')) {
    const parsed = parse(trimmed, 'dd/MM/yyyy', new Date())
    return format(parsed, 'yyyy-MM-dd')
  }
  return trimmed
}

export function parseCSVAmount(value: string): number {
  const trimmed = value.trim()
  // If it uses comma as decimal separator (Brazilian format): "1.234,56"
  if (trimmed.includes(',')) {
    const cleaned = trimmed.replace(/\s/g, '').replace(/\./g, '').replace(',', '.')
    return parseFloat(cleaned)
  }
  // Already uses dot as decimal (Clara default): "2000.0"
  return parseFloat(trimmed)
}
