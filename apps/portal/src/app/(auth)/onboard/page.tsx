'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { api } from '@/lib/api'
import { v2Enabled } from '@/lib/flags'
import { Send, Loader2 } from 'lucide-react'

interface ChatMessage {
  from: 'figsy' | 'user'
  text: string
}

type CollectedData = {
  company_name: string
  industry: string
  country: string
  website: string
}

// ── Scripted conversation steps ──────────────────────────────────────────────
const STEPS = [
  {
    field: 'company_name' as keyof CollectedData,
    message: () => "Hey! I'm FIGSY, your AI SDR at K.I.N.D.\n\nI'm about to find your first leads — but let me get to know you first. What's your company name?",
    placeholder: 'e.g. Acme Corp',
  },
  {
    field: 'industry' as keyof CollectedData,
    message: (d: CollectedData) => `Nice to meet you, ${d.company_name}! What does ${d.company_name} do? Tell me who you help and how — one sentence is perfect.`,
    placeholder: 'e.g. We help logistics companies automate billing',
  },
  {
    field: 'country' as keyof CollectedData,
    message: () => 'Love it. Which country are you based in — and where are your best customers?',
    placeholder: 'e.g. South Africa, Nigeria, UK…',
  },
  {
    field: 'website' as keyof CollectedData,
    message: () => "Almost done. What's your website? I'll scan it to pre-fill your ICP automatically.\n\nType 'skip' if you'd prefer to do it manually.",
    placeholder: "e.g. acme.co.za  —  or type 'skip'",
  },
]

// ── Typewriter hook ───────────────────────────────────────────────────────────
// speed = ms per character. ~70ms reads as a calm, deliberate type — slow enough
// to follow without feeling sluggish. Sentence boundaries pause a little longer.
function useTypewriter(text: string, speed = 70) {
  const [shown, setShown] = useState(0)
  useEffect(() => {
    setShown(0)
  }, [text])
  useEffect(() => {
    if (shown >= text.length) return
    // Pause longer at sentence boundaries for natural cadence
    const ch = text[shown]
    const pause = (ch === '.' || ch === '!' || ch === '?') ? speed * 6 : speed
    const t = setTimeout(() => setShown(n => Math.min(n + 1, text.length)), pause)
    return () => clearTimeout(t)
  }, [shown, text, speed])
  return { displayed: text.slice(0, shown), done: shown >= text.length }
}

// ── Main component ────────────────────────────────────────────────────────────
function OnboardChat() {
  const router        = useRouter()
  const searchParams  = useSearchParams()
  const supabase      = createClient()

  const referredBy = searchParams.get('ref') ||
    (typeof window !== 'undefined' ? localStorage.getItem('kind_referral') ?? '' : '')

  const [checking,    setChecking]    = useState(true)
  const [step,        setStep]        = useState(0)
  const [input,       setInput]       = useState('')
  const [history,     setHistory]     = useState<ChatMessage[]>([])
  const [collected,   setCollected]   = useState<CollectedData>({ company_name: '', industry: '', country: 'South Africa', website: '' })
  const [scanning,    setScanning]    = useState(false)
  const [submitting,  setSubmitting]  = useState(false)
  const [figsyLine,   setFigsyLine]   = useState(STEPS[0].message({} as CollectedData))
  const [error,       setError]       = useState('')
  const inputRef  = useRef<HTMLInputElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  const { displayed, done: typingDone } = useTypewriter(figsyLine)

  // Skip if already onboarded
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.replace('/login'); return }
      try {
        const res = await api.get<{ data: { id: string } | null }>('/clients/me/profile', session.access_token)
        if (res.data?.id) { router.replace('/dashboard'); return }
      } catch {}
      setChecking(false)
    }).catch(() => setChecking(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Focus input when step changes
  useEffect(() => {
    if (!checking) setTimeout(() => inputRef.current?.focus(), 100)
  }, [step, checking])

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [history, displayed])

  async function advance(value: string) {
    const fieldKey = STEPS[step].field
    const next: CollectedData = { ...collected, [fieldKey]: value }
    setCollected(next)

    // Add to history
    setHistory(h => [...h, { from: 'user', text: value }])
    setInput('')

    if (step < STEPS.length - 1) {
      // Move to next question
      const nextStep = step + 1
      setStep(nextStep)
      const nextMsg = STEPS[nextStep].message(next)
      setFigsyLine(nextMsg)
    } else {
      // Last step — website / skip
      const websiteValue = value.toLowerCase() === 'skip' ? '' : value

      if (websiteValue) {
        // Scan website
        setScanning(true)
        setFigsyLine(`Scanning ${websiteValue}…`)
        try {
          const { data: { session } } = await supabase.auth.getSession()
          const prefillRes = await api.post<{ data: Record<string, unknown> }>(
            '/icps/prefill', { website_url: websiteValue }, session?.access_token
          )
          localStorage.setItem('kind_icp_prefill', JSON.stringify(prefillRes.data))
        } catch {
          // Prefill failed — continue anyway
        }
        setScanning(false)
      }

      // Submit
      setFigsyLine("Done! Setting up your account now — one moment…")
      setSubmitting(true)
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) { router.push('/login'); return }
        // Item 186 — pass the T&C tick recorded at signup so consent is stored
        // on the client row at account creation (not only at first purchase).
        const termsAccepted = (() => { try { return localStorage.getItem('kind_terms_accepted') === '1' } catch { return false } })()
        await api.post('/auth/onboard', {
          company_name: next.company_name,
          industry:     next.industry,
          country:      next.country || 'South Africa',
          website:      websiteValue,
          phone:        '',
          ...(referredBy ? { referred_by: referredBy } : {}),
          ...(termsAccepted ? { terms_accepted: true } : {}),
        }, session.access_token)
        localStorage.removeItem('kind_referral')
        localStorage.removeItem('kind_terms_accepted')
        router.push('/dashboard')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong — please try again')
        setSubmitting(false)
        setFigsyLine("Hmm, something went wrong on my end. Mind trying again?")
      }
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const val = input.trim()
    if (!val || !typingDone || scanning || submitting) return
    advance(val)
  }

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #FFF5EE 0%, #FAF0FF 55%, #EDE6FF 100%)' }}>
        <Loader2 className="w-6 h-6 animate-spin text-[#7C3AED]" />
      </div>
    )
  }

  const currentPlaceholder = scanning || submitting ? '' : (STEPS[step]?.placeholder ?? 'Type your answer…')

  // ── Concept B · "The Spotlight" — centered, calm, premium first interaction ──
  // Same chat logic, presented as a single focused question card. Gated behind
  // FEATURE_V2_SCREENS=welcome; off by default → existing layout below.
  if (v2Enabled('welcome')) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center px-6 py-12"
        style={{ background: 'radial-gradient(1200px 600px at 50% -10%, #f1ebff, #ffffff 60%)' }}
      >
        <div className="w-full max-w-lg text-center">
          {/* Glowing avatar */}
          <div className="relative w-28 h-28 mx-auto mb-6">
            <div className="absolute inset-0 rounded-full blur-2xl opacity-40" style={{ background: '#7C3AED' }} />
            <div className="relative w-28 h-28 rounded-full overflow-hidden ring-4 ring-white shadow-xl">
              <img src="/agents/figsy.png" alt="FIGSY" className="w-full h-full object-cover object-top" />
            </div>
            <span className="absolute bottom-1 right-1 w-5 h-5 rounded-full bg-emerald-400 ring-4 ring-white" />
          </div>

          <p className="text-sm font-semibold tracking-wide" style={{ color: '#7C3AED' }}>FIGSY · The Opener</p>
          <h1 className="text-3xl font-bold text-gray-900 mt-2 leading-tight">Hey — let's find your<br />first leads together.</h1>
          <p className="text-gray-500 mt-3 mb-8 max-w-md mx-auto">I'm your AI SDR. Answer a few quick questions and I'll start building your pipeline today.</p>

          {/* Focused question card */}
          <div className="bg-white border border-purple-100/70 rounded-2xl shadow-sm p-6 text-left max-w-md mx-auto">
            <p className="text-[15px] font-semibold text-gray-900 leading-relaxed whitespace-pre-line min-h-[1.5rem]">
              {displayed}
              {!typingDone && <span className="inline-block w-0.5 h-4 bg-[#7C3AED]/60 animate-pulse ml-0.5 align-middle" />}
              {(scanning || submitting) && typingDone && <Loader2 className="w-3.5 h-3.5 animate-spin text-[#7C3AED] inline ml-1.5 align-middle" />}
            </p>
            <form onSubmit={handleSubmit} className="flex items-center gap-2 mt-4">
              <input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder={currentPlaceholder}
                disabled={!typingDone || scanning || submitting}
                className="flex-1 border border-gray-200 rounded-xl px-4 py-3.5 text-[15px] focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/30 focus:border-[#7C3AED] disabled:opacity-40"
              />
              <button
                type="submit"
                disabled={!input.trim() || !typingDone || scanning || submitting}
                className="px-5 h-12 rounded-xl flex items-center gap-2 text-white text-sm font-bold shrink-0 disabled:opacity-40"
                style={{ background: '#7C3AED' }}
              >
                Next <Send className="w-4 h-4" />
              </button>
            </form>
          </div>

          {/* Progress dots */}
          <div className="flex items-center justify-center gap-2 mt-7">
            {STEPS.map((_, i) => (
              <span key={i} className="rounded-full transition-all" style={{
                width: i === step ? 22 : 7, height: 7,
                background: i < step ? '#34d399' : i === step ? '#7C3AED' : '#d8cffa',
              }} />
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-3">Step {step + 1} of {STEPS.length} · No credit card to start</p>

          {error && <p className="mt-4 text-center text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2 max-w-md mx-auto">{error}</p>}

          <p className="text-center text-[11px] text-gray-400 mt-6">
            Already have an account? <a href="/login" className="text-[#7C3AED] font-medium hover:underline">Sign in</a>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-8 relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #FFF5EE 0%, #FAF0FF 55%, #EDE6FF 100%)' }}
    >
      {/* Floating dots */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
        {[
          { top: '4%',  left: '8%',  size: 5,  delay: '0s',    dur: '2.8s', color: '#A5B4FC', op: 0.55 },
          { top: '8%',  left: '28%', size: 3,  delay: '0.4s',  dur: '2.4s', color: '#C4B5FD', op: 0.45 },
          { top: '6%',  left: '58%', size: 7,  delay: '0.9s',  dur: '3.2s', color: '#A5B4FC', op: 0.5  },
          { top: '10%', left: '82%', size: 4,  delay: '0.2s',  dur: '2.6s', color: '#818CF8', op: 0.5  },
          { top: '18%', left: '5%',  size: 4,  delay: '1.3s',  dur: '3.5s', color: '#C4B5FD', op: 0.4  },
          { top: '22%', left: '44%', size: 6,  delay: '0.6s',  dur: '2.9s', color: '#A5B4FC', op: 0.55 },
          { top: '20%', left: '93%', size: 3,  delay: '1.8s',  dur: '2.5s', color: '#C4B5FD', op: 0.45 },
          { top: '32%', left: '18%', size: 8,  delay: '0.3s',  dur: '3.8s', color: '#A5B4FC', op: 0.4  },
          { top: '30%', left: '70%', size: 4,  delay: '1.1s',  dur: '2.7s', color: '#818CF8', op: 0.5  },
          { top: '38%', left: '90%', size: 5,  delay: '0.7s',  dur: '3.3s', color: '#A5B4FC', op: 0.45 },
          { top: '48%', left: '3%',  size: 3,  delay: '2.2s',  dur: '2.4s', color: '#C4B5FD', op: 0.5  },
          { top: '45%', left: '38%', size: 6,  delay: '0.5s',  dur: '3.1s', color: '#A5B4FC', op: 0.55 },
          { top: '50%', left: '76%', size: 4,  delay: '1.6s',  dur: '3.6s', color: '#818CF8', op: 0.45 },
          { top: '58%', left: '14%', size: 5,  delay: '0.8s',  dur: '2.8s', color: '#A5B4FC', op: 0.5  },
          { top: '62%', left: '52%', size: 3,  delay: '2s',    dur: '2.5s', color: '#C4B5FD', op: 0.45 },
          { top: '60%', left: '86%', size: 7,  delay: '0.4s',  dur: '3.4s', color: '#A5B4FC', op: 0.5  },
          { top: '70%', left: '30%', size: 4,  delay: '1.4s',  dur: '2.7s', color: '#818CF8', op: 0.55 },
          { top: '72%', left: '64%', size: 5,  delay: '0.6s',  dur: '3.2s', color: '#A5B4FC', op: 0.45 },
          { top: '75%', left: '96%', size: 3,  delay: '1.9s',  dur: '2.6s', color: '#C4B5FD', op: 0.5  },
          { top: '82%', left: '10%', size: 6,  delay: '1s',    dur: '3.7s', color: '#A5B4FC', op: 0.5  },
          { top: '85%', left: '42%', size: 4,  delay: '0.3s',  dur: '3s',   color: '#818CF8', op: 0.45 },
          { top: '88%', left: '74%', size: 5,  delay: '1.5s',  dur: '2.8s', color: '#A5B4FC', op: 0.55 },
          { top: '93%', left: '56%', size: 3,  delay: '2.3s',  dur: '2.4s', color: '#C4B5FD', op: 0.45 },
          { top: '2%',  left: '40%', size: 4,  delay: '0.8s',  dur: '3.1s', color: '#A5B4FC', op: 0.5  },
          { top: '28%', left: '56%', size: 5,  delay: '1.5s',  dur: '3.5s', color: '#C4B5FD', op: 0.45 },
          { top: '52%', left: '22%', size: 6,  delay: '1.9s',  dur: '2.9s', color: '#A5B4FC', op: 0.5  },
          { top: '40%', left: '50%', size: 3,  delay: '0.5s',  dur: '2.3s', color: '#818CF8', op: 0.55 },
          { top: '15%', left: '16%', size: 4,  delay: '1.2s',  dur: '3.3s', color: '#C4B5FD', op: 0.45 },
        ].map((dot, i) => (
          <div key={i} className="absolute rounded-full" style={{
            top: dot.top, left: dot.left, width: dot.size, height: dot.size,
            background: dot.color, opacity: dot.op,
            animation: `floatDot ${dot.dur} ease-in-out ${dot.delay} infinite alternate`,
          }} />
        ))}
      </div>
      <style>{`@keyframes floatDot{0%{transform:translateY(0) translateX(0)}25%{transform:translateY(-22px) translateX(10px)}75%{transform:translateY(-52px) translateX(-8px)}100%{transform:translateY(-72px) translateX(5px)}}`}</style>

      <div className="w-full max-w-sm relative z-10">

        {/* ── FIGSY card ──────────────────────────────────────────── */}
        <div className="rounded-3xl overflow-hidden shadow-2xl border border-purple-100/50 bg-white">

          {/* Photo — full head, clean (matches the canonical agent panel) */}
          <div className="relative h-64 bg-purple-50">
            <img
              src="/agents/figsy.png"
              alt="FIGSY"
              className="w-full h-full object-cover object-top"
            />
          </div>

          {/* Identity bar */}
          <div className="bg-[#0F0929] px-4 py-3 flex items-center justify-between">
            <div>
              <div className="flex items-baseline gap-2">
                <p className="text-white font-bold text-sm leading-tight">FIGSY</p>
                <span className="text-[#7C3AED] text-[11px] font-semibold">The Opener</span>
              </div>
              <p className="text-[#9B8EC4] text-[11px] mt-0.5">AI SDR · K.I.N.D</p>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[11px] font-medium text-emerald-400">Online</span>
            </div>
          </div>

          {/* Chat history */}
          <div className="bg-[#0F0929] px-4 pt-3 pb-1 space-y-3 max-h-56 overflow-y-auto">
            {history.map((msg, i) => (
              <div key={i} className={`flex ${msg.from === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.from === 'figsy' && (
                  <div className="w-5 h-5 rounded-full overflow-hidden shrink-0 mr-2 mt-0.5 ring-1 ring-white/20">
                    <img src="/agents/figsy.png" alt="" className="w-full h-full object-cover object-top" />
                  </div>
                )}
                <div className={`max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed whitespace-pre-line ${
                  msg.from === 'user'
                    ? 'bg-[#7C3AED] text-white rounded-br-sm'
                    : 'bg-white/[0.10] text-white/80 rounded-bl-sm'
                }`}>
                  {msg.text}
                </div>
              </div>
            ))}

            {/* Current FIGSY message with typewriter */}
            <div className="flex justify-start">
              <div className="w-5 h-5 rounded-full overflow-hidden shrink-0 mr-2 mt-0.5 ring-1 ring-white/20">
                <img src="/agents/figsy.png" alt="" className="w-full h-full object-cover object-top" />
              </div>
              <div className="max-w-[85%] rounded-xl rounded-bl-sm px-3 py-2 text-xs leading-relaxed bg-white/[0.10] text-white/80 whitespace-pre-line">
                {displayed}
                {!typingDone && (
                  <span className="inline-block w-0.5 h-3 bg-white/60 animate-pulse ml-0.5 align-middle" />
                )}
                {(scanning || submitting) && typingDone && (
                  <span className="inline-flex items-center gap-1 ml-1">
                    <Loader2 className="w-3 h-3 animate-spin text-purple-300/60 inline" />
                  </span>
                )}
              </div>
            </div>

            <div ref={bottomRef} />
          </div>

          {/* Step dots */}
          <div className="bg-[#0F0929] px-4 py-2 flex items-center gap-1.5 border-t border-white/[0.04]">
            {STEPS.map((_, i) => (
              <span
                key={i}
                className={`h-1 rounded-full transition-all duration-300 ${
                  i < step ? 'w-4 bg-emerald-400' :
                  i === step ? 'w-4 bg-[#7C3AED]' :
                  'w-1.5 bg-white/20'
                }`}
              />
            ))}
            <span className="ml-auto text-[10px] text-white/25">{step + 1} of {STEPS.length}</span>
          </div>

          {/* Input */}
          <form
            onSubmit={handleSubmit}
            className="flex items-center gap-2 px-3 py-3 bg-white border-t border-purple-100/40"
          >
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder={currentPlaceholder}
              disabled={!typingDone || scanning || submitting}
              className="flex-1 text-sm bg-gray-50 border border-purple-100/60 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/30 focus:border-[#7C3AED] disabled:opacity-40 text-gray-800 placeholder-gray-400"
            />
            <button
              type="submit"
              disabled={!input.trim() || !typingDone || scanning || submitting}
              className="w-9 h-9 bg-[#7C3AED] hover:bg-[#6D28D9] disabled:opacity-40 rounded-xl flex items-center justify-center transition-colors shrink-0"
            >
              <Send className="w-4 h-4 text-white" />
            </button>
          </form>
        </div>

        {error && (
          <p className="mt-3 text-center text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
        )}

        <p className="text-center text-[11px] text-gray-400 mt-4">
          Already have an account?{' '}
          <a href="/login" className="text-[#7C3AED] font-medium hover:underline">Sign in</a>
        </p>
      </div>
    </div>
  )
}

export default function OnboardPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #FFF5EE 0%, #FAF0FF 55%, #EDE6FF 100%)' }}>
        <Loader2 className="w-6 h-6 animate-spin text-[#7C3AED]" />
      </div>
    }>
      <OnboardChat />
    </Suspense>
  )
}
