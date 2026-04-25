export type TransactionType = 'income' | 'expense'

export type TransactionCategory =
  | 'salary'
  | 'freelance'
  | 'investment'
  | 'gift'
  | 'other_income'
  | 'food'
  | 'transport'
  | 'utilities'
  | 'entertainment'
  | 'shopping'
  | 'health'
  | 'education'
  | 'travel'
  | 'other_expense'

export interface Transaction {
  id: string
  type: TransactionType
  category: TransactionCategory
  amount: number
  description: string
  date: string
  createdAt: string
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: string
}

export const INCOME_CATEGORIES: TransactionCategory[] = [
  'salary',
  'freelance',
  'investment',
  'gift',
  'other_income',
]

export const EXPENSE_CATEGORIES: TransactionCategory[] = [
  'food',
  'transport',
  'utilities',
  'entertainment',
  'shopping',
  'health',
  'education',
  'travel',
  'other_expense',
]

export const CATEGORY_LABELS: Record<TransactionCategory, string> = {
  salary: 'Salary',
  freelance: 'Freelance',
  investment: 'Investment',
  gift: 'Gift',
  other_income: 'Other Income',
  food: 'Food & Dining',
  transport: 'Transport',
  utilities: 'Utilities',
  entertainment: 'Entertainment',
  shopping: 'Shopping',
  health: 'Health',
  education: 'Education',
  travel: 'Travel',
  other_expense: 'Other Expense',
}

export const CATEGORY_ICONS: Record<TransactionCategory, string> = {
  salary: 'Briefcase',
  freelance: 'Laptop',
  investment: 'TrendingUp',
  gift: 'Gift',
  other_income: 'Plus',
  food: 'UtensilsCrossed',
  transport: 'Car',
  utilities: 'Zap',
  entertainment: 'Film',
  shopping: 'ShoppingBag',
  health: 'Heart',
  education: 'GraduationCap',
  travel: 'Plane',
  other_expense: 'Minus',
}
