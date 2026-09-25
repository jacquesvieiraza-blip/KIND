'use client'
// ═══════════════════════════════════════════════════════════════════════════════════════
// ⚑ 25 Sep (R141 · R166 · P5b, board #2351) — YOUR MEETINGS, AND YOUR RIGHT TO CHALLENGE ONE.
//
// The Terms: "Any challenge to whether a meeting was qualified must be raised with us within
// 3 business days of the meeting being booked into your calendar, and must identify which of the
// seven conditions above was not met." Until now that right had nowhere to go but an email.
//
// 🛑 EVERY CONDITION IS THE WEBSITE'S OWN SENTENCE — the server sends the Pricing page wording,
// so this screen cannot drift from what the client bought. 🛑 THE DEADLINE IS THE SERVER'S, from
// `booked_at`; this screen never computes a date of its own. ⚠️ A FAILED READ SHOWS NOTHING —
// this card is a right, not the programme; the programme screen above carries the failure copy.
// ═══════════════════════════════════════════════════════════════════════════════════════
import { useCallback, useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { createClient } from '@/lib/supabase/client'

type Condition = { key: string; label: string }
export type ClientMeeting = {
  id: string; scheduled_at: string; booked_at: string
  qualified_at: string | null
  challenged_at: string | null; challenge_condition: string | null; challenge_note: string | null
  challenge_outcome: 'upheld' | 'rejected' | null; challenge_resolution_note: string | null
  challenge_deadline_at: string; can_challenge: boolean
  prospect: { name: string | null; company: string | null; title: string | null } | null
}
type Payload = { data: { conditions: Condition[]; meetings: ClientMeeting[] } }

async function token(): Promise<string | undefined> {
  try { const { data } = await createClient().auth.getSession(); return data.session?.access_token } catch { return undefined }
}

const day = (s: string) => new Date(s).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

/** What the client reads beside each meeting. Pure — exported for the test. */
export function meetingStatus(m: ClientMeeting): { label: string; tone: 'good' | 'warn' | 'red' | '' } {
  if (m.challenge_outcome === 'upheld') return { label: 'Challenge upheld', tone: 'red' }
  if (m.challenge_outcome === 'rejected') return { label: 'Challenge reviewed · it stands', tone: '' }
  if (m.challenged_at) return { label: 'Challenge with us', tone: 'warn' }
  if (m.qualified_at) return { label: 'Qualified', tone: 'good' }
  return { label: 'Booked', tone: '' }
}

export default function MeetingChallenges() {
  const [conditions, setConditions] = useState<Condition[]>([])
  const [meetings, setMeetings] = useState<ClientMeeting[] | null>(null)
  const [open, setOpen] = useState<string | null>(null)
  const [condition, setCondition] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const r = await api.get<Payload>('/my/programme/meetings', await token())
      setConditions(r.data?.conditions ?? []); setMeetings(r.data?.meetings ?? [])
    } catch { setMeetings(null) }
  }, [])
  useEffect(() => { void load() }, [load])

  if (!meetings || meetings.length === 0) return null

  async function submit(m: ClientMeeting) {
    setBusy(true); setError(null)
    try {
      await api.post('/my/programme/meetings/challenge', { meetingId: m.id, condition, note }, await token())
      setDone(m.id); setOpen(null); setCondition(''); setNote('')
      await load()
    } catch (e) {
      setError(e instanceof Error && e.message.length < 200 ? e.message : 'Your challenge could not be sent just now. Please try again.')
    } finally { setBusy(false) }
  }

  return (
    <div className="mv-section mt-3" data-testid="meeting-challenges">
      <div className="mv-section-head">
        <b>Your meetings</b>
        <span>you can challenge a meeting within 3 business days of it being booked</span>
      </div>
      <div className="mv-section-body flex flex-col">
        {meetings.map(m => {
          const st = meetingStatus(m)
          const who = m.prospect?.name || 'A prospect'
          return (
            <div key={m.id} className="border-t border-[#f2ecfb] first:border-t-0 py-2.5" data-testid="client-meeting">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <div className="min-w-0">
                  <b className="text-[13.5px]">{who}</b>
                  <span className="text-[12.5px] text-[#6b5f8c]">{[m.prospect?.title, m.prospect?.company].filter(Boolean).length ? ` · ${[m.prospect?.title, m.prospect?.company].filter(Boolean).join(', ')}` : ''}</span>
                  <div className="text-[12px] text-[#9b8ec4]">{day(m.scheduled_at)}</div>
                </div>
                <span className={`mv-pill ${st.tone} ml-auto`}>{st.label}</span>
                {m.can_challenge && open !== m.id && (
                  <button type="button" className="mv-btn" onClick={() => { setOpen(m.id); setCondition(''); setNote(''); setError(null) }}>
                    Challenge
                  </button>
                )}
              </div>
              {m.can_challenge && open !== m.id && (
                <div className="text-[11.5px] text-[#9b8ec4] mt-0.5">You can challenge this until {day(m.challenge_deadline_at)}.</div>
              )}
              {done === m.id && m.challenged_at && !m.challenge_outcome && (
                <p className="text-[12.5px] text-[#5b21b6] mt-1.5">Thank you — your challenge is with us. A person will review it and you will see the answer here.</p>
              )}
              {m.challenged_at && (
                <div className="text-[12.5px] text-[#6b5f8c] mt-1.5 bg-[#faf8ff] rounded-lg px-3 py-2">
                  <div>You said this was not met: <span className="text-[#1b1626]">{conditions.find(c => c.key === m.challenge_condition)?.label ?? '—'}</span></div>
                  {m.challenge_note && <div className="mt-0.5">“{m.challenge_note}”</div>}
                  {m.challenge_outcome && m.challenge_resolution_note && (
                    <div className="mt-1.5 text-[#1b1626]"><b>Our answer:</b> {m.challenge_resolution_note}</div>
                  )}
                </div>
              )}
              {open === m.id && (
                <div className="mt-2 bg-[#faf8ff] rounded-lg p-3 flex flex-col gap-2" data-testid="challenge-form">
                  <div className="text-[13px] font-semibold">Which of the seven conditions was not met?</div>
                  {conditions.map(c => (
                    <label key={c.key} className="flex items-start gap-2 text-[13px]">
                      <input id={`ch-${m.id}-${c.key}`} type="radio" name={`ch-${m.id}`} value={c.key}
                        checked={condition === c.key} onChange={() => setCondition(c.key)} className="mt-1" />
                      <span>{c.label}</span>
                    </label>
                  ))}
                  <label className="block">
                    <span className="block text-[12px] text-[#6b5f8c] mb-1">Tell us what happened (optional)</span>
                    <textarea id={`ch-${m.id}-note`} value={note} maxLength={2000} rows={2}
                      onChange={e => setNote(e.target.value)}
                      className="w-full border border-[#e4dcf7] rounded-lg px-3 py-2 text-[13px] bg-white" />
                  </label>
                  <p className="text-[11.5px] text-[#9b8ec4]">
                    A meeting is judged on what was known when it was booked — not on whether the call went well or the prospect bought.
                  </p>
                  {error && <p className="text-[12.5px] text-red-700">{error}</p>}
                  <div className="flex gap-2">
                    <button type="button" onClick={() => void submit(m)} disabled={busy || !condition}
                      className="text-[13px] font-bold text-white bg-[#7C3AED] rounded-lg px-3 py-2 disabled:opacity-50">Send challenge</button>
                    <button type="button" onClick={() => setOpen(null)} disabled={busy}
                      className="text-[13px] font-semibold text-[#6b5f8c] border border-[#e4dcf7] rounded-lg px-3 py-2">Cancel</button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
