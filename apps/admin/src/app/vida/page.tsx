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

type SourcedCard = { id: string; first_name: string | null; last_name: string | null; company: string | null; job_title: string | null; score: number | null; status: string | null; surfaced_for_approval_at: string | null; approval_expires_at: string | null }
type LeadJoin = { first_name?: string | null; last_name?: string | null; company?: string | null } | null
type NeedsApprovalCard = {
  id: string; lead_id: string; status: string | null; created_at: string | null
  to_email: string | null; subject: string | null; body: string | null; sequence_step: number | null
  leads?: LeadJoin
}
type SendingCard = { id: string; lead_id: string; current_step: number | null; total_steps: number | null; status: string | null; next_send_at: string | null }
type RepliedCard = { id: string; lead_id: string; from_name: string | null; from_email: string | null; classification: string | null; received_at: string | null; qualified_at: string | null }
type QualifiedCard = { id: string; first_name: string | null; last_name: string | null; company: string | null; email: string | null; score: number | null }
type BookedCard = { id: string; lead_id: string; start_time: string | null; first_name: string | null; last_name: string | null; company: string | null }

type Board = {
  client: { id: string; company_name: string | null }
  columns: {
    sourced: { count: number; cards: SourcedCard[] }
    needs_approval: { count: number; cards: NeedsApprovalCard[] }
    sending: { count: number; cards: SendingCard[] }
    replied: { count: number; cards: RepliedCard[] }
    qualified: { count: number; cards: QualifiedCard[] }
    booked: { count: number; cards: BookedCard[] }
  }
}

type Status = { outreach_enabled: boolean; daily_cap: number | null }
type CmdMsg = { role: 'operator' | 'vida'; text: string; link?: string | null }
type Blockers = { send_gate: number; money_gate: number; unsent_sourced: number; replies_to_triage: number }
type SourcePreview = { count: number; pool_free: number; pdl_needed: number; pdl_cost_est: number; allowance_left: number; leads_per_run: number; capped: boolean; is_demo: boolean; icp_name?: string | null; no_active_icp?: boolean }

// #501 — the 8-step operating flow, shown as a status ribbon across the top of the console.
const FLOW = ['Sign up', 'Build plan', 'Approve send', 'Qualify', 'Client approves', 'Follow-up', 'Book', 'Learn']

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

// column shell. #493c — an optional GATE chip names the human/money gate this column sits
// behind (Send gate = operator releases the draft · Money gate = client's own $1+$3 👍 ·
// Qualify = operator judgement · $3 captured = booking confirmed). Purely informational.
function Col({ title, count, gate, children }: { title: string; count: number; gate?: { label: string; tone: 'send' | 'money' | 'qualify' | 'done' }; children: React.ReactNode }) {
  const gateStyle: Record<string, string> = {
    send:    'text-[#b45309] bg-[#fef3c7] border-[#fde68a]',
    money:   'text-[#7C3AED] bg-[#f3ecff] border-[#e4d4fb]',
    qualify: 'text-[#0369a1] bg-[#e0f2fe] border-[#bae6fd]',
    done:    'text-emerald-700 bg-emerald-50 border-emerald-200',
  }
  return (
    <div className="w-[210px] shrink-0">
      <div className="flex justify-between items-center text-[11px] tracking-[0.05em] uppercase text-[#9b8ec4] font-bold mb-1 px-0.5">
        <span>{title}</span>
        <em className="not-italic text-[#1f1235] bg-[#efeafc] rounded-[10px] px-1.5">{count}</em>
      </div>
      {gate && <div className={`inline-block text-[9.5px] font-bold rounded-full px-2 py-0.5 mb-2 border ${gateStyle[gate.tone]}`}>{gate.label}</div>}
      {!gate && <div className="mb-2" />}
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

  const [status, setStatus] = useState<Status | null>(null)
  const [blockers, setBlockers] = useState<Blockers | null>(null)
  const [cmd, setCmd] = useState('')
  const [cmdLog, setCmdLog] = useState<CmdMsg[]>([])
  const [cmdBusy, setCmdBusy] = useState(false)

  // #498b — one-click sourcing: a pool-aware confirm before we spend a cent of PDL budget.
  const [srcPreview, setSrcPreview] = useState<SourcePreview | null>(null)
  const [srcBusy, setSrcBusy] = useState(false)
  const [srcResult, setSrcResult] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/proxy/operator/status').then(r => r.json()).then(j => { if (j?.success) setStatus(j.data) }).catch(() => {})
  }, [])

  // #498b — detect a sourcing intent ("source 50 leads", "find 30 prospects", "source leads")
  // and route it to the pool-aware CONFIRM flow instead of the prose command handoff. Returns
  // the requested count (default 20) or null if the text isn't a sourcing command.
  function parseSourceIntent(t: string): number | null {
    const lc = t.toLowerCase()
    if (!/\b(source|find|pull|prospect)\b/.test(lc)) return null
    const m = lc.match(/(\d{1,3})/)
    return m ? Math.max(1, Math.min(200, parseInt(m[1], 10))) : 20
  }

  async function previewSource(count: number) {
    if (!selected) return
    setSrcBusy(true); setSrcResult(null); setSrcPreview(null)
    try {
      const res = await fetch(`/api/proxy/operator/source-preview?client_id=${encodeURIComponent(selected)}&count=${count}`)
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json?.success) throw new Error(json?.error || `Preview failed (${res.status})`)
      setSrcPreview(json.data)
    } catch (e) {
      setSrcResult(e instanceof Error ? e.message : 'Preview failed')
    } finally { setSrcBusy(false) }
  }

  async function confirmSource() {
    if (!selected || !srcPreview) return
    setSrcBusy(true)
    try {
      const res = await fetch('/api/proxy/operator/source', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: selected, count: srcPreview.count, confirm: true }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json?.success) throw new Error(json?.error || `Sourcing failed (${res.status})`)
      setSrcResult(`Sourced ${json.inserted} lead${json.inserted === 1 ? '' : 's'} for ${selectedClient?.company_name || 'client'}${json.note ? ` · ${json.note}` : ''}. New leads are in the Sourced column.`)
      setSrcPreview(null)
      await loadBoard(selected)
    } catch (e) {
      setSrcResult(e instanceof Error ? e.message : 'Sourcing failed')
    } finally { setSrcBusy(false) }
  }

  async function runCommand(text: string) {
    const t = text.trim()
    if (!t || !selected || cmdBusy) return
    // Sourcing intent → pool-aware confirm (spends OUR PDL budget), not the prose handoff.
    const srcCount = parseSourceIntent(t)
    if (srcCount != null) { setCmd(''); previewSource(srcCount); return }
    setCmd(''); setCmdBusy(true)
    setCmdLog(l => [...l, { role: 'operator', text: t }])
    try {
      const res = await fetch('/api/proxy/operator/command', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: selected, text: t }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json?.success) throw new Error(json?.error || `Command failed (${res.status})`)
      setCmdLog(l => [...l, { role: 'vida', text: json.reply, link: json.link }])
    } catch (e) {
      setCmdLog(l => [...l, { role: 'vida', text: e instanceof Error ? e.message : 'Command failed' }])
    } finally { setCmdBusy(false) }
  }

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
    // #505 — live blockers strip. Best-effort: a blockers failure never breaks the board.
    fetch(`/api/proxy/operator/blockers?client_id=${encodeURIComponent(clientId)}`)
      .then(r => r.json()).then(j => setBlockers(j?.success ? j.data : null)).catch(() => setBlockers(null))
  }, [])

  useEffect(() => {
    if (!selected) return
    const url = new URL(window.location.href)
    url.searchParams.set('client', selected)
    window.history.replaceState(null, '', url.toString())
    loadBoard(selected)
  }, [selected, loadBoard])

  // Sourced column — the operator NEVER spends (#493, invariant #1). The only actions are
  // SURFACE the masked lead to the client for their own 👍 in Milla ("send"), or PASS it.
  async function act(leadId: string, kind: 'surface' | 'pass') {
    if (!selected) return
    setActing(leadId)
    try {
      const res = await fetch(`/api/proxy/operator/leads/${encodeURIComponent(leadId)}/${kind}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ client_id: selected }),
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

  // #494 Qualify gate — mark a reply a qualified conversation (operator judgement, NO SPEND).
  // Idempotent toggle; refreshes the board so the ✓ chip + blockers count update.
  async function qualifyReply(replyId: string, qualified: boolean) {
    if (!selected) return
    setActing(replyId)
    try {
      const res = await fetch(`/api/proxy/operator/replies/${encodeURIComponent(replyId)}/qualify`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ client_id: selected, qualified }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json?.success) throw new Error(json?.error || `Action failed (${res.status})`)
      await loadBoard(selected)
    } catch (e) {
      setBoardError(e instanceof Error ? e.message : 'Action failed')
    } finally { setActing(null) }
  }

  const selectedClient = clients?.find(c => c.id === selected) ?? null
  const cols = board?.columns

  // Sourced-card actions. Operators never spend — they SEND the masked lead to the client,
  // who approves ($1+$3) in Milla. Once surfaced, the card shows "awaiting client 👍".
  const sourcedBtns = (leadId: string, surfaced: boolean) => surfaced ? (
    <div className="mt-2 text-[11px] font-bold text-[#7C3AED] bg-[#f3ecff] border border-[#e4d4fb] rounded-lg py-1.5 px-2.5 text-center">
      With client · awaiting 👍
    </div>
  ) : (
    <div className="flex gap-1.5 mt-2">
      <button disabled={acting === leadId} onClick={() => act(leadId, 'surface')}
        className="flex-1 text-[11px] font-bold text-white rounded-lg py-1.5 bg-gradient-to-br from-[#7C3AED] to-[#EC4899] disabled:opacity-50">
        {acting === leadId ? '…' : '→ Send to client'}
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
            {/* #501 FLOW ribbon */}
            <div className="shrink-0 flex items-center gap-1 overflow-x-auto px-[22px] py-2 border-b border-[#eee7f7] bg-white">
              {FLOW.map((step, i) => (
                <span key={step} className="flex items-center gap-1 shrink-0">
                  <span className="flex items-center gap-1.5 text-[11px] font-semibold text-[#7c6f9b]">
                    <span className="w-[18px] h-[18px] rounded-full bg-[#efeafc] text-[#7C3AED] text-[10px] font-bold flex items-center justify-center">{i + 1}</span>
                    {step}
                  </span>
                  {i < FLOW.length - 1 && <span className="text-[#d9d0ee] px-0.5">›</span>}
                </span>
              ))}
            </div>

            {/* #500 KPI cards */}
            <div className="shrink-0 grid grid-cols-2 lg:grid-cols-4 gap-3 px-[22px] pt-3">
              {(() => {
                const kpi = (label: string, value: string, sub: string, tone = '#1f1235') => (
                  <div className="bg-white border border-[#eee7f7] rounded-xl px-3.5 py-2.5">
                    <div className="text-[9.5px] font-bold uppercase tracking-wide text-[#b3a9cc]">{label}</div>
                    <div className="text-[18px] font-extrabold leading-tight mt-0.5" style={{ color: tone }}>{value}</div>
                    <div className="text-[10.5px] text-[#9b8ec4] mt-0.5">{sub}</div>
                  </div>
                )
                const cap = status?.daily_cap
                return <>
                  {kpi('Active client', selectedClient?.company_name || '—', `${selectedClient?.figsy_credits_remaining ?? 0} work credits`)}
                  {kpi('Daily send cap', cap == null ? 'No cap set' : `${status?.daily_cap}`, status?.outreach_enabled ? 'outreach ON' : 'outreach OFF', status?.outreach_enabled ? '#059669' : '#b45309')}
                  {kpi('Needs approval', String(cols?.needs_approval.count ?? 0), 'your Send gate', '#b45309')}
                  {kpi('Booked · $3 captured', String(cols?.booked.count ?? 0), 'confirmed meetings', '#059669')}
                </>
              })()}
            </div>

            {/* #498 Vida command bar */}
            <div className="shrink-0 mx-[22px] mt-3 bg-white border border-[#eee7f7] rounded-xl overflow-hidden">
              <div className="flex items-center gap-2 px-3.5 py-2 border-b border-[#f2ecfb]">
                <span className="w-6 h-6 rounded-md bg-gradient-to-br from-[#7C3AED] to-[#EC4899] text-white text-[11px] font-bold flex items-center justify-center">V</span>
                <b className="text-[13px]">Vida</b>
                <span className="text-[11px] text-[#9b8ec4]">conversational · context: {selectedClient?.company_name || 'client'}</span>
              </div>
              {cmdLog.length > 0 && (
                <div className="max-h-40 overflow-y-auto px-3.5 py-2 space-y-1.5">
                  {cmdLog.map((m, i) => (
                    <div key={i} className={m.role === 'operator' ? 'text-right' : ''}>
                      <span className={`inline-block text-[12px] rounded-xl px-3 py-1.5 ${m.role === 'operator' ? 'bg-[#1f1235] text-white' : 'bg-[#f3ecff] text-[#1f1235]'}`}>{m.text}</span>
                      {m.link && <a href={m.link} className="block text-[11px] font-bold text-[#7C3AED] mt-0.5 hover:underline">Open →</a>}
                    </div>
                  ))}
                </div>
              )}
              <div className="px-3.5 py-2.5">
                <form onSubmit={e => { e.preventDefault(); runCommand(cmd) }} className="flex gap-2">
                  <input value={cmd} onChange={e => setCmd(e.target.value)} placeholder={`Command Vida in ${selectedClient?.company_name || 'client'} context…`}
                    className="flex-1 text-[12.5px] rounded-lg border border-[#e4dcf7] bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/30" />
                  <button type="submit" disabled={cmdBusy || !cmd.trim()} className="text-[12px] font-bold text-white rounded-lg px-4 bg-gradient-to-br from-[#7C3AED] to-[#EC4899] disabled:opacity-50">{cmdBusy ? '…' : 'Run'}</button>
                </form>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {["What's blocking?", 'Status', 'Source 20 leads', 'Redefine the ICP', 'Build a campaign', 'Update the sequence'].map(chip => (
                    <button key={chip} onClick={() => runCommand(chip)} disabled={cmdBusy || srcBusy}
                      className="text-[11px] font-semibold text-[#7C3AED] bg-[#f3ecff] border border-[#e4d4fb] rounded-full px-2.5 py-1 hover:bg-[#ebe0fc] disabled:opacity-50">{chip}</button>
                  ))}
                </div>

                {/* #498b — pool-aware sourcing CONFIRM. Shows the real cost (pool $0 vs PDL) before spending. */}
                {srcBusy && !srcPreview && <div className="mt-2.5 text-[12px] text-[#9b8ec4]">Checking the pool…</div>}
                {srcPreview && (
                  <div className="mt-2.5 bg-[#fbf8ff] border border-[#e4d4fb] rounded-xl p-3">
                    {srcPreview.no_active_icp ? (
                      <p className="text-[12px] text-[#b45309] font-semibold">No active ICP for this client — set their targeting first (Redefine the ICP), then source.</p>
                    ) : (
                      <>
                        <div className="text-[12.5px] text-[#1f1235]">
                          <b>Source {srcPreview.count} for {selectedClient?.company_name || 'client'}</b>
                          {srcPreview.capped && <span className="text-[10.5px] text-[#b45309] font-semibold"> · capped at {srcPreview.leads_per_run}/run</span>}
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-[12px]">
                          <span className="text-emerald-700 font-semibold">{srcPreview.pool_free} from our pool · $0</span>
                          <span className="text-[#7C3AED] font-semibold">{srcPreview.pdl_needed} from PDL · ~${srcPreview.pdl_cost_est.toFixed(2)}</span>
                          <span className="text-[#9b8ec4]">allowance left: {srcPreview.allowance_left}</span>
                          {srcPreview.is_demo && <span className="text-[#9b8ec4]">demo · pool-only, $0</span>}
                        </div>
                        <p className="text-[10.5px] text-[#b3a9cc] mt-1">Estimate — pool is an upper bound, so PDL cost is a ceiling. Spends OUR budget, never client credits.</p>
                        <div className="flex gap-2 mt-2">
                          <button disabled={srcBusy} onClick={confirmSource}
                            className="text-[12px] font-bold text-white rounded-lg py-1.5 px-4 bg-gradient-to-br from-[#7C3AED] to-[#EC4899] disabled:opacity-50">
                            {srcBusy ? 'Sourcing…' : `Confirm · source ${srcPreview.count}`}
                          </button>
                          <button disabled={srcBusy} onClick={() => setSrcPreview(null)}
                            className="text-[12px] font-semibold text-[#5c5279] rounded-lg py-1.5 px-4 border border-[#ece5fb] bg-white disabled:opacity-50">Cancel</button>
                        </div>
                      </>
                    )}
                  </div>
                )}
                {srcResult && <div className="mt-2 text-[12px] font-semibold text-[#1f1235] bg-[#f3ecff] border border-[#e4d4fb] rounded-lg px-3 py-2">{srcResult}</div>}
              </div>
            </div>

            {/* #505 LIVE BLOCKERS strip — real gate counts for this client, no LLM */}
            {blockers && (
              <div className="shrink-0 mx-[22px] mt-2.5 flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wide text-[#b3a9cc]">Blockers</span>
                {([
                  ['Send gate', blockers.send_gate, 'drafts awaiting your approval', '#b45309', '#fef3c7'],
                  ['Money gate', blockers.money_gate, 'sent to client, awaiting their 👍', '#7C3AED', '#f3ecff'],
                  ['Unsent sourced', blockers.unsent_sourced, "sourced, not yet sent", '#5c5279', '#efeafc'],
                  ['To triage', blockers.replies_to_triage, 'replies not yet qualified', '#0369a1', '#e0f2fe'],
                ] as [string, number, string, string, string][]).map(([label, n, title, fg, bg]) => (
                  <span key={label} title={title}
                    className="inline-flex items-center gap-1.5 text-[11px] font-semibold rounded-full px-2.5 py-1 border"
                    style={{ color: n > 0 ? fg : '#b3a9cc', background: n > 0 ? bg : '#f7f4fd', borderColor: n > 0 ? bg : '#eee7f7' }}>
                    <b className="text-[12px]">{n}</b> {label}
                  </span>
                ))}
                {blockers.send_gate + blockers.money_gate + blockers.unsent_sourced + blockers.replies_to_triage === 0 && (
                  <span className="text-[11px] font-semibold text-emerald-600">All clear · nothing waiting on you</span>
                )}
              </div>
            )}

            <div className="px-[22px] pt-4 pb-1">
              <b className="text-[15px]">{selectedClient?.company_name || board?.client.company_name || 'Client'} — campaign pipeline</b>
              <span className="block text-[11.5px] text-[#9b8ec4]">Every stage FIGSY moves a lead through · human gate before send</span>
            </div>
            {boardError && <div className="mx-[22px] mt-2 text-xs text-red-500">{boardError}</div>}
            {boardLoading && !board && <div className="px-[22px] py-6 text-sm text-[#9b8ec4]">Loading board…</div>}
            {cols && (
              <div className="flex-1 overflow-x-auto flex gap-3 px-[22px] py-3.5">
                {/* Sourced */}
                <Col title="Sourced" count={cols.sourced.count} gate={{ label: '→ your send', tone: 'send' }}>
                  {cols.sourced.cards.length === 0 ? <EmptyCol /> : cols.sourced.cards.map(c => (
                    <div key={c.id} className="bg-white border border-[#eee7f7] rounded-xl p-2.5 mb-2.5">
                      <b className="text-[12.5px] block">{fullName(c.first_name, c.last_name)}</b>
                      <span className="text-[11px] text-[#9b8ec4]">{[c.job_title, c.company].filter(Boolean).join(' · ') || '—'}</span>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[11px] font-bold text-[#7C3AED] bg-[#f3ecff] rounded px-1.5">{c.score ?? '—'}</span>
                        <span className="text-[10px] text-[#b3a9cc]">score</span>
                      </div>
                      {sourcedBtns(c.id, !!c.surfaced_for_approval_at && !!c.approval_expires_at && new Date(c.approval_expires_at).getTime() > Date.now())}
                    </div>
                  ))}
                </Col>
                {/* Needs approval */}
                <Col title="Needs approval" count={cols.needs_approval.count} gate={{ label: '🔒 Send gate', tone: 'send' }}>
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
                {/* Replied — #494 operator Qualify gate (non-spend) */}
                <Col title="Replied" count={cols.replied.count} gate={{ label: '✓ Qualify gate', tone: 'qualify' }}>
                  {cols.replied.cards.length === 0 ? <EmptyCol /> : cols.replied.cards.map(c => {
                    const isQualified = !!c.qualified_at
                    return (
                      <div key={c.id} className={`bg-white border rounded-xl p-2.5 mb-2.5 ${isQualified ? 'border-emerald-200' : 'border-[#eee7f7]'}`}>
                        <b className="text-[12.5px] block truncate">{c.from_name || c.from_email || 'Reply'}</b>
                        <span className="text-[11px] text-[#9b8ec4]">{c.classification || 'reply'}</span>
                        {isQualified ? (
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-[10.5px] font-bold text-emerald-600">✓ Qualified</span>
                            <button disabled={acting === c.id} onClick={() => qualifyReply(c.id, false)}
                              className="text-[10px] font-semibold text-[#9b8ec4] hover:text-[#5c5279] disabled:opacity-50">Undo</button>
                          </div>
                        ) : (
                          <button disabled={acting === c.id} onClick={() => qualifyReply(c.id, true)}
                            className="w-full mt-2 text-[11px] font-bold text-[#059669] rounded-lg py-1.5 border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 disabled:opacity-50">
                            {acting === c.id ? '…' : '✓ Mark qualified'}
                          </button>
                        )}
                      </div>
                    )
                  })}
                </Col>
                {/* Qualified $4 */}
                <Col title="Qualified · $3 held" count={cols.qualified.count} gate={{ label: '💳 Money gate', tone: 'money' }}>
                  {cols.qualified.cards.length === 0 ? <EmptyCol /> : cols.qualified.cards.map(c => (
                    <div key={c.id} className="bg-white border border-[#eee7f7] rounded-xl p-2.5 mb-2.5">
                      <b className="text-[12.5px] block">{fullName(c.first_name, c.last_name)}</b>
                      <span className="text-[11px] text-[#9b8ec4] truncate block">{c.company || c.email || '—'}</span>
                    </div>
                  ))}
                </Col>
                {/* Booked · $3 captured */}
                <Col title="Booked · $3 captured" count={cols.booked.count} gate={{ label: '$3 captured', tone: 'done' }}>
                  {cols.booked.cards.length === 0 ? <EmptyCol /> : cols.booked.cards.map(c => (
                    <div key={c.id} className="bg-white border border-emerald-200 rounded-xl p-2.5 mb-2.5">
                      <b className="text-[12.5px] block">{fullName(c.first_name, c.last_name)}</b>
                      <span className="text-[11px] text-[#9b8ec4] truncate block">{c.company || '—'}</span>
                      <span className="text-[10.5px] text-emerald-600 font-semibold block mt-0.5">
                        {c.start_time ? new Date(c.start_time).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : 'booked'}
                      </span>
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
