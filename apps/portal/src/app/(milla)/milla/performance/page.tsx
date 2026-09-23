'use client'

// ═══════════════════════════════════════════════════════════════════════════════════════
// PERFORMANCE — MILLA-NATIVE. THE PROGRAMME AGAINST WHAT IT WAS BOUGHT TO DELIVER.
//
// ⚑ 31 Aug — VISUAL RECOVERY. My first cut was one card and a sentence. The founder:
// *"This feels very shallow. It is very flat."* He is right, and the error was specific: I
// removed the BenchmarkRow COMPONENT because the `industryAvg={0.071}` fed into it was
// invented. The bar was never the lie — the constant was.
//
// So the presentation is back: hero card, icon tiles, progress bars, the stage rail, the
// gradient panel. All of it lifted from the old `(dashboard)/kpis` and `/roi` screens.
// ⚠️ WHAT IS NOT BACK: any benchmark input. `ProgressBar` cannot take one — it draws a ratio
// of two real numbers, so there is nowhere for a made-up comparison to enter.
//
// ⚠️ AND NOTHING CLAIMS OUTREACH IT HAS NOT DONE. At Recommendation this page is genuinely
// rich — target, stage rail, sourcing authorisation — while stating plainly that sending has
// not begun. Rich and honest are not in tension; treating them as though they were is what
// produced the flat version.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { createClient } from '@/lib/supabase/client'
import { MILLA_FAILURE_COPY, MILLA_STAGES, PROGRAMME_BEST_EFFORTS } from '@kind/shared'
import { type CustomerProgramme } from '@/components/milla/ProgrammeWorkspace'
import { ValueCard, ProgressBar, Panel, StageRail, PreLiveState, ProgrammeHeader } from '@/components/milla/ProgrammeStat'
import { outreachHasRun } from '@/lib/programme-report'
import { Target, CalendarCheck, MessageSquare, Users } from 'lucide-react'

// ⛓️ 18 Sep (J24-C1) — `number | null`. The server used to send 0 for a count it could not
// read; it now sends `null`, and `ValueCard` has always rendered `null` as an em dash
// ("`null` IS STILL A DASH … Every figure here distinguishes 'we could not read it' from
// zero"). The type was the last place still claiming a number was always available.
type Outcomes = { replies_total: number | null; meetings_total: number | null; meetings_booked: number | null }

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

  const live = !!p && outreachHasRun(p.stage)

  return (
    <div className="h-full overflow-y-auto px-6 py-6">
      <div className="max-w-4xl">
        <ProgrammeHeader title="Performance" sub="How your programme is doing against what it set out to deliver." />

        {loading && <p className="text-sm text-[#9b8ec4] mt-4">Loading your programme…</p>}
        {failed && (
          <div className="mt-4 border border-red-200 bg-red-50/60 rounded-2xl px-4 py-3">
            <p className="text-[13.5px] font-semibold text-red-800">{failed}</p>
          </div>
        )}

        {p && (
          <>
            {/* ── THE HEADLINE GRID. Hero = the outcome they bought. */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
              <ValueCard
                hero
                label="Booked meetings targeted"
                value={p.outcome.target}
                sub={p.outcome.target ? `${p.stage}${p.paused ? ' · paused' : ''}` : 'No target is set yet'}
                icon={<Target className="w-6 h-6" />}
              />
              <ValueCard
                label="Meetings booked"
                value={p.progress.outcomesAchieved}
                sub={p.progress.outcomesAchieved === null ? 'not available right now' : 'on this programme'}
                icon={<CalendarCheck className="w-4.5 h-4.5" />}
                tone="emerald"
              />
              {/* ⛓️ 23 Sep (R136 ③) — the sub-line WAS `of {authorised} authorised`, the sourcing
                  ceiling (meetings × 400): the internal limit, never disclosed. */}
              <ValueCard
                label="People sourced"
                value={p.progress.sourcingAuthorised ? p.progress.delivered : null}
                sub={p.progress.sourcingAuthorised ? 'for this programme' : 'sourcing not authorised yet'}
                icon={<Users className="w-4.5 h-4.5" />}
              />
            </div>

            {/* ── WHERE THE PROGRAMME IS, DRAWN. The seven approved stages. */}
            <div className="mt-4">
              <Panel title="Programme" chip={p.paused ? 'Paused' : p.reviewOpen ? 'Review open' : undefined}>
                <StageRail stages={MILLA_STAGES} current={p.stage} />
                {p.paused && p.pausedCopy && (
                  <p className="text-[12.5px] text-[#b45309] mt-3">{p.pausedCopy}</p>
                )}
              </Panel>
            </div>

            {/* ── PROGRESS BARS — ratios of two real numbers, no benchmark input. */}
            {p.outcome.target && (
              <div className="mt-4 rounded-2xl border border-purple-100/60 bg-white p-6 space-y-4">
                <p className="text-xs font-semibold text-[#9B8EC4] uppercase tracking-wider">Progress</p>
                {p.outcome.target && p.progress.outcomesAchieved !== null && (
                  <ProgressBar
                    label="Meetings booked against target"
                    value={p.progress.outcomesAchieved}
                    max={p.outcome.target}
                    color="bg-emerald-500"
                  />
                )}
                {/* ⛓️ 23 Sep (R136 ③) — REMOVED: "People sourced of authorised", a bar whose max was
                    the sourcing ceiling. A bar discloses its maximum as surely as a number does.
                    ⚑ R136 ② — the meeting target is aimed for, not guaranteed. */}
                {/* ⚑ 23 Sep — in the removed bar's place, a ratio of two numbers that are the
                    client's own: of the people who replied, how many booked. */}
                {o?.meetings_total != null && o?.replies_total != null && o.replies_total > 0 && (
                  <ProgressBar
                    label="Replies that became meetings"
                    value={o.meetings_total}
                    max={o.replies_total}
                  />
                )}
                <p className="text-[12px] text-[#9B8EC4]">{PROGRAMME_BEST_EFFORTS}</p>
              </div>
            )}

            {/* ── OUTREACH — real once it has run; an intentional pre-live state before. */}
            <div className="mt-4">
              {live ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <ValueCard
                    label="Replies, all time"
                    value={o === null ? null : o.replies_total}
                    icon={<MessageSquare className="w-4.5 h-4.5" />}
                    tone="amber"
                  />
                  <ValueCard
                    label="Meetings, all time"
                    value={o === null ? null : o.meetings_total}
                    icon={<CalendarCheck className="w-4.5 h-4.5" />}
                    tone="emerald"
                  />
                </div>
              ) : (
                <PreLiveState
                  what="Outreach starts once the programme is approved and the second payment lands. From then on this is where its performance appears."
                  measures={['Replies', 'Meetings booked', 'Outreach activity', 'Progress against target']}
                />
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
