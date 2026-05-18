'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Zap, CheckCircle, XCircle, Loader2 } from 'lucide-react'

type ConsentState = 'prompt' | 'loading' | 'consent_given' | 'opted_out' | 'already_processed' | 'error'

function ConsentContent() {
  const searchParams = useSearchParams()
  const [state, setState] = useState<ConsentState>('loading')
  const [existingStatus, setExistingStatus] = useState<string | null>(null)

  const leadId = searchParams.get('lead')
  const token  = searchParams.get('token')

  useEffect(() => {
    if (!leadId || !token) {
      setState('error')
      return
    }
    const consent = searchParams.get('consent')
    // If no consent param, show the interactive prompt
    if (consent === null) {
      setState('prompt')
      return
    }
    submitConsent(consent === 'true')
  }, [searchParams]) // eslint-disable-line react-hooks/exhaustive-deps

  function submitConsent(consent: boolean) {
    if (!leadId || !token) { setState('error'); return }
    setState('loading')
    const API = process.env.NEXT_PUBLIC_API_URL || 'http://kindapi-production-e64c.up.railway.app'

    fetch(`${API}/leads/public/consent`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ lead_id: leadId, token, consent }),
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
  }

  return (
    <main className="flex-1 flex items-center justify-center px-6 py-16">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 max-w-md w-full text-center">
        {state === 'prompt' && (
          <>
            <Zap className="w-10 h-10 text-[#0066FF] mx-auto mb-4" />
            <h1 className="text-xl font-bold text-gray-900 mb-2">Data consent request</h1>
            <p className="text-gray-600 text-sm leading-relaxed mb-6">
              A company has shared your contact details with us for B2B outreach purposes.
              Do you consent to being contacted?
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => submitConsent(true)}
                className="flex-1 px-4 py-2.5 bg-[#0066FF] text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-colors"
              >
                Yes, I consent
              </button>
              <button
                onClick={() => submitConsent(false)}
                className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 text-sm font-medium rounded-xl hover:border-gray-400 transition-colors"
              >
                No, opt me out
              </button>
            </div>
          </>
        )}

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
  )
}

export default function ConsentPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-100 px-8 py-4">
        <div className="flex items-center gap-2 font-bold text-gray-900 w-fit">
          <Zap className="w-5 h-5 text-[#0066FF]" />
          K.I.N.D
        </div>
      </header>

      <Suspense fallback={
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="w-10 h-10 text-[#0066FF] animate-spin" />
        </main>
      }>
        <ConsentContent />
      </Suspense>

      <footer className="text-center py-6 text-xs text-gray-400">
        Powered by K.I.N.D — POPIA-compliant lead generation
      </footer>
    </div>
  )
}
