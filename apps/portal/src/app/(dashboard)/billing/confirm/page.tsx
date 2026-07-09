'use client'

import { useSearchParams } from 'next/navigation'
import { CheckCircle, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { Suspense } from 'react'

// #384 — this used to POST /credits/verify, but that endpoint was removed with Paystack
// (#325): Stripe credit top-ups now land automatically via the webhook, and Stripe
// checkout returns to /dashboard/billing?stripe=success (stripe.ts:214), not here. So
// this page is a legacy return URL that must NOT call a dead endpoint (that was the
// guaranteed "Payment verification failed"). It's now a static acknowledgement — credits
// are applied server-side; the client just checks their balance on Billing.
function ConfirmContent() {
  const params    = useSearchParams()
  const reference = params.get('reference') || params.get('trxref')

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-purple-100/60 shadow-sm p-10 max-w-md w-full text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-8 h-8 text-green-500" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Payment received</h2>
        <p className="text-[#7B6FA0] text-sm mb-6">
          Your credits are added automatically — usually within a minute. Check your
          balance on the Billing page.
        </p>
        <Link href="/dashboard/billing"
          className="inline-flex items-center gap-2 bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-semibold px-6 py-3 rounded-xl text-sm transition-colors">
          View my balance →
        </Link>
        {reference && <p className="text-xs text-[#9B8EC4] mt-6">Reference: {reference}</p>}
      </div>
    </div>
  )
}

export default function BillingConfirmPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-[#7C3AED]" /></div>}>
      <ConfirmContent />
    </Suspense>
  )
}
