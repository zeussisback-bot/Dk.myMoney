import { Transaction, ChatMessage } from './types'

const TRANSACTIONS_KEY = 'dk-mymoney-transactions'
const CHAT_KEY = 'dk-mymoney-chat'

export function getTransactions(): Transaction[] {
  if (typeof window === 'undefined') return []
  const stored = localStorage.getItem(TRANSACTIONS_KEY)
  return stored ? JSON.parse(stored) : []
}

export function saveTransactions(transactions: Transaction[]): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(transactions))
}

export function addTransaction(transaction: Omit<Transaction, 'id' | 'createdAt'>): Transaction {
  const transactions = getTransactions()
  const newTransaction: Transaction = {
    ...transaction,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  }
  transactions.unshift(newTransaction)
  saveTransactions(transactions)
  return newTransaction
}

export function deleteTransaction(id: string): void {
  const transactions = getTransactions()
  const filtered = transactions.filter((t) => t.id !== id)
  saveTransactions(filtered)
}

export function getChatHistory(): ChatMessage[] {
  if (typeof window === 'undefined') return []
  const stored = localStorage.getItem(CHAT_KEY)
  return stored ? JSON.parse(stored) : []
}

export function saveChatHistory(messages: ChatMessage[]): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(CHAT_KEY, JSON.stringify(messages))
}

export function addChatMessage(message: Omit<ChatMessage, 'id' | 'createdAt'>): ChatMessage {
  const messages = getChatHistory()
  const newMessage: ChatMessage = {
    ...message,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  }
  messages.push(newMessage)
  saveChatHistory(messages)
  return newMessage
}

export function clearChatHistory(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(CHAT_KEY)
}

export function getFinancialSummary() {
  const transactions = getTransactions()
  const now = new Date()
  const currentMonth = now.getMonth()
  const currentYear = now.getFullYear()

  const monthlyTransactions = transactions.filter((t) => {
    const date = new Date(t.date)
    return date.getMonth() === currentMonth && date.getFullYear() === currentYear
  })

  const totalIncome = monthlyTransactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0)

  const totalExpense = monthlyTransactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0)

  const balance = totalIncome - totalExpense

  const categoryTotals: Record<string, number> = {}
  monthlyTransactions.forEach((t) => {
    if (!categoryTotals[t.category]) {
      categoryTotals[t.category] = 0
    }
    categoryTotals[t.category] += t.amount
  })

  return {
    totalIncome,
    totalExpense,
    balance,
    categoryTotals,
    transactionCount: monthlyTransactions.length,
  }
}
