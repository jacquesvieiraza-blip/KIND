'use client'

// ═══════════════════════════════════════════════════════════════════════════════════════
// THE APPROVAL — the one decision the client makes, and the only place they can make it.
//
// ── WHAT WAS MISSING, AND IT IS THE WHOLE POINT OF THE STAGE ────────────────────────────
//
// The backend handoff worked: a programme reached `READY_FOR_APPROVAL` with its set frozen and
// `POST /my/programme/approve` waiting. The EXPERIENCE did not exist. A client at the Approval
// stage saw an outcome, a sourced count and a programme value — and no sight of the people, no
// sight of the words that would go out in their name, no statement that what they were reading
// was fixed, and no way to say yes.
//
// Being asked to approve something you cannot see is not an approval. Everybody downstream
// treats `approved_at` as consent to email real strangers on this client's behalf.
//
// ── WHAT THE CLIENT APPROVES IS THE FROZEN VERSION ──────────────────────────────────────
//
// 🛑 EVERY WORD AND NUMBER IN THE "WHAT WILL BE SENT" SECTION COMES FROM
// `review_preparation_snapshot`, written in the same conditional UPDATE as the status. Nothing
// here re-resolves a sequence. If this screen rendered live state, the client would read one
// thing, approve, and the approval would faithfully record whatever was true at that instant —
// a perfect record of consent to something nobody looked at.
//
// ⚠️ NO IDENTIFIERS ANYWHERE. No lead ids, no campaign id, no sequence id, no sender address,
// no batch id. The customer approves the WORK; our plumbing is not theirs to read.
//
// ⚠️ AND THE SCREEN NEVER DECIDES. `canApprove` is the server's boolean and this file does not
// re-derive it: a rule a browser can compute is a rule anybody with the console open can
// satisfy. The route re-proves everything again anyway.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { useEffect, useState } from 'react'
import { useMillaConversation } from '@/components/milla/MillaConversation'
import {
  APPROVAL_CONCERN_LABEL, APPROVAL_CONCERN_PROMPT, APPROVAL_CONCERN_ACKNOWLEDGED,
  PROGRAMME_BEST_EFFORTS, laterBatchesLine,
} from '@kind/shared'
import { programmeMoney } from '@/lib/programme-money'

export type ApprovalProspect = {
  id: string
  role: string
  company: string
  industry: string | null
  country: string | null
}

export type FrozenWork = {
  /**
   * ⚑ 11 Sep (DAY 3) — WHICH EXACT PACKAGE THIS IS, sent back with the approval.
   *
   * 🛑 THE CLIENT APPROVES A VERSION, NOT "whatever is frozen right now". Without this, a
   * re-preparation between the screen rendering and the button being pressed was approved in
   * silence — a set of people, a set of words and a sending window they had never read. The
   * server refuses a mismatch (`stale_version`); this is the half that tells it which one.
   */
  version: string | null
  /**
   * ⚑ 11 Sep (DAY 3) — the version a PERSON can quote. The hash is what the approval is pinned
   * to and nobody can say "I approved dc41f8…" out loud; this is what the sentence uses.
   */
  version_number?: number | null
  at: string | null
  messages: { step: number; subject: string; body: string; wait_days: number }[]
  prospects: number
  send_schedule: unknown
  /**
   * ⚑ 11 Sep (DAY 3) — the TARGET, read from the freeze and not from the live row.
   *
   * 🛑 A TARGET, NEVER A GUARANTEE (founder-locked). It is inside the digest from v2, so a
   * change to it invalidates the package rather than quietly re-describing the deal.
   */
  meeting_target?: number | null
  /**
   * ⚑ 11 Sep (DAY 3) — which address these would come FROM.
   *
   * ⚠️ THE CLIENT'S OWN FROM-LINE, not our plumbing. It is what every recipient sees, so it is
   * part of what they are approving. The inbox id, the provider and the credentials stay on
   * the server and are not in this payload at all.
   */
  sender_email?: string | null
  /**
   * ⚑ 18 Sep (J14-C3 · R129) — WHOSE MAILBOX THAT ADDRESS IS.
   *
   * 🛑 "Sent from ada@…" AND NOTHING ELSE READS AS THE CLIENT'S OWN ADDRESS. R129 (16 Sep,
   * founder-locked) put MVP1 on an *"ENV-BACKED POOLED SENDER INVENTORY"*, so for most clients
   * it is one we own and assign to them for the duration of their programme. `branded` is a
   * client's own domain, and claiming that one is ours would be the same defect reversed.
   *
   * ⚠️ `null` MEANS WE DID NOT READ IT, and the screen then says nothing about whose it is —
   * a guess here is worse than the bare address.
   */
  sender_kind?: string | null
  /**
   * ⚑ 18 Sep (J16-C1) — HOW MANY OF THESE PEOPLE WE MAY ACTUALLY EMAIL (FD-5).
   *
   * 🛑 THE SEVENTH FACT, AND IT IS THE ONE THAT WAS MISSING FROM THE SCREEN THEY SAY YES TO.
   * A client approved "40 prospects" when the number we could write to was eighteen, and
   * nothing here said so. *"Verified business email required before send; QUALIFIED ≠
   * SENDABLE."*
   *
   * ⚠️ NULL WHEN THE PACKAGE DOES NOT STATE IT — a freeze taken before the field existed, or a
   * count that could not be read. It is then OMITTED, never rendered as 0: "nobody is
   * reachable" is a claim about a number nobody took.
   */
  sendable?: number | null
}

/**
 * The founder's primary action label, locked 3 Sep.
 *
 * ⛓️ 18 Sep (J16-C1) — DEFINED HERE NOW, AND THE MOVE IS THE POINT. These two sentences lived
 * in `ProgrammeReview`, which is where the button used to be; this screen had its own
 * unlocked wording ("Approve programme", "You approved this programme."). Two approval
 * buttons with two different labels is exactly what "approve nowhere else" forbids, and when
 * the duplicate control was withdrawn the founder's words had to come with the surviving one
 * rather than be left behind on a component that no longer approves anything.
 * `ProgrammeReview` re-exports both, so nothing that imported them from there is broken.
 */
export const APPROVE_LABEL = 'Approve this programme'
/** The founder's post-approval sentence, locked 3 Sep. Never paraphrased. */
export const APPROVED_COPY = 'Approved — nothing is sent until the programme goes Live.'

export type ApprovalPayload = {
  programme: {
    id: string
    status: string
    meeting_target: number | null
    approved_at: string | null
    paused: boolean
    second_settled?: boolean
  } | null
  prospects: ApprovalProspect[]
  total: number
  complete: boolean
  frozen: FrozenWork | null
  canApprove: boolean
}

/** "Weekdays, 08:30–17:00" — the schedule in words, or nothing when it is not a schedule. */
export function scheduleInWords(v: unknown): string | null {
  if (!v || typeof v !== 'object') return null
  const s = v as { days?: unknown; start?: unknown; end?: unknown }
  if (!Array.isArray(s.days) || typeof s.start !== 'string' || typeof s.end !== 'string') return null
  const NAMES = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
  const days = s.days.filter(d => typeof d === 'number' && d >= 1 && d <= 7) as number[]
  if (days.length === 0) return null
  const weekdays = days.length === 5 && [1, 2, 3, 4, 5].every(d => days.includes(d))
  const label = weekdays ? 'Weekdays' : days.map(d => NAMES[d].slice(0, 3)).join(', ')
  return `${label}, ${s.start}–${s.end}`
}

/**
 * "on day 0 · then 3 days later · …" — the cadence a prospect actually experiences.
 *
 * ⚠️ `wait_days` IS THE GAP AFTER A MESSAGE, so the delay before message N is the wait on
 * message N−1. Reading it as the wait BEFORE would show the client a schedule nobody will run.
 */
export function whenLabel(messages: FrozenWork['messages'], i: number): string {
  if (i === 0) return 'Sent first'
  const gap = messages[i - 1]?.wait_days ?? 0
  return gap > 0 ? `${gap} day${gap === 1 ? '' : 's'} later` : 'Same day'
}

export default function ProgrammeApproval({
  data, onApproved, secondPaymentCents, secondDue,
}: {
  data: ApprovalPayload
  onApproved: (approvedAt: string | null) => void
  /** ⚑ 24 Sep (R145 step 5 · #32 #33) — the second payment, from the programme the page read. */
  secondPaymentCents?: number | null
  /** The second half is still owed — neither paid nor authorised internally. The page opens it. */
  secondDue?: boolean
}) {
  const [showAll, setShowAll] = useState(false)
  // ⚑ 24 Sep (R145 step 5) — Milla opens the stage in the one chat, as the redesign does.
  const announceOnce = useMillaConversation().announceOnce
  const canApproveNow = data.canApprove && !data.programme?.approved_at
  useEffect(() => {
    if (!canApproveNow) return
    announceOnce('approval-intro', [
      'Everything is ready and frozen. This is the exact thing that will go out — the people, the words, the timing and who it comes from.',
      'Read it properly. If you change anything, it becomes a new version and I’ll ask you to approve it again — I won’t send a version you didn’t see.',
    ])
  }, [canApproveNow, announceOnce])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState<number | null>(0)
  // ⚑ 23 Sep (Section 4 #18) — the client's way of saying no.
  const [concernOpen, setConcernOpen] = useState(false)
  const [concern, setConcern] = useState('')
  const [held, setHeld] = useState<string | null>(null)

  const p = data.programme
  if (!p) return null

  const frozen = data.frozen
  // ⚠️ THE FROZEN COUNT IS THE ONE BEING APPROVED. The live list is what we can show; the
  // snapshot is what was fixed. When they differ, the frozen number is the honest one.
  const population = frozen?.prospects ?? data.total
  const laterBatches = laterBatchesLine(population, frozen?.meeting_target ?? data.programme?.meeting_target ?? null)
  const schedule = scheduleInWords(frozen?.send_schedule)

  async function approve() {
    setBusy(true); setError(null)
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const { api } = await import('@/lib/api')
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      // ⚠️ THE VERSION THEY ARE LOOKING AT, from the payload that drew this screen. If the
      // package has moved on since, the server refuses and Milla re-renders the current one —
      // it never silently approves something the client has not read.
      const r = await api.post<{ data: { approved_at: string | null } }>(
        '/my/programme/approve', { version: data.frozen?.version ?? null }, session?.access_token)
      // ── ⚑ 24 Sep (R145 step 5 · #32) — "APPROVE vN AND PAY P2" IS ONE PRESS, IN TWO ACTS ──────
      // This screen records the DECISION and nothing else (④: approving spends nothing). The page
      // that holds it opens the second payment in `onApproved`, after the approval is stored — so
      // the client presses once, and approval and payment stay separate, ordered acts.
      onApproved(r.data?.approved_at ?? null)
    } catch (e) {
      // ⚠️ THE SERVER'S SENTENCE, NOT A CHEERFUL ONE OF OURS. It is the thing that knows why.
      setError(e instanceof Error && e.message && e.message.length < 240
        ? e.message
        : 'That did not go through. Nothing was approved — please try again.')
    }
    setBusy(false)
  }

  /**
   * 🛑 SAY SOMETHING IS WRONG — founder-approved 23 Sep (Section 4 #18).
   *
   * ⚠️ IT IS NOT A REJECTION. The programme is HELD: the freeze, the approval state and the
   * money all stay where they are, and a person picks it up. Nothing the client can press here
   * loses them their own programme.
   */
  async function raiseConcern() {
    setBusy(true); setError(null)
    try {
      const { createClient } = await import('@/lib/supabase/client')
      const { api } = await import('@/lib/api')
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      const r = await api.post<{ data: { message: string } }>(
        '/my/programme/concern', { words: concern }, session?.access_token)
      // ⚠️ THE SERVER'S SENTENCE, so the promise on screen is the one the server actually kept.
      setHeld(r.data?.message ?? APPROVAL_CONCERN_ACKNOWLEDGED)
    } catch (e) {
      setError(e instanceof Error && e.message && e.message.length < 240
        ? e.message
        : 'That did not go through. Nothing was changed — please try again.')
    } finally { setBusy(false) }
  }

  // ── ⚑ 24 Sep (R145 step 5 · #33 #60) — THE APPROVAL PANEL, AS THE REDESIGN DRAWS IT ────────────
  // A frozen-package hero, the version card (people · messages · cadence & window · sender), the
  // second payment, then ONE main button and "Review full sequence". Every fact is still read from
  // the FREEZE, never the live row; every locked sentence travels with it (target-not-guarantee,
  // the best-efforts line, the pooled-sender line, the sendable count, the way to say no).
  const vLabel = frozen?.version_number ? `v${frozen.version_number}` : 'this version'
  const cadence = frozen && frozen.messages.length > 0
    ? `${frozen.messages.length}-step sequence`
    : null
  const days = frozen ? frozen.messages.slice(0, -1).reduce((n, m) => n + (m.wait_days || 0), 0) : 0

  if (p.approved_at) {
    return (
      <div data-testid="programme-approved" className="mv-hero-card">
        <div className="mv-eyebrow">Approved</div>
        {/* ⛓️ 18 Sep (J16-C1) — the founder's locked sentence is `APPROVED_COPY`, and it travels with the button. */}
        <h2 className="!text-[17px]">{APPROVED_COPY}</h2>
        <p>
          {p.second_settled
            ? 'Nothing else is needed from you — we will let you know as meetings come in.'
            : 'The second half is due next, and outreach starts after that.'}
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="mv-hero-card">
        <div className="mv-eyebrow">Frozen package · {vLabel}</div>
        <h2>Approve exactly what will go out.</h2>
        <p>
          People, messages, cadence and sender are pinned to this version. Nothing has been sent,
          and nothing will be sent until you approve it. If anything changes, we will ask you again
          with a new version.
        </p>
      </div>

      <div className="mv-section">
        <div className="mv-section-head">
          <b>{frozen?.version_number ? `Version ${frozen.version_number}` : 'This version'}{frozen?.version ? ` · ${frozen.version.slice(0, 10)}` : ''}</b>
          <span>{frozen?.at ? `prepared ${new Date(frozen.at).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}` : 'exact snapshot'}</span>
        </div>
        <div className="mv-section-body">
          <div className="mv-field-grid">
            {/* ── THE PEOPLE — masked: role, company, industry, country. Never a name. */}
            <div className="mv-field">
              <label>People</label>
              <strong>{population.toLocaleString()}{!data.complete && !frozen ? '+' : ''} people we will write to</strong>
              {/* ⚑ 24 Sep — this package is the FIRST batch; say that more follow, up to the plan. */}
              {laterBatches && <small data-testid="later-batches">{laterBatches}</small>}
              {/* ⚑ 18 Sep (J16-C1 · FD-5) — how many we may actually write to; omitted, never zeroed. */}
              {typeof frozen?.sendable === 'number' && (
                <small data-testid="frozen-sendable">
                  <b className="font-semibold">{frozen.sendable.toLocaleString()}</b> of them have a
                  verified work email address today. We keep checking the rest, and we only write to
                  the ones we can reach.
                </small>
              )}
            </div>
            <div className="mv-field">
              <label>What we will send</label>
              <strong>{cadence ?? 'Not loaded'}</strong>
              {cadence
                ? <small>Read every one before you approve — “Review full sequence”.</small>
                : <small>We could not load the messages right now. Please don&apos;t approve until you can read them — refresh, or ask Milla.</small>}
            </div>
            <div className="mv-field">
              <label>Cadence &amp; window</label>
              <strong>{schedule ?? 'Not stated'}</strong>
              <small>{frozen && frozen.messages.length > 1 ? `${frozen.messages.length} steps over ${days} day${days === 1 ? '' : 's'}, in the recipient’s own time.` : 'In the recipient’s own time.'}</small>
            </div>
            <div className="mv-field">
              <label>Sender</label>
              {frozen && frozen.sender_email ? (
                <p className="text-[11px] break-all">
                  <span className="sr-only">Sent from </span>
                  <strong>{frozen.sender_email}</strong>
                  {/* ⚑ 18 Sep (J14-C3 · R129) — and whose mailbox that is, in the SAME paragraph as
                      the address; an unread kind says nothing. */}
                  {frozen.sender_kind === 'pooled' && (
                    <small data-testid="sender-pooled" className="block">
                      A sending address we provide and keep for you while your programme runs, not your own mailbox.
                      Replies come back to us and appear in Milla.
                    </small>
                  )}
                  {frozen.sender_kind === 'branded' && <small className="block">— your own sending address.</small>}
                </p>
              ) : <strong>Not stated</strong>}
            </div>
          </div>
          {frozen?.at && (
            <p className="mv-muted-note mt-3">
              This is{frozen.version_number ? ` version ${frozen.version_number}, ` : ' the version '}
              prepared for you on{' '}
              {new Date(frozen.at).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}.
              If anything changes, we will ask you again.
            </p>
          )}
          {frozen?.meeting_target != null && (
            <p className="mv-muted-note mt-1">
              Targeting <b>{frozen.meeting_target} meeting{frozen.meeting_target === 1 ? '' : 's'}</b>
              {/* 🛑 TARGET, NEVER GUARANTEE — founder-locked, and it travels WITH the number. */}
              <span> — a target, not a guarantee</span>
            </p>
          )}
          {/* ── #78 · REVIEW FULL SEQUENCE — the frozen words, read from the snapshot. */}
          {showAll && frozen && frozen.messages.length > 0 && (
            <div className="mt-3 flex flex-col gap-1.5">
              {frozen.messages.map((m, i) => (
                <div key={m.step} className="border border-[color:var(--mv-line)] rounded-[10px]">
                  <button type="button" onClick={() => setOpen(open === i ? null : i)}
                    className="w-full text-left px-3 py-2 flex items-baseline justify-between gap-3">
                    <span className="text-[10.5px] font-bold truncate">{m.subject || '(no subject)'}</span>
                    <span className="mv-muted-note shrink-0">{whenLabel(frozen.messages, i)}</span>
                  </button>
                  {open === i && <p className="px-3 pb-2.5 text-[10.5px] text-[color:var(--mv-muted)] whitespace-pre-wrap">{m.body}</p>}
                </div>
              ))}
            </div>
          )}
          {/* A sample of the people, masked — what the programme will write to. */}
          {showAll && data.prospects.length > 0 && (
            <ul className="mt-3 mv-muted-note">
              {data.prospects.slice(0, 8).map(x => (
                <li key={x.id}><b>{x.role}</b> at {x.company}{x.industry ? ` · ${x.industry}` : ''}{x.country ? ` · ${x.country}` : ''}</li>
              ))}
              {population > 8 && <li>…and {(population - 8).toLocaleString()} more like these.</li>}
            </ul>
          )}
        </div>
      </div>

      {secondDue && typeof secondPaymentCents === 'number' && (
        <div className="mv-section"><div className="mv-section-body">
          <div className="mv-hero-row">
            <div>
              <div className="mv-eyebrow">Second payment</div>
              <strong className="text-[24px] tabular-nums">{programmeMoney(secondPaymentCents)}</strong>
            </div>
            <div className="mv-muted-note flex-1 min-w-[180px]">
              Approving and paying the second half does not start sending by itself. It makes this
              exact version ready, and outreach starts when we make it live.
            </div>
          </div>
        </div></div>
      )}

      {error && <p role="alert" className="text-[11px] text-red-700">{error}</p>}

      {/* ── THE DECISION — the server's boolean decides whether it is offered. */}
      {data.canApprove ? (
        <>
          <div className="mv-cta-row flex-wrap">
            <button type="button" data-testid="approve-programme" onClick={approve} disabled={busy}
              className="mv-btn primary disabled:opacity-50">
              {/* ⛓️ 24 Sep (R145 step 5 · #32) — WAS `APPROVE_LABEL` alone; the founder's one
                  "Approve and pay P2" names the version and, when it is due, the payment. */}
              {busy ? 'Approving…' : secondDue ? `Approve ${vLabel} and pay P2` : APPROVE_LABEL}
            </button>
            <button type="button" onClick={() => setShowAll(v => !v)} className="mv-btn">
              {showAll ? 'Hide the full sequence' : 'Review full sequence'}
            </button>
          </div>
          {/* ── 🛑 ⚑ 23 Sep (R136 ②) — THE DISCLAIMER, AT THE SECOND PLACE THEY COMMIT. */}
          <p className="mv-muted-note rounded-[9px] bg-[#fff8e8] text-[#7b5a1d] px-3 py-2.5">{PROGRAMME_BEST_EFFORTS}</p>

          {/* ── 🛑 ⚑ 23 Sep (Section 4 #18) — AND THE WAY TO SAY NO. Quieter than approve, and
              not a rejection: the programme is HELD and a person picks it up. */}
          {held ? (
            <div className="mv-section"><div className="mv-section-body"><p className="mv-muted-note">{held}</p></div></div>
          ) : concernOpen ? (
            <div className="mv-section"><div className="mv-section-body">
              <label htmlFor="approval-concern" className="mv-muted-note block">{APPROVAL_CONCERN_PROMPT}</label>
              <textarea id="approval-concern" value={concern} onChange={e => setConcern(e.target.value)} rows={3}
                className="w-full mt-2 text-[11px] rounded-[9px] border border-[color:var(--mv-line2)] px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#6f3df4]/25"
                placeholder="In your own words…" />
              <div className="mv-cta-row mt-2">
                <button type="button" data-testid="raise-concern" onClick={raiseConcern}
                  disabled={busy || concern.trim() === ''} className="mv-btn dark disabled:opacity-40">
                  {busy ? 'Sending…' : 'Send this and hold the programme'}
                </button>
                <button type="button" onClick={() => { setConcernOpen(false); setConcern('') }} className="mv-btn ghost">Never mind</button>
              </div>
            </div></div>
          ) : (
            <button type="button" data-testid="open-concern" onClick={() => setConcernOpen(true)}
              className="mv-muted-note underline underline-offset-2 self-start">
              {APPROVAL_CONCERN_LABEL}
            </button>
          )}
        </>
      ) : (
        <p className="mv-muted-note">
          {p.paused
            ? 'Your programme is paused, so there is nothing to approve right now.'
            : 'This is not ready for your approval yet. We will let you know the moment it is.'}
        </p>
      )}
    </div>
  )
}
