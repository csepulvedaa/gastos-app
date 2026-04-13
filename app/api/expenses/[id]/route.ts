import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { data: expense } = await supabase
    .from('expenses')
    .select('paid_by')
    .eq('id', id)
    .single()

  if (!expense) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
  if (expense.paid_by !== user.id) return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })

  const { error } = await supabase.from('expenses').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return new NextResponse(null, { status: 204 })
}
