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

import { useState } from 'react'

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
  at: string | null
  messages: { step: number; subject: string; body: string; wait_days: number }[]
  prospects: number
  send_schedule: unknown
}

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
  data, onApproved,
}: {
  data: ApprovalPayload
  onApproved: (approvedAt: string | null) => void
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState<number | null>(0)

  const p = data.programme
  if (!p) return null

  const frozen = data.frozen
  // ⚠️ THE FROZEN COUNT IS THE ONE BEING APPROVED. The live list is what we can show; the
  // snapshot is what was fixed. When they differ, the frozen number is the honest one.
  const population = frozen?.prospects ?? data.total
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
      onApproved(r.data?.approved_at ?? null)
    } catch (e) {
      // ⚠️ THE SERVER'S SENTENCE, NOT A CHEERFUL ONE OF OURS. It is the thing that knows why.
      setError(e instanceof Error && e.message && e.message.length < 240
        ? e.message
        : 'That did not go through. Nothing was approved — please try again.')
    } finally { setBusy(false) }
  }

  if (p.approved_at) {
    return (
      <div className="border border-emerald-200 bg-emerald-50/60 rounded-2xl px-4 py-3.5">
        <div className="text-[11.5px] uppercase tracking-wide text-emerald-800 font-bold mb-1">Approved</div>
        <p className="text-[13.5px] font-semibold text-emerald-900">
          You approved this programme. {p.second_settled
            ? 'Nothing else is needed from you — we will let you know as meetings come in.'
            : 'The second half is due next, and outreach starts after that.'}
        </p>
      </div>
    )
  }

  return (
    <div className="border border-[#eee7f7] rounded-2xl px-4 py-4">
      <div className="text-[11.5px] uppercase tracking-wide text-[#9b8ec4] font-bold mb-1">
        Your approval
      </div>
      <p className="text-[13.5px] text-[#6b5f8c] mb-3">
        This is what we have prepared for you. Nothing has been sent, and nothing will be sent
        until you approve it.
      </p>

      {/* ── THE PEOPLE ─────────────────────────────────────────────────────────────────
          Masked: role, company, industry, country. Never a name, never an address — those
          are what the programme delivers, not what it is approved on. */}
      <div className="border border-[#eee7f7] rounded-xl px-3.5 py-3 mb-3">
        <div className="text-[12px] font-bold text-[#5c5279] mb-1.5">
          {population.toLocaleString()}{!data.complete && !frozen ? '+' : ''} people we will write to
        </div>
        {data.prospects.length === 0
          ? <p className="text-[12.5px] text-[#9b8ec4]">We could not load the list right now.</p>
          : (
            <ul className="text-[12.5px] text-[#6b5f8c] space-y-1">
              {data.prospects.slice(0, 8).map(x => (
                <li key={x.id}>
                  <span className="font-semibold">{x.role}</span> at {x.company}
                  {x.industry ? ` · ${x.industry}` : ''}{x.country ? ` · ${x.country}` : ''}
                </li>
              ))}
            </ul>
          )}
        {population > 8 && (
          <p className="text-[12px] text-[#9b8ec4] mt-1.5">
            …and {(population - 8).toLocaleString()} more like these.
          </p>
        )}
      </div>

      {/* ── THE WORDS ──────────────────────────────────────────────────────────────────
          🛑 THE FROZEN SEQUENCE. Read from the snapshot, never re-resolved. */}
      <div className="border border-[#eee7f7] rounded-xl px-3.5 py-3 mb-3">
        <div className="text-[12px] font-bold text-[#5c5279] mb-1.5">
          What we will send{frozen ? ` · ${frozen.messages.length} message${frozen.messages.length === 1 ? '' : 's'}` : ''}
        </div>
        {!frozen || frozen.messages.length === 0
          ? (
            <p className="text-[12.5px] text-[#9b8ec4]">
              We could not load the messages right now. Please don&apos;t approve until you can read
              them — refresh, or ask Milla.
            </p>
          )
          : (
            <div className="space-y-1.5">
              {frozen.messages.map((m, i) => (
                <div key={m.step} className="border border-[#f0eaf9] rounded-lg">
                  <button
                    type="button"
                    onClick={() => setOpen(open === i ? null : i)}
                    className="w-full text-left px-3 py-2 flex items-baseline justify-between gap-3"
                  >
                    <span className="text-[12.5px] font-semibold text-[#5c5279] truncate">
                      {m.subject || '(no subject)'}
                    </span>
                    <span className="text-[11.5px] text-[#9b8ec4] shrink-0">{whenLabel(frozen.messages, i)}</span>
                  </button>
                  {open === i && (
                    <p className="px-3 pb-2.5 text-[12.5px] text-[#6b5f8c] whitespace-pre-wrap">{m.body}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        {schedule && (
          <p className="text-[12px] text-[#9b8ec4] mt-2">Sent {schedule}, in the recipient&apos;s own time.</p>
        )}
      </div>

      {/* 🛑 THE FROZEN STATEMENT. The client must know that what they read is what they get —
          that is the difference between an approval and a snapshot of an opinion. */}
      {frozen?.at && (
        <p className="text-[12px] text-[#9b8ec4] mb-3">
          This is the version prepared for you on{' '}
          {new Date(frozen.at).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}.
          If anything changes, we will ask you again.
        </p>
      )}

      {error && (
        <div className="border border-red-200 bg-red-50/60 rounded-xl px-3.5 py-2.5 mb-3">
          <p className="text-[12.5px] font-semibold text-red-800">{error}</p>
        </div>
      )}

      {/* ── THE DECISION ───────────────────────────────────────────────────────────────
          ⚠️ THE SERVER'S BOOLEAN DECIDES WHETHER THIS IS OFFERED. Paused, not yet ready, or
          nothing to review — all of them arrive here as `canApprove === false`, and the reason
          is shown rather than left to a disabled button nobody can explain. */}
      {data.canApprove ? (
        <>
          <button
            type="button"
            onClick={approve}
            disabled={busy}
            className="w-full sm:w-auto bg-[#7C3AED] text-white font-bold text-[13.5px] rounded-xl px-5 py-2.5 disabled:opacity-50"
          >
            {busy ? 'Approving…' : 'Approve programme'}
          </button>
          <p className="text-[12px] text-[#9b8ec4] mt-2">
            {p.second_settled
              ? 'Approving starts your programme. Nothing has been sent yet.'
              : 'Approving confirms this work. The second half is due afterwards, and outreach starts after that.'}
          </p>
        </>
      ) : (
        <p className="text-[12.5px] text-[#9b8ec4]">
          {p.paused
            ? 'Your programme is paused, so there is nothing to approve right now.'
            : 'This is not ready for your approval yet. We will let you know the moment it is.'}
        </p>
      )}
    </div>
  )
}
