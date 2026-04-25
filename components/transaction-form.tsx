'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  TransactionType,
  TransactionCategory,
  INCOME_CATEGORIES,
  EXPENSE_CATEGORIES,
  CATEGORY_LABELS,
} from '@/lib/types'

interface TransactionFormProps {
  onSubmit: (data: {
    type: TransactionType
    category: TransactionCategory
    amount: number
    description: string
    date: string
  }) => void
}

export function TransactionForm({ onSubmit }: TransactionFormProps) {
  const [open, setOpen] = useState(false)
  const [type, setType] = useState<TransactionType>('expense')
  const [category, setCategory] = useState<TransactionCategory | ''>('')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])

  const categories = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!category || !amount) return

    onSubmit({
      type,
      category: category as TransactionCategory,
      amount: parseFloat(amount),
      description,
      date,
    })

    // Reset form
    setType('expense')
    setCategory('')
    setAmount('')
    setDescription('')
    setDate(new Date().toISOString().split('T')[0])
    setOpen(false)
  }

  const handleTypeChange = (newType: string) => {
    setType(newType as TransactionType)
    setCategory('')
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2 bg-accent hover:bg-accent/90 text-accent-foreground shadow-lg">
          <Plus className="size-4" />
          Add Transaction
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Transaction</DialogTitle>
          <DialogDescription>
            Record a new income or expense transaction.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Tabs value={type} onValueChange={handleTypeChange} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger
                value="income"
                className="data-[state=active]:bg-accent data-[state=active]:text-accent-foreground"
              >
                Income
              </TabsTrigger>
              <TabsTrigger
                value="expense"
                className="data-[state=active]:bg-destructive data-[state=active]:text-destructive-foreground"
              >
                Expense
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="space-y-2">
            <Label htmlFor="amount">Amount</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              className="text-lg font-semibold"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as TransactionCategory)}>
              <SelectTrigger>
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {CATEGORY_LABELS[cat]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Input
              id="description"
              placeholder="Enter a description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!category || !amount}
              className={type === 'income' ? 'bg-accent hover:bg-accent/90' : 'bg-destructive hover:bg-destructive/90'}
            >
              Add {type === 'income' ? 'Income' : 'Expense'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
