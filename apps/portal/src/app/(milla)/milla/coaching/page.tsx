'use client'

// COACHING — tabbed (Coaching v2).
//
// We booked the meeting; the client still has to win it. Two tabs, and ONLY two:
//
//   ① STRATEGIC PARTNER — one deal at a time. The prep brief, built from who the prospect is
//      and what they actually wrote back.
//   ② YOUR LEADS — what the client's own outcomes say. The tab no competitor can build,
//      because it runs on the approve/pass signal and the replies, and we only hold those
//      because we sourced the leads and sent the mail.
//
// ⚠️ WHY NOT THE OTHER THREE TABS FROM THE DESIGN. "Your pitch", "Practice" and "Custom" need
// a client profile block an operator has not written yet, and a post-call debrief we cannot
// capture yet. **An empty tab is a promise**, and a client-facing promise we do not keep costs
// more than a smaller page. They ship when their inputs do.
//
// ⚠️ AND THE BRIEF DOES NOT CLAIM RESEARCH IT DID NOT DO. The design shows "what they have
// publicly committed to, with sources". That needs web search: the SDK here is 0.39.0 and
// nothing in the repo calls it. Today's brief sees the lead record and the reply, so that is
// exactly what the card says it used. Research is its own change, with its own cost decision.

import { useCallback, useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { createClient } from '@/lib/supabase/client'

type Meeting = {
  booking_id: string; lead_id: string; start_time: string | null; status: string | null
  name: string; job_title: string | null; company: string | null; industry: string | null
  score: number | null; why_fits: string | null; their_words: string | null; signal: string | null
}

type Trait = { attribute: string; value: string; winners: number; lift: number }
type Evidence<T> = { enough: true; value: T } | { enough: false; have: number; need: number; why: string }
type Shape = { winners: number; silent: number; traits: Trait[]; nothingStandsOut: boolean }
type Approvals = {
  approved: number; passed: number
  routinelyPassed: { attribute: string; value: string; passed: number; approved: number }[]
  passedButWins: { attribute: string; value: string; passed: number; winners: number }[]
}
type Trend = { headline: string; detail: string; kind: string }
type Patterns = {
  shape: Evidence<Shape>; approvals: Evidence<Approvals>; trend: Evidence<Trend>
  totals: { leads: number; contacted: number; replied: number; booked: number }
}

async function token(): Promise<string | undefined> {
  try { const { data } = await createClient().auth.getSession(); return data.session?.access_token } catch { return undefined }
}
function when(iso: string | null): string {
  if (!iso) return 'Not scheduled'
  const d = new Date(iso)
  return isNaN(d.getTime()) ? 'Not scheduled'
    : d.toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

const CARD = 'bg-white border border-[#eee7f7] rounded-2xl p-4 sm:p-5'
const EYEBROW = 'text-[10px] font-extrabold uppercase tracking-wide text-[#b3a9cc]'

/**
 * A refusal, rendered as an ANSWER rather than an absence.
 *
 * "Not enough data" with no number is indistinguishable from a broken feature. This says how
 * far along they are and what would change it, so an empty tab reads as early rather than dead.
 */
function NotYet({ have, need, why }: { have: number; need: number; why: string }) {
  const pct = Math.min(100, Math.round((have / Math.max(1, need)) * 100))
  return (
    <div className="mt-3 border border-[#e4dcf7] bg-[#faf8ff] rounded-xl px-4 py-3.5">
      <span className={EYEBROW}>Not enough evidence yet</span>
      <p className="text-[12.5px] text-[#4c4368] leading-relaxed mt-1">{why}</p>
      <div className="mt-2.5 h-1.5 rounded-full bg-[#eee7f7] overflow-hidden" role="progressbar"
        aria-valuenow={have} aria-valuemin={0} aria-valuemax={need}>
        <div className="h-full bg-gradient-to-r from-[#7C3AED] to-[#EC4899]" style={{ width: `${pct}%` }} />
      </div>
      <p className="text-[11.5px] text-[#9b8ec4] mt-1.5 tabular-nums">{have} of about {need}</p>
    </div>
  )
}

export default function MillaCoachingPage() {
  const [tab, setTab] = useState<'partner' | 'leads'>('partner')

  // ── Strategic partner ──────────────────────────────────────────────────────
  const [meetings, setMeetings] = useState<Meeting[] | null>(null)
  const [mErr, setMErr] = useState<string | null>(null)
  const [picked, setPicked] = useState<string | null>(null)
  const [briefs, setBriefs] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState<string | null>(null)
  const [bErr, setBErr] = useState<string | null>(null)

  // ── Your leads ─────────────────────────────────────────────────────────────
  const [pat, setPat] = useState<Patterns | null>(null)
  // Kept SEPARATE from `pat` deliberately: a failed read must never render as "no pattern
  // yet", which is the one thing this tab must not say when it could not look (#565).
  const [pErr, setPErr] = useState<string | null>(null)
  const [pLoading, setPLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [sendErr, setSendErr] = useState<string | null>(null)

  useEffect(() => {
    (async () => {
      try {
        const r = await api.get<{ data: { meetings: Meeting[] } }>('/leads/coaching', await token())
        setMeetings(r.data.meetings)
        setPicked(r.data.meetings[0]?.lead_id ?? null)
      } catch (e) { setMErr(e instanceof Error ? e.message : 'Could not load your meetings') }
    })()
  }, [])

  const loadPatterns = useCallback(async () => {
    setPLoading(true); setPErr(null); setPat(null)
    try {
      const r = await api.get<{ data: Patterns }>('/leads/patterns', await token())
      setPat(r.data)
    } catch (e) { setPErr(e instanceof Error ? e.message : 'Could not read your results') }
    finally { setPLoading(false) }
  }, [])

  useEffect(() => {
    if (tab === 'leads' && !pat && !pErr && !pLoading) void loadPatterns()
  }, [tab, pat, pErr, pLoading, loadPatterns])

  async function getBrief(leadId: string) {
    setBusy(leadId); setBErr(null)
    try {
      const r = await api.post<{ data: { brief: string } }>(`/leads/coaching/${leadId}/brief`, {}, await token())
      setBriefs(b => ({ ...b, [leadId]: r.data.brief }))
    } catch (e) { setBErr(e instanceof Error ? e.message : 'Could not build the brief') }
    finally { setBusy(null) }
  }

  async function requestMore(shape: Shape) {
    setSendErr(null)
    try {
      await api.post('/leads/patterns/request-more', { shape }, await token())
      setSent(true)
    } catch (e) { setSendErr(e instanceof Error ? e.message : 'Could not send that request') }
  }

  const meeting = (meetings ?? []).find(m => m.lead_id === picked) ?? null

  return (
    <div className="h-full overflow-y-auto px-5 py-4">
      <div className="mb-3">
        <h1 className="text-[19px] font-extrabold text-[#1f1235]">Coaching</h1>
        <p className="text-[12.5px] text-[#9b8ec4] mt-0.5">
          We got you the meeting. Here&apos;s how to win it — and what your own results say about who to go after next.
        </p>
      </div>

      <div className="flex gap-1 border-b border-[#eee7f7] mb-4" role="tablist">
        {([['partner', 'Strategic partner'], ['leads', 'Your leads']] as const).map(([k, label]) => (
          <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)}
            className={`px-3.5 py-2.5 text-[13px] font-bold -mb-px border-b-2 rounded-t-lg transition-colors ${
              tab === k ? 'text-[#1f1235] border-[#7C3AED]' : 'text-[#9b8ec4] border-transparent hover:text-[#5c5279] hover:bg-[#faf8ff]'
            }`}>
            {label}
          </button>
        ))}
      </div>

      {/* ── ① STRATEGIC PARTNER ─────────────────────────────────────────── */}
      {tab === 'partner' && (
        <div className="max-w-3xl">
          {mErr && (
            <div className="text-[13px] text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4">
              <b>Couldn&apos;t load your meetings.</b> This is not &ldquo;you have none&rdquo; — it means we could not find out. {mErr}
            </div>
          )}
          {!meetings && !mErr && <p className="text-[13px] text-[#9b8ec4] py-10 text-center">Loading…</p>}

          {meetings && meetings.length === 0 && (
            <div className={`${CARD} text-center py-10`}>
              <p className="text-[14px] font-bold text-[#1f1235]">No meetings booked yet.</p>
              <p className="text-[12.5px] text-[#9b8ec4] mt-1">Once we book one, it appears here with your prep.</p>
            </div>
          )}

          {meetings && meetings.length > 0 && (
            <>
              {/* Every card in this tab is about ONE deal, so the deal is picked once, here. */}
              <div className="flex items-center gap-2 flex-wrap mb-3">
                <span className={EYEBROW}>About</span>
                {meetings.map(m => (
                  <button key={m.lead_id} onClick={() => setPicked(m.lead_id)}
                    className={`text-[12.5px] font-semibold rounded-full px-3 py-1.5 border transition-colors ${
                      picked === m.lead_id
                        ? 'border-[#7C3AED] bg-[#f0eafa] text-[#7C3AED]'
                        : 'border-[#eee7f7] bg-white text-[#5c5279] hover:border-[#d9cdf0]'
                    }`}>
                    {m.name}{m.company ? ` · ${m.company}` : ''}
                  </button>
                ))}
              </div>

              {meeting && (
                <div className={CARD}>
                  <div className="flex items-start gap-3 flex-wrap">
                    <div className="min-w-0">
                      <b className="text-[15px] block leading-tight">{meeting.name}</b>
                      <span className="text-[12.5px] text-[#9b8ec4]">
                        {[meeting.job_title, meeting.company].filter(Boolean).join(' · ') || '—'}
                      </span>
                    </div>
                    <span className="ml-auto shrink-0 text-[12px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-3 py-1">
                      {when(meeting.start_time)}
                    </span>
                  </div>

                  {meeting.why_fits && (
                    <div className="mt-3 bg-[#faf8ff] border border-[#f2ecfb] rounded-xl px-3.5 py-2.5">
                      <span className={EYEBROW}>Why they fit you</span>
                      <p className="text-[12.5px] text-[#4c4368] leading-relaxed mt-1">{meeting.why_fits}</p>
                    </div>
                  )}

                  {meeting.their_words && (
                    <div className="mt-2.5 bg-[#fffbeb] border border-[#fde68a] rounded-xl px-3.5 py-2.5">
                      <span className="text-[10px] font-extrabold uppercase tracking-wide text-[#b45309]">
                        Their own words{meeting.signal ? ` · ${meeting.signal}` : ''}
                      </span>
                      <p className="text-[12.5px] text-[#5c4a1f] leading-relaxed mt-1 whitespace-pre-wrap">{meeting.their_words}</p>
                    </div>
                  )}

                  {bErr && (
                    <p className="mt-3 text-[12.5px] text-red-700 bg-red-50 border border-red-200 rounded-xl px-3.5 py-2.5">
                      <b>Couldn&apos;t build your brief.</b> {bErr}
                    </p>
                  )}

                  {briefs[meeting.lead_id] ? (
                    <div className="mt-3 border border-[#e4dcf7] rounded-xl px-4 py-3.5 bg-gradient-to-br from-[#faf7ff] to-white">
                      <b className="text-[13px] block mb-1.5">Your prep brief</b>
                      <p className="text-[12.5px] text-[#4c4368] leading-relaxed whitespace-pre-wrap">{briefs[meeting.lead_id]}</p>
                      {/* Says what it used. Claiming research we did not do would be the most
                          expensive sentence on the page. */}
                      <p className="text-[11.5px] text-[#9b8ec4] mt-3 pt-2.5 border-t border-[#f2ecfb]">
                        Built from who they are and what they wrote to you. We have not researched their
                        company publicly — when we do, it will say so and cite what it found.
                      </p>
                    </div>
                  ) : (
                    <button onClick={() => getBrief(meeting.lead_id)} disabled={busy === meeting.lead_id}
                      className="mt-3 text-[12.5px] font-extrabold text-white rounded-xl px-4 py-2.5 bg-gradient-to-br from-[#7C3AED] to-[#EC4899] disabled:opacity-60">
                      {busy === meeting.lead_id ? 'Building your brief…' : 'Prep me for this meeting'}
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── ② YOUR LEADS ────────────────────────────────────────────────── */}
      {tab === 'leads' && (
        <div className="max-w-3xl space-y-3.5">
          {pLoading && <p className="text-[13px] text-[#9b8ec4] py-10 text-center">Reading your results…</p>}

          {pErr && (
            <div className="text-[13px] text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <b>Couldn&apos;t read your results.</b> This is <b>not</b> &ldquo;no pattern yet&rdquo; — it means we could
              not look. {pErr}
              <button onClick={() => void loadPatterns()} className="block mt-2 text-[12.5px] font-bold underline">Try again</button>
            </div>
          )}

          {pat && (
            <>
              <p className="text-[12px] text-[#9b8ec4] tabular-nums">
                From {pat.totals.leads} leads · {pat.totals.contacted} emailed · {pat.totals.replied} replied · {pat.totals.booked} booked
              </p>

              {/* Card 1 — the winning shape */}
              <div className={CARD}>
                <b className="text-[14px] block">What a winning lead looks like for you</b>
                <p className="text-[12.5px] text-[#9b8ec4] mt-0.5">
                  From the ones that replied — not the targeting you wrote when you started.
                </p>
                {!pat.shape.enough ? <NotYet {...pat.shape} />
                  : pat.shape.value.nothingStandsOut ? (
                    <p className="mt-3 text-[12.5px] text-[#4c4368] bg-[#faf8ff] border border-[#f2ecfb] rounded-xl px-3.5 py-3 leading-relaxed">
                      We looked and <b>nothing stands out yet</b>. Your {pat.shape.value.winners} replies are spread
                      evenly across every attribute we track — which is a real answer, not a missing one. It usually
                      means the targeting is already tight.
                    </p>
                  ) : (
                    <>
                      <ul className="mt-3 space-y-1.5">
                        {pat.shape.value.traits.map(t => (
                          <li key={`${t.attribute}-${t.value}`}
                            className="flex items-baseline gap-2 text-[12.5px] bg-[#faf8ff] border border-[#f2ecfb] rounded-xl px-3.5 py-2.5">
                            <span className="font-bold text-[#1f1235]">{t.value}</span>
                            <span className="text-[#9b8ec4]">{t.attribute}</span>
                            <span className="ml-auto shrink-0 font-bold text-[#7C3AED] tabular-nums">{t.lift}× more likely</span>
                          </li>
                        ))}
                      </ul>
                      <p className="text-[11.5px] text-[#9b8ec4] mt-2 tabular-nums">
                        Based on {pat.shape.value.winners} replies against {pat.shape.value.silent} emailed and silent.
                      </p>
                      <div className="mt-3">
                        {sent ? (
                          <p className="text-[12.5px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-3.5 py-2.5">
                            Sent. We&apos;ll source against this shape and the new leads will appear on your desk.
                          </p>
                        ) : (
                          <>
                            <button onClick={() => void requestMore((pat.shape as { value: Shape }).value)}
                              className="text-[12.5px] font-extrabold text-white rounded-xl px-4 py-2.5 bg-gradient-to-br from-[#7C3AED] to-[#EC4899]">
                              Find me more of these
                            </button>
                            <p className="text-[11.5px] text-[#9b8ec4] mt-1.5">Sends this shape to your team as a request.</p>
                          </>
                        )}
                        {sendErr && <p className="text-[12.5px] text-red-700 mt-2">{sendErr}</p>}
                      </div>
                    </>
                  )}
              </div>

              {/* Card 2 — approve/pass */}
              <div className={CARD}>
                <b className="text-[14px] block">Are you approving the right people?</b>
                <p className="text-[12.5px] text-[#9b8ec4] mt-0.5">Your 👍 and ✕ have a pattern. Sometimes it is sharper than the brief.</p>
                {!pat.approvals.enough ? <NotYet {...pat.approvals} /> : (
                  <>
                    <p className="text-[12.5px] text-[#4c4368] mt-3 tabular-nums">
                      {pat.approvals.value.approved} approved · {pat.approvals.value.passed} passed
                    </p>
                    {pat.approvals.value.passedButWins.length > 0 && (
                      <div className="mt-2.5 bg-[#fffbeb] border border-[#fde68a] rounded-xl px-3.5 py-2.5">
                        <span className="text-[10px] font-extrabold uppercase tracking-wide text-[#b45309]">Worth a second look</span>
                        {pat.approvals.value.passedButWins.map(x => (
                          <p key={x.value} className="text-[12.5px] text-[#5c4a1f] leading-relaxed mt-1">
                            You pass on <b>{x.value}</b> most times ({x.passed} of them) — and <b>{x.winners}</b> of the
                            ones that got through replied.
                          </p>
                        ))}
                      </div>
                    )}
                    {pat.approvals.value.routinelyPassed.length > 0 && (
                      <p className="text-[12.5px] text-[#4c4368] mt-2.5 leading-relaxed">
                        You routinely pass on{' '}
                        {pat.approvals.value.routinelyPassed.map(x => x.value).join(', ')}.
                        {pat.approvals.value.passedButWins.length === 0 && ' Your results so far suggest that instinct is right.'}
                      </p>
                    )}
                  </>
                )}
              </div>

              {/* Card 3 — list or message */}
              <div className={CARD}>
                <b className="text-[14px] block">Replies down — the list or the message?</b>
                <p className="text-[12.5px] text-[#9b8ec4] mt-0.5">
                  Two problems that look identical from the outside, with opposite fixes.
                </p>
                {!pat.trend.enough ? <NotYet {...pat.trend} /> : (
                  <div className={`mt-3 rounded-xl px-3.5 py-3 border ${
                    pat.trend.value.kind === 'deliverability' ? 'bg-red-50 border-red-200'
                    : pat.trend.value.kind === 'improving' ? 'bg-emerald-50 border-emerald-200'
                    : pat.trend.value.kind === 'steady' ? 'bg-[#faf8ff] border-[#f2ecfb]'
                    : 'bg-[#fffbeb] border-[#fde68a]'}`}>
                    <b className="text-[13px] block">{pat.trend.value.headline}</b>
                    <p className="text-[12.5px] leading-relaxed mt-1 text-[#4c4368]">{pat.trend.value.detail}</p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
