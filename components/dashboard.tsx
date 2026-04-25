'use client'

import { useMemo } from 'react'
import { TrendingUp, TrendingDown, Wallet, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Transaction } from '@/lib/types'

interface DashboardProps {
  transactions: Transaction[]
}

export function Dashboard({ transactions }: DashboardProps) {
  const stats = useMemo(() => {
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

    return { totalIncome, totalExpense, balance, transactionCount: monthlyTransactions.length }
  }, [transactions])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount)
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card className="border-0 shadow-md bg-gradient-to-br from-card to-secondary/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-accent/10">
              <TrendingUp className="size-4 text-accent" />
            </div>
            Total Income
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end justify-between">
            <div className="text-2xl font-bold text-foreground">
              {formatCurrency(stats.totalIncome)}
            </div>
            <div className="flex items-center gap-1 text-xs text-accent">
              <ArrowUpRight className="size-3" />
              <span>This month</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-md bg-gradient-to-br from-card to-destructive/10">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-destructive/10">
              <TrendingDown className="size-4 text-destructive" />
            </div>
            Total Expenses
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end justify-between">
            <div className="text-2xl font-bold text-foreground">
              {formatCurrency(stats.totalExpense)}
            </div>
            <div className="flex items-center gap-1 text-xs text-destructive">
              <ArrowDownRight className="size-3" />
              <span>This month</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-md bg-gradient-to-br from-primary to-primary/80 text-primary-foreground">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-primary-foreground/80 flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary-foreground/20">
              <Wallet className="size-4 text-primary-foreground" />
            </div>
            Current Balance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end justify-between">
            <div className="text-2xl font-bold">
              {formatCurrency(stats.balance)}
            </div>
            <div className="text-xs text-primary-foreground/70">
              {stats.transactionCount} transactions
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
