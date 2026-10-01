'use client'

// M9 — COACHING. We booked the meeting; the client still has to win it. We hold the context
// they need (who this person is, why they fit, what they actually wrote), so this turns it
// into a prep brief on demand. Value-add — never a money event.

import { useCallback, useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { replyWord } from '@kind/shared'
import { createClient } from '@/lib/supabase/client'
import SalesContextCard from '@/components/milla/SalesContextCard'
import ObjectionCoachCard, { type ObjectionOption } from '@/components/milla/ObjectionCoachCard'
import RoleplayCard from '@/components/milla/RoleplayCard'
import WhatsConverting from '@/components/milla/WhatsConverting'
import MeetingFollowUp, { type FollowUp } from '@/components/milla/MeetingFollowUp'
import MeetingDebrief, { type DebriefSlot } from '@/components/milla/MeetingDebrief'
import { useLiveRefresh } from '@/lib/use-live-refresh'

// ⚑ 1 Oct (placement — founder: *"make sure the right product is in the right area. coaching for
// example is coaching and not programme."*) — the Coaching pieces live HERE, in this screen's look
// (R167, no redesign; the same components, not rewritten):
//   · Coaching Review #1 (#2518) — Enterprise, from 25% on. ⛓️ ~~inside the 25% moment on Programme~~.
//   · What's converting (#2494) — its own gate (the API's 403 = absent). ⛓️ ~~on the Programme screen~~.
//   · After your meetings — the follow-up drafts (#2495 · #2502) and the debrief (#2501) under each
//     meeting the client answered "How did it go?" for. ⛓️ ~~under the meeting on the Meetings screen~~.
//     "How did it go?" itself (F1) stays on Meetings.
// Order: Review · sales context · what's converting · after your meetings · Objection Coach ·
// Roleplay · per-meeting prep.

// The answered meetings, from the SAME read the Meetings screen uses (`GET /leads/meetings`), which
// already carries the answer, the follow-up slot and the debrief slot — and decides who gets which.
type Outcome = { answer: string; label: string; note: string | null; at: string }
type AfterMeeting = { id: string; title: string; start_time: string | null; name: string; company: string | null; outcome?: Outcome | null; ask?: boolean; followUp?: FollowUp | null; debrief?: DebriefSlot | null }
type Review = { ready: boolean; lines: string[] }

type Meeting = {
  booking_id: string; lead_id: string; start_time: string | null; status: string | null
  name: string; job_title: string | null; company: string | null; industry: string | null
  score: number | null; why_fits: string | null; their_words: string | null; signal: string | null
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

export default function MillaCoachingPage() {
  const [meetings, setMeetings] = useState<Meeting[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [briefs, setBriefs] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState<string | null>(null)
  // ⚑ 1 Oct (#2505 · #2506) — Objection Coach and Roleplay: Full Coaching only. `null` = not
  // known (still loading, or unreadable) → neither the cards nor the quiet line is shown.
  const [practice, setPractice] = useState<{ full: boolean; objections: ObjectionOption[] } | null>(null)
  const [after, setAfter] = useState<AfterMeeting[] | null>(null)
  const [review, setReview] = useState<Review | null>(null)

  // A help, never a gate: an unreadable list hides the section; the rest of the page still shows.
  const loadAfter = useCallback(async () => {
    try { const r = await api.get<{ data: AfterMeeting[] }>('/leads/meetings', await token()); setAfter(r.data) }
    catch { /* keep what is on screen */ }
  }, [])
  useEffect(() => { void loadAfter() }, [loadAfter])
  // The same 20-second re-read the Meetings screen keeps (R171).
  useLiveRefresh(loadAfter)

  useEffect(() => {
    (async () => {
      try {
        const r = await api.get<{ data: { meetings: Meeting[] } }>('/leads/coaching', await token())
        setMeetings(r.data.meetings)
      } catch (e) { setError(e instanceof Error ? e.message : 'Could not load your meetings') }
    })()
    ;(async () => {
      try {
        const r = await api.get<{ data: { full: boolean; objections: ObjectionOption[] } }>('/my/programme/coaching/practice', await token())
        setPractice(r.data)
      } catch { /* a help, never a gate — the page still shows prep */ }
    })()
    // ⚑ 1 Oct (#2518) — Enterprise at 25%+ only; every other client gets `review: null` and no section.
    ;(async () => {
      try {
        const r = await api.get<{ data: { review: Review | null } }>('/my/programme/coaching/review', await token())
        setReview(r.data.review)
      } catch { /* absent, never "too early" on a read that failed */ }
    })()
  }, [])

  async function getBrief(leadId: string) {
    setBusy(leadId); setError(null)
    try {
      const r = await api.post<{ data: { brief: string } }>(`/leads/coaching/${leadId}/brief`, {}, await token())
      setBriefs(b => ({ ...b, [leadId]: r.data.brief }))
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not build the brief') }
    finally { setBusy(null) }
  }

  const answered = (after ?? []).filter(m => !m.ask && m.outcome && (m.followUp || m.debrief))
  const afterCard = (m: AfterMeeting) => (
    <div key={m.id} className="bg-white border border-[#eee7f7] rounded-2xl p-4">
      <div className="flex items-center gap-3.5">
        <span className="w-10 h-10 rounded-xl bg-[#efeafc] text-[#7C3AED] font-extrabold flex items-center justify-center shrink-0">
          {(m.name || '?').split(/\s+/).map(p => p[0]).slice(0, 2).join('').toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <b className="text-[14px] block">{m.name}</b>
          <span className="text-[12px] text-[#9b8ec4]">{[m.company, m.title].filter(Boolean).join(' · ')}</span>
          <div className="text-[12px] text-[#5c5279] mt-0.5">{when(m.start_time)}</div>
        </div>
        <span className="text-[11px] font-extrabold rounded-full px-3 py-1 text-emerald-700 bg-emerald-50">{m.outcome?.label}</span>
      </div>
      {m.outcome?.note && <p className="text-[12.5px] text-[#6b5f8c] mt-2 bg-[#faf8ff] rounded-lg px-3 py-2">&ldquo;{m.outcome.note}&rdquo;</p>}
      {m.followUp && <MeetingFollowUp meetingId={m.id} followUp={m.followUp} onSaved={loadAfter} />}
      {m.debrief && <MeetingDebrief meetingId={m.id} debrief={m.debrief} onSaved={loadAfter} />}
    </div>
  )

  return (
    <div className="h-full overflow-y-auto px-5 py-4">
      <div className="mb-4">
        <h1 className="text-[19px] font-extrabold text-[#1f1235]">Coaching</h1>
        <p className="text-[12.5px] text-[#9b8ec4] mt-0.5">
          We got you the meeting. Here&apos;s how to win it — built from what we know about each prospect.
        </p>
      </div>

      {/* ⚑ 1 Oct (#2518 · R136 · R87) — ENTERPRISE COACHING REVIEW #1. Every line and count is the
          server's, from the client's own answers and debriefs — never a rate, never a value claim. */}
      {review && (
        <div className="bg-white border border-[#eee7f7] rounded-2xl p-4 sm:p-5 mb-3.5 max-w-3xl" data-testid="coaching-review">
          <b className="block text-[15px] text-[#1f1235] leading-tight">Coaching Review #1</b>
          {review.lines.map((l, i) => <p key={i} className="text-[12.5px] text-[#4c4368] leading-relaxed mt-2">{l}</p>)}
        </div>
      )}

      {/* ⚑ 1 Oct (Coaching F6) — how the client sells, used by every prep brief below. */}
      <SalesContextCard />

      {/* ⚑ 1 Oct (#2494) — what's converting; the component and its API decide who sees it. */}
      <div className="mb-3.5 max-w-3xl empty:hidden"><WhatsConverting /></div>

      {/* ⚑ 1 Oct (#2495 · #2502 · #2501) — AFTER YOUR MEETINGS: each meeting the client told us about on
          the Meetings screen, with its follow-up and debrief exactly as they behave there today. A
          plain function, not an inline component, so the 20-second re-read never wipes a half-typed answer. */}
      {answered.length > 0 && (
        <div className="mb-3.5 max-w-3xl" data-testid="after-your-meetings">
          <h2 className="text-[13px] font-extrabold uppercase tracking-wide text-[#b3a9cc] mb-2.5">After your meetings</h2>
          <div className="space-y-2.5">{answered.map(afterCard)}</div>
        </div>
      )}

      {/* ⚑ 1 Oct (R180 · #2505 · #2506) — practice before the call. Full Coaching gets the two
          cards; every other plan gets one quiet line each — no sell, no button (the Full Coaching
          offer lives in the 50% moment). */}
      {practice?.full && (
        <>
          <ObjectionCoachCard options={practice.objections} />
          <RoleplayCard meetings={meetings ?? []} />
        </>
      )}
      {practice && !practice.full && (
        <div className="mb-3.5 max-w-3xl px-1" data-testid="full-coaching-note">
          <p className="text-[12px] text-[#9b8ec4]">Objection Coach comes with Full Coaching.</p>
          <p className="text-[12px] text-[#9b8ec4]">Roleplay comes with Full Coaching.</p>
        </div>
      )}

      {error && <div className="text-[13px] text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3 mb-4">{error}</div>}
      {!meetings && !error && <p className="text-[13px] text-[#9b8ec4] py-10 text-center">Loading…</p>}

      {meetings && meetings.length === 0 && (
        <div className="bg-white border border-[#eee7f7] rounded-2xl px-5 py-10 text-center">
          <p className="text-[14px] font-bold text-[#1f1235]">No meetings booked yet.</p>
          <p className="text-[12.5px] text-[#9b8ec4] mt-1">
            Once we book one, your prep brief appears here automatically.
          </p>
        </div>
      )}

      <div className="space-y-3.5 max-w-3xl">
        {(meetings ?? []).map(m => (
          <div key={m.booking_id} className="bg-white border border-[#eee7f7] rounded-2xl p-4 sm:p-5">
            <div className="flex items-start gap-3 flex-wrap">
              <div className="min-w-0">
                <b className="text-[15px] block leading-tight">{m.name}</b>
                <span className="text-[12.5px] text-[#9b8ec4]">
                  {[m.job_title, m.company].filter(Boolean).join(' · ') || '—'}
                </span>
              </div>
              <span className="ml-auto shrink-0 text-[12px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-3 py-1">
                {when(m.start_time)}
              </span>
            </div>

            {m.why_fits && (
              <div className="mt-3 bg-[#faf8ff] border border-[#f2ecfb] rounded-xl px-3.5 py-2.5">
                <span className="text-[10px] font-extrabold uppercase tracking-wide text-[#b3a9cc]">Why they fit you</span>
                <p className="text-[12.5px] text-[#4c4368] leading-relaxed mt-1">{m.why_fits}</p>
              </div>
            )}

            {m.their_words && (
              <div className="mt-2.5 bg-[#fffbeb] border border-[#fde68a] rounded-xl px-3.5 py-2.5">
                <span className="text-[10px] font-extrabold uppercase tracking-wide text-[#b45309]">
                  {/* ⚑ 29 Sep (R174 · fix) — the signal in words, not the classifier's code ("hot"). */}
                  Their own words{m.signal ? ` · ${replyWord(m.signal)}` : ''}
                </span>
                <p className="text-[12.5px] text-[#5c4a1f] leading-relaxed mt-1 whitespace-pre-wrap">{m.their_words}</p>
              </div>
            )}

            {briefs[m.lead_id] ? (
              <div className="mt-3 border border-[#e4dcf7] rounded-xl px-4 py-3.5 bg-gradient-to-br from-[#faf7ff] to-white">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-[14px]">🎓</span>
                  <b className="text-[13px]">Your prep brief</b>
                </div>
                <p className="text-[12.5px] text-[#4c4368] leading-relaxed whitespace-pre-wrap">{briefs[m.lead_id]}</p>
              </div>
            ) : (
              <button onClick={() => getBrief(m.lead_id)} disabled={busy === m.lead_id}
                className="mt-3 text-[12.5px] font-extrabold text-white rounded-xl px-4 py-2.5 bg-gradient-to-br from-[#7C3AED] to-[#EC4899] disabled:opacity-60">
                {busy === m.lead_id ? 'Building your brief…' : '🎓 Prep me for this meeting'}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
