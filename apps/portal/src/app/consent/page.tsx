'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Zap, CheckCircle, XCircle, Loader2 } from 'lucide-react'

type ConsentState = 'loading' | 'consent_given' | 'opted_out' | 'already_processed' | 'error'

export default function ConsentPage() {
  const searchParams = useSearchParams()
  const [state, setState] = useState<ConsentState>('loading')
  const [existingStatus, setExistingStatus] = useState<string | null>(null)

  useEffect(() => {
    const leadId  = searchParams.get('lead')
    const token   = searchParams.get('token')
    const consent = searchParams.get('consent')

    if (!leadId || !token || consent === null) {
      setState('error')
      return
    }

    const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'

    fetch(`${API}/leads/public/consent`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ lead_id: leadId, token, consent: consent === 'true' }),
    })
      .then(r => r.json())
      .then((data: any) => {
        if (!data.success) { setState('error'); return }
        if (data.already_processed) {
          setExistingStatus(data.status)
          setState('already_processed')
        } else {
          setState(data.status === 'consent_given' ? 'consent_given' : 'opted_out')
        }
      })
      .catch(() => setState('error'))
  }, [searchParams])

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-100 px-8 py-4">
        <div className="flex items-center gap-2 font-bold text-gray-900 w-fit">
          <Zap className="w-5 h-5 text-[#0066FF]" />
          K.I.N.D
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 max-w-md w-full text-center">
          {state === 'loading' && (
            <>
              <Loader2 className="w-10 h-10 text-[#0066FF] animate-spin mx-auto mb-4" />
              <p className="text-gray-600 text-sm">Processing your request…</p>
            </>
          )}

          {state === 'consent_given' && (
            <>
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
              <h1 className="text-xl font-bold text-gray-900 mb-2">Consent recorded</h1>
              <p className="text-gray-600 text-sm leading-relaxed">
                Thank you — your consent has been saved. The company that shared your details
                may now reach out to you directly.
              </p>
              <p className="text-xs text-gray-400 mt-6">
                You can withdraw consent at any time by replying to any email you receive and asking to be removed.
              </p>
            </>
          )}

          {state === 'opted_out' && (
            <>
              <XCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h1 className="text-xl font-bold text-gray-900 mb-2">You've been removed</h1>
              <p className="text-gray-600 text-sm leading-relaxed">
                Your details have been removed from our system. You will not receive any further
                outreach from this company via K.I.N.D.
              </p>
              <p className="text-xs text-gray-400 mt-6">
                This opt-out applies to all future K.I.N.D-powered campaigns.
              </p>
            </>
          )}

          {state === 'already_processed' && (
            <>
              <CheckCircle className="w-12 h-12 text-blue-400 mx-auto mb-4" />
              <h1 className="text-xl font-bold text-gray-900 mb-2">Already processed</h1>
              <p className="text-gray-600 text-sm leading-relaxed">
                {existingStatus === 'consent_given'
                  ? 'Your consent was already recorded. No further action is needed.'
                  : 'You have already opted out. Your details have been removed from our system.'}
              </p>
            </>
          )}

          {state === 'error' && (
            <>
              <XCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
              <h1 className="text-xl font-bold text-gray-900 mb-2">Something went wrong</h1>
              <p className="text-gray-600 text-sm leading-relaxed">
                This link may be invalid or expired. If you believe this is a mistake,
                please reply directly to the email you received.
              </p>
            </>
          )}
        </div>
      </main>

      <footer className="text-center py-6 text-xs text-gray-400">
        Powered by K.I.N.D — POPIA-compliant lead generation
      </footer>
    </div>
  )
}
