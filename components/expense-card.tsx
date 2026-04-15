'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Pencil, Trash2 } from 'lucide-react'
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
  onDeleted?: () => void
}

export default function ExpenseCard({ expense, currentUserId, onDeleted }: Props) {
  const [deleting, setDeleting] = useState(false)
  const router = useRouter()
  const isOwner = currentUserId === expense.paid_by
  const isInstallment = !!expense.installment_total && expense.installment_total > 1
  const remainingInstallments = isInstallment
    ? expense.installment_total! - expense.installment_index! + 1
    : 0

  async function handleDelete(deleteGroup: boolean) {
    setDeleting(true)
    const url = deleteGroup
      ? `/api/expenses/${expense.id}?deleteGroup=true`
      : `/api/expenses/${expense.id}`
    await fetch(url, { method: 'DELETE' })
    onDeleted ? onDeleted() : router.refresh()
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
          {isInstallment && (
            <>
              <Badge variant="outline" className="text-xs py-0 border-blue-200 text-blue-600">
                Cuota {expense.installment_index}/{expense.installment_total}
              </Badge>
              <span className="text-xs text-slate-400">
                total {formatCLP(expense.amount * expense.installment_total!)}
              </span>
            </>
          )}
          <span className="text-xs text-slate-400">pagó {expense.payer_name}</span>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <span className="font-semibold text-slate-800">{formatCLP(expense.amount)}</span>
        {isOwner && (
          <Link
            href={`/edit/${expense.id}`}
            className="text-slate-300 hover:text-blue-400 transition-colors p-1"
          >
            <Pencil size={15} />
          </Link>
        )}
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
                  {isInstallment
                    ? `"${expense.description}" — cuota ${expense.installment_index} de ${expense.installment_total}. ¿Qué deseas eliminar?`
                    : `Se eliminará "${expense.description}" de ${formatCLP(expense.amount)}. Esta acción no se puede deshacer.`
                  }
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className={isInstallment ? 'flex-col gap-2 sm:flex-col' : undefined}>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                {isInstallment ? (
                  <>
                    <AlertDialogAction
                      onClick={() => handleDelete(false)}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      Solo esta cuota
                    </AlertDialogAction>
                    <AlertDialogAction
                      onClick={() => handleDelete(true)}
                      className="bg-red-800 hover:bg-red-900"
                    >
                      Esta y las {remainingInstallments - 1} restantes
                    </AlertDialogAction>
                  </>
                ) : (
                  <AlertDialogAction onClick={() => handleDelete(false)} className="bg-red-600 hover:bg-red-700">
                    Eliminar
                  </AlertDialogAction>
                )}
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    </div>
  )
}
