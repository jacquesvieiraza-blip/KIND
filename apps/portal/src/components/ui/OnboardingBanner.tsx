'use client'

import Link from 'next/link'
import { CreditCard, Clock, X } from 'lucide-react'
import { useState } from 'react'

type BannerState = 'awaiting_payment' | 'trial' | 'none'

interface Props {
  state: BannerState
  trialDaysLeft?: number
}

export function OnboardingBanner({ state, trialDaysLeft }: Props) {
  const [dismissed, setDismissed] = useState(false)
  if (state === 'none' || dismissed) return null

  const isUrgent = state === 'awaiting_payment' || (trialDaysLeft !== undefined && trialDaysLeft <= 3)

  const configs = {
    awaiting_payment: {
      bg:   'bg-amber-50 border-amber-200',
      icon: <CreditCard className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />,
      text: 'Your trial has ended — subscribe to keep your pipeline running.',
      sub:  'Your leads, ICP, and data are all saved. Subscribe in 2 minutes to continue.',
      cta:  <Link href="/dashboard/billing" className="inline-flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors">
              <CreditCard className="w-3.5 h-3.5" />Subscribe now
            </Link>,
      dismissable: false,
    },
    trial: {
      bg:   isUrgent ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200',
      icon: <Clock className={`w-5 h-5 shrink-0 mt-0.5 ${isUrgent ? 'text-red-500' : 'text-blue-500'}`} />,
      text: trialDaysLeft !== undefined
        ? `Trial: ${trialDaysLeft} day${trialDaysLeft !== 1 ? 's' : ''} remaining.`
        : 'You\'re on a free trial.',
      sub:  'Subscribe before your trial ends to keep full access. No manual signing — payment is all you need.',
      cta:  <Link href="/dashboard/billing" className="inline-flex items-center gap-1.5 bg-[#0066FF] hover:bg-[#0055dd] text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors">
              Subscribe now
            </Link>,
      dismissable: true,
    },
  }

  const cfg = configs[state]

  return (
    <div className={`border rounded-xl px-4 py-3.5 flex items-start justify-between gap-4 ${cfg.bg}`}>
      <div className="flex items-start gap-3 flex-1">
        {cfg.icon}
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-900">{cfg.text}</p>
          <p className="text-xs text-gray-500 mt-0.5">{cfg.sub}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {cfg.cta}
        {cfg.dismissable && (
          <button onClick={() => setDismissed(true)} className="p-1 hover:bg-black/5 rounded transition-colors">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        )}
      </div>
    </div>
  )
}
