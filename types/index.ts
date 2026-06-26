export type SplitType = '70_30' | '50_50' | 'personal' | 'lent'

export type Category =
  | 'groceries'
  | 'rent'
  | 'utilities'
  | 'transport'
  | 'dining'
  | 'health'
  | 'entertainment'
  | 'travel'
  | 'other'

export interface Profile {
  id: string
  name: string
  email: string
}

export interface Expense {
  id: string
  paid_by: string
  payer_name: string
  amount: number
  description: string
  category: Category
  split: SplitType
  expense_date: string
  created_at: string
  installment_group_id?: string | null
  installment_index?: number | null
  installment_total?: number | null
}

export type CardTransactionStatus = 'pending' | 'added_shared' | 'added_personal' | 'ignored'

export interface CardTransaction {
  id: string
  user_id: string
  email_message_id: string
  merchant: string
  amount: number | null
  original_amount: number | null
  original_currency: string
  transaction_date: string
  transaction_time: string | null
  card_last4: string | null
  status: CardTransactionStatus
  expense_id: string | null
  created_at: string
}

export interface BalanceResult {
  totalSpent: number
  cristobalPaid: number
  valentinaPaid: number
  cristobalOwes: number
  valentinaOwes: number
  transferAmount: number
  transferDirection: 'cristobal_to_valentina' | 'valentina_to_cristobal' | 'settled'
}
