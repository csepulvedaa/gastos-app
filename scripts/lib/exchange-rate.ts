// Converts USD to CLP using open.er-api.com (free, no key required, updates daily)
export async function usdToCLP(usdAmount: number): Promise<number> {
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/USD')
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    const rate: number = data.rates?.CLP
    if (!rate) throw new Error('CLP rate not found in response')
    return Math.round(usdAmount * rate)
  } catch (err) {
    console.warn('  ⚠  No se pudo obtener tipo de cambio USD/CLP:', (err as Error).message)
    return 0
  }
}
