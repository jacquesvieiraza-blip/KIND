'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { api, AI_TURN_TIMEOUT_MS } from '@/lib/api'
import { createClient } from '@/lib/supabase/client'
import { useMillaConversation } from '@/components/milla/MillaConversation'

// ⚑ 1 Oct (R180 · Coaching F2 · #2484) — THE 25 / 50 / 75% MOMENT, as one section on the existing
// Programme screen, in its existing style (R167). Every figure is the server's: delivered and
// target from the programme, prices from `@kind/shared` via the API. Enterprise is never offered
// Coaching. ⛓️ 1 Oct (F3 · #2485): ~~A "yes" to Full Coaching is a request our team confirms — nothing
// is charged here.~~ "Turn on Full Coaching" now opens the ONE payment (R180 Q2): the server builds
// the Stripe checkout and this screen sends the client to it. Coaching switches on when Stripe
// confirms the payment, never at the press. Same section, same buttons (R167).
//
// ⚑ 1 Oct (R180 · finishing the partial moments, same section, same buttons — R167):
//   · #2516 25% Founders — one real Coaching example from one of the client's own meetings, no buy button.
//   · #2520 50% Enterprise — the next move, concretely: next programme (up to the per-programme
//     maximum) or a different segment, each opening the conversation in Milla's chat.
//   · #2522 75% — what's still to come, the Coaching state, and "Plan my next programme" now opens
//     that conversation in Milla's chat (it only remembered the press before).
//   · #2523 Complete — `MomentHandoff` reads the finished programme's milestone memory.

type Moment = {
  milestone: 25 | 50 | 75; plan: 'founders' | 'growth' | 'enterprise'
  delivered: number; target: number; remaining: number
  response: string | null; response50: string | null
  coachingIncluded: boolean; coachingRequested: boolean; coachingActive?: boolean
  pricePerMeeting: number; upliftPerMeeting: number; activationTotal: number; chat: string
  maxMeetings?: number
}
type TasteDraft = { subject: string; body: string; coaching: { confirm: string; nextStep: string; risk: string } | null }
type Taste = { meeting: { id: string; name: string; company: string | null } | null; example: TasteDraft | null }

// ⚑ 1 Oct (#2520 · #2522) — what the client says to Milla when they choose a next move. Their words,
// sent into the one chat, so the conversation picks up there.
const SAY = {
  next_programme: 'I’d like to plan my next programme.',
  segment: 'I’d like my next programme to go after a different segment.',
} as const

async function token(): Promise<string | undefined> {
  try { const { data } = await createClient().auth.getSession(); return data.session?.access_token } catch { return undefined }
}
const usd = (n: number) => `$${n.toLocaleString('en-US')}`
const meetingsWord = (n: number) => `${n} meeting${n === 1 ? '' : 's'}`

export default function ExpansionMoment() {
  const [m, setM] = useState<Moment | null>(null)
  const [taste, setTaste] = useState<Taste | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { ask } = useMillaConversation()

  const load = useCallback(async () => {
    try {
      const r = await api.get<{ data: { moment: Moment | null; taste?: Taste | null } }>('/my/programme/moment', await token())
      setM(r.data.moment); setTaste(r.data.taste ?? null)
    } catch { setM(null); setTaste(null) }
  }, [])
  useEffect(() => { void load() }, [load])

  // ⛓️ 1 Oct (#2520 · #2522) — ~~answer(response)~~ also carries the next move chosen and the words
  // the client says to Milla about it; the conversation opens only once the answer is saved.
  const answer = async (response: string, choice?: keyof typeof SAY) => {
    if (!m) return
    setBusy(true); setError(null)
    try {
      // ⚑ 1 Oct (F3) — "accepted" comes back with the Stripe checkout URL; the client goes there.
      // Any refusal (a demo account, already on, payments not set up) arrives as the plain message.
      const r = await api.post<{ data?: { url?: string } }>('/my/programme/moment/respond', {
        milestone: m.milestone, response, ...(choice ? { choice } : {}),
        ...(response === 'accepted' ? { successUrl: `${window.location.origin}/milla/programme?coaching=on`, cancelUrl: window.location.href } : {}),
      }, await token())
      if (response === 'accepted' && r?.data?.url) { window.location.href = r.data.url; return }
      if (choice) ask(SAY[choice])
      await load()
    }
    catch (e) { setError(e instanceof Error ? e.message : 'We couldn’t save that just now.') }
    finally { setBusy(false) }
  }

  // ⚑ 1 Oct (#2516) — the one example. Waits on a model turn: the AI budget, not the CRUD default.
  const showTaste = async () => {
    setBusy(true); setError(null)
    try {
      const r = await api.post<{ data: Taste }>('/my/programme/moment/taste', {}, await token(), AI_TURN_TIMEOUT_MS)
      setTaste(r.data)
    }
    catch (e) { setError(e instanceof Error ? e.message : 'Milla couldn’t put that together just now.') }
    finally { setBusy(false) }
  }

  if (!m) return null
  const answered = m.response && m.response !== 'shown'
  const head = m.milestone === 25 ? (m.plan === 'founders' ? 'A taste of Coaching' : 'Already in your plan')
    : m.milestone === 50 ? (m.coachingIncluded ? 'What’s next' : 'Full Coaching')
    : 'Your next programme'
  const max = m.maxMeetings ?? 0
  // ⚑ 1 Oct (#2520 · #2522) — the state after an answer, said once, plainly.
  const nextNote = m.response === 'engaged'
    ? <p className="mv-muted-note mt-2">You asked Milla about this. Pick it up in the chat any time.</p>
    : m.response === 'not_now' ? <p className="mv-muted-note mt-2">You said not yet. It&rsquo;s here when you want it.</p> : null
  const nextButtons = (segment: boolean) => (
    <div className="mv-cta-row flex-wrap mt-3">
      <button type="button" className="mv-btn primary" disabled={busy} onClick={() => void answer('engaged', 'next_programme')}>Plan my next programme</button>
      {segment && <button type="button" className="mv-btn" disabled={busy} onClick={() => void answer('engaged', 'segment')}>A different segment</button>}
      {!answered && <button type="button" className="mv-btn" disabled={busy} onClick={() => void answer('not_now')}>Not yet</button>}
    </div>
  )

  let body: React.ReactNode
  if (m.milestone === 25) {
    body = <>
      <p className="text-[12.5px] text-[#4c4368] leading-relaxed">{m.chat}</p>
      <div className="mv-cta-row flex-wrap mt-3">
        <Link href="/milla/coaching" className="mv-btn primary" onClick={() => void answer('engaged')}>Open Coaching</Link>
      </div>
      {/* ⚑ 1 Oct (#2516) — Founders: one real example from one of their own meetings. No buy button. */}
      {taste && (
        <div className="mt-3 bg-[#faf8ff] border border-[#f2ecfb] rounded-xl px-3.5 py-2.5" data-testid="coaching-taste">
          {taste.example && taste.meeting ? <>
            <p className="text-[12.5px] text-[#1f1235] font-semibold">What Coaching would add to your meeting with {taste.meeting.name}{taste.meeting.company ? `, ${taste.meeting.company}` : ''}</p>
            {taste.example.coaching && (
              <div className="text-[12.5px] text-[#5c5279] flex flex-col gap-1 mt-2">
                {taste.example.coaching.confirm && <div><b className="text-[#1f1235]">Confirm:</b> {taste.example.coaching.confirm}</div>}
                {taste.example.coaching.nextStep && <div><b className="text-[#1f1235]">Next step to propose:</b> {taste.example.coaching.nextStep}</div>}
                {taste.example.coaching.risk && <div><b className="text-[#1f1235]">Risk to address:</b> {taste.example.coaching.risk}</div>}
              </div>
            )}
            <div className="text-[12.5px] font-semibold text-[#1f1235] mt-2">Subject: {taste.example.subject}</div>
            <p className="text-[12.5px] text-[#1f1235] whitespace-pre-wrap bg-white border border-[#e4dcf7] rounded-lg px-3 py-2 mt-1">{taste.example.body}</p>
            <p className="mv-muted-note mt-2">Written from your own meeting. With Full Coaching, you get this after every meeting. Nothing to buy today.</p>
          </> : taste.meeting ? <>
            <p className="text-[12.5px] text-[#4c4368]">See what Coaching would add to your meeting with {taste.meeting.name}{taste.meeting.company ? `, ${taste.meeting.company}` : ''}: the follow-up email written for you, and what to do next.</p>
            <button type="button" className="mv-btn mt-2" disabled={busy} onClick={() => void showTaste()}>{busy ? 'Writing…' : 'Show me on this meeting'}</button>
          </> : (
            <p className="text-[12.5px] text-[#4c4368]">Tell us how one of your meetings went on the <Link href="/milla/meetings" className="font-bold text-[#5b21b6]">Meetings</Link> screen, and you&rsquo;ll see what Coaching would add to it.</p>
          )}
        </div>
      )}
    </>
  } else if (m.milestone === 50 && m.coachingIncluded) {
    // ⚑ 1 Oct (#2520) — ENTERPRISE AT HALFWAY: expansion, never Coaching. ⛓️ ~~One "Review options
    // with Milla" button that only remembered the press.~~ The founder's options that exist today:
    // the next programme (bigger, up to the per-programme maximum) or a different segment.
    body = <>
      <p className="text-[12.5px] text-[#4c4368] leading-relaxed">{m.chat}</p>
      <div className="mv-kv-list mt-2">
        <div className="mv-kv-row"><span>Meetings still to come</span><strong>{m.remaining}</strong></div>
        {max > 0 && <div className="mv-kv-row"><span>Your next programme</span><strong>up to {max} meetings</strong></div>}
      </div>
      {max > 0 && (m.target < max
        ? <p className="mv-muted-note mt-2">Want more meetings? Your next programme can take up to {max} qualified meetings.</p>
        : <p className="mv-muted-note mt-2">This programme is already {max} qualified meetings, the most one programme takes. For more, talk to us first.</p>)}
      {nextNote}
      {nextButtons(true)}
    </>
  } else if (m.milestone === 50 && !m.coachingIncluded) {
    // ⛓️ 1 Oct (F3) — ~~"You asked for Full Coaching. Our team will confirm it and send the one payment."~~
    body = m.coachingActive ? (
      <p className="text-[12.5px] text-[#4c4368] leading-relaxed">Full Coaching is on for the meetings still to come. Open Coaching before each meeting.</p>
    ) : <>
      <p className="text-[12.5px] text-[#4c4368] leading-relaxed">Follow-up coach, objection coach, deal strategy, roleplay and meeting debriefs, from your next meeting onward.</p>
      <div className="mv-kv-list mt-2">
        <div className="mv-kv-row"><span>Your plan today</span><strong>{usd(m.pricePerMeeting)} per meeting</strong></div>
        <div className="mv-kv-row"><span>With Full Coaching</span><strong>{usd(m.pricePerMeeting + m.upliftPerMeeting)} per meeting</strong></div>
        <div className="mv-kv-row"><span>Meetings still to come</span><strong>{m.remaining}</strong></div>
        <div className="mv-kv-row"><span>One payment</span><strong>{usd(m.activationTotal)}</strong></div>
      </div>
      <p className="mv-muted-note mt-2">No charge for the {m.delivered} meetings already delivered. If any of the {m.remaining} isn&rsquo;t delivered, its {usd(m.upliftPerMeeting)} comes back with your shortfall credit.</p>
      {m.coachingRequested ? <p className="mv-muted-note mt-2">You started turning it on. The payment isn&rsquo;t finished yet, so nothing has been charged.</p>
        : m.response === 'declined' ? <p className="mv-muted-note mt-2">You said no thanks. Milla won&rsquo;t offer it again.</p>
        : m.response === 'not_now' ? <p className="mv-muted-note mt-2">You said not now. It stays open.</p> : null}
      <div className="mv-cta-row flex-wrap mt-3">
        <button type="button" className="mv-btn primary" disabled={busy} onClick={() => void answer('accepted')}>Turn on Full Coaching</button>
        {!answered && <button type="button" className="mv-btn" disabled={busy} onClick={() => void answer('not_now')}>Not now</button>}
        {!answered && <button type="button" className="mv-btn" disabled={busy} onClick={() => void answer('declined')}>No thanks</button>}
      </div>
    </>
  } else {
    // ⛓️ 1 Oct (F3) — also after an unfinished yes at 50% (opened the payment, left); never after "no thanks".
    const reoffer = m.milestone === 75 && !m.coachingIncluded && !m.coachingActive && (m.response50 === 'not_now' || m.response50 === 'accepted')
    // ⚑ 1 Oct (#2522) — THE CONTINUATION PANEL: what is still to come, the Coaching state, then the
    // next programme first. ⛓️ ~~'Review options with Milla' (50%) / 'Plan my next programme', which
    // only remembered the press.~~ 50% Enterprise has its own branch above; this press now also
    // opens the conversation in Milla's chat.
    body = <>
      <p className="text-[12.5px] text-[#4c4368] leading-relaxed">{m.chat}</p>
      {(m.remaining > 0 || m.coachingIncluded || m.coachingActive) && (
        <div className="mv-kv-list mt-2">
          {m.remaining > 0 && <div className="mv-kv-row"><span>Still to come on this programme</span><strong>{meetingsWord(m.remaining)}</strong></div>}
          {m.coachingIncluded ? <div className="mv-kv-row"><span>Full Coaching</span><strong>Part of your plan</strong></div>
            : m.coachingActive ? <div className="mv-kv-row"><span>Full Coaching</span><strong>On to the end of this programme</strong></div> : null}
        </div>
      )}
      {nextNote}
      {nextButtons(m.coachingIncluded)}
      {reoffer && (
        <div className="mt-3 bg-[#faf8ff] border border-[#f2ecfb] rounded-xl px-3.5 py-2.5">
          <p className="text-[12.5px] text-[#4c4368]">Full Coaching is still open: {usd(m.upliftPerMeeting)} × {meetingsWord(m.remaining)} still to come = <b>{usd(m.activationTotal)}</b>, one payment.</p>
          <button type="button" className="mv-btn mt-2" disabled={busy} onClick={() => void answer('accepted')}>Turn on Full Coaching</button>
        </div>
      )}
    </>
  }

  return (
    <div className="mv-section" data-testid="expansion-moment">
      <div className="mv-section-head">
        <b>{m.milestone}% · {head}</b>
        <span>{m.delivered} of {m.target} qualified meetings delivered</span>
      </div>
      <div className="mv-section-body">
        {body}
        {error && <p className="text-[12.5px] text-red-700 mt-2">{error}</p>}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════════════
// ⚑ 1 Oct (R180 · #2523) — THE COMPLETE HAND-OFF. Inside Complete's existing "What next" card: the
// finished programme's own milestone memory, said back plainly. Offers nothing — 75% was the last
// Coaching offer — and renders nothing when there is nothing to carry forward.
// ═══════════════════════════════════════════════════════════════════════════════════════
type Handoff = { plan: string; nextProgramme: 'planning' | 'not_yet' | null; segment: boolean; coachingWasOn: boolean }

export function MomentHandoff() {
  const [h, setH] = useState<Handoff | null>(null)
  useEffect(() => {
    void (async () => {
      try { const r = await api.get<{ data: { handoff: Handoff | null } }>('/my/programme/handoff', await token()); setH(r.data.handoff) } catch { setH(null) }
    })()
  }, [])
  if (!h) return null
  const lines = [
    h.nextProgramme === 'planning' ? 'At three-quarters you asked to plan your next programme. It’s ready when you are: price it here, or pick it up with Milla.'
      : h.nextProgramme === 'not_yet' ? 'At three-quarters you said not yet to a next programme, so nothing has been set up.' : null,
    h.segment ? 'You also asked Milla about going after a different segment next time.' : null,
    h.coachingWasOn ? 'Full Coaching was on for this programme.' : null,
  ].filter(Boolean)
  return <div className="mv-sub mt-2" data-testid="moment-handoff">{lines.join(' ')}</div>
}
