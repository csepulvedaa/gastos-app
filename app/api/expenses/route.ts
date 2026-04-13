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

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const body = await request.json()
  const { amount, description, category, split, paid_by, expense_date } = body

  if (!amount || amount <= 0) return NextResponse.json({ error: 'Monto inválido' }, { status: 400 })
  if (!description?.trim()) return NextResponse.json({ error: 'Descripción requerida' }, { status: 400 })
  if (!['70_30', '50_50', 'personal'].includes(split)) return NextResponse.json({ error: 'Split inválido' }, { status: 400 })

  const { data, error } = await supabase.from('expenses').insert({
    amount: Math.round(amount),
    description: description.trim(),
    category: category ?? 'other',
    split,
    paid_by: paid_by ?? user.id,
    expense_date: expense_date ?? new Date().toISOString().split('T')[0],
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
