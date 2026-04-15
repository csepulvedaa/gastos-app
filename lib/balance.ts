import type { Expense, BalanceResult } from '@/types'

export function calculateBalance(
  expenses: Expense[],
  cristobalId: string,
  valentinaId: string
): BalanceResult {
  let cristobalPaid = 0
  let valentinaPaid = 0
  let cristobalOwes = 0
  let valentinaOwes = 0

  for (const expense of expenses) {
    const amount = expense.amount

    // Track who paid
    if (expense.paid_by === cristobalId) {
      cristobalPaid += amount
    } else if (expense.paid_by === valentinaId) {
      valentinaPaid += amount
    }

    // Calculate what each person should pay based on split
    if (expense.split === '70_30') {
      cristobalOwes += amount * 0.7
      valentinaOwes += amount * 0.3
    } else if (expense.split === '50_50') {
      cristobalOwes += amount * 0.5
      valentinaOwes += amount * 0.5
    } else if (expense.split === 'lent') {
      // Payer fronted the money; the other person owes 100%
      if (expense.paid_by === cristobalId) {
        valentinaOwes += amount
      } else {
        cristobalOwes += amount
      }
    } else {
      // personal: only the payer owes
      if (expense.paid_by === cristobalId) {
        cristobalOwes += amount
      } else {
        valentinaOwes += amount
      }
    }
  }

  // Positive balance = paid more than owed = others owe you
  const cristobalBalance = cristobalPaid - cristobalOwes
  const transferAmount = Math.abs(Math.round(cristobalBalance))

  let transferDirection: BalanceResult['transferDirection']
  if (transferAmount < 100) {
    transferDirection = 'settled'
  } else if (cristobalBalance > 0) {
    transferDirection = 'valentina_to_cristobal'
  } else {
    transferDirection = 'cristobal_to_valentina'
  }

  return {
    totalSpent: cristobalPaid + valentinaPaid,
    cristobalPaid: Math.round(cristobalPaid),
    valentinaPaid: Math.round(valentinaPaid),
    cristobalOwes: Math.round(cristobalOwes),
    valentinaOwes: Math.round(valentinaOwes),
    transferAmount,
    transferDirection,
  }
}

export function formatCLP(amount: number): string {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0,
  }).format(amount)
}
