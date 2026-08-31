'use client'

// ═══════════════════════════════════════════════════════════════════════════════════════
// PERFORMANCE — MILLA-NATIVE. THE PROGRAMME AGAINST ITS TARGET.
//
// ⚑ 31 Aug (BUILD-004A-2C). This file WAS a 13-line wrapper around
// `(dashboard)/dashboard/kpis/page.tsx` — 908 lines of the old portal's campaign KPI screen,
// which is a separately-routed live product and cannot be edited here.
//
// 🛑 WHAT CAME WITH IT, AND WHY IT IS NOT REBUILT. That screen's centrepiece is a
// BenchmarkRow set — reply rate against `industryAvg={0.071}`, open rate against `{0.42}`,
// interested rate against `{0.020}` — hardcoded constants presented beside a client's own
// numbers as though we had measured an industry. They are planning figures. Printed as a
// comparison on a customer's performance page they become a claim about how they are doing
// against everybody else, which nothing in this product can support.
//
// ⚠️ SO PERFORMANCE ANSWERS ONE QUESTION HONESTLY: how is this programme doing against the
// target it was bought to hit. Delivered against authorised, meetings against target. No
// score, no grade, no index, no benchmark — and no revenue.
//
// ⚠️ PROGRESS IS ARITHMETIC ON TWO REAL NUMBERS, never a projection. "N of M" is a fact;
// "on track" would be a forecast, and this page makes none.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { createClient } from '@/lib/supabase/client'
import { MILLA_FAILURE_COPY } from '@kind/shared'
import { type CustomerProgramme } from '@/components/milla/ProgrammeWorkspace'
import { ProgrammeStat, ProgrammeHeader } from '@/components/milla/ProgrammeStat'
import { outreachHasRun, sourcingHasRun } from '@/lib/programme-report'

type Outcomes = { replies_total: number; meetings_total: number; meetings_booked: number }

async function token(): Promise<string | undefined> {
  try { const { data } = await createClient().auth.getSession(); return data.session?.access_token } catch { return undefined }
}

export default function MillaPerformancePage() {
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

  return (
    <div className="h-full overflow-y-auto px-6 py-6">
      <div className="max-w-3xl">
        <ProgrammeHeader title="Performance" sub="How your programme is doing against what it set out to deliver." />

        {loading && <p className="text-sm text-[#9b8ec4] mt-4">Loading your programme…</p>}
        {failed && (
          <div className="mt-4 border border-red-200 bg-red-50/60 rounded-2xl px-4 py-3">
            <p className="text-[13.5px] font-semibold text-red-800">{failed}</p>
          </div>
        )}

        {p && (
          <>
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

            {/* ⚠️ MEETINGS AGAINST THE TARGET — the only "performance" this product can state,
                and only when BOTH halves are real. A target with no achieved count, or an
                achieved count with no target, is not a ratio. */}
            {p.outcome.target && p.progress.outcomesAchieved !== null && (
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <ProgrammeStat
                  v={`${p.progress.outcomesAchieved} of ${p.outcome.target}`}
                  k="Meetings booked against target"
                />
                {p.progress.authorised > 0 && (
                  <ProgrammeStat
                    v={`${p.progress.delivered.toLocaleString()} of ${p.progress.authorised.toLocaleString()}`}
                    k="People sourced of authorised"
                  />
                )}
              </div>
            )}

            {/* Sourcing on its own, when there is no target to measure meetings against. */}
            {!p.outcome.target && sourcingHasRun(p.stage) && p.progress.authorised > 0 && (
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <ProgrammeStat
                  v={`${p.progress.delivered.toLocaleString()} of ${p.progress.authorised.toLocaleString()}`}
                  k="People sourced of authorised"
                />
              </div>
            )}

            {outreachHasRun(p.stage) && (
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <ProgrammeStat v={o === null ? null : o.replies_total} k="Replies, all time" />
                <ProgrammeStat v={o === null ? null : o.meetings_total} k="Meetings, all time" />
              </div>
            )}

            {!outreachHasRun(p.stage) && (
              <p className="mt-3 text-[12.5px] text-[#9b8ec4]">
                Outreach has not started, so there is no sending performance to show yet.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  )
}
