import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Adds `n` months to a YYYY-MM-DD string, clamping the day to the month end. */
export function addMonths(dateStr: string, n: number): string {
  const [year, month, day] = dateStr.split('-').map(Number)
  const d = new Date(year, month - 1 + n, 1)
  const maxDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
  d.setDate(Math.min(day, maxDay))
  return d.toISOString().split('T')[0]
}
