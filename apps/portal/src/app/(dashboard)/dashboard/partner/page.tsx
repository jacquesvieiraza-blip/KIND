'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { api } from '@/lib/api'
import {
  Handshake, Copy, CheckCircle, ChevronDown, ChevronUp,
  ExternalLink, Users, TrendingUp, Clock, Briefcase,
} from 'lucide-react'

const INDUSTRIES = [
  'Fintech', 'Logistics', 'HealthTech', 'AgriTech',
  'SaaS', 'Professional Services', 'Other',
]

const TIER_LABELS: Record<string, string> = {
  referral:   'Referral',
  agency:     'Agency',
  technology: 'White-label',
}

interface Partner {
  id: string
  name: string
  email: string
  company: string | null
  partner_type: string
  status: string
  referral_code: string | null
  tier?: string
}

interface Referral {
  id: string
  client_id: string
  status: string
  first_payment_at: string | null
  created_at: string
  clients: { company_name: string; contact_name: string; credit_balance: number } | null
}

interface Commission {
  id: string
  period_month: string
  amount_zar: number
  amount_usd: number | null
  status: string
  paid_at: string | null
}

interface Deal {
  id: string
  company_name: string
  contact_name: string
  contact_email: string
  industry: string | null
  country: string | null
  estimated_value: number | null
  status: string
  protected_until: string | null
  created_at: string
}

interface DashboardData {
  partner: Partner
  referrals: Referral[]
  commissions: Commission[]
  deals: Deal[]
  stats: {
    total_clients: number
    total_earned_zar: number
    total_pending_zar: number
    active_deals: number
  }
}

function fmtDate(dt: string | null) {
  if (!dt) return '—'
  return new Date(dt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function fmtZAR(n: number) {
  return `R ${n.toLocaleString('en-ZA', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

function periodLabel(m: string) {
  // m is "2026-06" → "Jun 2026"
  const [year, month] = m.split('-')
  const d = new Date(Number(year), Number(month) - 1, 1)
  return d.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })
}

function StatusBadge({ status, type }: { status: string; type: 'deal' | 'commission' | 'referral' }) {
  const dealMap: Record<string, string> = {
    pending:  'bg-gray-100 text-gray-600',
    approved: 'bg-green-100 text-green-700',
    won:      'bg-yellow-100 text-yellow-700',
    lost:     'bg-red-100 text-red-700',
    expired:  'bg-gray-100 text-gray-500',
  }
  const commMap: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-700',
    paid:    'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-600',
  }
  const refMap: Record<string, string> = {
    active:  'bg-green-100 text-green-700',
    churned: 'bg-red-100 text-red-600',
    pending: 'bg-amber-100 text-amber-700',
  }
  const map = type === 'deal' ? dealMap : type === 'commission' ? commMap : refMap
  const cls = map[status] ?? 'bg-gray-100 text-gray-500'
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold capitalize ${cls}`}>
      {status}
    </span>
  )
}

export default function PartnerPage() {
  const supabase = createClient()
  const [token, setToken] = useState<string | null>(null)
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [notPartner, setNotPartner] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)

  // Deal form state
  const [showDealForm, setShowDealForm] = useState(false)
  const [dealForm, setDealForm] = useState({
    company_name: '', contact_name: '', contact_email: '',
    industry: '', country: '', estimated_value: '', notes: '',
  })
  const [dealSubmitting, setDealSubmitting] = useState(false)
  const [dealSuccess, setDealSuccess] = useState<string | null>(null)
  const [dealError, setDealError] = useState<string | null>(null)

  const [copiedRef, setCopiedRef] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { setLoading(false); return }
      setToken(session.access_token)
      try {
        const result = await api.get<DashboardData>('/partners/me', session.access_token)
        setData(result)
      } catch (err: any) {
        if (err?.status === 404) setNotPartner(true)
        else setFetchError(err?.message ?? 'Failed to load partner dashboard')
      }
      setLoading(false)
    })
  }, [])

  async function handleRegisterDeal(e: React.FormEvent) {
    e.preventDefault()
    if (!token || dealSubmitting) return
    setDealSubmitting(true)
    setDealError(null)
    setDealSuccess(null)
    try {
      await api.post('/partners/deals', {
        company_name:    dealForm.company_name,
        contact_name:    dealForm.contact_name,
        contact_email:   dealForm.contact_email,
        industry:        dealForm.industry || undefined,
        country:         dealForm.country || undefined,
        estimated_value: dealForm.estimated_value ? Number(dealForm.estimated_value) : undefined,
        notes:           dealForm.notes || undefined,
      }, token)
      setDealSuccess(dealForm.company_name)
      setDealForm({ company_name: '', contact_name: '', contact_email: '', industry: '', country: '', estimated_value: '', notes: '' })
      setShowDealForm(false)
      // Refresh data
      const result = await api.get<DashboardData>('/partners/me', token)
      setData(result)
    } catch (err: any) {
      setDealError(err.message ?? 'Failed to register deal')
    }
    setDealSubmitting(false)
  }

  function copyReferralLink() {
    const code = data?.partner.referral_code
    if (!code) return
    navigator.clipboard.writeText(`https://get-kind.com?ref=${code}`).then(() => {
      setCopiedRef(true)
      setTimeout(() => setCopiedRef(false), 2000)
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-[#7C3AED]/40 text-sm">
        Loading partner dashboard…
      </div>
    )
  }

  if (fetchError) {
    return (
      <div className="max-w-lg mx-auto py-20 text-center space-y-3">
        <p className="text-sm font-semibold text-red-600">Could not load partner dashboard</p>
        <p className="text-xs text-gray-400 font-mono bg-gray-50 rounded-lg px-4 py-2">{fetchError}</p>
        <button onClick={() => window.location.reload()} className="text-xs text-[#7C3AED] underline">Retry</button>
      </div>
    )
  }

  if (notPartner) {
    return (
      <div className="max-w-lg mx-auto py-20 text-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-purple-100 flex items-center justify-center mx-auto">
          <Handshake className="w-7 h-7 text-[#7C3AED]" />
        </div>
        <h1 className="text-2xl font-bold text-[#1E1152]">You're not a partner yet</h1>
        <p className="text-sm text-[#7C3AED]/60">
          Join the K.I.N.D Partner Programme to earn commissions, register deals with 60-day protection,
          and get access to a dedicated demo sandbox.
        </p>
        <a
          href="/partners.html"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-sm font-semibold rounded-xl transition-colors shadow-sm"
        >
          Apply to become a partner
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>
    )
  }

  if (!data) return null

  const { partner, referrals, commissions, deals, stats } = data
  const tierLabel = TIER_LABELS[partner.partner_type] ?? partner.partner_type
  const refLink = partner.referral_code ? `https://get-kind.com?ref=${partner.referral_code}` : null

  return (
    <div className="space-y-6 max-w-5xl">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-8 h-8 rounded-xl bg-[#7C3AED] flex items-center justify-center shadow-sm">
              <Handshake className="w-4 h-4 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-[#1E1152]">Partner Dashboard</h1>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#7C3AED]/10 text-[#7C3AED] border border-[#7C3AED]/20">
              {tierLabel}
            </span>
          </div>
          <p className="text-sm text-[#7C3AED]/60">
            Welcome back, {partner.name}{partner.company ? ` · ${partner.company}` : ''}
          </p>
        </div>

        {refLink && (
          <div className="flex items-center gap-2 bg-white border border-purple-100 rounded-xl px-3 py-2 shadow-sm">
            <span className="text-xs text-[#7C3AED]/50 font-medium">Referral link</span>
            <code className="text-xs text-[#1E1152] font-mono">{refLink}</code>
            <button
              onClick={copyReferralLink}
              className="p-1 text-[#7C3AED]/40 hover:text-[#7C3AED] transition-colors"
              title="Copy referral link"
            >
              {copiedRef
                ? <CheckCircle className="w-4 h-4 text-green-500" />
                : <Copy className="w-4 h-4" />}
            </button>
          </div>
        )}
      </div>

      {/* ── Stats row ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white rounded-2xl border border-purple-100 shadow-sm p-4">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-[#7C3AED]" />
            <span className="text-xs font-semibold text-[#7C3AED]/60 uppercase tracking-wider">Clients referred</span>
          </div>
          <p className="text-2xl font-bold text-[#1E1152]">{stats.total_clients}</p>
        </div>
        <div className="bg-white rounded-2xl border border-purple-100 shadow-sm p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-emerald-500" />
            <span className="text-xs font-semibold text-[#7C3AED]/60 uppercase tracking-wider">Earned</span>
          </div>
          <p className="text-2xl font-bold text-emerald-600">{fmtZAR(stats.total_earned_zar)}</p>
        </div>
        <div className="bg-white rounded-2xl border border-purple-100 shadow-sm p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-amber-500" />
            <span className="text-xs font-semibold text-[#7C3AED]/60 uppercase tracking-wider">Pending</span>
          </div>
          <p className="text-2xl font-bold text-amber-600">{fmtZAR(stats.total_pending_zar)}</p>
        </div>
        <div className="bg-white rounded-2xl border border-purple-100 shadow-sm p-4">
          <div className="flex items-center gap-2 mb-2">
            <Briefcase className="w-4 h-4 text-[#7C3AED]" />
            <span className="text-xs font-semibold text-[#7C3AED]/60 uppercase tracking-wider">Active deals</span>
          </div>
          <p className="text-2xl font-bold text-[#1E1152]">{stats.active_deals}</p>
        </div>
      </div>

      {/* ── Register a Deal ──────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-purple-100 shadow-sm overflow-hidden">
        <button
          onClick={() => setShowDealForm(v => !v)}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-purple-50/50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-[#7C3AED]" />
            <span className="font-semibold text-[#1E1152] text-sm">Register a Deal</span>
            <span className="text-xs text-[#7C3AED]/50">60-day protection</span>
          </div>
          {showDealForm
            ? <ChevronUp className="w-4 h-4 text-[#7C3AED]/40" />
            : <ChevronDown className="w-4 h-4 text-[#7C3AED]/40" />}
        </button>

        {dealSuccess && (
          <div className="mx-5 mb-4 px-4 py-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 shrink-0" />
            Deal registered. <strong>{dealSuccess}</strong> is protected for 60 days.
          </div>
        )}

        {showDealForm && (
          <form onSubmit={handleRegisterDeal} className="px-5 pb-5 space-y-4">
            {dealError && (
              <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                {dealError}
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Company name *</label>
                <input
                  type="text"
                  required
                  value={dealForm.company_name}
                  onChange={e => setDealForm(f => ({ ...f, company_name: e.target.value }))}
                  placeholder="Acme Corp"
                  className="w-full border border-purple-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Contact name *</label>
                <input
                  type="text"
                  required
                  value={dealForm.contact_name}
                  onChange={e => setDealForm(f => ({ ...f, contact_name: e.target.value }))}
                  placeholder="Jane Smith"
                  className="w-full border border-purple-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Contact email *</label>
                <input
                  type="email"
                  required
                  value={dealForm.contact_email}
                  onChange={e => setDealForm(f => ({ ...f, contact_email: e.target.value }))}
                  placeholder="jane@acmecorp.com"
                  className="w-full border border-purple-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Industry</label>
                <select
                  value={dealForm.industry}
                  onChange={e => setDealForm(f => ({ ...f, industry: e.target.value }))}
                  className="w-full border border-purple-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED] bg-white"
                >
                  <option value="">Select industry…</option>
                  {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Country</label>
                <input
                  type="text"
                  value={dealForm.country}
                  onChange={e => setDealForm(f => ({ ...f, country: e.target.value }))}
                  placeholder="South Africa"
                  className="w-full border border-purple-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Estimated value (USD)</label>
                <input
                  type="number"
                  min="0"
                  value={dealForm.estimated_value}
                  onChange={e => setDealForm(f => ({ ...f, estimated_value: e.target.value }))}
                  placeholder="5000"
                  className="w-full border border-purple-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Notes</label>
              <textarea
                value={dealForm.notes}
                onChange={e => setDealForm(f => ({ ...f, notes: e.target.value }))}
                rows={2}
                placeholder="Any context about the prospect…"
                className="w-full border border-purple-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED] resize-none"
              />
            </div>
            <button
              type="submit"
              disabled={dealSubmitting}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#7C3AED] hover:bg-[#6D28D9] disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm"
            >
              {dealSubmitting ? 'Registering…' : 'Register Deal — 60-day protection'}
            </button>
          </form>
        )}
      </div>

      {/* ── Registered Deals ─────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-purple-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-purple-100 flex items-center gap-2">
          <Briefcase className="w-4 h-4 text-[#7C3AED]" />
          <h2 className="font-semibold text-[#1E1152] text-sm">Registered Deals</h2>
          <span className="ml-auto text-xs text-[#7C3AED]/50">{deals.length} deal{deals.length !== 1 ? 's' : ''}</span>
        </div>
        {deals.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-gray-400">No deals registered yet — use the form above to protect your prospects.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-purple-50/50">
                <tr>
                  {['Company', 'Contact', 'Industry', 'Country', 'Status', 'Protected until', 'Registered'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-[#7C3AED]/60 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-purple-50">
                {deals.map(d => (
                  <tr key={d.id} className="hover:bg-purple-50/30 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">{d.company_name}</td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                      <div>{d.contact_name}</div>
                      <div className="text-[11px] text-gray-400">{d.contact_email}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{d.industry ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-500">{d.country ?? '—'}</td>
                    <td className="px-4 py-3"><StatusBadge status={d.status} type="deal" /></td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{fmtDate(d.protected_until)}</td>
                    <td className="px-4 py-3 text-gray-400 whitespace-nowrap text-xs">{fmtDate(d.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Referred Clients ─────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-purple-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-purple-100 flex items-center gap-2">
          <Users className="w-4 h-4 text-[#7C3AED]" />
          <h2 className="font-semibold text-[#1E1152] text-sm">Referred Clients</h2>
          <span className="ml-auto text-xs text-[#7C3AED]/50">{referrals.length} client{referrals.length !== 1 ? 's' : ''}</span>
        </div>
        {referrals.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-gray-400">No referred clients yet. Share your referral link to start earning.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-purple-50/50">
                <tr>
                  {['Client name', 'Status', 'First payment', 'Monthly value'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-[#7C3AED]/60 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-purple-50">
                {referrals.map(r => {
                  const clientName = Array.isArray(r.clients)
                    ? (r.clients[0]?.company_name ?? '—')
                    : (r.clients?.company_name ?? '—')
                  const creditBalance = Array.isArray(r.clients)
                    ? (r.clients[0]?.credit_balance ?? null)
                    : (r.clients?.credit_balance ?? null)
                  return (
                    <tr key={r.id} className="hover:bg-purple-50/30 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-900">{clientName}</td>
                      <td className="px-4 py-3"><StatusBadge status={r.status} type="referral" /></td>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{fmtDate(r.first_payment_at)}</td>
                      <td className="px-4 py-3 text-gray-500">
                        {creditBalance != null ? fmtZAR(creditBalance) : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Commission History ────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-purple-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-purple-100 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-[#7C3AED]" />
          <h2 className="font-semibold text-[#1E1152] text-sm">Commission History</h2>
          <span className="ml-auto text-xs text-[#7C3AED]/50">Last 24 months</span>
        </div>
        {commissions.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-gray-400">No commissions recorded yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-purple-50/50">
                <tr>
                  {['Period', 'Amount (ZAR)', 'Status', 'Paid date'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-[#7C3AED]/60 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-purple-50">
                {commissions.map(c => (
                  <tr key={c.id} className="hover:bg-purple-50/30 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">{periodLabel(c.period_month)}</td>
                    <td className="px-4 py-3 text-gray-700 font-mono font-semibold">{fmtZAR(c.amount_zar)}</td>
                    <td className="px-4 py-3"><StatusBadge status={c.status} type="commission" /></td>
                    <td className="px-4 py-3 text-gray-400 whitespace-nowrap text-xs">{fmtDate(c.paid_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Resources ────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-purple-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-purple-100">
          <h2 className="font-semibold text-[#1E1152] text-sm">Partner Resources</h2>
          <p className="text-xs text-[#7C3AED]/50 mt-0.5">Everything you need to sell K.I.N.D</p>
        </div>
        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { label: 'Partner Onboarding Deck',        desc: 'Full product walkthrough and positioning guide', href: '#' },
            { label: 'ICP Templates (Nigeria, SA, UK)', desc: 'Pre-built ideal customer profiles by region',    href: '#' },
            { label: 'Objection Handling Guide',        desc: 'Common objections and winning responses',        href: '#' },
            { label: 'K.I.N.D Brand Kit',               desc: 'Logos, colours, and usage guidelines',           href: '#' },
          ].map(r => (
            <a
              key={r.label}
              href={r.href}
              className="flex items-start gap-3 p-4 rounded-xl border border-purple-100 hover:border-[#7C3AED]/30 hover:bg-purple-50/50 transition-all group"
            >
              <div className="w-8 h-8 rounded-lg bg-[#7C3AED]/10 flex items-center justify-center shrink-0 mt-0.5">
                <ExternalLink className="w-3.5 h-3.5 text-[#7C3AED]" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[#1E1152] group-hover:text-[#7C3AED] transition-colors">{r.label}</p>
                <p className="text-xs text-gray-400 mt-0.5">{r.desc}</p>
              </div>
            </a>
          ))}
        </div>
      </div>

    </div>
  )
}
