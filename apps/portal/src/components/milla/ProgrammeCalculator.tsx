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

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { api } from '@/lib/api'
import { createClient } from '@/lib/supabase/client'
import { programmeMoney } from '@/lib/programme-money'
import { postAcceptance, type AcceptResponse } from '@/lib/programme-acceptance'
import { useMillaConversation } from '@/components/milla/MillaConversation'

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

/**
 * 🛑 ⚑ 23 Sep (R136 ⑥) — WHAT THE POOL CARRIES, READ ONCE.
 *
 * Its own call, not part of the quote: the quote is pure arithmetic and re-runs on every slider
 * movement, while this costs a provider round trip. `known: false` means we could not ask —
 * the control is then left uncapped rather than capping a paying client at nothing because a
 * vendor was slow.
 */
type Capacity = { committed: number; known: boolean; workable?: number }

/** The ceiling the control stops at, or `null` when we have no trustworthy answer. */
function capOf(c: Capacity | null): number | null {
  return c && c.known && c.committed > 0 ? c.committed : null
}

export function ProgrammeCalculator({ onChosen, startAt, onWiden, alreadyAccepted, internalBilling }: {
  onChosen?: () => void
  /** ⚑ 24 Sep (R145 step 4) — a programme already chosen opens the slider at its own target. */
  startAt?: number | null
  /** ⚑ 24 Sep (R145 step 4 · #75) — "Widen targeting": Milla takes it from here, in the one chat. */
  onWiden?: () => void
  /** ⚑ 24 Sep — already accepted at `startAt`: pressing again goes straight to the payment. */
  alreadyAccepted?: boolean
  /**
   * ⚑ 24 Sep (R152) — THE HOUSE ACCOUNT. The server's `money.internalBilling` (true only for a
   * House login). House never pays: its P1 is authorised in Vida ("Authorise P1 internally"), so
   * accepting here records the choice and the acceptance and opens NO payment page.
   */
  internalBilling?: boolean
}) {
  const [meetings, setMeetings] = useState(startAt && startAt > 0 ? startAt : 10)
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
  // ⚑ 23 Sep (MVP1 Stage 3) — A KNOWN ZERO IS NOT AN UNKNOWN. `capOf` returns null for both, so a
  // pool we positively measured as carrying nothing left the slider open at 1–50 — and the
  // server (`chooseProgramme`, now pinned) refuses every one of those, so the client only found
  // out on Save. Here the choice is held and they are pointed at their own targeting instead.
  // ⚠️ `known: false` still caps nothing — a slow vendor must not block a paying client.
  const noCapacity = capacity !== null && capacity.known && capacity.committed <= 0

  // 🛑 THE CONTROL CANNOT EXCEED WHAT THE POOL CARRIES. Clamping here as well as on the inputs
  // is what makes a capacity arriving AFTER the client has already typed a larger number pull
  // them back down, rather than leaving a stale over-target sitting in a box that now has a
  // lower maximum.
  useEffect(() => {
    if (cap !== null && meetings > cap) setMeetings(cap)
  }, [cap, meetings])

  const atCeiling = cap !== null && meetings >= cap

  // ── 🛑 ⚑ 24 Sep (R145 step 4 · #27) — ONE BUTTON: "ACCEPT N MEETINGS · PAY P1" ─────────────
  //
  // Founder: *"from one screen to one choice to the next."* ⛓️ WAS three screens in a row —
  // "Build my programme", then "Accept this recommendation", then "Pay the first half and start" —
  // each re-reading the page before the next appeared. The three server steps are unchanged and
  // still happen IN THIS ORDER, each its own guarded write: choose (creates or re-prices; refuses
  // over capacity), accept (the ONE writer of `recommendation_accepted_at`, B1 13 Sep — persisted
  // BEFORE any checkout exists), then the P1 checkout. The press is the explicit acceptance, and
  // the button says the price it starts. If any step refuses, nothing after it runs and the
  // server's own sentence is shown; nothing has been charged.
  const acceptAndPay = useCallback(async () => {
    setBusy(true); setErr(null)
    try {
      const tk = await token()
      // Already accepted at this size: nothing to re-choose or re-accept, only the payment to open.
      const unchanged = alreadyAccepted === true && startAt === meetings
      if (!unchanged) await api.post('/my/programme/choose', {
        meetings,
        ...(leadsPerMeeting !== '' ? { leadsPerMeeting } : {}),
        ...(value !== '' ? { averageClientValue: value } : {}),
        ...(pct !== '' ? { meetingToClientPct: pct } : {}),
      }, tk)
      if (!unchanged) {
        const accepted = await postAcceptance((path, body) =>
          api.post<AcceptResponse>(path, body, tk) as Promise<AcceptResponse>)
        if (!accepted.ok) throw new Error(accepted.message)
      }
      setChosen(true)
      onChosen?.()
      // ⚑ 24 Sep (R152) — House: accepted, and nothing to pay. Vida authorises P1 internally.
      if (internalBilling) { setBusy(false); return }
      const r = await api.post<{ data: { url: string } }>('/my/programme/checkout/first', {
        // ⚑ #30 — back to the ONE screen, told the payment arrived (see `paidReturn`).
        successUrl: `${window.location.origin}/milla?paid=first`,
        cancelUrl: window.location.href,
      }, tk)
      if (!r.data?.url) throw new Error('We could not start the payment. Nothing was charged.')
      window.location.href = r.data.url
    } catch (e) {
      setErr(e instanceof Error && e.message && e.message.length < 300
        ? e.message : 'That did not go through. Nothing was charged — please try again.')
      setBusy(false)
    }
  }, [meetings, leadsPerMeeting, value, pct, onChosen, alreadyAccepted, startAt, internalBilling])

  const d = calc?.data ?? null

  // ⚑ 24 Sep (R145 step 4 · #31) — "Accept N" in the chat runs THIS button's handler, offered only
  // while the button itself could be pressed.
  const conversation = useMillaConversation()
  const setDeskActions = conversation.setDeskActions
  // ⚑ 24 Sep (R145 step 4) — Milla opens the stage in the one chat, as the redesign does (D5 words).
  const announceOnce = conversation.announceOnce
  useEffect(() => {
    announceOnce('programme-intro', ['You buy qualified meetings, not leads. Move the slider to however many you want and everything else follows.'])
  }, [announceOnce])
  const payRef = useRef(acceptAndPay); payRef.current = acceptAndPay
  const canPay = !!d && !noCapacity && !busy && !chosen
  const payLabel = `Accept ${d?.meetings ?? meetings}`
  useEffect(() => {
    setDeskActions(canPay ? { accept: () => void payRef.current(), acceptLabel: payLabel } : null)
    return () => setDeskActions(null)
  }, [canPay, payLabel, setDeskActions])

  // ── ⚑ 24 Sep (R145 step 4 · #28 #29 #59 #76) — THE PROGRAMME PANEL, AS THE REDESIGN DRAWS IT ──
  // Hero with the slider, a Capacity card and a Payment card, then one main button and one
  // secondary. Kept from the screen it replaces: the target framing and the best-efforts line are
  // the SERVER's sentences (R136 ②); the slider stops where the pool does (R136 ⑥); the client's
  // own value and conversion are labelled an illustration; the 400 never appears (D4 — Vida only).
  // D5: "target" and "qualified meetings", never "the commitment".
  return (
    <div className="flex flex-col gap-4">
      <div className="mv-hero-card">
        <div className="mv-eyebrow">Your programme</div>
        <div className="mv-hero-row">
          <div>
            <div className="mv-hero-number tabular-nums">{d?.meetings ?? meetings}</div>
            <div className="mv-hero-caption">qualified meetings — your target</div>
          </div>
          {d && (
            <div>
              <strong className="text-[20px] tabular-nums">{programmeMoney(d.totalCents)} total</strong>
              <div className="mv-hero-caption">{programmeMoney(d.effectiveCostPerMeetingCents)} per meeting · split 50 / 50</div>
            </div>
          )}
        </div>
        {/* ── 🛑 ⚑ 23 Sep (R136 ⑥) — THE CONTROL STOPS WHERE THE POOL DOES. When capacity is
             unknown the old ceiling stands: capping a paying client at nothing because a vendor
             was slow would be worse than the defect this fixes. */}
        <div className="mt-4">
          <div className="flex items-center gap-3">
            <input id="calc-meetings" aria-label="Targeted qualified meetings" type="range" min={1} max={cap ?? 50} step={1} value={meetings}
              onChange={e => setMeetings(Number(e.target.value))}
              className="flex-1 accent-[#6f3df4]" />
            {/* `max` on a number box is advisory, so a typed value is CLAMPED to the ceiling too. */}
            <input aria-label="Targeted qualified meetings (number)" type="number" min={1} max={cap ?? 500} value={meetings}
              onChange={e => setMeetings(Math.min(cap ?? Number.MAX_SAFE_INTEGER, Math.max(1, Number(e.target.value) || 1)))}
              className="w-16 text-[13px] font-extrabold tabular-nums rounded-lg border border-[color:var(--mv-line2)] px-2 py-1 text-center bg-white" />
          </div>
          <div className="flex justify-between mt-1.5 text-[8px] text-[#8e8595]">
            <span>1 meeting</span>
            <span>{cap !== null ? `Pool ceiling · ${cap}` : 'Move to choose'}</span>
          </div>
        </div>
        {/* 🛑 THE FOUNDER'S FRAMING, AND IT COMES FROM THE SERVER so a screen cannot soften it. */}
        {calc?.target_note && <p className="mt-3">{calc?.target_note}</p>}
        {/* And at the ceiling they are pointed at their OWN targeting — never at a suggestion of ours. */}
        {(atCeiling || noCapacity) && calc?.widen_note && <p className="mt-2">{calc.widen_note}</p>}
      </div>

      {d && (
        <div className="mv-programme">
          <div className="mv-programme-card">
            <div className="mv-eyebrow">Capacity</div>
            <div className="mv-big tabular-nums">{capacity?.known && typeof capacity.workable === 'number' ? capacity.workable.toLocaleString('en-US') : '—'}</div>
            <div className="mv-sub">
              workable pool behind the programme.{cap !== null ? ` ${cap} is the most we will take on at this targeting.` : ''}
            </div>
            <div className="mv-kv-list">
              <div className="mv-kv-row"><span>People we plan to work</span><strong>{d.recommendedVolume.toLocaleString('en-US')}</strong></div>
              <div className="mv-kv-row"><span>Planning benchmark</span><strong>{calc?.benchmark.leadsPerMeeting ?? 250} / meeting</strong></div>
            </div>
          </div>
          <div className="mv-programme-card">
            <div className="mv-eyebrow">Payment</div>
            <div className="mv-kv-list">
              <div className="mv-kv-row"><span>P1 · starts preparation</span><strong>{programmeMoney(d.firstPaymentCents)}</strong></div>
              <div className="mv-kv-row"><span>P2 · on approval</span><strong>{programmeMoney(d.secondPaymentCents)}</strong></div>
              <div className="mv-kv-row"><span>What you buy</span><strong>{d.meetings} qualified meetings</strong></div>
            </div>
            {/* 🛑 ⚑ 23 Sep (R136 ②) — THE DISCLAIMER, AT THE POINT OF COMMITMENT. The server's
                sentence, naming no number (founder: *"i said 400 internally. we dont disclose this."*). */}
            {calc?.best_efforts_note && (
              <div className="mt-3 p-2.5 rounded-[9px] bg-[#fff8e8] text-[8.5px] leading-[1.5] text-[#7b5a1d]">{calc.best_efforts_note}</div>
            )}
          </div>
        </div>
      )}

      {err && <p role="alert" className="text-[11px] text-red-700">{err}</p>}
      {internalBilling && (chosen || alreadyAccepted) && (
        <p className="mv-muted-note">Accepted. This is the House account, so there is nothing to pay — P1 is authorised in Vida.</p>
      )}

      <div className="mv-cta-row flex-wrap">
        <button onClick={() => void acceptAndPay()} disabled={busy || chosen || !d || noCapacity}
          className="mv-btn primary disabled:opacity-50">
          {internalBilling
            ? (busy ? 'Accepting…' : `Accept ${d?.meetings ?? meetings} meetings · no payment (House)`)
            : busy ? 'Opening payment…' : `Accept ${d?.meetings ?? meetings} meetings · Pay P1${d ? ` (${programmeMoney(d.firstPaymentCents)})` : ''}`}
        </button>
        {onWiden ? <button onClick={onWiden} disabled={busy} className="mv-btn">Widen targeting</button> : null}
        {/* ⚠️ IT SAYS WHAT THE PRESS DOES: it accepts this programme and opens the first payment.
            Nothing is sent to anyone until the prepared programme is approved (P2). */}
        <span className="mv-muted-note">Accepting opens the first payment. Nothing is sent until you approve the prepared programme.</span>
      </div>

      {/* ── ⚑ 24 Sep (#76) — THEIR NUMBERS, AS SLIDERS, AND LABELLED AN ILLUSTRATION ─────────── */}
      <div className="mv-section">
        <div className="mv-section-head"><b>If your own figures hold</b><span>an illustration, not a forecast</span></div>
        <div className="mv-section-body grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="calc-value" className="mv-muted-note block">A client is worth <b>{value === '' ? '—' : programmeMoney(Number(value) * 100)}</b></label>
            <input id="calc-value" type="range" min={0} max={100000} step={500} value={value === '' ? 0 : value}
              onChange={e => setValue(Number(e.target.value) || '')} className="w-full accent-[#6f3df4]" />
          </div>
          <div>
            <label htmlFor="calc-pct" className="mv-muted-note block">Meetings that become clients <b>{pct === '' ? '—' : `${pct}%`}</b></label>
            <input id="calc-pct" type="range" min={0} max={100} step={1} value={pct === '' ? 0 : pct}
              onChange={e => setPct(Number(e.target.value) || '')} className="w-full accent-[#6f3df4]" />
          </div>
          {d && d.revenueMultiple !== null && (
            <div className="sm:col-span-2 mv-kv-list">
              <div className="mv-kv-row"><span>Clients</span><strong>{d.estimatedClients.toLocaleString('en-US', { maximumFractionDigits: 1 })}</strong></div>
              <div className="mv-kv-row"><span>Revenue</span><strong>{programmeMoney(d.estimatedRevenueCents)}</strong></div>
              <div className="mv-kv-row"><span>Against cost</span><strong>{`${d.revenueMultiple.toLocaleString('en-US', { maximumFractionDigits: 1 })}×`}</strong></div>
            </div>
          )}
          {/* 🛑 THE LABEL IS THE SERVER'S SENTENCE — a revenue figure beside a price reads as a
              promise unless something says plainly that it is not one. */}
          {calc?.illustrative_note && <p className="sm:col-span-2 mv-muted-note">{calc?.illustrative_note}</p>}
        </div>
      </div>

    </div>
  )
}

export default ProgrammeCalculator
