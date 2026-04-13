import { Resend } from 'resend'
import type { BalanceResult } from '@/types'
import { formatCLP } from '@/lib/balance'

function getResend() {
  return new Resend(process.env.RESEND_API_KEY!)
}

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

function buildEmailHTML(balance: BalanceResult, month: number, year: number): string {
  const monthName = MONTH_NAMES[month - 1]

  const transferLine =
    balance.transferDirection === 'settled'
      ? `<p style="color:#16a34a;font-size:18px;font-weight:bold;">✅ Están al día, no hay transferencias pendientes.</p>`
      : balance.transferDirection === 'valentina_to_cristobal'
      ? `<p style="font-size:18px;">💸 <strong>Valentina</strong> debe transferirle <strong style="color:#2563eb">${formatCLP(balance.transferAmount)}</strong> a <strong>Cristóbal</strong></p>`
      : `<p style="font-size:18px;">💸 <strong>Cristóbal</strong> debe transferirle <strong style="color:#2563eb">${formatCLP(balance.transferAmount)}</strong> a <strong>Valentina</strong></p>`

  return `
  <!DOCTYPE html>
  <html lang="es">
  <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
  <body style="font-family:system-ui,sans-serif;max-width:500px;margin:0 auto;padding:24px;color:#1e293b;">
    <h1 style="font-size:24px;margin-bottom:4px;">💰 Resumen de Gastos</h1>
    <p style="color:#64748b;margin-top:0;">${monthName} ${year}</p>

    <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0;">

    <table style="width:100%;border-collapse:collapse;">
      <tr>
        <td style="padding:8px 0;color:#64748b;">Total gastado</td>
        <td style="padding:8px 0;text-align:right;font-weight:600;">${formatCLP(balance.totalSpent)}</td>
      </tr>
      <tr>
        <td style="padding:8px 0;color:#64748b;">Cristóbal pagó</td>
        <td style="padding:8px 0;text-align:right;">${formatCLP(balance.cristobalPaid)}</td>
      </tr>
      <tr>
        <td style="padding:8px 0;color:#64748b;">Valentina pagó</td>
        <td style="padding:8px 0;text-align:right;">${formatCLP(balance.valentinaPaid)}</td>
      </tr>
      <tr>
        <td style="padding:8px 0;color:#64748b;">Le correspondía a Cristóbal</td>
        <td style="padding:8px 0;text-align:right;">${formatCLP(balance.cristobalOwes)}</td>
      </tr>
      <tr>
        <td style="padding:8px 0;color:#64748b;">Le correspondía a Valentina</td>
        <td style="padding:8px 0;text-align:right;">${formatCLP(balance.valentinaOwes)}</td>
      </tr>
    </table>

    <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0;">

    <div style="background:#f8fafc;border-radius:8px;padding:16px;text-align:center;">
      ${transferLine}
    </div>

    <p style="margin-top:24px;font-size:12px;color:#94a3b8;text-align:center;">
      Gastos App · ${monthName} ${year}
    </p>
  </body>
  </html>`
}

export async function sendMonthlySummaryEmail(
  balance: BalanceResult,
  month: number,
  year: number
) {
  const monthName = MONTH_NAMES[month - 1]
  const html = buildEmailHTML(balance, month, year)

  await getResend().emails.send({
    from: process.env.EMAIL_FROM!,
    to: [process.env.CRISTOBAL_EMAIL!, process.env.VALENTINA_EMAIL!],
    subject: `💰 Resumen Gastos ${monthName} ${year}`,
    html,
  })
}
