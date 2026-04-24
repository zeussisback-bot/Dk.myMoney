'use client'

import { Wallet } from 'lucide-react'

export function Header() {
  return (
    <header className="bg-primary text-primary-foreground shadow-lg">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center size-10 rounded-xl bg-accent">
            <Wallet className="size-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Dk.myMoney</h1>
            <p className="text-xs text-primary-foreground/70">Personal Money Tracker</p>
          </div>
        </div>
      </div>
    </header>
  )
}
