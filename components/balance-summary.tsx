import { calculateBalance, formatCLP } from '@/lib/balance'
import type { Expense } from '@/types'

interface FutureInstallment {
  amount: number
  split: string
  paid_by: string
}

interface Props {
  expenses: Expense[]
  cristobalId: string
  valentinaId: string
  futureInstallments: FutureInstallment[]
  settlement?: { amount: number; from_user: string; settled_at: string } | null
}

export default function BalanceSummary({ expenses, cristobalId, valentinaId, futureInstallments, settlement }: Props) {
  const balance = calculateBalance(expenses, cristobalId, valentinaId)

  // Total pending debt from future installments (what each person will owe in coming months)
  let cristobalFutureOwes = 0
  let valentinaFutureOwes = 0
  for (const fi of futureInstallments) {
    if (fi.split === 'lent') {
      if (fi.paid_by === cristobalId) valentinaFutureOwes += fi.amount
      else cristobalFutureOwes += fi.amount
    } else if (fi.split === '70_30') {
      cristobalFutureOwes += fi.amount * 0.7
      valentinaFutureOwes += fi.amount * 0.3
    } else if (fi.split === '50_50') {
      cristobalFutureOwes += fi.amount * 0.5
      valentinaFutureOwes += fi.amount * 0.5
    }
  }
  const hasFutureDebt = cristobalFutureOwes > 0 || valentinaFutureOwes > 0

  const transferText =
    balance.transferDirection === 'settled'
      ? '✅ Están al día'
      : balance.transferDirection === 'valentina_to_cristobal'
      ? `Valentina le debe a Cristóbal`
      : `Cristóbal le debe a Valentina`

  const transferColor =
    balance.transferDirection === 'settled'
      ? 'bg-green-50 border-green-200 text-green-800'
      : 'bg-blue-50 border-blue-200 text-blue-800'

  return (
    <div className="space-y-3">
      {/* Transferencia */}
      <div className={`rounded-xl border p-4 text-center ${settlement ? 'bg-green-50 border-green-200 text-green-800' : transferColor}`}>
        <p className="text-sm font-medium">{settlement ? '✅ Mes liquidado' : transferText}</p>
        {balance.transferDirection !== 'settled' && (
          <p className={`text-3xl font-bold mt-1 ${settlement ? 'line-through opacity-50' : ''}`}>
            {formatCLP(balance.transferAmount)}
          </p>
        )}
        {hasFutureDebt && balance.transferDirection !== 'settled' && (
          <p className="text-xs text-slate-400 mt-2">
            {balance.transferDirection === 'valentina_to_cristobal'
              ? `+ ${formatCLP(Math.round(valentinaFutureOwes))} en cuotas futuras`
              : `+ ${formatCLP(Math.round(cristobalFutureOwes))} en cuotas futuras`
            }
          </p>
        )}
      </div>

      {/* Desglose */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-white rounded-lg border border-slate-100 p-3">
          <p className="text-xs text-slate-500">Cristóbal pagó</p>
          <p className="font-semibold text-slate-800">{formatCLP(balance.cristobalPaid)}</p>
          <p className="text-xs text-slate-400 mt-1">le corresponde {formatCLP(balance.cristobalOwes)}</p>
        </div>
        <div className="bg-white rounded-lg border border-slate-100 p-3">
          <p className="text-xs text-slate-500">Valentina pagó</p>
          <p className="font-semibold text-slate-800">{formatCLP(balance.valentinaPaid)}</p>
          <p className="text-xs text-slate-400 mt-1">le corresponde {formatCLP(balance.valentinaOwes)}</p>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-slate-100 p-3 flex justify-between items-center">
        <span className="text-sm text-slate-500">Total gastado este mes</span>
        <span className="font-bold text-slate-800">{formatCLP(balance.totalSpent)}</span>
      </div>
    </div>
  )
}
