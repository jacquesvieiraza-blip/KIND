'use client'

// #88 Company / Per-Rep Engine — the real Owner Command Centre / Teams Hub.
// Wired to /company/* (live data). Reachable by URL; linked in the sidebar only
// when v2Enabled('company'), so the live product is untouched until you flip the
// flag AND merge. Design source: portal-v2-preview.html Concept 9 + Company
// Command Centre; CLIENT_FLOW.html PART 2 (2a–2d).

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { api } from '@/lib/api'
import {
  Building2, Users, Coins, Crown,
  CheckCircle2, XCircle, Loader2, Sparkles, Zap, Eye, CreditCard,
} from 'lucide-react'

// Lead-gen credit bundles — mirrors billing page. $1/credit, three sizes.
// priceId pulled from env so the company page never hardcodes Stripe IDs.
const TOPUP_BUNDLES = [
  { credits: 20,  priceUsd: 20,  priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_LEADGEN_20  || '' },
  { credits: 40,  priceUsd: 40,  priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_LEADGEN_40  || '' },
  { credits: 100, priceUsd: 100, priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_LEADGEN_100 || '' },
]

const BRAND = '#7C3AED'

interface Seat {
  id: string
  email: string
  name?: string
  role: string
  autonomy: 'auto' | 'copilot' | 'off'
  credit_budget: number
  credits_used: number
  credit_balance?: number
  seat_active: boolean
  accepted_at: string | null
  enabled_agents?: string[]
  // real per-rep outreach
  contacted?: number
  replies?: number
  booked?: number
  leads?: number
  reply_pct?: number
}
interface CreditRequest { id: string; rep_client_id: string; amount: number; reason: string | null; created_at: string }
interface Play { id: string; name: string; note: string | null; reply_rate: number | null; pushed_to_all: boolean }
interface Overview {
  company: { id: string; name: string }
  role: string
  can_manage: boolean
  seats: Seat[]
  pending_requests: CreditRequest[]
  totals: { seats: number; active_seats: number; allocated: number; used: number; company_pool: number; pending_requests: number }
}

type Tab = 'command' | 'seats' | 'usage' | 'plays'

export default function CompanyPage() {
  const supabase = createClient()
  const [token, setToken] = useState<string | null>(null)
  const [data, setData] = useState<Overview | null>(null)
  const [plays, setPlays] = useState<Play[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('command')
  const [busy, setBusy] = useState<string | null>(null)
  const [topupBundle, setTopupBundle] = useState<number>(100)
  const [topupBusy, setTopupBusy] = useState(false)
  const [topupError, setTopupError] = useState<string | null>(null)

  const [needsSetup, setNeedsSetup] = useState(false)
  const [provisioning, setProvisioning] = useState(false)

  const load = useCallback(async (tok: string) => {
    try {
      const ov = await api.get<{ data: Overview & { has_company?: boolean } }>('/company/overview', tok)
      if ((ov.data as { has_company?: boolean }).has_company === false) {
        setNeedsSetup(true); setData(null); setLoading(false); return
      }
      const pl = await api.get<{ data: Play[] }>('/company/winning-plays', tok).catch(() => ({ data: [] as Play[] }))
      setNeedsSetup(false)
      setData(ov.data)
      setPlays(pl.data)
    } catch { setData(null) }
    setLoading(false)
  }, [])

  async function provision() {
    if (!token) return
    setProvisioning(true)
    try { await api.post('/company/provision', {}, token); await load(token) } catch { /* ignore */ }
    setProvisioning(false)
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { setLoading(false); return }
      setToken(session.access_token)
      load(session.access_token)
    })
  }, [load])

  async function decide(id: string, decision: 'approved' | 'denied') {
    if (!token) return
    setBusy(id)
    try { await api.post(`/company/credit-requests/${id}/decide`, { decision }, token); await load(token) } catch { /* ignore */ }
    setBusy(null)
  }
  async function setAutonomy(seat: Seat, autonomy: Seat['autonomy']) {
    if (!token) return
    setBusy(seat.id)
    try { await api.patch(`/company/seats/${seat.id}`, { autonomy }, token); await load(token) } catch { /* ignore */ }
    setBusy(null)
  }
  // #108 — owner edits a rep's per-seat credit budget directly (sets the cap).
  const [budgetEdits, setBudgetEdits] = useState<Record<string, number>>({})
  async function saveBudget(seat: Seat) {
    if (!token) return
    const next = budgetEdits[seat.id]
    if (next == null || next < 0 || next === seat.credit_budget) return
    setBusy(seat.id)
    try {
      await api.patch(`/company/seats/${seat.id}`, { seat_budget: next }, token)
      setBudgetEdits(prev => { const n = { ...prev }; delete n[seat.id]; return n })
      await load(token)
    } catch { /* ignore */ }
    setBusy(null)
  }
  // #108 — owner deactivates / removes a rep seat (sets seat_active=false).
  async function deactivateRep(seat: Seat) {
    if (!token) return
    if (!window.confirm(`Deactivate ${emailName(seat.email)}? They lose access to their seat. You can re-invite later.`)) return
    setBusy(seat.id)
    try { await api.patch(`/company/seats/${seat.id}`, { seat_active: false }, token); await load(token) } catch { /* ignore */ }
    setBusy(null)
  }
  // Per-rep agent unlock — owner toggles Milla/Vida/Denise for a rep (FIGSY always on).
  async function toggleAgent(seat: Seat, key: 'milla' | 'vida' | 'denise') {
    if (!token) return
    const current = new Set(seat.enabled_agents ?? ['figsy'])
    if (current.has(key)) current.delete(key); else current.add(key)
    current.add('figsy')
    setBusy(seat.id)
    try { await api.patch(`/company/seats/${seat.id}`, { enabled_agents: Array.from(current) }, token); await load(token) } catch { /* ignore */ }
    setBusy(null)
  }
  const AGENT_PRICE: Record<string, number> = { milla: 49, vida: 29, denise: 39 }
  async function pushPlay(id: string) {
    if (!token) return
    setBusy(id)
    try { await api.post(`/company/winning-plays/${id}/push`, {}, token); await load(token) } catch { /* ignore */ }
    setBusy(null)
  }

  // ── Invite a rep ─────────────────────────────────────────────────────────
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteBudget, setInviteBudget] = useState(5000)
  const [inviteBusy, setInviteBusy] = useState(false)
  const [inviteLink, setInviteLink] = useState<string | null>(null)
  const [inviteErr, setInviteErr] = useState<string | null>(null)
  async function inviteRep() {
    if (!token || !inviteEmail) return
    setInviteBusy(true); setInviteErr(null); setInviteLink(null)
    try {
      const res = await api.post<{ token?: string; error?: string }>('/company/seats', { email: inviteEmail, budget: inviteBudget }, token)
      if (res.token) {
        setInviteLink(`${window.location.origin}/invite/accept?token=${res.token}`)
        setInviteEmail('')
        await load(token)
      } else { setInviteErr(res.error || 'Could not add rep.') }
    } catch (e: any) { setInviteErr(e?.message || 'Could not add rep.') }
    setInviteBusy(false)
  }

  // ── STAGING: add test credits to the pool (gated server-side too) ─────────
  const IS_STAGING = process.env.NEXT_PUBLIC_IS_STAGING === 'true'
  const [poolBusy, setPoolBusy] = useState(false)
  async function addTestPool() {
    if (!token) return
    setPoolBusy(true)
    try { await api.post('/company/pool/topup', { amount: 10000 }, token); await load(token) } catch { /* ignore */ }
    setPoolBusy(false)
  }

  async function handleTopUp() {
    if (!token) return
    const bundle = TOPUP_BUNDLES.find(b => b.credits === topupBundle)
    if (!bundle || !bundle.priceId) {
      setTopupError('Payment not configured — contact support.')
      return
    }
    setTopupBusy(true)
    setTopupError(null)
    try {
      const res = await api.post<{ url?: string; error?: string }>(
        '/stripe/checkout',
        { priceId: bundle.priceId, credits: bundle.credits, creditType: 'lead_gen' },
        token,
      )
      if (res.url) { window.location.href = res.url; return }
      setTopupError(res.error || 'Could not start checkout. Try again.')
    } catch {
      setTopupError('Could not start checkout. Try again.')
    }
    setTopupBusy(false)
  }

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-[#7C3AED]" /></div>
  if (needsSetup) return (
    <div className="max-w-lg mx-auto text-center py-16 px-6">
      <div className="w-14 h-14 rounded-2xl mx-auto mb-5 flex items-center justify-center text-white" style={{ background: BRAND }}>
        <Building2 className="w-7 h-7" />
      </div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Run your whole team from one place</h1>
      <p className="text-gray-500 mb-6">Turn your account into a company workspace: give every rep their own FIGSY, fund one budget pool, and approve their credit requests — all from an owner command centre.</p>
      <button onClick={provision} disabled={provisioning}
        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-white font-semibold disabled:opacity-60" style={{ background: BRAND }}>
        {provisioning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Building2 className="w-4 h-4" />}
        Set up my company workspace
      </button>
      <p className="text-xs text-gray-400 mt-3">You stay the owner · seats are free · you only pay for the usage each rep consumes.</p>
    </div>
  )
  if (!data) return <div className="max-w-md mx-auto text-center py-20 text-gray-500">Couldn't load your company workspace. Refresh to try again.</div>

  const { totals, seats, pending_requests: requests, can_manage } = data
  const emailName = (e: string) => e.split('@')[0]
  const seatById = (id: string) => seats.find(s => s.id === id)

  const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'command', label: 'Command Centre', icon: <Building2 className="w-4 h-4" /> },
    { id: 'seats',   label: 'Seats',          icon: <Users className="w-4 h-4" /> },
    { id: 'usage',   label: 'Usage & Budget', icon: <Coins className="w-4 h-4" /> },
    { id: 'plays',   label: 'Winning Plays',  icon: <Sparkles className="w-4 h-4" /> },
  ]

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white" style={{ background: BRAND }}>
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{data.company.name || 'Your company'}</h1>
            <p className="text-sm text-gray-500">Command Centre · {totals.active_seats} of {totals.seats} seats active</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white border border-gray-200 rounded-xl p-1 w-fit">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t.id ? 'text-white' : 'text-gray-500 hover:text-gray-800'}`}
            style={tab === t.id ? { background: BRAND } : undefined}>
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {tab === 'command' && (
        <div className="space-y-6">
          {/* Rep leaderboard — every rep, their spend, credits left */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="text-white px-6 py-5" style={{ background: BRAND }}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-white/60">Company</p>
                  <p className="text-xl font-bold">{data.company.name} · {totals.seats} seats</p>
                </div>
                <div className="flex gap-8 text-right">
                  <div><p className="text-2xl font-bold">{totals.company_pool.toLocaleString()}</p><p className="text-xs text-white/60">Pool credits</p></div>
                  <div><p className="text-2xl font-bold">{totals.active_seats}</p><p className="text-xs text-white/60">Active</p></div>
                  <div><p className="text-2xl font-bold">{totals.pending_requests}</p><p className="text-xs text-white/60">Requests</p></div>
                </div>
              </div>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                  <th className="text-left px-6 py-3">Rep · their FIGSY</th>
                  <th className="text-right px-3 py-3">Contacted</th>
                  <th className="text-right px-3 py-3">Reply %</th>
                  <th className="text-right px-3 py-3">Booked</th>
                  <th className="text-right px-4 py-3">Credits left</th>
                </tr>
              </thead>
              <tbody>
                {seats.filter(s => s.seat_active).map((s, i) => {
                  const left = Math.max(0, s.credit_budget - s.credits_used)
                  const pct  = s.credit_budget > 0 ? (s.credits_used / s.credit_budget) : 0
                  const INITIALS = ['bg-violet-600','bg-indigo-500','bg-emerald-500','bg-amber-500','bg-rose-500']
                  return (
                    <tr key={s.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold ${INITIALS[i % INITIALS.length]}`}>
                            {emailName(s.email).slice(0,2).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{emailName(s.email)}</p>
                            <p className="text-xs text-gray-400">{s.role}</p>
                          </div>
                          {s.role === 'owner' && <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">Owner</span>}
                          {pct > 0.9 && left < 20 && <span className="text-[10px] font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">low credits</span>}
                        </div>
                      </td>
                      <td className="px-3 py-4 text-right text-gray-700">{s.role === 'owner' ? '—' : (s.contacted ?? 0).toLocaleString()}</td>
                      <td className="px-3 py-4 text-right">
                        {s.role === 'owner' ? <span className="text-gray-300">—</span> : (
                          <span className={`font-semibold ${(s.reply_pct ?? 0) >= 12 ? 'text-emerald-600' : (s.reply_pct ?? 0) < 8 ? 'text-orange-600' : 'text-gray-700'}`}>{s.reply_pct ?? 0}%</span>
                        )}
                      </td>
                      <td className="px-3 py-4 text-right font-bold text-gray-900">{s.role === 'owner' ? '—' : (s.booked ?? 0)}</td>
                      <td className="px-4 py-4 text-right">
                        <span className="font-bold" style={{ color: pct > 0.9 ? '#ea580c' : BRAND }}>{left.toLocaleString()}</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Pending credit requests */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
            <h3 className="font-semibold text-gray-900 px-5 py-4 border-b border-gray-100">
              Pending credit requests
              {requests.length > 0 && <span className="ml-2 text-xs font-bold text-white px-2 py-0.5 rounded-full" style={{ background: BRAND }}>{requests.length}</span>}
            </h3>
            {requests.length === 0 && <p className="px-5 py-6 text-sm text-gray-400">No requests right now.</p>}
            {requests.map(r => {
              const seat = seatById(r.rep_client_id)
              return (
                <div key={r.id} className="flex items-center justify-between px-5 py-4 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{seat ? emailName(seat.email) : 'A rep'} requests <span style={{ color: BRAND }}>+{r.amount.toLocaleString()} credits</span></p>
                    {r.reason && <p className="text-xs text-gray-400 mt-0.5">{r.reason}</p>}
                  </div>
                  {can_manage ? (
                    <div className="flex gap-2">
                      <button disabled={busy === r.id} onClick={() => decide(r.id, 'approved')} className="flex items-center gap-1 text-xs font-semibold text-white px-3 py-1.5 rounded-lg disabled:opacity-50" style={{ background: BRAND }}><CheckCircle2 className="w-3.5 h-3.5" /> Approve</button>
                      <button disabled={busy === r.id} onClick={() => decide(r.id, 'denied')} className="flex items-center gap-1 text-xs font-semibold text-gray-500 bg-gray-100 px-3 py-1.5 rounded-lg disabled:opacity-50"><XCircle className="w-3.5 h-3.5" /> Deny</button>
                    </div>
                  ) : <span className="text-xs text-gray-400">Pending owner approval</span>}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {tab === 'seats' && (
        <div className="space-y-4">
          <p className="text-sm text-gray-500">Each seat is one rep with their own autonomous FIGSY. One company payment. Adding a rep = one more line on the invoice.</p>

          {/* Invite a rep */}
          {can_manage && (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2"><Users className="w-4 h-4" style={{ color: BRAND }} /> Add a rep</h3>
              <div className="flex flex-col sm:flex-row gap-2">
                <input value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} type="email" placeholder="rep@company.com"
                  className="flex-1 rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-violet-400 focus:outline-none" />
                <div className="flex items-center gap-1 rounded-xl border border-gray-200 px-3 py-2.5">
                  <span className="text-xs text-gray-400">Budget</span>
                  <input value={inviteBudget} onChange={e => setInviteBudget(parseInt(e.target.value) || 0)} type="number" min={0}
                    className="w-20 text-sm text-right focus:outline-none" />
                  <span className="text-xs text-gray-400">cr</span>
                </div>
                <button onClick={inviteRep} disabled={inviteBusy || !inviteEmail}
                  className="px-4 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 flex items-center gap-1.5" style={{ background: BRAND }}>
                  {inviteBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Users className="w-4 h-4" />} Invite
                </button>
              </div>
              {inviteErr && <p className="text-xs text-red-500 mt-2">{inviteErr}</p>}
              {inviteLink && (
                <div className="mt-3 p-3 rounded-xl bg-violet-50 border border-violet-100">
                  <p className="text-xs font-semibold text-violet-900 mb-1">Invite link — send this to the rep:</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-[11px] text-violet-700 truncate">{inviteLink}</code>
                    <button onClick={() => navigator.clipboard.writeText(inviteLink)} className="text-xs font-semibold px-2 py-1 rounded-lg bg-white border border-violet-200 text-violet-700">Copy</button>
                  </div>
                </div>
              )}
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {seats.map(s => (
              <div key={s.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-gray-900">{emailName(s.email)}</h3>
                  {s.role === 'owner' && <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full"><Crown className="w-3 h-3" /> Owner</span>}
                </div>
                <p className="text-xs text-gray-400 mb-3">{s.accepted_at ? 'FIGSY · active' : 'Invite pending'}</p>
                {/* Autonomy (item 35) */}
                <div className="flex gap-2 mb-4">
                  {can_manage ? (['auto', 'copilot'] as const).map(a => (
                    <button key={a} disabled={busy === s.id} onClick={() => setAutonomy(s, a)}
                      className={`flex-1 text-[11px] font-semibold py-1.5 rounded-lg border transition-colors ${s.autonomy === a ? 'text-white border-transparent' : 'text-gray-500 border-gray-200'}`}
                      style={s.autonomy === a ? { background: BRAND } : undefined}>
                      {a === 'auto' ? <><Zap className="w-3 h-3 inline" /> Auto-pilot</> : <><Eye className="w-3 h-3 inline" /> Co-pilot</>}
                    </button>
                  )) : (
                    <span className="text-[11px] font-semibold text-gray-500">{s.autonomy === 'auto' ? '⚡ Auto-pilot' : '👁 Co-pilot'}</span>
                  )}
                </div>
                {/* Budget (item 37) */}
                <div className="text-xs text-gray-500 mb-1 flex justify-between"><span>Credits</span><span>{s.credits_used.toLocaleString()} / {s.credit_budget.toLocaleString()}</span></div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${s.credit_budget > 0 ? Math.min(100, (s.credits_used / s.credit_budget) * 100) : 0}%`, background: s.credit_budget > 0 && s.credits_used / s.credit_budget > 0.9 ? '#ea580c' : BRAND }} />
                </div>

                {/* Per-rep agent unlock — owner switches agents on for this rep */}
                {s.role === 'rep' && (
                  <div className="mt-4 pt-3 border-t border-gray-100">
                    <p className="text-[11px] font-semibold text-gray-500 mb-2">Agents for this rep</p>
                    <div className="flex flex-wrap gap-1.5">
                      <span className="text-[11px] font-semibold px-2 py-1 rounded-lg text-white" style={{ background: BRAND }}>FIGSY · included</span>
                      {(['milla', 'vida', 'denise'] as const).map(k => {
                        const on = (s.enabled_agents ?? []).includes(k)
                        const label = k.charAt(0).toUpperCase() + k.slice(1)
                        return (
                          <button key={k} disabled={!can_manage || busy === s.id} onClick={() => toggleAgent(s, k)}
                            className={`text-[11px] font-semibold px-2 py-1 rounded-lg border transition-colors disabled:opacity-60 ${on ? 'text-white border-transparent' : 'text-gray-500 border-gray-200 hover:border-violet-300'}`}
                            style={on ? { background: '#10b981' } : undefined}>
                            {on ? '✓ ' : '+ '}{label} <span className="opacity-70">${AGENT_PRICE[k]}</span>
                          </button>
                        )
                      })}
                    </div>
                    {(() => {
                      const extra = (s.enabled_agents ?? []).filter(a => a !== 'figsy').reduce((n, a) => n + (AGENT_PRICE[a] ?? 0), 0)
                      return extra > 0 ? <p className="text-[10px] text-gray-400 mt-1.5">+${extra}/mo on the company bill</p> : null
                    })()}
                  </div>
                )}

                {/* #108 — owner edits the rep's budget + can deactivate the seat */}
                {can_manage && s.role === 'rep' && (
                  <div className="mt-4 pt-3 border-t border-gray-100 space-y-3">
                    <div>
                      <p className="text-[11px] font-semibold text-gray-500 mb-1.5">Per-seat credit budget</p>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 rounded-xl border border-gray-200 px-3 py-2 flex-1">
                          <input
                            type="number" min={0}
                            value={budgetEdits[s.id] ?? s.credit_budget}
                            onChange={e => setBudgetEdits(prev => ({ ...prev, [s.id]: parseInt(e.target.value) || 0 }))}
                            className="w-full text-sm text-right focus:outline-none" />
                          <span className="text-xs text-gray-400">cr</span>
                        </div>
                        <button
                          disabled={busy === s.id || (budgetEdits[s.id] ?? s.credit_budget) === s.credit_budget}
                          onClick={() => saveBudget(s)}
                          className="px-3 py-2 rounded-xl text-xs font-semibold text-white disabled:opacity-50" style={{ background: BRAND }}>
                          {busy === s.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Save'}
                        </button>
                      </div>
                    </div>
                    {s.seat_active ? (
                      <button
                        disabled={busy === s.id}
                        onClick={() => deactivateRep(s)}
                        className="w-full flex items-center justify-center gap-1.5 text-xs font-semibold text-red-600 bg-red-50 border border-red-100 py-2 rounded-xl disabled:opacity-50 hover:bg-red-100 transition-colors">
                        <XCircle className="w-3.5 h-3.5" /> Deactivate rep
                      </button>
                    ) : (
                      <p className="text-[11px] font-semibold text-gray-400 text-center py-1.5">Seat deactivated</p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400">FIGSY is included on every seat. The owner switches on Milla · Vida · Denise per rep — billed to the company. Per-rep lead routing (item 38) and per-rep calendars (item 41) land next.</p>
        </div>
      )}

      {tab === 'usage' && (
        <div className="space-y-6">
          {/* Company pool balance + top-up */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">Company budget pool</p>
            <p className="text-3xl font-bold text-gray-900 mb-1">{totals.company_pool.toLocaleString()} <span className="text-lg font-normal text-gray-400">credits left</span></p>
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden mb-4">
              <div className="h-full rounded-full transition-all" style={{ width: `${totals.allocated > 0 ? Math.min(100, (totals.used / totals.allocated) * 100) : 0}%`, background: BRAND }} />
            </div>
            <p className="text-xs text-gray-400 mb-5">Reps request more when they run low. You approve or deny — exactly how an enterprise runs Claude. Hybrid = seat + usage you control.</p>

            {/* Bundle picker */}
            {can_manage && (
              <div>
                <p className="text-xs font-semibold text-gray-700 mb-2">Top up company pool</p>
                <div className="flex gap-2 mb-3">
                  {TOPUP_BUNDLES.map(b => (
                    <button key={b.credits} onClick={() => setTopupBundle(b.credits)}
                      className={`flex-1 rounded-xl border py-3 text-sm font-semibold transition-colors ${topupBundle === b.credits ? 'text-white border-transparent' : 'border-gray-200 text-gray-600 hover:border-violet-300'}`}
                      style={topupBundle === b.credits ? { background: BRAND } : undefined}>
                      <span className="block text-lg font-bold">{b.credits}</span>
                      <span className="block text-xs opacity-70">credits · ${b.priceUsd}</span>
                    </button>
                  ))}
                </div>
                <button onClick={handleTopUp} disabled={topupBusy}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white disabled:opacity-60"
                  style={{ background: BRAND }}>
                  {topupBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
                  {topupBusy ? 'Opening checkout…' : `+ Top up company budget`}
                </button>
                <p className="text-xs text-gray-400 text-center mt-2">One company payment · owner controls the purse</p>
                {topupError && <p className="text-xs text-red-500 text-center mt-1">{topupError}</p>}

                {IS_STAGING && (
                  <button onClick={addTestPool} disabled={poolBusy}
                    className="w-full mt-2 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 disabled:opacity-60">
                    {poolBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Coins className="w-3.5 h-3.5" />}
                    🧪 Staging: add 10,000 test credits to pool
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Per-seat breakdown */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
            <h3 className="font-semibold text-gray-900 px-5 py-4 border-b border-gray-100">Per-seat breakdown</h3>
            {seats.map(s => (
              <div key={s.id} className="px-5 py-4 border-b border-gray-50 last:border-0">
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium text-gray-800">{emailName(s.email)}</span>
                  <span className="text-gray-500">{s.credits_used.toLocaleString()} / {s.credit_budget.toLocaleString()}</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{
                    width: `${s.credit_budget > 0 ? Math.min(100, (s.credits_used / s.credit_budget) * 100) : 0}%`,
                    background: s.credit_budget > 0 && s.credits_used / s.credit_budget > 0.9 ? '#ea580c' : BRAND,
                  }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'plays' && (
        <div className="space-y-5">
          <div className="flex items-start gap-3 bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0" style={{ background: BRAND }}><Sparkles className="w-5 h-5" /></div>
            <div>
              <h3 className="font-semibold text-gray-900">Your shared winning-play library</h3>
              <p className="text-sm text-gray-500 mt-0.5">Perfect a play once — every seat&apos;s FIGSY inherits it. How a whole team writes like your best rep.</p>
            </div>
          </div>
          {plays.length === 0 && <p className="text-sm text-gray-400">No saved plays yet. Save a rep&apos;s best sequence to share it across the team.</p>}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {plays.map(p => (
              <div key={p.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 flex flex-col">
                <div className="flex items-center justify-between mb-2">
                  {p.reply_rate != null
                    ? <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full"><Crown className="w-3 h-3" /> {p.reply_rate}% reply</span>
                    : <span />}
                  {p.pushed_to_all && <span className="text-[11px] text-gray-400">live on all seats</span>}
                </div>
                <h4 className="font-bold text-gray-900">{p.name}</h4>
                {p.note && <p className="text-xs text-gray-500 mt-1 flex-1">{p.note}</p>}
                {can_manage && !p.pushed_to_all && (
                  <button disabled={busy === p.id} onClick={() => pushPlay(p.id)} className="mt-4 w-full text-xs font-semibold text-white py-2 rounded-lg disabled:opacity-50" style={{ background: BRAND }}>Push to all seats</button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function Kpi({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div className={`rounded-2xl border p-5 ${accent ? 'text-white' : 'bg-white border-gray-200'}`} style={accent ? { background: BRAND, borderColor: BRAND } : undefined}>
      <p className={`text-xs font-semibold uppercase tracking-wide ${accent ? 'text-white/70' : 'text-gray-400'}`}>{label}</p>
      <p className={`text-3xl font-bold mt-1 tracking-tight ${accent ? 'text-white' : 'text-gray-900'}`}>{value}</p>
      {sub && <p className={`text-xs mt-1 ${accent ? 'text-white/70' : 'text-gray-400'}`}>{sub}</p>}
    </div>
  )
}
