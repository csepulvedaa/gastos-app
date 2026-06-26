'use client'

import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import BalanceSummary from '@/components/balance-summary'
import ExpenseList from '@/components/expense-list'
import type { Expense, Profile } from '@/types'
import { createClient } from '@/lib/supabase/client'
import { formatCLP } from '@/lib/balance'

type View = 'shared' | 'personal'

export default function HistoryPage() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [userId, setUserId] = useState('')
  const [loading, setLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)
  const [view, setView] = useState<View>('shared')

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
  }, [year, month, refreshKey])

  function prevMonth() {
    if (month === 1) { setMonth(12); setYear(y => y - 1) }
    else setMonth(m => m - 1)
  }
  function nextMonth() {
    if (month === 12) { setMonth(1); setYear(y => y + 1) }
    else setMonth(m => m + 1)
  }

  const monthLabel = new Date(year, month - 1, 1).toLocaleDateString('es-CL', { month: 'long', year: 'numeric' })
  const cristobal = profiles.find((p) => /cristóbal|cristobal/i.test(p.name))
  const valentina = profiles.find((p) => /valentina/i.test(p.name))

  const sharedExpenses = expenses.filter(e => e.split !== 'personal' || e.visible_in_shared)
  const personalExpenses = expenses.filter(e => e.split === 'personal' && e.paid_by === userId)

  const visibleExpenses = view === 'personal' ? personalExpenses : sharedExpenses
  const personalTotal = personalExpenses.reduce((sum, e) => sum + e.amount, 0)

  return (
    <div className="p-4 space-y-5">
      {/* Month picker */}
      <div className="flex items-center justify-between pt-2">
        <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-slate-100 transition-colors">
          <ChevronLeft size={20} />
        </button>
        <h1 className="text-lg font-bold text-slate-800 capitalize">{monthLabel}</h1>
        <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-slate-100 transition-colors">
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Toggle */}
      <div className="flex rounded-lg border border-slate-200 p-0.5 bg-slate-50">
        <button
          onClick={() => setView('shared')}
          className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${
            view === 'shared' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          Compartidos
        </button>
        <button
          onClick={() => setView('personal')}
          className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${
            view === 'personal' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          Personal
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400 text-sm">Cargando...</div>
      ) : (
        <>
          {view === 'shared' && cristobal && valentina && sharedExpenses.length > 0 && (
            <BalanceSummary
              expenses={sharedExpenses}
              cristobalId={cristobal.id}
              valentinaId={valentina.id}
              futureInstallments={[]}
            />
          )}

          {view === 'personal' && (
            <div className="bg-slate-800 rounded-xl p-4 text-white">
              <p className="text-xs text-slate-400 mb-1">Mis gastos personales</p>
              <p className="text-2xl font-bold">{formatCLP(personalTotal)}</p>
              <p className="text-xs text-slate-400 mt-1 capitalize">{monthLabel}</p>
            </div>
          )}

          <ExpenseList
            expenses={visibleExpenses}
            currentUserId={userId}
            onDeleted={() => setRefreshKey(k => k + 1)}
            cristobalId={cristobal?.id}
            profiles={profiles.map(p => ({ id: p.id, name: p.name }))}
          />
        </>
      )}
    </div>
  )
}
