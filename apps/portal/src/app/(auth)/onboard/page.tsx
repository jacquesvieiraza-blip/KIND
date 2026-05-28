'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { api } from '@/lib/api'
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
function useTypewriter(text: string, speed = 38) {
  const [shown, setShown] = useState(0)
  useEffect(() => {
    setShown(0)
  }, [text])
  useEffect(() => {
    if (shown >= text.length) return
    // Pause slightly longer at sentence boundaries for natural cadence
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
        await api.post('/auth/onboard', {
          company_name: next.company_name,
          industry:     next.industry,
          country:      next.country || 'South Africa',
          website:      websiteValue,
          phone:        '',
          ...(referredBy ? { referred_by: referredBy } : {}),
        }, session.access_token)
        localStorage.removeItem('kind_referral')
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

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-8"
      style={{ background: 'linear-gradient(135deg, #FFF5EE 0%, #FAF0FF 55%, #EDE6FF 100%)' }}
    >
      <div className="w-full max-w-sm">

        {/* ── FIGSY card ──────────────────────────────────────────── */}
        <div className="rounded-2xl overflow-hidden shadow-xl border border-purple-100/40">

          {/* Photo */}
          <div className="relative h-52 bg-[#0F0929]">
            <img
              src="/agents/figsy.png"
              alt="FIGSY"
              className="w-full h-full object-cover object-top"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0F0929] via-[#0F0929]/10 to-transparent" />
          </div>

          {/* Identity bar */}
          <div className="bg-[#0F0929] px-4 py-3 flex items-center justify-between border-b border-white/[0.06]">
            <div>
              <p className="text-white font-bold text-sm leading-tight">FIGSY</p>
              <p className="text-[#9B8EC4] text-[11px]">AI SDR · K.I.N.D</p>
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
