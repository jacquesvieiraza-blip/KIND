'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Power, ChevronRight, ScrollText, RefreshCw } from 'lucide-react'

// #483–#485 — VIDA OPERATOR CONSOLE.
// This is the surface WE (operators) use to run each client's outbound pipeline end to
// end. It consumes the admin-gated /operator API through the /api/proxy gate (which
// injects the admin key + the verified operator email server-side — no secret ever
// touches the browser). Design reference: docs/mv-previews/vida2.html — a left Clients
// list + a 5-column campaign board (Sourced → Needs approval → Sending → Replied →
// Qualified·$4), under an honest top bar fed by real kill-switch / cap state.

// ── API response shapes (mirror apps/api/src/routes/operator.ts) ──────────────
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
type NeedsApprovalCard = { id: string; lead_id: string; status: string | null; created_at: string | null }
type SendingCard = { id: string; lead_id: string; current_step: number | null; total_steps: number | null; status: string | null; next_send_at: string | null }
type RepliedCard = { id: string; lead_id: string; from_email: string | null; subject: string | null; sentiment: string | null; created_at: string | null }
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

type Status = { outreach_enabled: boolean; daily_cap: number }

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

function fmtTime(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + ' ' +
    d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

// ── top-bar chips (honest kill-switch + cap, from /operator/status) ───────────
function StatusChips({ status, loading }: { status: Status | null; loading: boolean }) {
  if (loading) return <span className="text-xs text-gray-400">loading status…</span>
  if (!status) return <span className="text-xs text-red-500">status unavailable</span>
  const on = status.outreach_enabled
  return (
    <>
      <span
        className={`inline-flex items-center gap-1.5 text-xs font-bold rounded-full px-3 py-1 border ${
          on
            ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
            : 'text-amber-700 bg-amber-50 border-amber-200'
        }`}
        title="Global outreach kill-switch (AUTO_OUTREACH_ENABLED)"
      >
        <Power className="w-3.5 h-3.5" />
        Kill-switch {on ? 'ON' : 'OFF'}
      </span>
      <span
        className="inline-flex items-center text-xs font-bold rounded-full px-3 py-1 border text-[#7C3AED] bg-purple-50 border-purple-200"
        title="Daily send cap per client (FIGSY_DAILY_SEND_CAP)"
      >
        Cap {status.daily_cap}/day
      </span>
    </>
  )
}

// ── a single pipeline column ──────────────────────────────────────────────────
function Column({ label, count, children }: { label: string; count: number; children: React.ReactNode }) {
  return (
    <div className="w-[220px] shrink-0">
      <div className="flex items-center justify-between px-1 mb-2">
        <span className="text-[11px] font-bold uppercase tracking-wide text-gray-400">{label}</span>
        <span className="text-xs font-bold text-gray-800 bg-purple-50 rounded-full px-2 py-0.5 tabular-nums">{count}</span>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  )
}

function EmptyCol({ hint }: { hint: string }) {
  return <p className="text-xs text-gray-400 px-1 py-4 text-center border border-dashed border-purple-100 rounded-xl">{hint}</p>
}

function Tag({ children, tone = 'purp' }: { children: React.ReactNode; tone?: 'purp' | 'green' | 'amber' | 'blue' | 'pink' | 'gray' }) {
  const map = {
    purp: 'bg-purple-50 text-[#7C3AED]', green: 'bg-emerald-50 text-emerald-700', amber: 'bg-amber-50 text-amber-700',
    blue: 'bg-blue-50 text-blue-700', pink: 'bg-pink-50 text-pink-700', gray: 'bg-gray-100 text-gray-500',
  }
  return <span className={`inline-block text-[10px] font-bold uppercase tracking-wide rounded px-1.5 py-0.5 ${map[tone]}`}>{children}</span>
}

function sentimentTone(s: string | null): 'green' | 'amber' | 'gray' {
  const v = (s ?? '').toLowerCase()
  if (v.includes('pos') || v.includes('interest')) return 'green'
  if (v.includes('neg') || v.includes('not')) return 'amber'
  return 'gray'
}

export default function VidaConsolePage() {
  const [clients, setClients] = useState<ClientRow[] | null>(null)
  const [clientsError, setClientsError] = useState<string | null>(null)
  const [selected, setSelected] = useState<string | null>(null)

  const [status, setStatus] = useState<Status | null>(null)
  const [statusLoading, setStatusLoading] = useState(true)

  const [board, setBoard] = useState<Board | null>(null)
  const [boardLoading, setBoardLoading] = useState(false)
  const [boardError, setBoardError] = useState<string | null>(null)
  const [acting, setActing] = useState<string | null>(null) // lead id being approved/passed

  // Load status chips + clients on mount. Read an optional ?client=<id> from the URL.
  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const res = await fetch('/api/proxy/operator/status')
        const json = await res.json().catch(() => ({}))
        if (alive) setStatus(json?.success ? json.data : null)
      } catch { if (alive) setStatus(null) }
      finally { if (alive) setStatusLoading(false) }
    })()
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
    setBoardLoading(true)
    setBoardError(null)
    try {
      const res = await fetch(`/api/proxy/operator/board?client_id=${encodeURIComponent(clientId)}`)
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json?.success) throw new Error(json?.error || `Failed to load board (${res.status})`)
      setBoard({ client: json.client, columns: json.columns })
    } catch (e) {
      setBoard(null)
      setBoardError(e instanceof Error ? e.message : 'Failed to load board')
    } finally {
      setBoardLoading(false)
    }
  }, [])

  // When the selected client changes: reflect it in the URL and (re)load its board.
  useEffect(() => {
    if (!selected) return
    const url = new URL(window.location.href)
    url.searchParams.set('client', selected)
    window.history.replaceState(null, '', url.toString())
    loadBoard(selected)
  }, [selected, loadBoard])

  async function act(leadId: string, kind: 'approve' | 'pass') {
    if (!selected) return
    setActing(leadId)
    try {
      const body: Record<string, unknown> = { client_id: selected }
      if (kind === 'approve') body.confirm = true
      const res = await fetch(`/api/proxy/operator/leads/${encodeURIComponent(leadId)}/${kind}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json?.success) throw new Error(json?.error || `Action failed (${res.status})`)
      await loadBoard(selected)
    } catch (e) {
      setBoardError(e instanceof Error ? e.message : 'Action failed')
    } finally {
      setActing(null)
    }
  }

  const selectedClient = clients?.find(c => c.id === selected) ?? null
  const cols = board?.columns

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* ── console header (Milla&Vida · operator) ─────────────────────────── */}
      <header className="flex items-center gap-3 px-6 py-3 bg-white border-b border-purple-100">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#7C3AED] to-[#EC4899] flex items-center justify-center shrink-0">
          <span className="text-white font-black text-sm">V</span>
        </div>
        <div className="leading-tight">
          <p className="font-bold text-gray-900 text-[15px]">
            Milla&amp;Vida <span className="text-[#9b8ec4] font-semibold text-xs">· operator</span>
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <StatusChips status={status} loading={statusLoading} />
          <Link
            href="/vida/audit"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#7C3AED] hover:bg-purple-50 rounded-lg px-3 py-1.5 border border-purple-100"
          >
            <ScrollText className="w-3.5 h-3.5" /> Audit log
          </Link>
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        {/* ── LEFT: clients list ───────────────────────────────────────────── */}
        <aside className="w-64 shrink-0 border-r border-purple-100 bg-white/70 flex flex-col min-h-0">
          <div className="px-4 pt-4 pb-2">
            <p className="font-bold text-gray-900 text-sm">Clients</p>
            <p className="text-[11px] text-gray-400">Pick a client to work their campaign</p>
          </div>
          <div className="flex-1 overflow-y-auto px-2 pb-4 space-y-1">
            {clientsError && (
              <p className="text-xs text-red-500 px-2 py-3">{clientsError}</p>
            )}
            {!clients && !clientsError && (
              <p className="text-xs text-gray-400 px-2 py-3">Loading clients…</p>
            )}
            {clients && clients.length === 0 && (
              <p className="text-xs text-gray-400 px-2 py-3">No clients yet.</p>
            )}
            {clients?.map(c => {
              const on = c.id === selected
              return (
                <button
                  key={c.id}
                  onClick={() => setSelected(c.id)}
                  className={`w-full flex items-center gap-3 text-left px-3 py-2.5 rounded-xl transition-colors ${
                    on ? 'bg-purple-50 border border-purple-200' : 'hover:bg-purple-50/50 border border-transparent'
                  }`}
                >
                  <span className="w-8 h-8 rounded-lg bg-purple-100 text-[#7C3AED] text-[11px] font-bold flex items-center justify-center shrink-0">
                    {initials(c.company_name)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-semibold text-gray-900 truncate">{c.company_name ?? 'Unnamed client'}</span>
                    <span className="block text-[11px] text-gray-400 truncate">{[c.industry, c.country].filter(Boolean).join(' · ') || '—'}</span>
                  </span>
                  {c.house_or_demo && <Tag tone="gray">{c.is_demo ? 'demo' : 'house'}</Tag>}
                  {on && <ChevronRight className="w-4 h-4 text-[#7C3AED] shrink-0" />}
                </button>
              )
            })}
          </div>
        </aside>

        {/* ── RIGHT: pipeline board ────────────────────────────────────────── */}
        <section className="flex-1 min-w-0 flex flex-col min-h-0 bg-[#fbfaff]">
          {!selected ? (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-sm text-gray-400">Select a client on the left to load their campaign pipeline.</p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 px-6 py-4 border-b border-purple-100">
                <div>
                  <p className="font-bold text-gray-900 text-base">
                    {selectedClient?.company_name ?? board?.client?.company_name ?? 'Client'} — campaign pipeline
                  </p>
                  <p className="text-xs text-gray-400">Every stage FIGSY moves a lead through · human gate before send</p>
                </div>
                <button
                  onClick={() => selected && loadBoard(selected)}
                  disabled={boardLoading}
                  className="ml-auto inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:bg-white rounded-lg px-3 py-1.5 border border-purple-100 disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${boardLoading ? 'animate-spin' : ''}`} /> Refresh
                </button>
              </div>

              {boardError && (
                <div className="mx-6 mt-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-2">{boardError}</div>
              )}

              <div className="flex-1 overflow-x-auto overflow-y-auto px-6 py-5">
                {boardLoading && !cols ? (
                  <p className="text-sm text-gray-400">Loading pipeline…</p>
                ) : !cols ? (
                  <p className="text-sm text-gray-400">No pipeline data.</p>
                ) : (
                  <div className="flex gap-4 min-w-max">
                    {/* Sourced */}
                    <Column label="Sourced" count={cols.sourced.count}>
                      {cols.sourced.cards.length === 0 ? (
                        <EmptyCol hint="No sourced leads" />
                      ) : cols.sourced.cards.map(c => (
                        <div key={c.id} className="bg-white border border-purple-100 rounded-xl p-3">
                          <p className="text-[13px] font-semibold text-gray-900 truncate">{fullName(c.first_name, c.last_name)}</p>
                          <p className="text-[11px] text-gray-400 truncate">{[c.job_title, c.company].filter(Boolean).join(' · ') || '—'}</p>
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {c.score != null && <Tag>{c.score}</Tag>}
                            {c.status && <Tag tone="gray">{c.status}</Tag>}
                          </div>
                          <div className="flex gap-1.5 mt-2.5">
                            <button
                              onClick={() => act(c.id, 'approve')}
                              disabled={acting === c.id}
                              className="flex-1 text-[11px] font-bold rounded-lg px-2 py-1.5 bg-[#7C3AED] text-white hover:bg-[#6D28D9] disabled:opacity-50"
                            >
                              {acting === c.id ? '…' : 'Approve — pursue ($4)'}
                            </button>
                            <button
                              onClick={() => act(c.id, 'pass')}
                              disabled={acting === c.id}
                              className="text-[11px] font-bold rounded-lg px-2 py-1.5 border border-purple-200 text-gray-500 hover:bg-purple-50 disabled:opacity-50"
                            >
                              Not a fit
                            </button>
                          </div>
                        </div>
                      ))}
                    </Column>

                    {/* Needs approval */}
                    <Column label="Needs approval" count={cols.needs_approval.count}>
                      {cols.needs_approval.cards.length === 0 ? (
                        <EmptyCol hint="Nothing awaiting approval" />
                      ) : cols.needs_approval.cards.map(c => (
                        <div key={c.id} className="bg-[#fffdf7] border-[1.5px] border-amber-300 rounded-xl p-3">
                          <p className="text-[13px] font-semibold text-gray-900">Lead {c.lead_id.slice(0, 8)}</p>
                          <p className="text-[11px] text-gray-400">Queued {fmtTime(c.created_at)}</p>
                          <div className="mt-2"><Tag tone="amber">gate · human</Tag></div>
                          <div className="flex gap-1.5 mt-2.5">
                            <button
                              onClick={() => act(c.lead_id, 'approve')}
                              disabled={acting === c.lead_id}
                              className="flex-1 text-[11px] font-bold rounded-lg px-2 py-1.5 bg-[#7C3AED] text-white hover:bg-[#6D28D9] disabled:opacity-50"
                            >
                              {acting === c.lead_id ? '…' : 'Approve — pursue ($4)'}
                            </button>
                            <button
                              onClick={() => act(c.lead_id, 'pass')}
                              disabled={acting === c.lead_id}
                              className="text-[11px] font-bold rounded-lg px-2 py-1.5 border border-purple-200 text-gray-500 hover:bg-purple-50 disabled:opacity-50"
                            >
                              Not a fit
                            </button>
                          </div>
                        </div>
                      ))}
                    </Column>

                    {/* Sending */}
                    <Column label="Sending" count={cols.sending.count}>
                      {cols.sending.cards.length === 0 ? (
                        <EmptyCol hint="Nothing in flight" />
                      ) : cols.sending.cards.map(c => (
                        <div key={c.id} className="bg-white border border-purple-100 rounded-xl p-3">
                          <p className="text-[13px] font-semibold text-gray-900">Lead {c.lead_id.slice(0, 8)}</p>
                          <p className="text-[11px] text-gray-400">
                            Step {c.current_step ?? '?'} of {c.total_steps ?? '?'}
                          </p>
                          <div className="mt-2"><Tag tone="blue">next {fmtTime(c.next_send_at)}</Tag></div>
                        </div>
                      ))}
                    </Column>

                    {/* Replied */}
                    <Column label="Replied" count={cols.replied.count}>
                      {cols.replied.cards.length === 0 ? (
                        <EmptyCol hint="No replies yet" />
                      ) : cols.replied.cards.map(c => (
                        <div key={c.id} className="bg-white border border-purple-100 rounded-xl p-3">
                          <p className="text-[13px] font-semibold text-gray-900 truncate">{c.from_email ?? 'Unknown sender'}</p>
                          <p className="text-[11px] text-gray-400 truncate">{c.subject || '(no subject)'}</p>
                          {c.sentiment && <div className="mt-2"><Tag tone={sentimentTone(c.sentiment)}>{c.sentiment}</Tag></div>}
                        </div>
                      ))}
                    </Column>

                    {/* Qualified · $4 */}
                    <Column label="Qualified · $4" count={cols.qualified.count}>
                      {cols.qualified.cards.length === 0 ? (
                        <EmptyCol hint="None qualified yet" />
                      ) : cols.qualified.cards.map(c => (
                        <div key={c.id} className="bg-white border border-emerald-200 rounded-xl p-3">
                          <p className="text-[13px] font-semibold text-gray-900 truncate">{fullName(c.first_name, c.last_name)}</p>
                          <p className="text-[11px] text-gray-400 truncate">{c.company || c.email || '—'}</p>
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {c.score != null && <Tag>{c.score}</Tag>}
                            <Tag tone="green">$4 · billable</Tag>
                          </div>
                        </div>
                      ))}
                    </Column>
                  </div>
                )}
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  )
}
