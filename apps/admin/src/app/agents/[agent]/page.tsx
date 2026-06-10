import { notFound } from 'next/navigation'
import AgentBriefSection from './BriefSection'

type AgentId = 'otto' | 'lena' | 'denise' | 'cmo' | 'cto' | 'cfo'

interface AgentDef {
  name: string
  title: string
  mandate: string
  story?: string
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
  denise: {
    name: 'DENISE',
    title: 'The Closer · Autonomous AI Account Executive',
    mandate: 'Closes what FIGSY opens. Confirms booked meetings, joins calls as a notetaker, surfaces objections, drafts proposals from the conversation, and follows up the pipeline so no warm lead ever goes cold.',
    story: 'Named after a woman who built a successful sales business from nothing and was the kind of personality people remembered long after the meeting ended. She closed because people liked and trusted her — never by cornering them. That is the DENISE every client gets: a relationship closer with warmth, charm and zero desperation. FIGSY opens the door; DENISE is who you actually want walking through it.',
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

  return (
    <main className="px-8 py-6 max-w-5xl space-y-6">
      {/* Agent identity card */}
      <div className={`bg-white border rounded-xl p-6 ${agent.accentBg}`}>
        <div className="flex items-start gap-4">
          <div className={`w-14 h-14 rounded-xl border flex items-center justify-center flex-shrink-0 ${agent.accentBg}`}>
            <span className={`text-2xl font-bold ${agent.accent}`}>{agent.name[0]}</span>
          </div>
          <div>
            <h1 className={`text-3xl font-bold ${agent.accent}`}>{agent.name}</h1>
            <p className="text-gray-500 font-medium mt-0.5">{agent.title}</p>
            <p className="text-sm text-gray-400 mt-2 max-w-2xl">{agent.mandate}</p>
            {agent.story && (
              <p className="text-sm text-gray-400 mt-3 max-w-2xl italic border-l-2 border-gray-200 pl-3">{agent.story}</p>
            )}
          </div>
        </div>
      </div>

      {/* Today's Brief — client component for regenerate */}
      <AgentBriefSection agentId={agentId} agentName={agent.name} />

      {/* Recent Actions */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h2 className="font-semibold text-gray-900 mb-4">Recent Actions</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                {['Time', 'Action', 'Details'].map(h => (
                  <th key={h} className="text-left px-3 py-2.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={3} className="px-3 py-10 text-center">
                  <p className="text-gray-400 text-sm">No actions yet. Actions appear here when this agent runs.</p>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Configure */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h2 className="font-semibold text-gray-900 mb-2">Configure</h2>
        <p className="text-sm text-gray-400">Agent configuration settings will be available here in a future release. This section will allow you to adjust thresholds, notification preferences, and scheduling for {agent.name}.</p>
        <div className="mt-4 bg-white border border-purple-100 rounded-lg p-4">
          <p className="text-xs text-gray-300 uppercase tracking-widest font-semibold mb-2">Planned settings</p>
          <ul className="space-y-1 text-sm text-gray-400">
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
    { agent: 'denise' },
    { agent: 'cmo' },
    { agent: 'cto' },
    { agent: 'cfo' },
  ]
}
