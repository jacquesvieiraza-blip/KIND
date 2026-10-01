'use client'

import { useState } from 'react'
import { api, AI_TURN_TIMEOUT_MS } from '@/lib/api'
import { createClient } from '@/lib/supabase/client'

// ⚑ 1 Oct (R180 · R184 · #2506) — ROLEPLAY (text, Phase 1), on the existing Coaching page in its
// card style (R167). The client practises a call with the prospect of one of THEIR meetings:
// Milla plays the prospect, the client types replies, and after six replies — or "How did I do?"
// — Milla gives three notes. ⚠️ THE TRANSCRIPT LIVES HERE ONLY: a practice run is not a record of
// anything a real prospect said, so the server stores none of it and this state is the whole of it.

export type PracticeMeeting = { lead_id: string; name: string; job_title: string | null; company: string | null }
type Turn = { who: 'prospect' | 'you'; text: string }
type Feedback = { landed: string; tighten: string; nextStep: string }
type Reply = { data: { done: false; line: string } | { done: true; feedback: Feedback } }

const MAX_TURNS = 12      // mirrors ROLEPLAY_MAX_TURNS on the server, which is the real bound
const FEEDBACK_AFTER = 6  // mirrors ROLEPLAY_FEEDBACK_AFTER

async function token(): Promise<string | undefined> {
  try { const { data } = await createClient().auth.getSession(); return data.session?.access_token } catch { return undefined }
}

export default function RoleplayCard({ meetings: all }: { meetings: PracticeMeeting[] }) {
  // One row per prospect: two meetings with the same person are one person to practise with.
  const meetings = all.filter((m, i) => m.lead_id && all.findIndex(x => x.lead_id === m.lead_id) === i)
  const [leadId, setLeadId] = useState<string>('')
  const [turns, setTurns] = useState<Turn[]>([])
  const [draft, setDraft] = useState('')
  const [feedback, setFeedback] = useState<Feedback | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const who = meetings.find(m => m.lead_id === leadId)
  const replies = turns.filter(t => t.who === 'you').length
  const started = turns.length > 0

  const send = async (next: Turn[], finish: boolean) => {
    setBusy(true); setError(null)
    try {
      // ⚠️ A MODEL CALL — the 45s budget, never the 15s CRUD default (models.test).
      const r = await api.post<Reply>('/my/programme/coaching/roleplay', { leadId, turns: next, finish }, await token(), AI_TURN_TIMEOUT_MS)
      if (r.data.done) { setTurns(next); setFeedback(r.data.feedback) }
      else setTurns([...next, { who: 'prospect', text: r.data.line }])
      setDraft('')
    } catch (e) { setError(e instanceof Error ? e.message : 'Milla couldn’t put that together just now. Please try again.') }
    finally { setBusy(false) }
  }

  const start = () => { setTurns([]); setFeedback(null); setDraft(''); void send([], false) }
  const reply = () => {
    const text = draft.trim()
    if (!text) return
    const next: Turn[] = [...turns, { who: 'you', text }]
    void send(next, replies + 1 >= FEEDBACK_AFTER || next.length >= MAX_TURNS)
  }
  const reset = () => { setTurns([]); setFeedback(null); setDraft(''); setError(null) }

  return (
    <div className="bg-white border border-[#eee7f7] rounded-2xl p-4 sm:p-5 mb-3.5 max-w-3xl" data-testid="roleplay">
      <div className="flex items-start gap-3 flex-wrap">
        <div className="min-w-0">
          <b className="text-[15px] block leading-tight">Roleplay</b>
          <span className="text-[12.5px] text-[#9b8ec4]">Practise the call. Milla plays your prospect; you reply. Nothing here is saved.</span>
        </div>
        {started && !feedback && (
          <span className="ml-auto shrink-0 text-[12px] font-bold text-[#6d28d9] bg-[#f3ecff] border border-[#e4dcf7] rounded-full px-3 py-1">{replies} of {FEEDBACK_AFTER} replies</span>
        )}
      </div>

      {meetings.length === 0 ? (
        <p className="text-[12.5px] text-[#9b8ec4] mt-3">Once we book a meeting, you can practise it here.</p>
      ) : !started ? (
        <div className="mt-3 flex gap-2 items-end flex-wrap">
          <label className="block min-w-0 flex-1">
            <span className="block text-[12px] font-semibold text-[#1f1235] mb-1">Who do you want to practise with?</span>
            <select id="rp-who" value={leadId} onChange={e => setLeadId(e.target.value)}
              className="w-full border border-[#e4dcf7] rounded-lg px-3 py-2 text-[12.5px] bg-white">
              <option value="">Pick a meeting…</option>
              {meetings.map(m => (
                <option key={m.lead_id} value={m.lead_id}>{[m.name, m.job_title, m.company].filter(Boolean).join(' · ')}</option>
              ))}
            </select>
          </label>
          <button type="button" onClick={start} disabled={busy || !leadId}
            className="text-[12.5px] font-extrabold text-white rounded-xl px-4 py-2.5 bg-gradient-to-br from-[#7C3AED] to-[#EC4899] disabled:opacity-60">
            {busy ? 'Connecting…' : '🎓 Start the practice call'}
          </button>
        </div>
      ) : (
        <>
          <div className="mt-3 space-y-2">
            {turns.map((t, i) => (
              <div key={i} className={t.who === 'prospect'
                ? 'bg-[#faf8ff] border border-[#f2ecfb] rounded-xl px-3.5 py-2.5 mr-8'
                : 'bg-white border border-[#e4dcf7] rounded-xl px-3.5 py-2.5 ml-8'}>
                <span className="text-[10px] font-extrabold uppercase tracking-wide text-[#b3a9cc]">
                  {t.who === 'prospect' ? (who?.name ?? 'Prospect') : 'You'}
                </span>
                <p className="text-[12.5px] text-[#4c4368] leading-relaxed mt-1 whitespace-pre-wrap">{t.text}</p>
              </div>
            ))}
          </div>

          {feedback ? (
            <div className="mt-3 border border-[#e4dcf7] rounded-xl px-4 py-3.5 bg-gradient-to-br from-[#faf7ff] to-white space-y-2.5">
              <div className="flex items-center gap-2"><span className="text-[14px]">🎓</span><b className="text-[13px]">How you did</b></div>
              <div><span className="text-[10px] font-extrabold uppercase tracking-wide text-[#b3a9cc]">What landed</span>
                <p className="text-[12.5px] text-[#4c4368] leading-relaxed mt-1">{feedback.landed}</p></div>
              <div><span className="text-[10px] font-extrabold uppercase tracking-wide text-[#b3a9cc]">What to tighten</span>
                <p className="text-[12.5px] text-[#4c4368] leading-relaxed mt-1">{feedback.tighten}</p></div>
              <div><span className="text-[10px] font-extrabold uppercase tracking-wide text-[#b3a9cc]">The next step to ask for</span>
                <p className="text-[12.5px] text-[#4c4368] leading-relaxed mt-1">{feedback.nextStep}</p></div>
              <button type="button" onClick={reset} className="text-[12px] font-bold text-[#6d28d9]">Practise again</button>
            </div>
          ) : (
            <>
              <textarea id="rp-reply" rows={2} maxLength={600} value={draft} placeholder="Your reply…"
                onChange={e => setDraft(e.target.value)}
                className="mt-3 w-full border border-[#e4dcf7] rounded-lg px-3 py-2 text-[12.5px] bg-white resize-y" />
              <div className="mt-2 flex gap-2 items-center flex-wrap">
                <button type="button" onClick={reply} disabled={busy || !draft.trim()}
                  className="text-[12.5px] font-extrabold text-white rounded-xl px-4 py-2.5 bg-gradient-to-br from-[#7C3AED] to-[#EC4899] disabled:opacity-60">
                  {busy ? 'Waiting for them…' : 'Reply'}
                </button>
                <button type="button" onClick={() => void send(turns, true)} disabled={busy || replies === 0}
                  className="text-[12.5px] font-bold text-[#6d28d9] bg-[#f3ecff] border border-[#e4dcf7] rounded-xl px-4 py-2.5 disabled:opacity-60">
                  How did I do?
                </button>
                <button type="button" onClick={reset} disabled={busy} className="text-[11.5px] text-[#9b8ec4]">Start over</button>
              </div>
            </>
          )}
        </>
      )}
      {error && <p className="text-[12.5px] text-red-700 mt-2">{error}</p>}
    </div>
  )
}
