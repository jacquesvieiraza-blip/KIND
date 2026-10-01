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

import { useMillaConversation } from '@/components/milla/MillaConversation'
import { mvp1MillaStageFromLegacy } from '@kind/shared'   // ⚑ 29 Sep (R174 · 6a) — the six words
import { totalsLabel, type TotalsScope } from '@/lib/totals-label'
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

// ⛓️ 18 Sep (J24-C1) — `number | null`. The server used to send 0 for a count it could not
// read; it now sends `null`, and `ValueCard` has always rendered `null` as an em dash
// ("`null` IS STILL A DASH … Every figure here distinguishes 'we could not read it' from
// zero"). The type was the last place still claiming a number was always available.
type Outcomes = { replies_total: number | null; meetings_total: number | null; meetings_booked: number | null; totals_scope?: TotalsScope }
// ⚑ 1 Oct (R180 · #2497) — Growth Reporting, from `/my/programme/growth-report` (`lib/growth-report.ts`).
type GrowthReport = {
  progression: { ready: boolean; answered: number; rows: { label: string; count: number }[]; text: string } | null
  patterns: { kind: string; text: string }[]
  note: string | null
  suggestion: { text: string; note: string; ask: string } | null
}

async function token(): Promise<string | undefined> {
  try { const { data } = await createClient().auth.getSession(); return data.session?.access_token } catch { return undefined }
}

export default function MillaReportsPage() {
  const ask = useMillaConversation().ask
  const [p, setP] = useState<CustomerProgramme | null>(null)
  const [o, setO] = useState<Outcomes | null>(null)
  // `null` = not on the plan (Founders), or unreadable — the Growth sections are then simply absent.
  const [g, setG] = useState<GrowthReport | null>(null)
  const [failed, setFailed] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      const tok = await token()
      const [pr, sr, gr] = await Promise.allSettled([
        api.get<{ data: CustomerProgramme }>('/my/programme', tok),
        api.get<{ data: Outcomes }>('/leads/milla-summary', tok),
        api.get<{ data: { report: GrowthReport | null } }>('/my/programme/growth-report', tok),
      ])
      if (pr.status === 'fulfilled') setP(pr.value.data)
      else {
        const msg = pr.reason instanceof Error ? pr.reason.message : ''
        setFailed(msg && msg.length < 200 ? msg : MILLA_FAILURE_COPY.pipelineFailed)
      }
      setO(sr.status === 'fulfilled' ? sr.value.data : null)
      setG(gr.status === 'fulfilled' ? (gr.value.data?.report ?? null) : null)
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
                  {p.outcome.target ? `${p.outcome.target} qualified meetings` : 'No target is set yet'}
                </div>
                <div className="text-[12.5px] text-[#6b5f8c] mt-0.5">
                  {mvp1MillaStageFromLegacy(p.stage)}{p.paused ? ' · paused' : ''}{p.reviewOpen ? ' · a decision is waiting' : ''}
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
                  {/* ⛓️ 23 Sep (R136 ③) — WAS measured against `progress.authorised`, the sourcing ceiling (meetings × 400): the internal limit, never disclosed. The server now sends only whether sourcing is authorised. */}
                  {p.progress.sourcingAuthorised && (
                    <ValueCard value={p.progress.delivered} label="People sourced" />
                  )}
                  <ValueCard
                    value={p.progress.outcomesAchieved}
                    label={p.progress.outcomesAchieved === null ? 'Meetings — not available right now' : 'Meetings booked'}
                  />
                  {outreachHasRun(p.stage) && (
                    <ValueCard value={o === null ? null : o.replies_total} label={totalsLabel('Replies', o?.totals_scope)} />
                  )}
                  {outreachHasRun(p.stage) && (
                    <ValueCard value={o === null ? null : o.meetings_total} label={totalsLabel('Meetings', o?.totals_scope)} />
                  )}
                </div>
              )}
            </Section>

            {/* ⛓️ 1 Oct (R180 · #2497) — "WHAT WORKED?" NOW HAS A TRUTHFUL SOURCE, for Growth and above:
                F1's "How did it go?" answers (progression) and the What's converting findings (patterns),
                both counted from the client's own rows by `lib/growth-report.ts`. Below the minimum the
                server says "too early" — never a thin number. Founders (no Full Coaching) see no section,
                exactly as before. The note below stood for all three questions and still stands for any
                plan without these sources:
                ~~3–5 · WHAT WORKED · WHAT DID NOT · WHAT MILLA LEARNED
                🛑 NOT RENDERED, AND THAT IS THE HONEST ANSWER RATHER THAN A GAP.~~
                "What worked" needs per-message or per-segment outcome attribution; "what did
                not" needs the same in reverse; "what Milla learned" is the Nexus profile,
                which is OUTREACH-performance learning and is not truthful before outreach has
                run (the 4A-1 finding that hid that card at Proof). None of the three has a
                client-scoped source these routes can read today, and manufacturing a
                narrative out of a reply count would be exactly the invention the brief
                forbids. Reported as a gap for the founder rather than filled. */}
            {/* Only once outreach has run — before that there is nothing to have worked (the 'What happened?' rule). */}
            {g && outreachHasRun(p.stage) && (
              <Section q="What worked?">
                <div className="grid gap-3">
                  {g.progression && (
                    <div className="bg-white border border-[#eee7f7] rounded-2xl px-5 py-4" data-testid="growth-progression">
                      <div className="text-[14px] font-extrabold text-[#1f1235]">{g.progression.text}</div>
                      {g.progression.ready && (
                        <div className="flex flex-wrap gap-x-6 gap-y-1.5 mt-2">
                          {g.progression.rows.map(r => (
                            <div key={r.label}>
                              <div className="text-[15px] font-extrabold tabular-nums">{r.count}</div>
                              <div className="text-[12px] text-[#9b8ec4]">{r.label}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  <div className="bg-white border border-[#eee7f7] rounded-2xl px-5 py-4" data-testid="growth-patterns">
                    <div className="text-[11.5px] uppercase tracking-wide text-[#9b8ec4] font-bold mb-1.5">Patterns from your own replies and meetings</div>
                    {g.patterns.length === 0 ? (
                      <p className="text-[12.5px] text-[#9b8ec4]">{g.note}</p>
                    ) : (
                      <ul className="flex flex-col gap-1.5">
                        {g.patterns.map(f => <li key={f.kind + f.text} className="text-[12.5px] text-[#4c4368] leading-relaxed">{f.text}</li>)}
                      </ul>
                    )}
                  </div>
                </div>
              </Section>
            )}

            {/* 6 · WHAT HAPPENS NEXT?
                ⚠️ THE STAGE, STATED — not a promise and not a date. `quickAction` is the
                founder's own per-stage wording, already approved and already used on the
                workspace, so this invents nothing. */}
            <Section q="What happens next?">
              {/* ⚑ 1 Oct (R180 · #2497) — Milla's suggestion, WORDS ONLY. Nothing here changes the
                  programme: the button asks Milla in the one chat, and any change is the client's to approve. */}
              {g?.suggestion && (
                <div className="bg-[#faf8ff] border border-[#f2ecfb] rounded-xl px-3.5 py-2.5 mb-3" data-testid="growth-suggestion">
                  <span className="text-[10px] font-extrabold uppercase tracking-wide text-[#b3a9cc]">Milla&apos;s suggestion</span>
                  <p className="text-[12.5px] text-[#4c4368] leading-relaxed mt-1">{g.suggestion.text}</p>
                  <p className="text-[12px] text-[#9b8ec4] mt-0.5">{g.suggestion.note}</p>
                  <button type="button" onClick={() => ask(g.suggestion!.ask)}
                    className="mt-2 inline-block border border-[#ece5fb] rounded-xl px-3.5 py-2 text-[12.5px] font-bold text-[#5c5279] hover:bg-[#f6f1ff] transition-colors">
                    Talk it through with Milla
                  </button>
                </div>
              )}
              {/* ⚑ 29 Sep (R174 · 6a) — ⛓️ WAS a link to `/milla?ask=…`, which nothing reads. It asks Milla. */}
              <button type="button" onClick={() => ask(p.quickAction)}
                className="inline-block border border-[#ece5fb] rounded-xl px-4 py-2.5 text-[13.5px] font-bold text-[#5c5279] hover:bg-[#f6f1ff] transition-colors"
              >
                {p.quickAction}
              </button>
            </Section>
          </>
        )}
      </div>
    </div>
  )
}
