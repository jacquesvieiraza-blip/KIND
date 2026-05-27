'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { CreditCard, Clock } from 'lucide-react'

const EXEMPT = ['/dashboard/billing']

interface Props {
  expired: boolean
}

export function TrialExpiredOverlay({ expired }: Props) {
  const pathname = usePathname()
  if (!expired || EXEMPT.some((p) => pathname.startsWith(p))) return null

  return (
    <div className="fixed inset-0 bg-white/95 backdrop-blur-sm z-40 flex items-center justify-center px-4">
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-purple-100/60 shadow-xl max-w-md w-full p-8 text-center">
        <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
          <Clock className="w-7 h-7 text-amber-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Your trial has ended</h2>
        <p className="text-[#7B6FA0] text-sm mb-6">
          Add credits to continue using K.I.N.D. Accept the terms &amp; conditions and complete your first purchase to reactivate your account.
        </p>
        <Link
          href="/dashboard/billing"
          className="w-full inline-flex items-center justify-center gap-2 bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-medium rounded-xl px-5 py-3 text-sm transition-colors"
        >
          <CreditCard className="w-4 h-4" />Add Credits &amp; Activate
        </Link>
      </div>
    </div>
  )
}
