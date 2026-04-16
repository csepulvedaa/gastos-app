import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import BalanceSummary from '@/components/balance-summary'
import ExpenseList from '@/components/expense-list'
import SettleButton from '@/components/settle-button'
import { Button } from '@/components/ui/button'
import type { Expense, Profile } from '@/types'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`
  const endDate = month === 12
    ? `${year + 1}-01-01`
    : `${year}-${String(month + 1).padStart(2, '0')}-01`

  const monthName = now.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' })

  const [{ data: profiles }, { data: expenses }, { data: futureInstallments }, { data: settlement }] = await Promise.all([
    supabase.from('profiles').select('id, name, email'),
    supabase
      .from('expenses')
      .select('*, profiles(name)')
      .gte('expense_date', startDate)
      .lt('expense_date', endDate)
      .order('expense_date', { ascending: false }),
    // Installment expenses from next month onwards (endDate = first day of next month)
    supabase
      .from('expenses')
      .select('amount, split, paid_by, installment_group_id, installment_index, installment_total')
      .not('installment_group_id', 'is', null)
      .gte('expense_date', endDate),
    supabase.from('settlements').select('*').eq('year', year).eq('month', month).maybeSingle(),
  ])

  const cristobal = (profiles as Profile[])?.find((p) => p.id === user.id)
  const valentina = (profiles as Profile[])?.find((p) => p.id !== user.id)

  const expensesList: Expense[] = (expenses ?? []).map((e: any) => ({
    ...e,
    payer_name: e.profiles?.name ?? 'Desconocido',
  }))

  return (
    <div className="p-4 space-y-6">
      <div className="flex items-center justify-between pt-2">
        <div>
          <h1 className="text-xl font-bold text-slate-800 capitalize">{monthName}</h1>
          <p className="text-sm text-slate-400">Hola, {cristobal?.name ?? user.email} 👋</p>
        </div>
        <Button asChild size="sm">
          <Link href="/add">+ Agregar</Link>
        </Button>
      </div>

      {cristobal && valentina ? (
        <>
          <BalanceSummary
            expenses={expensesList}
            cristobalId={cristobal.id}
            valentinaId={valentina.id}
            futureInstallments={futureInstallments ?? []}
            settlement={settlement}
          />
          <SettleButton
            year={year}
            month={month}
            expenses={expensesList}
            cristobalId={cristobal.id}
            valentinaId={valentina.id}
            settlement={settlement}
          />
        </>
      ) : null}

      <div>
        <h2 className="text-sm font-semibold text-slate-600 mb-3">Gastos del mes</h2>
        <ExpenseList
          expenses={expensesList}
          currentUserId={user.id}
          cristobalId={cristobal?.id}
          profiles={profiles?.map((p) => ({ id: p.id, name: p.name }))}
        />
      </div>
    </div>
  )
}
