'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { createClient } from '@/lib/supabase/client'

// ⚑ 1 Oct (Coaching F6 · #2486 · R180) — YOUR SALES CONTEXT, on the existing Coaching page, in its
// existing card style (R167). What the client has already told Milla (the offer) is shown; the
// four new answers are editable. Saved beside the offer; used by the prep brief. Skippable.

const FIELDS = [
  { key: 'objections', label: 'Usual objections, and your answers', ph: 'e.g. "We tried something like this before" → we point to the Brightwater results.' },
  { key: 'lead_proof', label: 'Proof you lead with', ph: 'e.g. Brightwater cut planning time by 60% in six weeks.' },
  { key: 'decider',    label: 'Who usually decides', ph: 'e.g. Head of Operations, with Finance signing off.' },
  { key: 'won_deal',   label: 'What a won deal looks like', ph: 'e.g. A two-week pilot, then an annual contract.' },
] as const
type Key = typeof FIELDS[number]['key']
type Offer = { problems: string; impact: string; roi: string; roiMayQuote: boolean; solution: string }

async function token(): Promise<string | undefined> {
  try { const { data } = await createClient().auth.getSession(); return data.session?.access_token } catch { return undefined }
}

export default function SalesContextCard() {
  const [vals, setVals] = useState<Record<Key, string>>({ objections: '', lead_proof: '', decider: '', won_deal: '' })
  const [offer, setOffer] = useState<Offer | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    (async () => {
      try {
        const r = await api.get<{ data: { context: Record<Key, string>; offer: Offer } }>('/my/programme/sales-context', await token())
        setVals({ objections: r.data.context.objections, lead_proof: r.data.context.lead_proof, decider: r.data.context.decider, won_deal: r.data.context.won_deal })
        setOffer(r.data.offer)
      } catch { /* a help, never a gate — the card still opens empty */ }
      finally { setLoaded(true) }
    })()
  }, [])

  const save = async () => {
    setBusy(true); setError(null); setSaved(false)
    try { await api.post('/my/programme/sales-context', vals, await token()); setSaved(true) }
    catch (e) { setError(e instanceof Error ? e.message : 'We couldn’t save that just now. Nothing changed.') }
    finally { setBusy(false) }
  }

  if (!loaded) return null
  const known = offer ? [
    ['Problems you solve', offer.problems], ['The impact', offer.impact], ['Your solution', offer.solution],
    ['A result you’ve seen', offer.roi],
  ].filter(([, v]) => v) : []
  const answered = FIELDS.filter(f => vals[f.key].trim()).length

  return (
    <div className="bg-white border border-[#eee7f7] rounded-2xl p-4 sm:p-5 mb-3.5 max-w-3xl" data-testid="sales-context">
      <div className="flex items-start gap-3 flex-wrap">
        <div className="min-w-0">
          <b className="text-[15px] block leading-tight">Your sales context</b>
          <span className="text-[12.5px] text-[#9b8ec4]">How you sell, in your words. Milla uses it to prepare you for every meeting.</span>
        </div>
        <span className="ml-auto shrink-0 text-[12px] font-bold text-[#6d28d9] bg-[#f3ecff] border border-[#e4dcf7] rounded-full px-3 py-1">{answered} of 4 answered</span>
      </div>

      {known.length > 0 && (
        <div className="mt-3 bg-[#faf8ff] border border-[#f2ecfb] rounded-xl px-3.5 py-2.5">
          <span className="text-[10px] font-extrabold uppercase tracking-wide text-[#b3a9cc]">What you&apos;ve already told Milla</span>
          {known.map(([k, v]) => (
            <p key={k} className="text-[12.5px] text-[#4c4368] leading-relaxed mt-1"><b className="text-[#1f1235]">{k}:</b> {v}</p>
          ))}
        </div>
      )}

      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {FIELDS.map(f => (
          <label key={f.key} className="block">
            <span className="block text-[12px] font-semibold text-[#1f1235] mb-1">{f.label}</span>
            <textarea id={`sc-${f.key}`} rows={2} maxLength={600} value={vals[f.key]} placeholder={f.ph}
              onChange={e => { setVals(v => ({ ...v, [f.key]: e.target.value })); setSaved(false) }}
              className="w-full border border-[#e4dcf7] rounded-lg px-3 py-2 text-[12.5px] bg-white resize-y" />
          </label>
        ))}
      </div>
      {error && <p className="text-[12.5px] text-red-700 mt-2">{error}</p>}
      <div className="mt-3 flex gap-2 items-center flex-wrap">
        <button type="button" onClick={save} disabled={busy || answered === 0}
          className="text-[12.5px] font-extrabold text-white rounded-xl px-4 py-2.5 bg-gradient-to-br from-[#7C3AED] to-[#EC4899] disabled:opacity-60">
          {busy ? 'Saving…' : 'Save'}
        </button>
        <span className="text-[11.5px] text-[#9b8ec4]">{saved ? 'Saved. Your next prep brief uses it.' : 'Skip any of these. Nothing waits on them.'}</span>
      </div>
    </div>
  )
}
