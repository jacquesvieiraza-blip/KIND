export const dynamic = 'force-dynamic'

import { Database, Globe, TrendingUp, BarChart3, Users } from 'lucide-react'

const API = process.env.NEXT_PUBLIC_API_URL || 'https://kindapi-production-e64c.up.railway.app'
const ADMIN_KEY = process.env.ADMIN_SECRET_KEY || ''

interface MoatStats {
  total_records: number
  by_country: Record<string, number>
  by_industry: Record<string, number>
  reply_rate: number
  open_rate: number
  meeting_rate: number
}

async function getMoatStats(): Promise<MoatStats | null> {
  try {
    const res = await fetch(`${API}/internal/data-moat/stats`, {
      headers: { 'x-admin-key': ADMIN_KEY },
      cache: 'no-store',
    })
    const json = await res.json()
    return json.data ?? null
  } catch { return null }
}

export default async function DataMoatPage() {
  const stats = await getMoatStats()

  const topCountries = stats
    ? Object.entries(stats.by_country).sort(([, a], [, b]) => b - a).slice(0, 8)
    : []

  const topIndustries = stats
    ? Object.entries(stats.by_industry).sort(([, a], [, b]) => b - a).slice(0, 8)
    : []

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-2">
        <Database className="w-6 h-6 text-purple-600" />
        <h1 className="text-2xl font-bold text-gray-900">African Data Moat</h1>
        <span className="ml-auto px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 text-xs font-semibold">P3-13</span>
      </div>
      <p className="text-sm text-gray-500 mb-8">
        Anonymised, aggregated B2B intelligence across all KIND clients. No PII. Company-level patterns only.
        Aggregated weekly — this becomes "African Apollo".
      </p>

      {!stats ? (
        <div className="text-center py-16 text-gray-400">
          <Database className="w-10 h-10 mx-auto mb-3 text-gray-300" />
          <p className="font-medium text-gray-600 mb-1">No data yet</p>
          <p className="text-sm">Run the aggregation cron or POST /internal/data-moat/aggregate to populate.</p>
        </div>
      ) : (
        <>
          {/* KPI row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <StatCard label="Total records" value={stats.total_records.toLocaleString()} icon={<Database className="w-4 h-4 text-purple-500" />} />
            <StatCard label="Reply rate" value={`${(stats.reply_rate * 100).toFixed(1)}%`} icon={<TrendingUp className="w-4 h-4 text-green-500" />} />
            <StatCard label="Open rate" value={`${(stats.open_rate * 100).toFixed(1)}%`} icon={<BarChart3 className="w-4 h-4 text-blue-500" />} />
            <StatCard label="Meeting rate" value={`${(stats.meeting_rate * 100).toFixed(1)}%`} icon={<Users className="w-4 h-4 text-indigo-500" />} />
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* By country */}
            <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Globe className="w-4 h-4 text-purple-500" />
                <h2 className="font-semibold text-gray-900 text-sm">By Country</h2>
              </div>
              <div className="space-y-2">
                {topCountries.map(([country, count]) => (
                  <div key={country} className="flex items-center gap-3">
                    <span className="text-sm text-gray-700 w-32 truncate">{country}</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-2">
                      <div
                        className="bg-purple-500 h-2 rounded-full"
                        style={{ width: `${Math.round((count / (stats.total_records || 1)) * 100)}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-500 w-10 text-right">{count.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* By industry */}
            <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="w-4 h-4 text-indigo-500" />
                <h2 className="font-semibold text-gray-900 text-sm">By Industry</h2>
              </div>
              <div className="space-y-2">
                {topIndustries.map(([industry, count]) => (
                  <div key={industry} className="flex items-center gap-3">
                    <span className="text-sm text-gray-700 w-32 truncate">{industry}</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-2">
                      <div
                        className="bg-indigo-500 h-2 rounded-full"
                        style={{ width: `${Math.round((count / (stats.total_records || 1)) * 100)}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-500 w-10 text-right">{count.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function StatCard({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <span className="text-xs text-gray-500">{label}</span>
      </div>
      <p className="text-xl font-bold text-gray-900">{value}</p>
    </div>
  )
}
