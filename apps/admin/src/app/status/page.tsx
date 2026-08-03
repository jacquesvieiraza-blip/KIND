export const dynamic = 'force-dynamic'

import { createClient } from '@supabase/supabase-js'
import { Clock, CheckCircle, AlertTriangle, Users, Zap, TrendingUp, DollarSign, RefreshCw } from 'lucide-react'

interface StatusData {
  generated_at: string
  session: 'morning' | 'lunch' | 'evening'
  clients: {
    total: number
    active_paid: number
    // #607 — was `trialing`. There is no trial; `dormant` = signed up, nothing bought yet.
    // `legacy_trialing` is the pre-1-Aug remainder, shown until the migration clears it.
    dormant: number
    legacy_trialing: number
    new_24h: number
    at_risk: number
    zero_credits: number
  }
  leads: {
    delivered_24h: number
    credits_held: number
  }
  figsy: {
    active_campaigns: number
    sessions_24h: number
  }
  revenue: {
    purchases_7d_usd: number
  }
}

interface StatusRow {
  id: string
  session: string
  summary: string
  generated_at: string
  data: StatusData
}

const SESSION_LABELS: Record<string, string> = {
  morning: '🌅 Morning',
  lunch:   '☀️ Lunch',
  evening: '🌙 Evening',
}

const NEXT_UPDATE: Record<string, string> = {
  morning: 'Next update: Lunch (12:00 SAST)',
  lunch:   'Next update: Evening (19:00 SAST)',
  evening: 'Next update: Morning (07:10 SAST)',
}

function Stat({ icon: Icon, label, value, sub, alert }: {
  icon: React.ElementType
  label: string
  value: string | number
  sub?: string
  alert?: boolean
}) {
  return (
    <div className={`rounded-xl p-4 border ${alert ? 'border-red-500/30 bg-red-500/5' : 'border-gray-100 bg-gray-50'}`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`w-4 h-4 ${alert ? 'text-red-400' : 'text-gray-400'}`} />
        <span className="text-gray-400 text-xs">{label}</span>
      </div>
      <p className={`text-2xl font-bold ${alert ? 'text-red-400' : 'text-gray-900'}`}>{value}</p>
      {sub && <p className="text-gray-400 text-xs mt-1">{sub}</p>}
    </div>
  )
}

export default async function StatusPage() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return <div className="p-8 text-amber-600">Missing env vars — add SUPABASE_SERVICE_ROLE_KEY in Railway.</div>
  }
  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  )

  const [latestRes, historyRes] = await Promise.all([
    db.from('platform_status').select('*').order('created_at', { ascending: false }).limit(1).single(),
    db.from('platform_status').select('id, session, summary, generated_at').order('created_at', { ascending: false }).limit(9),
  ])

  const latest = latestRes.data as StatusRow | null
  const history = (historyRes.data ?? []) as StatusRow[]
  const d = latest?.data

  const lastUpdated = latest
    ? new Date(latest.generated_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Johannesburg' }) + ' SAST'
    : null

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Platform Status</h1>
          <p className="text-gray-400 text-sm mt-1">
            Auto-updates at 07:10, 12:00 and 19:00 SAST · {lastUpdated ? `Last: ${lastUpdated}` : 'No snapshot yet'}
          </p>
        </div>
        {latest && (
          <div className="text-right">
            <span className="text-gray-500 text-sm font-medium">{SESSION_LABELS[latest.session]} snapshot</span>
            <p className="text-gray-400 text-xs mt-0.5">{NEXT_UPDATE[latest.session]}</p>
          </div>
        )}
      </div>

      {!latest ? (
        <div className="rounded-xl border border-gray-100 bg-gray-50 p-12 text-center">
          <RefreshCw className="w-8 h-8 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-400">No status snapshot yet.</p>
          <p className="text-gray-300 text-sm mt-1">First snapshot runs at 07:10 SAST tomorrow morning.</p>
          <p className="text-gray-300 text-sm mt-3">Or trigger manually via Railway console:</p>
          <code className="text-gray-400 text-xs bg-white px-3 py-1 rounded mt-2 inline-block">
            POST /internal/status/snapshot
          </code>
        </div>
      ) : (
        <>
          {/* Summary banner */}
          <div className="rounded-xl border border-gray-100 bg-gray-50 p-5">
            <p className="text-gray-700 text-sm leading-relaxed">{latest.summary}</p>
          </div>

          {/* Alert strip */}
          {(d && (d.clients.at_risk > 0 || d.clients.zero_credits > 0)) && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 flex items-start gap-3">
              <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
              <div className="space-y-1">
                {d.clients.at_risk > 0 && (
                  <p className="text-amber-300 text-sm">{d.clients.at_risk} client{d.clients.at_risk > 1 ? 's' : ''} with lapsed subscriptions</p>
                )}
                {d.clients.zero_credits > 0 && (
                  <p className="text-amber-300 text-sm">{d.clients.zero_credits} client{d.clients.zero_credits > 1 ? 's' : ''} with zero credits</p>
                )}
              </div>
            </div>
          )}

          {/* Stats grid */}
          {d && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Stat icon={Users}      label="Total clients"     value={d.clients.total} sub={`${d.clients.active_paid} paid · ${d.clients.dormant} dormant${d.clients.legacy_trialing > 0 ? ` · ⚠️ ${d.clients.legacy_trialing} legacy trial` : ''}`} />
              <Stat icon={CheckCircle} label="New signups (24h)" value={d.clients.new_24h} />
              <Stat icon={Zap}        label="Leads delivered (24h)" value={d.leads.delivered_24h} sub={`${d.leads.credits_held} credits held`} />
              <Stat icon={TrendingUp} label="FIGSY campaigns"   value={d.figsy.active_campaigns} sub={`${d.figsy.sessions_24h} sessions today`} />
              <Stat icon={DollarSign} label="Revenue (7 days)"  value={`$${d.revenue.purchases_7d_usd}`} />
              <Stat icon={AlertTriangle} label="At-risk clients" value={d.clients.at_risk} alert={d.clients.at_risk > 0} />
              <Stat icon={AlertTriangle} label="Zero credits"    value={d.clients.zero_credits} alert={d.clients.zero_credits > 0} />
              <Stat icon={Clock}      label="Credits on platform" value={d.leads.credits_held} />
            </div>
          )}

          {/* History */}
          {history.length > 1 && (
            <div>
              <h2 className="text-gray-500 text-xs uppercase tracking-widest font-semibold mb-3">Previous Snapshots</h2>
              <div className="space-y-2">
                {history.slice(1).map((row) => (
                  <div key={row.id} className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-gray-400 text-xs">{SESSION_LABELS[row.session]}</span>
                      <span className="text-gray-300 text-xs">·</span>
                      <span className="text-gray-300 text-xs">
                        {new Date(row.generated_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Johannesburg' })} SAST
                      </span>
                    </div>
                    <p className="text-gray-500 text-xs leading-relaxed">{row.summary}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
