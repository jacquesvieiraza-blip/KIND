'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Zap, CheckCircle, XCircle, Loader2, ShieldCheck } from 'lucide-react'

type ConsentState = 'prompt' | 'loading' | 'consent_given' | 'opted_out' | 'already_processed' | 'error'

function ConsentContent() {
  const searchParams = useSearchParams()
  const [state, setState] = useState<ConsentState>('loading')
  const [existingStatus, setExistingStatus] = useState<string | null>(null)

  const leadId = searchParams.get('lead')
  const token  = searchParams.get('token')

  useEffect(() => {
    if (!leadId || !token) { setState('error'); return }
    const consent = searchParams.get('consent')
    if (consent === null) { setState('prompt'); return }
    submitConsent(consent === 'true')
  }, [searchParams]) // eslint-disable-line react-hooks/exhaustive-deps

  function submitConsent(consent: boolean) {
    if (!leadId || !token) { setState('error'); return }
    setState('loading')
    const API = process.env.NEXT_PUBLIC_API_URL || 'https://kindapi-production-e64c.up.railway.app'
    fetch(`${API}/leads/public/consent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lead_id: leadId, token, consent }),
    })
      .then(r => r.json())
      .then((data: { success: boolean; already_processed?: boolean; status?: string }) => {
        if (!data.success) { setState('error'); return }
        if (data.already_processed) {
          setExistingStatus(data.status ?? null)
          setState('already_processed')
        } else {
          setState(data.status === 'consent_given' ? 'consent_given' : 'opted_out')
        }
      })
      .catch(() => setState('error'))
  }

  return (
    <main className="flex-1 flex items-center justify-center px-6 py-16">
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-purple-100/60 p-10 max-w-md w-full text-center">

        {state === 'prompt' && (
          <>
            <div className="w-14 h-14 rounded-2xl bg-[#7C3AED]/10 flex items-center justify-center mx-auto mb-5">
              <ShieldCheck className="w-7 h-7 text-[#7C3AED]" />
            </div>
            <h1 className="text-xl font-bold text-[#1E0A5C] mb-2">Permission to contact you</h1>
            <p className="text-[#7B6FA0] text-sm leading-relaxed mb-2">
              A company would like to reach out to you for a business conversation.
            </p>
            <p className="text-[#9B8EC4] text-xs leading-relaxed mb-7">
              Giving consent means they can send you a small number of relevant emails.
              You can opt out at any time by replying with &ldquo;unsubscribe&rdquo;.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => submitConsent(true)}
                className="flex-1 px-4 py-3 bg-[#7C3AED] text-white text-sm font-semibold rounded-xl hover:bg-[#6D28D9] transition-colors shadow-sm shadow-purple-500/20"
              >
                Yes, happy to connect
              </button>
              <button
                onClick={() => submitConsent(false)}
                className="flex-1 px-4 py-3 border border-purple-100 text-[#7B6FA0] text-sm font-medium rounded-xl hover:border-purple-300 hover:text-gray-700 transition-colors"
              >
                No thank you
              </button>
            </div>
            <p className="text-[10px] text-[#9B8EC4] mt-5 leading-relaxed">
              POPIA-compliant · Your data is never sold · Opt out any time
            </p>
          </>
        )}

        {state === 'loading' && (
          <>
            <Loader2 className="w-10 h-10 text-[#7C3AED] animate-spin mx-auto mb-4" />
            <p className="text-[#7B6FA0] text-sm">Recording your preference…</p>
          </>
        )}

        {state === 'consent_given' && (
          <>
            <div className="w-14 h-14 rounded-2xl bg-green-50 flex items-center justify-center mx-auto mb-5">
              <CheckCircle className="w-7 h-7 text-green-500" />
            </div>
            <h1 className="text-xl font-bold text-[#1E0A5C] mb-2">You&apos;re all set</h1>
            <p className="text-[#7B6FA0] text-sm leading-relaxed">
              Thank you for connecting. You&apos;ll hear from them soon — expect a short, relevant introduction.
            </p>
            <p className="text-xs text-[#9B8EC4] mt-6 leading-relaxed">
              Changed your mind? Just reply &ldquo;unsubscribe&rdquo; to any email and you&apos;ll be removed immediately.
            </p>
          </>
        )}

        {state === 'opted_out' && (
          <>
            <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center mx-auto mb-5">
              <XCircle className="w-7 h-7 text-gray-400" />
            </div>
            <h1 className="text-xl font-bold text-[#1E0A5C] mb-2">No problem at all</h1>
            <p className="text-[#7B6FA0] text-sm leading-relaxed">
              You&apos;ve been removed from their list. You won&apos;t hear from them again via K.I.N.D.
            </p>
            <p className="text-xs text-[#9B8EC4] mt-6">
              This opt-out applies to all future K.I.N.D-powered outreach.
            </p>
          </>
        )}

        {state === 'already_processed' && (
          <>
            <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-5">
              <CheckCircle className="w-7 h-7 text-blue-400" />
            </div>
            <h1 className="text-xl font-bold text-[#1E0A5C] mb-2">Already recorded</h1>
            <p className="text-[#7B6FA0] text-sm leading-relaxed">
              {existingStatus === 'consent_given'
                ? 'Your consent was already saved. No further action needed.'
                : 'You already opted out. Your details have been removed.'}
            </p>
          </>
        )}

        {state === 'error' && (
          <>
            <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-5">
              <XCircle className="w-7 h-7 text-red-400" />
            </div>
            <h1 className="text-xl font-bold text-[#1E0A5C] mb-2">Link not recognised</h1>
            <p className="text-[#7B6FA0] text-sm leading-relaxed">
              This link may have expired or already been used. If you received this in error,
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
    <div
      className="min-h-screen flex flex-col relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #FFF5EE 0%, #FAF0FF 55%, #EDE6FF 100%)' }}
    >
      {/* Floating dots */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
        {[
          { top: '10%', left: '8%',  size: 5, delay: '0s',   dur: '8s'  },
          { top: '20%', left: '85%', size: 4, delay: '1s',   dur: '9s'  },
          { top: '75%', left: '5%',  size: 6, delay: '0.5s', dur: '7s'  },
          { top: '80%', left: '90%', size: 4, delay: '2s',   dur: '10s' },
          { top: '50%', left: '95%', size: 3, delay: '1.5s', dur: '8s'  },
          { top: '40%', left: '3%',  size: 5, delay: '3s',   dur: '9s'  },
        ].map((dot, i) => (
          <div key={i} className="absolute rounded-full" style={{
            top: dot.top, left: dot.left, width: dot.size, height: dot.size,
            background: '#A5B4FC', opacity: 0.4,
            animation: `floatDot ${dot.dur} ease-in-out ${dot.delay} infinite alternate`,
          }} />
        ))}
      </div>
      <style>{`@keyframes floatDot{0%{transform:translateY(0)}100%{transform:translateY(-24px)}}`}</style>

      {/* Header */}
      <header className="relative z-10 px-8 py-5 flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-[#7C3AED] flex items-center justify-center shadow-sm shadow-purple-500/25">
          <Zap className="w-4 h-4 text-white" />
        </div>
        <span className="font-bold text-[#1E0A5C] text-sm">K.I.N.D</span>
      </header>

      <Suspense fallback={
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="w-10 h-10 text-[#7C3AED] animate-spin" />
        </main>
      }>
        <ConsentContent />
      </Suspense>

      <footer className="relative z-10 text-center py-6 text-xs text-[#9B8EC4]">
        Powered by K.I.N.D · POPIA-compliant B2B outreach
      </footer>
    </div>
  )
}
