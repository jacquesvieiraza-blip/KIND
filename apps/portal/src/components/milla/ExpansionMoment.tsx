'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api'
import { createClient } from '@/lib/supabase/client'

// ⚑ 1 Oct (R180 · Coaching F2 · #2484) — THE 25 / 50 / 75% MOMENT, as one section on the existing
// Programme screen, in its existing style (R167). Every figure is the server's: delivered and
// target from the programme, prices from `@kind/shared` via the API. Enterprise is never offered
// Coaching. ⛓️ 1 Oct (F3 · #2485): ~~A "yes" to Full Coaching is a request our team confirms — nothing
// is charged here.~~ "Turn on Full Coaching" now opens the ONE payment (R180 Q2): the server builds
// the Stripe checkout and this screen sends the client to it. Coaching switches on when Stripe
// confirms the payment, never at the press. Same section, same buttons (R167).

type Moment = {
  milestone: 25 | 50 | 75; plan: 'founders' | 'growth' | 'enterprise'
  delivered: number; target: number; remaining: number
  response: string | null; response50: string | null
  coachingIncluded: boolean; coachingRequested: boolean; coachingActive?: boolean
  pricePerMeeting: number; upliftPerMeeting: number; activationTotal: number; chat: string
}

async function token(): Promise<string | undefined> {
  try { const { data } = await createClient().auth.getSession(); return data.session?.access_token } catch { return undefined }
}
const usd = (n: number) => `$${n.toLocaleString('en-US')}`
const meetingsWord = (n: number) => `${n} meeting${n === 1 ? '' : 's'}`

export default function ExpansionMoment() {
  const [m, setM] = useState<Moment | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try { const r = await api.get<{ data: { moment: Moment | null } }>('/my/programme/moment', await token()); setM(r.data.moment) } catch { setM(null) }
  }, [])
  useEffect(() => { void load() }, [load])

  const answer = async (response: string) => {
    if (!m) return
    setBusy(true); setError(null)
    try {
      // ⚑ 1 Oct (F3) — "accepted" comes back with the Stripe checkout URL; the client goes there.
      // Any refusal (a demo account, already on, payments not set up) arrives as the plain message.
      const r = await api.post<{ data?: { url?: string } }>('/my/programme/moment/respond', {
        milestone: m.milestone, response,
        ...(response === 'accepted' ? { successUrl: `${window.location.origin}/milla/programme?coaching=on`, cancelUrl: window.location.href } : {}),
      }, await token())
      if (response === 'accepted' && r?.data?.url) { window.location.href = r.data.url; return }
      await load()
    }
    catch (e) { setError(e instanceof Error ? e.message : 'We couldn’t save that just now.') }
    finally { setBusy(false) }
  }

  if (!m) return null
  const answered = m.response && m.response !== 'shown'
  const head = m.milestone === 25 ? (m.plan === 'founders' ? 'A taste of Coaching' : 'Already in your plan')
    : m.milestone === 50 ? (m.coachingIncluded ? 'What’s next' : 'Full Coaching')
    : 'Your next programme'

  let body: React.ReactNode
  if (m.milestone === 25) {
    body = <>
      <p className="text-[12.5px] text-[#4c4368] leading-relaxed">{m.chat}</p>
      <div className="mv-cta-row flex-wrap mt-3">
        <Link href="/milla/coaching" className="mv-btn primary" onClick={() => void answer('engaged')}>Open Coaching</Link>
      </div>
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
    body = <>
      <p className="text-[12.5px] text-[#4c4368] leading-relaxed">{m.chat}</p>
      <div className="mv-cta-row flex-wrap mt-3">
        <button type="button" className="mv-btn primary" disabled={busy} onClick={() => void answer('engaged')}>
          {m.milestone === 50 ? 'Review options with Milla' : 'Plan my next programme'}
        </button>
        {!answered && <button type="button" className="mv-btn" disabled={busy} onClick={() => void answer('not_now')}>Not yet</button>}
      </div>
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
