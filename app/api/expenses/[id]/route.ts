import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { addMonths } from '@/lib/utils'

const VALID_SPLITS = ['70_30', '50_50', 'personal', 'lent']

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const body = await request.json()
  const { scope, amount, description, category, split, expense_date, paid_by, new_remaining_count } = body

  if (!amount || amount <= 0) return NextResponse.json({ error: 'Monto inválido' }, { status: 400 })
  if (!description?.trim()) return NextResponse.json({ error: 'Descripción requerida' }, { status: 400 })
  if (!VALID_SPLITS.includes(split)) return NextResponse.json({ error: 'Split inválido' }, { status: 400 })

  const { data: expense } = await supabase
    .from('expenses')
    .select('paid_by, installment_group_id, installment_index, installment_total, expense_date')
    .eq('id', id)
    .single()

  if (!expense) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
  if (expense.paid_by !== user.id) return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })

  const fields = { amount: Math.round(amount), description: description.trim(), category: category ?? 'other', split }

  if (scope === 'group_forward' && expense.installment_group_id) {
    const groupId = expense.installment_group_id
    const currentIndex = expense.installment_index as number

    // Fetch all current future rows (this one + ahead), ordered
    const { data: futureRows } = await supabase
      .from('expenses')
      .select('id, installment_index, expense_date')
      .eq('installment_group_id', groupId)
      .gte('installment_index', currentIndex)
      .order('installment_index', { ascending: true })

    const futureRows_ = futureRows ?? []
    const currentCount = futureRows_.length
    const newCount = new_remaining_count != null ? Math.max(1, Number(new_remaining_count)) : currentCount
    const delta = newCount - currentCount

    if (delta < 0) {
      // Delete last |delta| rows
      const toDelete = futureRows_.slice(delta).map((r: any) => r.id)
      const { error } = await supabase.from('expenses').delete().in('id', toDelete)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    } else if (delta > 0) {
      // Add delta new rows after the last existing one
      const lastRow = futureRows_[futureRows_.length - 1]
      const newRows = Array.from({ length: delta }, (_, i) => ({
        ...fields,
        paid_by: expense.paid_by,
        expense_date: addMonths(lastRow.expense_date, i + 1),
        installment_group_id: groupId,
        installment_index: (lastRow.installment_index as number) + i + 1,
        installment_total: 0, // updated below
      }))
      const { error } = await supabase.from('expenses').insert(newRows)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Update all future rows (not deleted) with new field values
    const keepIds = futureRows_.slice(0, Math.min(currentCount, newCount)).map((r: any) => r.id)
    if (keepIds.length > 0) {
      const { error } = await supabase.from('expenses').update(fields).in('id', keepIds)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Recalculate installment_total for the entire group
    const { data: allRows } = await supabase
      .from('expenses')
      .select('id')
      .eq('installment_group_id', groupId)
    const newTotal = (allRows ?? []).length
    const { error: totalErr } = await supabase
      .from('expenses')
      .update({ installment_total: newTotal })
      .eq('installment_group_id', groupId)
    if (totalErr) return NextResponse.json({ error: totalErr.message }, { status: 500 })

    return NextResponse.json({ updated: newCount })
  }

  // scope === 'single' (or regular expense)
  const { error } = await supabase
    .from('expenses')
    .update({ ...fields, expense_date: expense_date ?? expense.expense_date, paid_by: paid_by ?? expense.paid_by })
    .eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ updated: 1 })
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const deleteGroup = new URL(request.url).searchParams.get('deleteGroup') === 'true'

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { data: expense } = await supabase
    .from('expenses')
    .select('paid_by, installment_group_id, installment_index')
    .eq('id', id)
    .single()

  if (!expense) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
  if (expense.paid_by !== user.id) return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })

  if (deleteGroup && expense.installment_group_id) {
    // Delete this installment and all future ones in the group
    const { error } = await supabase
      .from('expenses')
      .delete()
      .eq('installment_group_id', expense.installment_group_id)
      .gte('installment_index', expense.installment_index)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  } else {
    const { error } = await supabase.from('expenses').delete().eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return new NextResponse(null, { status: 204 })
}
