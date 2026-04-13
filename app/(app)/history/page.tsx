'use client'

import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import BalanceSummary from '@/components/balance-summary'
import ExpenseList from '@/components/expense-list'
import type { Expense, Profile } from '@/types'
import { createClient } from '@/lib/supabase/client'

export default function HistoryPage() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [userId, setUserId] = useState<string>('')
  const [loading, setLoading] = useState(true)

  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUserId(data.user.id)
    })
    supabase.from('profiles').select('id, name, email').then(({ data }) => {
      if (data) setProfiles(data as Profile[])
    })
  }, [])

  useEffect(() => {
    setLoading(true)
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`
    const endDate = month === 12
      ? `${year + 1}-01-01`
      : `${year}-${String(month + 1).padStart(2, '0')}-01`

    supabase
      .from('expenses')
      .select('*, profiles(name)')
      .gte('expense_date', startDate)
      .lt('expense_date', endDate)
      .order('expense_date', { ascending: false })
      .then(({ data }) => {
        setExpenses(
          (data ?? []).map((e: any) => ({ ...e, payer_name: e.profiles?.name ?? 'Desconocido' }))
        )
        setLoading(false)
      })
  }, [year, month])

  function prevMonth() {
    if (month === 1) { setMonth(12); setYear(y => y - 1) }
    else setMonth(m => m - 1)
  }

  function nextMonth() {
    const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1
    if (isCurrentMonth) return
    if (month === 12) { setMonth(1); setYear(y => y + 1) }
    else setMonth(m => m + 1)
  }

  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1
  const monthLabel = new Date(year, month - 1, 1).toLocaleDateString('es-CL', { month: 'long', year: 'numeric' })

  const cristobal = profiles.find((p) => p.id === userId)
  const valentina = profiles.find((p) => p.id !== userId)

  return (
    <div className="p-4 space-y-6">
      {/* Month picker */}
      <div className="flex items-center justify-between pt-2">
        <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-slate-100 transition-colors">
          <ChevronLeft size={20} />
        </button>
        <h1 className="text-lg font-bold text-slate-800 capitalize">{monthLabel}</h1>
        <button
          onClick={nextMonth}
          disabled={isCurrentMonth}
          className="p-2 rounded-lg hover:bg-slate-100 transition-colors disabled:opacity-30"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400 text-sm">Cargando...</div>
      ) : (
        <>
          {cristobal && valentina && expenses.length > 0 && (
            <BalanceSummary expenses={expenses} cristobalId={cristobal.id} valentinaId={valentina.id} />
          )}
          <ExpenseList expenses={expenses} currentUserId={userId} />
        </>
      )}
    </div>
  )
}
