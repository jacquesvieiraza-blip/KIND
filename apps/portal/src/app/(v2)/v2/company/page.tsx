'use client'

/**
 * V2 — COMPANY COMMAND CENTRE (per-rep / company OS)  ·  #88
 * ---------------------------------------------------------------------------
 * GATED PREVIEW. Reachable only by URL (/dashboard/v2/company); not linked from
 * the live dashboard nav, so production is untouched. Data here is SAMPLE data —
 * the real per-rep wiring lands with the staging DB re-architecture (block ②).
 * This is the clickable shell for the founder to see + refine the V2 direction.
 *
 * Source of truth for the design: docs/portal-v2-preview.html §9–§13, §17.
 */

import { useState } from 'react'
import {
  Building2, Users, Coins, TrendingUp, CheckCircle2, XCircle,
  Activity, Crown, AlertTriangle, ChevronRight, Sparkles,
} from 'lucide-react'

const BRAND = '#7C3AED'

// ── Sample data (preview only) ───────────────────────────────────────────────
const COMPANY = { name: 'MaceyLuxe', seats: 3, seatsCap: 10 }

const REPS = [
  { name: 'Amara N.',  emoji: '👩🏽', contacted: 980,   replyPct: 15, positive: 58, booked: 27, credits: 4200, budget: 5000, flag: 'top' as const },
  { name: 'Tunde A.',  emoji: '👨🏾', contacted: 1020,  replyPct: 11, positive: 49, booked: 21, credits: 3600, budget: 5000, flag: null },
  { name: 'Zola M.',   emoji: '👩🏾', contacted: 840,   replyPct: 8,  positive: 34, booked: 14, credits: 4850, budget: 5000, flag: 'attn' as const },
]

const FUNNEL = [
  { label: 'Contacted', value: 2840, pct: 100, color: BRAND },
  { label: 'Opened',    value: 1612, pct: 57,  color: '#a78bfa' },
  { label: 'Replied',   value: 348,  pct: 12,  color: '#c4b5fd' },
  { label: 'Positive',  value: 141,  pct: 5,   color: '#34d399' },
  { label: 'Booked',    value: 62,   pct: 2.2, color: BRAND },
]

const REQUESTS = [
  { rep: 'Zola M.',  emoji: '👩🏾', amount: 2000, reason: 'Q3 telco push — running low mid-campaign', when: '2h ago' },
  { rep: 'Tunde A.', emoji: '👨🏾', amount: 1500, reason: 'New ICP: fintech founders, SA',           when: 'Yesterday' },
]

type Tab = 'command' | 'seats' | 'usage' | 'performance'

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'command',     label: 'Command Centre', icon: <Building2 className="w-4 h-4" /> },
  { id: 'seats',       label: 'Seats',          icon: <Users className="w-4 h-4" /> },
  { id: 'usage',       label: 'Usage & Budget', icon: <Coins className="w-4 h-4" /> },
  { id: 'performance', label: 'Performance',    icon: <TrendingUp className="w-4 h-4" /> },
]

// ── Small building blocks ────────────────────────────────────────────────────
function Kpi({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div className={`rounded-2xl border p-5 ${accent ? 'text-white' : 'bg-white border-gray-200'}`}
      style={accent ? { background: BRAND, borderColor: BRAND } : undefined}>
      <p className={`text-xs font-semibold uppercase tracking-wide ${accent ? 'text-white/70' : 'text-gray-400'}`}>{label}</p>
      <p className={`text-3xl font-bold mt-1 tracking-tight ${accent ? 'text-white' : 'text-gray-900'}`}>{value}</p>
      {sub && <p className={`text-xs mt-1 ${accent ? 'text-white/70' : 'text-gray-400'}`}>{sub}</p>}
    </div>
  )
}

function RepFlag({ flag }: { flag: 'top' | 'attn' | null }) {
  if (flag === 'top')  return <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full"><Crown className="w-3 h-3" /> Top</span>
  if (flag === 'attn') return <span className="inline-flex items-center gap-1 text-[10px] font-bold text-orange-700 bg-orange-50 px-2 py-0.5 rounded-full"><AlertTriangle className="w-3 h-3" /> Needs attention</span>
  return null
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function CompanyCommandCentre() {
  const [tab, setTab] = useState<Tab>('command')

  const totalBooked    = REPS.reduce((s, r) => s + r.booked, 0)
  const totalContacted = REPS.reduce((s, r) => s + r.contacted, 0)
  const totalCredits   = REPS.reduce((s, r) => s + r.credits, 0)
  const totalBudget    = REPS.reduce((s, r) => s + r.budget, 0)
  const avgReply       = Math.round(REPS.reduce((s, r) => s + r.replyPct, 0) / REPS.length)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Preview banner */}
      <div className="flex items-center gap-2 px-6 py-2 text-xs font-semibold text-white" style={{ background: BRAND }}>
        <Sparkles className="w-3.5 h-3.5" />
        V2 PREVIEW · per-rep company OS (#88) · sample data — real per-rep wiring lands with the staging build
      </div>

      <div className="max-w-6xl mx-auto px-6 py-7 space-y-7">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white" style={{ background: BRAND }}>
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{COMPANY.name}</h1>
              <p className="text-sm text-gray-500">Company Command Centre · {COMPANY.seats} of {COMPANY.seatsCap} seats active</p>
            </div>
          </div>
          <button className="flex items-center gap-2 text-sm font-semibold text-white px-4 py-2.5 rounded-xl" style={{ background: BRAND }}>
            <Users className="w-4 h-4" /> Add a rep
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white border border-gray-200 rounded-xl p-1 w-fit">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab === t.id ? 'text-white' : 'text-gray-500 hover:text-gray-800'
              }`}
              style={tab === t.id ? { background: BRAND } : undefined}>
              {t.icon}{t.label}
            </button>
          ))}
        </div>

        {/* ── COMMAND CENTRE ─────────────────────────────────────────────── */}
        {tab === 'command' && (
          <div className="space-y-7">
            <div className="grid grid-cols-4 gap-4">
              <Kpi label="Meetings booked" value={String(totalBooked)} sub="across all reps" accent />
              <Kpi label="Active reps" value={`${COMPANY.seats}`} sub={`${COMPANY.seatsCap - COMPANY.seats} seats free`} />
              <Kpi label="Avg reply rate" value={`${avgReply}%`} sub="company-wide" />
              <Kpi label="Credits used" value={totalCredits.toLocaleString()} sub={`of ${totalBudget.toLocaleString()} budget`} />
            </div>

            {/* Per-rep snapshot */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <h3 className="font-semibold text-gray-900">Every rep, their own FIGSY</h3>
                <button onClick={() => setTab('seats')} className="text-xs font-medium flex items-center gap-1" style={{ color: BRAND }}>
                  Manage seats <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="grid grid-cols-5 gap-2 px-5 py-3 text-[10px] font-bold uppercase tracking-wide text-gray-400 border-b border-gray-50">
                <span>Rep · their FIGSY</span><span>Contacted</span><span>Reply %</span><span>Positive</span><span>Booked</span>
              </div>
              {REPS.map(r => (
                <div key={r.name} className="grid grid-cols-5 gap-2 px-5 py-3.5 items-center border-b border-gray-50 last:border-0">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{r.emoji}</span>
                    <span className="text-sm font-medium text-gray-900">{r.name}</span>
                    <RepFlag flag={r.flag} />
                  </div>
                  <span className="text-sm text-gray-700">{r.contacted.toLocaleString()}</span>
                  <span className={`text-sm font-semibold ${r.replyPct >= 12 ? 'text-emerald-600' : r.replyPct < 10 ? 'text-orange-600' : 'text-gray-700'}`}>{r.replyPct}%</span>
                  <span className="text-sm text-gray-700">{r.positive}</span>
                  <span className="text-sm font-bold text-gray-900">{r.booked}</span>
                </div>
              ))}
            </div>

            {/* Funnel snapshot + pending requests */}
            <div className="grid grid-cols-3 gap-5">
              <div className="col-span-2 bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900">Company funnel</h3>
                  <button onClick={() => setTab('performance')} className="text-xs font-medium flex items-center gap-1" style={{ color: BRAND }}>
                    Full performance <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="space-y-2.5">
                  {FUNNEL.map(f => (
                    <div key={f.label} className="flex items-center gap-3">
                      <span className="text-xs text-gray-500 w-20 shrink-0">{f.label}</span>
                      <div className="flex-1 h-6 bg-gray-100 rounded-lg overflow-hidden">
                        <div className="h-full rounded-lg flex items-center px-2" style={{ width: `${f.pct}%`, background: f.color, minWidth: 44 }}>
                          <span className="text-[11px] font-bold text-white">{f.value.toLocaleString()}</span>
                        </div>
                      </div>
                      <span className="text-xs text-gray-400 w-10 text-right shrink-0">{f.pct}%</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                <h3 className="font-semibold text-gray-900 mb-1">Budget requests</h3>
                <p className="text-xs text-gray-400 mb-4">{REQUESTS.length} awaiting you</p>
                <div className="space-y-3">
                  {REQUESTS.map(req => (
                    <div key={req.rep} className="border border-gray-100 rounded-xl p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-900">{req.emoji} {req.rep}</span>
                        <span className="text-sm font-bold" style={{ color: BRAND }}>+{req.amount.toLocaleString()}</span>
                      </div>
                      <p className="text-xs text-gray-500 mb-2.5">{req.reason}</p>
                      <div className="flex gap-2">
                        <button className="flex-1 text-xs font-semibold text-white py-1.5 rounded-lg" style={{ background: BRAND }}>Approve</button>
                        <button className="flex-1 text-xs font-semibold text-gray-500 bg-gray-100 py-1.5 rounded-lg">Deny</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── SEATS ──────────────────────────────────────────────────────── */}
        {tab === 'seats' && (
          <div className="space-y-5">
            <p className="text-sm text-gray-500">Each seat is one rep with their own autonomous FIGSY — own calendar, own leads, own outreach. One company payment.</p>
            <div className="grid grid-cols-3 gap-5">
              {REPS.map(r => (
                <div key={r.name} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-3xl">{r.emoji}</span>
                    <RepFlag flag={r.flag} />
                  </div>
                  <h3 className="font-bold text-gray-900">{r.name}</h3>
                  <p className="text-xs text-gray-400 mb-4">FIGSY · active</p>
                  <div className="grid grid-cols-2 gap-2 text-center py-3 border-y border-gray-100 mb-4">
                    <div><p className="text-lg font-bold text-gray-900">{r.booked}</p><p className="text-[11px] text-gray-400">Booked</p></div>
                    <div><p className="text-lg font-bold" style={{ color: BRAND }}>{r.replyPct}%</p><p className="text-[11px] text-gray-400">Reply rate</p></div>
                  </div>
                  <div className="text-xs text-gray-500 mb-1 flex justify-between"><span>Credits</span><span>{r.credits.toLocaleString()} / {r.budget.toLocaleString()}</span></div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${(r.credits / r.budget) * 100}%`, background: r.credits / r.budget > 0.9 ? '#ea580c' : BRAND }} />
                  </div>
                </div>
              ))}
              {/* Empty seat */}
              <button className="rounded-2xl border-2 border-dashed border-gray-200 p-5 flex flex-col items-center justify-center text-gray-400 hover:border-gray-300 min-h-[220px]">
                <Users className="w-7 h-7 mb-2" />
                <span className="text-sm font-semibold">Add a rep</span>
                <span className="text-xs">{COMPANY.seatsCap - COMPANY.seats} seats free</span>
              </button>
            </div>
          </div>
        )}

        {/* ── USAGE & BUDGET ─────────────────────────────────────────────── */}
        {tab === 'usage' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-gray-900">Company budget</h3>
                <span className="text-sm text-gray-500">{totalCredits.toLocaleString()} used · {totalBudget.toLocaleString()} allocated</span>
              </div>
              <div className="h-4 bg-gray-100 rounded-full overflow-hidden mb-2">
                <div className="h-full rounded-full" style={{ width: `${(totalCredits / totalBudget) * 100}%`, background: BRAND }} />
              </div>
              <p className="text-xs text-gray-400">Reps request more when they run low. You approve or deny — like an enterprise managing Claude usage.</p>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
              <h3 className="font-semibold text-gray-900 px-5 py-4 border-b border-gray-100">Pending requests</h3>
              {REQUESTS.map(req => (
                <div key={req.rep} className="flex items-center justify-between px-5 py-4 border-b border-gray-50 last:border-0">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{req.emoji}</span>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{req.rep} · <span style={{ color: BRAND }}>+{req.amount.toLocaleString()} credits</span></p>
                      <p className="text-xs text-gray-400">{req.reason} · {req.when}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button className="flex items-center gap-1 text-xs font-semibold text-white px-3 py-1.5 rounded-lg" style={{ background: BRAND }}><CheckCircle2 className="w-3.5 h-3.5" /> Approve</button>
                    <button className="flex items-center gap-1 text-xs font-semibold text-gray-500 bg-gray-100 px-3 py-1.5 rounded-lg"><XCircle className="w-3.5 h-3.5" /> Deny</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── PERFORMANCE ────────────────────────────────────────────────── */}
        {tab === 'performance' && (
          <div className="space-y-6">
            <div className="grid grid-cols-5 gap-3">
              {FUNNEL.map(f => (
                <div key={f.label} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{f.label}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{f.value.toLocaleString()}</p>
                  <div className="h-1.5 rounded-full mt-2.5" style={{ width: `${f.pct}%`, background: f.color, minWidth: 12 }} />
                  <p className="text-[11px] text-gray-400 mt-1.5">{f.pct}%</p>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
              <div className="grid grid-cols-5 gap-2 px-5 py-3 text-[10px] font-bold uppercase tracking-wide text-gray-400 border-b border-gray-100">
                <span>Rep · their FIGSY</span><span>Contacted</span><span>Reply %</span><span>Positive</span><span>Booked</span>
              </div>
              {REPS.map(r => (
                <div key={r.name} className="grid grid-cols-5 gap-2 px-5 py-3.5 items-center border-b border-gray-50 last:border-0">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{r.emoji}</span>
                    <span className="text-sm font-medium text-gray-900">{r.name}</span>
                    <RepFlag flag={r.flag} />
                  </div>
                  <span className="text-sm text-gray-700">{r.contacted.toLocaleString()}</span>
                  <span className={`text-sm font-semibold ${r.replyPct >= 12 ? 'text-emerald-600' : r.replyPct < 10 ? 'text-orange-600' : 'text-gray-700'}`}>{r.replyPct}%</span>
                  <span className="text-sm text-gray-700">{r.positive}</span>
                  <span className="text-sm font-bold text-gray-900">{r.booked}</span>
                </div>
              ))}
              <div className="grid grid-cols-5 gap-2 px-5 py-3.5 items-center bg-gray-50 rounded-b-2xl">
                <span className="text-sm font-bold text-gray-900 flex items-center gap-2"><Activity className="w-4 h-4" style={{ color: BRAND }} /> Company</span>
                <span className="text-sm font-bold text-gray-900">{totalContacted.toLocaleString()}</span>
                <span className="text-sm font-bold text-gray-900">{avgReply}%</span>
                <span className="text-sm font-bold text-gray-900">{REPS.reduce((s, r) => s + r.positive, 0)}</span>
                <span className="text-sm font-bold text-gray-900">{totalBooked}</span>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
