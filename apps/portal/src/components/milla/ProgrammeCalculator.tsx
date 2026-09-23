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
  /** R136 ② — the best-efforts disclaimer, shown where they commit. Names no number. */
  best_efforts_note?: string
  /** R136 ⑥ — what to do when they want more than their targeting reaches. */
  widen_note?: string
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

/**
 * 🛑 ⚑ 23 Sep (R136 ⑥) — WHAT THE POOL CARRIES, READ ONCE.
 *
 * Its own call, not part of the quote: the quote is pure arithmetic and re-runs on every slider
 * movement, while this costs a provider round trip. `known: false` means we could not ask —
 * the control is then left uncapped rather than capping a paying client at nothing because a
 * vendor was slow.
 */
type Capacity = { committed: number; known: boolean }

/** The ceiling the control stops at, or `null` when we have no trustworthy answer. */
function capOf(c: Capacity | null): number | null {
  return c && c.known && c.committed > 0 ? c.committed : null
}

export function ProgrammeCalculator({ onChosen }: { onChosen?: () => void }) {
  const [meetings, setMeetings] = useState(10)
  const [capacity, setCapacity] = useState<Capacity | null>(null)
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

  // ⚠️ ONCE PER SCREEN, NOT PER KEYSTROKE — `[]`, deliberately. A provider call behind every
  // slider movement is the cost this split exists to avoid. A failure leaves `capacity` null,
  // which reads as "we do not know" and caps nothing.
  useEffect(() => {
    let live = true
    ;(async () => {
      try {
        const r = await api.get<{ data: Capacity }>('/my/programme/capacity', await token())
        if (live) setCapacity(r.data)
      } catch { /* silent — an unknown capacity must not cap, and must not shout */ }
    })()
    return () => { live = false }
  }, [])

  const cap = capOf(capacity)

  // 🛑 THE CONTROL CANNOT EXCEED WHAT THE POOL CARRIES. Clamping here as well as on the inputs
  // is what makes a capacity arriving AFTER the client has already typed a larger number pull
  // them back down, rather than leaving a stale over-target sitting in a box that now has a
  // lower maximum.
  useEffect(() => {
    if (cap !== null && meetings > cap) setMeetings(cap)
  }, [cap, meetings])

  const atCeiling = cap !== null && meetings >= cap

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
        {/* ── 🛑 ⚑ 23 Sep (R136 ⑥) — THE CONTROL STOPS WHERE THE POOL DOES ─────────────────
             ⛓️ WAS: ~~`max={50}` on the slider and `max={500}` on the box~~ — two hard-coded
             literals with no connection to whether this client's targeting contains enough
             people to carry any of it. A client could buy twenty meetings out of a pool that
             carries three, and every screen afterwards would keep agreeing with them.

             🛑 FOUNDER-LOCKED: *"if we can only produce 10 but they want more. they need to
             widen their own ICP."* So the control stops, and the sentence below hands them the
             fields that move it. We do not widen it for them.

             ⚠️ THE FALLBACK IS THE OLD CEILING, NOT ZERO. When capacity is unknown — no
             targeting yet, or the provider could not be reached — `cap` is null and the control
             behaves exactly as it did before. Capping a paying client at nothing because a
             vendor was slow would be a worse failure than the one this fixes. */}
        <div className="flex items-center gap-3 mt-1">
          <input id="calc-meetings" type="range" min={1} max={cap ?? 50} step={1} value={meetings}
            onChange={e => setMeetings(Number(e.target.value))}
            className="flex-1 accent-[#7C3AED]" />
          <input aria-label="Targeted booked meetings" type="number" min={1} max={cap ?? 500} value={meetings}
            onChange={e => setMeetings(
              Math.min(cap ?? Number.MAX_SAFE_INTEGER, Math.max(1, Number(e.target.value) || 1)))}
            className="w-20 text-[15px] font-extrabold tabular-nums rounded-xl border border-[#e4dcf7] px-2.5 py-2 text-center" />
        </div>
        {/* 🛑 AND WHEN THEY REACH IT, THEY ARE POINTED AT THEIR OWN TARGETING — never at a
            suggestion of ours. The sentence is the server's, so this screen cannot soften it,
            and it names no pool size and no rate. */}
        {atCeiling && calc?.widen_note && (
          <p className="text-[11.5px] text-[#9b8ec4] mt-1.5 leading-relaxed">{calc.widen_note}</p>
        )}
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

      {/* ── 🛑 ⚑ 23 Sep (R136 ②) — THE DISCLAIMER, AT THE POINT OF COMMITMENT ─────────────
           🛑 FOUNDER-LOCKED: *"we have to add a disclaimer to the client we do our best. this
           is not a guarentee."*

           ⚠️ IT IS NOT THE SAME SENTENCE AS THE ONE AT THE TOP, AND THE DIFFERENCE IS THE
           POINT. `target_note` frames the number while they are still playing with it;
           this says the part that one does not — that there is a point at which we STOP. A
           client who reads only "target, not a guarantee" can still reasonably believe we keep
           going until the number lands, which was true until 23 Sep.

           ⚠️ AND IT NAMES NO NUMBER. Founder, same day: *"i said 400 internally. we dont
           disclose this."* The sentence is interpolated from the server, never typed here, so
           a screen cannot soften it and a second copy cannot drift from it. */}
      {calc?.best_efforts_note && (
        <p className="text-[11.5px] text-[#5c5279] mt-4 leading-relaxed rounded-xl bg-[#faf8ff] border border-[#ece5fb] px-3 py-2.5">
          {calc.best_efforts_note}
        </p>
      )}

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
