'use client'

import { useMemo } from 'react'
import { format } from 'date-fns'
import { Trash2, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Transaction, CATEGORY_LABELS } from '@/lib/types'

interface TransactionListProps {
  transactions: Transaction[]
  onDelete: (id: string) => void
}

export function TransactionList({ transactions, onDelete }: TransactionListProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount)
  }

  const groupedTransactions = useMemo(() => {
    const groups: Record<string, Transaction[]> = {}
    transactions.forEach((t) => {
      const dateKey = format(new Date(t.date), 'yyyy-MM-dd')
      if (!groups[dateKey]) {
        groups[dateKey] = []
      }
      groups[dateKey].push(t)
    })
    return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a))
  }, [transactions])

  if (transactions.length === 0) {
    return (
      <Card className="border-0 shadow-md">
        <CardContent className="py-12">
          <div className="text-center text-muted-foreground">
            <p className="text-lg font-medium">No transactions yet</p>
            <p className="text-sm">Add your first transaction to get started!</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-0 shadow-md">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Recent Transactions</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[400px]">
          <div className="px-6 pb-6 space-y-6">
            {groupedTransactions.map(([dateKey, dayTransactions]) => (
              <div key={dateKey}>
                <div className="sticky top-0 bg-card py-2 mb-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {format(new Date(dateKey), 'EEEE, MMMM d, yyyy')}
                  </p>
                </div>
                <div className="space-y-2">
                  {dayTransactions.map((transaction) => (
                    <div
                      key={transaction.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors group"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`p-2 rounded-lg ${
                            transaction.type === 'income'
                              ? 'bg-accent/10 text-accent'
                              : 'bg-destructive/10 text-destructive'
                          }`}
                        >
                          {transaction.type === 'income' ? (
                            <ArrowUpRight className="size-4" />
                          ) : (
                            <ArrowDownRight className="size-4" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-sm">
                            {transaction.description || CATEGORY_LABELS[transaction.category]}
                          </p>
                          <Badge variant="secondary" className="text-xs mt-1">
                            {CATEGORY_LABELS[transaction.category]}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span
                          className={`font-semibold ${
                            transaction.type === 'income' ? 'text-accent' : 'text-destructive'
                          }`}
                        >
                          {transaction.type === 'income' ? '+' : '-'}
                          {formatCurrency(transaction.amount)}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => onDelete(transaction.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
