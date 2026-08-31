'use client'

// ═══════════════════════════════════════════════════════════════════════════════════════
// PROGRAMME WORKSPACE — ONE implementation, rendered in two places.
//
// 🛑 WHY THIS IS A COMPONENT AND NOT COPY-PASTE. The Milla HOME and `/milla/programme` show
// the same programme. Two renderings of one truth drift — one gets a fix, the other does not,
// and the customer sees different numbers for the same programme depending which screen they
// are on. The founder required a single shared workspace for exactly that reason, and
// `milla-programme.test.ts` fails if either surface stops using it.
//
// 🛑 EVERY VISIBLE STRING HERE IS THE FOUNDER'S OR IS A DATA LABEL. The seven stage names and
// the per-stage quick action come from `@kind/shared/programme-stage`; the pause sentence is
// the locked copy and arrives FROM THE SERVER, so this file cannot drift from it. No
// customer-facing prose in this component was written by me.
//
// ⚠️ READ-ONLY. No write path. Approval, payment and go-live are money actions with their own
// guards; a status surface that could also spend is the wrong home for either.
//
// ⚠️ NO PROJECTION, NO CONFIDENCE SCORE, NO "ON TRACK". Every figure is a stored value or a
// subtraction of two. A made-up number in front of a paying customer is a promise.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { MILLA_STAGES, type MillaStage } from '@kind/shared'

export type CustomerProgramme = {
  stage: MillaStage
  quickAction: string
  paused: boolean
  pausedCopy: string | null
  reviewOpen: boolean
  outcome: { kind: 'meetings' | 'other'; target: number | null }
  progress: { delivered: number; authorised: number; outcomesAchieved: number | null }
  money: { totalCents: number; firstPaidAt: string | null; secondPaidAt: string | null }
  approvedAt: string | null
  wentLiveAt: string | null
}

export const programmeMoney = (cents: number) =>
  `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`

/**
 * What Milla needs next, derived from the stage.
 *
 * ⚠️ THESE ARE STAGE NAMES AND FACTS, NOT NEW COPY. Each line names the stage the programme is
 * in and who it is waiting on — no invented marketing sentence, no promise, no timing claim.
 */
export function nextActionFor(p: CustomerProgramme): string {
  if (p.paused && p.pausedCopy) return p.pausedCopy
  if (p.reviewOpen) return 'Review — waiting on a decision'
  switch (p.stage) {
    case 'Proof':          return 'Tell Milla the outcome you want'
    case 'Recommendation': return 'Your recommendation is ready'
    case 'Sourcing':       return 'Milla is preparing your programme'
    case 'Approval':       return 'Ready for your approval'
    case 'Live':           return 'Running — nothing needed from you'
    case 'Review':         return 'Review — waiting on a decision'
    case 'Completion':     return 'Programme complete'
  }
}

export default function ProgrammeWorkspace({ p }: { p: CustomerProgramme }) {
  const stageIndex = MILLA_STAGES.indexOf(p.stage)
  return (
    <div className="max-w-3xl">
        {/* ── WHERE THE PROGRAMME IS ─────────────────────────────────────────────────
            The seven stages, with the current one marked. Stage names are the founder's. */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-3 mb-4">
          {MILLA_STAGES.map((s, i) => (
            <div key={s} className="flex items-center gap-1.5 shrink-0">
              <span className={`text-[12.5px] px-2.5 py-1 rounded-full whitespace-nowrap ${
                i === stageIndex ? 'bg-[#7C3AED] text-white font-bold'
                : i < stageIndex ? 'text-[#7C3AED] font-semibold'
                : 'text-[#b3a9cc]'}`}>{s}</span>
              {i < MILLA_STAGES.length - 1 && <span className="text-[#e3daf7] text-[11px]">›</span>}
            </div>
          ))}
        </div>

        {/* ⚠️ PAUSE RIDES ALONGSIDE THE STAGE, IT DOES NOT REPLACE IT — a paused programme
            returns to the stage it was in. The sentence is the server's locked copy. */}
        {p.paused && p.pausedCopy && (
          <div className="border border-amber-300 bg-amber-50/70 rounded-2xl px-4 py-3 mb-4">
            <p className="text-[13.5px] font-semibold text-amber-900">{p.pausedCopy}</p>
          </div>
        )}

        {/* ── THE OUTCOME ────────────────────────────────────────────────────────────── */}
        <div className="border border-[#eee7f7] rounded-2xl px-4 py-3.5 mb-3">
          <div className="text-[11.5px] uppercase tracking-wide text-[#9b8ec4] font-bold mb-1">Outcome</div>
          {p.outcome.target
            ? <div className="text-[15px] font-extrabold">{p.outcome.target} booked meetings</div>
            : <div className="text-[13.5px] text-[#9b8ec4]">Not set yet.</div>}
        </div>

        {/* ── PROGRESS — delivered against authorised, both straight off the row ──────
            ⚠️ NO PROJECTION, NO "ON TRACK", NO CONFIDENCE SCORE. A made-up number in front
            of a paying client is a promise, and none of these has a rule behind it. */}
        <div className="border border-[#eee7f7] rounded-2xl px-4 py-3.5 mb-3">
          <div className="text-[11.5px] uppercase tracking-wide text-[#9b8ec4] font-bold mb-1.5">Progress</div>
          <div className="flex flex-wrap gap-x-6 gap-y-1.5">
            <div>
              <div className="text-[15px] font-extrabold">
                {/* 🛑 null IS "WE COULD NOT READ IT", NEVER ZERO. Rendering a storage failure as
                    "0 meetings booked" tells a client their programme has produced nothing —
                    the most damaging false statement available on this screen. */}
                {p.progress.outcomesAchieved === null ? '—' : p.progress.outcomesAchieved}
              </div>
              <div className="text-[12px] text-[#9b8ec4]">
                {p.progress.outcomesAchieved === null ? 'Meetings — not available right now' : 'Meetings booked'}
              </div>
            </div>
            <div>
              <div className="text-[15px] font-extrabold">{p.progress.delivered.toLocaleString()}</div>
              {/* ⛓️ 31 Aug (BUILD-004A-2B, founder decision 2) — "People reached" → "People
                  sourced". A FACTUAL CORRECTION, not a rename for tidiness: the field is
                  `programmes.sourced_used`, which counts people we SOURCED. Sourcing is
                  authorised by Payment 1 and happens four gates before anybody is contacted,
                  so "reached" claimed outreach that had not been authorised — on the screen a
                  client reads to find out whether it had.
                  ⚠️ GENUINE CONTACTED METRICS ARE NOT TOUCHED. Pipeline's "Contacted" column
                  is backed by `figsy_enrollments.current_step > 0` — real outreach — and
                  keeps its name. */}
              <div className="text-[12px] text-[#9b8ec4]">
                People sourced of {p.progress.authorised.toLocaleString()} authorised
              </div>
            </div>
          </div>
        </div>

        {/* ── WHAT HAS BEEN PAID ──────────────────────────────────────────────────────
            ⚠️ NO WALLET, NO PACK, NO PER-LEAD PRICE. Programme value and the two halves. */}
        <div className="border border-[#eee7f7] rounded-2xl px-4 py-3.5 mb-3">
          <div className="text-[11.5px] uppercase tracking-wide text-[#9b8ec4] font-bold mb-1.5">Programme</div>
          <div className="text-[15px] font-extrabold mb-1">{programmeMoney(p.money.totalCents)}</div>
          <div className="text-[12.5px] text-[#6b5f8c]">
            {p.money.firstPaidAt ? 'First 50% paid' : 'First 50% not yet paid'}
            {' · '}
            {p.money.secondPaidAt ? 'Second 50% paid' : 'Second 50% not yet paid'}
          </div>
          {!p.money.secondPaidAt && (
            // The founder's own framing of what Payment 1 buys, stated as fact rather than as
            // marketing: it authorises sourcing and preparation, and outreach has not started.
            <p className="text-[12.5px] text-[#9b8ec4] mt-1.5">
              The first payment authorises sourcing and preparation. Outreach has not started.
            </p>
          )}
        </div>

        {/* ── THE CONVERSATION ACCELERATOR ────────────────────────────────────────────
            Founder's words, per stage. A conversation starter, not a control: it takes the
            customer to Milla with the question already asked. */}
        <a
          href={`/milla?ask=${encodeURIComponent(p.quickAction)}`}
          className="inline-block border border-[#ece5fb] rounded-xl px-4 py-2.5 text-[13.5px] font-bold text-[#5c5279] hover:bg-[#f6f1ff] transition-colors"
        >
          {p.quickAction}
        </a>
    </div>
  )
}
