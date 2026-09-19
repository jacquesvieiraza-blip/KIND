'use client'

// ═══════════════════════════════════════════════════════════════════════════════════════
// YOUR ROI — MILLA-NATIVE. WHAT WE DELIVERED, WHAT IT COST, AND THE ONE THING WE CANNOT SAY.
//
// ⚑ 31 Aug — VISUAL RECOVERY. The founder's brief puts it exactly right: *"The fact that ROI
// cannot yet be calculated should be a WELL-DESIGNED state, not the reason the entire page
// becomes flat."* My first cut made the absence of a number into the absence of a page.
//
// 🛑 THE FINDING FROM #1620 STANDS AND IS UNCHANGED. The old hero card, "Pipeline value
// touched", came from `SUM(leads.estimated_deal_value_usd)`, written at `lib/scoring.ts:221`
// as `r.score * 100` — a fit score times a hundred, printed as money. That number is still
// gone, and its writer is PARKED as a separate defect by founder decision.
//
// ⚠️ WHAT COMES BACK IS THE CARD, NOT THE NUMBER. The hero ValueCard now holds the programme
// value, which is real and sits on the programme row. Same treatment, honest input — which is
// the whole lesson of this repair: the component was never the lie.
//
// ⚠️ THE RETURN SECTION IS DESIGNED, NOT APOLOGETIC. It states what we know, what we do not,
// and exactly which three numbers only the customer has — and it agrees with Milla, who
// correctly told the founder she needs a target outcome to measure against.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { createClient } from '@/lib/supabase/client'
import { MILLA_FAILURE_COPY, MILLA_STAGES } from '@kind/shared'
import { type CustomerProgramme } from '@/components/milla/ProgrammeWorkspace'
import { programmeMoney } from '@/lib/programme-money'
import { ValueCard, ProgressBar, Panel, StageRail, ProgrammeHeader } from '@/components/milla/ProgrammeStat'
import { canComputeRoi, ROI_MISSING_INPUTS, outreachHasRun } from '@/lib/programme-report'
import { Gem, Target, CalendarCheck, MessageSquare, HelpCircle } from 'lucide-react'

// ⛓️ 18 Sep (J24-C1) — `number | null`. The server used to send 0 for a count it could not
// read; it now sends `null`, and `ValueCard` has always rendered `null` as an em dash
// ("`null` IS STILL A DASH … Every figure here distinguishes 'we could not read it' from
// zero"). The type was the last place still claiming a number was always available.
type Outcomes = { replies_total: number | null; meetings_total: number | null; meetings_booked: number | null }

async function token(): Promise<string | undefined> {
  try { const { data } = await createClient().auth.getSession(); return data.session?.access_token } catch { return undefined }
}

export default function MillaRoiPage() {
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
        <ProgrammeHeader title="Your ROI" sub="What your programme cost, and what it has produced." />

        {loading && <p className="text-sm text-[#9b8ec4] mt-4">Loading your programme…</p>}
        {failed && (
          <div className="mt-4 border border-red-200 bg-red-50/60 rounded-2xl px-4 py-3">
            <p className="text-[13.5px] font-semibold text-red-800">{failed}</p>
          </div>
        )}

        {p && (
          <>
            {/* ── THE HEADLINE GRID. Hero = the programme's real price. */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
              <ValueCard
                hero
                label="Programme value"
                value={p.money.totalCents > 0 ? programmeMoney(p.money.totalCents) : null}
                sub={p.money.totalCents > 0
                  ? `${p.money.firstPaidAt ? 'First 50% paid' : 'First 50% not yet paid'} · ${p.money.secondPaidAt ? 'second 50% paid' : 'second 50% not yet paid'}`
                  : 'No programme price has been set yet'}
                icon={<Gem className="w-6 h-6" />}
              />
              <ValueCard
                label="Booked meetings targeted"
                value={p.outcome.target}
                sub={p.outcome.target ? 'the outcome you asked for' : 'no target is set yet'}
                icon={<Target className="w-4.5 h-4.5" />}
              />
              <ValueCard
                label="Meetings booked"
                value={p.progress.outcomesAchieved}
                sub={p.progress.outcomesAchieved === null ? 'not available right now' : 'delivered so far'}
                icon={<CalendarCheck className="w-4.5 h-4.5" />}
                tone="emerald"
              />
            </div>

            <div className="mt-4">
              <Panel title="Programme" chip={p.paused ? 'Paused' : undefined}>
                <StageRail stages={MILLA_STAGES} current={p.stage} />
                {p.outcome.target && p.progress.outcomesAchieved !== null && (
                  <div className="mt-4">
                    <ProgressBar
                      label="Meetings booked against target"
                      value={p.progress.outcomesAchieved}
                      max={p.outcome.target}
                      color="bg-emerald-500"
                    />
                  </div>
                )}
              </Panel>
            </div>

            {live && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
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
            )}

            {/* ── 🛑 THE RETURN SECTION — a designed state, not an apology.
                The approved wording is unchanged; only its placement and treatment moved. */}
            {!canComputeRoi() && (
              <div className="mt-4 rounded-2xl border-2 border-[#7C3AED]/20 bg-[#F5F0FF] p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-[#7C3AED]/10 flex items-center justify-center shrink-0 text-[#7C3AED]">
                    <HelpCircle className="w-6 h-6" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-[#7C3AED] uppercase tracking-wider mb-1">
                      Return
                    </p>
                    <p className="text-[13.5px] text-[#5c5279] leading-relaxed">
                      We can show you what your programme cost and what it produced. We can&rsquo;t
                      work out a return, because that depends on numbers only you have:
                    </p>
                    <div className="mt-3 grid gap-2 sm:grid-cols-3">
                      {ROI_MISSING_INPUTS.map(x => (
                        <div key={x} className="rounded-xl border border-[#7C3AED]/15 bg-white/70 px-3.5 py-2.5">
                          <span className="text-[12.5px] text-[#5c5279]">{x}</span>
                        </div>
                      ))}
                    </div>
                    <a
                      href={`/milla?ask=${encodeURIComponent('How is my ROI looking?')}`}
                      className="inline-flex items-center gap-1.5 mt-4 px-4 py-2 text-sm font-semibold text-white bg-[#7C3AED] hover:bg-[#6D28D9] rounded-xl transition-colors"
                    >
                      How is my ROI looking?
                    </a>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
