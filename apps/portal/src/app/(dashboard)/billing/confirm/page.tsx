'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { api } from '@/lib/api'
import { CheckCircle, XCircle, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { Suspense } from 'react'

function ConfirmContent() {
  const params = useSearchParams()
  const reference = params.get('reference') || params.get('trxref')
  const supabase = createClient()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    async function verify() {
      if (!reference) { setStatus('error'); setMessage('No payment reference found.'); return }
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setStatus('error'); setMessage('Session expired. Please log in again.'); return }

      try {
        await api.post('/subscriptions/verify', { reference }, session.access_token)
        setStatus('success')
        setMessage('Your subscription is now active. Welcome aboard!')
      } catch (err: unknown) {
        setStatus('error')
        setMessage(err instanceof Error ? err.message : 'Payment verification failed. Please contact hello@kind.ai.')
      }
    }
    verify()
  }, [reference])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 max-w-md w-full text-center">
        {status === 'loading' && (
          <>
            <Loader2 className="w-12 h-12 animate-spin text-brand-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">Verifying payment…</h2>
            <p className="text-gray-500 text-sm">Please wait — this takes just a moment.</p>
          </>
        )}
        {status === 'success' && (
          <>
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Payment confirmed!</h2>
            <p className="text-gray-500 text-sm mb-6">{message}</p>
            <Link href="/dashboard"
              className="inline-flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white font-semibold px-6 py-3 rounded-xl text-sm transition-colors">
              Go to my dashboard →
            </Link>
          </>
        )}
        {status === 'error' && (
          <>
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-8 h-8 text-red-500" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Something went wrong</h2>
            <p className="text-gray-500 text-sm mb-6">{message}</p>
            <div className="flex gap-3 justify-center">
              <Link href="/dashboard/billing" className="text-sm text-brand-500 hover:underline font-medium">Try again</Link>
              <span className="text-gray-300">·</span>
              <a href="mailto:hello@kind.ai" className="text-sm text-gray-500 hover:underline">Contact support</a>
            </div>
          </>
        )}
        {reference && (
          <p className="text-xs text-gray-400 mt-6">Reference: {reference}</p>
        )}
      </div>
    </div>
  )
}

export default function BillingConfirmPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-brand-500" /></div>}>
      <ConfirmContent />
    </Suspense>
  )
}
