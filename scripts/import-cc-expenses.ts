#!/usr/bin/env npx tsx
/**
 * Importa transacciones de tarjeta BCI desde Gmail a Supabase (card_transactions).
 *
 * Uso:
 *   npx tsx scripts/import-cc-expenses.ts             # importa y guarda en Supabase
 *   npx tsx scripts/import-cc-expenses.ts --dry-run   # solo muestra, no guarda nada
 *   npx tsx scripts/import-cc-expenses.ts --hours 72  # busca en las últimas 72h (default: 48)
 */

import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
dotenv.config()
import { createClient } from '@supabase/supabase-js'
import { getBCIEmails } from './lib/gmail-client.js'
import { parseTransaction } from './lib/parse-transaction.js'
import { usdToCLP } from './lib/exchange-rate.js'

// ── Args ─────────────────────────────────────────────────────────────────────
const isDryRun = process.argv.includes('--dry-run')
const hoursIdx = process.argv.indexOf('--hours')
const hoursBack = hoursIdx !== -1 ? parseInt(process.argv[hoursIdx + 1], 10) : 48

// ── Supabase (service role para escribir sin auth de usuario) ─────────────────
function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local')
  return createClient(url, key)
}

// ── Helpers de display ────────────────────────────────────────────────────────
function formatCLP(amount: number) {
  return `$${amount.toLocaleString('es-CL')}`
}

function statusIcon(ok: boolean) {
  return ok ? '✅' : '❌'
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  const userId = process.env.CRISTOBAL_USER_ID
  if (!userId) throw new Error('Falta CRISTOBAL_USER_ID en .env.local')

  if (isDryRun) console.log('\n🔍 Modo dry-run — no se guardará nada en Supabase\n')

  console.log(`📬 Buscando emails de BCI en las últimas ${hoursBack}h...\n`)
  const emails = await getBCIEmails(hoursBack)

  if (!emails.length) {
    console.log('✅ No hay emails nuevos de contacto@bci.cl')
    return
  }

  console.log(`   Encontrados: ${emails.length} email(s)\n`)

  const supabase = isDryRun ? null : getSupabase()

  let imported = 0
  let skipped = 0
  let errors = 0

  for (const email of emails) {
    console.log(`─── ${email.subject || '(sin asunto)'}`)

    // Check deduplicación
    if (!isDryRun && supabase) {
      const { data: existing } = await supabase
        .from('card_transactions')
        .select('id, status')
        .eq('email_message_id', email.id)
        .maybeSingle()

      if (existing) {
        console.log(`   ⏭  Ya importado (status: ${existing.status})\n`)
        skipped++
        continue
      }
    }

    // Parsear con Gemini
    let tx
    try {
      tx = await parseTransaction(email.body)
    } catch (err) {
      console.error(`   ❌ Error en Gemini: ${(err as Error).message}\n`)
      errors++
      continue
    }

    if (!tx) {
      console.log('   ⏭  No es una notificación de compra, saltando.\n')
      skipped++
      continue
    }

    // Convertir USD si aplica
    let amountCLP = tx.amount
    if (tx.original_currency !== 'CLP' && tx.original_amount) {
      amountCLP = await usdToCLP(tx.original_amount)
      console.log(`   💱 ${tx.original_amount} ${tx.original_currency} ≈ ${formatCLP(amountCLP)}`)
    }

    // Display
    const displayAmount = amountCLP
      ? formatCLP(amountCLP)
      : `${tx.original_currency} ${tx.original_amount}`

    console.log(`   🏪 ${tx.merchant}`)
    console.log(`   💰 ${displayAmount}`)
    console.log(`   📅 ${tx.transaction_date}${tx.transaction_time ? ' · ' + tx.transaction_time : ''}`)
    console.log(`   🃏 ****${tx.card_last4 ?? '????'}`)
    console.log(`   🏷  ${tx.suggested_category} · ${tx.suggested_split}`)

    if (isDryRun) {
      console.log('   (dry-run: no guardado)\n')
      imported++
      continue
    }

    // Insertar en Supabase
    const { error } = await supabase!.from('card_transactions').insert({
      user_id: userId,
      email_message_id: email.id,
      merchant: tx.merchant,
      amount: amountCLP ?? null,
      original_amount: tx.original_amount ?? null,
      original_currency: tx.original_currency,
      transaction_date: tx.transaction_date,
      transaction_time: tx.transaction_time ?? null,
      card_last4: tx.card_last4 ?? null,
      status: 'pending',
    })

    if (error) {
      // Conflict en email_message_id = ya existe, no es un error real
      if (error.code === '23505') {
        console.log('   ⏭  Duplicado detectado por DB, saltando.\n')
        skipped++
      } else {
        console.error(`   ❌ Error Supabase: ${error.message}\n`)
        errors++
      }
    } else {
      console.log(`   ${statusIcon(true)} Guardado en bandeja (pending)\n`)
      imported++
    }
  }

  // Resumen final
  console.log('─'.repeat(40))
  console.log(`📊 Resumen: ${imported} importados · ${skipped} saltados · ${errors} errores`)
  if (!isDryRun && imported > 0) {
    console.log('\n👉 Abre /bandeja en la app para triar los gastos nuevos.')
  }
}

main().catch((err) => {
  console.error('\n💥 Error fatal:', err.message)
  process.exit(1)
})
