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
  wallet_balance_usd: number | null
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

// Per-client cockpit (GET /operator/cockpit) — the ICP/campaign/sequence/inbox surfaces.
type CockpitTab = 'Inbox' | 'Approvals' | 'People' | 'Campaign' | 'ICP' | 'Sequence' | 'Bookings'
type Cockpit = {
  client:    { id: string; company_name: string | null }
  onboarding: { percent: number; missing: string[]; checks: { key: string; label: string; ok: boolean }[] }
  icps:      { id: string; name: string | null; created_at: string | null; last_run_at: string | null }[]
  campaigns: { id: string; name: string; status: string; leads_enrolled: number; emails_sent: number; replies_total: number; replies_interested: number; created_at: string | null }[]
  sequences: { id: string; name: string; steps: unknown; created_at: string | null; updated_at: string | null }[]
  replies:   { id: string; lead_id: string | null; from_name: string | null; from_email: string | null; classification: string | null; qualified_at: string | null; meeting_booked_at: string | null; received_at: string | null }[]
}
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
  // Per-client cockpit (ICP · Campaign · Sequence · Inbox) — one admin-key read.
  const [tab, setTab] = useState<CockpitTab>('Inbox')
  const [cockpit, setCockpit] = useState<Cockpit | null>(null)
  const [cockpitLoading, setCockpitLoading] = useState(false)
  const [cockpitError, setCockpitError] = useState<string | null>(null)
  const [cockpitBusy, setCockpitBusy] = useState(false)

  const loadCockpit = useCallback(async (clientId: string) => {
    setCockpitLoading(true); setCockpitError(null)
    try {
      const j = await fetch(`/api/proxy/operator/cockpit?client_id=${encodeURIComponent(clientId)}`).then(r => r.json())
      if (!j?.success) throw new Error(j?.error || 'Failed to load cockpit')
      setCockpit(j.data)
    } catch (e) { setCockpitError(e instanceof Error ? e.message : 'Failed to load cockpit') }
    setCockpitLoading(false)
  }, [])

  // Load the cockpit whenever a client is selected (and reset to Pipeline on switch).
  useEffect(() => {
    if (!selected) { setCockpit(null); return }
    setTab('Inbox'); setCockpit(null); setOpenReply(null); setThread(null); setDraft(''); loadCockpit(selected)
  }, [selected, loadCockpit])

  // Inbox thread — open a prospect reply, draft an answer in the client's voice, send it.
  const [openReply, setOpenReply] = useState<string | null>(null)
  const [thread, setThread] = useState<{ reply: Record<string, unknown>; lead: Record<string, unknown> | null } | null>(null)
  const [draft, setDraft] = useState('')
  const [replyBusy, setReplyBusy] = useState<string | null>(null)
  const [replyMsg, setReplyMsg] = useState<string | null>(null)

  async function openThread(id: string) {
    if (!selected) return
    setOpenReply(id); setThread(null); setDraft(''); setReplyMsg(null)
    try {
      const j = await fetch(`/api/proxy/operator/replies/${id}?client_id=${encodeURIComponent(selected)}`).then(r => r.json())
      if (j?.success) setThread(j.data)
      else setReplyMsg(j?.error || 'Could not load the thread')
    } catch { setReplyMsg('Could not load the thread') }
  }

  async function draftReply() {
    if (!selected || !openReply) return
    setReplyBusy('draft'); setReplyMsg(null)
    try {
      const j = await fetch(`/api/proxy/operator/replies/${openReply}/draft`, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ client_id: selected }),
      }).then(r => r.json())
      if (j?.success) setDraft(j.data.draft); else setReplyMsg(j?.error || 'Could not draft')
    } catch { setReplyMsg('Could not draft') }
    setReplyBusy(null)
  }

  async function sendReply() {
    if (!selected || !openReply || !draft.trim()) return
    setReplyBusy('send'); setReplyMsg(null)
    try {
      const j = await fetch(`/api/proxy/operator/replies/${openReply}/send`, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ client_id: selected, body: draft }),
      }).then(r => r.json())
      if (j?.success) {
        setReplyMsg(j.data?.demo ? 'Demo client — send suppressed (nothing emailed).' : 'Sent.')
        setDraft(''); setOpenReply(null); setThread(null); loadCockpit(selected)
      } else setReplyMsg(j?.error || 'Could not send')
    } catch { setReplyMsg('Could not send') }
    setReplyBusy(null)
  }

  // V4d — ICP + SEQUENCE AUTHORING. Read-only views were not enough: the operator has to be
  // able to CHANGE the targeting and the messaging, which is our actual job in this model.
  const [icpEdit, setIcpEdit] = useState<Record<string, string> | null>(null)
  const [seqEdit, setSeqEdit] = useState<{ id?: string; name: string; steps: { subject: string; body: string; wait_days: number }[] } | null>(null)
  const [saveMsg, setSaveMsg] = useState<string | null>(null)

  const ICP_FIELDS: [string, string][] = [
    ['name', 'Name'], ['industries', 'Industries'], ['job_titles', 'Job titles'],
    ['seniority_levels', 'Seniority'], ['company_sizes', 'Company sizes'],
    ['geographies', 'Geographies'], ['tech_stack', 'Tech stack'], ['keywords', 'Keywords'],
  ]

  async function openIcpEditor(icpId?: string) {
    if (!selected) return
    setSaveMsg(null)
    if (!icpId) { setIcpEdit({ name: '', industries: '', job_titles: '', seniority_levels: '', company_sizes: '', geographies: '', tech_stack: '', keywords: '' }); return }
    try {
      const j = await fetch(`/api/proxy/operator/icp/${icpId}?client_id=${encodeURIComponent(selected)}`).then(r => r.json())
      if (!j?.success) throw new Error(j?.error)
      const d = j.data as Record<string, unknown>
      const join = (v: unknown) => Array.isArray(v) ? v.join(', ') : ''
      setIcpEdit({ icp_id: icpId, name: String(d.name ?? ''), industries: join(d.industries), job_titles: join(d.job_titles),
        seniority_levels: join(d.seniority_levels), company_sizes: join(d.company_sizes),
        geographies: join(d.geographies), tech_stack: join(d.tech_stack), keywords: join(d.keywords) })
    } catch { setSaveMsg('Could not open that ICP') }
  }

  async function saveIcp() {
    if (!selected || !icpEdit) return
    setCockpitBusy(true); setSaveMsg(null)
    try {
      const j = await fetch('/api/proxy/operator/icp', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...icpEdit, client_id: selected }),
      }).then(r => r.json())
      if (!j?.success) throw new Error(j?.error)
      setIcpEdit(null); setSaveMsg('ICP saved.'); await loadCockpit(selected)
    } catch (e) { setSaveMsg(e instanceof Error ? e.message : 'Could not save the ICP') }
    setCockpitBusy(false)
  }

  function openSeqEditor(sq?: { id: string; name: string; steps: unknown }) {
    setSaveMsg(null)
    if (!sq) { setSeqEdit({ name: '', steps: [{ subject: '', body: '', wait_days: 0 }] }); return }
    const steps = Array.isArray(sq.steps)
      ? (sq.steps as Record<string, unknown>[]).map(st => ({ subject: String(st.subject ?? ''), body: String(st.body ?? ''), wait_days: Number(st.wait_days ?? 3) || 0 }))
      : [{ subject: '', body: '', wait_days: 0 }]
    setSeqEdit({ id: sq.id, name: sq.name, steps })
  }

  async function saveSequence() {
    if (!selected || !seqEdit) return
    setCockpitBusy(true); setSaveMsg(null)
    try {
      const j = await fetch('/api/proxy/operator/sequence', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ client_id: selected, sequence_id: seqEdit.id, name: seqEdit.name, steps: seqEdit.steps }),
      }).then(r => r.json())
      if (!j?.success) throw new Error(j?.error)
      setSeqEdit(null); setSaveMsg('Sequence saved.'); await loadCockpit(selected)
    } catch (e) { setSaveMsg(e instanceof Error ? e.message : 'Could not save the sequence') }
    setCockpitBusy(false)
  }

  async function startCampaign() {
    if (!selected) return
    setCockpitBusy(true)
    try {
      await fetch('/api/proxy/operator/campaign/start', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ client_id: selected }),
      }).then(r => r.json())
      await loadCockpit(selected)
    } catch { /* surfaced by the reload */ }
    setCockpitBusy(false)
  }

  async function setCampaignStatus(campaignId: string, status: 'active' | 'paused') {
    if (!selected) return
    setCockpitBusy(true)
    try {
      await fetch(`/api/proxy/operator/campaign/${encodeURIComponent(campaignId)}/status`, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ client_id: selected, status }),
      }).then(r => r.json())
      await loadCockpit(selected)
    } catch { /* surfaced by the reload */ }
    setCockpitBusy(false)
  }

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
    // (audit fix) Require a sourcing verb AND a lead/prospect noun, so ordinary commands
    // ("find the CEO's email", "pull up the last reply") aren't hijacked into the pool-cost
    // confirm. Only phrasing like "source 20 leads" / "find leads" routes to sourcing.
    if (!/\b(source|find|pull|get|prospect)\b/.test(lc) || !/\b(lead|leads|prospect|prospects)\b/.test(lc)) return null
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
  // who approves in Milla ($4 charged at the client's 👍, final). Once surfaced, the card shows "awaiting client 👍".
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
            Select a client on the left to work their campaign.
          </div>
        )}
        {selected && (<>
          {/* #501 FLOW ribbon */}
          <div className="shrink-0 flex items-center gap-1 overflow-x-auto px-[22px] py-2 border-b border-[#eee7f7] bg-white">
            {FLOW.map((step, i) => (
              <span key={step} className="flex items-center gap-1 shrink-0">
                <span className="flex items-center gap-1.5 text-[11px] font-semibold text-[#7c6f9b]">
                  <span className="w-[18px] h-[18px] rounded-full bg-[#efeafc] text-[#7C3AED] text-[10px] font-bold flex items-center justify-center">{i + 1}</span>
                  {step}
                </span>
                {i < FLOW.length - 1 && <span className="text-[#d9d0ee] px-0.5">&rsaquo;</span>}
              </span>
            ))}
          </div>

          {/* THE CONSOLE: Vida (conversation) | cockpit (this client's work surfaces) */}
          <div className="flex-1 flex min-h-0">

            {/* ── VIDA — the assistant, scoped to the selected client ── */}
            <section className="flex-1 min-w-0 flex flex-col border-r border-[#eee7f7]">
              <div className="shrink-0 flex items-center gap-2.5 px-[22px] py-2.5 border-b border-[#eee7f7] bg-white">
                <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#7C3AED] to-[#EC4899] text-white text-[11px] font-bold flex items-center justify-center">
                  {initials(selectedClient?.company_name ?? null)}
                </span>
                <div className="min-w-0">
                  <b className="text-[13.5px] block leading-tight truncate">{selectedClient?.company_name || 'Client'}</b>
                  <span className="text-[11px] text-[#9b8ec4]">{[selectedClient?.industry, selectedClient?.country].filter(Boolean).join(' · ') || 'client'}</span>
                </div>
                {/* V11 ONBOARDING GATE — how complete is this client, and what's missing. */}
                {cockpit && (
                  <span className={`ml-auto shrink-0 text-[11.5px] font-bold rounded-full px-2.5 py-1 ${cockpit.onboarding.percent === 100 ? 'text-emerald-700 bg-emerald-50' : 'text-[#b45309] bg-[#fffbeb]'}`}
                    title={cockpit.onboarding.missing.length ? `Missing: ${cockpit.onboarding.missing.join(', ')}` : 'Fully onboarded'}>
                    Onboarding {cockpit.onboarding.percent}%
                  </span>
                )}
                <span className={`shrink-0 text-[11.5px] font-bold text-[#7C3AED] bg-[#f3ecff] rounded-full px-2.5 py-1 ${cockpit ? '' : 'ml-auto'}`}>
                  ${(selectedClient?.wallet_balance_usd ?? 0).toLocaleString()} wallet
                </span>
              </div>

              <div className="shrink-0 px-[22px] py-1.5 text-[11px] text-[#9b8ec4] bg-[#fbfaff] border-b border-[#f2ecfb]">
                You&rsquo;re working <b className="text-[#7C3AED]">{selectedClient?.company_name || 'this client'}</b> — Vida and the cockpit are scoped to this client only.
              </div>
              {cockpit && cockpit.onboarding.missing.length > 0 && (
                <div className="shrink-0 flex items-center gap-2 flex-wrap px-[22px] py-2 bg-[#fffbeb] border-b border-[#fde68a]">
                  <span className="text-[11.5px] font-bold text-[#b45309]">Onboarding gaps:</span>
                  {cockpit.onboarding.missing.map(m => (
                    <span key={m} className="text-[11px] font-semibold text-[#b45309] bg-white border border-[#fcd34d] rounded-full px-2 py-0.5">{m}</span>
                  ))}
                  <button onClick={() => runCommand(`Ask ${selectedClient?.company_name || 'the client'} for the missing onboarding details: ${cockpit.onboarding.missing.join(', ')}`)}
                    disabled={cmdBusy}
                    className="ml-auto text-[11.5px] font-bold text-[#b45309] underline disabled:opacity-50">Ask them for these</button>
                </div>
              )}

              {/* Pipeline at a glance — every stage, click through to the tab that works it.
                  Replaces the old 6-column kanban, which cost a full column of width. */}
              <div className="shrink-0 flex items-center gap-1.5 flex-wrap px-[22px] py-2 border-b border-[#f2ecfb]">
                <span className="text-[9.5px] font-bold uppercase tracking-wide text-[#b3a9cc] mr-1">Pipeline</span>
                {([
                  ['Sourced', cols?.sourced.count ?? 0, 'People'],
                  ['Needs approval', cols?.needs_approval.count ?? 0, 'Approvals'],
                  ['Sending', cols?.sending.count ?? 0, null],
                  ['Replied', cols?.replied.count ?? 0, 'Inbox'],
                  ['Qualified', cols?.qualified.count ?? 0, null],
                  ['Booked', cols?.booked.count ?? 0, 'Bookings'],
                ] as [string, number, CockpitTab | null][]).map(([label, n, goTo]) => (
                  <button key={label} onClick={() => goTo && setTab(goTo)} disabled={!goTo}
                    className={`text-[11px] font-bold rounded-full border px-2.5 py-0.5 ${n > 0 ? 'text-[#1f1235] bg-[#f3ecff] border-[#e4d4fb]' : 'text-[#9b8ec4] bg-white border-[#ece5fb]'} ${goTo ? 'hover:border-[#7C3AED]' : 'cursor-default'}`}>
                    {n} {label}
                  </button>
                ))}
              </div>

              {/* live gate counts for THIS client */}
              <div className="shrink-0 flex items-center gap-1.5 flex-wrap px-[22px] py-2 border-b border-[#f2ecfb]">
                <span className="text-[9.5px] font-bold uppercase tracking-wide text-[#b3a9cc] mr-1">Blockers</span>
                {([['Send gate', blockers?.send_gate], ['Money gate', blockers?.money_gate], ['Unsent sourced', blockers?.unsent_sourced], ['To triage', blockers?.replies_to_triage]] as [string, number | undefined][]).map(([label, n]) => (
                  <span key={label} className={`text-[11px] font-bold rounded-full border px-2.5 py-0.5 ${n ? 'text-[#0e7c86] bg-[#e6f6f7] border-[#a8dde0]' : 'text-[#9b8ec4] bg-white border-[#ece5fb]'}`}>{n ?? 0} {label}</span>
                ))}
              </div>

              <div className="flex-1 overflow-y-auto px-[22px] py-3.5 space-y-2">
                {cmdLog.length === 0 && (
                  <div className="text-[12.5px] text-[#9b8ec4] leading-relaxed max-w-lg">
                    Ask Vida anything about <b className="text-[#5c5279]">{selectedClient?.company_name || 'this client'}</b> — or use a shortcut below.
                    Everything you do here is scoped to them.
                  </div>
                )}
                {cmdLog.map((m, i) => (
                  <div key={i} className={m.role === 'operator' ? 'text-right' : ''}>
                    <span className={`inline-block text-[12.5px] leading-relaxed rounded-xl px-3.5 py-2 max-w-[85%] text-left ${m.role === 'operator' ? 'bg-[#1f1235] text-white' : 'bg-white border border-[#eee7f7] text-[#1f1235]'}`}>{m.text}</span>
                    {m.link && <a href={m.link} className="block text-[11px] font-bold text-[#7C3AED] mt-0.5 hover:underline">Open &rarr;</a>}
                  </div>
                ))}

                {srcPreview && (
                  <div className="border border-[#e4dcf7] bg-white rounded-xl px-3.5 py-3 max-w-md">
                    <b className="text-[12.5px] block mb-1">Source {srcPreview.count} leads?</b>
                    <p className="text-[11.5px] text-[#5c5279] leading-relaxed">
                      {srcPreview.no_active_icp
                        ? 'This client has no active ICP — approve one first.'
                        : <>{srcPreview.pool_free} free from the pool · {srcPreview.pdl_needed} new from PDL (~${srcPreview.pdl_cost_est.toFixed(2)} of OUR budget){srcPreview.is_demo ? ' · demo client, pool only' : ''}</>}
                    </p>
                    {!srcPreview.no_active_icp && (
                      <div className="flex gap-2 mt-2.5">
                        <button onClick={confirmSource} disabled={srcBusy}
                          className="bg-[#7C3AED] hover:bg-[#6D28D9] text-white rounded-lg px-3 py-1.5 text-[12px] font-bold disabled:opacity-60">
                          {srcBusy ? 'Sourcing…' : 'Confirm & source'}
                        </button>
                        <button onClick={() => setSrcPreview(null)} className="border border-[#ece5fb] rounded-lg px-3 py-1.5 text-[12px] font-bold text-[#5c5279]">Cancel</button>
                      </div>
                    )}
                  </div>
                )}
                {srcResult && <div className="text-[12px] font-semibold text-emerald-700">{srcResult}</div>}
              </div>

              <div className="shrink-0 px-[22px] pb-3">
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {["What's blocking?", 'Status', 'Source 20 leads', 'Redefine the ICP', 'Build a campaign', 'Update the sequence'].map(c => (
                    <button key={c} onClick={() => runCommand(c)} disabled={cmdBusy}
                      className="text-[11.5px] font-semibold text-[#7C3AED] border border-[#e4dcf7] rounded-full px-3 py-1 hover:bg-[#f7f4fd] disabled:opacity-50">{c}</button>
                  ))}
                </div>
                <form onSubmit={e => { e.preventDefault(); if (cmd.trim()) runCommand(cmd.trim()) }} className="flex gap-2">
                  <input value={cmd} onChange={e => setCmd(e.target.value)} disabled={cmdBusy}
                    placeholder={`Command Vida in ${selectedClient?.company_name || 'client'} context…`}
                    className="flex-1 border border-[#ece5fb] rounded-xl px-3.5 py-2.5 text-[12.5px] bg-white outline-none focus:border-[#7C3AED] disabled:opacity-60" />
                  <button type="submit" disabled={cmdBusy || !cmd.trim()}
                    className="bg-[#7C3AED] hover:bg-[#6D28D9] text-white rounded-xl px-5 text-[12.5px] font-bold disabled:opacity-40">
                    {cmdBusy ? '…' : 'Run'}
                  </button>
                </form>
              </div>
            </section>

            {/* ── COCKPIT — this client's seven work surfaces ── */}
            <aside className="w-[480px] shrink-0 flex flex-col bg-white min-h-0">
              <div className="shrink-0 flex items-end gap-0.5 px-3 pt-2.5 border-b border-[#eee7f7] overflow-x-auto">
                {(['Inbox', 'Approvals', 'People', 'Campaign', 'ICP', 'Sequence', 'Bookings'] as CockpitTab[]).map(t => {
                  const on = tab === t
                  const n = t === 'Inbox' ? (cockpit?.replies.filter(r => !r.qualified_at && !r.meeting_booked_at).length ?? 0)
                    : t === 'Approvals' ? (cols?.needs_approval.count ?? 0)
                    : t === 'People' ? (cols?.sourced.count ?? 0)
                    : t === 'Bookings' ? (cols?.booked.count ?? 0) : 0
                  return (
                    <button key={t} onClick={() => setTab(t)}
                      className={`shrink-0 px-2.5 py-2 text-[12px] font-bold rounded-t-lg border-b-2 -mb-px transition-colors ${on ? 'border-[#7C3AED] text-[#1f1235] bg-[#faf8ff]' : 'border-transparent text-[#9b8ec4] hover:text-[#5c5279]'}`}>
                      {t}{n > 0 && <span className="ml-1 text-[9.5px] font-extrabold text-white bg-[#EC4899] rounded-full px-1.5">{n}</span>}
                    </button>
                  )
                })}
              </div>

              <div className="flex-1 overflow-y-auto p-3.5">
                {cockpitError && <p className="text-[12px] text-red-500 mb-2">{cockpitError}</p>}
                {cockpitLoading && !cockpit && <p className="text-[12.5px] text-[#9b8ec4]">Loading…</p>}

                {/* INBOX — a prospect asks; WE answer */}
                {tab === 'Inbox' && (cockpit ? (
                  openReply ? (
                    <div>
                      <button onClick={() => { setOpenReply(null); setThread(null); setDraft('') }} className="text-[11.5px] font-bold text-[#7C3AED] mb-2.5">&larr; All replies</button>
                      {!thread ? <p className="text-[12.5px] text-[#9b8ec4]">Loading thread…</p> : (<>
                        <div className="border border-[#eee7f7] rounded-xl p-3 mb-3">
                          <b className="text-[13px] block">{String(thread.reply.from_name || thread.reply.from_email || 'Prospect')}</b>
                          <span className="text-[11px] text-[#9b8ec4]">
                            {[thread.lead?.job_title, thread.lead?.company].filter(Boolean).join(' · ') || String(thread.reply.from_email ?? '')}
                          </span>
                          <p className="text-[12.5px] text-[#4c4368] leading-relaxed mt-2 whitespace-pre-wrap">
                            {String(thread.reply.body_text || thread.reply.body || '(no body captured)').slice(0, 1500)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 mb-2">
                          <b className="text-[12px]">Your reply</b>
                          <span className="text-[11px] text-[#9b8ec4]">— sent as {selectedClient?.company_name || 'the client'}</span>
                          <button onClick={draftReply} disabled={replyBusy !== null}
                            className="ml-auto text-[11.5px] font-bold text-[#7C3AED] border border-[#e4dcf7] rounded-lg px-2.5 py-1 hover:bg-[#f7f4fd] disabled:opacity-50">
                            {replyBusy === 'draft' ? 'Drafting…' : '✨ Draft for me'}
                          </button>
                        </div>
                        <textarea value={draft} onChange={e => setDraft(e.target.value)} rows={7}
                          placeholder="Write the reply, or let Vida draft it in the client's voice…"
                          className="w-full border border-[#ece5fb] rounded-xl px-3 py-2.5 text-[12.5px] leading-relaxed outline-none focus:border-[#7C3AED]" />
                        <div className="flex gap-2 mt-2">
                          <button onClick={sendReply} disabled={replyBusy !== null || !draft.trim()}
                            className="bg-[#7C3AED] hover:bg-[#6D28D9] text-white rounded-lg px-4 py-2 text-[12.5px] font-bold disabled:opacity-40">
                            {replyBusy === 'send' ? 'Sending…' : 'Send'}
                          </button>
                          <button onClick={() => qualifyReply(openReply, true)} disabled={acting !== null}
                            className="border border-emerald-200 bg-emerald-50 text-emerald-700 rounded-lg px-3 py-2 text-[12.5px] font-bold disabled:opacity-50">Mark qualified</button>
                          <a href={`/vida/record?lead_id=${encodeURIComponent(String(thread.reply.lead_id ?? ''))}`}
                            className="border border-[#ece5fb] rounded-lg px-3 py-2 text-[12.5px] font-bold text-[#5c5279]">Record</a>
                        </div>
                        {replyMsg && <p className="text-[11.5px] font-semibold text-[#0e7c86] mt-2">{replyMsg}</p>}
                      </>)}
                    </div>
                  ) : cockpit.replies.length === 0 ? (
                    <p className="text-[12.5px] text-[#9b8ec4] text-center py-8">No replies yet.</p>
                  ) : cockpit.replies.map(r => (
                    <button key={r.id} onClick={() => openThread(r.id)}
                      className="w-full text-left flex items-center gap-2.5 border border-[#eee7f7] rounded-xl px-3 py-2.5 mb-2 hover:border-[#d9c9f7]">
                      <div className="min-w-0">
                        <b className="text-[12.5px] block truncate">{r.from_name || r.from_email || 'Unknown'}</b>
                        <span className="text-[11px] text-[#9b8ec4]">{r.classification || 'unclassified'} · {fmtDate(r.received_at)}</span>
                      </div>
                      <span className={`ml-auto shrink-0 text-[10px] font-extrabold rounded-full border px-2 py-0.5 ${r.meeting_booked_at ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : r.qualified_at ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 'text-[#b45309] bg-[#fffbeb] border-[#fcd34d]'}`}>
                        {r.meeting_booked_at ? 'booked' : r.qualified_at ? 'qualified' : 'needs you'}
                      </span>
                    </button>
                  ))
                ) : null)}

                {/* APPROVALS — drafts waiting on the operator's send gate */}
                {tab === 'Approvals' && (
                  (cols?.needs_approval.cards.length ?? 0) === 0
                    ? <p className="text-[12.5px] text-[#9b8ec4] text-center py-8">Nothing waiting on your send gate.</p>
                    : cols!.needs_approval.cards.map(c => (
                      <div key={c.id} className="border border-[#eee7f7] rounded-xl p-3 mb-2">
                        <b className="text-[12.5px] block">{fullName(c.leads?.first_name ?? null, c.leads?.last_name ?? null)}</b>
                        <span className="text-[11px] text-[#9b8ec4]">{c.leads?.company || c.to_email || '—'} · step {c.sequence_step ?? 1}</span>
                        <button onClick={() => toggleDraft(c.id)} className="block text-[11.5px] font-bold text-[#7C3AED] mt-1.5">
                          {openDrafts.has(c.id) ? 'Hide draft' : 'Read draft'}
                        </button>
                        {openDrafts.has(c.id) && (
                          <div className="mt-1.5 bg-[#faf8ff] border border-[#f2ecfb] rounded-lg p-2.5">
                            <b className="text-[11.5px] block mb-1">{c.subject || '(no subject)'}</b>
                            <p className="text-[11.5px] text-[#4c4368] leading-relaxed whitespace-pre-wrap">{(c.body || '').slice(0, 1200)}</p>
                          </div>
                        )}
                        <div className="flex gap-2 mt-2">
                          <button onClick={() => actQueue(c.id, 'approve')} disabled={acting !== null}
                            className="bg-[#7C3AED] text-white rounded-lg px-3 py-1.5 text-[12px] font-bold disabled:opacity-50">Approve &amp; send</button>
                          <button onClick={() => actQueue(c.id, 'reject')} disabled={acting !== null}
                            className="border border-[#ece5fb] rounded-lg px-3 py-1.5 text-[12px] font-bold text-[#5c5279] disabled:opacity-50">Reject</button>
                        </div>
                      </div>
                    ))
                )}

                {/* PEOPLE — sourced, not yet in front of the client */}
                {tab === 'People' && (
                  (cols?.sourced.cards.length ?? 0) === 0
                    ? <p className="text-[12.5px] text-[#9b8ec4] text-center py-8">Nobody sourced yet — ask Vida to source leads.</p>
                    : cols!.sourced.cards.map(c => (
                      <div key={c.id} className="flex items-center gap-2.5 border border-[#eee7f7] rounded-xl px-3 py-2.5 mb-2">
                        <div className="min-w-0">
                          <b className="text-[12.5px] block truncate">{fullName(c.first_name, c.last_name)}</b>
                          <span className="text-[11px] text-[#9b8ec4] truncate block">{[c.job_title, c.company].filter(Boolean).join(' · ') || '—'}</span>
                        </div>
                        <div className="ml-auto shrink-0 flex items-center gap-2">
                          {c.score != null && <span className="text-[13px] font-extrabold tabular-nums">{c.score}</span>}
                          <button onClick={() => act(c.id, 'surface')} disabled={acting !== null}
                            className="text-[11.5px] font-bold text-[#7C3AED] border border-[#e4dcf7] rounded-lg px-2.5 py-1 disabled:opacity-50">Send to client</button>
                          <button onClick={() => act(c.id, 'pass')} disabled={acting !== null}
                            className="text-[11.5px] font-bold text-[#9b8ec4] disabled:opacity-50">Pass</button>
                        </div>
                      </div>
                    ))
                )}

                {/* CAMPAIGN */}
                {tab === 'Campaign' && (cockpit ? (
                  cockpit.campaigns.length === 0 ? (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                      <b className="text-[12.5px] text-amber-800 block">No campaign — this client cannot be worked.</b>
                      <p className="text-[11.5px] text-amber-700 mt-1">Approvals are blocked and the $4 is deliberately NOT charged while no campaign is active.</p>
                      <button onClick={startCampaign} disabled={cockpitBusy}
                        className="mt-2.5 bg-[#7C3AED] text-white rounded-lg px-3.5 py-2 text-[12.5px] font-bold disabled:opacity-60">
                        {cockpitBusy ? 'Starting…' : 'Start campaign'}
                      </button>
                    </div>
                  ) : cockpit.campaigns.map(c => (
                    <div key={c.id} className="flex items-center gap-2.5 border border-[#eee7f7] rounded-xl px-3 py-2.5 mb-2">
                      <div className="min-w-0">
                        <b className="text-[12.5px] block truncate">{c.name}</b>
                        <span className="text-[11px] text-[#9b8ec4]">{c.leads_enrolled} enrolled · {c.emails_sent} sent · {c.replies_total} replies</span>
                      </div>
                      <div className="ml-auto shrink-0 flex items-center gap-2">
                        <span className={`text-[10px] font-extrabold rounded-full border px-2 py-0.5 ${c.status === 'active' ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 'text-[#9b8ec4] bg-[#f7f4fd] border-[#eee7f7]'}`}>{c.status === 'active' ? 'live' : c.status}</span>
                        {(c.status === 'active' || c.status === 'paused') && (
                          <button onClick={() => setCampaignStatus(c.id, c.status === 'active' ? 'paused' : 'active')} disabled={cockpitBusy}
                            className="text-[11.5px] font-bold text-[#7C3AED] border border-[#e4dcf7] rounded-lg px-2.5 py-1 disabled:opacity-50">
                            {c.status === 'active' ? 'Pause' : 'Resume'}
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                ) : null)}

                {/* ICP — read AND author (V4d) */}
                {tab === 'ICP' && (cockpit ? (icpEdit ? (
                  <div>
                    <button onClick={() => setIcpEdit(null)} className="text-[11.5px] font-bold text-[#7C3AED] mb-2.5">&larr; Back to ICPs</button>
                    <b className="text-[13px] block mb-2">{icpEdit.icp_id ? 'Edit ICP' : 'New ICP version'}</b>
                    {ICP_FIELDS.map(([key, label]) => (
                      <label key={key} className="block mb-2">
                        <span className="text-[10.5px] font-bold uppercase tracking-wide text-[#b3a9cc]">{label}</span>
                        <input value={icpEdit[key] ?? ''} onChange={e => setIcpEdit({ ...icpEdit, [key]: e.target.value })}
                          placeholder={key === 'name' ? 'e.g. SA logistics C-suite' : 'comma separated'}
                          className="w-full border border-[#ece5fb] rounded-lg px-3 py-2 text-[12.5px] mt-0.5 outline-none focus:border-[#7C3AED]" />
                      </label>
                    ))}
                    <div className="flex gap-2 mt-3">
                      <button onClick={saveIcp} disabled={cockpitBusy || !(icpEdit.name ?? '').trim()}
                        className="bg-[#7C3AED] text-white rounded-lg px-4 py-2 text-[12.5px] font-bold disabled:opacity-40">
                        {cockpitBusy ? 'Saving…' : icpEdit.icp_id ? 'Save changes' : 'Save as current ICP'}
                      </button>
                      <button onClick={() => setIcpEdit(null)} className="border border-[#ece5fb] rounded-lg px-3 py-2 text-[12.5px] font-bold text-[#5c5279]">Cancel</button>
                    </div>
                    <p className="text-[11px] text-[#9b8ec4] mt-2">A new version becomes the active ICP — sourcing targets it immediately.</p>
                  </div>
                ) : (<>
                  {cockpit.icps.length === 0
                    ? <p className="text-[12.5px] text-[#9b8ec4] text-center py-6">No ICP yet — sourcing has no target until there is one.</p>
                    : cockpit.icps.map((i, n) => (
                      <div key={i.id} className="flex items-center gap-2.5 border border-[#eee7f7] rounded-xl px-3 py-2.5 mb-2">
                        <div className="min-w-0">
                          <b className="text-[12.5px] block truncate">{i.name || `ICP v${cockpit.icps.length - n}`}</b>
                          <span className="text-[11px] text-[#9b8ec4]">{i.last_run_at ? `last sourced ${fmtDate(i.last_run_at)}` : 'never sourced'}</span>
                        </div>
                        <div className="ml-auto shrink-0 flex items-center gap-2">
                          {n === 0 && <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">current</span>}
                          <button onClick={() => openIcpEditor(i.id)} className="text-[11.5px] font-bold text-[#7C3AED] border border-[#e4dcf7] rounded-lg px-2.5 py-1">Edit</button>
                        </div>
                      </div>
                    ))}
                  <button onClick={() => openIcpEditor()} className="mt-1 bg-[#7C3AED] text-white rounded-lg px-3.5 py-2 text-[12.5px] font-bold">+ New ICP version</button>
                  {saveMsg && <p className="text-[11.5px] font-semibold text-[#0e7c86] mt-2">{saveMsg}</p>}
                </>)) : null)}

                {/* SEQUENCE — read AND author (V4d) */}
                {tab === 'Sequence' && (cockpit ? (seqEdit ? (
                  <div>
                    <button onClick={() => setSeqEdit(null)} className="text-[11.5px] font-bold text-[#7C3AED] mb-2.5">&larr; Back to sequences</button>
                    <label className="block mb-2.5">
                      <span className="text-[10.5px] font-bold uppercase tracking-wide text-[#b3a9cc]">Sequence name</span>
                      <input value={seqEdit.name} onChange={e => setSeqEdit({ ...seqEdit, name: e.target.value })}
                        placeholder="e.g. Practitioner angle"
                        className="w-full border border-[#ece5fb] rounded-lg px-3 py-2 text-[12.5px] mt-0.5 outline-none focus:border-[#7C3AED]" />
                    </label>
                    {seqEdit.steps.map((st, i) => (
                      <div key={i} className="border border-[#eee7f7] rounded-xl p-3 mb-2.5">
                        <div className="flex items-center gap-2 mb-1.5">
                          <b className="text-[12px]">Step {i + 1}</b>
                          {i > 0 && (
                            <label className="text-[11px] text-[#9b8ec4] flex items-center gap-1">
                              wait
                              <input type="number" min={0} max={60} value={st.wait_days}
                                onChange={e => { const steps = [...seqEdit.steps]; steps[i] = { ...st, wait_days: Number(e.target.value) || 0 }; setSeqEdit({ ...seqEdit, steps }) }}
                                className="w-14 border border-[#ece5fb] rounded px-1.5 py-0.5 text-[11.5px] outline-none" />
                              days
                            </label>
                          )}
                          {seqEdit.steps.length > 1 && (
                            <button onClick={() => setSeqEdit({ ...seqEdit, steps: seqEdit.steps.filter((_, n) => n !== i) })}
                              className="ml-auto text-[11px] font-bold text-red-500">Remove</button>
                          )}
                        </div>
                        <input value={st.subject} onChange={e => { const steps = [...seqEdit.steps]; steps[i] = { ...st, subject: e.target.value }; setSeqEdit({ ...seqEdit, steps }) }}
                          placeholder="Subject line" className="w-full border border-[#ece5fb] rounded-lg px-3 py-2 text-[12.5px] mb-1.5 outline-none focus:border-[#7C3AED]" />
                        <textarea value={st.body} rows={5}
                          onChange={e => { const steps = [...seqEdit.steps]; steps[i] = { ...st, body: e.target.value }; setSeqEdit({ ...seqEdit, steps }) }}
                          placeholder="Email body. Keep it short and specific."
                          className="w-full border border-[#ece5fb] rounded-lg px-3 py-2 text-[12.5px] leading-relaxed outline-none focus:border-[#7C3AED]" />
                      </div>
                    ))}
                    {seqEdit.steps.length < 10 && (
                      <button onClick={() => setSeqEdit({ ...seqEdit, steps: [...seqEdit.steps, { subject: '', body: '', wait_days: 3 }] })}
                        className="text-[11.5px] font-bold text-[#7C3AED] border border-[#e4dcf7] rounded-lg px-2.5 py-1 mb-3">+ Add step</button>
                    )}
                    <div className="flex gap-2">
                      <button onClick={saveSequence} disabled={cockpitBusy || !seqEdit.name.trim()}
                        className="bg-[#7C3AED] text-white rounded-lg px-4 py-2 text-[12.5px] font-bold disabled:opacity-40">
                        {cockpitBusy ? 'Saving…' : 'Save sequence'}
                      </button>
                      <button onClick={() => setSeqEdit(null)} className="border border-[#ece5fb] rounded-lg px-3 py-2 text-[12.5px] font-bold text-[#5c5279]">Cancel</button>
                    </div>
                    <p className="text-[11px] text-[#9b8ec4] mt-2">Nothing sends without the human Send gate — saving does not start outreach.</p>
                  </div>
                ) : (<>
                  {cockpit.sequences.length === 0
                    ? <p className="text-[12.5px] text-[#9b8ec4] text-center py-6">No saved sequence — write one, or FIGSY drafts per campaign.</p>
                    : cockpit.sequences.map(sq => (
                      <div key={sq.id} className="flex items-center gap-2.5 border border-[#eee7f7] rounded-xl px-3 py-2.5 mb-2">
                        <div className="min-w-0">
                          <b className="text-[12.5px] block truncate">{sq.name}</b>
                          <span className="text-[11px] text-[#9b8ec4]">{Array.isArray(sq.steps) ? sq.steps.length : 0} steps · updated {fmtDate(sq.updated_at)}</span>
                        </div>
                        <button onClick={() => openSeqEditor({ id: sq.id, name: sq.name, steps: sq.steps })}
                          className="ml-auto shrink-0 text-[11.5px] font-bold text-[#7C3AED] border border-[#e4dcf7] rounded-lg px-2.5 py-1">Edit</button>
                      </div>
                    ))}
                  <button onClick={() => openSeqEditor()} className="mt-1 bg-[#7C3AED] text-white rounded-lg px-3.5 py-2 text-[12.5px] font-bold">+ Write a sequence</button>
                  {saveMsg && <p className="text-[11.5px] font-semibold text-[#0e7c86] mt-2">{saveMsg}</p>}
                </>)) : null)}

                {/* BOOKINGS */}
                {tab === 'Bookings' && (
                  (cols?.booked.cards.length ?? 0) === 0
                    ? <p className="text-[12.5px] text-[#9b8ec4] text-center py-8">No meetings booked yet.</p>
                    : cols!.booked.cards.map(c => (
                      <div key={c.id} className="flex items-center gap-2.5 border border-emerald-200 bg-emerald-50/40 rounded-xl px-3 py-2.5 mb-2">
                        <div className="min-w-0">
                          <b className="text-[12.5px] block truncate">{fullName(c.first_name, c.last_name)}</b>
                          <span className="text-[11px] text-[#9b8ec4] truncate block">{c.company || '—'}</span>
                          <span className="text-[11px] text-emerald-700 font-semibold">
                            {c.start_time ? new Date(c.start_time).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : 'booked'}
                          </span>
                        </div>
                        {c.lead_id && <a href={`/vida/record?lead_id=${encodeURIComponent(c.lead_id)}`} className="ml-auto shrink-0 text-[11.5px] font-bold text-[#7C3AED]">Record &rarr;</a>}
                      </div>
                    ))
                )}
              </div>
            </aside>
          </div>
        </>)}
      </div>
    </div>
  )
}

// ── cockpit presentational helpers (kept local + tiny; no new deps) ────────────────
function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}
function Panel({ title, sub, children }: { title: string; sub: string; children: React.ReactNode }) {
  return (
    <div className="max-w-3xl">
      <b className="text-[15px]">{title}</b>
      <span className="block text-[11.5px] text-[#9b8ec4] mb-3">{sub}</span>
      <div className="flex flex-col gap-2">{children}</div>
    </div>
  )
}
function Empty({ children }: { children: React.ReactNode }) {
  return <div className="rounded-xl border border-[#eee7f7] bg-white px-4 py-6 text-center text-[13px] text-[#9b8ec4]">{children}</div>
}
function Hint({ children }: { children: React.ReactNode }) {
  return <p className="text-[11.5px] text-[#9b8ec4] mt-1">{children}</p>
}
function Row({ title, sub, tag, action }: {
  title: string; sub: string
  tag?: { label: string; tone: 'good' | 'warn' | 'mute' }
  action?: { label: string; onClick: () => void }
}) {
  const tone = tag?.tone === 'good' ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
    : tag?.tone === 'warn' ? 'text-amber-800 bg-amber-50 border-amber-200'
    : 'text-[#9b8ec4] bg-[#f7f4fd] border-[#eee7f7]'
  return (
    <div className="flex items-center gap-3 rounded-xl border border-[#eee7f7] bg-white px-3.5 py-2.5">
      <div className="min-w-0">
        <b className="text-[13px] block truncate">{title}</b>
        <span className="text-[11.5px] text-[#9b8ec4]">{sub}</span>
      </div>
      <div className="ml-auto flex items-center gap-2 shrink-0">
        {tag && <span className={`text-[10.5px] font-extrabold rounded-full border px-2 py-0.5 ${tone}`}>{tag.label}</span>}
        {action && (
          <button onClick={action.onClick}
            className="text-[11.5px] font-bold text-[#7C3AED] border border-[#e4dcf7] rounded-lg px-2.5 py-1 hover:bg-[#f7f4fd]">
            {action.label}
          </button>
        )}
      </div>
    </div>
  )
}
