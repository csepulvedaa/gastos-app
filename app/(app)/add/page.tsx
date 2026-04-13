import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ExpenseForm from '@/components/expense-form'
import type { Profile } from '@/types'

export default async function AddPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profiles } = await supabase.from('profiles').select('id, name, email')

  const currentUser = (profiles as Profile[])?.find((p) => p.id === user.id)
  const otherUser = (profiles as Profile[])?.find((p) => p.id !== user.id)

  if (!currentUser || !otherUser) redirect('/dashboard')

  return (
    <div className="p-4 space-y-4">
      <div className="pt-2">
        <h1 className="text-xl font-bold text-slate-800">Nuevo gasto</h1>
        <p className="text-sm text-slate-400">Registra un gasto compartido</p>
      </div>
      <ExpenseForm currentUser={currentUser} otherUser={otherUser} />
    </div>
  )
}
