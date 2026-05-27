export const dynamic = 'force-dynamic'

import { createClient } from '@supabase/supabase-js'
import { CheckCircle2, Circle, TrendingUp, Users, Zap, Server, AlertTriangle } from 'lucide-react'

async function getClientCount(): Promise<number> {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    )
    const { count } = await supabase.from('clients').select('id', { count: 'exact', head: true })
    return count ?? 0
  } catch {
    return 0
  }
}

const STAGES = [
  {
    number: 1,
    label: 'Proof',
    range: '0–5 clients',
    current: true,
    color: 'blue',
    milestones: [
      { label: 'Platform built', done: true },
      { label: 'First outreach live', done: true },
      { label: 'First 3 paying clients', done: false },
      { label: 'Case study documented', done: false },
    ],
  },
  {
    number: 2,
    label: 'Traction',
    range: '5–20 clients',
    current: false,
    color: 'indigo',
    milestones: [
      { label: 'Hire 1 SDR', done: false },
      { label: 'First partner channel', done: false },
      { label: 'Expand to 3 African markets', done: false },
    ],
  },
  {
    number: 3,
    label: 'Scale',
    range: '20–100 clients',
    current: false,
    color: 'purple',
    milestones: [
      { label: 'Hire Head of Sales', done: false },
      { label: 'Agency white-label offering', done: false },
      { label: 'Series A conversations', done: false },
    ],
  },
  {
    number: 4,
    label: 'Dominate',
    range: '100+ clients',
    current: false,
    color: 'green',
    milestones: [
      { label: 'Multi-country ops team', done: false },
      { label: 'Platform API (sell to other SaaS)', done: false },
      { label: 'Strategic acquirer conversations', done: false },
    ],
  },
]

const HIRE_CHECKLIST = [
  { role: 'First SDR', trigger: 'MRR hits R25,000/mo consistently', done: false },
  { role: 'First CSM', trigger: '10+ clients onboarded', done: false },
  { role: 'Head of Sales', trigger: 'Pipeline > R1M', done: false },
  { role: 'CTO', trigger: 'Tech team > 3 contractors', done: false },
  { role: 'Series A prep', trigger: 'MRR > R150,000/mo', done: false },
]

const INFRA_TRIGGERS = [
  {
    current: 'Railway Starter',
    trigger: '5 clients',
    action: 'Upgrade to Pro',
    urgency: 'soon',
  },
  {
    current: 'Supabase Free',
    trigger: '10k rows',
    action: 'Upgrade to Pro',
    urgency: 'soon',
  },
  {
    current: 'Resend Free',
    trigger: '100 clients',
    action: 'Upgrade to Pro ($20/mo)',
    urgency: 'later',
  },
  {
    current: 'Single API instance',
    trigger: '50 clients',
    action: 'Add Redis queue',
    urgency: 'later',
  },
  {
    current: 'Manual deployments',
    trigger: '20 clients',
    action: 'Add CI/CD (GitHub Actions)',
    urgency: 'later',
  },
]

const COLOR_MAP: Record<string, { ring: string; badge: string; badgeText: string; dot: string; bar: string; stageBg: string; stageText: string }> = {
  blue:   { ring: 'ring-blue-200',   badge: 'bg-blue-100',   badgeText: 'text-blue-700',   dot: 'bg-blue-500',   bar: 'bg-blue-500',   stageBg: 'bg-blue-600',   stageText: 'text-blue-600' },
  indigo: { ring: 'ring-indigo-200', badge: 'bg-indigo-100', badgeText: 'text-indigo-700', dot: 'bg-indigo-400', bar: 'bg-indigo-500', stageBg: 'bg-indigo-600', stageText: 'text-indigo-600' },
  purple: { ring: 'ring-purple-200', badge: 'bg-purple-100', badgeText: 'text-purple-700', dot: 'bg-purple-400', bar: 'bg-purple-500', stageBg: 'bg-purple-600', stageText: 'text-purple-600' },
  green:  { ring: 'ring-green-200',  badge: 'bg-green-100',  badgeText: 'text-green-700',  dot: 'bg-green-400',  bar: 'bg-green-500',  stageBg: 'bg-green-600',  stageText: 'text-green-600' },
}

export default async function ScalabilityPage() {
  const clientCount = await getClientCount()
  const STAGE_1_TARGET = 5
  const stagePct = Math.min(Math.round((clientCount / STAGE_1_TARGET) * 100), 100)

  return (

      <div className="px-8 py-8 max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Scalability Framework</h2>
          <p className="text-gray-500 text-sm mt-1">Stage tracker, hiring triggers, and infrastructure scaling decisions.</p>
        </div>

        {/* Current Stage Banner */}
        <div className="bg-[#001f4d] rounded-xl p-6 text-white">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-white/50 text-xs font-medium uppercase tracking-widest mb-1">Current Stage</p>
              <h3 className="text-2xl font-bold">Stage 1 — Proof of Concept</h3>
              <p className="text-white/60 text-sm mt-1">Focus: land first 3 paying clients and document a case study.</p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold">{clientCount}<span className="text-white/40 text-lg font-normal"> / 5</span></p>
              <p className="text-white/50 text-xs mt-0.5">clients onboarded</p>
            </div>
          </div>
          <div className="mt-5 w-full bg-white/10 rounded-full h-2.5">
            <div
              className="bg-blue-400 h-2.5 rounded-full transition-all"
              style={{ width: `${stagePct}%` }}
            />
          </div>
          <div className="flex justify-between mt-1.5">
            <p className="text-white/40 text-xs">{clientCount} of {STAGE_1_TARGET} clients · {stagePct}% to Stage 2</p>
            <p className="text-white/40 text-xs">{STAGE_1_TARGET - clientCount} remaining</p>
          </div>
        </div>

        {/* Scaling Path Tracker */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">Scaling Path Tracker</h3>
          </div>

          <div className="grid grid-cols-4 gap-4">
            {STAGES.map((stage, idx) => {
              const colors = COLOR_MAP[stage.color]
              const doneMilestones = stage.milestones.filter(m => m.done).length
              return (
                <div
                  key={stage.number}
                  className={`bg-white rounded-xl border overflow-hidden ${stage.current ? `ring-2 ${colors.ring} border-transparent` : 'border-gray-100'}`}
                >
                  {/* Stage header */}
                  <div className={`${stage.current ? colors.stageBg : 'bg-gray-700'} px-4 py-3 text-white`}>
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-xs font-medium uppercase tracking-wider text-white/70">Stage {stage.number}</span>
                      {stage.current && (
                        <span className="text-xs bg-white/20 text-white px-2 py-0.5 rounded-full font-medium">Current</span>
                      )}
                    </div>
                    <p className="font-bold text-base">{stage.label}</p>
                    <p className="text-white/60 text-xs">{stage.range}</p>
                  </div>

                  {/* Milestones */}
                  <div className="p-4">
                    <ul className="space-y-2.5">
                      {stage.milestones.map((m, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          {m.done
                            ? <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                            : <Circle className="w-4 h-4 text-gray-300 mt-0.5 shrink-0" />}
                          <span className={m.done ? 'text-gray-400 line-through' : (stage.current ? 'text-gray-700' : 'text-gray-400')}>
                            {m.label}
                          </span>
                        </li>
                      ))}
                    </ul>
                    {!stage.current && (
                      <div className="mt-3 pt-3 border-t border-gray-50">
                        <p className="text-xs text-gray-300 italic">Unlocks after Stage {idx}</p>
                      </div>
                    )}
                    {stage.current && (
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <p className="text-xs text-gray-400">{doneMilestones}/{stage.milestones.length} complete</p>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* When to Hire Checklist */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-indigo-600" />
            <h3 className="text-lg font-semibold text-gray-900">When to Hire Checklist</h3>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-50">
            {HIRE_CHECKLIST.map((item, i) => (
              <div key={i} className="flex items-center gap-4 px-6 py-4">
                <div className="flex-shrink-0">
                  <Circle className="w-5 h-5 text-gray-300" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-gray-900">{item.role}</p>
                  <p className="text-xs text-gray-400 mt-0.5">Trigger: {item.trigger}</p>
                </div>
                <div className="flex-shrink-0">
                  <span className="text-xs bg-gray-100 text-gray-500 px-2.5 py-1 rounded-full">Not yet</span>
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-2 px-1">Hire when the trigger is consistently met for 30 days — not just one good month.</p>
        </div>

        {/* Infrastructure Scaling Triggers */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Server className="w-5 h-5 text-purple-600" />
            <h3 className="text-lg font-semibold text-gray-900">Infrastructure Scaling Triggers</h3>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/60 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-1/3">Current</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-1/4">Trigger</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Action Required</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-24">Priority</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-purple-50">
                {INFRA_TRIGGERS.map((row, i) => (
                  <tr key={i} className="hover:bg-purple-50/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Zap className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <span className="font-medium text-gray-900">{row.current}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-gray-600 font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">{row.trigger}</span>
                    </td>
                    <td className="px-6 py-4 text-gray-600">{row.action}</td>
                    <td className="px-6 py-4 text-right">
                      {row.urgency === 'soon' ? (
                        <span className="inline-flex items-center gap-1 text-xs bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full font-medium">
                          <AlertTriangle className="w-3 h-3" />
                          Soon
                        </span>
                      ) : (
                        <span className="text-xs bg-gray-100 text-gray-500 px-2.5 py-1 rounded-full">Later</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-gray-400 mt-2 px-1">Upgrade proactively — don't wait for outages. Budget upgrades at each stage gate.</p>
        </div>

        {/* Bottom note */}
        <p className="text-center text-xs text-gray-400 pb-4">
          Scalability framework — review at each stage gate. Next review: first paying client.
        </p>
    </div>
  )
}
