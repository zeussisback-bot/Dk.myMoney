'use client'

import { useState, useCallback } from 'react'
import { Download, FileText, Calendar } from 'lucide-react'
import { format, startOfMonth, endOfMonth, isWithinInterval, parseISO } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
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
import { Label } from '@/components/ui/label'
import { Transaction, CATEGORY_LABELS } from '@/lib/types'
import { Spinner } from '@/components/ui/spinner'

interface StatementDownloadProps {
  transactions: Transaction[]
}

export function StatementDownload({ transactions }: StatementDownloadProps) {
  const [open, setOpen] = useState(false)
  const [selectedMonth, setSelectedMonth] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)

  // Generate last 12 months options
  const monthOptions = Array.from({ length: 12 }, (_, i) => {
    const date = new Date()
    date.setMonth(date.getMonth() - i)
    return {
      value: format(date, 'yyyy-MM'),
      label: format(date, 'MMMM yyyy'),
    }
  })

  const generatePDF = useCallback(async () => {
    if (!selectedMonth) return

    setIsGenerating(true)

    // Small delay for UX
    await new Promise((resolve) => setTimeout(resolve, 300))

    const [year, month] = selectedMonth.split('-').map(Number)
    const monthStart = startOfMonth(new Date(year, month - 1))
    const monthEnd = endOfMonth(new Date(year, month - 1))

    const filteredTransactions = transactions.filter((t) => {
      const date = parseISO(t.date)
      return isWithinInterval(date, { start: monthStart, end: monthEnd })
    })

    const incomeTransactions = filteredTransactions.filter((t) => t.type === 'income')
    const expenseTransactions = filteredTransactions.filter((t) => t.type === 'expense')

    const totalIncome = incomeTransactions.reduce((sum, t) => sum + t.amount, 0)
    const totalExpense = expenseTransactions.reduce((sum, t) => sum + t.amount, 0)
    const netBalance = totalIncome - totalExpense

    // Sort transactions by date
    const sortedTransactions = [...filteredTransactions].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    )

    // Generate HTML content for printing/PDF
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Dk.myMoney E-Statement - ${format(monthStart, 'MMMM yyyy')}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1a1a1a; line-height: 1.5; }
          .header { background: linear-gradient(135deg, #1a365d 0%, #2d4a7c 100%); color: white; padding: 40px; }
          .header h1 { font-size: 28px; font-weight: 700; margin-bottom: 8px; }
          .header p { opacity: 0.9; font-size: 14px; }
          .content { padding: 40px; max-width: 800px; margin: 0 auto; }
          .period { margin-bottom: 30px; }
          .period h2 { font-size: 20px; color: #1a365d; margin-bottom: 8px; }
          .period p { color: #666; font-size: 13px; }
          .summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 40px; }
          .summary-card { background: #f8fafc; border-radius: 12px; padding: 20px; text-align: center; }
          .summary-card .label { font-size: 12px; color: #666; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; }
          .summary-card .value { font-size: 24px; font-weight: 700; }
          .summary-card.income .value { color: #22c55e; }
          .summary-card.expense .value { color: #ef4444; }
          .summary-card.balance .value { color: ${netBalance >= 0 ? '#22c55e' : '#ef4444'}; }
          .transactions h3 { font-size: 16px; color: #1a365d; margin-bottom: 16px; padding-bottom: 8px; border-bottom: 2px solid #e2e8f0; }
          .table { width: 100%; border-collapse: collapse; }
          .table th { background: #1a365d; color: white; padding: 12px 16px; text-align: left; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
          .table td { padding: 12px 16px; border-bottom: 1px solid #e2e8f0; font-size: 14px; }
          .table tr:nth-child(even) { background: #f8fafc; }
          .amount-income { color: #22c55e; font-weight: 600; }
          .amount-expense { color: #ef4444; font-weight: 600; }
          .footer { text-align: center; padding: 30px; color: #666; font-size: 12px; border-top: 1px solid #e2e8f0; margin-top: 40px; }
          .empty { text-align: center; padding: 40px; color: #666; }
          @media print {
            body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
            .header { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Dk.myMoney</h1>
          <p>Personal Money Tracker - E-Statement</p>
        </div>
        <div class="content">
          <div class="period">
            <h2>Statement Period</h2>
            <p>${format(monthStart, 'MMMM d, yyyy')} - ${format(monthEnd, 'MMMM d, yyyy')}</p>
            <p>Generated: ${format(new Date(), 'MMMM d, yyyy')}</p>
          </div>
          
          <div class="summary">
            <div class="summary-card income">
              <div class="label">Total Income</div>
              <div class="value">$${totalIncome.toFixed(2)}</div>
            </div>
            <div class="summary-card expense">
              <div class="label">Total Expenses</div>
              <div class="value">$${totalExpense.toFixed(2)}</div>
            </div>
            <div class="summary-card balance">
              <div class="label">Net Balance</div>
              <div class="value">${netBalance >= 0 ? '' : '-'}$${Math.abs(netBalance).toFixed(2)}</div>
            </div>
          </div>

          <div class="transactions">
            <h3>Transaction Details</h3>
            ${sortedTransactions.length > 0 ? `
              <table class="table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Category</th>
                    <th>Description</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  ${sortedTransactions.map(t => `
                    <tr>
                      <td>${format(parseISO(t.date), 'MM/dd/yyyy')}</td>
                      <td>${CATEGORY_LABELS[t.category]}</td>
                      <td>${t.description || '-'}</td>
                      <td class="${t.type === 'income' ? 'amount-income' : 'amount-expense'}">
                        ${t.type === 'income' ? '+' : '-'}$${t.amount.toFixed(2)}
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            ` : '<div class="empty">No transactions for this period.</div>'}
          </div>
        </div>
        <div class="footer">
          <p>Dk.myMoney E-Statement | Generated on ${format(new Date(), 'MMMM d, yyyy')}</p>
        </div>
      </body>
      </html>
    `

    // Open print dialog
    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(htmlContent)
      printWindow.document.close()
      printWindow.focus()
      
      // Wait for content to load then trigger print
      setTimeout(() => {
        printWindow.print()
      }, 250)
    }

    setIsGenerating(false)
    setOpen(false)
  }, [selectedMonth, transactions])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Card className="border-0 shadow-md cursor-pointer hover:shadow-lg transition-shadow bg-gradient-to-br from-card to-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-primary/10">
                <FileText className="size-4 text-primary" />
              </div>
              E-Statement
            </CardTitle>
            <CardDescription className="text-xs">
              Download your monthly statement
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" size="sm" className="w-full gap-2">
              <Download className="size-4" />
              Download PDF
            </Button>
          </CardContent>
        </Card>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="size-5 text-primary" />
            Download E-Statement
          </DialogTitle>
          <DialogDescription>
            Select a month to generate your financial statement. A print dialog will open where you can save as PDF.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Select Month</Label>
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a month" />
              </SelectTrigger>
              <SelectContent>
                {monthOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {selectedMonth && (
            <div className="p-3 rounded-lg bg-muted text-sm">
              <p className="text-muted-foreground">
                Your statement will include all transactions from{' '}
                <span className="font-medium text-foreground">
                  {monthOptions.find((m) => m.value === selectedMonth)?.label}
                </span>
              </p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={generatePDF}
            disabled={!selectedMonth || isGenerating}
            className="gap-2 bg-primary hover:bg-primary/90"
          >
            {isGenerating ? (
              <>
                <Spinner className="size-4" />
                Generating...
              </>
            ) : (
              <>
                <Download className="size-4" />
                Generate Statement
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
