import ExpenseCard from '@/components/expense-card'
import type { Expense } from '@/types'

interface Props {
  expenses: Expense[]
  currentUserId: string
  onDeleted?: () => void
}

function groupByDate(expenses: Expense[]) {
  const groups: Record<string, Expense[]> = {}
  for (const e of expenses) {
    if (!groups[e.expense_date]) groups[e.expense_date] = []
    groups[e.expense_date].push(e)
  }
  return groups
}

function formatDateHeader(dateStr: string) {
  const date = new Date(dateStr + 'T12:00:00')
  return date.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })
}

export default function ExpenseList({ expenses, currentUserId, onDeleted }: Props) {
  if (expenses.length === 0) {
    return (
      <div className="text-center py-12 text-slate-400">
        <p className="text-4xl mb-3">🧾</p>
        <p className="text-sm">No hay gastos registrados este mes</p>
      </div>
    )
  }

  const grouped = groupByDate(expenses)
  const dates = Object.keys(grouped).sort((a, b) => b.localeCompare(a))

  return (
    <div className="space-y-4">
      {dates.map((date) => (
        <div key={date}>
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wide px-1 mb-2 capitalize">
            {formatDateHeader(date)}
          </p>
          <div className="space-y-2">
            {grouped[date].map((expense) => (
              <ExpenseCard key={expense.id} expense={expense} currentUserId={currentUserId} onDeleted={onDeleted} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
