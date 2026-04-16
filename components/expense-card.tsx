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
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { CATEGORY_ICONS, CATEGORY_LABELS, SPLIT_LABELS, SPLIT_DESCRIPTIONS } from '@/lib/constants'
import { formatCLP } from '@/lib/balance'
import type { Expense } from '@/types'

interface Props {
  expense: Expense
  currentUserId: string
  onDeleted?: () => void
  cristobalId?: string
  profiles?: { id: string; name: string }[]
}

function getSplitShares(expense: Expense, cristobalId: string, valentinaId: string) {
  const { amount, split, paid_by } = expense
  const otherId = paid_by === cristobalId ? valentinaId : cristobalId
  if (split === '70_30') return { [cristobalId]: Math.round(amount * 0.7), [valentinaId]: Math.round(amount * 0.3) }
  if (split === '50_50') return { [cristobalId]: Math.round(amount * 0.5), [valentinaId]: Math.round(amount * 0.5) }
  if (split === 'personal') return { [paid_by]: amount, [otherId]: 0 }
  // lent: payer fronted, other owes 100%
  return { [paid_by]: 0, [otherId]: amount }
}

export default function ExpenseCard({ expense, currentUserId, onDeleted, cristobalId, profiles }: Props) {
  const [deleting, setDeleting] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)
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

  // Compute split shares for the detail sheet
  const valentinaProfile = profiles?.find((p) => p.id !== cristobalId)
  const showDetail = !!cristobalId && !!valentinaProfile
  const shares = showDetail
    ? getSplitShares(expense, cristobalId!, valentinaProfile!.id)
    : null

  const dateLabel = new Date(expense.expense_date + 'T12:00:00').toLocaleDateString('es-CL', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

  return (
    <>
      <div
        className="bg-white rounded-lg border border-slate-100 p-3 flex items-center gap-3 cursor-pointer active:bg-slate-50 transition-colors"
        onClick={() => setSheetOpen(true)}
      >
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

        <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
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

      {/* Detail sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl pb-8" aria-describedby={undefined}>
          <SheetHeader className="text-left mb-4">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{CATEGORY_ICONS[expense.category] ?? '📦'}</span>
              <div>
                <SheetTitle className="text-base leading-tight">{expense.description}</SheetTitle>
                <p className="text-xs text-slate-400 capitalize mt-0.5">{dateLabel}</p>
              </div>
            </div>
          </SheetHeader>

          <div className="space-y-4">
            {/* Total + split type */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400">Tipo de división</p>
                <p className="text-sm font-medium text-slate-700">{SPLIT_LABELS[expense.split]}</p>
                <p className="text-xs text-slate-400">{SPLIT_DESCRIPTIONS[expense.split]}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-400">Total pagado</p>
                <p className="text-2xl font-bold text-slate-800">{formatCLP(expense.amount)}</p>
                <p className="text-xs text-slate-400">pagó {expense.payer_name}</p>
              </div>
            </div>

            {/* Installment info */}
            {isInstallment && (
              <div className="bg-blue-50 rounded-lg p-3 flex items-center justify-between">
                <div>
                  <p className="text-xs text-blue-600 font-medium">Cuota {expense.installment_index} de {expense.installment_total}</p>
                  <p className="text-xs text-slate-400">{formatCLP(expense.amount)}/mes · total {formatCLP(expense.amount * expense.installment_total!)}</p>
                </div>
                <Badge variant="outline" className="border-blue-200 text-blue-600">
                  {expense.installment_total! - expense.installment_index!} cuotas restantes
                </Badge>
              </div>
            )}

            {/* Per-person breakdown */}
            {showDetail && shares && profiles ? (
              <div className="space-y-2">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Le corresponde pagar</p>
                {profiles.map((profile) => {
                  const share = shares[profile.id] ?? 0
                  const paid = expense.paid_by === profile.id
                  const diff = paid ? expense.amount - share : -share
                  return (
                    <div key={profile.id} className="flex items-center justify-between bg-slate-50 rounded-lg p-3">
                      <div>
                        <p className="text-sm font-medium text-slate-800">{profile.name}</p>
                        <p className="text-xs text-slate-400">{paid ? 'pagó este gasto' : 'no pagó'}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-base font-semibold text-slate-800">{formatCLP(share)}</p>
                        {diff !== 0 && (
                          <p className={`text-xs ${diff > 0 ? 'text-green-600' : 'text-red-500'}`}>
                            {diff > 0 ? `+${formatCLP(diff)} a favor` : `${formatCLP(Math.abs(diff))} debe`}
                          </p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : null}
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
