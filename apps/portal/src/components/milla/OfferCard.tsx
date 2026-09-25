'use client'
// ═══════════════════════════════════════════════════════════════════════════════════════
// ⚑ 25 Sep (R158 · R163) — "YOUR OFFER, IN YOUR WORDS": FOUR QUESTIONS, STRAIGHT AFTER CHOOSING.
//
// The founder: *"ask the client. what problems do you solve. what impact. have you seen an ROI.
// what is the solution."* Chosen: a card with four boxes, Milla introduces it, the client may skip,
// and a result is used in emails only with their tick. The answers feed the email writer.
// ═══════════════════════════════════════════════════════════════════════════════════════
import { useEffect, useState } from 'react'
import { useMillaConversation } from '@/components/milla/MillaConversation'
import { api } from '@/lib/api'
import { createClient } from '@/lib/supabase/client'

type Offer = {
  answered: boolean; skipped: boolean
  problems: string; impact: string; roi: string; roiMayQuote: boolean; solution: string
}

const QUESTIONS: { key: 'problems' | 'impact' | 'roi' | 'solution'; label: string; hint: string }[] = [
  { key: 'problems', label: 'What problems do you solve?', hint: 'The problem your customers come to you with, the way they would say it.' },
  { key: 'impact',   label: 'What does that problem cost them?', hint: 'Time, missed deals, money — what it does to their business if they leave it.' },
  { key: 'roi',      label: 'Have you seen a return for customers?', hint: 'A real result, e.g. "a client booked 12 meetings in their first month". Leave blank if you have none yet.' },
  { key: 'solution', label: 'What is your solution?', hint: 'What you do about it, in a sentence or two.' },
]

async function token() {
  const { data: { session } } = await createClient().auth.getSession()
  return session?.access_token
}

export default function OfferCard() {
  const { announceOnce } = useMillaConversation()
  const [offer, setOffer] = useState<Offer | null>(null)
  const [draft, setDraft] = useState({ problems: '', impact: '', roi: '', solution: '' })
  const [roiMayQuote, setRoiMayQuote] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<'saved' | 'skipped' | null>(null)

  useEffect(() => {
    let alive = true
    void (async () => {
      try {
        const r = await api.get<{ data: Offer }>('/my/programme/offer', await token())
        if (!alive || !r.data) return
        setOffer(r.data)
        setDraft({ problems: r.data.problems, impact: r.data.impact, roi: r.data.roi, solution: r.data.solution })
        setRoiMayQuote(r.data.roiMayQuote)
      } catch { /* an unreadable offer shows no card — it never blocks the programme */ }
    })()
    return () => { alive = false }
  }, [])

  const open = !!offer && !offer.answered && !offer.skipped && !done
  useEffect(() => {
    if (!open) return
    announceOnce('offer-intro', [
      'Four quick questions so your emails sound like you: the problem you solve, what it costs your customers, any result you’ve seen, and your solution. It takes two minutes, and you can skip it.',
    ])
  }, [open, announceOnce])

  if (done === 'saved') {
    return (
      <div className="mv-hero-card mt-3" data-testid="offer-saved">
        <div className="mv-eyebrow">Your offer</div>
        <p>Thank you — your emails will be written from your own words.{roiMayQuote ? ' We may mention the result you shared.' : ' We won’t mention any result unless you tick the box.'}</p>
      </div>
    )
  }
  if (!open) return null

  async function save() {
    setBusy(true); setError(null)
    try {
      await api.post('/my/programme/offer', { ...draft, roiMayQuote }, await token())
      setDone('saved')
    } catch (e) {
      setError(e instanceof Error && e.message.length < 200 ? e.message : 'Your answers could not be saved just now. Please try again.')
    } finally { setBusy(false) }
  }
  async function skip() {
    setBusy(true); setError(null)
    try { await api.post('/my/programme/offer/skip', {}, await token()); setDone('skipped') }
    catch { setError('That could not be saved just now. Please try again.') }
    finally { setBusy(false) }
  }

  return (
    <div className="mv-section mt-3" data-testid="offer-card">
      <div className="mv-section-head"><b>Your offer, in your words</b><span>2 minutes · optional</span></div>
      <div className="mv-section-body flex flex-col gap-3">
        {QUESTIONS.map(q => (
          <label key={q.key} className="block">
            <span className="block text-[13px] font-semibold">{q.label}</span>
            <span className="block text-[11.5px] text-[#9b8ec4] mb-1">{q.hint}</span>
            <textarea
              id={`offer-${q.key}`}
              value={draft[q.key]}
              maxLength={600}
              rows={2}
              onChange={e => setDraft(d => ({ ...d, [q.key]: e.target.value }))}
              className="w-full border border-[#e4dcf7] rounded-lg px-3 py-2 text-[13px]" />
            {q.key === 'roi' && (
              <span className="flex items-center gap-2 mt-1 text-[12px]">
                <input id="offer-roi-may-quote" type="checkbox" checked={roiMayQuote} onChange={e => setRoiMayQuote(e.target.checked)} />
                <span>You may mention this result in our emails.</span>
              </span>
            )}
          </label>
        ))}
        {error && <p className="text-[12.5px] text-red-700">{error}</p>}
        <div className="flex gap-2">
          <button onClick={() => void save()} disabled={busy}
            className="text-[13px] font-bold text-white bg-[#7C3AED] rounded-lg px-3 py-2 disabled:opacity-50">Save my answers</button>
          <button onClick={() => void skip()} disabled={busy}
            className="text-[13px] font-semibold text-[#6b5f8c] border border-[#e4dcf7] rounded-lg px-3 py-2 disabled:opacity-50">Skip for now</button>
        </div>
      </div>
    </div>
  )
}
