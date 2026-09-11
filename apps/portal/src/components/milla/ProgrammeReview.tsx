'use client'

// ═══════════════════════════════════════════════════════════════════════════════════════
// THE CUSTOMER'S REVIEW, AND THE ONE APPROVAL THEY GIVE
//
// R39, founder-locked 15 Aug: **"We run it in Vida; the client approves in Milla."** This is
// that half of the lifecycle: the customer sees who will be worked, and gives ONE approval for
// the whole programme.
//
// 🛑 WHAT THIS DELIBERATELY IS NOT — AND THE REASON IT IS A NEW COMPONENT RATHER THAN THE OLD
// DESK REVIVED. The screen this replaces was the per-lead approval desk: pick twenty, approve
// them together, $4 each, a wallet balance and a top-up banner. Every one of those ideas is
// GONE from the product, so none of them may reappear here wearing programme clothes:
//
//   · no price on any button          · no wallet, no balance, no top-up
//   · no "pay to reveal"              · no pack economics, no "N of your 100 left"
//   · no per-lead approve             · no selection minimum, no pick-N gate
//   · no second approval concept      · nothing that reveals a name, email or phone
//
// The prospects are REVIEWED, not bought. The programme was paid for at P1; the cards exist so
// the customer can see what they are approving, and the single button approves the programme.
//
// ⚠️ MASKING IS THE SERVER'S JOB, NOT THIS FILE'S. `/my/programme/review` never sends a name,
// an email, a phone or a LinkedIn URL — there is no field on `ReviewProspect` that could hold
// one. This component cannot leak identity by rendering the wrong property, because the wrong
// property does not exist in the payload.
//
// ⚠️ APPROVAL ≠ P2 ≠ LIVE ≠ SEND. The post-approval sentence is the founder's, verbatim, and it
// says exactly that: "Approved — nothing is sent until the programme goes Live." It was chosen
// over "we'll confirm before anything is sent" precisely because that phrasing implies one more
// step and hides that Live is a separate paid stage.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { useCallback, useEffect, useState } from 'react'
import { api } from '@/lib/api'

export type ReviewProspect = {
  id: string
  role: string
  company: string
  industry: string | null
  country: string | null
  score: number | null
  why_fits: string | null
  surfaced_for_approval_at: string | null
}

export type ReviewPayload = {
  programme: { id: string; status: string; meeting_target: number | null; approved_at: string | null; paused: boolean } | null
  /**
   * ⚑ 11 Sep (DAY 3) — the frozen package, and WHICH VERSION of it. Only `version` is read
   * here; the full package is rendered by `ProgrammeApproval`. It is sent back with the
   * approval so a re-preparation between this screen rendering and the button being pressed
   * is REFUSED rather than approved in silence.
   */
  frozen?: { version: string | null } | null
  prospects: ReviewProspect[]
  total: number
  /** false ⟹ the server stopped counting at its scan budget: the total is a floor, not a count. */
  complete?: boolean
  canApprove: boolean
}

/** The founder's post-approval sentence, locked 3 Sep. Never paraphrased. */
export const APPROVED_COPY = 'Approved — nothing is sent until the programme goes Live.'
/** The founder's primary action label, locked 3 Sep. */
export const APPROVE_LABEL = 'Approve this programme'

export default function ProgrammeReview({ token }: { token: () => Promise<string | undefined> }) {
  const [data, setData] = useState<ReviewPayload | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [approving, setApproving] = useState(false)
  const [approveError, setApproveError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoadError(null)
    try {
      const r = await api.get<{ data: ReviewPayload }>('/my/programme/review', await token())
      setData(r.data)
    } catch (e) {
      // ⚠️ A FAILED READ IS NOT AN EMPTY REVIEW SET, and the difference matters more here than
      // almost anywhere: an empty desk rendered on a failed read would tell a customer who has
      // paid that we found nobody for them. Say what did not happen instead.
      setData(null)
      setLoadError(e instanceof Error ? e.message : 'We couldn’t load your programme review. Nothing has changed.')
    }
  }, [token])

  useEffect(() => { void load() }, [load])

  async function approve() {
    // ⚠️ DISABLED IN FLIGHT. The server is idempotent by compare-and-set, so a double-click
    // cannot move `approved_at` — this is about the customer not being shown two spinners for
    // one act, not about protecting the data. Both guards exist because they answer to
    // different failures.
    if (approving) return
    setApproving(true); setApproveError(null)
    try {
      await api.post('/my/programme/approve', { version: data?.frozen?.version ?? null }, await token())
      // Re-read rather than patching local state: the server is the only source of
      // `status` and `approved_at`, and guessing them here is how two surfaces start
      // disagreeing about one programme.
      await load()
    } catch (e) {
      setApproveError(e instanceof Error ? e.message : 'We couldn’t approve your programme. Nothing has changed.')
    } finally {
      setApproving(false)
    }
  }

  // ── LOADING ────────────────────────────────────────────────────────────────────────
  if (!data && !loadError) {
    return <p className="text-[14px] text-[#9b8ec4]">Loading the prospects for your programme…</p>
  }

  // ── ERROR ──────────────────────────────────────────────────────────────────────────
  if (loadError) {
    return (
      <div className="text-[13px] text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
        {loadError}
        <button onClick={() => void load()} className="ml-2 underline font-semibold">Try again</button>
      </div>
    )
  }

  const d = data as ReviewPayload
  if (!d.programme) return null

  const approved = d.programme.status === 'APPROVED'

  // ── 🛑 READY FOR APPROVAL WITH AN EMPTY DESK — FAIL VISIBLY ────────────────────────
  //
  // The founder's rule: if the programme says READY_FOR_APPROVAL and the review query returns
  // nothing, do NOT present a successful approval experience and do NOT fabricate cards. This
  // is a real inconsistency between two facts that should agree, and the customer is told it is
  // being looked at rather than shown an approve button for an empty set. The server refuses
  // this state too (`nothing_to_review`), so the button being absent is not the only guard.
  if (!approved && d.total === 0) {
    return (
      <div className="text-[13px] text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
        <b className="block text-[13.5px]">Your programme isn’t ready to review yet.</b>
        <span className="block mt-1 text-[12.5px]">
          Your programme is marked ready, but the prospects aren’t showing. Nothing has been approved and nothing has been sent.
          K.I.N.D has been notified and is checking this.
        </span>
      </div>
    )
  }

  return (
    <div className="grid gap-3">
      {/* ── WHAT THEY ARE APPROVING ────────────────────────────────────────────────────
          Counts and the stored target only. No projection, no "on track", no confidence
          score — every number here is a stored value or a length. */}
      <div className="bg-[#faf8ff] border border-[#ece5fb] rounded-2xl px-4 py-3.5">
        <div className="text-[13.5px] text-[#4c4368] font-semibold">
          {approved ? 'You approved this programme' : 'Review the prospects for your programme'}
        </div>
        <div className="text-[12.5px] text-[#6b6288] mt-1">
          {/* ⚠️ THOUSANDS-SEPARATED. A programme is 250 prospects per targeted meeting (R77), so
              a ten-meeting programme is four digits and `2500` reads as a reference number
              rather than a count. `toLocaleString` on a locale-free render would vary by the
              viewer's browser, so the locale is pinned. */}
          {d.total.toLocaleString('en-GB')}{d.complete === false ? '+' : ''} prospect{d.total === 1 ? '' : 's'} selected
          {d.programme.meeting_target ? ` · ${d.programme.meeting_target} meeting target` : ''}
          {d.prospects.length < d.total ? ` · showing the top ${d.prospects.length}` : ''}
        </div>
        {!approved && (
          <div className="text-[12.5px] text-[#6b6288] mt-1.5">
            One approval covers the whole programme. There is nothing to pay and nothing to approve individually.
          </div>
        )}
      </div>

      {/* ── THE ONE ACTION ─────────────────────────────────────────────────────────────
          Founder-locked wording. One button, no price, no selection, no minimum. */}
      {approved ? (
        <div
          data-testid="programme-approved"
          className="text-[13.5px] text-[#065f46] bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-3 font-semibold"
        >
          {APPROVED_COPY}
        </div>
      ) : (
        <div className="grid gap-2">
          <button
            data-testid="approve-programme"
            onClick={() => void approve()}
            disabled={approving || !d.canApprove}
            className="w-full bg-[#7C3AED] text-white font-bold text-[14px] rounded-2xl px-4 py-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {approving ? 'Approving…' : APPROVE_LABEL}
          </button>
          {approveError && (
            <div className="text-[13px] text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
              {approveError}
              <button onClick={() => void approve()} className="ml-2 underline font-semibold">Try again</button>
            </div>
          )}
        </div>
      )}

      {/* ── THE PROSPECTS ──────────────────────────────────────────────────────────────
          Masked cards. Role, company, sector, market, fit score and why it fits — enough to
          genuinely review who will be worked, and not one field that identifies a person. */}
      <div className="grid gap-2 grid-cols-1 [@media(min-width:1100px)]:grid-cols-2">
        {d.prospects.map(p => (
          <div key={p.id} data-testid="review-prospect" className="bg-white border border-[#eee7f7] rounded-2xl px-3.5 py-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="text-[13.5px] font-bold text-[#2f2a44] truncate">{p.role}</div>
                <div className="text-[12.5px] text-[#6b6288] truncate">{p.company}</div>
              </div>
              {p.score != null && (
                <span className="text-[11.5px] font-bold text-[#7C3AED] bg-[#f4efff] rounded-full px-2 py-0.5 shrink-0">
                  {p.score}
                </span>
              )}
            </div>
            {(p.industry || p.country) && (
              <div className="text-[11.5px] text-[#9b8ec4] mt-1">
                {[p.industry, p.country].filter(Boolean).join(' · ')}
              </div>
            )}
            {p.why_fits && <p className="text-[12.5px] text-[#4c4368] mt-1.5">{p.why_fits}</p>}
          </div>
        ))}
      </div>
    </div>
  )
}
