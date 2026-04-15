import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import EditExpenseForm from '@/components/edit-expense-form'
import type { Expense, Profile } from '@/types'

export default async function EditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: expenseRaw }, { data: profiles }] = await Promise.all([
    supabase.from('expenses').select('*, profiles(name)').eq('id', id).single(),
    supabase.from('profiles').select('id, name, email'),
  ])

  if (!expenseRaw) redirect('/dashboard')
  if (expenseRaw.paid_by !== user.id) redirect('/dashboard')

  const expense: Expense = { ...expenseRaw, payer_name: expenseRaw.profiles?.name ?? '' }
  const currentUser = (profiles as Profile[])?.find((p) => p.id === user.id)!
  const otherUser = (profiles as Profile[])?.find((p) => p.id !== user.id)!

  return (
    <div className="p-4 space-y-4">
      <div className="pt-2">
        <h1 className="text-xl font-bold text-slate-800">Editar gasto</h1>
        <p className="text-sm text-slate-400">{expense.description}</p>
      </div>
      <EditExpenseForm expense={expense} currentUser={currentUser} otherUser={otherUser} />
    </div>
  )
}
