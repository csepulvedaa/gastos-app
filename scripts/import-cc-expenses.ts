#!/usr/bin/env npx tsx
/**
 * Imports bank card transactions from Gmail into Supabase (card_transactions).
 *
 * Usage:
 *   npm run import                          # Cristóbal, last 48h
 *   npm run import:valentina                # Valentina, last 48h
 *   npm run import -- --hours 72            # last 72h
 *   npm run import -- --dry-run             # preview, no writes
 *   npm run import -- --debug               # show email body on parse failure
 */

import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
dotenv.config()
import { createClient } from '@supabase/supabase-js'
import { getBankEmails } from './lib/gmail-client.js'
import { parseTransaction } from './lib/parse-transaction.js'
import { usdToCLP } from './lib/exchange-rate.js'

// ── Args ──────────────────────────────────────────────────────────────────────
const isDryRun = process.argv.includes('--dry-run')
const isDebug  = process.argv.includes('--debug')
const hoursIdx = process.argv.indexOf('--hours')
const hoursBack = hoursIdx !== -1 ? parseInt(process.argv[hoursIdx + 1], 10) : 48
const userIdx  = process.argv.indexOf('--user')
const userName = userIdx !== -1 ? process.argv[userIdx + 1] : 'cristobal'

// ── User configs ──────────────────────────────────────────────────────────────
const USER_CONFIGS: Record<string, {
  label: string
  getUserId: () => string
  getRefreshToken: () => string
  senders: string[]
}> = {
  cristobal: {
    label: 'Cristóbal',
    getUserId: () => process.env.CRISTOBAL_USER_ID ?? '',
    getRefreshToken: () => process.env.GMAIL_REFRESH_TOKEN ?? '',
    senders: ['contacto@bci.cl'],
  },
  valentina: {
    label: 'Valentina',
    getUserId: () => process.env.VALENTINA_USER_ID ?? '',
    getRefreshToken: () => process.env.GMAIL_REFRESH_TOKEN_VALENTINA ?? '',
    senders: ['contacto@mail.machbank.cl', 'enviodigital@bancochile.cl'],
  },
}

const userConfig = USER_CONFIGS[userName]
if (!userConfig) {
  console.error(`❌ Usuario desconocido: "${userName}". Opciones: cristobal, valentina`)
  process.exit(1)
}

// ── Supabase ──────────────────────────────────────────────────────────────────
function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY')
  return createClient(url, key)
}

function formatCLP(amount: number) {
  return `$${amount.toLocaleString('es-CL')}`
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  const userId = userConfig.getUserId()
  if (!userId) throw new Error(`Falta ${userName === 'cristobal' ? 'CRISTOBAL_USER_ID' : 'VALENTINA_USER_ID'} en .env.local`)

  const refreshToken = userConfig.getRefreshToken()
  if (!refreshToken) throw new Error(`Falta ${userName === 'cristobal' ? 'GMAIL_REFRESH_TOKEN' : 'GMAIL_REFRESH_TOKEN_VALENTINA'} en .env.local`)

  if (isDryRun) console.log('\n🔍 Modo dry-run — no se guardará nada en Supabase\n')
  console.log(`👤 Usuario: ${userConfig.label}`)
  console.log(`📬 Buscando emails de ${userConfig.senders.join(', ')} en las últimas ${hoursBack}h...\n`)

  const emails = await getBankEmails(userConfig.senders, hoursBack, refreshToken)

  if (!emails.length) {
    console.log(`✅ No hay emails nuevos de ${userConfig.senders.join(' / ')}`)
    return
  }

  console.log(`   Encontrados: ${emails.length} email(s)\n`)

  const supabase = isDryRun ? null : getSupabase()

  let imported = 0
  let skipped  = 0
  let errors   = 0

  for (const email of emails) {
    console.log(`─── ${email.subject || '(sin asunto)'}`)

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

    let tx
    try {
      tx = await parseTransaction(email.body)
    } catch (err) {
      console.error(`   ❌ Error en Gemini: ${(err as Error).message}\n`)
      errors++
      continue
    }

    if (!tx) {
      console.log('   ⏭  No es una notificación de compra, saltando.')
      if (isDebug) console.log('   [body]:\n' + email.body.slice(0, 800) + '\n   ---\n')
      else console.log()
      skipped++
      continue
    }

    if (!tx.merchant || !tx.transaction_date) {
      console.log('   ⚠  Gemini no extrajo datos — formato no reconocido.')
      if (isDebug) console.log('   [body]:\n' + email.body.slice(0, 800) + '\n   ---\n')
      else console.log('   Corre con --debug para ver el body del email.\n')
      skipped++
      continue
    }

    let amountCLP = tx.amount
    if (tx.original_currency !== 'CLP' && tx.original_amount) {
      amountCLP = await usdToCLP(tx.original_amount)
      console.log(`   💱 ${tx.original_amount} ${tx.original_currency} ≈ ${formatCLP(amountCLP)}`)
    }

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
      if (error.code === '23505') {
        console.log('   ⏭  Duplicado detectado por DB, saltando.\n')
        skipped++
      } else {
        console.error(`   ❌ Error Supabase: ${error.message}\n`)
        errors++
      }
    } else {
      console.log(`   ✅ Guardado en bandeja (pending)\n`)
      imported++
    }
  }

  console.log('─'.repeat(40))
  console.log(`📊 Resumen: ${imported} importados · ${skipped} saltados · ${errors} errores`)
  if (!isDryRun && imported > 0) {
    console.log('\n👉 Abre /bandeja en la app para triar los gastos nuevos.')
  }
}

main().catch(console.error)
