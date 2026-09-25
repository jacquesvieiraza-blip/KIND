'use client'
// ═══════════════════════════════════════════════════════════════════════════════════════
// ⚑ 25 Sep (R141 · R166 · P5a, board #2351) — QUALIFY A MEETING, IN VIDA.
//
// The website sells a QUALIFIED meeting with seven conditions (R141). This panel lists a
// client's live meetings and lets a person confirm all seven and link the prospect's accepting
// reply as the evidence. The server refuses anything less; this screen only makes it easy to do
// right. Once qualified a meeting stands — a dispute is the client's challenge within 3 business
// days, not an edit here.
//
// ⛓️ 25 Sep (P5b) — AND THE CLIENT'S CHALLENGE LANDS HERE. A challenged meeting shows the
// condition the client named and their words; a person upholds or rejects it with a reason the
// client reads in Milla. Recorded, audited; what counts toward the target is P6.
//
// ⛓️ 25 Sep (P5c) — NO-SHOWS AND CANCELLATIONS, AND WHO (R141). A person records what happened
// and who; a PROSPECT's absence offers the one free reschedule, a CLIENT's absence counts as
// delivered. Same panel, same style (R167: no UI redesign).
// ═══════════════════════════════════════════════════════════════════════════════════════
import { useCallback, useEffect, useState } from 'react'

type Condition = { key: string; label: string }
type Reply = { id: string; received_at: string | null; processed_at: string | null; classification: string; snippet: string }
type Meeting = {
  id: string; state: string; scheduled_at: string; booked_at: string
  qualified_at: string | null; qualified_by: string | null; challenge_deadline_at: string | null
  challenged_at?: string | null; challenge_condition?: string | null; challenge_note?: string | null
  challenge_outcome?: 'upheld' | 'rejected' | null; challenge_resolved_by?: string | null; challenge_resolution_note?: string | null
  rescheduled_from?: string | null; absence_kind?: 'no_show' | 'cancelled' | null; absence_party?: 'prospect' | 'client' | null; absence_recorded_by?: string | null
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
  const [reason, setReason] = useState<Record<string, string>>({})
  const [absOpen, setAbsOpen] = useState<string | null>(null)
  const [absKind, setAbsKind] = useState<'no_show' | 'cancelled'>('no_show')
  const [absParty, setAbsParty] = useState<'prospect' | 'client'>('prospect')
  const [newTime, setNewTime] = useState<Record<string, string>>({})

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

  const resolve = useCallback(async (m: Meeting, outcome: 'upheld' | 'rejected') => {
    const why = (reason[m.id] ?? '').trim()
    const verb = outcome === 'upheld' ? 'Uphold' : 'Reject'
    if (!confirm(`${verb} this challenge?\n\nThe client will read your reason in Milla:\n“${why}”`)) return
    setBusy(true); setMsg(null)
    try {
      const j = await fetch(`/api/proxy/operator/meetings/${encodeURIComponent(m.id)}/resolve-challenge`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ outcome, note: why }),
      }).then(r => r.json())
      if (!j?.success) throw new Error(j?.error || 'The challenge was not resolved.')
      setMsg(outcome === 'upheld' ? 'Challenge upheld — recorded.' : 'Challenge rejected — the meeting stands.')
      await load()
    } catch (e) { setMsg(e instanceof Error ? e.message : 'The challenge was not resolved.') }
    finally { setBusy(false) }
  }, [reason, load])

  const post = useCallback(async (path: string, body: unknown, ok: string) => {
    setBusy(true); setMsg(null)
    try {
      const j = await fetch(`/api/proxy/operator/meetings/${path}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      }).then(r => r.json())
      if (!j?.success) throw new Error(j?.error || 'Nothing was changed.')
      setMsg(ok); setAbsOpen(null); await load()
    } catch (e) { setMsg(e instanceof Error ? e.message : 'Nothing was changed.') }
    finally { setBusy(false) }
  }, [load])

  const recordAbsence = (m: Meeting) => {
    const what = absKind === 'no_show' ? 'did not attend' : 'cancelled'
    const consequence = absParty === 'prospect' ? 'You can then give it its one free reschedule.' : 'Under the Terms it counts as delivered — no free reschedule.'
    if (!confirm(`Record that the ${absParty} ${what}?\n\n${consequence}`)) return
    void post(`${encodeURIComponent(m.id)}/absence`, { kind: absKind, party: absParty }, 'Recorded.')
  }
  const rescue = (m: Meeting) => {
    const t = newTime[m.id]
    if (!t) return
    if (!confirm(`Reschedule to ${when(new Date(t).toISOString())}?\n\nThis is the meeting's one free reschedule. It keeps its qualification and counts once.`)) return
    void post(`${encodeURIComponent(m.id)}/reschedule`, { scheduled_at: new Date(t).toISOString() }, 'Rescheduled — it counts once.')
  }

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
            {m.rescheduled_from && (
              <div className="text-[11.5px] text-[#9b8ec4] mt-0.5">Rescheduled — its one free reschedule is used.</div>
            )}
            {m.absence_kind ? (
              <div className="text-[12px] text-[#6b5f8c] mt-1" data-testid="meeting-absence">
                {m.absence_party === 'prospect' ? 'The prospect' : 'The client'} {m.absence_kind === 'no_show' ? 'did not attend' : 'cancelled'}
                <span className="text-[#9b8ec4]"> · recorded by {m.absence_recorded_by}</span>
                {m.absence_party === 'client' && <span> — counts as delivered, no free reschedule.</span>}
                {m.absence_party === 'prospect' && !m.rescheduled_from && (
                  <div className="flex flex-wrap items-center gap-2 mt-1.5">
                    <input id={`r-${m.id}-time`} type="datetime-local" value={newTime[m.id] ?? ''} onChange={e => setNewTime(t => ({ ...t, [m.id]: e.target.value }))}
                      className="text-[12.5px] border border-[#e6dcf7] rounded-lg px-2 py-1" />
                    <button onClick={() => rescue(m)} disabled={busy || !newTime[m.id]} className="text-[12px] font-bold text-[#5b21b6] border border-[#d8c8f5] rounded-lg px-2 py-1 disabled:opacity-40">Reschedule (the one free one)</button>
                  </div>
                )}
              </div>
            ) : m.state !== 'HELD' && m.state !== 'NO_SHOW' && (
              absOpen === m.id ? (
                <div className="flex flex-wrap items-center gap-2 mt-1.5 text-[12.5px]">
                  <select id={`a-${m.id}-party`} value={absParty} onChange={e => setAbsParty(e.target.value as 'prospect' | 'client')} className="border border-[#e6dcf7] rounded-lg px-2 py-1 bg-white">
                    <option value="prospect">The prospect</option>
                    <option value="client">The client</option>
                  </select>
                  <select id={`a-${m.id}-kind`} value={absKind} onChange={e => setAbsKind(e.target.value as 'no_show' | 'cancelled')} className="border border-[#e6dcf7] rounded-lg px-2 py-1 bg-white">
                    <option value="no_show">did not attend</option>
                    <option value="cancelled">cancelled</option>
                  </select>
                  <button onClick={() => recordAbsence(m)} disabled={busy} className="text-[12px] font-bold text-white bg-[#7C3AED] rounded-lg px-2 py-1 disabled:opacity-40">Record</button>
                  <button onClick={() => setAbsOpen(null)} className="text-[12px] text-[#6b5f8c] px-1">Cancel</button>
                </div>
              ) : (
                <button onClick={() => { setAbsOpen(m.id); setAbsKind('no_show'); setAbsParty('prospect') }} className="text-[11.5px] text-[#9b8ec4] hover:text-[#5b21b6] mt-0.5">No-show or cancelled?</button>
              )
            )}
            {m.challenged_at && (
              <div className={`mt-2 rounded-lg p-2.5 text-[12.5px] ${m.challenge_outcome ? 'bg-[#faf8ff]' : 'bg-amber-50 border border-amber-200'}`} data-testid="meeting-challenge">
                <div className="font-bold">
                  {m.challenge_outcome === 'upheld' ? 'Challenge upheld' : m.challenge_outcome === 'rejected' ? 'Challenge rejected' : 'The client challenged this meeting'}
                  <span className="font-normal text-[#9b8ec4]"> · {when(m.challenged_at)}</span>
                </div>
                <div className="text-[#6b5f8c] mt-0.5">Condition not met: {conditions.find(c => c.key === m.challenge_condition)?.label ?? m.challenge_condition}</div>
                {m.challenge_note && <div className="mt-0.5">“{m.challenge_note}”</div>}
                {m.challenge_outcome ? (
                  <div className="text-[#6b5f8c] mt-1">{m.challenge_resolved_by}: {m.challenge_resolution_note}</div>
                ) : (
                  <div className="flex flex-col gap-1.5 mt-2">
                    <input id={`c-${m.id}-reason`} value={reason[m.id] ?? ''} onChange={e => setReason(r => ({ ...r, [m.id]: e.target.value }))}
                      placeholder="Your reason — the client reads this (at least 10 characters)"
                      className="text-[12.5px] border border-[#e6dcf7] rounded-lg px-2 py-1.5 bg-white" />
                    <div className="flex gap-2">
                      <button onClick={() => void resolve(m, 'upheld')} disabled={busy || (reason[m.id] ?? '').trim().length < 10} className="text-[12.5px] font-bold text-white bg-[#7C3AED] rounded-lg px-2.5 py-1.5 disabled:opacity-40">Uphold — not qualified</button>
                      <button onClick={() => void resolve(m, 'rejected')} disabled={busy || (reason[m.id] ?? '').trim().length < 10} className="text-[12.5px] font-bold text-[#5b21b6] border border-[#d8c8f5] rounded-lg px-2.5 py-1.5 disabled:opacity-40">Reject — it stands</button>
                    </div>
                  </div>
                )}
              </div>
            )}
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
