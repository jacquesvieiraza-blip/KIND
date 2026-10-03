'use client'

import { useState } from 'react'
import { api } from '@/lib/api'
import { createClient } from '@/lib/supabase/client'

// ⚑ 1 Oct (Coaching F1 · #2483 · R180 Q4) — "HOW DID IT GO?" under a meeting whose time has
// passed. Every plan. Inside the existing Meetings card, in its existing style (R167) — the same
// inline panel the challenge form uses. What an answer does is decided by the API
// (`lib/meeting-outcome.ts`); this only asks and shows the reply.

const ANSWERS = [
  { key: 'next_step', label: 'Next step agreed', hint: 'A follow-up, proposal or second call is set' },
  { key: 'not_now',   label: 'Interested, not now', hint: 'Good fit, but the timing is later' },
  { key: 'not_fit',   label: 'Not a fit', hint: 'It happened, and it isn’t going anywhere' },
  { key: 'no_show',   label: 'They didn’t show', hint: 'We’ll check it and try to rebook them once, free' },
] as const

async function token(): Promise<string | undefined> {
  try { const { data } = await createClient().auth.getSession(); return data.session?.access_token } catch { return undefined }
}

export default function MeetingOutcomeAsk({ meetingId, onSaved }: { meetingId: string; onSaved: () => void }) {
  const [answer, setAnswer] = useState<string>('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const save = async () => {
    if (!answer) return
    setBusy(true); setError(null)
    try {
      await api.post(`/leads/meetings/${meetingId}/outcome`, { answer, note: note.trim() || undefined }, await token())
      onSaved()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'We couldn’t save that just now. Nothing changed — please try again.')
    } finally { setBusy(false) }
  }

  return (
    <div className="mt-3 bg-[#faf8ff] rounded-lg p-3 flex flex-col gap-2" data-testid="meeting-outcome-ask">
      <div className="text-[13px] font-semibold text-[#1f1235]">How did it go?</div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {ANSWERS.map(a => (
          <button key={a.key} type="button" aria-pressed={answer === a.key} onClick={() => setAnswer(a.key)}
            className={`text-left rounded-lg border px-3 py-2 bg-white ${answer === a.key ? 'border-[#7C3AED] bg-[#f3ecff]' : 'border-[#e4dcf7]'}`}>
            <b className="block text-[13px] text-[#1f1235]">{a.label}</b>
            <span className="block text-[11.5px] text-[#9b8ec4]">{a.hint}</span>
          </button>
        ))}
      </div>
      <label className="block">
        <span className="block text-[12px] text-[#6b5f8c] mb-1">What happened? (optional, one line)</span>
        <input value={note} onChange={e => setNote(e.target.value)} maxLength={280}
          placeholder="e.g. Wants a proposal by Friday — pricing was the main question."
          className="w-full border border-[#e4dcf7] rounded-lg px-3 py-2 text-[13px] bg-white" />
      </label>
      {error && <p className="text-[12.5px] text-red-700">{error}</p>}
      <div className="flex gap-2 items-center">
        <button type="button" onClick={save} disabled={!answer || busy}
          className="text-[13px] font-bold text-white bg-[#7C3AED] rounded-lg px-3 py-2 disabled:opacity-50">{busy ? 'Saving…' : 'Save'}</button>
        <span className="text-[11.5px] text-[#9b8ec4]">It takes ten seconds, and it&rsquo;s how Milla learns what&rsquo;s working.</span>
      </div>
    </div>
  )
}
