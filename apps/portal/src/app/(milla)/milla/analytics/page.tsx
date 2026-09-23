'use client'

// ═══════════════════════════════════════════════════════════════════════════════════════
// ANALYTICS — MILLA-NATIVE. WHAT IS MEASURED, DRAWN PROPERLY.
//
// ⚑ 31 Aug — VISUAL RECOVERY. The flat version collapsed this page to two cards and a
// sentence. The founder was right that it reads as a stripped admin screen.
//
// 🛑 THE DISTINCTION I GOT WRONG THE FIRST TIME. The old page's charts were a mix:
//   · the leads/replies bar strip — a REAL chart of real counts, good design
//   · open rate — a permanently blank card, because it is not tracked on cold email
//   · leads-by-ICP bars — real counts, but of the leads table rather than a programme
//   · a reply rate whose denominator no customer route can produce truthfully
// I deleted all four. Only the last three were lies; the FIRST was the presentation itself.
//
// ⚠️ SO THE BAR TREATMENT IS BACK — the same `h-2.5 bg-gray-100 rounded-full` strip — drawing
// the funnel this programme genuinely has: sourced → replies → meetings, each a counted row.
// ⚠️ AND THE THREE FALSEHOODS STAY OUT. No open rate, no reply rate without a real
// denominator, no benchmark, no leads-table chart wearing a programme's name.
//
// ⚠️ THE PRE-LIVE STATE IS DESIGNED, NOT EMPTY. Before outreach the panel stays and names
// what this area will measure — without a single zero, because "0 replies" reads as failure
// when the truth is that sending has not been authorised.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { createClient } from '@/lib/supabase/client'
import { MILLA_FAILURE_COPY, MILLA_STAGES } from '@kind/shared'
import { type CustomerProgramme } from '@/components/milla/ProgrammeWorkspace'
import { ValueCard, ProgressBar, Panel, StageRail, PreLiveState, ProgrammeHeader } from '@/components/milla/ProgrammeStat'
import { outreachHasRun } from '@/lib/programme-report'
import { Users, MessageSquare, CalendarCheck } from 'lucide-react'

// ⛓️ 18 Sep (J24-C1) — `number | null`. The server used to send 0 for a count it could not
// read; it now sends `null`, and `ValueCard` has always rendered `null` as an em dash
// ("`null` IS STILL A DASH … Every figure here distinguishes 'we could not read it' from
// zero"). The type was the last place still claiming a number was always available.
type Outcomes = { replies_total: number | null; meetings_total: number | null; meetings_booked: number | null }

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

  const live = !!p && outreachHasRun(p.stage)

  return (
    <div className="h-full overflow-y-auto px-6 py-6">
      <div className="max-w-4xl">
        <ProgrammeHeader title="Analytics" sub="What has been measured on your programme." />

        {loading && <p className="text-sm text-[#9b8ec4] mt-4">Loading your programme…</p>}
        {failed && (
          <div className="mt-4 border border-red-200 bg-red-50/60 rounded-2xl px-4 py-3">
            <p className="text-[13.5px] font-semibold text-red-800">{failed}</p>
          </div>
        )}

        {p && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
              {/* ⛓️ 23 Sep (R136 ③) — WAS measured against `progress.authorised`, the sourcing ceiling (meetings × 400): the internal limit, never disclosed. The server now sends only whether sourcing is authorised. */}
              <ValueCard
                hero
                label="People sourced"
                value={p.progress.sourcingAuthorised ? p.progress.delivered : null}
                sub={p.progress.sourcingAuthorised ? 'for this programme' : 'sourcing not authorised yet'}
                icon={<Users className="w-6 h-6" />}
              />
              <ValueCard
                label="Replies"
                value={live ? (o === null ? null : o.replies_total) : null}
                sub={live ? 'all time' : 'once outreach starts'}
                icon={<MessageSquare className="w-4.5 h-4.5" />}
                tone="amber"
              />
              <ValueCard
                label="Meetings booked"
                value={p.progress.outcomesAchieved}
                sub={p.progress.outcomesAchieved === null ? 'not available right now' : 'on this programme'}
                icon={<CalendarCheck className="w-4.5 h-4.5" />}
                tone="emerald"
              />
            </div>

            <div className="mt-4">
              <Panel title="Programme" chip={p.paused ? 'Paused' : undefined}>
                <StageRail stages={MILLA_STAGES} current={p.stage} />
              </Panel>
            </div>

            {/* ── THE FUNNEL, DRAWN. The bar treatment from the old page, on counted rows.
                ⚠️ EACH BAR IS A COUNT AGAINST THE SAME REAL DENOMINATOR — people sourced —
                so the widths are comparable and no rate is invented to produce them. */}
            {live ? (
              <div className="mt-4 rounded-2xl border border-purple-100/60 bg-white p-6 space-y-4">
                <p className="text-xs font-semibold text-[#9B8EC4] uppercase tracking-wider">
                  From sourced to booked
                </p>
                {/* ⛓️ 23 Sep (R136 ③) — REMOVED: a "People sourced" bar whose max was the sourcing
                    ceiling. A bar discloses its maximum as surely as a number does. */}
                {/* ⛓️ 18 Sep (J24-C1) — `o.replies_total` MAY NOW BE `null` ON ITS OWN, and a
                    bar drawn from a placeholder zero reads as "no replies" rather than as "we
                    could not count them". A bar has no way to say unreadable, so it is simply
                    not drawn — the same answer the whole-outcomes-null case already gave. */}
                {o?.replies_total != null && p.progress.delivered > 0 && (
                  <ProgressBar label="Replies" value={o.replies_total} max={p.progress.delivered} color="bg-amber-400" />
                )}
                {/* ⛓️ 23 Sep (R136 ③) — WAS "Meetings booked" drawn against `progress.delivered`
                    (people sourced). Meetings per person sourced IS the conversion rate the
                    programme is sized on, and the founder locked it as internal — "never the rate,
                    the limit or the pool size". Drawn against the target they chose instead, and
                    against their replies, which are theirs to see. */}
                {p.progress.outcomesAchieved !== null && p.outcome.target && (
                  <ProgressBar
                    label="Meetings booked against your target"
                    value={p.progress.outcomesAchieved}
                    max={p.outcome.target}
                    color="bg-emerald-500"
                  />
                )}
                {o?.meetings_total != null && o?.replies_total != null && o.replies_total > 0 && (
                  <ProgressBar
                    label="Replies that became meetings"
                    value={o.meetings_total}
                    max={o.replies_total}
                    color="bg-emerald-400"
                  />
                )}
              </div>
            ) : (
              <div className="mt-4">
                <PreLiveState
                  what="Nothing has been sent yet, so there is nothing measured from outreach. Once the programme goes live this is what this page will track."
                  measures={['People contacted', 'Replies', 'Meetings booked', 'Activity over time']}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
