'use client'

import { useCallback, useEffect, useState } from 'react'

// #483–#485 — VIDA OPERATOR CONSOLE (working area).
// Renders inside the Vida shell (app/vida/layout.tsx owns the top bar + rail). This is
// the Clients panel + the 5-column campaign board (Sourced → Needs approval → Sending →
// Replied → Qualified·$4). Consumes the admin-gated /operator API via /api/proxy (admin
// key + verified operator email injected server-side). Design ref: docs/mv-previews/vida2.html.

type ClientRow = {
  id: string
  company_name: string | null
  industry: string | null
  country: string | null
  is_demo: boolean | null
  credit_balance: number | null
  figsy_credits_remaining: number | null
  house_or_demo: boolean
}

type SourcedCard = { id: string; first_name: string | null; last_name: string | null; company: string | null; job_title: string | null; score: number | null; status: string | null }
type LeadJoin = { first_name?: string | null; last_name?: string | null; company?: string | null } | null
type NeedsApprovalCard = {
  id: string; lead_id: string; status: string | null; created_at: string | null
  to_email: string | null; subject: string | null; body: string | null; sequence_step: number | null
  leads?: LeadJoin
}
type SendingCard = { id: string; lead_id: string; current_step: number | null; total_steps: number | null; status: string | null; next_send_at: string | null }
type RepliedCard = { id: string; lead_id: string; from_name: string | null; from_email: string | null; classification: string | null; received_at: string | null }
type QualifiedCard = { id: string; first_name: string | null; last_name: string | null; company: string | null; email: string | null; score: number | null }

type Board = {
  client: { id: string; company_name: string | null }
  columns: {
    sourced: { count: number; cards: SourcedCard[] }
    needs_approval: { count: number; cards: NeedsApprovalCard[] }
    sending: { count: number; cards: SendingCard[] }
    replied: { count: number; cards: RepliedCard[] }
    qualified: { count: number; cards: QualifiedCard[] }
  }
}

function initials(name: string | null): string {
  if (!name) return '—'
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '—'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}
function fullName(f: string | null, l: string | null): string {
  return [f, l].filter(Boolean).join(' ').trim() || 'Unknown lead'
}

// column shell
function Col({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <div className="w-[210px] shrink-0">
      <div className="flex justify-between items-center text-[11px] tracking-[0.05em] uppercase text-[#9b8ec4] font-bold mb-2.5 px-0.5">
        <span>{title}</span>
        <em className="not-italic text-[#1f1235] bg-[#efeafc] rounded-[10px] px-1.5">{count}</em>
      </div>
      {children}
    </div>
  )
}
function EmptyCol() {
  return <div className="text-[11px] text-[#c3bad9] border border-dashed border-[#ece5fb] rounded-xl py-4 text-center">Nothing here yet</div>
}

export default function VidaConsolePage() {
  const [clients, setClients] = useState<ClientRow[] | null>(null)
  const [clientsError, setClientsError] = useState<string | null>(null)
  const [selected, setSelected] = useState<string | null>(null)

  const [board, setBoard] = useState<Board | null>(null)
  const [boardLoading, setBoardLoading] = useState(false)
  const [boardError, setBoardError] = useState<string | null>(null)
  const [acting, setActing] = useState<string | null>(null)
  const [openDrafts, setOpenDrafts] = useState<Set<string>>(new Set())
  const toggleDraft = (id: string) => setOpenDrafts(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const res = await fetch('/api/proxy/operator/clients')
        const json = await res.json().catch(() => ({}))
        if (!res.ok || !json?.success) throw new Error(json?.error || `Failed to load clients (${res.status})`)
        if (!alive) return
        const rows: ClientRow[] = json.data ?? []
        setClients(rows)
        const urlClient = new URLSearchParams(window.location.search).get('client')
        if (urlClient && rows.some(r => r.id === urlClient)) setSelected(urlClient)
      } catch (e) {
        if (alive) setClientsError(e instanceof Error ? e.message : 'Failed to load clients')
      }
    })()
    return () => { alive = false }
  }, [])

  const loadBoard = useCallback(async (clientId: string) => {
    setBoardLoading(true); setBoardError(null)
    try {
      const res = await fetch(`/api/proxy/operator/board?client_id=${encodeURIComponent(clientId)}`)
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json?.success) throw new Error(json?.error || `Failed to load board (${res.status})`)
      setBoard({ client: json.client, columns: json.columns })
    } catch (e) {
      setBoard(null); setBoardError(e instanceof Error ? e.message : 'Failed to load board')
    } finally { setBoardLoading(false) }
  }, [])

  useEffect(() => {
    if (!selected) return
    const url = new URL(window.location.href)
    url.searchParams.set('client', selected)
    window.history.replaceState(null, '', url.toString())
    loadBoard(selected)
  }, [selected, loadBoard])

  // Sourced column — the $4 lead-approve-on-behalf (reveal $1 + work $3) or pass.
  async function act(leadId: string, kind: 'approve' | 'pass') {
    if (!selected) return
    setActing(leadId)
    try {
      const body: Record<string, unknown> = { client_id: selected }
      if (kind === 'approve') body.confirm = true
      const res = await fetch(`/api/proxy/operator/leads/${encodeURIComponent(leadId)}/${kind}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json?.success) throw new Error(json?.error || `Action failed (${res.status})`)
      await loadBoard(selected)
    } catch (e) {
      setBoardError(e instanceof Error ? e.message : 'Action failed')
    } finally { setActing(null) }
  }

  // Needs-approval column — RELEASE (approve & send) or REJECT a FIGSY-written draft.
  // Acts on the approval-queue row id (NOT the lead) — no charge fires here; the $4 already
  // happened at enrollment. A send may honestly defer (cap/kill-switch) — surface the note.
  async function actQueue(queueId: string, kind: 'approve' | 'reject') {
    if (!selected) return
    setActing(queueId)
    try {
      const res = await fetch(`/api/proxy/operator/queue/${encodeURIComponent(queueId)}/${kind}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ client_id: selected }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json?.success) throw new Error(json?.error || `Action failed (${res.status})`)
      if (kind === 'approve' && json.sent === false && json.note) setBoardError(json.note)
      else setBoardError(null)
      await loadBoard(selected)
    } catch (e) {
      setBoardError(e instanceof Error ? e.message : 'Action failed')
    } finally { setActing(null) }
  }

  const selectedClient = clients?.find(c => c.id === selected) ?? null
  const cols = board?.columns

  const approveBtns = (leadId: string) => (
    <div className="flex gap-1.5 mt-2">
      <button disabled={acting === leadId} onClick={() => act(leadId, 'approve')}
        className="flex-1 text-[11px] font-bold text-white rounded-lg py-1.5 bg-gradient-to-br from-[#7C3AED] to-[#EC4899] disabled:opacity-50">
        {acting === leadId ? '…' : '✓ Approve — $4'}
      </button>
      <button disabled={acting === leadId} onClick={() => act(leadId, 'pass')}
        className="text-[11px] font-semibold text-[#5c5279] rounded-lg py-1.5 px-2.5 border border-[#ece5fb] bg-white disabled:opacity-50">
        Not a fit
      </button>
    </div>
  )

  // Needs-approval card buttons — release the draft (real send) or reject it. Acts on the
  // queue id; no "$4" here (that charge already fired at enrollment).
  const queueBtns = (queueId: string) => (
    <div className="flex gap-1.5 mt-2">
      <button disabled={acting === queueId} onClick={() => actQueue(queueId, 'approve')}
        className="flex-1 text-[11px] font-bold text-white rounded-lg py-1.5 bg-gradient-to-br from-[#7C3AED] to-[#EC4899] disabled:opacity-50">
        {acting === queueId ? '…' : 'Approve & send'}
      </button>
      <button disabled={acting === queueId} onClick={() => actQueue(queueId, 'reject')}
        className="text-[11px] font-semibold text-[#5c5279] rounded-lg py-1.5 px-2.5 border border-[#ece5fb] bg-white disabled:opacity-50">
        Reject
      </button>
    </div>
  )

  return (
    <div className="flex h-full min-h-0">
      {/* ── CLIENTS PANEL ──────────────────────────────────────────────────── */}
      <div className="w-[336px] shrink-0 border-r border-[#eee7f7] bg-white flex flex-col overflow-hidden">
        <div className="px-[18px] pt-[15px] pb-2.5">
          <b className="text-[14.5px]">Clients</b>
          <span className="block text-[11.5px] text-[#9b8ec4]">Pick a client to work their campaign</span>
        </div>
        <div className="flex-1 overflow-y-auto px-3 pb-3">
          {clientsError && <p className="text-xs text-red-500 px-2 py-3">{clientsError}</p>}
          {!clients && !clientsError && <p className="text-xs text-[#9b8ec4] px-2 py-3">Loading clients…</p>}
          {clients?.length === 0 && <p className="text-xs text-[#9b8ec4] px-2 py-3">No clients yet.</p>}
          {clients?.map(c => {
            const active = c.id === selected
            return (
              <button key={c.id} onClick={() => setSelected(c.id)}
                className={`w-full text-left flex items-center gap-2.5 px-2.5 py-2.5 rounded-xl mb-1 transition-colors ${
                  active ? 'bg-[#f3ecff] border border-[#e4d4fb]' : 'hover:bg-[#faf8ff] border border-transparent'
                }`}>
                <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-[11px] font-bold shrink-0 ${active ? 'bg-[#7C3AED] text-white' : 'bg-[#efeafc] text-[#7C3AED]'}`}>
                  {initials(c.company_name)}
                </span>
                <span className="min-w-0 flex-1">
                  <b className="text-[13px] block truncate">{c.company_name || 'Unnamed'}</b>
                  <span className="text-[11px] text-[#9b8ec4] block truncate">{[c.industry, c.country].filter(Boolean).join(' · ') || '—'}</span>
                </span>
                {c.house_or_demo && (
                  <span className="text-[9px] font-bold uppercase tracking-wide text-[#b3a9cc] bg-[#efeafc] rounded px-1.5 py-0.5 shrink-0">
                    {c.is_demo ? 'demo' : 'house'}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── PIPELINE ───────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col bg-[#fbfaff] overflow-hidden">
        {!selected && (
          <div className="flex-1 flex items-center justify-center text-[#9b8ec4] text-sm">
            Select a client on the left to load their campaign pipeline.
          </div>
        )}
        {selected && (
          <>
            <div className="px-[22px] pt-4 pb-1">
              <b className="text-[15px]">{selectedClient?.company_name || board?.client.company_name || 'Client'} — campaign pipeline</b>
              <span className="block text-[11.5px] text-[#9b8ec4]">Every stage FIGSY moves a lead through · human gate before send</span>
            </div>
            {boardError && <div className="mx-[22px] mt-2 text-xs text-red-500">{boardError}</div>}
            {boardLoading && !board && <div className="px-[22px] py-6 text-sm text-[#9b8ec4]">Loading board…</div>}
            {cols && (
              <div className="flex-1 overflow-x-auto flex gap-3 px-[22px] py-3.5">
                {/* Sourced */}
                <Col title="Sourced" count={cols.sourced.count}>
                  {cols.sourced.cards.length === 0 ? <EmptyCol /> : cols.sourced.cards.map(c => (
                    <div key={c.id} className="bg-white border border-[#eee7f7] rounded-xl p-2.5 mb-2.5">
                      <b className="text-[12.5px] block">{fullName(c.first_name, c.last_name)}</b>
                      <span className="text-[11px] text-[#9b8ec4]">{[c.job_title, c.company].filter(Boolean).join(' · ') || '—'}</span>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[11px] font-bold text-[#7C3AED] bg-[#f3ecff] rounded px-1.5">{c.score ?? '—'}</span>
                        <span className="text-[10px] text-[#b3a9cc]">score</span>
                      </div>
                      {approveBtns(c.id)}
                    </div>
                  ))}
                </Col>
                {/* Needs approval */}
                <Col title="Needs approval" count={cols.needs_approval.count}>
                  {cols.needs_approval.cards.length === 0 ? <EmptyCol /> : cols.needs_approval.cards.map(c => {
                    const nm = fullName(c.leads?.first_name ?? null, c.leads?.last_name ?? null)
                    const open = openDrafts.has(c.id)
                    return (
                      <div key={c.id} className="bg-[#fffdf7] border-[1.5px] border-[#f0c674] rounded-xl p-2.5 mb-2.5">
                        <b className="text-[12.5px] block">{nm}</b>
                        <span className="text-[11px] text-[#9b8ec4] block truncate">{c.to_email || '—'}{c.sequence_step ? ` · step ${c.sequence_step}` : ''}</span>
                        <div className="text-[11.5px] font-semibold text-[#1f1235] mt-1 leading-snug line-clamp-2">{c.subject || '(no subject)'}</div>
                        <button onClick={() => toggleDraft(c.id)} className="text-[10.5px] font-bold text-[#7C3AED] mt-1 hover:underline">
                          {open ? 'Hide draft ▲' : 'Preview draft ▼'}
                        </button>
                        {open && (
                          <div className="mt-1.5 text-[11px] text-[#4c4368] bg-white border border-[#f0e3c4] rounded-lg p-2 max-h-40 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                            {c.body || '(empty body)'}
                          </div>
                        )}
                        {queueBtns(c.id)}
                      </div>
                    )
                  })}
                </Col>
                {/* Sending */}
                <Col title="Sending" count={cols.sending.count}>
                  {cols.sending.cards.length === 0 ? <EmptyCol /> : cols.sending.cards.map(c => (
                    <div key={c.id} className="bg-white border border-[#eee7f7] rounded-xl p-2.5 mb-2.5">
                      <b className="text-[12.5px] block">Step {(c.current_step ?? 0)}{c.total_steps ? ` of ${c.total_steps}` : ''}</b>
                      <span className="text-[11px] text-[#9b8ec4]">{c.status ?? 'enrolled'}</span>
                    </div>
                  ))}
                </Col>
                {/* Replied */}
                <Col title="Replied" count={cols.replied.count}>
                  {cols.replied.cards.length === 0 ? <EmptyCol /> : cols.replied.cards.map(c => (
                    <div key={c.id} className="bg-white border border-[#eee7f7] rounded-xl p-2.5 mb-2.5">
                      <b className="text-[12.5px] block truncate">{c.from_name || c.from_email || 'Reply'}</b>
                      <span className="text-[11px] text-[#9b8ec4]">{c.classification || 'reply'}</span>
                    </div>
                  ))}
                </Col>
                {/* Qualified $4 */}
                <Col title="Qualified · $4" count={cols.qualified.count}>
                  {cols.qualified.cards.length === 0 ? <EmptyCol /> : cols.qualified.cards.map(c => (
                    <div key={c.id} className="bg-white border border-[#eee7f7] rounded-xl p-2.5 mb-2.5">
                      <b className="text-[12.5px] block">{fullName(c.first_name, c.last_name)}</b>
                      <span className="text-[11px] text-[#9b8ec4] truncate block">{c.company || c.email || '—'}</span>
                    </div>
                  ))}
                </Col>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
