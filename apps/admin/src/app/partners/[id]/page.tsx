'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, Loader2, AlertCircle, CheckCircle2, Clock, DollarSign, Users, Briefcase } from 'lucide-react'

interface Partner {
  id: string
  name: string
  email: string
  company: string | null
  partner_type: string
  status: string
  referral_code: string | null
  approved_at: string | null
  created_at: string
  contract_signed_at: string | null
}

interface Referral {
  id: string
  client_id: string
  client_name: string
  status: string
  first_payment_at: string | null
  created_at: string
}

interface Commission {
  id: string
  period_month: string
  amount_zar: number
  status: string
  created_at: string
  paid_at: string | null
}

interface DashboardData {
  partner: Partner
  referrals: Referral[]
  commissions: Commission[]
  total_earned: number
  total_pending: number
}

function fmt(dt: string | null) {
  if (!dt) return '—'
  return new Date(dt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    active:    'bg-emerald-100 text-emerald-700',
    pending:   'bg-amber-100 text-amber-700',
    approved:  'bg-blue-100 text-blue-700',
    paid:      'bg-emerald-100 text-emerald-700',
    cancelled: 'bg-red-100 text-red-700',
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold capitalize ${map[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {status}
    </span>
  )
}

export default function PartnerDetailPage({ params }: { params: { id: string } }) {
  const [data, setData] = useState<DashboardData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/proxy/partners/admin/${params.id}/dashboard`)
      .then(r => r.json())
      .then(json => {
        if (!json.success) { setError(json.error ?? 'Failed to load'); return }
        setData(json.data)
      })
      .catch(() => setError('Could not connect to API'))
      .finally(() => setLoading(false))
  }, [params.id])

  if (loading) return (
    <div className="flex items-center justify-center h-96">
      <Loader2 className="w-6 h-6 animate-spin text-[#7C3AED]" />
    </div>
  )

  if (error) return (
    <div className="p-8">
      <Link href="/partners" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-6">
        <ArrowLeft className="w-4 h-4" /> Back to Partners
      </Link>
      <div className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
        <AlertCircle className="w-4 h-4 shrink-0" />
        <span className="text-sm">{error}</span>
      </div>
    </div>
  )

  if (!data) return null
  const { partner, referrals, commissions, total_earned, total_pending } = data

  const tierLabel =
    partner.partner_type === 'technology' ? 'White-label' :
    partner.partner_type === 'agency'     ? 'Agency'      : 'Referral'
  const commissionRate =
    partner.partner_type === 'technology' ? '30%' :
    partner.partner_type === 'agency'     ? '25%' : '20%'

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Back */}
      <Link href="/partners" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800">
        <ArrowLeft className="w-4 h-4" /> Back to Partners
      </Link>

      {/* Header */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-xl font-bold text-[#1E1152]">{partner.name}</h1>
              <StatusBadge status={partner.status} />
            </div>
            {partner.company && <p className="text-sm text-gray-500">{partner.company}</p>}
            <p className="text-sm text-gray-400 mt-0.5">{partner.email}</p>
          </div>
          <div className="flex flex-col items-end gap-1 text-right">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-700">
              {tierLabel} · {commissionRate}
            </span>
            {partner.referral_code && (
              <span className="text-xs text-gray-400 font-mono">ref: {partner.referral_code}</span>
            )}
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div><p className="text-[11px] text-gray-400 uppercase tracking-wide mb-0.5">Applied</p><p className="font-medium">{fmt(partner.created_at)}</p></div>
          <div><p className="text-[11px] text-gray-400 uppercase tracking-wide mb-0.5">Approved</p><p className="font-medium">{fmt(partner.approved_at)}</p></div>
          <div><p className="text-[11px] text-gray-400 uppercase tracking-wide mb-0.5">Contract</p><p className="font-medium">{partner.contract_signed_at ? <span className="flex items-center gap-1 text-emerald-600"><CheckCircle2 className="w-3.5 h-3.5" /> Signed</span> : '—'}</p></div>
          <div><p className="text-[11px] text-gray-400 uppercase tracking-wide mb-0.5">Referral link</p><p className="font-mono text-xs text-gray-500 truncate">{partner.referral_code ? `?ref=${partner.referral_code}` : '—'}</p></div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Referred clients', value: referrals.length, icon: Users, color: 'text-blue-600' },
          { label: 'Active referrals', value: referrals.filter(r => r.status === 'active').length, icon: CheckCircle2, color: 'text-emerald-600' },
          { label: 'Total earned (ZAR)', value: `R${total_earned.toLocaleString()}`, icon: DollarSign, color: 'text-purple-600' },
          { label: 'Pending (ZAR)', value: `R${total_pending.toLocaleString()}`, icon: Clock, color: 'text-amber-600' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white border border-gray-200 rounded-xl p-4">
            <Icon className={`w-4 h-4 mb-2 ${color}`} />
            <p className="text-xl font-bold text-[#1E1152]">{value}</p>
            <p className="text-[11px] text-gray-400 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Referrals */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
          <Users className="w-4 h-4 text-[#7C3AED]" />
          <h2 className="font-semibold text-sm text-[#1E1152]">Referred Clients ({referrals.length})</h2>
        </div>
        {referrals.length === 0 ? (
          <p className="text-sm text-gray-400 px-5 py-8 text-center">No referrals yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead><tr className="border-b border-gray-100">{['Client', 'Status', 'First Payment', 'Referred'].map(h => <th key={h} className="px-5 py-3 text-left text-[11px] text-gray-400 font-semibold uppercase tracking-wide">{h}</th>)}</tr></thead>
            <tbody>{referrals.map(r => (
              <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="px-5 py-3 font-medium">{r.client_name}</td>
                <td className="px-5 py-3"><StatusBadge status={r.status} /></td>
                <td className="px-5 py-3 text-gray-500">{fmt(r.first_payment_at)}</td>
                <td className="px-5 py-3 text-gray-400">{fmt(r.created_at)}</td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </div>

      {/* Commissions */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-[#7C3AED]" />
          <h2 className="font-semibold text-sm text-[#1E1152]">Commissions ({commissions.length})</h2>
        </div>
        {commissions.length === 0 ? (
          <p className="text-sm text-gray-400 px-5 py-8 text-center">No commissions yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead><tr className="border-b border-gray-100">{['Period', 'Amount (ZAR)', 'Status', 'Paid'].map(h => <th key={h} className="px-5 py-3 text-left text-[11px] text-gray-400 font-semibold uppercase tracking-wide">{h}</th>)}</tr></thead>
            <tbody>{commissions.map(c => (
              <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="px-5 py-3 font-mono text-xs">{c.period_month}</td>
                <td className="px-5 py-3 font-semibold">R{Number(c.amount_zar).toLocaleString()}</td>
                <td className="px-5 py-3"><StatusBadge status={c.status} /></td>
                <td className="px-5 py-3 text-gray-400">{fmt(c.paid_at)}</td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </div>
    </div>
  )
}
