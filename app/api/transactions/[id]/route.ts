import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const body = await request.json()
  const { action, expenseData } = body

  if (!['shared', 'personal', 'ignored'].includes(action)) {
    return NextResponse.json({ error: 'Acción inválida' }, { status: 400 })
  }

  const { data: tx } = await supabase
    .from('card_transactions')
    .select('id, user_id')
    .eq('id', id)
    .single()

  if (!tx || tx.user_id !== user.id) {
    return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
  }

  if (action === 'ignored') {
    const { error } = await supabase
      .from('card_transactions')
      .update({ status: 'ignored' })
      .eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  const { data: expense, error: expenseError } = await supabase
    .from('expenses')
    .insert({
      paid_by: expenseData.paid_by ?? user.id,
      amount: Math.round(expenseData.amount),
      description: expenseData.description.trim(),
      category: expenseData.category ?? 'other',
      split: action === 'personal' ? 'personal' : expenseData.split,
      expense_date: expenseData.expense_date,
      visible_in_shared: expenseData.visible_in_shared ?? false,
    })
    .select()
    .single()

  if (expenseError) return NextResponse.json({ error: expenseError.message }, { status: 500 })

  const status = action === 'shared' ? 'added_shared' : 'added_personal'
  await supabase
    .from('card_transactions')
    .update({ status, expense_id: expense.id })
    .eq('id', id)

  return NextResponse.json({ ok: true, expense })
}
