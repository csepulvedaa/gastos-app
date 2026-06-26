#!/usr/bin/env npx tsx
/**
 * Script de autorización OAuth para Gmail — correr UNA SOLA VEZ.
 *
 * Prerequisitos:
 *   1. Crear proyecto en Google Cloud Console
 *   2. Habilitar Gmail API
 *   3. Crear credenciales OAuth 2.0 → Desktop App
 *   4. Descargar el JSON y guardarlo en scripts/credentials.json
 *
 * Uso:
 *   npx tsx scripts/auth-gmail.ts
 *
 * Al final imprime el GMAIL_REFRESH_TOKEN para agregar a .env.local
 */

import { google } from 'googleapis'
import * as readline from 'readline'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const credsPath = join(__dirname, 'credentials.json')

let creds: any
try {
  creds = JSON.parse(readFileSync(credsPath, 'utf-8'))
} catch {
  console.error('❌ No se encontró scripts/credentials.json')
  console.error('   Descárgalo desde Google Cloud Console → APIs & Services → Credentials')
  process.exit(1)
}

const { client_id, client_secret, redirect_uris } = creds.installed ?? creds.web
const auth = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0])

const authUrl = auth.generateAuthUrl({
  access_type: 'offline',
  prompt: 'consent',
  scope: ['https://www.googleapis.com/auth/gmail.readonly'],
})

console.log('\n📋 Pasos:')
console.log('   1. Abre esta URL en tu navegador:')
console.log('\n' + authUrl + '\n')
console.log('   2. Autoriza el acceso a tu cuenta de Gmail')
console.log('   3. Copia el código de autorización que aparece en la pantalla\n')

const rl = readline.createInterface({ input: process.stdin, output: process.stdout })

rl.question('Pega el código aquí: ', async (code) => {
  rl.close()
  try {
    const { tokens } = await auth.getToken(code.trim())
    console.log('\n✅ Autorización exitosa!')
    console.log('\nAgrega estas variables a tu .env.local:\n')
    console.log(`GMAIL_CLIENT_ID=${client_id}`)
    console.log(`GMAIL_CLIENT_SECRET=${client_secret}`)
    console.log(`GMAIL_REFRESH_TOKEN=${tokens.refresh_token}`)
    console.log('\n⚠  El refresh_token es secreto — no lo subas al repo.')
  } catch (err) {
    console.error('❌ Error al obtener tokens:', (err as Error).message)
    process.exit(1)
  }
})
