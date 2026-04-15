import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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
