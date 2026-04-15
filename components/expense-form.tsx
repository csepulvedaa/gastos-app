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
import type { Category, SplitType, Profile } from '@/types'

const INSTALLMENT_OPTIONS = [2, 3, 6, 12]

const CATEGORIES = Object.keys(CATEGORY_LABELS) as Category[]
const SPLITS = Object.keys(SPLIT_LABELS) as SplitType[]

interface Props {
  currentUser: Profile
  otherUser: Profile
}

export default function ExpenseForm({ currentUser, otherUser }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const dateRef = useRef<HTMLInputElement>(null)
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<Category>('other')
  const [split, setSplit] = useState<SplitType>('70_30')
  const [paidBy, setPaidBy] = useState(currentUser.id)
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [isInstallment, setIsInstallment] = useState(false)
  const [installmentTotal, setInstallmentTotal] = useState(3)

  /** Returns YYYY-MM-01 for the next month — default start date for installments. */
  function nextMonthFirst(): string {
    const d = new Date()
    d.setDate(1)
    d.setMonth(d.getMonth() + 1)
    return d.toISOString().split('T')[0]
  }

  const [installmentStartDate, setInstallmentStartDate] = useState(nextMonthFirst)
  const installmentDateRef = useRef<HTMLInputElement>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    const amountNum = parseInt(amount.replace(/\D/g, ''), 10)
    if (!amountNum || amountNum <= 0) {
      setError('Ingresa un monto válido')
      return
    }

    setLoading(true)
    const res = await fetch('/api/expenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: amountNum,
        description,
        category,
        split,
        paid_by: paidBy,
        expense_date: isInstallment ? installmentStartDate : date,
        ...(isInstallment && { installment_total: installmentTotal }),
      }),
    })

    if (!res.ok) {
      setError('Error al guardar el gasto')
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 p-4">
      {/* Monto */}
      <div className="space-y-2">
        <Label htmlFor="amount">Monto ($)</Label>
        <Input
          id="amount"
          inputMode="numeric"
          placeholder="0"
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
          placeholder="Ej: Supermercado Jumbo"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
        />
      </div>

      {/* Categoría */}
      <div className="space-y-2">
        <Label>Categoría</Label>
        <Select value={category} onValueChange={(v) => setCategory(v as Category)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {CATEGORY_ICONS[cat]} {CATEGORY_LABELS[cat]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Quién pagó */}
      <div className="space-y-2">
        <Label>¿Quién pagó?</Label>
        <Select value={paidBy} onValueChange={setPaidBy}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={currentUser.id}>{currentUser.name} (yo)</SelectItem>
            <SelectItem value={otherUser.id}>{otherUser.name}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* División */}
      <div className="space-y-2">
        <Label>¿Cómo se divide?</Label>
        <RadioGroup value={split} onValueChange={(v) => setSplit(v as SplitType)} className="space-y-2">
          {SPLITS.map((s) => (
            <Label key={s} htmlFor={s} className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${split === s ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:bg-slate-50'}`}>
              <RadioGroupItem value={s} id={s} className="mt-0.5 shrink-0" />
              <div className="space-y-0.5">
                <p className="font-medium">{SPLIT_LABELS[s]}</p>
                <p className="text-xs text-slate-500">{SPLIT_DESCRIPTIONS[s]}</p>
              </div>
            </Label>
          ))}
        </RadioGroup>
      </div>

      {/* Fecha — only shown for regular (non-installment) expenses */}
      {!isInstallment && (
        <div className="space-y-2">
          <Label htmlFor="date">Fecha</Label>
          <div
            className="flex h-10 w-full items-center rounded-md border border-input bg-background px-3 text-sm cursor-pointer"
            onClick={() => dateRef.current?.showPicker()}
          >
            <input
              ref={dateRef}
              id="date"
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

      {/* Cuotas */}
      <div className="space-y-3">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={isInstallment}
            onChange={(e) => setIsInstallment(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 accent-blue-600"
          />
          <span className="text-sm font-medium text-slate-700">¿En cuotas?</span>
        </label>

        {isInstallment && (
          <div className="rounded-lg border border-blue-100 bg-blue-50 p-3 space-y-3">
            {amount && parseInt(amount.replace(/\D/g, ''), 10) > 0 && (
              <p className="text-sm font-medium text-blue-700 text-center">
                {installmentTotal} cuotas de{' '}
                <span className="font-bold">
                  ${Math.round(parseInt(amount.replace(/\D/g, ''), 10) / installmentTotal).toLocaleString('es-CL')}
                </span>
                /mes
              </p>
            )}
            <div className="space-y-2">
              <Label className="text-xs text-slate-500">Número de cuotas</Label>
              <div className="flex gap-2">
                {INSTALLMENT_OPTIONS.map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setInstallmentTotal(n)}
                    className={`flex-1 rounded-md border py-1.5 text-sm font-medium transition-colors ${
                      installmentTotal === n
                        ? 'border-blue-500 bg-blue-600 text-white'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {n}x
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="installment-start" className="text-xs text-slate-500">Primera cuota</Label>
              <div
                className="flex h-10 w-full items-center rounded-md border border-input bg-white px-3 text-sm cursor-pointer"
                onClick={() => installmentDateRef.current?.showPicker()}
              >
                <input
                  ref={installmentDateRef}
                  id="installment-start"
                  type="date"
                  value={installmentStartDate}
                  onChange={(e) => setInstallmentStartDate(e.target.value)}
                  required
                  className="flex-1 bg-transparent outline-none [color-scheme:light] [&::-webkit-calendar-picker-indicator]:hidden"
                />
                <Calendar className="h-4 w-4 text-slate-400 shrink-0 pointer-events-none" />
              </div>
              <p className="text-xs text-slate-400">
                Se registrarán {installmentTotal} cuotas, una por mes
              </p>
            </div>
          </div>
        )}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <Button type="submit" className="w-full" size="lg" disabled={loading}>
        {loading ? 'Guardando...' : 'Guardar gasto'}
      </Button>
    </form>
  )
}
