'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  Handshake, Clock, CheckCircle2, DollarSign, Loader2, XCircle,
  Briefcase, TrendingUp, AlertCircle, CreditCard, Monitor,
} from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Partner {
  id: string
  name: string
  company: string | null
  country: string | null
  partner_type: string | null
  referral_code: string | null
  tier: string | null
  status: string
  referral_count: number
  total_paid_zar: number
  created_at: string
  demo_env_id: string | null
}

interface Deal {
  id: string
  partner_id: string
  company_name: string
  contact_name: string
  contact_email: string
  industry: string | null
  country: string | null
  estimated_value: number | null
  protected_until: string | null
  status: string
  won_at: string | null
  lost_at: string | null
  created_at: string
  partners: { name: string; company: string | null; email: string; tier: string | null } | null
}

interface Commission {
  id: string
  partner_id: string
  period_month: string
  amount_zar: number
  amount_usd: number | null
  status: string
  wise_reference: string | null
  paid_at: string | null
  created_at: string
  partners: { name: string; company: string | null; email: string; tier: string | null } | null
}

type Tab = 'partners' | 'deals' | 'commissions' | 'onboarding'

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatZAR(amount: number | null | undefined): string {
  if (amount == null) return 'R 0'
  return `R ${Number(amount).toLocaleString('en-ZA', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

function formatPeriod(yyyyMm: string): string {
  try {
    const [y, m] = yyyyMm.split('-')
    return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString('en-ZA', { month: 'short', year: 'numeric' })
  } catch {
    return yyyyMm
  }
}

function daysUntil(iso: string | null): number | null {
  if (!iso) return null
  const diff = new Date(iso).getTime() - Date.now()
  return Math.ceil(diff / 86400000)
}

// ── Badge components ──────────────────────────────────────────────────────────

function PartnerStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    active:    'bg-emerald-50 text-emerald-700 border-emerald-200',
    pending:   'bg-amber-50 text-amber-700 border-amber-200',
    suspended: 'bg-red-50 text-red-600 border-red-200',
  }
  const icon: Record<string, string> = { active: '●', pending: '◐', suspended: '✕' }
  const cls = map[status] ?? 'bg-gray-100 text-gray-400 border-gray-200'
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${cls}`}>
      {icon[status] ?? '○'} {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  )
}

function DealStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending:  'bg-amber-50 text-amber-700 border-amber-200',
    approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    won:      'bg-yellow-50 text-yellow-700 border-yellow-200',
    lost:     'bg-red-50 text-red-600 border-red-200',
    expired:  'bg-gray-100 text-gray-400 border-gray-200',
  }
  const cls = map[status] ?? 'bg-gray-100 text-gray-400 border-gray-200'
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${cls}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  )
}

function CommissionStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending:   'bg-amber-50 text-amber-700 border-amber-200',
    approved:  'bg-blue-50 text-blue-700 border-blue-200',
    paid:      'bg-emerald-50 text-emerald-700 border-emerald-200',
    cancelled: 'bg-red-50 text-red-600 border-red-200',
  }
  const cls = map[status] ?? 'bg-gray-100 text-gray-400 border-gray-200'
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${cls}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  )
}

// ── Toast ─────────────────────────────────────────────────────────────────────

interface ToastState { message: string; ok: boolean }

// ── Main page ─────────────────────────────────────────────────────────────────

export default function PartnersPage() {
  const [activeTab, setActiveTab] = useState<Tab>('partners')
  const [partners, setPartners] = useState<Partner[]>([])
  const [deals, setDeals] = useState<Deal[]>([])
  const [commissions, setCommissions] = useState<Commission[]>([])
  const [loading, setLoading] = useState(true)
  const [migrationError, setMigrationError] = useState<string | null>(null)
  const [toast, setToast] = useState<ToastState | null>(null)

  // Per-row action loading states
  const [partnerLoading, setPartnerLoading] = useState<Record<string, 'approve' | 'reject' | 'sandbox' | null>>({})
  const [dealLoading, setDealLoading] = useState<Record<string, string | null>>({})
  const [commissionLoading, setCommissionLoading] = useState<Record<string, string | null>>({})

  // Wise reference input state: commissionId -> string or null (closed)
  const [wiseInput, setWiseInput] = useState<Record<string, string | undefined>>({})

  function showToast(message: string, ok: boolean) {
    setToast({ message, ok })
    setTimeout(() => setToast(null), 5000)
  }

  const fetchAll = useCallback(async () => {
    setLoading(true)
    setMigrationError(null)
    try {
      const [pRes, dRes, cRes] = await Promise.all([
        fetch('/api/proxy/partners/admin/list'),
        fetch('/api/proxy/partners/admin/deals'),
        fetch('/api/proxy/partners/admin/commissions'),
      ])

      const [pJson, dJson, cJson] = await Promise.all([
        pRes.json().catch(() => ({})),
        dRes.json().catch(() => ({})),
        cRes.json().catch(() => ({})),
      ])

      // Surface non-ok responses as visible errors
      if (!pRes.ok) {
        const msg = pJson?.error || pJson?.message || `HTTP ${pRes.status}`
        if (pRes.status === 401) { setMigrationError('Admin key not configured — check ADMIN_SECRET_KEY env var.'); setLoading(false); return }
        if (msg.includes('42P01') || msg.includes('does not exist')) { setMigrationError('Partners tables not yet migrated — run 20260601_partners.sql.'); setLoading(false); return }
        setMigrationError(`Partners API error: ${msg}`)
        setLoading(false)
        return
      }

      setPartners((pJson?.data ?? []) as Partner[])
      setDeals((dJson?.data ?? []) as Deal[])
      setCommissions((cJson?.commissions ?? []) as Commission[])
    } catch (err) {
      showToast('Failed to load partner data', false)
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  // ── Partner actions ─────────────────────────────────────────────────────────

  async function handlePartnerAction(partnerId: string, partnerName: string, action: 'approve' | 'reject') {
    const verb = action === 'approve' ? 'Approve' : 'Reject (suspend)'
    if (!window.confirm(`${verb} ${partnerName}?`)) return
    setPartnerLoading(prev => ({ ...prev, [partnerId]: action }))
    try {
      const body = action === 'approve' ? {} : { status: 'suspended' }
      const res = await fetch(`/api/proxy/partners/admin/${partnerId}/approve`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        showToast(`${partnerName} ${action === 'approve' ? 'approved' : 'rejected'}`, true)
        await fetchAll()
      } else {
        showToast((data as { error?: string }).error || `Failed to ${action} partner`, false)
      }
    } catch {
      showToast('Network error', false)
    }
    setPartnerLoading(prev => ({ ...prev, [partnerId]: null }))
  }

  async function handleProvisionSandbox(partnerId: string, partnerName: string) {
    if (!window.confirm(`Provision demo sandbox for ${partnerName}?`)) return
    setPartnerLoading(prev => ({ ...prev, [partnerId]: 'sandbox' }))
    try {
      const res = await fetch(`/api/proxy/partners/admin/${partnerId}/provision-sandbox`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        const d = data as { already_provisioned?: boolean }
        showToast(d.already_provisioned ? 'Sandbox already exists' : `Sandbox provisioned for ${partnerName}`, true)
        await fetchAll()
      } else {
        showToast((data as { error?: string }).error || 'Failed to provision sandbox', false)
      }
    } catch {
      showToast('Network error', false)
    }
    setPartnerLoading(prev => ({ ...prev, [partnerId]: null }))
  }

  // ── Deal actions ────────────────────────────────────────────────────────────

  async function handleDealAction(dealId: string, status: string) {
    setDealLoading(prev => ({ ...prev, [dealId]: status }))
    try {
      const res = await fetch(`/api/proxy/partners/admin/deals/${dealId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        showToast(`Deal marked as ${status}`, true)
        await fetchAll()
      } else {
        showToast((data as { error?: string }).error || 'Failed to update deal', false)
      }
    } catch {
      showToast('Network error', false)
    }
    setDealLoading(prev => ({ ...prev, [dealId]: null }))
  }

  // ── Commission actions ──────────────────────────────────────────────────────

  async function handleCommissionAction(commissionId: string, status: string, wiseRef?: string) {
    setCommissionLoading(prev => ({ ...prev, [commissionId]: status }))
    try {
      const body: Record<string, unknown> = { status }
      if (status === 'paid' && wiseRef) body.wise_reference = wiseRef
      const res = await fetch(`/api/proxy/partners/admin/commissions/${commissionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        showToast(`Commission marked as ${status}`, true)
        setWiseInput(prev => { const n = { ...prev }; delete n[commissionId]; return n })
        await fetchAll()
      } else {
        showToast((data as { error?: string }).error || 'Failed to update commission', false)
      }
    } catch {
      showToast('Network error', false)
    }
    setCommissionLoading(prev => ({ ...prev, [commissionId]: null }))
  }

  // ── Derived stats ───────────────────────────────────────────────────────────

  const pending = partners.filter(p => p.status === 'pending')
  const active  = partners.filter(p => p.status === 'active')
  const totalPaidZar = partners.reduce((s, p) => s + (p.total_paid_zar || 0), 0)

  const unpaidCommissions = commissions.filter(c => c.status === 'pending' || c.status === 'approved')
  const unpaidTotal = unpaidCommissions.reduce((s, c) => s + Number(c.amount_zar || 0), 0)

  // ── Render ──────────────────────────────────────────────────────────────────

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: 'partners',    label: 'Partners',    count: partners.length },
    { id: 'deals',       label: 'Deals',       count: deals.length },
    { id: 'commissions', label: 'Commissions', count: commissions.length },
    { id: 'onboarding',  label: 'Onboarding' },
  ]

  return (
    <div className="px-8 py-6 max-w-6xl mx-auto space-y-6">

      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-2xl text-sm font-medium shadow-xl border flex items-center gap-2 transition-all ${
          toast.ok
            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
            : 'bg-red-50 text-red-800 border-red-200'
        }`}>
          {toast.ok ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <XCircle className="w-4 h-4 shrink-0" />}
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-3">
        <Handshake className="w-7 h-7 text-[#7C3AED]" />
        <h1 className="text-2xl font-bold text-gray-900">Partner Management</h1>
      </div>

      {/* Migration error banner */}
      {migrationError && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800">{migrationError}</p>
            <p className="text-xs text-amber-600 mt-0.5">
              Once the migrations are applied, this page will populate automatically.
            </p>
          </div>
        </div>
      )}

      {/* Tab pills */}
      <div className="flex gap-2 border-b border-purple-100 pb-0">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-t-xl text-sm font-semibold transition-colors border-b-2 -mb-px ${
              activeTab === tab.id
                ? 'bg-white border-[#7C3AED] text-[#7C3AED]'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span className={`px-1.5 py-0.5 rounded-full text-xs font-bold ${
                activeTab === tab.id ? 'bg-[#7C3AED]/10 text-[#7C3AED]' : 'bg-gray-100 text-gray-500'
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-20 text-gray-400">
          <Loader2 className="w-8 h-8 animate-spin mr-3" />
          <span className="text-sm">Loading partner data…</span>
        </div>
      )}

      {/* ── Tab: Partners ──────────────────────────────────────────────────── */}
      {!loading && !migrationError && activeTab === 'partners' && (
        <div className="space-y-6">

          {/* Stats row */}
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: 'Total Partners',    value: partners.length,    icon: Handshake,    color: 'text-[#7C3AED]' },
              { label: 'Pending Approval',  value: pending.length,     icon: Clock,        color: 'text-amber-600' },
              { label: 'Active',            value: active.length,      icon: CheckCircle2, color: 'text-emerald-600' },
              { label: 'Commissions Paid',  value: formatZAR(totalPaidZar), icon: DollarSign,  color: 'text-gray-700' },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="bg-white rounded-2xl border border-purple-100 shadow-sm p-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center shrink-0">
                  <Icon className={`w-4 h-4 ${color}`} />
                </div>
                <div>
                  <p className={`text-xl font-bold ${color}`}>{value}</p>
                  <p className="text-xs text-gray-500">{label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Pending approval cards */}
          {pending.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-base font-semibold text-gray-800 flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-500" />
                Pending Approval
                <span className="ml-1 px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700">
                  {pending.length}
                </span>
              </h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {pending.map(partner => {
                  const pl = partnerLoading[partner.id]
                  return (
                    <div key={partner.id} className="bg-white rounded-2xl border border-amber-100 shadow-sm p-5 space-y-3">
                      <div>
                        <p className="font-semibold text-gray-900">{partner.name}</p>
                        {partner.company && <p className="text-sm text-gray-500">{partner.company}</p>}
                      </div>
                      <div className="flex flex-wrap gap-2 text-xs text-gray-500">
                        {partner.country && (
                          <span className="bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-full">{partner.country}</span>
                        )}
                        {partner.partner_type && (
                          <span className="bg-purple-50 border border-purple-100 px-2 py-0.5 rounded-full text-[#7C3AED]">{partner.partner_type}</span>
                        )}
                        <span className="bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-full">
                          Applied {new Date(partner.created_at).toLocaleDateString('en-ZA')}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handlePartnerAction(partner.id, partner.name, 'approve')}
                          disabled={pl !== null && pl !== undefined}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white transition-colors"
                        >
                          {pl === 'approve' ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                          Approve
                        </button>
                        <button
                          onClick={() => handlePartnerAction(partner.id, partner.name, 'reject')}
                          disabled={pl !== null && pl !== undefined}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white hover:bg-red-50 border border-red-200 text-red-600 disabled:opacity-60 transition-colors"
                        >
                          {pl === 'reject' ? <Loader2 className="w-3 h-3 animate-spin" /> : <XCircle className="w-3 h-3" />}
                          Reject
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Active partners table */}
          <div className="bg-white rounded-2xl border border-purple-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-purple-50 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <h2 className="text-sm font-semibold text-gray-800">Active Partners</h2>
              <span className="ml-auto px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700">{active.length}</span>
            </div>
            {active.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <Handshake className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No active partners yet</p>
                <p className="text-xs mt-1 text-gray-300">Approved partners will appear here</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-purple-100">
                      {['Partner', 'Company', 'Country', 'Tier', 'Referral Code', 'Clients', 'Earned', 'Sandbox', 'Status', ''].map(h => (
                        <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-purple-50">
                    {active.map(partner => (
                      <tr key={partner.id} className="hover:bg-purple-50/30 transition-colors">
                        <td className="px-5 py-3 font-medium text-gray-900">{partner.name}</td>
                        <td className="px-5 py-3 text-gray-600">{partner.company || <span className="text-gray-400">—</span>}</td>
                        <td className="px-5 py-3 text-gray-600">{partner.country || <span className="text-gray-400">—</span>}</td>
                        <td className="px-5 py-3">
                          {partner.tier
                            ? <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[#7C3AED]/10 text-[#7C3AED]">{partner.tier}</span>
                            : <span className="text-gray-400 text-xs">—</span>
                          }
                        </td>
                        <td className="px-5 py-3">
                          {partner.referral_code
                            ? <code className="text-xs bg-gray-100 border border-gray-200 px-2 py-0.5 rounded font-mono">{partner.referral_code}</code>
                            : <span className="text-gray-400 text-xs">—</span>
                          }
                        </td>
                        <td className="px-5 py-3 text-gray-700 font-medium">{partner.referral_count ?? 0}</td>
                        <td className="px-5 py-3 text-gray-700 font-medium">{formatZAR(partner.total_paid_zar)}</td>
                        <td className="px-5 py-3">
                          {partner.demo_env_id ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700">
                              <Monitor className="w-3 h-3" /> Live
                            </span>
                          ) : (
                            <button
                              onClick={() => handleProvisionSandbox(partner.id, partner.name)}
                              disabled={!!partnerLoading[partner.id]}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 hover:bg-amber-100 disabled:opacity-60 transition-colors"
                            >
                              {partnerLoading[partner.id] === 'sandbox'
                                ? <Loader2 className="w-3 h-3 animate-spin" />
                                : <Monitor className="w-3 h-3" />}
                              Provision
                            </button>
                          )}
                        </td>
                        <td className="px-5 py-3"><PartnerStatusBadge status={partner.status} /></td>
                        <td className="px-5 py-3">
                          <Link href={`/partners/${partner.id}`} className="text-xs text-[#7C3AED] hover:text-purple-800 font-semibold">
                            View →
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Empty state */}
          {partners.length === 0 && (
            <div className="bg-white rounded-2xl border border-purple-100 shadow-sm text-center py-20 text-gray-400">
              <Handshake className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p className="text-sm font-medium">No partners yet</p>
              <p className="text-xs mt-1">Partners who apply will appear here for approval</p>
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Deals ─────────────────────────────────────────────────────── */}
      {!loading && !migrationError && activeTab === 'deals' && (
        <div className="space-y-4">

          <div className="flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-[#7C3AED]" />
            <h2 className="text-base font-semibold text-gray-800">Deal Registrations</h2>
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-[#7C3AED]/10 text-[#7C3AED]">{deals.length}</span>
          </div>

          <div className="bg-white rounded-2xl border border-purple-100 shadow-sm overflow-hidden">
            {deals.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <Briefcase className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No deals registered yet</p>
                <p className="text-xs mt-1 text-gray-300">Partners will register deals through their portal</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-purple-100">
                      {['Partner', 'Prospect Company', 'Contact', 'Industry', 'Country', 'Est. Value', 'Protection', 'Status', 'Actions'].map(h => (
                        <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-purple-50">
                    {deals.map(deal => {
                      const dl = dealLoading[deal.id]
                      const daysLeft = daysUntil(deal.protected_until)
                      const isProtected = daysLeft !== null && daysLeft > 0
                      return (
                        <tr key={deal.id} className="hover:bg-purple-50/30 transition-colors">
                          <td className="px-5 py-3">
                            <p className="font-medium text-gray-900">{deal.partners?.name ?? '—'}</p>
                            {deal.partners?.company && <p className="text-xs text-gray-400">{deal.partners.company}</p>}
                          </td>
                          <td className="px-5 py-3 font-medium text-gray-900">{deal.company_name}</td>
                          <td className="px-5 py-3">
                            <p className="text-gray-700">{deal.contact_name}</p>
                            <p className="text-xs text-gray-400">{deal.contact_email}</p>
                          </td>
                          <td className="px-5 py-3 text-gray-600">{deal.industry || <span className="text-gray-400">—</span>}</td>
                          <td className="px-5 py-3 text-gray-600">{deal.country || <span className="text-gray-400">—</span>}</td>
                          <td className="px-5 py-3 text-gray-700 font-medium">
                            {deal.estimated_value ? formatZAR(deal.estimated_value) : <span className="text-gray-400">—</span>}
                          </td>
                          <td className="px-5 py-3">
                            {isProtected ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                                {daysLeft}d left
                              </span>
                            ) : deal.protected_until ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-400 border border-gray-200">
                                Expired
                              </span>
                            ) : (
                              <span className="text-gray-400 text-xs">—</span>
                            )}
                          </td>
                          <td className="px-5 py-3"><DealStatusBadge status={deal.status} /></td>
                          <td className="px-5 py-3">
                            <div className="flex gap-1.5 flex-wrap">
                              {deal.status === 'pending' && (
                                <button
                                  onClick={() => handleDealAction(deal.id, 'approved')}
                                  disabled={dl !== null && dl !== undefined}
                                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-60 transition-colors"
                                >
                                  {dl === 'approved' ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                                  Approve
                                </button>
                              )}
                              {deal.status === 'approved' && (
                                <>
                                  <button
                                    onClick={() => handleDealAction(deal.id, 'won')}
                                    disabled={dl !== null && dl !== undefined}
                                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-yellow-500 hover:bg-yellow-600 text-white disabled:opacity-60 transition-colors"
                                  >
                                    {dl === 'won' ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                                    Mark Won
                                  </button>
                                  <button
                                    onClick={() => handleDealAction(deal.id, 'lost')}
                                    disabled={dl !== null && dl !== undefined}
                                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-white hover:bg-red-50 border border-red-200 text-red-600 disabled:opacity-60 transition-colors"
                                  >
                                    {dl === 'lost' ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                                    Mark Lost
                                  </button>
                                </>
                              )}
                              {(deal.status === 'won' || deal.status === 'lost') && (
                                <span className="text-xs text-gray-400 italic">
                                  {deal.status === 'won' && deal.won_at
                                    ? `Won ${new Date(deal.won_at).toLocaleDateString('en-ZA')}`
                                    : deal.status === 'lost' && deal.lost_at
                                    ? `Lost ${new Date(deal.lost_at).toLocaleDateString('en-ZA')}`
                                    : '—'}
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Tab: Commissions ───────────────────────────────────────────────── */}
      {!loading && !migrationError && activeTab === 'commissions' && (
        <div className="space-y-4">

          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-[#7C3AED]" />
            <h2 className="text-base font-semibold text-gray-800">Commissions</h2>
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-[#7C3AED]/10 text-[#7C3AED]">{commissions.length}</span>
          </div>

          <div className="bg-white rounded-2xl border border-purple-100 shadow-sm overflow-hidden">
            {commissions.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <TrendingUp className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No commissions recorded yet</p>
                <p className="text-xs mt-1 text-gray-300">Commissions are created automatically when clients pay</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-purple-100">
                      {['Partner', 'Company', 'Period', 'Amount ZAR', 'Amount USD', 'Status', 'Wise Ref', 'Paid Date', 'Actions'].map(h => (
                        <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-purple-50">
                    {commissions.map(commission => {
                      const cl = commissionLoading[commission.id]
                      const wiseOpen = wiseInput[commission.id] !== undefined
                      const wiseVal = wiseInput[commission.id] ?? ''
                      return (
                        <tr key={commission.id} className="hover:bg-purple-50/30 transition-colors">
                          <td className="px-5 py-3">
                            <p className="font-medium text-gray-900">{commission.partners?.name ?? '—'}</p>
                          </td>
                          <td className="px-5 py-3 text-gray-600">
                            {commission.partners?.company || <span className="text-gray-400">—</span>}
                          </td>
                          <td className="px-5 py-3 text-gray-700 font-medium">
                            {formatPeriod(commission.period_month)}
                          </td>
                          <td className="px-5 py-3 text-gray-900 font-semibold">
                            {formatZAR(commission.amount_zar)}
                          </td>
                          <td className="px-5 py-3 text-gray-600">
                            {commission.amount_usd != null
                              ? `$${Number(commission.amount_usd).toFixed(2)}`
                              : <span className="text-gray-400">—</span>
                            }
                          </td>
                          <td className="px-5 py-3"><CommissionStatusBadge status={commission.status} /></td>
                          <td className="px-5 py-3">
                            {commission.wise_reference
                              ? <code className="text-xs bg-gray-100 border border-gray-200 px-2 py-0.5 rounded font-mono">{commission.wise_reference}</code>
                              : <span className="text-gray-400 text-xs">—</span>
                            }
                          </td>
                          <td className="px-5 py-3 text-gray-600 text-xs">
                            {commission.paid_at
                              ? new Date(commission.paid_at).toLocaleDateString('en-ZA')
                              : <span className="text-gray-400">—</span>
                            }
                          </td>
                          <td className="px-5 py-3">
                            <div className="flex flex-col gap-1.5">
                              {commission.status === 'pending' && (
                                <button
                                  onClick={() => handleCommissionAction(commission.id, 'approved')}
                                  disabled={cl !== null && cl !== undefined}
                                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-60 transition-colors"
                                >
                                  {cl === 'approved' ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                                  Approve
                                </button>
                              )}
                              {commission.status === 'approved' && !wiseOpen && (
                                <button
                                  onClick={() => setWiseInput(prev => ({ ...prev, [commission.id]: '' }))}
                                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
                                >
                                  Mark Paid
                                </button>
                              )}
                              {commission.status === 'approved' && wiseOpen && (
                                <div className="flex flex-col gap-1 min-w-[180px]">
                                  <input
                                    type="text"
                                    placeholder="Wise reference (optional)"
                                    value={wiseVal}
                                    onChange={e => setWiseInput(prev => ({ ...prev, [commission.id]: e.target.value }))}
                                    className="px-2 py-1 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/30 focus:border-[#7C3AED]"
                                  />
                                  <div className="flex gap-1">
                                    <button
                                      onClick={() => handleCommissionAction(commission.id, 'paid', wiseVal || undefined)}
                                      disabled={cl !== null && cl !== undefined}
                                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-60 transition-colors flex-1"
                                    >
                                      {cl === 'paid' ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                                      Confirm
                                    </button>
                                    <button
                                      onClick={() => setWiseInput(prev => { const n = { ...prev }; delete n[commission.id]; return n })}
                                      className="px-2 py-1 rounded-lg text-xs font-semibold bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                  {/* Total unpaid footer */}
                  {unpaidTotal > 0 && (
                    <tfoot>
                      <tr className="border-t-2 border-purple-100 bg-purple-50/50">
                        <td colSpan={3} className="px-5 py-3 text-sm font-semibold text-gray-700">
                          Total unpaid ({unpaidCommissions.length} commission{unpaidCommissions.length !== 1 ? 's' : ''})
                        </td>
                        <td className="px-5 py-3 text-base font-bold text-[#7C3AED]">
                          {formatZAR(unpaidTotal)}
                        </td>
                        <td colSpan={5} />
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Tab: Onboarding ────────────────────────────────────────────────── */}
      {!loading && activeTab === 'onboarding' && (
        <div className="space-y-6">

          {/* Admin SOP */}
          <div className="bg-white rounded-2xl border border-purple-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-purple-100 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#7C3AED]" />
              <h2 className="text-sm font-semibold text-gray-800">Admin Checklist — When Approving a New Partner</h2>
            </div>
            <div className="px-5 py-4 space-y-3">
              {[
                { step: 1, text: 'Review application in the Partners tab — confirm name, company, country, partner type' },
                { step: 2, text: 'Click Approve on their pending card (triggers approval email automatically)' },
                { step: 3, text: 'Confirm their referral_code has been generated (visible in the Active Partners table)' },
                { step: 4, text: 'In Supabase: confirm partner row has status = active, approved_at is set' },
                { step: 5, text: 'Send a personal welcome message via the portal Messages if appropriate' },
                { step: 6, text: 'Monitor their first deal registration in the Deals tab — approve it within 24 hours' },
                { step: 7, text: 'Month 1: check commission calculation is correct after their first client pays' },
              ].map(({ step, text }) => (
                <div key={step} className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-[#7C3AED]/10 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-[11px] font-bold text-[#7C3AED]">{step}</span>
                  </div>
                  <p className="text-sm text-gray-700">{text}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Partner Journey */}
          <div className="bg-white rounded-2xl border border-purple-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-purple-100 flex items-center gap-2">
              <Handshake className="w-4 h-4 text-[#7C3AED]" />
              <h2 className="text-sm font-semibold text-gray-800">Partner Journey — What They Experience</h2>
            </div>
            <div className="p-5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  {
                    phase: 'Phase 1 — Getting Started',
                    steps: [
                      'Submit application on partners.html',
                      'K.I.N.D reviews (24–48 hrs)',
                      'Approval email sent with login link',
                      'Partner logs into portal with application email',
                    ],
                    color: 'border-amber-200 bg-amber-50',
                    label: 'bg-amber-100 text-amber-700',
                  },
                  {
                    phase: 'Phase 2 — First Activity',
                    steps: [
                      'Sees Getting Started checklist',
                      'Copies referral link',
                      'Registers first deal (60-day protection)',
                      'Accesses demo sandbox for prospect walkthroughs',
                    ],
                    color: 'border-blue-200 bg-blue-50',
                    label: 'bg-blue-100 text-blue-700',
                  },
                  {
                    phase: 'Phase 3 — Earning',
                    steps: [
                      'Client signs up via referral link or deal',
                      'Commission auto-calculated when client pays',
                      'Admin approves and pays via Wise monthly',
                      'Partner tracks all earnings in Partner Hub',
                    ],
                    color: 'border-emerald-200 bg-emerald-50',
                    label: 'bg-emerald-100 text-emerald-700',
                  },
                ].map(({ phase, steps, color, label }) => (
                  <div key={phase} className={`rounded-xl border p-4 ${color}`}>
                    <span className={`inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${label} mb-3`}>
                      {phase}
                    </span>
                    <ul className="space-y-2">
                      {steps.map(s => (
                        <li key={s} className="flex items-start gap-2 text-xs text-gray-700">
                          <CheckCircle2 className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" />
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Commission structure */}
          <div className="bg-white rounded-2xl border border-purple-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-purple-100 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-[#7C3AED]" />
              <h2 className="text-sm font-semibold text-gray-800">Commission Structure Reference</h2>
            </div>
            <div className="p-5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { tier: 'Referral', rate: '20%', note: 'Standard partner tier — introductions and referral links', example: 'R 4,900 plan → R 980/month to partner' },
                  { tier: 'Agency', rate: '25%', note: 'Agencies that manage KIND accounts for their clients', example: 'R 9,900 plan → R 2,475/month to partner' },
                  { tier: 'White-label', rate: '30%', note: 'Tech partners embedding KIND in their own product', example: 'R 19,900 plan → R 5,970/month to partner' },
                ].map(({ tier, rate, note, example }) => (
                  <div key={tier} className="border border-purple-100 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-[#1E1152] text-sm">{tier}</span>
                      <span className="text-xl font-bold text-[#7C3AED]">{rate}</span>
                    </div>
                    <p className="text-xs text-gray-500 mb-2">{note}</p>
                    <p className="text-xs text-emerald-600 font-medium bg-emerald-50 rounded-lg px-3 py-1.5">{example}</p>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-3">All commissions are recurring — paid monthly via Wise on the 1st for the previous month&apos;s active clients.</p>
            </div>
          </div>

        </div>
      )}
    </div>
  )
}
