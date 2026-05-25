import { notFound } from 'next/navigation'

type AgentId = 'otto' | 'lena' | 'reeve' | 'cmo' | 'cto' | 'cfo'

interface AgentDef {
  name: string
  title: string
  mandate: string
  accent: string
  accentBg: string
}

const AGENTS: Record<AgentId, AgentDef> = {
  otto: {
    name: 'OTTO',
    title: 'Chief Revenue Officer',
    mandate: 'Pipeline health, MRR tracking, churn risk, revenue forecasting, anomaly alerts.',
    accent: 'text-emerald-400',
    accentBg: 'bg-emerald-400/10 border-emerald-400/20',
  },
  lena: {
    name: 'LENA',
    title: 'Chief Customer Success',
    mandate: 'At-risk client detection, login monitoring, lead quality alerts, intervention recommendations.',
    accent: 'text-blue-400',
    accentBg: 'bg-blue-400/10 border-blue-400/20',
  },
  reeve: {
    name: 'REEVE',
    title: 'Account Executive',
    mandate: 'Prospect pipeline, cold outreach follow-up, re-engagement drafts, meeting pipeline.',
    accent: 'text-purple-400',
    accentBg: 'bg-purple-400/10 border-purple-400/20',
  },
  cmo: {
    name: 'CMO',
    title: 'Chief Marketing Officer',
    mandate: 'Website performance, conversion tracking, content suggestions, competitive alerts.',
    accent: 'text-orange-400',
    accentBg: 'bg-orange-400/10 border-orange-400/20',
  },
  cto: {
    name: 'CTO',
    title: 'Chief Technology Officer',
    mandate: 'Platform health, audit results, error rates, deployment history, infrastructure status.',
    accent: 'text-cyan-400',
    accentBg: 'bg-cyan-400/10 border-cyan-400/20',
  },
  cfo: {
    name: 'CFO',
    title: 'Chief Financial Officer',
    mandate: 'MRR, credit burn rates, Apollo cost per client, Paystack fees, net margin. Cash position.',
    accent: 'text-yellow-400',
    accentBg: 'bg-yellow-400/10 border-yellow-400/20',
  },
}

export default async function AgentPage({ params }: { params: { agent: string } }) {
  const agentId = params.agent as AgentId
  const agent = AGENTS[agentId]

  if (!agent) notFound()

  // Attempt to fetch the agent's daily brief
  let briefData: string | null = null
  try {
    const baseUrl = process.env.NEXT_PUBLIC_RAILWAY_API_URL || process.env.RAILWAY_API_URL || ''
    if (baseUrl) {
      const res = await fetch(`${baseUrl}/internal/${agentId}/brief`, {
        headers: { 'x-admin-token': process.env.ADMIN_API_TOKEN || '' },
        next: { revalidate: 300 },
      })
      if (res.ok) {
        briefData = await res.text()
      }
    }
  } catch {
    // endpoint not yet available — show placeholder
  }

  return (
    <main className="px-8 py-6 max-w-5xl space-y-6">
      {/* Agent identity card */}
      <div className={`bg-white/5 border rounded-xl p-6 ${agent.accentBg}`}>
        <div className="flex items-start gap-4">
          <div className={`w-14 h-14 rounded-xl border flex items-center justify-center flex-shrink-0 ${agent.accentBg}`}>
            <span className={`text-2xl font-bold ${agent.accent}`}>{agent.name[0]}</span>
          </div>
          <div>
            <h1 className={`text-3xl font-bold ${agent.accent}`}>{agent.name}</h1>
            <p className="text-white/60 font-medium mt-0.5">{agent.title}</p>
            <p className="text-sm text-white/40 mt-2 max-w-2xl">{agent.mandate}</p>
          </div>
        </div>
      </div>

      {/* Today's Brief */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className={`w-2 h-2 rounded-full ${briefData ? 'bg-emerald-400' : 'bg-white/20'}`} />
          <h2 className="font-semibold text-white">Today&apos;s Brief</h2>
        </div>
        {briefData ? (
          <div className="text-sm text-white/70 whitespace-pre-wrap font-mono bg-black/20 rounded-lg p-4 border border-white/5">
            {briefData}
          </div>
        ) : (
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-5 text-center">
            <p className="text-white/40 text-sm">Brief loading — this agent&apos;s daily briefing will appear here once the API endpoint is connected.</p>
            <p className="text-white/20 text-xs mt-2">Expected endpoint: <code className="text-white/30">GET /api/proxy/internal/{agentId}/brief</code></p>
          </div>
        )}
      </div>

      {/* Recent Actions */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-6">
        <h2 className="font-semibold text-white mb-4">Recent Actions</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                {['Time', 'Action', 'Details'].map(h => (
                  <th key={h} className="text-left px-3 py-2.5 text-xs font-semibold text-white/30 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={3} className="px-3 py-10 text-center">
                  <p className="text-white/30 text-sm">No actions yet. Actions appear here when this agent runs.</p>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Configure */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-6">
        <h2 className="font-semibold text-white mb-2">Configure</h2>
        <p className="text-sm text-white/40">Agent configuration settings will be available here in a future release. This section will allow you to adjust thresholds, notification preferences, and scheduling for {agent.name}.</p>
        <div className="mt-4 bg-white/[0.03] border border-white/[0.06] rounded-lg p-4">
          <p className="text-xs text-white/20 uppercase tracking-widest font-semibold mb-2">Planned settings</p>
          <ul className="space-y-1 text-sm text-white/30">
            <li>— Run frequency (daily / on-demand)</li>
            <li>— Alert thresholds</li>
            <li>— Output destinations (email / Slack / portal)</li>
            <li>— Context window (last N days)</li>
          </ul>
        </div>
      </div>
    </main>
  )
}

export function generateStaticParams() {
  return [
    { agent: 'otto' },
    { agent: 'lena' },
    { agent: 'reeve' },
    { agent: 'cmo' },
    { agent: 'cto' },
    { agent: 'cfo' },
  ]
}
