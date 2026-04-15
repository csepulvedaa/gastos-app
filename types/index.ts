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

export interface BalanceResult {
  totalSpent: number
  cristobalPaid: number
  valentinaPaid: number
  cristobalOwes: number
  valentinaOwes: number
  transferAmount: number
  transferDirection: 'cristobal_to_valentina' | 'valentina_to_cristobal' | 'settled'
}
