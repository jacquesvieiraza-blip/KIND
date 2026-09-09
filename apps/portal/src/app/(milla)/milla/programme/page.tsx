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

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { createClient } from '@/lib/supabase/client'
import { MILLA_FAILURE_COPY } from '@kind/shared'
import ProgrammeWorkspace, { type CustomerProgramme } from '@/components/milla/ProgrammeWorkspace'
import ProgrammeApproval, { type ApprovalPayload } from '@/components/milla/ProgrammeApproval'
import ProgrammePayment from '@/components/milla/ProgrammePayment'

export default function ProgrammePage() {
  const [p, setP] = useState<CustomerProgramme | null>(null)
  const [review, setReview] = useState<ApprovalPayload | null>(null)
  const [failed, setFailed] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
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
      } catch (e) {
        // ⚠️ THE SERVER'S SENTENCE WINS. It sends the locked copy; this only falls back to the
        // same constant when the request never reached a response at all.
        const msg = e instanceof Error ? e.message : ''
        setFailed(msg && msg.length < 200 ? msg : MILLA_FAILURE_COPY.pipelineFailed)
      }
      setLoading(false)
    })()
  }, [])

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

  // ⚠️ ONE IMPLEMENTATION, TWO SURFACES. The Milla home renders this same component with the
  // same payload, so the two screens cannot show different numbers for one programme.
  return (
    <div className="h-full overflow-y-auto p-5 sm:p-6">
      <ProgrammeWorkspace p={p} />
      {/* ⚑ 9 Sep — THE APPROVAL, WHERE THE CLIENT ALREADY IS. It renders only when there is a
          programme awaiting their decision, or one they have already given; at every other
          stage this is silent. The server decides which of those it is. */}
      {/* ── ⚑ 9 Sep · THE TWO MOMENTS THE CLIENT IS ASKED FOR MONEY ──────────────────────
          🛑 A CLIENT COULD NOT PAY AT ALL. The checkout rails exist behind the admin key, so
          the only way to take a programme payment was for an operator to mint a link by hand.
          These render only when that half is genuinely due — never for an internally
          authorised programme, which owes nothing and must never be shown a price to pay. */}
      {p.hasProgramme && !p.money.firstPaidAt && !p.money.firstAuthorisedAt
        && (p.stage === 'Recommendation') && (
        <div className="mt-3">
          <ProgrammePayment
            stage="first"
            totalCents={p.money.totalCents}
            halfCents={p.money.firstPaymentCents ?? 0}
            meetingTarget={p.outcome.target}
          />
        </div>
      )}
      {p.hasProgramme && p.approvedAt && !p.wentLiveAt
        && !p.money.secondPaidAt && !p.money.secondAuthorisedAt && (
        <div className="mt-3">
          <ProgrammePayment
            stage="second"
            totalCents={p.money.totalCents}
            halfCents={p.money.secondPaymentCents ?? 0}
            meetingTarget={p.outcome.target}
          />
        </div>
      )}
      {review?.programme && (review.canApprove || review.programme.approved_at) && (
        <div className="mt-3">
          <ProgrammeApproval
            data={review}
            onApproved={at => setReview(r => (r && r.programme
              ? { ...r, canApprove: false, programme: { ...r.programme, approved_at: at, status: 'APPROVED' } }
              : r))}
          />
        </div>
      )}
    </div>
  )
}
