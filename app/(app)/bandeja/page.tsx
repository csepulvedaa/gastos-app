'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { CardTransaction, Profile } from '@/types'
import TransactionCard from '@/components/transaction-card'
import TriageSheet from '@/components/triage-sheet'

export default function BandejaPage() {
  const [transactions, setTransactions] = useState<CardTransaction[]>([])
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [userId, setUserId] = useState('')
  const [loading, setLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)
  const [selected, setSelected] = useState<CardTransaction | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUserId(data.user.id)
    })
    supabase.from('profiles').select('id, name, email').then(({ data }) => {
      if (data) setProfiles(data as Profile[])
    })
  }, [])

  useEffect(() => {
    setLoading(true)
    fetch('/api/transactions')
      .then((r) => r.json())
      .then((data) => {
        setTransactions(Array.isArray(data) ? data : [])
        setLoading(false)
      })
  }, [refreshKey])

  const pending = transactions.filter((t) => t.status === 'pending')
  const processed = transactions.filter((t) => t.status !== 'pending')

  const currentUser = profiles.find((p) => p.id === userId)
  const otherUser = profiles.find((p) => p.id !== userId)

  function openSheet(tx: CardTransaction) {
    setSelected(tx)
    setSheetOpen(true)
  }

  return (
    <div className="p-4 space-y-6">
      <div className="pt-2">
        <h1 className="text-xl font-bold text-slate-800">Bandeja</h1>
        {!loading && (
          pending.length > 0
            ? <p className="text-sm text-amber-600 mt-0.5">{pending.length} pendiente{pending.length !== 1 ? 's' : ''}</p>
            : <p className="text-sm text-slate-400 mt-0.5">Todo al día ✓</p>
        )}
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400 text-sm">Cargando...</div>
      ) : transactions.length === 0 ? (
        <div className="text-center py-16 space-y-2 text-slate-400">
          <p className="text-4xl">📭</p>
          <p className="text-sm">No hay transacciones todavía.</p>
          <p className="text-xs">Corre el script de importación para ver tus compras aquí.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {pending.length > 0 && (
            <section className="space-y-2">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Pendientes</p>
              {pending.map((tx) => (
                <TransactionCard key={tx.id} transaction={tx} onClick={() => openSheet(tx)} />
              ))}
            </section>
          )}

          {processed.length > 0 && (
            <section className="space-y-2">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Procesados</p>
              {processed.map((tx) => (
                <TransactionCard key={tx.id} transaction={tx} onClick={() => openSheet(tx)} />
              ))}
            </section>
          )}
        </div>
      )}

      {currentUser && otherUser && (
        <TriageSheet
          transaction={selected}
          open={sheetOpen}
          onOpenChange={(open) => {
            setSheetOpen(open)
            if (!open) setSelected(null)
          }}
          onTriaged={() => setRefreshKey((k) => k + 1)}
          currentUser={currentUser}
          otherUser={otherUser}
        />
      )}
    </div>
  )
}
