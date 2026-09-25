'use client'
// ═══════════════════════════════════════════════════════════════════════════════════════
// ⚑ 25 Sep (R141 · R166 · P5a, board #2351) — QUALIFY A MEETING, IN VIDA.
//
// The website sells a QUALIFIED meeting with seven conditions (R141). This panel lists a
// client's live meetings and lets a person confirm all seven and link the prospect's accepting
// reply as the evidence. The server refuses anything less; this screen only makes it easy to do
// right. Once qualified a meeting stands — a dispute is the client's challenge within 3 business
// days, not an edit here.
// ═══════════════════════════════════════════════════════════════════════════════════════
import { useCallback, useEffect, useState } from 'react'

type Condition = { key: string; label: string }
type Reply = { id: string; received_at: string | null; processed_at: string | null; classification: string; snippet: string }
type Meeting = {
  id: string; state: string; scheduled_at: string; booked_at: string
  qualified_at: string | null; qualified_by: string | null; challenge_deadline_at: string | null
  lead: { first_name: string | null; last_name: string | null; company: string | null; job_title: string | null } | null
  replies: Reply[]
}

const when = (s: string | null) => s ? new Date(s).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'

export default function MeetingQualifyPanel({ clientId }: { clientId: string }) {
  const [conditions, setConditions] = useState<Condition[]>([])
  const [meetings, setMeetings] = useState<Meeting[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState<string | null>(null)
  const [ticks, setTicks] = useState<Record<string, boolean>>({})
  const [evidence, setEvidence] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const j = await fetch(`/api/proxy/operator/meetings?client_id=${encodeURIComponent(clientId)}`).then(r => r.json())
      if (!j?.success) throw new Error(j?.error || 'Meetings could not be loaded.')
      setConditions(j.conditions ?? []); setMeetings(j.meetings ?? []); setError(null)
    } catch (e) { setError(e instanceof Error ? e.message : 'Meetings could not be loaded.') }
  }, [clientId])
  useEffect(() => { setMeetings(null); setOpen(null); void load() }, [load])

  const start = (m: Meeting) => { setOpen(m.id); setTicks({}); setEvidence(m.replies[0]?.id ?? ''); setNote(''); setMsg(null) }

  const qualify = useCallback(async (m: Meeting) => {
    const who = [m.lead?.first_name, m.lead?.last_name].filter(Boolean).join(' ') || 'this prospect'
    if (!confirm(`Qualify the meeting with ${who}?\n\nAll seven conditions are confirmed by you and recorded with your name. Once qualified it stands; the client may challenge it within 3 business days of booking.`)) return
    setBusy(true); setMsg(null)
    try {
      const j = await fetch(`/api/proxy/operator/meetings/${encodeURIComponent(m.id)}/qualify`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qualification: ticks, evidence_reply_id: evidence || null, evidence_note: note }),
      }).then(r => r.json())
      if (!j?.success) throw new Error(j?.error || 'The meeting was not qualified.')
      setMsg(`Qualified. The client can challenge it until ${when(j.challengeDeadlineAt)}.`)
      setOpen(null); await load()
    } catch (e) { setMsg(e instanceof Error ? e.message : 'The meeting was not qualified.') }
    finally { setBusy(false) }
  }, [ticks, evidence, note, load])

  return (
    <div className="border border-[#eee7f7] rounded-xl px-3 py-2.5 mb-3" data-testid="meeting-qualify-panel">
      <b className="text-[13px] block mb-1">Meetings — qualify against the seven conditions</b>
      {error && <p className="text-[12px] text-red-700">{error}</p>}
      {msg && <p className="text-[12px] text-[#5b21b6] mb-1">{msg}</p>}
      {meetings === null && !error && <p className="text-[12px] text-[#9b8ec4]">Loading…</p>}
      {meetings && meetings.length === 0 && <p className="text-[12px] text-[#9b8ec4]">No meetings yet.</p>}
      {(meetings ?? []).map(m => {
        const who = [m.lead?.first_name, m.lead?.last_name].filter(Boolean).join(' ') || 'Unknown prospect'
        return (
          <div key={m.id} className="border-t border-[#f1ecfa] py-2">
            <div className="flex flex-wrap items-center gap-2 text-[12.5px]">
              <b>{who}</b>
              <span className="text-[#6b5f8c]">{[m.lead?.job_title, m.lead?.company].filter(Boolean).join(' · ')}</span>
              <span className="text-[#9b8ec4]">{m.state} · {when(m.scheduled_at)}</span>
              {m.qualified_at
                ? <span className="ml-auto text-[11.5px] font-bold text-emerald-700">Qualified {when(m.qualified_at)} by {m.qualified_by} · challenge until {when(m.challenge_deadline_at)}</span>
                : open !== m.id && <button onClick={() => start(m)} className="ml-auto text-[12px] font-bold text-[#5b21b6] border border-[#d8c8f5] rounded-lg px-2 py-1">Qualify</button>}
            </div>
            {open === m.id && (
              <div className="mt-2 bg-[#faf8ff] rounded-lg p-2.5 flex flex-col gap-1.5">
                {conditions.map(c => (
                  <label key={c.key} className="flex items-start gap-2 text-[12.5px]">
                    <input id={`q-${m.id}-${c.key}`} type="checkbox" checked={!!ticks[c.key]} onChange={e => setTicks(t => ({ ...t, [c.key]: e.target.checked }))} className="mt-0.5" />
                    <span>{c.label}</span>
                  </label>
                ))}
                <label className="text-[12px] text-[#6b5f8c] mt-1">The reply in which they accepted (evidence)
                  <select id={`q-${m.id}-evidence`} value={evidence} onChange={e => setEvidence(e.target.value)} className="block w-full mt-1 text-[12.5px] border border-[#e6dcf7] rounded-lg px-2 py-1.5 bg-white">
                    <option value="">— choose a reply —</option>
                    {m.replies.map(r => <option key={r.id} value={r.id}>{when(r.received_at ?? r.processed_at)} · {r.snippet}</option>)}
                  </select>
                </label>
                <input id={`q-${m.id}-note`} value={note} onChange={e => setNote(e.target.value)} placeholder="Evidence note (e.g. calendar invite accepted) — optional"
                  className="text-[12.5px] border border-[#e6dcf7] rounded-lg px-2 py-1.5" />
                <div className="flex gap-2 mt-1">
                  <button onClick={() => void qualify(m)} disabled={busy} className="text-[12.5px] font-bold text-white bg-[#7C3AED] rounded-lg px-2.5 py-1.5 disabled:opacity-40">Qualify meeting</button>
                  <button onClick={() => setOpen(null)} className="text-[12.5px] text-[#6b5f8c] px-2">Cancel</button>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
