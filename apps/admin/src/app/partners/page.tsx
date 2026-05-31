export const dynamic = 'force-dynamic'

import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'
import { Handshake, Clock, CheckCircle2, DollarSign } from 'lucide-react'
import PartnerActionButtons from './PartnerActionButtons'

interface Partner {
  id: string
  name: string
  company: string | null
  country: string | null
  partner_type: string | null
  referral_code: string | null
  tier: string | null
  status: string
  clients_referred: number | null
  commission_earned: number | null
  created_at: string
}

async function getPartners(): Promise<{ partners: Partner[]; error: string | null }> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { partners: [], error: 'Supabase credentials not configured' }
  }
  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  )

  try {
    const { data, error } = await db
      .from('partners')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      // Table not found yet
      if (
        error.code === '42P01' ||
        error.message?.includes('does not exist') ||
        error.message?.includes('relation')
      ) {
        return {
          partners: [],
          error: 'Partners table not yet migrated — run 20260601_partners.sql',
        }
      }
      return { partners: [], error: error.message }
    }

    return { partners: (data || []) as Partner[], error: null }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    if (msg.includes('does not exist') || msg.includes('42P01')) {
      return {
        partners: [],
        error: 'Partners table not yet migrated — run 20260601_partners.sql',
      }
    }
    return { partners: [], error: msg }
  }
}

function statusBadge(status: string) {
  switch (status) {
    case 'active':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
          ● Active
        </span>
      )
    case 'pending':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
          ◐ Pending
        </span>
      )
    case 'suspended':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 text-red-600 border border-red-200">
          ✕ Suspended
        </span>
      )
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-400 border border-gray-200">
          ○ {status}
        </span>
      )
  }
}

function formatZAR(amount: number | null): string {
  if (amount === null || amount === undefined) return 'R 0'
  return `R ${amount.toLocaleString('en-ZA', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

export default async function PartnersPage() {
  const { partners, error } = await getPartners()

  const pending = partners.filter(p => p.status === 'pending')
  const active  = partners.filter(p => p.status === 'active')
  const totalCommission = partners.reduce((sum, p) => sum + (p.commission_earned || 0), 0)

  return (
    <div className="px-8 py-6 max-w-6xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900">Partners</h1>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-semibold bg-[#7C3AED]/10 text-[#7C3AED]">
            {partners.length}
          </span>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Partners', value: partners.length, icon: Handshake, color: 'text-[#7C3AED]' },
          { label: 'Pending Approval', value: pending.length,  icon: Clock,        color: 'text-amber-600' },
          { label: 'Active',          value: active.length,   icon: CheckCircle2, color: 'text-emerald-600' },
          { label: 'Commissions Paid', value: formatZAR(totalCommission), icon: DollarSign, color: 'text-gray-700' },
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

      {/* Migration error banner */}
      {error && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 flex items-start gap-3">
          <span className="text-amber-500 text-lg shrink-0">⚠</span>
          <div>
            <p className="text-sm font-semibold text-amber-800">{error}</p>
            <p className="text-xs text-amber-600 mt-0.5">
              The partners management feature requires a database migration. Once the migration runs, this page will populate automatically.
            </p>
          </div>
        </div>
      )}

      {/* Pending approval section */}
      {!error && pending.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-base font-semibold text-gray-800 flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-500" />
            Pending Approval
            <span className="ml-1 px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700">
              {pending.length}
            </span>
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {pending.map(partner => (
              <div
                key={partner.id}
                className="bg-white rounded-2xl border border-amber-100 shadow-sm p-5 space-y-3"
              >
                <div>
                  <p className="font-semibold text-gray-900">{partner.name}</p>
                  {partner.company && (
                    <p className="text-sm text-gray-500">{partner.company}</p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 text-xs text-gray-500">
                  {partner.country && (
                    <span className="bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-full">
                      {partner.country}
                    </span>
                  )}
                  {partner.partner_type && (
                    <span className="bg-purple-50 border border-purple-100 px-2 py-0.5 rounded-full text-[#7C3AED]">
                      {partner.partner_type}
                    </span>
                  )}
                  <span className="bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-full">
                    Applied {new Date(partner.created_at).toLocaleDateString('en-ZA')}
                  </span>
                </div>
                <PartnerActionButtons partnerId={partner.id} partnerName={partner.name} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active partners table */}
      {!error && (
        <div className="bg-white rounded-2xl border border-purple-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-purple-50 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <h2 className="text-sm font-semibold text-gray-800">Active Partners</h2>
          </div>
          {active.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <Handshake className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No active partners yet</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-purple-100">
                  {[
                    'Partner', 'Company', 'Country', 'Tier',
                    'Referral Code', 'Clients Referred',
                    'Commission Earned', 'Status', 'Actions',
                  ].map(h => (
                    <th
                      key={h}
                      className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-purple-50">
                {active.map(partner => (
                  <tr key={partner.id} className="hover:bg-purple-50/30 transition-colors">
                    <td className="px-5 py-3">
                      <p className="font-medium text-gray-900">{partner.name}</p>
                    </td>
                    <td className="px-5 py-3 text-gray-600">
                      {partner.company || <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-5 py-3 text-gray-600">
                      {partner.country || <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-5 py-3">
                      {partner.tier ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[#7C3AED]/10 text-[#7C3AED]">
                          {partner.tier}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      {partner.referral_code ? (
                        <code className="text-xs bg-gray-100 border border-gray-200 px-2 py-0.5 rounded font-mono">
                          {partner.referral_code}
                        </code>
                      ) : (
                        <span className="text-gray-400 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-gray-700 font-medium">
                      {partner.clients_referred ?? 0}
                    </td>
                    <td className="px-5 py-3 text-gray-700 font-medium">
                      {formatZAR(partner.commission_earned)}
                    </td>
                    <td className="px-5 py-3">
                      {statusBadge(partner.status)}
                    </td>
                    <td className="px-5 py-3">
                      <Link
                        href={`/partners/${partner.id}`}
                        className="text-xs text-[#7C3AED] hover:text-purple-800 font-semibold"
                      >
                        View dashboard →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Empty state when no error and no partners at all */}
      {!error && partners.length === 0 && (
        <div className="bg-white rounded-2xl border border-purple-100 shadow-sm text-center py-20 text-gray-400">
          <Handshake className="w-12 h-12 mx-auto mb-4 opacity-20" />
          <p className="text-sm font-medium">No partners yet</p>
          <p className="text-xs mt-1">Partners who apply will appear here for approval</p>
        </div>
      )}
    </div>
  )
}
