'use client'

// ═══════════════════════════════════════════════════════════════════════════════════════
// PROGRAMME — the customer's own view of where their programme is.
//
// ⚑ 30 Aug (BUILD-004A-1). Replaces "My campaign" in the rail (approved nav rename). The old
// page showed campaign rows — sent, replies, sequence steps — which is the mechanics of how we
// work, not the thing the customer bought. This shows the programme: the outcome they asked
// for, the stage it is in, what has been delivered against what was authorised, and what is
// waiting on whom.
//
// 🛑 EVERY VISIBLE STRING HERE IS THE FOUNDER'S OR IS A DATA LABEL. The seven stage names and
// the per-stage quick action are specified verbatim in `@kind/shared/programme-stage`; the
// pause and failure sentences are the locked copy, sent BY THE SERVER so this file cannot
// drift from them. Nothing on this page is customer-facing prose I wrote — that rule is the
// whole shape of BUILD-004A, and this is the file where it would be easiest to break.
//
// ⚠️ READ-ONLY. There is no write path from this page. Approval, payment and go-live are money
// actions with their own guards; a status screen that could also spend is the wrong place for
// either.
//
// ⚠️ A FAILED LOAD IS NOT AN EMPTY PROGRAMME. `/my/programme` answers 503 with the locked
// sentence rather than an empty body, and this page renders that sentence — because "you have
// no programme" shown to someone who has paid is a lie with their money in it.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { useCallback, useEffect, useState } from 'react'
import { useMillaConversation } from '@/components/milla/MillaConversation'
import { api } from '@/lib/api'
import { createClient } from '@/lib/supabase/client'
import { MILLA_FAILURE_COPY } from '@kind/shared'
import ProgrammeWorkspace, { type CustomerProgramme } from '@/components/milla/ProgrammeWorkspace'
import ProgrammeApproval, { type ApprovalPayload } from '@/components/milla/ProgrammeApproval'
import ProgrammePayment from '@/components/milla/ProgrammePayment'
import ProgrammeCalculator from '@/components/milla/ProgrammeCalculator'
import ProgrammeOutcome, { type OutcomeSummary } from '@/components/milla/ProgrammeOutcome'
import { acceptanceGate } from '@/lib/programme-acceptance'

export default function ProgrammePage() {
  const [p, setP] = useState<CustomerProgramme | null>(null)
  const [review, setReview] = useState<ApprovalPayload | null>(null)
  // ⚑ 24 Sep (R145 step 6) — replies for the Results panel; a non-fatal read, like the review.
  const [summary, setSummary] = useState<OutcomeSummary | null>(null)
  // ⚑ 24 Sep (#39) — the next programme is priced on this same screen, from Complete.
  const [pricingNext, setPricingNext] = useState(false)
  const [failed, setFailed] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // ⚑ 10 Sep (B/C) — EXTRACTED SO THE CALCULATOR CAN RE-READ AFTER THE CLIENT CHOOSES.
  // Choosing creates the programme, which changes every figure this screen renders; without a
  // re-read the client would press "Build my programme" and watch nothing happen.
  const load = useCallback(async () => {
      try {
        const supabase = createClient()
        const { data: { session } } = await supabase.auth.getSession()
        const r = await api.get<{ data: CustomerProgramme }>('/my/programme', session?.access_token)
        setP(r.data)
        // ⚠️ THE REVIEW IS A SEPARATE, NON-FATAL READ. A programme that loads but whose review
        // set does not must still render the programme — the approval section simply does not
        // appear, rather than the whole screen failing.
        try {
          const rev = await api.get<{ data: ApprovalPayload }>('/my/programme/review', session?.access_token)
          setReview(rev.data)
        } catch { setReview(null) }
        try {
          const sm = await api.get<{ data: OutcomeSummary }>('/leads/milla-summary', session?.access_token)
          setSummary(sm.data ?? null)
        } catch { setSummary(null) }
      } catch (e) {
        // ⚠️ THE SERVER'S SENTENCE WINS. It sends the locked copy; this only falls back to the
        // same constant when the request never reached a response at all.
        const msg = e instanceof Error ? e.message : ''
        setFailed(msg && msg.length < 200 ? msg : MILLA_FAILURE_COPY.pipelineFailed)
      }
      setLoading(false)
  }, [])

  useEffect(() => { void load() }, [load])

  // ── ⚑ 24 Sep (R145 step 4 · #30 #77) — BACK FROM STRIPE, ON THE SAME SCREEN ─────────────────
  // The first payment returns to `/milla?paid=first`. Stripe confirms to us separately (the
  // webhook), and that can lag the client's return by seconds or more — during which
  // `firstPaidAt` is still empty and the Accept · Pay P1 button would have come straight back,
  // inviting a second payment. So while the return flag stands and the payment is not yet on
  // record, the panel says the payment arrived and is being confirmed, offers no button, and
  // re-reads the programme until it is. Bounded: after two minutes it stops asking and says so.
  const [paidReturn, setPaidReturn] = useState<'first' | 'second' | null>(null)
  const [confirmSlow, setConfirmSlow] = useState(false)
  useEffect(() => {
    try {
      const v = new URLSearchParams(window.location.search).get('paid')
      setPaidReturn(v === 'first' || v === 'second' ? v : null)
    } catch { /* no URL */ }
  }, [])
  const awaitingFirst = paidReturn === 'first' && !!p && !p.money.firstPaidAt && !p.money.firstAuthorisedAt
  // ⚑ 24 Sep (R145 step 5) — the same wait after the SECOND payment (Approve vN and pay P2).
  const awaitingSecond = paidReturn === 'second' && !!p && !p.money.secondPaidAt && !p.money.secondAuthorisedAt
  const awaiting = awaitingFirst || awaitingSecond
  useEffect(() => {
    if (!awaiting) return
    let n = 0
    const t = setInterval(() => {
      n += 1
      if (n > 30) { clearInterval(t); setConfirmSlow(true); return }
      void load()
    }, 4000)
    return () => clearInterval(t)
  }, [awaiting, load])

  // ⚑ 24 Sep (R145 step 5 · #34) — an approval updates the review at once AND re-reads the
  // programme, so the P2 card (which reads `approvedAt` from the programme) appears without a reload.
  const onApproved = useCallback((at: string | null) => setReview(r => (r && r.programme
    ? { ...r, canApprove: false, programme: { ...r.programme, approved_at: at, status: 'APPROVED' } }
    : r)), [])
  // ⚑ 24 Sep (R145 step 5 · #32) — "Approve vN and pay P2": once the approval is STORED, the second
  // payment opens in the same press. If it cannot open, the approval stands and the P2 card shows
  // at once (#34) from the re-read — the client is never asked to approve twice.
  const payAfterApproval = useCallback(async () => {
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      const c = await api.post<{ data: { url: string } }>('/my/programme/checkout/second', {
        successUrl: `${window.location.origin}/milla?paid=second`,
        cancelUrl: window.location.href,
      }, session?.access_token)
      if (c.data?.url) { window.location.href = c.data.url; return }
    } catch { /* the P2 card below carries the payment and its own error */ }
    void load()
  }, [load])

  // ⚑ 24 Sep (#75) — "Widen targeting" hands the question to Milla, in the one chat, and puts the
  // cursor in her composer. She re-counts free; the slider's ceiling moves with the targeting.
  const conversation = useMillaConversation()
  const widen = useCallback(() => {
    conversation.announce('Tell me where to widen — the location, the company size or the job titles — and I’ll re-count it free and show you the new ceiling.')
    conversation.focus()
  }, [conversation])

  if (loading) {
    return (
      <div className="h-full overflow-y-auto p-5 sm:p-6">
        <p className="text-[13.5px] text-[#9b8ec4]">Loading your programme…</p>
      </div>
    )
  }

  if (failed) {
    return (
      <div className="h-full overflow-y-auto p-5 sm:p-6">
        <div className="border border-red-200 bg-red-50/60 rounded-2xl px-4 py-3 max-w-xl">
          <p className="text-[13.5px] font-semibold text-red-800">{failed}</p>
        </div>
      </div>
    )
  }

  if (!p) return null

  // ⚑ 24 Sep (R145 step 4) — BEFORE P1, THE WHOLE RIGHT SIDE IS THE PROGRAMME PANEL: one slider,
  // one button. It covers the three states that used to be three cards — no programme yet,
  // chosen but not accepted, accepted but not paid.
  const choosing = p.stage === 'Recommendation' && !p.money.firstPaidAt && !p.money.firstAuthorisedAt

  // ⚠️ ONE IMPLEMENTATION, TWO SURFACES. The Milla home renders this same component with the
  // same payload, so the two screens cannot show different numbers for one programme.
  return (
    <div className="mv-workspace-body h-full overflow-y-auto [&>*]:shrink-0">
      {awaiting ? (
        <div className="mv-hero-card">
          <div className="mv-eyebrow">Payment received</div>
          <h2 className="!text-[17px]">{awaitingFirst
            ? 'Thank you — we’re confirming your first payment and preparing your programme.'
            : 'Thank you — we’re confirming your second payment. Your approved programme is next in line to go live.'}</h2>
          <p>
            {confirmSlow
              ? 'Stripe is taking longer than usual to confirm it to us. You don’t need to pay again — this page will show it as soon as it lands, and Milla can check for you.'
              : 'This usually takes a few seconds. You don’t need to do anything.'}
          </p>
        </div>
      ) : choosing ? (
        <ProgrammeCalculator
          startAt={p.outcome.target}
          alreadyAccepted={acceptanceGate(p) === 'accepted'}
          internalBilling={p.money.internalBilling === true}
          onChosen={() => { void load() }}
          onWiden={widen} />
      ) : review?.programme && review.canApprove && !review.programme.approved_at ? (
        /* ⚑ 24 Sep (R145 step 5 · #60) — AT APPROVAL THE RIGHT SIDE IS THE APPROVAL PANEL, ALONE. */
        <ProgrammeApproval
          data={review}
          secondPaymentCents={p.money.secondPaymentCents ?? null}
          secondDue={!p.money.secondPaidAt && !p.money.secondAuthorisedAt && !p.money.internalBilling}
          onApproved={at => {
            onApproved(at)
            if (!p.money.secondPaidAt && !p.money.secondAuthorisedAt && !p.money.internalBilling) void payAfterApproval()
            else void load()
          }} />
      ) : p.stage === 'Completion' && pricingNext ? (
        /* #39 — a next programme can start: the same calculator, the same one button. */
        <ProgrammeCalculator onChosen={() => { setPricingNext(false); void load() }} onWiden={widen} />
      ) : (p.stage === 'Live' || p.stage === 'Review' || p.stage === 'Completion') ? (
        /* ⚑ 24 Sep (R145 step 6 · #61 #62) — Results while it runs, Complete when it ends. */
        <ProgrammeOutcome p={p} summary={summary} onPriceNext={p.stage === 'Completion' ? () => setPricingNext(true) : undefined} />
      ) : (
      <ProgrammeWorkspace p={p} />
      )}
      {/* ⛓️ 24 Sep (R145 step 4 · #27) — WAS three blocks here: the calculator (no programme yet),
          `ProgrammeAcceptance` ("Accept this recommendation"), and the first `ProgrammePayment`
          ("Pay the first half and start"). They are ONE panel above now, with ONE button that
          runs the same three server steps in the same order. B1 (13 Sep) stands: acceptance is
          persisted server-side before any checkout is created. */}
      {/* ⚑ 25 Sep — THE HOUSE ACCOUNT IS NEVER ASKED FOR THE SECOND HALF. The founder's House walk
          showed "Pay the second half — $2,187.50" after approval; the server now refuses that
          checkout too. House's P2 is authorised internally in Vida (R152), as P1 was (#1791). */}
      {p.hasProgramme && p.approvedAt && !p.wentLiveAt
        && !p.money.secondPaidAt && !p.money.secondAuthorisedAt && p.money.internalBilling === true && (
        <div className="mt-3 mv-hero-card" data-testid="house-second-nothing-to-pay">
          <div className="mv-eyebrow">Second half</div>
          <p>This is the House account, so there is nothing to pay. P2 is authorised internally in Vida.</p>
        </div>
      )}
      {p.hasProgramme && p.approvedAt && !p.wentLiveAt
        && !p.money.secondPaidAt && !p.money.secondAuthorisedAt && p.money.internalBilling !== true && (
        <div className="mt-3">
          <ProgrammePayment
            stage="second"
            totalCents={p.money.totalCents}
            halfCents={p.money.secondPaymentCents ?? 0}
            meetingTarget={p.outcome.target}
          />
        </div>
      )}
      {/* After approval the panel's approved state stays with the programme's status. */}
      {review?.programme && review.programme.approved_at && (
        <ProgrammeApproval data={review} onApproved={onApproved} />
      )}
    </div>
  )
}
