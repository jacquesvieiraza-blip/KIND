'use client'

import { useCallback, useEffect, useState } from 'react'

// Vida LEAD QUEUE — the operator's single inbox: every FIGSY-written draft awaiting a human
// release, across ALL clients, newest first. Each row shows who it's to and the readable
// email (expand) so nothing is ever approved blind. Approve & send / Reject reuse the same
// operator queue endpoints the per-client board uses. Design ref: docs/mv-previews/vida2.html.

type Draft = {
  id: string
  client_id: string | null
  client_name: string | null
  lead_id: string | null
  lead_name: string | null
  to_email: string | null
  subject: string | null
  body: string | null
  sequence_step: number | null
  created_at: string | null
}

function initials(name: string | null): string {
  if (!name) return '—'
  const p = name.trim().split(/\s+/).filter(Boolean)
  if (!p.length) return '—'
  return (p.length === 1 ? p[0].slice(0, 2) : p[0][0] + p[p.length - 1][0]).toUpperCase()
}
function fmt(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return isNaN(d.getTime()) ? '—' : d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

export default function VidaQueuePage() {
  const [drafts, setDrafts] = useState<Draft[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [note, setNote] = useState<string | null>(null)
  const [acting, setActing] = useState<string | null>(null)
  const [open, setOpen] = useState<Set<string>>(new Set())
  const toggle = (id: string) => setOpen(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })

  const load = useCallback(async () => {
    setError(null)
    try {
      const res = await fetch('/api/proxy/operator/queue')
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json?.success) throw new Error(json?.error || `Failed to load queue (${res.status})`)
      setDrafts(json.data ?? [])
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed to load queue') }
  }, [])

  useEffect(() => { load() }, [load])

  async function act(d: Draft, kind: 'approve' | 'reject') {
    setActing(d.id); setNote(null)
    try {
      const res = await fetch(`/api/proxy/operator/queue/${encodeURIComponent(d.id)}/${kind}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ client_id: d.client_id }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json?.success) throw new Error(json?.error || `Action failed (${res.status})`)
      if (kind === 'approve' && json.sent === false && json.note) setNote(json.note)
      await load()
    } catch (e) { setError(e instanceof Error ? e.message : 'Action failed') }
    finally { setActing(null) }
  }

  return (
    <div className="h-full overflow-y-auto px-6 py-6">
      <div className="max-w-4xl">
        <h1 className="text-2xl font-bold text-[#1f1235]">Lead queue</h1>
        <p className="text-sm text-[#7c6f9b] mt-0.5">Every draft FIGSY wrote, across all clients, waiting on your yes (this is NOT the client-approval queue — that count lives on the System page) · read it, then Approve &amp; send or Reject</p>

        {note && <div className="mt-3 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5">{note}</div>}
        {error && <div className="mt-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">{error}</div>}
        {!drafts && !error && <p className="text-sm text-[#9b8ec4] mt-4">Loading queue…</p>}
        {drafts && drafts.length === 0 && (
          <div className="mt-4 text-sm text-[#9b8ec4] bg-white border border-[#ece5fb] rounded-2xl px-4 py-10 text-center">No drafts awaiting YOUR approval. The queue is clear. 🎉</div>
        )}

        <div className="mt-4 space-y-2.5">
          {drafts?.map(d => {
            const isOpen = open.has(d.id)
            const busy = acting === d.id
            return (
              <div key={d.id} className="bg-white border border-[#ece5fb] rounded-2xl p-4">
                <div className="flex items-start gap-3">
                  <span className="w-9 h-9 rounded-lg bg-[#efeafc] text-[#7C3AED] flex items-center justify-center text-[11px] font-bold shrink-0">{initials(d.lead_name)}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <b className="text-[14px]">{d.lead_name || 'Unknown lead'}</b>
                      <span className="text-[10px] font-bold uppercase tracking-wide text-[#7C3AED] bg-[#f3ecff] rounded px-1.5 py-0.5">{d.client_name || 'client'}</span>
                      {d.sequence_step ? <span className="text-[10.5px] text-[#9b8ec4]">step {d.sequence_step}</span> : null}
                      <span className="text-[10.5px] text-[#b3a9cc] ml-auto">{fmt(d.created_at)}</span>
                    </div>
                    <div className="text-[12px] text-[#9b8ec4] truncate">{d.to_email || '—'}</div>
                    <div className="text-[13px] font-semibold text-[#1f1235] mt-1">{d.subject || '(no subject)'}</div>
                    <button onClick={() => toggle(d.id)} className="text-[11.5px] font-bold text-[#7C3AED] mt-1 hover:underline">
                      {isOpen ? 'Hide draft ▲' : 'Preview draft ▼'}
                    </button>
                    {isOpen && (
                      <div className="mt-2 text-[12.5px] text-[#4c4368] bg-[#faf8ff] border border-[#ece5fb] rounded-xl p-3 max-h-64 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                        {d.body || '(empty body)'}
                      </div>
                    )}
                    <div className="flex gap-2 mt-2.5">
                      <button disabled={busy} onClick={() => act(d, 'approve')}
                        className="text-[12px] font-bold text-white rounded-lg py-1.5 px-3.5 bg-gradient-to-br from-[#7C3AED] to-[#EC4899] disabled:opacity-50">
                        {busy ? '…' : 'Approve & send'}
                      </button>
                      <button disabled={busy} onClick={() => act(d, 'reject')}
                        className="text-[12px] font-semibold text-[#5c5279] rounded-lg py-1.5 px-3.5 border border-[#ece5fb] bg-white disabled:opacity-50">
                        Reject
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
