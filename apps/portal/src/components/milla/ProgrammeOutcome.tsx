'use client'

// ═══════════════════════════════════════════════════════════════════════════════════════
// ⚑ 24 Sep (R145 step 6) — RESULTS AND COMPLETE, AS THE REDESIGN DRAWS THEM.
//
// Founder: *"this is the vision of the product… build every section… to this"* ·
// *"from one screen to one choice to the next."* Tracker #37 #38 #39 #61 #62 #80 #81.
//
// 🛑 EVERY NUMBER IS ONE THE SERVER ALREADY SENDS. Meetings come from the programme's own
// outcome count (`progress.outcomesAchieved` — MEETING_BOOKED, the downstream boundary), the
// target from the programme, emails from the programme's real sent rows, replies from the
// Milla summary. Nothing is estimated here and a number we could not read is a dash, never 0.
//
// ⚠️ D5 — "qualified meetings" and "target", never "the commitment". D6 (R136 ③) — no
// never-contacted count on Complete. The 400 never appears (D4).
//
// ⚠️ WHAT IS NOT HERE, ON PURPOSE: "Approve the draft reply" (#79). Nothing in the product
// drafts replies for a client to approve, and building it would add a way for a client's
// click to send outreach — that is the founder's decision, not a panel's. Reported, not built.
// ═══════════════════════════════════════════════════════════════════════════════════════

import Link from 'next/link'
import { useMillaConversation } from '@/components/milla/MillaConversation'
import type { CustomerProgramme } from '@/components/milla/ProgrammeWorkspace'
import { programmeMoney } from '@/lib/programme-money'

export type OutcomeSummary = {
  replies_total?: number | null
  recent_replies?: { name: string; classification: string }[]
}

/** The reply's state, in words and a colour — from the classification the server recorded. */
function replyPill(c: string): { label: string; tone: string } {
  // The recorded vocabulary (`figsy.ts`): hot · warm · cold · opt_out · unsubscribe ·
  // wrong_person · referral · out_of_office · other. Words only — no new claim about any reply.
  switch (c) {
    case 'hot':                                return { label: 'Interested', tone: 'good' }
    case 'warm':                               return { label: 'Warm · needs a reply', tone: 'red' }
    case 'referral':                           return { label: 'Referral', tone: 'good' }
    case 'out_of_office':                      return { label: 'Parked · follow-up', tone: 'warn' }
    case 'cold': case 'opt_out': case 'unsubscribe': case 'wrong_person': return { label: 'Closed', tone: '' }
    default:                                   return { label: 'Reply', tone: '' }
  }
}

const initialsOf = (s: string) => s.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '·'

export default function ProgrammeOutcome({ p, summary, onPriceNext }: {
  p: CustomerProgramme
  summary: OutcomeSummary | null
  /** #39 — open the calculator for the next programme, on this same screen. */
  onPriceNext?: () => void
}) {
  const { ask } = useMillaConversation()
  const complete = p.stage === 'Completion'
  const achieved = p.progress.outcomesAchieved
  const target = p.outcome.target
  const pct = achieved !== null && target ? Math.min(100, Math.round((achieved / target) * 100)) : 0
  const sent = p.sending?.emailsDelivered ?? null
  const replies = summary?.replies_total ?? null
  const recent = summary?.recent_replies ?? []
  const cancelled = p.terminal === 'cancelled'

  const hero = (
    <div className="mv-hero-card">
      <div className="mv-eyebrow">{complete ? (cancelled ? 'Programme cancelled' : 'Programme complete') : 'Programme progress'}</div>
      <div className="mv-hero-row">
        <div>
          <div className="mv-hero-number tabular-nums">
            {achieved === null ? '—' : achieved}{target ? ` / ${target}` : ''}
          </div>
          <div className="mv-hero-caption">
            {complete ? 'qualified meetings delivered' : 'qualified meetings booked — against your target'}
          </div>
        </div>
        <div>
          {complete ? (
            <>
              <strong className="text-[15px]">
                {cancelled ? 'Closed'
                  : achieved !== null && target && achieved >= target ? 'Target met'
                    : p.settlement ? 'Settled' : 'Closed'}
              </strong>
              <div className="mv-hero-caption">
                {p.settlement && p.settlement.creditCents > 0
                  ? `${programmeMoney(p.settlement.creditCents)} credited for the meetings not reached · nothing restarts automatically.`
                  : 'Nothing restarts automatically.'}
              </div>
            </>
          ) : (
            <>
              <strong className="text-[15px] tabular-nums">{sent === null ? '—' : sent.toLocaleString('en-US')} emails sent</strong>
              <div className="mv-hero-caption">{replies === null ? 'replies — not available right now' : `${replies.toLocaleString('en-US')} replies`}</div>
            </>
          )}
        </div>
      </div>
      <div className="mv-progress-track"><div className="mv-progress-fill" style={{ width: `${pct}%` }} /></div>
    </div>
  )

  if (complete) {
    return (
      <div className="flex flex-col gap-4">
        {hero}
        <div className="mv-programme">
          <div className="mv-programme-card">
            <div className="mv-eyebrow">Final programme</div>
            <div className="mv-kv-list">
              <div className="mv-kv-row"><span>Target</span><strong>{target ? `${target} meetings` : '—'}</strong></div>
              <div className="mv-kv-row"><span>Delivered</span><strong>{achieved === null ? '—' : `${achieved} meetings`}</strong></div>
              <div className="mv-kv-row"><span>Emails sent</span><strong>{sent === null ? '—' : sent.toLocaleString('en-US')}</strong></div>
              <div className="mv-kv-row"><span>Replies</span><strong>{replies === null ? '—' : replies.toLocaleString('en-US')}</strong></div>
            </div>
          </div>
          <div className="mv-programme-card">
            <div className="mv-eyebrow">What next</div>
            <div className="mv-sub">
              Your programme is closed and preserved. Nothing restarts on its own — when you want the
              next one, price it here or talk it through with Milla.
            </div>
          </div>
        </div>
        <div className="mv-cta-row flex-wrap">
          {/* #39 — the next programme: Milla, in the one chat, and a price on this screen. */}
          <button type="button" className="mv-btn primary" onClick={() => ask('I’d like to talk about the next programme.')}>
            Talk to Milla about the next programme
          </button>
          {onPriceNext ? <button type="button" className="mv-btn" onClick={onPriceNext}>Price the next programme</button> : null}
          {/* #81 — the report lives on its own page; it is opened, not generated here. */}
          <Link href="/milla/reports" className="mv-btn">Open your report</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {hero}
      <div className="mv-section">
        <div className="mv-section-head">
          <b>Replies</b>
          <span>{recent.length === 0 ? 'none yet · everything else is moving' : 'the latest · everything else is moving'}</span>
        </div>
        <div className="mv-section-body">
          {recent.length === 0 ? (
            <p className="mv-muted-note">No replies yet. They appear here, and in the chat, as they arrive.</p>
          ) : (
            <div className="mv-reply-list">
              {recent.slice(0, 6).map((r, i) => {
                const pill = replyPill(r.classification)
                return (
                  <div key={`${r.name}-${i}`} className="mv-reply">
                    <div className="mv-reply-av">{initialsOf(r.name)}</div>
                    <div className="min-w-0"><b className="truncate block">{r.name}</b></div>
                    <span className={`mv-pill ${pill.tone}`}>{pill.label}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
      <div className="mv-cta-row flex-wrap">
        <Link href="/milla/replies" className="mv-btn primary">See all replies</Link>
        {/* #80 — "Pause sending" is a request to us, said in the one chat, exactly as the chip has
            always been: nothing on this screen stops a send by itself. */}
        <button type="button" className="mv-btn" onClick={() => ask('Please pause my programme')}>Pause sending</button>
      </div>
    </div>
  )
}
