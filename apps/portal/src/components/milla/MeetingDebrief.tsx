'use client'

import { useState } from 'react'
import { api } from '@/lib/api'
import { createClient } from '@/lib/supabase/client'

// ⚑ 1 Oct (Coaching #2501 Meeting Debrief · Phase 1 · R180) — five short questions under a meeting
// the client said happened. Full Coaching only: the API sends `debrief` only to a plan that has it,
// so every other plan sees nothing here (no upsell line). Inside the meeting's card in Coaching's
// "After your meetings" (⛓️ 1 Oct, placement — ~~the Meetings card~~), in the
// existing inline-panel and button style of the "How did it go?" and follow-up panels (R167).
// Typed answers only — nothing is recorded or transcribed. What may be saved is decided by the API
// (`lib/meeting-debrief.ts`); this only asks and shows.

export type DebriefAnswers = { who: string; cared: string; objections: string; agreed: string; differently: string }
export type SavedDebrief = DebriefAnswers & { at: string }
export type DebriefSlot = { saved: SavedDebrief | null }

// ⚠️ The same five questions as `DEBRIEF_QUESTIONS` in the API (meeting-debrief.test.ts holds them).
const QUESTIONS: Array<{ key: keyof DebriefAnswers; label: string; hint: string }> = [
  { key: 'who',         label: 'Who was in the room?',                     hint: 'e.g. Their operations director and their finance lead' },
  { key: 'cared',       label: 'What did they care about most?',           hint: 'e.g. Getting jobs to engineers without phone calls' },
  { key: 'objections',  label: 'What objections came up?',                 hint: 'e.g. Worried about the cost of switching mid-year' },
  { key: 'agreed',      label: 'What was agreed next?',                    hint: 'e.g. A proposal for two depots by Friday' },
  { key: 'differently', label: 'What would you do differently next time?', hint: 'e.g. Ask who signs off earlier' },
]
const EMPTY: DebriefAnswers = { who: '', cared: '', objections: '', agreed: '', differently: '' }

async function token(): Promise<string | undefined> {
  try { const { data } = await createClient().auth.getSession(); return data.session?.access_token } catch { return undefined }
}

export default function MeetingDebrief({ meetingId, debrief, onSaved }: { meetingId: string; debrief: DebriefSlot; onSaved: () => void }) {
  const [fresh, setFresh] = useState<SavedDebrief | null>(null)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<DebriefAnswers>(EMPTY)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const saved = fresh ?? debrief.saved
  const start = () => {
    setForm(saved ? { who: saved.who, cared: saved.cared, objections: saved.objections, agreed: saved.agreed, differently: saved.differently } : EMPTY)
    setError(null); setOpen(true)
  }
  const save = async () => {
    setBusy(true); setError(null)
    try {
      const r = await api.post<{ data: SavedDebrief }>(`/leads/meetings/${meetingId}/debrief`, form, await token())
      setFresh(r.data); setOpen(false)
      onSaved()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'We couldn’t save that just now. Nothing changed — please try again.')
    } finally { setBusy(false) }
  }

  if (open) {
    const any = Object.values(form).some(v => v.trim())
    return (
      <div className="mt-3 bg-[#faf8ff] rounded-lg p-3 flex flex-col gap-2" data-testid="meeting-debrief-form">
        <div className="text-[13px] font-semibold text-[#1f1235]">Debrief this meeting</div>
        {QUESTIONS.map(q => (
          <label key={q.key} className="block">
            <span className="block text-[12px] text-[#6b5f8c] mb-1">{q.label}</span>
            <input value={form[q.key]} onChange={e => setForm({ ...form, [q.key]: e.target.value })} maxLength={280}
              placeholder={q.hint} className="w-full border border-[#e4dcf7] rounded-lg px-3 py-2 text-[13px] bg-white" />
          </label>
        ))}
        {error && <p className="text-[12.5px] text-red-700">{error}</p>}
        <div className="flex gap-2 items-center">
          <button type="button" onClick={save} disabled={!any || busy}
            className="text-[13px] font-bold text-white bg-[#7C3AED] rounded-lg px-3 py-2 disabled:opacity-50">{busy ? 'Saving…' : 'Save debrief'}</button>
          <button type="button" onClick={() => setOpen(false)} disabled={busy}
            className="text-[13px] font-bold text-[#7C3AED] bg-white border border-[#e4dcf7] rounded-lg px-3 py-2 disabled:opacity-50">Cancel</button>
          <span className="text-[11.5px] text-[#9b8ec4]">Answer what you can. Milla uses it to spot what keeps coming up.</span>
        </div>
      </div>
    )
  }

  if (!saved) {
    return (
      <div className="mt-2 flex gap-2 items-center" data-testid="meeting-debrief">
        <button type="button" onClick={start}
          className="text-[13px] font-bold text-[#7C3AED] bg-white border border-[#e4dcf7] rounded-lg px-3 py-2">Debrief this meeting</button>
        <span className="text-[11.5px] text-[#9b8ec4]">Five quick questions, while it&rsquo;s fresh.</span>
      </div>
    )
  }

  return (
    <div className="mt-3 bg-[#faf8ff] rounded-lg p-3 flex flex-col gap-2" data-testid="meeting-debrief">
      <div className="text-[13px] font-semibold text-[#1f1235]">Your debrief</div>
      <div className="text-[12.5px] text-[#5c5279] flex flex-col gap-1">
        {QUESTIONS.filter(q => saved[q.key]).map(q => (
          <div key={q.key}><b className="text-[#1f1235]">{q.label}</b> {saved[q.key]}</div>
        ))}
      </div>
      <div className="flex gap-2 items-center">
        <button type="button" onClick={start}
          className="text-[13px] font-bold text-[#7C3AED] bg-white border border-[#e4dcf7] rounded-lg px-3 py-2">Change it</button>
      </div>
    </div>
  )
}
