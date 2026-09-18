'use client'

// ═══════════════════════════════════════════════════════════════════════════════════════
// USAGE — MILLA-NATIVE. WHAT THE PROGRAMME HAS ACTUALLY DELIVERED.
//
// ⚑ 31 Aug (BUILD-004A-2B). This file WAS a 13-line wrapper that imported and rendered
// `(dashboard)/dashboard/usage/page.tsx`, the OLD portal's usage screen — a separately-routed
// live product. So a Milla customer was reading, verbatim:
//
//   "Per-lead spend this month" · "You pay per approved lead — no monthly bundle" ·
//   "Leads approved · $4 each" · Wallet · Added · Spent · "Weekly credit usage" ·
//   "No credits used yet" · Credit history · Manual grant · pipeline value on the old economics
//
// All retired. It could not be edited in place without changing `/dashboard`, hence the
// founder's locked ruling: FORK. This page imports nothing from `(dashboard)`.
//
// 🛑 USAGE IS NOT A SECOND BILLING PAGE. Billing answers "what am I paying and what does each
// payment authorise". This answers "what has my programme actually done". They share the
// programme read and nothing else — the old screen mixed both and was mostly money, which is
// how a delivery page ended up leading with per-lead spend.
//
// ⚠️ EVERY NUMBER IS A ROW THAT EXISTS. No usage units, no credit equivalents, no programme
// value converted into anything, and no metric invented to fill a card. Where a truthful
// source does not exist the card is not rendered — an empty card is honest, a fabricated one
// is not.
//
// ⚠️ STAGE-AWARE, BUT REAL DATA OUTRANKS THE STAGE. Before outreach is authorised the page
// does not claim outreach activity. It also never INFERS activity from the stage: if the
// programme is Live and the counts are zero, zero is what it shows.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { createClient } from '@/lib/supabase/client'
import { MILLA_FAILURE_COPY, type MillaStage } from '@kind/shared'
import { type CustomerProgramme } from '@/components/milla/ProgrammeWorkspace'

/** The slice of the summary this page reads. Both counts are client-scoped and real. */
// ⛓️ 18 Sep (J24-C1) — `number | null`. The server used to send 0 for a count it could not
// read; it now sends `null`, and `ValueCard` has always rendered `null` as an em dash
// ("`null` IS STILL A DASH … Every figure here distinguishes 'we could not read it' from
// zero"). The type was the last place still claiming a number was always available.
type Outcomes = { replies_total: number | null; meetings_total: number | null; meetings_booked: number | null }

async function token(): Promise<string | undefined> {
  try { const { data } = await createClient().auth.getSession(); return data.session?.access_token } catch { return undefined }
}

/**
 * Stages at which outreach can have happened.
 *
 * ⚠️ THE SAME SET THE HOME USES for its send-state gate. Outreach is authorised by Payment 2,
 * which lands at Approval → Live; before that, reply and meeting counts on THIS programme
 * cannot be its work.
 */
const OUTREACH_STAGES: MillaStage[] = ['Live', 'Review', 'Completion']

export default function MillaUsagePage() {
  const [p, setP] = useState<CustomerProgramme | null>(null)
  const [o, setO] = useState<Outcomes | null>(null)
  const [failed, setFailed] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      const tok = await token()
      const [pr, sr] = await Promise.allSettled([
        api.get<{ data: CustomerProgramme }>('/my/programme', tok),
        api.get<{ data: Outcomes }>('/leads/milla-summary', tok),
      ])
      if (pr.status === 'fulfilled') setP(pr.value.data)
      else {
        const msg = pr.reason instanceof Error ? pr.reason.message : ''
        setFailed(msg && msg.length < 200 ? msg : MILLA_FAILURE_COPY.pipelineFailed)
      }
      // ⚠️ null MEANS UNREADABLE, NOT ZERO. Rendering a failed lookup as "0 replies" tells a
      // client with six that they have none.
      setO(sr.status === 'fulfilled' ? sr.value.data : null)
      setLoading(false)
    })()
  }, [])

  const live = !!p && OUTREACH_STAGES.includes(p.stage)

  /** One figure, its label, and nothing derived. */
  const Stat = ({ v, k }: { v: string; k: string }) => (
    <div className="bg-white border border-[#eee7f7] rounded-2xl px-5 py-4">
      <div className="text-[22px] font-extrabold text-[#1f1235] tabular-nums">{v}</div>
      <div className="text-[12.5px] text-[#9b8ec4] mt-0.5">{k}</div>
    </div>
  )

  return (
    <div className="h-full overflow-y-auto px-6 py-6">
      <div className="max-w-3xl">
        <h1 className="text-2xl font-bold text-[#1f1235]">Usage</h1>
        <p className="text-sm text-[#7c6f9b] mt-0.5">What your programme has delivered so far.</p>

        {loading && <p className="text-sm text-[#9b8ec4] mt-4">Loading your programme…</p>}

        {failed && (
          <div className="mt-4 border border-red-200 bg-red-50/60 rounded-2xl px-4 py-3">
            <p className="text-[13.5px] font-semibold text-red-800">{failed}</p>
          </div>
        )}

        {p && (
          <>
            {/* ── WHERE THE PROGRAMME IS ─────────────────────────────────────────────
                Stage and outcome are the frame for everything below: the same numbers mean
                different things at Sourcing and at Live. */}
            <div className="mt-4 bg-white border border-[#eee7f7] rounded-2xl px-5 py-4">
              <div className="text-[11.5px] uppercase tracking-wide text-[#9b8ec4] font-bold mb-1.5">Programme</div>
              <div className="text-[15px] font-extrabold text-[#1f1235]">
                {p.stage}{p.paused ? ' · paused' : ''}
              </div>
              <div className="text-[12.5px] text-[#6b5f8c] mt-0.5">
                {p.outcome.target ? `${p.outcome.target} booked meetings` : 'No target is set yet'}
              </div>
              {p.paused && p.pausedCopy && (
                <p className="text-[12.5px] text-[#b45309] mt-2">{p.pausedCopy}</p>
              )}
            </div>

            {/* ── SOURCING, AGAINST WHAT WAS AUTHORISED ──────────────────────────────
                ⚠️ BOTH FIGURES COME STRAIGHT OFF THE PROGRAMME ROW — `sourced_used` against
                `sourcing_ceiling`. Not a percentage of the outcome target, not a projection,
                and never shown when nothing has been authorised: "0 of 0" is not information.
                Payment 1 is what authorises this, which is why it can be non-zero long before
                anybody has been contacted. */}
            {p.progress.authorised > 0 && (
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <Stat v={p.progress.delivered.toLocaleString()} k={`People sourced of ${p.progress.authorised.toLocaleString()} authorised`} />
                <Stat
                  v={p.progress.outcomesAchieved === null ? '—' : String(p.progress.outcomesAchieved)}
                  k={p.progress.outcomesAchieved === null ? 'Meetings — not available right now' : 'Meetings booked'}
                />
              </div>
            )}

            {/* ── WHAT THE OUTREACH HAS PRODUCED ─────────────────────────────────────
                🛑 ONLY ONCE OUTREACH IS A REAL THING. Before Payment 2 nothing has been sent,
                so a reply count here would be another programme's history or a legacy number
                — either way not this programme's work. `null` is unreadable, never zero. */}
            {live && (
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {/* ⛓️ 18 Sep (J24-C1) — THE PER-FIELD CASE, which is the ordinary one.
                    WHAT THIS REPLACED: ~~`o === null ? '—' : o.replies_total.toLocaleString()`~~
                    — it handled the WHOLE outcomes read failing and could not express one count
                    failing, because the server had already turned that into a confident `0`.
                    The comment three lines up ("`null` is unreadable, never zero") was the
                    intent all along; this is the first version in which it is true per number. */}
                <Stat
                  v={o?.replies_total == null ? '—' : o.replies_total.toLocaleString()}
                  k={o?.replies_total == null ? 'Replies — not available right now' : 'Replies, all time'}
                />
                <Stat
                  v={o?.meetings_total == null ? '—' : o.meetings_total.toLocaleString()}
                  k={o?.meetings_total == null ? 'Meetings — not available right now' : 'Meetings, all time'}
                />
              </div>
            )}

            {/* ⚠️ SAID PLAINLY RATHER THAN SHOWN AS ZEROS. A client before Live seeing empty
                reply and meeting cards would read them as "the outreach is failing"; the
                truth is that it has not been authorised to start. This states the stage fact
                and claims nothing about timing. */}
            {!live && (
              <p className="mt-3 text-[12.5px] text-[#9b8ec4]">
                Outreach has not started, so there is no sending activity to show yet.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  )
}
