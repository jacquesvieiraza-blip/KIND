'use client'

import Link from 'next/link'
import { AlertTriangle } from 'lucide-react'

export function LowCreditsNotice({ balance }: { balance: number }) {
  if (balance > 10) return null

  const isEmpty = balance === 0

  return (
    <div className={`border rounded-xl px-4 py-3.5 flex items-center justify-between gap-4 ${
      isEmpty ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'
    }`}>
      <div className="flex items-center gap-3">
        <AlertTriangle className={`w-4 h-4 shrink-0 ${isEmpty ? 'text-red-500' : 'text-amber-500'}`} />
        <div>
          <p className={`text-sm font-medium ${isEmpty ? 'text-red-900' : 'text-amber-900'}`}>
            {isEmpty ? 'You have no credits remaining — outreach is paused.' : `Low credits: ${balance} remaining.`}
          </p>
          <p className={`text-xs mt-0.5 ${isEmpty ? 'text-red-700' : 'text-amber-700'}`}>
            {isEmpty
              ? 'Top up now to resume your outreach pipeline.'
              : 'Top up before you run out to keep your pipeline running without interruption.'}
          </p>
        </div>
      </div>
      <Link
        href="/dashboard/billing"
        className={`shrink-0 text-xs font-semibold px-3 py-2 rounded-lg transition-colors ${
          isEmpty
            ? 'bg-red-600 hover:bg-red-700 text-white'
            : 'bg-amber-500 hover:bg-amber-600 text-white'
        }`}>
        Top up
      </Link>
    </div>
  )
}
