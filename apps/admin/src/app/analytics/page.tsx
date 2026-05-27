export const dynamic = 'force-dynamic'

import { createClient } from '@supabase/supabase-js'
import { BarChart2, AlertCircle, TrendingUp, Mail, MessageSquare, Flame, Filter } from 'lucide-react'

interface CampaignRow {
  id: string
  name: string
  status: string | null
  client_id: string
  created_at: string
}

interface ReplyRow {
  id: string
  campaign_id: string
  client_id: string
  is_interested?: boolean | null
}

interface EnrolmentRow {
  campaign_id: string
  client_id: string
}

interface EmailSentRow {
  campaign_id: string
  client_id: string
}

interface ClientRow {
  id: string
  company_name: string | null
}

interface CampaignStat {
  campaign_id: string
  campaign_name: string
  client_id: string
  client_name: string
  status: string
  enrolled: number
  emails_sent: number
  replies: number
  reply_rate: number
  hot_leads: number
}

async function getAnalyticsData(statusFilter?: string) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return null
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  )

  try {
    // Fetch all required data in parallel
    const [
      campaignsResult,
      repliesResult,
      clientsResult,
    ] = await Promise.all([
      supabase.from('figsy_campaigns').select('id, name, status, client_id, created_at').order('created_at', { ascending: false }),
      supabase.from('figsy_replies').select('id, campaign_id, client_id, is_interested'),
      supabase.from('clients').select('id, company_name'),
    ])

    // Handle table-not-found gracefully
    const campaigns: CampaignRow[] = campaignsResult.data ?? []
    const replies: ReplyRow[] = repliesResult.data ?? []
    const clients: ClientRow[] = clientsResult.data ?? []

    // Build lookup maps
    const clientMap: Record<string, string> = {}
    for (const c of clients) {
      clientMap[c.id] = c.company_name ?? c.id
    }

    // Try to get enrolment and email counts from separate tables; fall back to 0
    let enrolmentMap: Record<string, number> = {}
    let emailsSentMap: Record<string, number> = {}

    try {
      const { data: enrolments } = await supabase
        .from('figsy_enrolments')
        .select('campaign_id, client_id')
      for (const row of (enrolments ?? []) as EnrolmentRow[]) {
        const key = row.campaign_id
        enrolmentMap[key] = (enrolmentMap[key] ?? 0) + 1
      }
    } catch {
      // table may not exist yet
    }

    try {
      const { data: emailsSent } = await supabase
        .from('figsy_emails_sent')
        .select('campaign_id, client_id')
      for (const row of (emailsSent ?? []) as EmailSentRow[]) {
        const key = row.campaign_id
        emailsSentMap[key] = (emailsSentMap[key] ?? 0) + 1
      }
    } catch {
      // table may not exist yet
    }

    // Build reply maps
    const replyMap: Record<string, number> = {}
    const hotLeadMap: Record<string, number> = {}
    for (const r of replies) {
      replyMap[r.campaign_id] = (replyMap[r.campaign_id] ?? 0) + 1
      if (r.is_interested) {
        hotLeadMap[r.campaign_id] = (hotLeadMap[r.campaign_id] ?? 0) + 1
      }
    }

    // Build stats per campaign
    let stats: CampaignStat[] = campaigns
      .filter(c => !statusFilter || statusFilter === 'all' || c.status === statusFilter)
      .map(c => {
        const enrolled = enrolmentMap[c.id] ?? 0
        const emails_sent = emailsSentMap[c.id] ?? 0
        const replies_count = replyMap[c.id] ?? 0
        const hot = hotLeadMap[c.id] ?? 0
        const reply_rate = emails_sent > 0 ? (replies_count / emails_sent) * 100 : 0
        return {
          campaign_id: c.id,
          campaign_name: c.name,
          client_id: c.client_id,
          client_name: clientMap[c.client_id] ?? c.client_id,
          status: c.status ?? 'unknown',
          enrolled,
          emails_sent,
          replies: replies_count,
          reply_rate,
          hot_leads: hot,
        }
      })

    // Totals
    const totals = {
      enrolled: stats.reduce((s, r) => s + r.enrolled, 0),
      emails_sent: stats.reduce((s, r) => s + r.emails_sent, 0),
      replies: stats.reduce((s, r) => s + r.replies, 0),
      hot_leads: stats.reduce((s, r) => s + r.hot_leads, 0),
      reply_rate: 0,
    }
    totals.reply_rate = totals.emails_sent > 0 ? (totals.replies / totals.emails_sent) * 100 : 0

    return { stats, totals, tablesMissing: campaigns.length === 0 && campaignsResult.error != null }
  } catch {
    return { stats: [], totals: { enrolled: 0, emails_sent: 0, replies: 0, hot_leads: 0, reply_rate: 0 }, tablesMissing: true }
  }
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    active:    'bg-emerald-50 text-emerald-700 border border-emerald-200',
    completed: 'bg-blue-50 text-blue-700 border border-blue-200',
    paused:    'bg-amber-50 text-amber-700 border border-amber-200',
    draft:     'bg-gray-100 text-gray-500 border border-gray-200',
    unknown:   'bg-gray-100 text-gray-400 border border-gray-200',
  }
  const cls = map[status] ?? map.unknown
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${cls}`}>
      {status}
    </span>
  )
}

function ReplyRateCell({ rate }: { rate: number }) {
  const color = rate >= 3 ? 'text-emerald-600' : rate >= 1 ? 'text-amber-600' : 'text-gray-400'
  return <span className={`font-semibold ${color}`}>{rate.toFixed(1)}%</span>
}

interface PageProps {
  searchParams: { status?: string }
}

export default async function AnalyticsPage({ searchParams }: PageProps) {
  const statusFilter = searchParams.status ?? 'all'

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return (
      <div className="px-8 py-16 max-w-2xl mx-auto text-center">
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-8">
          <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-3" />
          <h1 className="text-xl font-bold text-amber-800 mb-2">Configuration Required</h1>
          <p className="text-amber-700 text-sm">
            Analytics page requires{' '}
            <code className="bg-amber-100 px-1 rounded">SUPABASE_SERVICE_ROLE_KEY</code> and{' '}
            <code className="bg-amber-100 px-1 rounded">NEXT_PUBLIC_SUPABASE_URL</code> to be set.
          </p>
          <p className="text-amber-600 text-xs mt-3">Add these in Railway → kind/admin → Variables, then redeploy.</p>
        </div>
      </div>
    )
  }

  const data = await getAnalyticsData(statusFilter)

  if (!data) {
    return (
      <div className="px-8 py-16 max-w-2xl mx-auto text-center">
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-8">
          <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-3" />
          <h1 className="text-xl font-bold text-amber-800 mb-2">Configuration Required</h1>
          <p className="text-amber-700 text-sm">Could not connect to database. Check environment variables.</p>
        </div>
      </div>
    )
  }

  const { stats, totals, tablesMissing } = data

  const STATUS_OPTIONS = [
    { value: 'all',       label: 'All statuses' },
    { value: 'active',    label: 'Active' },
    { value: 'completed', label: 'Completed' },
    { value: 'paused',    label: 'Paused' },
    { value: 'draft',     label: 'Draft' },
  ]

  return (
    <div className="px-8 py-6 max-w-7xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Campaign Analytics</h1>
          <p className="text-sm text-gray-500 mt-0.5">FIGSY performance across all clients</p>
        </div>
        <div className="flex items-center gap-1.5 bg-white/70 border border-white/60 rounded-xl px-3 py-1.5 shadow-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-medium text-gray-500">Live data</span>
        </div>
      </div>

      {/* Summary stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Contacts enrolled', value: totals.enrolled.toLocaleString(), icon: <TrendingUp className="w-5 h-5" />, color: 'bg-purple-50 text-[#7C3AED]' },
          { label: 'Emails sent', value: totals.emails_sent.toLocaleString(), icon: <Mail className="w-5 h-5" />, color: 'bg-blue-50 text-blue-600' },
          { label: 'Replies', value: totals.replies.toLocaleString(), icon: <MessageSquare className="w-5 h-5" />, color: 'bg-green-50 text-green-600' },
          { label: 'Hot leads', value: totals.hot_leads.toLocaleString(), icon: <Flame className="w-5 h-5" />, color: 'bg-red-50 text-red-500' },
        ].map(({ label, value, icon, color }) => (
          <div key={label} className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/60 shadow-sm p-5">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${color}`}>{icon}</div>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            <p className="text-sm text-gray-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-3">
        <Filter className="w-4 h-4 text-gray-400 shrink-0" />
        <span className="text-sm text-gray-500 font-medium">Filter by status:</span>
        <div className="flex items-center gap-2 flex-wrap">
          {STATUS_OPTIONS.map(opt => (
            <a
              key={opt.value}
              href={`?status=${opt.value}`}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                statusFilter === opt.value
                  ? 'bg-[#7C3AED] text-white border-[#7C3AED]'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-[#7C3AED]/50 hover:text-[#7C3AED]'
              }`}
            >
              {opt.label}
            </a>
          ))}
        </div>
      </div>

      {/* Main table */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/60 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-purple-50 flex items-center gap-2">
          <BarChart2 className="w-5 h-5 text-[#7C3AED]" />
          <h2 className="font-semibold text-gray-900">All Campaigns</h2>
          <span className="ml-auto text-xs text-gray-400">{stats.length} campaigns</span>
        </div>

        {tablesMissing || stats.length === 0 ? (
          <div className="py-16 text-center">
            <BarChart2 className="w-8 h-8 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No data yet</p>
            <p className="text-gray-400 text-sm mt-1">
              {tablesMissing
                ? 'The figsy_campaigns table does not exist yet.'
                : 'No campaigns match the current filter.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-purple-100 bg-gray-50/60">
                  {['Client', 'Campaign Name', 'Enrolled', 'Emails Sent', 'Replies', 'Reply Rate', 'Hot Leads', 'Status'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-purple-50">
                {stats.map(row => (
                  <tr key={`${row.client_id}-${row.campaign_id}`} className="hover:bg-purple-50/30 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">{row.client_name}</td>
                    <td className="px-4 py-3 text-gray-700 max-w-[200px] truncate">{row.campaign_name}</td>
                    <td className="px-4 py-3 text-gray-700">{row.enrolled.toLocaleString()}</td>
                    <td className="px-4 py-3 text-gray-700">{row.emails_sent.toLocaleString()}</td>
                    <td className="px-4 py-3 text-gray-700">{row.replies.toLocaleString()}</td>
                    <td className="px-4 py-3"><ReplyRateCell rate={row.reply_rate} /></td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1">
                        {row.hot_leads > 0 && <Flame className="w-3.5 h-3.5 text-red-400" />}
                        {row.hot_leads.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={row.status} /></td>
                  </tr>
                ))}

                {/* Totals row */}
                <tr className="bg-purple-50/40 border-t-2 border-purple-100 font-semibold">
                  <td className="px-4 py-3 text-gray-900" colSpan={2}>Totals</td>
                  <td className="px-4 py-3 text-gray-900">{totals.enrolled.toLocaleString()}</td>
                  <td className="px-4 py-3 text-gray-900">{totals.emails_sent.toLocaleString()}</td>
                  <td className="px-4 py-3 text-gray-900">{totals.replies.toLocaleString()}</td>
                  <td className="px-4 py-3"><ReplyRateCell rate={totals.reply_rate} /></td>
                  <td className="px-4 py-3 text-gray-900">
                    <span className="flex items-center gap-1">
                      {totals.hot_leads > 0 && <Flame className="w-3.5 h-3.5 text-red-400" />}
                      {totals.hot_leads.toLocaleString()}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">—</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
