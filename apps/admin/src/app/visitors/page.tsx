export const dynamic = 'force-dynamic'

import { Eye, Globe, TrendingUp, Building2 } from 'lucide-react'

interface VisitorSession {
  id: string
  ip: string | null
  company_name: string | null
  company_domain: string | null
  company_country: string | null
  company_size_range: string | null
  page_url: string | null
  referrer: string | null
  user_agent: string | null
  intent_score: number
  visited_at: string
}

const API = process.env.NEXT_PUBLIC_API_URL || 'https://kindapi-production-e64c.up.railway.app'
const ADMIN_KEY = process.env.ADMIN_SECRET_KEY || ''

const TRACKING_SNIPPET = `<script>
(function(){
  fetch('https://kindapi-production-e64c.up.railway.app/track/visit', {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({page_url:location.href, referrer:document.referrer, user_agent:navigator.userAgent})
  }).catch(function(){})
})()
</script>`

async function getVisitors(): Promise<VisitorSession[]> {
  try {
    const res = await fetch(`${API}/track/admin/visitors`, {
      headers: { 'x-admin-key': ADMIN_KEY },
      cache: 'no-store',
    })
    if (!res.ok) return []
    const json = await res.json()
    return Array.isArray(json) ? json : []
  } catch { return [] }
}

function intentBadgeClass(score: number) {
  if (score >= 50) return 'bg-green-100 text-green-700'
  if (score >= 25) return 'bg-amber-100 text-amber-700'
  return 'bg-gray-100 text-gray-500'
}

function formatDate(dt: string) {
  return new Date(dt).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

function shortUrl(url: string | null) {
  if (!url) return '—'
  try { return new URL(url).pathname || '/' } catch { return url }
}

function shortReferrer(ref: string | null) {
  if (!ref) return 'Direct'
  try { return new URL(ref).hostname } catch { return ref }
}

export default async function VisitorsPage() {
  const visitors = await getVisitors()

  const last7d = new Date(Date.now() - 7 * 86400000)
  const recent = visitors.filter(v => new Date(v.visited_at) >= last7d)
  const identified = visitors.filter(v => v.company_name)
  const identified7d = recent.filter(v => v.company_name)
  const highIntent = recent.filter(v => v.intent_score >= 50)
  const avgScore = recent.length > 0 ? Math.round(recent.reduce((s, v) => s + v.intent_score, 0) / recent.length) : 0

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <Eye className="w-6 h-6 text-purple-600" />
          <h1 className="text-2xl font-bold text-gray-900">Visitor Intelligence</h1>
        </div>
        <p className="text-sm text-gray-500">Companies visiting your website, identified and scored</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total visits (7d)', value: recent.length, icon: Globe },
          { label: 'Identified companies', value: `${identified7d.length} (${recent.length > 0 ? Math.round((identified7d.length / recent.length) * 100) : 0}%)`, icon: Building2 },
          { label: 'Avg intent score', value: avgScore, icon: TrendingUp },
          { label: 'High intent (≥50)', value: highIntent.length, icon: Eye },
        ].map(stat => (
          <div key={stat.label} className="bg-white rounded-xl border border-purple-100 p-5 shadow-sm">
            <stat.icon className="w-4 h-4 text-purple-400 mb-2" />
            <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Visitors table */}
      <div className="bg-white rounded-2xl border border-purple-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-purple-100 flex items-center gap-2">
          <Eye className="w-4 h-4 text-purple-600" />
          <h2 className="font-semibold text-gray-900 text-sm">Recent Visitors</h2>
          <span className="ml-auto text-xs text-gray-400">{visitors.length} sessions</span>
        </div>

        {visitors.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <Eye className="w-8 h-8 text-purple-200 mx-auto mb-3" />
            <p className="text-sm text-gray-500">No visitor data yet — install the tracking snippet below</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-purple-50/50">
                <tr>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Company</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Country</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Page</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Referrer</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Intent</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-purple-50">
                {visitors.slice(0, 100).map(v => (
                  <tr key={v.id} className="hover:bg-purple-50/30 transition-colors">
                    <td className="px-5 py-3.5">
                      {v.company_name ? (
                        <div>
                          <p className="font-medium text-gray-900">{v.company_name}</p>
                          {v.company_domain && <p className="text-xs text-gray-400">{v.company_domain}</p>}
                        </div>
                      ) : (
                        <span className="text-gray-400 text-xs">Unknown ({v.ip?.slice(0, 12) ?? '?'})</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-gray-500 text-xs">{v.company_country ?? '—'}</td>
                    <td className="px-5 py-3.5 text-gray-500 text-xs font-mono">{shortUrl(v.page_url)}</td>
                    <td className="px-5 py-3.5 text-gray-500 text-xs">{shortReferrer(v.referrer)}</td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${intentBadgeClass(v.intent_score)}`}>
                        {v.intent_score}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-gray-400 text-xs whitespace-nowrap">{formatDate(v.visited_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Tracking snippet */}
      <div className="bg-white rounded-2xl border border-purple-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-purple-100">
          <h2 className="font-semibold text-gray-900 text-sm">Tracking Snippet</h2>
          <p className="text-xs text-gray-400 mt-0.5">Add this before &lt;/body&gt; on your website to start tracking visitors</p>
        </div>
        <div className="p-5">
          <pre className="bg-gray-900 text-green-300 rounded-xl p-4 text-xs font-mono overflow-x-auto leading-relaxed whitespace-pre-wrap">{TRACKING_SNIPPET}</pre>
          <p className="text-xs text-gray-400 mt-3">
            The snippet fires on every page load and sends the URL, referrer, and user agent. Company de-anonymisation requires CLEARBIT_API_KEY in Railway env vars.
          </p>
        </div>
      </div>
    </div>
  )
}
