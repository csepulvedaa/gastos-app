'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { calculateBalance, formatCLP } from '@/lib/balance'
import type { Expense } from '@/types'

interface Settlement {
  id: string
  year: number
  month: number
  amount: number
  from_user: string
  to_user: string
  settled_at: string
}

interface Props {
  year: number
  month: number
  expenses: Expense[]
  cristobalId: string
  valentinaId: string
  settlement: Settlement | null
}

const MONTH_NAMES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']

export default function SettleButton({ year, month, expenses, cristobalId, valentinaId, settlement }: Props) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const balance = calculateBalance(expenses, cristobalId, valentinaId)
  const isSettled = !!settlement

  if (balance.transferDirection === 'settled' && !isSettled) return null

  async function handleSettle() {
    setLoading(true)
    await fetch('/api/settlements', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        year,
        month,
        amount: balance.transferAmount,
        from_user: balance.transferDirection === 'valentina_to_cristobal' ? valentinaId : cristobalId,
        to_user: balance.transferDirection === 'valentina_to_cristobal' ? cristobalId : valentinaId,
      }),
    })
    router.refresh()
    setLoading(false)
  }

  async function handleUnsettle() {
    setLoading(true)
    await fetch(`/api/settlements?year=${year}&month=${month}`, { method: 'DELETE' })
    router.refresh()
    setLoading(false)
  }

  if (isSettled) {
    const date = new Date(settlement!.settled_at).toLocaleDateString('es-CL', { day: 'numeric', month: 'long' })
    return (
      <div className="flex items-center justify-between rounded-xl border border-green-200 bg-green-50 px-4 py-3">
        <div className="flex items-center gap-2 text-green-700">
          <CheckCircle2 size={18} />
          <span className="text-sm font-medium">Liquidado el {date}</span>
        </div>
        <button
          onClick={handleUnsettle}
          disabled={loading}
          className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
        >
          Deshacer
        </button>
      </div>
    )
  }

  const fromName = balance.transferDirection === 'valentina_to_cristobal' ? 'Valentina' : 'Cristóbal'
  const toName = balance.transferDirection === 'valentina_to_cristobal' ? 'Cristóbal' : 'Valentina'

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" className="w-full border-green-200 text-green-700 hover:bg-green-50 hover:text-green-800">
          Liquidar {MONTH_NAMES[month - 1]}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Liquidar {MONTH_NAMES[month - 1]}?</AlertDialogTitle>
          <AlertDialogDescription>
            Esto registra que {fromName} le transfirió {formatCLP(balance.transferAmount)} a {toName} para saldar {MONTH_NAMES[month - 1]} de {year}.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={handleSettle} disabled={loading} className="bg-green-600 hover:bg-green-700">
            Confirmar liquidación
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
