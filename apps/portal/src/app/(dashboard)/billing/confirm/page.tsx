'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { api } from '@/lib/api'
import { CheckCircle, XCircle, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { Suspense } from 'react'

function ConfirmContent() {
  const params    = useSearchParams()
  const reference = params.get('reference') || params.get('trxref')
  const supabase  = createClient()
  const [status, setStatus]   = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    async function verify() {
      if (!reference) { setStatus('error'); setMessage('No payment reference found.'); return }
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setStatus('error'); setMessage('Session expired. Please log in again.'); return }

      try {
        // #384/#431 — the only live purchase is FIGSY credit bundles; subscription
        // checkout is retired, so always verify as a credit top-up (the old code fell
        // through to a dead /subscriptions/verify when `type` wasn't 'credit', which is
        // what surfaced "Payment verification failed" on this orphaned return page).
        const res = await api.post<{ data: { credits_added: number; new_balance: number } }>(
          '/credits/verify', { reference }, session.access_token
        )
        setStatus('success')
        setMessage(`${res.data.credits_added} credits added. Your balance is now ${res.data.new_balance}.`)
      } catch (err: unknown) {
        setStatus('error')
        setMessage(err instanceof Error ? err.message : 'Payment verification failed. Please contact hello@get-kind.com.')
      }
    }
    verify()
  }, [reference])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-purple-100/60 shadow-sm p-10 max-w-md w-full text-center">
        {status === 'loading' && (
          <>
            <Loader2 className="w-12 h-12 animate-spin text-[#7C3AED] mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">Verifying payment…</h2>
            <p className="text-[#7B6FA0] text-sm">Please wait — this takes just a moment.</p>
          </>
        )}
        {status === 'success' && (
          <>
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Credits added!</h2>
            <p className="text-[#7B6FA0] text-sm mb-6">{message}</p>
            <Link href="/dashboard/billing"
              className="inline-flex items-center gap-2 bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-semibold px-6 py-3 rounded-xl text-sm transition-colors">
              View balance →
            </Link>
          </>
        )}
        {status === 'error' && (
          <>
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-8 h-8 text-red-500" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Something went wrong</h2>
            <p className="text-[#7B6FA0] text-sm mb-6">{message}</p>
            <div className="flex gap-3 justify-center">
              <Link href="/dashboard/billing" className="text-sm text-[#7C3AED] hover:underline font-medium">Try again</Link>
              <span className="text-gray-300">·</span>
              <a href="mailto:hello@get-kind.com" className="text-sm text-[#7B6FA0] hover:underline">Contact support</a>
            </div>
          </>
        )}
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
