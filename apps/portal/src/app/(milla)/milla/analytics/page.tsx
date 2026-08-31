'use client'

// ═══════════════════════════════════════════════════════════════════════════════════════
// ANALYTICS — MILLA-NATIVE. THE PROGRAMME'S OWN SHAPE, AND ONLY WHAT IS MEASURED.
//
// ⚑ 31 Aug (BUILD-004A-2C). This file WAS a 13-line wrapper around
// `(dashboard)/dashboard/analytics/page.tsx` — 568 lines of the old portal's campaign
// analytics, a separately-routed live product that cannot be edited here.
//
// 🛑 EVERY CHART ON THAT SCREEN WAS TRACED INDIVIDUALLY (the table is in the PR). Three
// findings decided this page:
//
//   · OPEN RATE is not measured on cold email. The old screen knows this — it carries a
//     `trackingOff` flag and renders `null` — but the card survives as a permanent blank
//     beside real numbers, which reads as "zero opens" rather than "not tracked".
//   · The LEADS-BY-ICP and INDUSTRY bars are real counts, but they are counts of the LEADS
//     TABLE, not of a programme. For a programme client they describe a different object.
//   · An invented unsubscribe count (`replies * 0.05`) was removed from that file back in
//     #406 — the same class of defect, caught once already on the same screen.
//
// ⚠️ SO NOTHING IS REBUILT SPECULATIVELY. What survives is what is genuinely counted for THIS
// client and belongs to THIS programme. Where a chart had no truthful source it is not
// rendered, and the gap is reported rather than filled — a chart is a claim, and a
// good-looking one with no source is the most persuasive kind of lie this product can tell.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { createClient } from '@/lib/supabase/client'
import { MILLA_FAILURE_COPY } from '@kind/shared'
import { type CustomerProgramme } from '@/components/milla/ProgrammeWorkspace'
import { ProgrammeStat, ProgrammeHeader } from '@/components/milla/ProgrammeStat'
import { outreachHasRun } from '@/lib/programme-report'

type Outcomes = { replies_total: number; meetings_total: number; meetings_booked: number }

async function token(): Promise<string | undefined> {
  try { const { data } = await createClient().auth.getSession(); return data.session?.access_token } catch { return undefined }
}

export default function MillaAnalyticsPage() {
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
      setO(sr.status === 'fulfilled' ? sr.value.data : null)
      setLoading(false)
    })()
  }, [])

  /** A proportion of two REAL counts. Never rendered when the denominator is not real. */
  const share = (part: number, whole: number) =>
    whole > 0 ? `${Math.round((part / whole) * 100)}%` : null

  return (
    <div className="h-full overflow-y-auto px-6 py-6">
      <div className="max-w-3xl">
        <ProgrammeHeader title="Analytics" sub="What has been measured on your programme." />

        {loading && <p className="text-sm text-[#9b8ec4] mt-4">Loading your programme…</p>}
        {failed && (
          <div className="mt-4 border border-red-200 bg-red-50/60 rounded-2xl px-4 py-3">
            <p className="text-[13.5px] font-semibold text-red-800">{failed}</p>
          </div>
        )}

        {p && (
          <>
            {/* ── SOURCING SHARE — two numbers off the programme row, and their ratio.
                ⚠️ NOT A "COMPLETION" FIGURE. It is delivered against what was authorised, and
                it says nothing about whether the outcome will be hit. */}
            {p.progress.authorised > 0 && (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <ProgrammeStat
                  v={p.progress.delivered}
                  k={`People sourced of ${p.progress.authorised.toLocaleString()} authorised`}
                />
                <ProgrammeStat
                  v={share(p.progress.delivered, p.progress.authorised)}
                  k="Of the sourcing authorised so far"
                />
              </div>
            )}

            {/* ── WHAT OUTREACH PRODUCED. Counts only, and only once outreach has run.
                🛑 NO REPLY RATE. A rate needs a denominator of MESSAGES SENT, and no
                client-scoped sent count reaches these routes that is not gated on the retired
                paid approve — so the rate the old screen showed cannot be reproduced
                truthfully here. Reported rather than approximated. */}
            {outreachHasRun(p.stage) ? (
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <ProgrammeStat v={o === null ? null : o.replies_total} k="Replies, all time" />
                <ProgrammeStat v={o === null ? null : o.meetings_total} k="Meetings, all time" />
                <ProgrammeStat
                  v={o === null ? null : o.meetings_booked}
                  k="Meetings booked this month"
                />
                <ProgrammeStat
                  v={p.progress.outcomesAchieved}
                  k={p.progress.outcomesAchieved === null ? 'Meetings — not available right now' : 'Meetings on this programme'}
                />
              </div>
            ) : (
              <p className="mt-3 text-[12.5px] text-[#9b8ec4]">
                Outreach has not started, so there is nothing measured from sending yet.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  )
}
