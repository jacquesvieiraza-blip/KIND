'use client'

/**
 * PARTNER PORTAL v2 — VISUAL PREVIEW (item 200 + 221/222/223)
 * ----------------------------------------------------------------------------
 * A standalone, public, no-login preview of the v2 partner portal so the founder
 * can WALK the design before we wire it to real data.
 *
 * EVERYTHING HERE IS LABELLED DEMO DATA — it is NOT a live partner's numbers.
 * The real-data wiring is item 220 (commission `type` + per-client MRR + USD on
 * `partner_commissions`), a backend slice that needs a migration. This page shows
 * the target UX to the LOCKED comp model: 20% acquisition (one-time) + 5%
 * retention (recurring), all USD. Rates mirror comp-engine.ts.
 */

import type { ReactNode } from 'react'
import {
  Handshake, TrendingUp, Sparkles, Users, AlertTriangle,
  Wallet, ArrowUpRight, Calendar, BadgeCheck, LineChart, Briefcase,
} from 'lucide-react'

const USD = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
const USD2 = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 })

const ACQUISITION_RATE = 0.20 // one-time, first-month MRR  (comp-engine: PARTNER_ACQUISITION)
const RETENTION_RATE   = 0.05 // recurring, active book      (comp-engine: PARTNER_RETENTION)

type Status = 'active' | 'at-risk' | 'churned'

interface BookClient {
  name: string
  mrr: number
  status: Status
  joined: string
}

// ── DEMO BOOK (illustrative — not real) ─────────────────────────────────────
const BOOK: BookClient[] = [
  { name: 'Brightwater Plumbing',   mrr: 267, status: 'active',  joined: 'Jan 2026' },
  { name: 'Apex Electrical',        mrr: 237, status: 'active',  joined: 'Feb 2026' },
  { name: 'Coastal HVAC',           mrr: 267, status: 'active',  joined: 'Feb 2026' },
  { name: 'Summit Locksmiths',      mrr: 207, status: 'active',  joined: 'Mar 2026' },
  { name: 'Lens & Light Studio',    mrr: 237, status: 'active',  joined: 'Mar 2026' },
  { name: 'Northgate Property Mgmt',mrr: 417, status: 'active',  joined: 'Apr 2026' },
  { name: 'Riverside Roofing',      mrr: 177, status: 'at-risk', joined: 'Apr 2026' },
  { name: 'Metro Movers',           mrr: 237, status: 'churned', joined: 'Jan 2026' },
]

const STATUS_STYLES: Record<Status, string> = {
  active:    'bg-emerald-50 text-emerald-700',
  'at-risk': 'bg-amber-50 text-amber-700',
  churned:   'bg-gray-100 text-gray-500',
}

export default function PartnerPortalV2Preview() {
  const paying       = BOOK.filter(c => c.status !== 'churned')          // active + at-risk still pay
  const activeBookMrr = paying.reduce((s, c) => s + c.mrr, 0)
  const recurringMonthly = activeBookMrr * RETENTION_RATE                 // 5% of the living book
  const lifetimeAcqMrr   = BOOK.reduce((s, c) => s + c.mrr, 0)            // every client ever signed
  const lifetimeAcq      = lifetimeAcqMrr * ACQUISITION_RATE              // 20% one-time, lifetime
  const thisMonthAcq     = 417 * ACQUISITION_RATE                        // 1 new client this month (Northgate)
  const atRisk           = BOOK.filter(c => c.status === 'at-risk').length
  const activeCount      = BOOK.filter(c => c.status === 'active').length

  // simple snowball: +2 clients/mo at the book's avg MRR, 4% monthly churn, on the 5%
  const avgMrr = activeBookMrr / paying.length
  const project = (months: number) => {
    let mrr = activeBookMrr
    for (let i = 0; i < months; i++) mrr = mrr * (1 - 0.04) + 2 * avgMrr
    return mrr * RETENTION_RATE
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FAF8FF] to-white">
      {/* DEMO banner */}
      <div className="bg-amber-100 border-b border-amber-200 text-amber-900 text-center text-xs font-semibold py-2 px-4">
        🎨 PARTNER PORTAL v2 — PREVIEW with <span className="underline">sample data</span>. Not real numbers. Real-data wiring = item 220.
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-[#7C3AED] flex items-center justify-center">
            <Handshake className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[#1E1152]">Partner Dashboard</h1>
            <p className="text-sm text-[#7C3AED]/70">Demmy Agency · <span className="inline-flex items-center gap-1"><BadgeCheck className="w-3.5 h-3.5" /> Agency partner</span></p>
          </div>
        </div>

        {/* ── THE HERO: recurring income ──────────────────────────────────── */}
        <div className="rounded-3xl bg-gradient-to-br from-[#7C3AED] to-[#4C1D95] text-white p-7 shadow-lg">
          <div className="flex items-center gap-2 text-white/80 text-sm font-medium mb-1">
            <TrendingUp className="w-4 h-4" /> Your monthly recurring income
          </div>
          <div className="flex items-end gap-3">
            <p className="text-5xl font-extrabold tracking-tight">{USD2.format(recurringMonthly)}<span className="text-2xl font-bold text-white/70">/mo</span></p>
            <span className="inline-flex items-center gap-1 text-emerald-300 text-sm font-semibold mb-2">
              <ArrowUpRight className="w-4 h-4" /> grows every month they stay
            </span>
          </div>
          <p className="text-white/70 text-sm mt-2">
            <span className="font-semibold text-white">5%</span> of your active book ({USD.format(activeBookMrr)}/mo across {paying.length} live clients). Keep clients alive → this number compounds.
          </p>
        </div>

        {/* ── EARNINGS SPLIT ──────────────────────────────────────────────── */}
        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl border border-purple-100 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-[#7C3AED]" />
              <span className="text-xs font-semibold text-[#7C3AED]/60 uppercase tracking-wider">Acquisition · 20% one-time</span>
            </div>
            <div className="flex items-baseline justify-between">
              <div>
                <p className="text-xs text-gray-400">This month</p>
                <p className="text-2xl font-bold text-[#1E1152]">{USD.format(thisMonthAcq)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-400">Lifetime</p>
                <p className="text-2xl font-bold text-[#1E1152]">{USD.format(lifetimeAcq)}</p>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-3">20% of each new client&apos;s first-month bill, paid once when they sign.</p>
          </div>

          <div className="bg-white rounded-2xl border border-emerald-100 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-4 h-4 text-emerald-500" />
              <span className="text-xs font-semibold text-emerald-600/70 uppercase tracking-wider">Retention · 5% recurring</span>
            </div>
            <div className="flex items-baseline justify-between">
              <div>
                <p className="text-xs text-gray-400">This month</p>
                <p className="text-2xl font-bold text-emerald-600">{USD2.format(recurringMonthly)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-400">Active book</p>
                <p className="text-2xl font-bold text-[#1E1152]">{USD.format(activeBookMrr)}<span className="text-sm text-gray-400">/mo</span></p>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-3">5% of your living book, every month each client stays. Earned when we collect — no clawback.</p>
          </div>
        </div>

        {/* ── STAT ROW ────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard icon={<Users className="w-4 h-4 text-[#7C3AED]" />} label="Active clients" value={String(activeCount)} />
          <StatCard icon={<AlertTriangle className="w-4 h-4 text-amber-500" />} label="At risk" value={String(atRisk)} sub="save them → protect your 5%" />
          <StatCard icon={<Wallet className="w-4 h-4 text-emerald-500" />} label="Lifetime earned" value={USD.format(lifetimeAcq + recurringMonthly * 6)} />
          <StatCard icon={<Calendar className="w-4 h-4 text-[#7C3AED]" />} label="Next payout" value="1 Jul" sub={USD2.format(recurringMonthly + thisMonthAcq)} />
        </div>

        {/* ── THE BOOK ────────────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-purple-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-purple-50 flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-[#7C3AED]" />
            <h2 className="font-semibold text-[#1E1152] text-sm">Your book — {paying.length} live clients, the asset you&apos;re building</h2>
          </div>
          <div className="divide-y divide-purple-50">
            {BOOK.map((c) => (
              <div key={c.name} className="px-5 py-3 flex items-center gap-3 text-sm">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-[#1E1152] truncate">{c.name}</p>
                  <p className="text-xs text-gray-400">joined {c.joined}</p>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_STYLES[c.status]}`}>{c.status}</span>
                <div className="w-24 text-right">
                  <p className="text-[#1E1152] font-medium">{USD.format(c.mrr)}<span className="text-xs text-gray-400">/mo</span></p>
                  <p className="text-xs text-gray-400">their plan</p>
                </div>
                <div className="w-28 text-right">
                  <p className={`font-semibold ${c.status === 'churned' ? 'text-gray-300' : 'text-emerald-600'}`}>
                    {c.status === 'churned' ? '—' : `${USD2.format(c.mrr * RETENTION_RATE)}/mo`}
                  </p>
                  <p className="text-xs text-gray-400">earns you</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── FORECASTER teaser (item 213) ────────────────────────────────── */}
        <div className="rounded-2xl border border-purple-100 bg-[#FAF8FF] p-5">
          <div className="flex items-center gap-2 mb-3">
            <LineChart className="w-4 h-4 text-[#7C3AED]" />
            <h2 className="font-semibold text-[#1E1152] text-sm">Where your recurring income is headed</h2>
            <span className="ml-auto text-xs text-[#7C3AED]/50">item 213 · forecaster</span>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            {[6, 12, 24].map((m) => (
              <div key={m} className="bg-white rounded-xl border border-purple-50 p-3">
                <p className="text-xs text-gray-400">in {m} months</p>
                <p className="text-xl font-bold text-emerald-600">{USD2.format(project(m))}<span className="text-xs text-gray-400">/mo</span></p>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-3 text-center">At ~2 new clients/month and 4% churn — the snowball that 5%-on-a-living-book creates.</p>
        </div>

        <p className="text-center text-xs text-gray-400 pt-2 pb-8">
          Demo data — a real partner sees their own numbers here. Earned-when-collected · no clawback · 20% acquisition + 5% retention (locked).
        </p>
      </div>
    </div>
  )
}

function StatCard({ icon, label, value, sub }: { icon: ReactNode; label: string; value: string; sub?: string }) {
  return (
    <div className="bg-white rounded-2xl border border-purple-100 shadow-sm p-4">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-xs font-semibold text-[#7C3AED]/60 uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-2xl font-bold text-[#1E1152]">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  )
}
