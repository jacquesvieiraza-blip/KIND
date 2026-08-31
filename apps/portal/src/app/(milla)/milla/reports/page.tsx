'use client'

// ═══════════════════════════════════════════════════════════════════════════════════════
// REPORTS — MILLA-NATIVE, OUTCOME-LED.
//
// ⚑ 31 Aug (BUILD-004A-2C). This page was already Milla-native and already stale. On the
// founder's walk it read: "Leads approved", "Spend — your $299, 88 included leads left",
// "Cost per meeting", "Your <name> campaign is live" — the retired per-lead economics, on the
// screen a client opens to find out what they got for their money.
//
// ⚠️ THE STRUCTURE IS THE FOUNDER'S SIX QUESTIONS, not headings I chose: what were we trying
// to achieve · what happened · what worked · what did not · what did Milla learn · what
// happens next. Sections whose answer has no truthful source are NOT rendered — a report that
// invents a narrative from zeros is worse than a short one.
//
// ⚠️ NOTHING IS DERIVED INTO MONEY. No spend, no cost per meeting, no pipeline value. Billing
// is where money lives; this page answers what the work produced.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { createClient } from '@/lib/supabase/client'
import { MILLA_FAILURE_COPY } from '@kind/shared'
import { type CustomerProgramme } from '@/components/milla/ProgrammeWorkspace'
// ⛓️ 31 Aug (visual recovery) — LIKE-FOR-LIKE PRIMITIVE SWAP, NOTHING ELSE. `ProgrammeStat`
// became `ValueCard` when the shared kit was restored to the old portal's treatment. Reports'
// truth, structure, sections and copy are untouched — the founder's brief scoped this repair
// to Performance, Analytics and ROI, and this is the one edit the shared primitive forced.
import { ValueCard, ProgrammeHeader } from '@/components/milla/ProgrammeStat'
import { outreachHasRun, sourcingHasRun } from '@/lib/programme-report'

type Outcomes = { replies_total: number; meetings_total: number; meetings_booked: number }

async function token(): Promise<string | undefined> {
  try { const { data } = await createClient().auth.getSession(); return data.session?.access_token } catch { return undefined }
}

export default function MillaReportsPage() {
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

  const Section = ({ q, children }: { q: string; children: React.ReactNode }) => (
    <div className="mt-5">
      <div className="text-[11.5px] uppercase tracking-wide text-[#9b8ec4] font-bold mb-2">{q}</div>
      {children}
    </div>
  )

  return (
    <div className="h-full overflow-y-auto px-6 py-6">
      <div className="max-w-3xl">
        <ProgrammeHeader title="Reports" sub="What your programme set out to do, and what it has produced." />

        {loading && <p className="text-sm text-[#9b8ec4] mt-4">Loading your programme…</p>}
        {failed && (
          <div className="mt-4 border border-red-200 bg-red-50/60 rounded-2xl px-4 py-3">
            <p className="text-[13.5px] font-semibold text-red-800">{failed}</p>
          </div>
        )}

        {p && (
          <>
            {/* 1 · WHAT WERE WE TRYING TO ACHIEVE? */}
            <Section q="What were we trying to achieve?">
              <div className="bg-white border border-[#eee7f7] rounded-2xl px-5 py-4">
                <div className="text-[15px] font-extrabold text-[#1f1235]">
                  {p.outcome.target ? `${p.outcome.target} booked meetings` : 'No target is set yet'}
                </div>
                <div className="text-[12.5px] text-[#6b5f8c] mt-0.5">
                  {p.stage}{p.paused ? ' · paused' : ''}{p.reviewOpen ? ' · a review decision is waiting' : ''}
                </div>
                {p.paused && p.pausedCopy && (
                  <p className="text-[12.5px] text-[#b45309] mt-2">{p.pausedCopy}</p>
                )}
              </div>
            </Section>

            {/* 2 · WHAT HAPPENED?
                ⚠️ EACH FIGURE IS GATED ON WHETHER ITS WORK COULD HAVE HAPPENED. Sourcing is
                authorised by Payment 1; outreach by Payment 2. Showing a zero for work that
                was never authorised reads as failure rather than as sequence. */}
            <Section q="What happened?">
              {!sourcingHasRun(p.stage) ? (
                <p className="text-[13px] text-[#9b8ec4]">
                  Nothing has been sourced or sent yet — the programme has not reached that step.
                </p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {p.progress.authorised > 0 && (
                    <ValueCard
                      value={p.progress.delivered}
                      label={`People sourced of ${p.progress.authorised.toLocaleString()} authorised`}
                    />
                  )}
                  <ValueCard
                    value={p.progress.outcomesAchieved}
                    label={p.progress.outcomesAchieved === null ? 'Meetings — not available right now' : 'Meetings booked'}
                  />
                  {outreachHasRun(p.stage) && (
                    <ValueCard value={o === null ? null : o.replies_total} label="Replies, all time" />
                  )}
                  {outreachHasRun(p.stage) && (
                    <ValueCard value={o === null ? null : o.meetings_total} label="Meetings, all time" />
                  )}
                </div>
              )}
            </Section>

            {/* 3–5 · WHAT WORKED · WHAT DID NOT · WHAT MILLA LEARNED
                🛑 NOT RENDERED, AND THAT IS THE HONEST ANSWER RATHER THAN A GAP.
                "What worked" needs per-message or per-segment outcome attribution; "what did
                not" needs the same in reverse; "what Milla learned" is the Nexus profile,
                which is OUTREACH-performance learning and is not truthful before outreach has
                run (the 4A-1 finding that hid that card at Proof). None of the three has a
                client-scoped source these routes can read today, and manufacturing a
                narrative out of a reply count would be exactly the invention the brief
                forbids. Reported as a gap for the founder rather than filled. */}

            {/* 6 · WHAT HAPPENS NEXT?
                ⚠️ THE STAGE, STATED — not a promise and not a date. `quickAction` is the
                founder's own per-stage wording, already approved and already used on the
                workspace, so this invents nothing. */}
            <Section q="What happens next?">
              <a
                href={`/milla?ask=${encodeURIComponent(p.quickAction)}`}
                className="inline-block border border-[#ece5fb] rounded-xl px-4 py-2.5 text-[13.5px] font-bold text-[#5c5279] hover:bg-[#f6f1ff] transition-colors"
              >
                {p.quickAction}
              </a>
            </Section>
          </>
        )}
      </div>
    </div>
  )
}
