'use client'

// ═══════════════════════════════════════════════════════════════════════════════════════
// THE PROGRAMME CALCULATOR — the client chooses their target, here, in Milla.
//
// ── WHAT THIS REPLACES ──────────────────────────────────────────────────────────────────
//
// Nothing on the client's side. The meeting target was typed by an OPERATOR into a Vida text
// box captioned "Meeting target", which rendered whenever the client had no programme — i.e.
// while they were still at Proof. The client never chose a number, and never saw the
// recommended lead volume at all: `/my/programme` did not even select it.
//
// The only calculator that existed was the marketing page on the retired $4-per-approved-lead
// model. This is not that, and it shares nothing with it.
//
// ── 🛑 THIS COMPONENT COMPUTES NO MONEY ─────────────────────────────────────────────────
//
// Every figure comes from `GET /my/programme/calculator`, which runs the shared
// `calculateProgramme` over the canonical pricing curve. There is no arithmetic here beyond
// formatting — a browser deriving a price is a second pricing engine with the client's own
// number attached, and the client would be shown one figure while the server stored another.
//
// ── THE TWO KINDS OF NUMBER, KEPT VISIBLY APART ─────────────────────────────────────────
//
// COMMITTED (ours, from the curve): the target, the lead volume, the price, the 50/50 split.
// ILLUSTRATIVE (their own guesses, worked through): estimated clients, revenue, the multiple.
// They are rendered in separate blocks with the illustrative one labelled, because a revenue
// figure sitting beside a real price reads as a promise unless something says otherwise.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { useCallback, useEffect, useMemo, useState } from 'react'
import { api } from '@/lib/api'
import { createClient } from '@/lib/supabase/client'
import { programmeMoney } from '@/lib/programme-money'

type Assumptions = { leadsPerMeeting: number; averageClientValue: number; meetingToClientPct: number }
type CalcResult = {
  meetings: number
  recommendedVolume: number
  totalCents: number
  firstPaymentCents: number
  secondPaymentCents: number
  effectiveCostPerMeetingCents: number
  estimatedClients: number
  estimatedRevenueCents: number
  revenueMultiple: number | null
  assumptions: Assumptions
}
type CalcPayload = {
  data: CalcResult
  target_note: string
  illustrative_note: string
  benchmark: { leadsPerMeeting: number; minLeadsPerMeeting: number }
}

async function token(): Promise<string | undefined> {
  try { const { data } = await createClient().auth.getSession(); return data.session?.access_token } catch { return undefined }
}

const LABEL = 'text-[11px] font-extrabold uppercase tracking-[0.08em] text-[#b3a9cc]'
const FIELD = 'w-full text-[14px] rounded-xl border border-[#e4dcf7] px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/30'

/** One committed figure. Digits line up, so a column of them can be compared at a glance. */
function Figure({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="min-w-0">
      <div className={LABEL}>{label}</div>
      <div className="text-[17px] font-extrabold text-[#1f1235] tabular-nums leading-tight mt-0.5">{value}</div>
      {hint && <div className="text-[11.5px] text-[#9b8ec4] mt-0.5 leading-snug">{hint}</div>}
    </div>
  )
}

export function ProgrammeCalculator({ onChosen }: { onChosen?: () => void }) {
  const [meetings, setMeetings] = useState(10)
  const [leadsPerMeeting, setLeadsPerMeeting] = useState<number | ''>('')
  const [value, setValue] = useState<number | ''>('')
  const [pct, setPct] = useState<number | ''>('')
  const [calc, setCalc] = useState<CalcPayload | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [chosen, setChosen] = useState(false)

  const query = useMemo(() => {
    const q = new URLSearchParams({ meetings: String(meetings) })
    if (leadsPerMeeting !== '') q.set('leadsPerMeeting', String(leadsPerMeeting))
    if (value !== '') q.set('averageClientValue', String(value))
    if (pct !== '') q.set('meetingToClientPct', String(pct))
    return q.toString()
  }, [meetings, leadsPerMeeting, value, pct])

  // ⚠️ THE QUOTE IS A READ AND WRITES NOTHING, so it is safe to re-run as the client moves the
  // slider. Nothing is created until they press the button below.
  useEffect(() => {
    let live = true
    ;(async () => {
      try {
        const r = await api.get<CalcPayload>(`/my/programme/calculator?${query}`, await token())
        if (live) { setCalc(r); setErr(null) }
      } catch (e) {
        if (live) setErr(e instanceof Error ? e.message : 'That did not load — try once more.')
      }
    })()
    return () => { live = false }
  }, [query])

  const choose = useCallback(async () => {
    setBusy(true); setErr(null)
    try {
      await api.post('/my/programme/choose', {
        meetings,
        ...(leadsPerMeeting !== '' ? { leadsPerMeeting } : {}),
        ...(value !== '' ? { averageClientValue: value } : {}),
        ...(pct !== '' ? { meetingToClientPct: pct } : {}),
      }, await token())
      setChosen(true)
      onChosen?.()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'That did not save — try once more.')
    } finally { setBusy(false) }
  }, [meetings, leadsPerMeeting, value, pct, onChosen])

  const d = calc?.data ?? null

  return (
    <section className="rounded-2xl border border-[#e4dcf7] bg-white p-4 sm:p-5">
      <div className={LABEL}>Your programme</div>
      <h2 className="text-[18px] font-extrabold text-[#1f1235] mt-0.5">How many meetings should this book?</h2>
      {/* 🛑 THE FOUNDER'S FRAMING, AND IT COMES FROM THE SERVER so a screen cannot soften it. */}
      <p className="text-[12.5px] text-[#5c5279] mt-1 leading-relaxed">{calc?.target_note}</p>

      {/* ── WHAT THEY CHOOSE ───────────────────────────────────────────────────────────── */}
      <div className="mt-4">
        <label htmlFor="calc-meetings" className={LABEL}>Targeted booked meetings</label>
        <div className="flex items-center gap-3 mt-1">
          <input id="calc-meetings" type="range" min={1} max={50} step={1} value={meetings}
            onChange={e => setMeetings(Number(e.target.value))}
            className="flex-1 accent-[#7C3AED]" />
          <input aria-label="Targeted booked meetings" type="number" min={1} max={500} value={meetings}
            onChange={e => setMeetings(Math.max(1, Number(e.target.value) || 1))}
            className="w-20 text-[15px] font-extrabold tabular-nums rounded-xl border border-[#e4dcf7] px-2.5 py-2 text-center" />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
        <div>
          <label htmlFor="calc-lpm" className={LABEL}>Leads per meeting</label>
          <input id="calc-lpm" type="number" className={`${FIELD} mt-1`}
            min={calc?.benchmark.minLeadsPerMeeting ?? 25} max={calc?.benchmark.leadsPerMeeting ?? 250}
            placeholder={String(calc?.benchmark.leadsPerMeeting ?? 250)}
            value={leadsPerMeeting}
            onChange={e => setLeadsPerMeeting(e.target.value === '' ? '' : Number(e.target.value))} />
          <div className="text-[11.5px] text-[#9b8ec4] mt-1">Our benchmark is {calc?.benchmark.leadsPerMeeting ?? 250}.</div>
        </div>
        <div>
          <label htmlFor="calc-value" className={LABEL}>A client is worth</label>
          <input id="calc-value" type="number" min={0} className={`${FIELD} mt-1`} placeholder="e.g. 25000"
            value={value} onChange={e => setValue(e.target.value === '' ? '' : Number(e.target.value))} />
          <div className="text-[11.5px] text-[#9b8ec4] mt-1">Your figure.</div>
        </div>
        <div>
          <label htmlFor="calc-pct" className={LABEL}>Meetings that become clients</label>
          <input id="calc-pct" type="number" min={0} max={100} className={`${FIELD} mt-1`} placeholder="e.g. 25"
            value={pct} onChange={e => setPct(e.target.value === '' ? '' : Number(e.target.value))} />
          <div className="text-[11.5px] text-[#9b8ec4] mt-1">Your figure, as a %.</div>
        </div>
      </div>

      {/* ── COMMITTED: OURS ────────────────────────────────────────────────────────────── */}
      {d && (
        <div className="mt-5 rounded-2xl border border-[#d9c4fb] bg-[#fcfaff] p-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Figure label="People we source" value={d.recommendedVolume.toLocaleString('en-US')} />
            <Figure label="Programme cost" value={programmeMoney(d.totalCents)} />
            <Figure label="Per meeting" value={programmeMoney(d.effectiveCostPerMeetingCents)} hint="at this size" />
            <Figure label="Target" value={`${d.meetings} meetings`} />
          </div>
          <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-[#ece5fb]">
            <Figure label="Payment 1 — now" value={programmeMoney(d.firstPaymentCents)} hint="starts the sourcing and preparation" />
            <Figure label="Payment 2 — later" value={programmeMoney(d.secondPaymentCents)} hint="after you approve the prepared programme" />
          </div>
        </div>
      )}

      {/* ── ILLUSTRATIVE: THEIRS, AND LABELLED ─────────────────────────────────────────── */}
      {d && d.revenueMultiple !== null && (
        <div className="mt-3 rounded-2xl border border-[#ece5fb] bg-[#faf8ff] p-4">
          <div className={LABEL}>If your own figures hold</div>
          <div className="grid grid-cols-3 gap-4 mt-1.5">
            <Figure label="Clients" value={d.estimatedClients.toLocaleString('en-US', { maximumFractionDigits: 1 })} />
            <Figure label="Revenue" value={programmeMoney(d.estimatedRevenueCents)} />
            <Figure label="Against cost" value={`${d.revenueMultiple.toLocaleString('en-US', { maximumFractionDigits: 1 })}×`} />
          </div>
          {/* 🛑 THE LABEL IS THE SERVER'S SENTENCE. A revenue figure beside a real price reads
              as a promise unless something says plainly that it is not one. */}
          <p className="text-[11.5px] text-[#9b8ec4] mt-2.5 leading-relaxed">{calc?.illustrative_note}</p>
        </div>
      )}

      {err && <p className="text-[12.5px] text-red-700 mt-3">{err}</p>}

      <button onClick={() => void choose()} disabled={busy || chosen || !d}
        className="w-full mt-4 text-[14px] font-bold text-white rounded-xl py-3 bg-gradient-to-br from-[#7C3AED] to-[#EC4899] disabled:opacity-50">
        {busy ? 'Saving…' : chosen ? 'Saved — your recommendation is below' : `Build my programme for ${d?.meetings ?? meetings} meetings`}
      </button>
      {/* ⚠️ IT SAYS WHAT THE PRESS DOES, AND WHAT IT DOES NOT. Choosing is free; the first
          payment is a separate, later step, and a button that felt like a checkout would be
          the "accepting WAS paying" shape this whole change removes. */}
      <p className="text-[11.5px] text-[#9b8ec4] mt-2 text-center">Nothing is charged by this — you will see the recommendation first.</p>
    </section>
  )
}

export default ProgrammeCalculator
