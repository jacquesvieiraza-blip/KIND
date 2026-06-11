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
  Building2, Users, Coins, TrendingUp, Crown, AlertTriangle,
  CheckCircle2, XCircle, Loader2, Sparkles, Zap, Eye,
} from 'lucide-react'

const BRAND = '#7C3AED'

interface Seat {
  id: string
  email: string
  role: string
  autonomy: 'auto' | 'copilot' | 'off'
  credit_budget: number
  credits_used: number
  seat_active: boolean
  accepted_at: string | null
}
interface CreditRequest { id: string; member_id: string; amount: number; reason: string | null; created_at: string }
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

  const load = useCallback(async (tok: string) => {
    try {
      const [ov, pl] = await Promise.all([
        api.get<{ data: Overview }>('/company/overview', tok),
        api.get<{ data: Play[] }>('/company/winning-plays', tok).catch(() => ({ data: [] as Play[] })),
      ])
      setData(ov.data)
      setPlays(pl.data)
    } catch { setData(null) }
    setLoading(false)
  }, [])

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
  async function pushPlay(id: string) {
    if (!token) return
    setBusy(id)
    try { await api.post(`/company/winning-plays/${id}/push`, {}, token); await load(token) } catch { /* ignore */ }
    setBusy(null)
  }

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-[#7C3AED]" /></div>
  if (!data) return <div className="max-w-md mx-auto text-center py-20 text-gray-500">No company workspace found for your account.</div>

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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Kpi label="Active seats" value={String(totals.active_seats)} sub={`${totals.seats} total`} accent />
            <Kpi label="Company pool" value={totals.company_pool.toLocaleString()} sub="credits left" />
            <Kpi label="Allocated" value={totals.allocated.toLocaleString()} sub="across seats" />
            <Kpi label="Pending requests" value={String(totals.pending_requests)} sub="awaiting you" />
          </div>

          {/* Pending credit requests */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
            <h3 className="font-semibold text-gray-900 px-5 py-4 border-b border-gray-100">Pending credit requests</h3>
            {requests.length === 0 && <p className="px-5 py-6 text-sm text-gray-400">No requests right now.</p>}
            {requests.map(r => {
              const seat = seatById(r.member_id)
              return (
                <div key={r.id} className="flex items-center justify-between px-5 py-4 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{seat ? emailName(seat.email) : 'A rep'} · <span style={{ color: BRAND }}>+{r.amount.toLocaleString()} credits</span></p>
                    {r.reason && <p className="text-xs text-gray-400">{r.reason}</p>}
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
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400">Invite teammates from Settings → Team. Per-rep lead ownership &amp; routing (item 38) and per-rep calendars (item 41) land next.</p>
        </div>
      )}

      {tab === 'usage' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-gray-900">Company budget</h3>
              <span className="text-sm text-gray-500">{totals.used.toLocaleString()} used · {totals.allocated.toLocaleString()} allocated</span>
            </div>
            <div className="h-4 bg-gray-100 rounded-full overflow-hidden mb-2">
              <div className="h-full rounded-full" style={{ width: `${totals.allocated > 0 ? Math.min(100, (totals.used / totals.allocated) * 100) : 0}%`, background: BRAND }} />
            </div>
            <p className="text-xs text-gray-400">Reps request more when they run low. You approve or deny — exactly how an enterprise runs Claude. Hybrid = seat + usage you control.</p>
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
