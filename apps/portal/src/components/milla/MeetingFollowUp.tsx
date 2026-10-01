'use client'

import { useState } from 'react'
import { api, AI_TURN_TIMEOUT_MS } from '@/lib/api'
import { createClient } from '@/lib/supabase/client'

// ⚑ 1 Oct (Coaching #2495 follow-up drafts · #2502 follow-up coach · R180) — under a meeting the
// client said went somewhere ("next step agreed" / "interested, not now"). Inside the existing
// Meetings card, in its existing inline-panel and button style (R167): no new page, no layout.
//   · Growth+       → "Draft my follow-up" → subject + body, Copy, Write it again.
//   · Full Coaching → the same, with the three coaching lines above the draft.
//   · Founders      → one quiet line; no button, no sell.
// The client sends the email from their own mailbox — nothing here sends anything.
// What a plan earns is decided by the API (`lib/follow-up.ts`); this only asks and shows.

export type FollowUpDraft = {
  subject: string; body: string; at: string
  coaching: { confirm: string; nextStep: string; risk: string } | null
}
export type FollowUp = { level: 'none' | 'draft' | 'coach'; draft: FollowUpDraft | null }

async function token(): Promise<string | undefined> {
  try { const { data } = await createClient().auth.getSession(); return data.session?.access_token } catch { return undefined }
}

export default function MeetingFollowUp({ meetingId, followUp, onSaved }: { meetingId: string; followUp: FollowUp; onSaved: () => void }) {
  const [fresh, setFresh] = useState<FollowUpDraft | null>(null)
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (followUp.level === 'none') {
    return <p className="text-[12px] text-[#9b8ec4] mt-2">Follow-up drafts come with Growth or Full Coaching.</p>
  }

  const draft = fresh ?? followUp.draft
  const write = async (again: boolean) => {
    setBusy(true); setError(null); setCopied(false)
    try {
      // ⚠️ Waits on a model turn: the AI budget, not the 15s CRUD default (models.test.ts).
      const r = await api.post<{ data: FollowUpDraft }>(`/leads/meetings/${meetingId}/follow-up`, { again }, await token(), AI_TURN_TIMEOUT_MS)
      setFresh(r.data)
      onSaved()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'We couldn’t write that draft just now. Please try again.')
    } finally { setBusy(false) }
  }
  const copy = async () => {
    if (!draft) return
    try { await navigator.clipboard.writeText(`Subject: ${draft.subject}\n\n${draft.body}`); setCopied(true) }
    catch { setError('Copy didn’t work here — select the text and copy it instead.') }
  }

  if (!draft) {
    return (
      <div className="mt-2 flex flex-col gap-1.5" data-testid="meeting-follow-up">
        <div className="flex gap-2 items-center">
          <button type="button" onClick={() => write(false)} disabled={busy}
            className="text-[13px] font-bold text-white bg-[#7C3AED] rounded-lg px-3 py-2 disabled:opacity-50">{busy ? 'Writing…' : 'Draft my follow-up'}</button>
          <span className="text-[11.5px] text-[#9b8ec4]">You send it yourself, from your own email.</span>
        </div>
        {error && <p className="text-[12.5px] text-red-700">{error}</p>}
      </div>
    )
  }

  const c = followUp.level === 'coach' ? draft.coaching : null
  return (
    <div className="mt-3 bg-[#faf8ff] rounded-lg p-3 flex flex-col gap-2" data-testid="meeting-follow-up">
      {c && (
        <div className="text-[12.5px] text-[#5c5279] flex flex-col gap-1">
          {c.confirm && <div><b className="text-[#1f1235]">Confirm:</b> {c.confirm}</div>}
          {c.nextStep && <div><b className="text-[#1f1235]">Next step to propose:</b> {c.nextStep}</div>}
          {c.risk && <div><b className="text-[#1f1235]">Risk to address:</b> {c.risk}</div>}
        </div>
      )}
      <div className="text-[13px] font-semibold text-[#1f1235]">Subject: {draft.subject}</div>
      <p className="text-[13px] text-[#1f1235] whitespace-pre-wrap bg-white border border-[#e4dcf7] rounded-lg px-3 py-2">{draft.body}</p>
      {error && <p className="text-[12.5px] text-red-700">{error}</p>}
      <div className="flex gap-2 items-center">
        <button type="button" onClick={copy}
          className="text-[13px] font-bold text-white bg-[#7C3AED] rounded-lg px-3 py-2">{copied ? 'Copied' : 'Copy'}</button>
        <button type="button" onClick={() => write(true)} disabled={busy}
          className="text-[13px] font-bold text-[#7C3AED] bg-white border border-[#e4dcf7] rounded-lg px-3 py-2 disabled:opacity-50">{busy ? 'Writing…' : 'Write it again'}</button>
        <span className="text-[11.5px] text-[#9b8ec4]">Send it from your own email.</span>
      </div>
    </div>
  )
}
