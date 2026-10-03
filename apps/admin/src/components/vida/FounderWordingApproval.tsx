'use client'

// ⚑ 2 Oct (#2542 · R186 ③ · 4b) — THE FOUNDER READS THE EMAILS AS THEY LAND, AND APPROVES THEM.
//
// The founder: *"i want to review the sequence and campaign wording for now. this is a stage gate
// approval needed by me in vida."* · once per sequence, as a whole: *"A. lock"* · founder first.
//
// Shown on the client's Programme tab at EVERY stage, so a rewrite, an edit or a new batch on a
// live programme comes straight back here (4b). Approving approves the exact version on screen:
// if it changed while he was reading, the server refuses and he reads the new one.

import { useCallback, useEffect, useState } from 'react'

type Email = { step: number; subject: string; body: string; wait_days: number }
type Wording = {
  gate_on: boolean; version: string | null; version_number: number | null
  sample?: { name: string | null; company: string | null } | null
  emails: Email[]; approved: boolean
  approvals: { snapshot_hash: string; approved_at: string; approved_by: string | null }[] | null
  approvals_unreadable: string | null
}

function paragraphs(body: string): string[] {
  return body.replace(/\r\n?/g, '\n').split('\n').map(l => l.trim()).filter(Boolean)
}

export default function FounderWordingApproval({ programmeId }: { programmeId: string }) {
  const [w, setW] = useState<Wording | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const j = await fetch(`/api/proxy/programmes/${encodeURIComponent(programmeId)}/wording`).then(r => r.json())
      if (!j?.success) throw new Error(j?.error || 'The emails could not be loaded.')
      setW(j.data); setError(null)
    } catch (e) { setError(e instanceof Error ? e.message : 'The emails could not be loaded.') }
  }, [programmeId])
  useEffect(() => { setW(null); setMsg(null); void load() }, [load])

  const approve = useCallback(async () => {
    if (!w?.version) return
    if (!confirm(`Approve these ${w.emails.length} emails, exactly as shown?\n\nOnly then does the client see them in Milla, and only then can anything send. Any later change comes back to you.`)) return
    setBusy(true); setMsg(null)
    try {
      const j = await fetch(`/api/proxy/programmes/${encodeURIComponent(programmeId)}/wording/approve`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ version: w.version }),
      }).then(r => r.json())
      if (!j?.success) throw new Error(j?.error || 'Not approved.')
      setMsg('Approved. The client can now see these emails in Milla.')
      await load()
    } catch (e) { setMsg(e instanceof Error ? e.message : 'Not approved.'); await load() }
    finally { setBusy(false) }
  }, [w, programmeId, load])

  if (error) return <p className="text-[12px] text-red-700 mt-3">{error}</p>
  if (!w) return null

  return (
    <div className="mt-4 rounded-xl border border-[#e3daf7] bg-white" data-testid="founder-wording-approval">
      <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-[#f0eafa]">
        <b className="text-[13px]">Your approval of the emails</b>
        {w.version_number != null && <span className="text-[11.5px] text-[#6b5f8c]">version {w.version_number}</span>}
        {!w.gate_on && <span className="text-[11.5px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 rounded px-2 py-0.5">Gate switched off (FOUNDER_WORDING_GATE=off)</span>}
        {w.approved
          ? <span className="ml-auto text-[12px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg px-2.5 py-1">Approved by you</span>
          : w.version
            ? <button onClick={() => void approve()} disabled={busy}
                className="ml-auto text-[12.5px] font-bold text-white bg-[#059669] rounded-lg px-3 py-1.5 disabled:opacity-50">
                {busy ? '…' : 'Approve these emails'}</button>
            : <span className="ml-auto text-[12px] text-[#6b5f8c]">Nothing prepared yet</span>}
      </div>
      {w.approvals_unreadable && <p className="text-[12px] text-red-700 px-4 pt-2">Approvals could not be read: {w.approvals_unreadable}</p>}
      {!w.approved && w.version && (
        <p className="text-[12px] text-[#6b5f8c] px-4 pt-3">Nothing new is sent and the client does not see these until you approve them. {/* ⚑ 3 Oct (R191 4c) — true now: */}People already approved keep receiving their emails while a new batch waits.</p>
      )}
      {/* ⚑ 3 Oct (review S11) — as they land: filled for one real prospect; the footer is added when sent. */}
      <p className="text-[12px] text-[#6b5f8c] px-4 pt-2">
        {w.sample
          ? <>Shown as {w.sample.name ?? 'a prospect'}{w.sample.company ? ` at ${w.sample.company}` : ''} will receive them. </>
          : <>Shown with the placeholders unfilled — no prospect could be read. </>}
        Each email also ends with the opt-out line and the client&apos;s legal line, added when it is sent.
      </p>
      <div className="px-4 py-3 flex flex-col gap-3">
        {w.emails.map((e, i) => (
          <div key={e.step} className="rounded-lg border border-[#f0eafa] bg-[#fdfcff] px-3.5 py-3">
            <div className="text-[11px] font-bold uppercase tracking-[0.06em] text-[#9b8ec4]">
              Email {e.step} of {w.emails.length}{i > 0 ? ` · ${w.emails[i - 1].wait_days} day${w.emails[i - 1].wait_days === 1 ? '' : 's'} after email ${w.emails[i - 1].step}` : ''}
            </div>
            <div className="text-[13px] font-semibold mt-1">Subject: {e.subject}</div>
            <div className="mt-2 text-[13px] leading-[1.55] text-[#2a2238]">
              {paragraphs(e.body).map((p, k) => <p key={k} className="mb-2.5 last:mb-0">{p}</p>)}
            </div>
          </div>
        ))}
      </div>
      {msg && <p className="text-[12px] text-[#6b5f8c] px-4 pb-3">{msg}</p>}
    </div>
  )
}
