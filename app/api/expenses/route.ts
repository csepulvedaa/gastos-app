import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const year = searchParams.get('year') ?? new Date().getFullYear()
  const month = searchParams.get('month') ?? new Date().getMonth() + 1

  const startDate = `${year}-${String(month).padStart(2, '0')}-01`
  const endDate = Number(month) === 12
    ? `${Number(year) + 1}-01-01`
    : `${year}-${String(Number(month) + 1).padStart(2, '0')}-01`

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('expenses')
    .select('*, profiles(name)')
    .gte('expense_date', startDate)
    .lt('expense_date', endDate)
    .order('expense_date', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const expenses = (data ?? []).map((e: any) => ({
    ...e,
    payer_name: e.profiles?.name ?? 'Desconocido',
  }))

  return NextResponse.json(expenses)
}

/** Adds `n` months to a YYYY-MM-DD string, preserving the day (clamped to month end). */
function addMonths(dateStr: string, n: number): string {
  const [year, month, day] = dateStr.split('-').map(Number)
  const d = new Date(year, month - 1 + n, 1)
  const maxDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
  d.setDate(Math.min(day, maxDay))
  return d.toISOString().split('T')[0]
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const body = await request.json()
  const { amount, description, category, split, paid_by, expense_date, installment_total } = body

  if (!amount || amount <= 0) return NextResponse.json({ error: 'Monto inválido' }, { status: 400 })
  if (!description?.trim()) return NextResponse.json({ error: 'Descripción requerida' }, { status: 400 })
  if (!['70_30', '50_50', 'personal', 'lent'].includes(split)) return NextResponse.json({ error: 'Split inválido' }, { status: 400 })

  const baseDate = expense_date ?? new Date().toISOString().split('T')[0]
  const paidBy = paid_by ?? user.id
  const installments = Number(installment_total)
  const isInstallment = installments >= 2

  if (isInstallment) {
    const groupId = crypto.randomUUID()
    const amountPerInstallment = Math.round(amount / installments)
    const rows = Array.from({ length: installments }, (_, i) => ({
      amount: amountPerInstallment,
      description: description.trim(),
      category: category ?? 'other',
      split,
      paid_by: paidBy,
      expense_date: addMonths(baseDate, i),
      installment_group_id: groupId,
      installment_index: i + 1,
      installment_total: installments,
    }))

    console.log('[POST /api/expenses] inserting installments:', JSON.stringify(rows, null, 2))
    const { data, error } = await supabase.from('expenses').insert(rows).select()

    if (error) {
      console.error('[POST /api/expenses] installment insert error:', error)
      return NextResponse.json({ error: error.message, details: error }, { status: 500 })
    }
    return NextResponse.json(data, { status: 201 })
  }

  const payload = {
    amount: Math.round(amount),
    description: description.trim(),
    category: category ?? 'other',
    split,
    paid_by: paidBy,
    expense_date: baseDate,
  }
  console.log('[POST /api/expenses] inserting:', JSON.stringify(payload, null, 2))
  const { data, error } = await supabase.from('expenses').insert(payload).select().single()
  if (error) {
    console.error('[POST /api/expenses] insert error:', error)
    return NextResponse.json({ error: error.message, details: error }, { status: 500 })
  }
  return NextResponse.json(data, { status: 201 })
}
