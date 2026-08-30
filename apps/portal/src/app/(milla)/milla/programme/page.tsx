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
import { MILLA_STAGES, MILLA_FAILURE_COPY, type MillaStage } from '@kind/shared'

type CustomerProgramme = {
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

const money = (cents: number) =>
  `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`

export default function ProgrammePage() {
  const [p, setP] = useState<CustomerProgramme | null>(null)
  const [failed, setFailed] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      try {
        const supabase = createClient()
        const { data: { session } } = await supabase.auth.getSession()
        const r = await api.get<{ data: CustomerProgramme }>('/my/programme', session?.access_token)
        setP(r.data)
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

  const stageIndex = MILLA_STAGES.indexOf(p.stage)

  return (
    <div className="h-full overflow-y-auto p-5 sm:p-6">
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
              <div className="text-[12px] text-[#9b8ec4]">
                People reached of {p.progress.authorised.toLocaleString()} authorised
              </div>
            </div>
          </div>
        </div>

        {/* ── WHAT HAS BEEN PAID ──────────────────────────────────────────────────────
            ⚠️ NO WALLET, NO PACK, NO PER-LEAD PRICE. Programme value and the two halves. */}
        <div className="border border-[#eee7f7] rounded-2xl px-4 py-3.5 mb-3">
          <div className="text-[11.5px] uppercase tracking-wide text-[#9b8ec4] font-bold mb-1.5">Programme</div>
          <div className="text-[15px] font-extrabold mb-1">{money(p.money.totalCents)}</div>
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
    </div>
  )
}
