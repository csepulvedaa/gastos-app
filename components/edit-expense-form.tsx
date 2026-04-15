'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Calendar } from 'lucide-react'
import { CATEGORY_ICONS, CATEGORY_LABELS, SPLIT_LABELS, SPLIT_DESCRIPTIONS } from '@/lib/constants'
import type { Category, SplitType, Profile, Expense } from '@/types'

const CATEGORIES = Object.keys(CATEGORY_LABELS) as Category[]
const SPLITS = Object.keys(SPLIT_LABELS) as SplitType[]

interface Props {
  expense: Expense
  currentUser: Profile
  otherUser: Profile
}

export default function EditExpenseForm({ expense, currentUser, otherUser }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const isInstallment = !!expense.installment_total && expense.installment_total > 1
  const currentRemaining = isInstallment
    ? expense.installment_total! - expense.installment_index! + 1
    : 1

  // 'single' = edit only this record | 'group_forward' = this + all future in group
  const [scope, setScope] = useState<'single' | 'group_forward'>(
    isInstallment ? 'group_forward' : 'single'
  )

  const dateRef = useRef<HTMLInputElement>(null)
  const [amount, setAmount] = useState(String(expense.amount))
  const [description, setDescription] = useState(expense.description)
  const [category, setCategory] = useState<Category>(expense.category)
  const [split, setSplit] = useState<SplitType>(expense.split)
  const [paidBy, setPaidBy] = useState(expense.paid_by)
  const [date, setDate] = useState(expense.expense_date)
  const [remainingCount, setRemainingCount] = useState(currentRemaining)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    const amountNum = parseInt(amount.replace(/\D/g, ''), 10)
    if (!amountNum || amountNum <= 0) {
      setError('Ingresa un monto válido')
      return
    }

    setLoading(true)
    const body: Record<string, unknown> = {
      scope,
      amount: amountNum,
      description,
      category,
      split,
    }

    if (scope === 'single') {
      body.expense_date = date
      body.paid_by = paidBy
    } else {
      body.new_remaining_count = remainingCount
    }

    const res = await fetch(`/api/expenses/${expense.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error ?? 'Error al guardar')
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">

      {/* Scope toggle for installments */}
      {isInstallment && (
        <div className="flex rounded-lg border border-slate-200 overflow-hidden text-sm font-medium">
          <button
            type="button"
            onClick={() => setScope('group_forward')}
            className={`flex-1 py-2.5 transition-colors ${scope === 'group_forward' ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
          >
            Esta y las siguientes
          </button>
          <button
            type="button"
            onClick={() => setScope('single')}
            className={`flex-1 py-2.5 transition-colors ${scope === 'single' ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
          >
            Solo esta cuota
          </button>
        </div>
      )}

      {/* Monto */}
      <div className="space-y-2">
        <Label htmlFor="amount">
          {isInstallment && scope === 'group_forward' ? 'Monto por cuota ($)' : 'Monto ($)'}
        </Label>
        <Input
          id="amount"
          inputMode="numeric"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
          className="text-xl font-semibold"
        />
      </div>

      {/* Descripción */}
      <div className="space-y-2">
        <Label htmlFor="description">Descripción</Label>
        <Input
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
        />
      </div>

      {/* Categoría */}
      <div className="space-y-2">
        <Label>Categoría</Label>
        <Select value={category} onValueChange={(v) => setCategory(v as Category)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {CATEGORIES.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {CATEGORY_ICONS[cat]} {CATEGORY_LABELS[cat]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Quién pagó — solo editable en single */}
      {scope === 'single' && (
        <div className="space-y-2">
          <Label>¿Quién pagó?</Label>
          <Select value={paidBy} onValueChange={setPaidBy}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={currentUser.id}>{currentUser.name} (yo)</SelectItem>
              <SelectItem value={otherUser.id}>{otherUser.name}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* División */}
      <div className="space-y-2">
        <Label>¿Cómo se divide?</Label>
        <RadioGroup value={split} onValueChange={(v) => setSplit(v as SplitType)} className="space-y-2">
          {SPLITS.map((s) => (
            <Label key={s} htmlFor={`edit-${s}`} className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${split === s ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:bg-slate-50'}`}>
              <RadioGroupItem value={s} id={`edit-${s}`} className="mt-0.5 shrink-0" />
              <div className="space-y-0.5">
                <p className="font-medium">{SPLIT_LABELS[s]}</p>
                <p className="text-xs text-slate-500">{SPLIT_DESCRIPTIONS[s]}</p>
              </div>
            </Label>
          ))}
        </RadioGroup>
      </div>

      {/* Fecha — solo editable en single */}
      {scope === 'single' && (
        <div className="space-y-2">
          <Label htmlFor="edit-date">Fecha</Label>
          <div
            className="flex h-10 w-full items-center rounded-md border border-input bg-background px-3 text-sm cursor-pointer"
            onClick={() => dateRef.current?.showPicker()}
          >
            <input
              ref={dateRef}
              id="edit-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="flex-1 bg-transparent outline-none [color-scheme:light] [&::-webkit-calendar-picker-indicator]:hidden"
            />
            <Calendar className="h-4 w-4 text-slate-400 shrink-0 pointer-events-none" />
          </div>
        </div>
      )}

      {/* Cuotas restantes — solo en group_forward */}
      {isInstallment && scope === 'group_forward' && (
        <div className="rounded-lg border border-blue-100 bg-blue-50 p-3 space-y-2">
          <Label className="text-xs text-slate-500">
            Cuotas restantes (incluye esta · actualmente {currentRemaining})
          </Label>
          <Input
            type="number"
            min={1}
            value={remainingCount}
            onChange={(e) => setRemainingCount(Math.max(1, Number(e.target.value)))}
            className="bg-white"
          />
          {remainingCount !== currentRemaining && (
            <p className="text-xs text-blue-600">
              {remainingCount > currentRemaining
                ? `Se agregarán ${remainingCount - currentRemaining} cuota(s) al final`
                : `Se eliminarán ${currentRemaining - remainingCount} cuota(s) del final`}
            </p>
          )}
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-3">
        <Button type="button" variant="outline" className="flex-1" onClick={() => router.back()}>
          Cancelar
        </Button>
        <Button type="submit" className="flex-1" size="lg" disabled={loading}>
          {loading ? 'Guardando...' : 'Guardar cambios'}
        </Button>
      </div>
    </form>
  )
}
