import { GoogleGenerativeAI } from '@google/generative-ai'
import type { Category, SplitType } from '../../types/index.js'

export interface ParsedTransaction {
  merchant: string
  amount: number | null       // CLP; null si es moneda extranjera
  original_amount: number | null
  original_currency: string
  transaction_date: string    // YYYY-MM-DD
  transaction_time: string | null
  card_last4: string | null
  suggested_category: Category
  suggested_split: SplitType
}

const genai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
const model = genai.getGenerativeModel({ model: 'gemini-2.0-flash' })

const PROMPT_TEMPLATE = `
Eres un extractor de datos de emails del banco BCI de Chile.

EMAIL:
{EMAIL_BODY}

Formato del email BCI:
- "Número tarjeta crédito    ****XXXX"
- "Monto    USD 57,72"  o  "Monto    $ 42.990"
- "Fecha    DD/MM/YYYY"
- "Hora    HH:MM horas"
- "Comercio    nombre del comercio"

Extrae los datos. Limpia el nombre del comercio (capitaliza bien, quita texto basura como "LU" o códigos de país al final).

Sugiere split según tipo de comercio:
- "70_30": supermercado (Jumbo, Lider, Santa Isabel, Unimarc), farmacia, ferretería, hogar, cuentas, servicios básicos
- "50_50": restaurante, bar, café, pizza, cine, actividad en pareja, viaje
- "personal": Amazon, Aliexpress, ropa propia, apps, streaming, suscripciones, juegos, electrónica personal

Sugiere categoría:
- groceries: supermercado, minimarket, almacén
- dining: restaurante, delivery, café, bar, fast food
- transport: Uber, taxi, bencina, peaje, Transantiago, metro
- health: farmacia, médico, dentista, clínica
- entertainment: cine, concierto, juegos, streaming, apps de entretención
- utilities: luz, agua, gas, internet, teléfono
- travel: hotel, aerolínea, Booking, Airbnb
- other: cualquier otra cosa

Responde SOLO con JSON (sin markdown, sin texto extra):
{
  "merchant": "Nombre limpio",
  "amount": 42990,
  "original_amount": null,
  "original_currency": "CLP",
  "transaction_date": "YYYY-MM-DD",
  "transaction_time": "21:15",
  "card_last4": "0049",
  "suggested_category": "groceries",
  "suggested_split": "70_30"
}

Reglas:
- Si el monto es en CLP, pon "amount" como entero sin decimales ni puntos. original_amount y original_currency pueden ser null / "CLP".
- Si el monto es en USD u otra moneda, pon "amount": null, "original_amount": 57.72, "original_currency": "USD".
- La fecha en formato ISO: "DD/MM/YYYY" → "YYYY-MM-DD".
- Si el email NO es una notificación de compra (ej: publicidad, aviso de deuda), responde exactamente: null
`.trim()

export async function parseTransaction(emailBody: string): Promise<ParsedTransaction | null> {
  const prompt = PROMPT_TEMPLATE.replace('{EMAIL_BODY}', emailBody.slice(0, 3000))

  const result = await model.generateContent(prompt)
  const text = result.response.text().trim()

  if (text === 'null') return null

  // Strip markdown code fences if present
  const clean = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()

  try {
    return JSON.parse(clean) as ParsedTransaction
  } catch {
    console.warn('  ⚠  Gemini devolvió JSON inválido:', text.slice(0, 200))
    return null
  }
}
