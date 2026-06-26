'use client'

import { useState, useEffect } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, Cell,
} from 'recharts'
import { createClient } from '@/lib/supabase/client'
import { CATEGORY_ICONS, CATEGORY_LABELS } from '@/lib/constants'
import { formatCLP } from '@/lib/balance'
import type { Expense, Category } from '@/types'

type View = 'shared' | 'personal'

const BLUE = '#2563eb'
const SLATE = '#94a3b8'
const PURPLE = '#7c3aed'
const COLORS = ['#2563eb','#7c3aed','#db2777','#ea580c','#16a34a','#0891b2','#d97706','#dc2626','#64748b']

function formatM(amount: number) {
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`
  if (amount >= 1_000) return `$${Math.round(amount / 1_000)}k`
  return `$${amount}`
}

function getLastSixMonths() {
  const result = []
  const now = new Date()
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    result.push({
      year: d.getFullYear(),
      month: d.getMonth() + 1,
      label: d.toLocaleDateString('es-CL', { month: 'short' }),
    })
  }
  return result
}

function getNextMonths(n: number) {
  const result = []
  const now = new Date()
  for (let i = 1; i <= n; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1)
    result.push({
      year: d.getFullYear(),
      month: d.getMonth() + 1,
      label: d.toLocaleDateString('es-CL', { month: 'short', year: '2-digit' }),
    })
  }
  return result
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-2 text-xs shadow">
      <p className="font-medium text-slate-600 mb-1">{label}</p>
      {payload.map((entry: any) => (
        <p key={entry.name} style={{ color: entry.color }}>
          {entry.name}: {formatM(entry.value)}
        </p>
      ))}
    </div>
  )
}

export default function StatsPage() {
  const [allExpenses, setAllExpenses] = useState<Expense[]>([])
  const [futureInstallments, setFutureInstallments] = useState<Expense[]>([])
  const [profiles, setProfiles] = useState<{ id: string; name: string }[]>([])
  const [userId, setUserId] = useState('')
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<View>('shared')

  const supabase = createClient()
  const months = getLastSixMonths()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUserId(data.user.id)
    })

    const first = months[0]
    const last = months[months.length - 1]
    const startDate = `${first.year}-${String(first.month).padStart(2, '0')}-01`
    const nextMonth = last.month === 12 ? 1 : last.month + 1
    const nextYear = last.month === 12 ? last.year + 1 : last.year
    const endDate = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`
    const now = new Date()
    const futureStart = `${now.getFullYear()}-${String(now.getMonth() + 2).padStart(2, '0')}-01`

    Promise.all([
      supabase.from('profiles').select('id, name'),
      supabase.from('expenses').select('*').gte('expense_date', startDate).lt('expense_date', endDate),
      supabase.from('expenses').select('*').gte('expense_date', futureStart).not('installment_group_id', 'is', null),
    ]).then(([{ data: p }, { data: e }, { data: fi }]) => {
      setProfiles(p ?? [])
      setAllExpenses(e ?? [])
      setFutureInstallments(fi ?? [])
      setLoading(false)
    })
  }, [])

  const currentMonth = new Date().getMonth() + 1
  const currentYear = new Date().getFullYear()

  // Filter by view
  const expenses = view === 'personal'
    ? allExpenses.filter(e => e.split === 'personal' && e.paid_by === userId)
    : allExpenses.filter(e => e.split !== 'personal')

  const currentExpenses = expenses.filter(e => {
    const [y, m] = e.expense_date.split('-').map(Number)
    return y === currentYear && m === currentMonth
  })

  const currentTotal = currentExpenses.reduce((sum, e) => sum + e.amount, 0)

  // Chart 1: monthly total
  const monthlyData = months.map(({ year, month, label }) => {
    const total = expenses
      .filter(e => {
        const [y, m] = e.expense_date.split('-').map(Number)
        return y === year && m === month
      })
      .reduce((sum, e) => sum + e.amount, 0)
    return { label, total }
  })

  // Chart 2: by category (current month)
  const categoryTotals: Partial<Record<Category, number>> = {}
  for (const e of currentExpenses) {
    categoryTotals[e.category] = (categoryTotals[e.category] ?? 0) + e.amount
  }
  const categoryData = Object.entries(categoryTotals)
    .map(([cat, total]) => ({
      label: `${CATEGORY_ICONS[cat as Category]} ${CATEGORY_LABELS[cat as Category]}`,
      total: total ?? 0,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 6)

  // Chart 3: who paid (shared only)
  const p1 = profiles[0]
  const p2 = profiles[1]
  const payerData = months.map(({ year, month, label }) => {
    const monthExp = allExpenses.filter(e => {
      const [y, m] = e.expense_date.split('-').map(Number)
      return y === year && m === month && e.split !== 'personal'
    })
    const result: Record<string, number | string> = { label }
    for (const p of profiles) {
      result[p.name] = monthExp.filter(e => e.paid_by === p.id).reduce((sum, e) => sum + e.amount, 0)
    }
    return result
  })

  // Chart 4: future installments (shared only)
  const nextMonths = getNextMonths(12)
  const rawFutureData = nextMonths.map(({ year, month, label }) => {
    const total = futureInstallments
      .filter(e => {
        const [y, m] = e.expense_date.split('-').map(Number)
        return y === year && m === month
      })
      .reduce((sum, e) => sum + e.amount, 0)
    return { label, total }
  })
  let lastNonZero = -1
  for (let i = rawFutureData.length - 1; i >= 0; i--) {
    if (rawFutureData[i].total > 0) { lastNonZero = i; break }
  }
  const futureData = lastNonZero >= 0 ? rawFutureData.slice(0, lastNonZero + 1) : []

  if (loading) {
    return <div className="p-4 pt-6 text-center text-slate-400 text-sm">Cargando estadísticas...</div>
  }

  return (
    <div className="p-4 space-y-6 pb-4">
      <div className="pt-2">
        <h1 className="text-xl font-bold text-slate-800">Estadísticas</h1>
        <p className="text-sm text-slate-400">Últimos 6 meses</p>
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

      {/* Personal — headline */}
      {view === 'personal' && (
        <div className="bg-slate-800 rounded-xl p-4 text-white">
          <p className="text-xs text-slate-400 mb-1">Mis gastos personales este mes</p>
          <p className="text-2xl font-bold">{formatCLP(currentTotal)}</p>
          <p className="text-xs text-slate-400 mt-1">
            {new Date().toLocaleDateString('es-CL', { month: 'long', year: 'numeric' })}
          </p>
        </div>
      )}

      {/* Chart 1 — Gasto mensual */}
      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-slate-600">
          {view === 'personal' ? 'Mi gasto personal por mes' : 'Gasto total por mes'}
        </h2>
        <div className="bg-white rounded-xl border border-slate-100 p-3">
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={monthlyData} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={formatM} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f1f5f9' }} />
              <Bar dataKey="total" name="Total" radius={[4, 4, 0, 0]}>
                {monthlyData.map((_, i) => (
                  <Cell
                    key={i}
                    fill={view === 'personal' ? PURPLE : BLUE}
                    fillOpacity={i === monthlyData.length - 1 ? 1 : 0.5}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Chart 2 — Por categoría */}
      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-slate-600">Por categoría — este mes</h2>
        {categoryData.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-6">
            {view === 'personal' ? 'Sin gastos personales este mes' : 'Sin gastos este mes'}
          </p>
        ) : (
          <div className="bg-white rounded-xl border border-slate-100 p-3">
            <ResponsiveContainer width="100%" height={Math.max(160, categoryData.length * 36)}>
              <BarChart data={categoryData} layout="vertical" margin={{ top: 0, right: 48, left: 8, bottom: 0 }}>
                <XAxis type="number" tickFormatter={formatM} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="label" tick={{ fontSize: 11, fill: '#475569' }} axisLine={false} tickLine={false} width={130} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f1f5f9' }} />
                <Bar dataKey="total" name="Total" radius={[0, 4, 4, 0]}>
                  {categoryData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Charts 3 & 4 — Shared only */}
      {view === 'shared' && (
        <>
          {p1 && p2 && (
            <div className="space-y-2">
              <h2 className="text-sm font-semibold text-slate-600">Quién pagó por mes</h2>
              <div className="bg-white rounded-xl border border-slate-100 p-3">
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={payerData} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={formatM} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f1f5f9' }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey={p1.name} fill={BLUE} radius={[4, 4, 0, 0]} />
                    <Bar dataKey={p2.name} fill={PURPLE} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-slate-600">Cuotas comprometidas — próximos meses</h2>
            {futureData.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-6">Sin cuotas futuras registradas</p>
            ) : (
              <div className="bg-white rounded-xl border border-slate-100 p-3">
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={futureData} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={formatM} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f1f5f9' }} />
                    <Bar dataKey="total" name="Cuotas" radius={[4, 4, 0, 0]}>
                      {futureData.map((_, i) => (
                        <Cell key={i} fill="#0891b2" fillOpacity={1 - i * 0.07} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
