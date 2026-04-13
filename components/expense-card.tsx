'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { CATEGORY_ICONS, CATEGORY_LABELS, SPLIT_LABELS } from '@/lib/constants'
import { formatCLP } from '@/lib/balance'
import type { Expense } from '@/types'

interface Props {
  expense: Expense
  currentUserId: string
}

export default function ExpenseCard({ expense, currentUserId }: Props) {
  const [deleting, setDeleting] = useState(false)
  const router = useRouter()
  const isOwner = currentUserId === expense.paid_by

  async function handleDelete() {
    setDeleting(true)
    await fetch(`/api/expenses/${expense.id}`, { method: 'DELETE' })
    router.refresh()
  }

  return (
    <div className="bg-white rounded-lg border border-slate-100 p-3 flex items-center gap-3">
      <span className="text-2xl shrink-0">
        {CATEGORY_ICONS[expense.category] ?? '📦'}
      </span>

      <div className="flex-1 min-w-0">
        <p className="font-medium text-slate-800 truncate">{expense.description}</p>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <span className="text-xs text-slate-400">{CATEGORY_LABELS[expense.category]}</span>
          <Badge variant="outline" className="text-xs py-0">
            {SPLIT_LABELS[expense.split]}
          </Badge>
          <span className="text-xs text-slate-400">pagó {expense.payer_name}</span>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <span className="font-semibold text-slate-800">{formatCLP(expense.amount)}</span>
        {isOwner && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button className="text-slate-300 hover:text-red-400 transition-colors p-1" disabled={deleting}>
                <Trash2 size={16} />
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Eliminar gasto?</AlertDialogTitle>
                <AlertDialogDescription>
                  Se eliminará &ldquo;{expense.description}&rdquo; de {formatCLP(expense.amount)}. Esta acción no se puede deshacer.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
                  Eliminar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    </div>
  )
}
