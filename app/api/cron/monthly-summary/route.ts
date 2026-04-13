import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { calculateBalance } from '@/lib/balance'
import { sendMonthlySummaryEmail } from '@/lib/email'
import type { Expense } from '@/types'

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  // Mes anterior
  const now = new Date()
  const month = now.getMonth() === 0 ? 12 : now.getMonth()
  const year = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear()
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`
  const endDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`

  const supabase = await createClient()

  const [{ data: profiles }, { data: expenses }] = await Promise.all([
    supabase.from('profiles').select('id, name, email'),
    supabase
      .from('expenses')
      .select('*, profiles(name)')
      .gte('expense_date', startDate)
      .lt('expense_date', endDate),
  ])

  const cristobal = (profiles ?? []).find((p: any) =>
    p.email === process.env.CRISTOBAL_EMAIL
  )
  const valentina = (profiles ?? []).find((p: any) =>
    p.email === process.env.VALENTINA_EMAIL
  )

  if (!cristobal || !valentina) {
    return NextResponse.json({ error: 'Perfiles no encontrados' }, { status: 500 })
  }

  const expensesList: Expense[] = (expenses ?? []).map((e: any) => ({
    ...e,
    payer_name: e.profiles?.name ?? 'Desconocido',
  }))

  const balance = calculateBalance(expensesList, cristobal.id, valentina.id)
  await sendMonthlySummaryEmail(balance, month, year)

  return NextResponse.json({ ok: true, month, year, totalExpenses: expensesList.length })
}
