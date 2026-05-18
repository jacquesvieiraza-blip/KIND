import { CheckCircle2, Circle, Clock, DollarSign, Users, TrendingUp, Briefcase, Globe } from 'lucide-react'
import { AdminNav } from '@/components/AdminNav'

const PHASES = [
  {
    phase: 'Phase 1',
    label: 'Foundation',
    months: 'May 2026',
    mrrTarget: '$2,500',
    clientTarget: '5 clients',
    status: 'active' as const,
    color: 'blue',
    milestones: [
      { label: 'Platform fully live (portal + admin + API)', done: true },
      { label: 'Supabase schema + auth wired up', done: true },
      { label: 'Paystack + Stripe billing integration', done: true },
      { label: 'Lead Gen product GA — Apollo + AI scoring', done: true },
      { label: 'FIGSY AI SDR — campaigns + Day 1 outreach', done: true },
      { label: 'POPIA consent workflow live', done: true },
      { label: 'ICP builder with auto-name + prefill', done: true },
      { label: 'Virtual Assistant (Milla) — locked, Book a Demo', done: true },
      { label: 'Chatbot Agent (Vida) — locked, Book a Demo', done: true },
      { label: 'Client referral programme', done: true },
      { label: 'Demo Environments for sales team', done: true },
      { label: 'Admin portal — KPIs, TTFL, MRR tracking', done: true },
      { label: 'System health status in sidebar', done: true },
      { label: 'First 5 paying clients onboarded', done: false },
    ],
    ops: [
      'Founder-led sales — direct outreach to SMEs in SA, NG, KE',
      'Demo Environments in admin for sales team demos',
      'WhatsApp-first onboarding flow',
      'Set up internal ops playbook',
    ],
  },
  {
    phase: 'Phase 2',
    label: 'Traction',
    months: 'Jun–Jul 2026',
    mrrTarget: '$8,000',
    clientTarget: '20 clients',
    status: 'upcoming' as const,
    color: 'indigo',
    milestones: [
      { label: 'Virtual Assistant (Milla) full GA — open to all clients', done: false },
      { label: 'Chatbot Agent (Vida) full GA — open to all clients', done: false },
      { label: 'CRM export (HubSpot / Pipedrive)', done: false },
      { label: 'WhatsApp chatbot integration', done: false },
      { label: 'First consulting retainer signed', done: false },
      { label: 'Pan-African presence: 3 countries active', done: false },
      { label: 'Admin cohort analytics view', done: false },
      { label: 'Paystack end-to-end smoke test verified', done: false },
    ],
    ops: [
      'Hire first SDR (SA-based, commission-first)',
      'Partner with 2 African accelerators / co-working hubs',
      'Monthly client success check-in cadence',
      'Introduce quarterly business review (QBR) for Pro+',
    ],
  },
  {
    phase: 'Phase 3',
    label: 'Scale',
    months: 'Months 5–6',
    mrrTarget: '$26,000',
    clientTarget: '60 clients',
    status: 'planned' as const,
    color: 'purple',
    milestones: [
      { label: 'Multi-seat team accounts', done: false },
      { label: 'Custom AI model fine-tuning per client', done: false },
      { label: 'Full CRM sync (bi-directional)', done: false },
      { label: 'Enterprise tier SLA + dedicated support', done: false },
      { label: 'Automated POPIA audit reports', done: false },
      { label: 'White-label chatbot option', done: false },
      { label: 'Pan-African expansion: 8 countries', done: false },
      { label: 'Seed funding / angel round', done: false },
    ],
    ops: [
      'Hire Head of Customer Success',
      'Hire junior AI engineer',
      'Formalise partner / reseller channel',
      'Launch case study library (minimum 10 case studies)',
    ],
  },
  {
    phase: 'Phase 4',
    label: 'Expand',
    months: 'Months 7–12',
    mrrTarget: '$100,000',
    clientTarget: '200+ clients',
    status: 'planned' as const,
    color: 'green',
    milestones: [
      { label: 'Vertical-specific AI packs (Fintech, Health, Retail)', done: false },
      { label: 'Marketplace of AI agents', done: false },
      { label: 'Native mobile app (iOS + Android)', done: false },
      { label: 'API access tier for developers', done: false },
      { label: 'SOC 2 Type II certification', done: false },
      { label: 'Series A readiness', done: false },
      { label: 'Full continent coverage: 10+ countries', done: false },
      { label: 'Revenue share programme for resellers', done: false },
    ],
    ops: [
      'Full product + engineering team (6–10 people)',
      'Board of advisors formed',
      'Formal marketing function — content, paid, community',
      'Expand to Middle East / Diaspora markets',
    ],
  },
]

const STATUS_CONFIG = {
  active: { label: 'In Progress', bg: 'bg-blue-100', text: 'text-blue-700', ring: 'ring-blue-200' },
  upcoming: { label: 'Upcoming', bg: 'bg-indigo-100', text: 'text-indigo-700', ring: 'ring-indigo-200' },
  planned: { label: 'Planned', bg: 'bg-gray-100', text: 'text-gray-500', ring: 'ring-gray-200' },
}

const COLOR_MAP: Record<string, { header: string; accent: string; progress: string }> = {
  blue: { header: 'bg-blue-600', accent: 'text-blue-600', progress: 'bg-blue-500' },
  indigo: { header: 'bg-indigo-600', accent: 'text-indigo-600', progress: 'bg-indigo-500' },
  purple: { header: 'bg-purple-600', accent: 'text-purple-600', progress: 'bg-purple-500' },
  green: { header: 'bg-green-600', accent: 'text-green-600', progress: 'bg-green-500' },
}

export default function AdminRoadmapPage() {
  const totalMilestones = PHASES.flatMap(p => p.milestones)
  const completedMilestones = totalMilestones.filter(m => m.done)
  const overallPct = Math.round((completedMilestones.length / totalMilestones.length) * 100)

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNav />

      <main className="px-8 py-8 max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900">AI Business Operation Roadmap</h2>
          <p className="text-gray-500 text-sm mt-1">Strategic milestones from launch to $100K MRR across 4 phases.</p>
        </div>

        {/* Overall progress */}
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-semibold text-gray-900">Overall Roadmap Progress</h3>
              <p className="text-sm text-gray-400 mt-0.5">{completedMilestones.length} of {totalMilestones.length} milestones complete</p>
            </div>
            <span className="text-3xl font-bold text-gray-900">{overallPct}%</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-3">
            <div className="bg-[#0066FF] h-3 rounded-full transition-all" style={{ width: `${overallPct}%` }} />
          </div>
          <div className="mt-4 grid grid-cols-4 gap-3">
            {PHASES.map(p => {
              const done = p.milestones.filter(m => m.done).length
              const pct = Math.round((done / p.milestones.length) * 100)
              const colors = COLOR_MAP[p.color]
              return (
                <div key={p.phase} className="text-center">
                  <p className="text-xs text-gray-400">{p.phase}</p>
                  <p className={`text-lg font-bold ${colors.accent}`}>{pct}%</p>
                  <p className="text-xs text-gray-500">{p.label}</p>
                </div>
              )
            })}
          </div>
        </div>

        {/* Revenue targets strip */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { icon: <DollarSign className="w-4 h-4" />, label: 'Month 2 MRR', value: '$2,500', sub: '5 clients' },
            { icon: <TrendingUp className="w-4 h-4" />, label: 'Month 4 MRR', value: '$8,000', sub: '20 clients' },
            { icon: <Globe className="w-4 h-4" />, label: 'Month 6 MRR', value: '$26,000', sub: '60 clients' },
            { icon: <Briefcase className="w-4 h-4" />, label: 'Month 12 MRR', value: '$100,000', sub: '200+ clients' },
          ].map(({ icon, label, value, sub }) => (
            <div key={label} className="bg-white rounded-xl border border-gray-100 p-4">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-3">{icon}</div>
              <p className="text-xl font-bold text-gray-900">{value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{label}</p>
              <p className="text-xs text-gray-400">{sub}</p>
            </div>
          ))}
        </div>

        {/* Phase cards */}
        {PHASES.map(phase => {
          const done = phase.milestones.filter(m => m.done).length
          const pct = Math.round((done / phase.milestones.length) * 100)
          const statusCfg = STATUS_CONFIG[phase.status]
          const colors = COLOR_MAP[phase.color]

          return (
            <div key={phase.phase} className={`bg-white rounded-xl border border-gray-100 overflow-hidden ring-1 ${statusCfg.ring}`}>
              {/* Phase header */}
              <div className={`${colors.header} px-6 py-4 text-white`}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-white/70 text-xs font-medium uppercase tracking-wider">{phase.phase}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusCfg.bg} ${statusCfg.text}`}>{statusCfg.label}</span>
                    </div>
                    <h3 className="text-xl font-bold mt-1">{phase.label} — {phase.months}</h3>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold">{phase.mrrTarget}</p>
                    <p className="text-white/70 text-xs">MRR target · {phase.clientTarget}</p>
                  </div>
                </div>
                <div className="mt-3 w-full bg-white/20 rounded-full h-1.5">
                  <div className="bg-white h-1.5 rounded-full" style={{ width: `${pct}%` }} />
                </div>
                <p className="text-white/60 text-xs mt-1">{done}/{phase.milestones.length} milestones · {pct}%</p>
              </div>

              {/* Phase body */}
              <div className="p-6 grid grid-cols-2 gap-6">
                {/* Milestones */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle2 className={`w-4 h-4 ${colors.accent}`} />
                    <h4 className="font-medium text-sm text-gray-700">Product Milestones</h4>
                  </div>
                  <ul className="space-y-2">
                    {phase.milestones.map((m, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-sm">
                        {m.done
                          ? <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                          : <Circle className="w-4 h-4 text-gray-300 mt-0.5 shrink-0" />}
                        <span className={m.done ? 'text-gray-400 line-through' : 'text-gray-700'}>{m.label}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Operations */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Users className={`w-4 h-4 ${colors.accent}`} />
                    <h4 className="font-medium text-sm text-gray-700">Operations & Go-To-Market</h4>
                  </div>
                  <ul className="space-y-2">
                    {phase.ops.map((op, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-sm">
                        <Clock className="w-4 h-4 text-gray-300 mt-0.5 shrink-0" />
                        <span className="text-gray-600">{op}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )
        })}

        {/* Bottom note */}
        <p className="text-center text-xs text-gray-400 pb-4">
          Roadmap is a living document — review monthly against MRR actuals and client feedback.
        </p>
      </main>
    </div>
  )
}
