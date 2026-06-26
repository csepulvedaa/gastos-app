import type { CardTransaction } from '@/types'
import { formatCLP } from '@/lib/balance'
import { Badge } from '@/components/ui/badge'

const STATUS_ICON: Record<string, string> = {
  pending: '⏳',
  added_shared: '🤝',
  added_personal: '👤',
  ignored: '✕',
}

const STATUS_LABEL: Record<string, string> = {
  added_shared: 'Compartido',
  added_personal: 'Personal',
  ignored: 'Ignorado',
}

interface Props {
  transaction: CardTransaction
  onClick: () => void
}

export default function TransactionCard({ transaction, onClick }: Props) {
  const isPending = transaction.status === 'pending'
  const isUSD = transaction.original_currency !== 'CLP'

  const amountDisplay = isUSD && transaction.original_amount
    ? `${transaction.original_currency} ${transaction.original_amount.toFixed(2)}`
    : transaction.amount
    ? formatCLP(transaction.amount)
    : '—'

  const dateLabel = new Date(transaction.transaction_date + 'T12:00:00').toLocaleDateString('es-CL', {
    day: 'numeric', month: 'short',
  })

  return (
    <div
      className={`rounded-lg border p-3 flex items-center gap-3 cursor-pointer active:bg-slate-50 transition-colors ${
        isPending ? 'border-amber-200 bg-amber-50' : 'border-slate-100 bg-white'
      }`}
      onClick={onClick}
    >
      <span className="text-xl shrink-0">{STATUS_ICON[transaction.status]}</span>

      <div className="flex-1 min-w-0">
        <p className="font-medium text-slate-800 truncate">{transaction.merchant}</p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <span className="text-xs text-slate-400">{dateLabel}</span>
          {transaction.card_last4 && (
            <span className="text-xs text-slate-400">****{transaction.card_last4}</span>
          )}
          {!isPending && STATUS_LABEL[transaction.status] && (
            <Badge variant="secondary" className="text-xs py-0">
              {STATUS_LABEL[transaction.status]}
            </Badge>
          )}
          {!isPending && transaction.status === 'ignored' && (
            <Badge variant="outline" className="text-xs py-0 text-slate-400">
              Ignorado
            </Badge>
          )}
        </div>
      </div>

      <div className="text-right shrink-0">
        <p className="text-sm font-semibold text-slate-800">{amountDisplay}</p>
        {isUSD && transaction.amount && (
          <p className="text-xs text-slate-400">≈ {formatCLP(transaction.amount)}</p>
        )}
      </div>
    </div>
  )
}
