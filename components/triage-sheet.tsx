'use client'

import { useState, useRef } from 'react'
import { ChevronLeft, Calendar } from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { CATEGORY_ICONS, CATEGORY_LABELS, SPLIT_LABELS, SPLIT_DESCRIPTIONS } from '@/lib/constants'
import { formatCLP } from '@/lib/balance'
import type { CardTransaction, Category, SplitType, Profile } from '@/types'

type Step = 'action' | 'personal-form' | 'shared-form'

interface Props {
  transaction: CardTransaction | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onTriaged: () => void
  currentUser: Profile
  otherUser: Profile
}

const SHARED_SPLITS: SplitType[] = ['70_30', '50_50', 'lent']

export default function TriageSheet({ transaction, open, onOpenChange, onTriaged, currentUser, otherUser }: Props) {
  const [step, setStep] = useState<Step>('action')
  const [loading, setLoading] = useState(false)
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState<Category>('other')
  const [split, setSplit] = useState<SplitType>('70_30')
  const [paidBy, setPaidBy] = useState(currentUser.id)
  const [date, setDate] = useState('')
  const [visibleInShared, setVisibleInShared] = useState(false)
  const dateRef = useRef<HTMLInputElement>(null)

  function initForm() {
    if (!transaction) return
    setDescription(transaction.merchant)
    setAmount(transaction.amount ? String(transaction.amount) : '')
    setCategory('other')
    setSplit('70_30')
    setPaidBy(currentUser.id)
    setDate(transaction.transaction_date)
    setVisibleInShared(false)
  }

  function handleOpenChange(open: boolean) {
    if (!open) setStep('action')
    onOpenChange(open)
  }

  async function patch(action: string, expenseData?: object) {
    if (!transaction) return
    setLoading(true)
    await fetch(`/api/transactions/${transaction.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, expenseData }),
    })
    setLoading(false)
    handleOpenChange(false)
    onTriaged()
  }

  async function handlePersonalSubmit(e: React.FormEvent) {
    e.preventDefault()
    const amountNum = parseInt(amount.replace(/\D/g, ''), 10)
    if (!amountNum) return
    await patch('personal', { description, amount: amountNum, expense_date: date, paid_by: currentUser.id, visible_in_shared: visibleInShared })
  }

  async function handleSharedSubmit(e: React.FormEvent) {
    e.preventDefault()
    const amountNum = parseInt(amount.replace(/\D/g, ''), 10)
    if (!amountNum) return
    await patch('shared', { description, amount: amountNum, category, split, expense_date: date, paid_by: paidBy })
  }

  if (!transaction) return null

  const isUSD = transaction.original_currency !== 'CLP'
  const amountDisplay = isUSD && transaction.original_amount
    ? `${transaction.original_currency} ${transaction.original_amount.toFixed(2)}`
    : transaction.amount
    ? formatCLP(transaction.amount)
    : '—'

  const dateLabel = new Date(transaction.transaction_date + 'T12:00:00').toLocaleDateString('es-CL', {
    day: 'numeric', month: 'long', year: 'numeric',
  })

  const DateField = ({ id }: { id: string }) => (
    <div className="space-y-1.5">
      <Label htmlFor={id}>Fecha</Label>
      <div
        className="flex h-10 w-full items-center rounded-md border border-input bg-background px-3 text-sm cursor-pointer"
        onClick={() => dateRef.current?.showPicker()}
      >
        <input
          ref={dateRef}
          id={id}
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
          className="flex-1 bg-transparent outline-none [color-scheme:light] [&::-webkit-calendar-picker-indicator]:hidden"
        />
        <Calendar className="h-4 w-4 text-slate-400 shrink-0 pointer-events-none" />
      </div>
    </div>
  )

  const USDWarning = () => isUSD ? (
    <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2">
      <p className="text-xs text-amber-700">
        Transacción en {transaction.original_currency} {transaction.original_amount?.toFixed(2)} — confirma el monto en CLP
      </p>
    </div>
  ) : null

  const BackButton = ({ to }: { to: Step }) => (
    <button
      type="button"
      onClick={() => setStep(to)}
      className="flex items-center gap-1 text-sm text-slate-400 hover:text-slate-600 mb-2 -ml-1"
    >
      <ChevronLeft size={16} /> Volver
    </button>
  )

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl pb-8 max-h-[90vh] overflow-y-auto" aria-describedby={undefined}>

        {step === 'action' && (
          <>
            <SheetHeader className="text-left mb-5">
              <SheetTitle className="text-base leading-tight">{transaction.merchant}</SheetTitle>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-bold text-slate-800">{amountDisplay}</span>
                {isUSD && transaction.amount && (
                  <span className="text-sm text-slate-400">≈ {formatCLP(transaction.amount)}</span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                {dateLabel}{transaction.card_last4 ? ` · ****${transaction.card_last4}` : ''}
              </p>
            </SheetHeader>

            <div className="space-y-3">
              <p className="text-sm font-medium text-slate-600">¿Qué hago con este gasto?</p>

              <button
                onClick={() => { initForm(); setStep('shared-form') }}
                className="w-full flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 text-left hover:bg-slate-50 active:bg-slate-100 transition-colors"
              >
                <span className="text-2xl">🤝</span>
                <div>
                  <p className="font-medium text-slate-800">Gasto compartido</p>
                  <p className="text-xs text-slate-400">Se suma al balance del mes</p>
                </div>
              </button>

              <button
                onClick={() => { initForm(); setStep('personal-form') }}
                className="w-full flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 text-left hover:bg-slate-50 active:bg-slate-100 transition-colors"
              >
                <span className="text-2xl">👤</span>
                <div>
                  <p className="font-medium text-slate-800">Gasto personal</p>
                  <p className="text-xs text-slate-400">Solo para mi registro, no afecta el balance</p>
                </div>
              </button>

              <button
                onClick={() => patch('ignored')}
                disabled={loading}
                className="w-full flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 text-left hover:bg-slate-50 active:bg-slate-100 transition-colors disabled:opacity-50"
              >
                <span className="text-xl text-slate-400">✕</span>
                <div>
                  <p className="font-medium text-slate-800">Ignorar</p>
                  <p className="text-xs text-slate-400">Ya registrado o no relevante</p>
                </div>
              </button>
            </div>
          </>
        )}

        {step === 'personal-form' && (
          <>
            <SheetHeader className="text-left mb-4">
              <BackButton to="action" />
              <SheetTitle className="text-base">Gasto personal</SheetTitle>
            </SheetHeader>

            <form onSubmit={handlePersonalSubmit} className="space-y-4">
              <USDWarning />

              <div className="space-y-1.5">
                <Label htmlFor="p-desc">Descripción</Label>
                <Input id="p-desc" value={description} onChange={(e) => setDescription(e.target.value)} required />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="p-amount">Monto CLP</Label>
                <Input id="p-amount" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} required />
              </div>

              <DateField id="p-date" />

              <label className="flex items-start gap-3 rounded-lg border border-slate-200 p-3 cursor-pointer hover:bg-slate-50 transition-colors">
                <input
                  type="checkbox"
                  checked={visibleInShared}
                  onChange={e => setVisibleInShared(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 accent-blue-600"
                />
                <div>
                  <p className="text-sm font-medium text-slate-800">Visible en historial compartido</p>
                  <p className="text-xs text-slate-400">Valentina lo puede ver, pero no afecta el balance</p>
                </div>
              </label>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Guardando...' : 'Guardar como personal'}
              </Button>
            </form>
          </>
        )}

        {step === 'shared-form' && (
          <>
            <SheetHeader className="text-left mb-4">
              <BackButton to="action" />
              <SheetTitle className="text-base">Gasto compartido</SheetTitle>
            </SheetHeader>

            <form onSubmit={handleSharedSubmit} className="space-y-4">
              <USDWarning />

              <div className="space-y-1.5">
                <Label htmlFor="s-desc">Descripción</Label>
                <Input id="s-desc" value={description} onChange={(e) => setDescription(e.target.value)} required />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="s-amount">Monto CLP</Label>
                <Input id="s-amount" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} required />
              </div>

              <div className="space-y-1.5">
                <Label>Categoría</Label>
                <Select value={category} onValueChange={(v) => setCategory(v as Category)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(CATEGORY_LABELS) as Category[]).map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {CATEGORY_ICONS[cat]} {CATEGORY_LABELS[cat]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>¿Cómo se divide?</Label>
                <RadioGroup value={split} onValueChange={(v) => setSplit(v as SplitType)} className="space-y-2">
                  {SHARED_SPLITS.map((s) => (
                    <Label
                      key={s}
                      htmlFor={`s-split-${s}`}
                      className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                        split === s ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <RadioGroupItem value={s} id={`s-split-${s}`} className="mt-0.5 shrink-0" />
                      <div className="space-y-0.5">
                        <p className="font-medium text-sm">{SPLIT_LABELS[s]}</p>
                        <p className="text-xs text-slate-500">{SPLIT_DESCRIPTIONS[s]}</p>
                      </div>
                    </Label>
                  ))}
                </RadioGroup>
              </div>

              <div className="space-y-1.5">
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

              <DateField id="s-date" />

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Guardando...' : 'Agregar a gastos compartidos'}
              </Button>
            </form>
          </>
        )}

      </SheetContent>
    </Sheet>
  )
}
