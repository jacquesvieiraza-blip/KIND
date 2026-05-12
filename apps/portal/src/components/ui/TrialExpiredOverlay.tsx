'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { CreditCard, FileText, Clock } from 'lucide-react'

const EXEMPT = ['/dashboard/billing', '/dashboard/documents']

interface Props {
  expired: boolean
  orderFormSigned: boolean
}

export function TrialExpiredOverlay({ expired, orderFormSigned }: Props) {
  const pathname = usePathname()
  if (!expired || EXEMPT.some((p) => pathname.startsWith(p))) return null

  return (
    <div className="fixed inset-0 bg-white/95 backdrop-blur-sm z-40 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xl max-w-md w-full p-8 text-center">
        <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
          <Clock className="w-7 h-7 text-amber-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Your trial has ended</h2>
        {!orderFormSigned ? (
          <>
            <p className="text-gray-500 text-sm mb-6">
              To continue using K.I.N.D, please sign your Service Agreement and select a plan.
            </p>
            <div className="flex flex-col gap-3">
              <Link
                href="/dashboard/documents"
                className="w-full inline-flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-600 text-white font-medium rounded-xl px-5 py-3 text-sm transition-colors"
              >
                <FileText className="w-4 h-4" />Sign Service Agreement
              </Link>
              <Link
                href="/dashboard/billing"
                className="w-full inline-flex items-center justify-center gap-2 border border-gray-200 hover:border-brand-400 text-gray-600 hover:text-brand-600 font-medium rounded-xl px-5 py-3 text-sm transition-colors"
              >
                <CreditCard className="w-4 h-4" />View Plans
              </Link>
            </div>
          </>
        ) : (
          <>
            <p className="text-gray-500 text-sm mb-6">
              Your agreement is signed — complete payment to reactivate your account and keep your leads.
            </p>
            <Link
              href="/dashboard/billing"
              className="w-full inline-flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-600 text-white font-medium rounded-xl px-5 py-3 text-sm transition-colors"
            >
              <CreditCard className="w-4 h-4" />Choose a Plan
            </Link>
          </>
        )}
      </div>
    </div>
  )
}
