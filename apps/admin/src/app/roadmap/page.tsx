import { CheckCircle2, Circle, Clock, DollarSign, Users, TrendingUp, Briefcase, Globe } from 'lucide-react'

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
      'Use own product: KIND runs FIGSY campaigns for KIND — dogfooding GTM',
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
  active: { label: 'In Progress', bg: 'bg-blue-400/10', text: 'text-blue-400', ring: 'ring-blue-400/20' },
  upcoming: { label: 'Upcoming', bg: 'bg-indigo-400/10', text: 'text-indigo-400', ring: 'ring-indigo-400/20' },
  planned: { label: 'Planned', bg: 'bg-white/5', text: 'text-white/40', ring: 'ring-white/10' },
}

const COLOR_MAP: Record<string, { header: string; accent: string; progress: string }> = {
  blue: { header: 'bg-blue-500/20 border-blue-400/20', accent: 'text-blue-400', progress: 'bg-blue-400' },
  indigo: { header: 'bg-indigo-500/20 border-indigo-400/20', accent: 'text-indigo-400', progress: 'bg-indigo-400' },
  purple: { header: 'bg-purple-500/20 border-purple-400/20', accent: 'text-purple-400', progress: 'bg-purple-400' },
  green: { header: 'bg-emerald-500/20 border-emerald-400/20', accent: 'text-emerald-400', progress: 'bg-emerald-400' },
}

export default function AdminRoadmapPage() {
  const totalMilestones = PHASES.flatMap(p => p.milestones)
  const completedMilestones = totalMilestones.filter(m => m.done)
  const overallPct = Math.round((completedMilestones.length / totalMilestones.length) * 100)

  return (

      <div className="px-8 py-8 max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900">AI Business Operation Roadmap</h2>
          <p className="text-gray-500 text-sm mt-1">Strategic milestones from launch to $100K MRR across 4 phases.</p>
        </div>

        {/* Overall progress */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/60 shadow-sm p-6">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-semibold text-gray-900">Overall Roadmap Progress</h3>
              <p className="text-sm text-gray-400 mt-0.5">{completedMilestones.length} of {totalMilestones.length} milestones complete</p>
            </div>
            <span className="text-3xl font-bold text-gray-900">{overallPct}%</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-3">
            <div className="bg-[#7C3AED] h-3 rounded-full transition-all" style={{ width: `${overallPct}%` }} />
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
          <span className="text-3xl font-bold text-white">{overallPct}%</span>
        </div>

        {/* Revenue targets strip */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { icon: <DollarSign className="w-4 h-4" />, label: 'Month 2 MRR', value: '$2,500', sub: '5 clients' },
            { icon: <TrendingUp className="w-4 h-4" />, label: 'Month 4 MRR', value: '$8,000', sub: '20 clients' },
            { icon: <Globe className="w-4 h-4" />, label: 'Month 6 MRR', value: '$26,000', sub: '60 clients' },
            { icon: <Briefcase className="w-4 h-4" />, label: 'Month 12 MRR', value: '$100,000', sub: '200+ clients' },
          ].map(({ icon, label, value, sub }) => (
            <div key={label} className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/60 shadow-sm p-4">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-3">{icon}</div>
              <p className="text-xl font-bold text-gray-900">{value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{label}</p>
              <p className="text-xs text-gray-400">{sub}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 grid grid-cols-4 gap-3">
          {PHASES.map(p => {
            const done = p.milestones.filter(m => m.done).length
            const pct = Math.round((done / p.milestones.length) * 100)
            const colors = COLOR_MAP[p.color]
            return (
              <div key={p.phase} className="text-center">
                <p className="text-xs text-white/30">{p.phase}</p>
                <p className={`text-lg font-bold ${colors.accent}`}>{pct}%</p>
                <p className="text-xs text-white/40">{p.label}</p>
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
          <div key={label} className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
            <div className="w-8 h-8 rounded-lg bg-blue-400/10 text-blue-400 flex items-center justify-center mb-3">{icon}</div>
            <p className="text-xl font-bold text-white">{value}</p>
            <p className="text-xs text-white/40 mt-0.5">{label}</p>
            <p className="text-xs text-white/30">{sub}</p>
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
          <div key={phase.phase} className={`bg-white/[0.03] rounded-xl border overflow-hidden ring-1 ${statusCfg.ring} border-white/[0.06]`}>
            {/* Phase header */}
            <div className={`${colors.header} border-b px-6 py-4`}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-medium uppercase tracking-wider ${colors.accent}`}>{phase.phase}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${statusCfg.bg} ${statusCfg.text}`}>{statusCfg.label}</span>
                  </div>
                  <h3 className={`text-xl font-bold mt-1 ${colors.accent}`}>{phase.label} — {phase.months}</h3>
                </div>
                <div className="text-right">
                  <p className={`text-2xl font-bold ${colors.accent}`}>{phase.mrrTarget}</p>
                  <p className="text-white/40 text-xs">MRR target · {phase.clientTarget}</p>
                </div>
              </div>
              <div className="mt-3 w-full bg-white/10 rounded-full h-1.5">
                <div className={`${colors.progress} h-1.5 rounded-full`} style={{ width: `${pct}%` }} />
              </div>
              <p className="text-white/40 text-xs mt-1">{done}/{phase.milestones.length} milestones · {pct}%</p>
            </div>

        {/* Bottom note */}
        <p className="text-center text-xs text-gray-400 pb-4">
          Roadmap is a living document — review monthly against MRR actuals and client feedback.
        </p>
    </div>
  )
}
