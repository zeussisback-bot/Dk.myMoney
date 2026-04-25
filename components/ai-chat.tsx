'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Bot, User, Sparkles, Trash2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Transaction, CATEGORY_LABELS } from '@/lib/types'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
}

interface AIChatProps {
  transactions: Transaction[]
}

export function AIChat({ transactions }: AIChatProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const getFinancialContext = () => {
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

    const categoryTotals: Record<string, number> = {}
    monthlyTransactions.forEach((t) => {
      const label = CATEGORY_LABELS[t.category]
      if (!categoryTotals[label]) {
        categoryTotals[label] = 0
      }
      categoryTotals[label] += t.amount
    })

    const topCategories = Object.entries(categoryTotals)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([cat, amount]) => `${cat}: $${amount.toFixed(2)}`)
      .join(', ')

    return `Current month financial summary:
- Total Income: $${totalIncome.toFixed(2)}
- Total Expenses: $${totalExpense.toFixed(2)}
- Net Balance: $${(totalIncome - totalExpense).toFixed(2)}
- Transaction Count: ${monthlyTransactions.length}
- Top spending categories: ${topCategories || 'None yet'}
- Recent transactions: ${transactions.slice(0, 5).map(t => `${t.type === 'income' ? '+' : '-'}$${t.amount} (${CATEGORY_LABELS[t.category]})`).join(', ') || 'None yet'}`
  }

  const generateResponse = (userMessage: string): string => {
    const context = getFinancialContext()
    const lowerMessage = userMessage.toLowerCase()

    // Parse financial data
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

    // Smart responses based on user query
    if (lowerMessage.includes('balance') || lowerMessage.includes('how much')) {
      if (balance > 0) {
        return `Your current balance this month is **$${balance.toFixed(2)}**. Great job! You're spending less than you earn. Keep up the good financial habits!`
      } else if (balance < 0) {
        return `Your current balance this month is **-$${Math.abs(balance).toFixed(2)}**. You've spent more than your income. Consider reviewing your expenses and finding areas to cut back.`
      }
      return `Your balance is exactly $0 this month. You've spent exactly what you earned.`
    }

    if (lowerMessage.includes('spending') || lowerMessage.includes('expense')) {
      const categoryTotals: Record<string, number> = {}
      monthlyTransactions
        .filter((t) => t.type === 'expense')
        .forEach((t) => {
          const label = CATEGORY_LABELS[t.category]
          categoryTotals[label] = (categoryTotals[label] || 0) + t.amount
        })

      const sorted = Object.entries(categoryTotals).sort(([, a], [, b]) => b - a)
      
      if (sorted.length === 0) {
        return `You haven't recorded any expenses this month yet. Start tracking your spending to get insights!`
      }

      const topCategory = sorted[0]
      return `Your total spending this month is **$${totalExpense.toFixed(2)}**. Your top spending category is **${topCategory[0]}** at $${topCategory[1].toFixed(2)}. ${topCategory[1] > totalExpense * 0.4 ? 'This is quite a significant portion of your expenses - consider if there are ways to reduce spending here.' : 'Your spending seems well-distributed across categories.'}`
    }

    if (lowerMessage.includes('income') || lowerMessage.includes('earn')) {
      return `Your total income this month is **$${totalIncome.toFixed(2)}** from ${monthlyTransactions.filter(t => t.type === 'income').length} income transactions. ${totalIncome > totalExpense ? "You're on track with positive cash flow!" : 'Consider looking for additional income sources to improve your financial health.'}`
    }

    if (lowerMessage.includes('save') || lowerMessage.includes('saving')) {
      const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome * 100) : 0
      if (savingsRate > 20) {
        return `Excellent! You're saving **${savingsRate.toFixed(1)}%** of your income this month. Financial experts recommend saving at least 20%, so you're doing great!`
      } else if (savingsRate > 0) {
        return `You're currently saving **${savingsRate.toFixed(1)}%** of your income. Try to aim for at least 20% savings rate for better financial security.`
      }
      return `You're not currently saving any money this month. Consider reducing expenses or increasing income to build your savings.`
    }

    if (lowerMessage.includes('tip') || lowerMessage.includes('advice') || lowerMessage.includes('suggest')) {
      const tips = [
        'Try the 50/30/20 rule: 50% needs, 30% wants, 20% savings.',
        "Review subscriptions monthly - you might be paying for services you don't use.",
        'Set up automatic transfers to savings right after payday.',
        'Track every expense for a month to identify spending patterns.',
        'Build an emergency fund covering 3-6 months of expenses.',
      ]
      return `Here's a financial tip for you: **${tips[Math.floor(Math.random() * tips.length)]}**`
    }

    if (lowerMessage.includes('hello') || lowerMessage.includes('hi') || lowerMessage.includes('hey')) {
      return `Hello! I'm your personal finance assistant. I can help you understand your spending patterns, track your balance, and provide financial tips. What would you like to know about your finances?`
    }

    // Default contextual response
    return `Based on your financial data:\n\n${context}\n\nHow can I help you better understand your finances? You can ask me about your balance, spending habits, income, savings rate, or request financial tips!`
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input.trim(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    // Simulate AI thinking
    await new Promise((resolve) => setTimeout(resolve, 800))

    const response = generateResponse(userMessage.content)
    
    const assistantMessage: Message = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: response,
    }

    setMessages((prev) => [...prev, assistantMessage])
    setIsLoading(false)
  }

  const clearChat = () => {
    setMessages([])
  }

  return (
    <Card className="border-0 shadow-md flex flex-col h-[500px]">
      <CardHeader className="border-b bg-gradient-to-r from-primary/5 to-accent/5">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-accent/10">
              <Sparkles className="size-4 text-accent" />
            </div>
            AI Financial Assistant
          </CardTitle>
          {messages.length > 0 && (
            <Button variant="ghost" size="icon-sm" onClick={clearChat}>
              <Trash2 className="size-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6">
              <div className="p-4 rounded-full bg-accent/10 mb-4">
                <Bot className="size-8 text-accent" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Welcome to your AI Assistant!</h3>
              <p className="text-muted-foreground text-sm max-w-sm">
                Ask me anything about your finances. I can help you understand your spending, 
                track your balance, and provide personalized tips.
              </p>
              <div className="flex flex-wrap gap-2 mt-4 justify-center">
                {["What's my balance?", 'Spending analysis', 'Financial tips'].map((suggestion) => (
                  <Button
                    key={suggestion}
                    variant="outline"
                    size="sm"
                    onClick={() => setInput(suggestion)}
                    className="text-xs"
                  >
                    {suggestion}
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {message.role === 'assistant' && (
                    <div className="p-2 rounded-lg bg-accent/10 h-fit">
                      <Bot className="size-4 text-accent" />
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  </div>
                  {message.role === 'user' && (
                    <div className="p-2 rounded-lg bg-primary/10 h-fit">
                      <User className="size-4 text-primary" />
                    </div>
                  )}
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-3">
                  <div className="p-2 rounded-lg bg-accent/10 h-fit">
                    <Bot className="size-4 text-accent" />
                  </div>
                  <div className="bg-muted rounded-2xl px-4 py-3">
                    <div className="flex gap-1">
                      <span className="size-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="size-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="size-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
        <form onSubmit={handleSubmit} className="p-4 border-t bg-muted/30">
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about your finances..."
              disabled={isLoading}
              className="flex-1"
            />
            <Button type="submit" disabled={!input.trim() || isLoading} size="icon" className="bg-accent hover:bg-accent/90">
              <Send className="size-4" />
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
