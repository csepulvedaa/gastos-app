import type { Category, SplitType } from '@/types'

export const CRISTOBAL_EMAIL = process.env.CRISTOBAL_EMAIL!
export const VALENTINA_EMAIL = process.env.VALENTINA_EMAIL!

export const SPLIT_LABELS: Record<SplitType, string> = {
  '70_30': '70/30 (cuenta compartida)',
  '50_50': '50/50 (partes iguales)',
  personal: 'Personal (solo yo)',
}

export const SPLIT_DESCRIPTIONS: Record<SplitType, string> = {
  '70_30': 'Cristóbal 70% · Valentina 30%',
  '50_50': 'Cada uno paga la mitad',
  personal: 'No se divide',
}

export const CATEGORY_LABELS: Record<Category, string> = {
  groceries: 'Supermercado',
  rent: 'Arriendo',
  utilities: 'Servicios básicos',
  transport: 'Transporte',
  dining: 'Restaurante / Delivery',
  health: 'Salud',
  entertainment: 'Entretenimiento',
  travel: 'Viaje',
  other: 'Otro',
}

export const CATEGORY_ICONS: Record<Category, string> = {
  groceries: '🛒',
  rent: '🏠',
  utilities: '💡',
  transport: '🚗',
  dining: '🍽️',
  health: '🏥',
  entertainment: '🎬',
  travel: '✈️',
  other: '📦',
}
