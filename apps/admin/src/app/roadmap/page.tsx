import { CheckCircle2, Circle, DollarSign, Users, TrendingUp, Briefcase, Globe, AlertTriangle, ShieldAlert, Zap } from 'lucide-react'

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
      { label: 'Realtime dashboard — live stats via Supabase realtime, green pulse indicator', done: true },
      { label: 'FIGSY workforce language pass — "FIGSY sent X emails" throughout portal', done: true },
      { label: 'Gradient input borders — design-signal on all FIGSY inputs', done: true },
      { label: 'Milla multi-language — English, Français, Kiswahili, Hausa', done: true },
      { label: 'MCP Connect page — endpoint, client key, AI walkthrough agent', done: true },
      { label: 'Record demo video with voiceover — implementation walkthrough', done: false },
      { label: 'FIGSY-guided new client onboarding flow (zero friction, no implementation fee)', done: true },
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
      { label: 'K.I.N.D MCP server live — FIGSY usable from Claude.ai', done: true },
      { label: 'MCP Connect portal page — client self-serve setup guide live', done: true },
      { label: 'Gmail + Outlook MCP — send outreach from client\'s own domain', done: false },
      { label: 'Google Calendar MCP — FIGSY books meetings directly', done: false },
      { label: 'Slack MCP — instant lead qualification notifications', done: false },
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
      { label: 'Multi-seat team accounts — invite flow, roles, team dashboard', done: true },
      { label: 'Custom AI model fine-tuning per client', done: false },
      { label: 'Full CRM sync (bi-directional)', done: false },
      { label: 'Salesforce MCP — bi-directional sync (Dominate plan)', done: false },
      { label: 'HubSpot MCP — bi-directional sync (Dominate plan)', done: false },
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

const RISKS = [
  {
    id: 'r1',
    severity: 'critical' as const,
    title: 'FIGSY AI failure — Anthropic API down or rate-limited',
    description: 'FIGSY is now the primary interface. If the Anthropic API is unavailable, the whole product feels broken for the client.',
    mitigation: 'Graceful fallback message everywhere FIGSY speaks. Queue retries. Show "FIGSY is thinking — back in a moment" rather than crashing.',
  },
  {
    id: 'r2',
    severity: 'critical' as const,
    title: 'Apollo API unavailable or plan insufficient',
    description: 'Lead Gen requires Apollo paid plan. Free plan returns 403 on /mixed_people/search. No leads = no value delivered.',
    mitigation: 'Upgrade Apollo to Basic ($49/mo). Add clear error message when Apollo is unconfigured — don\'t silently return 0 leads.',
  },
  {
    id: 'r3',
    severity: 'medium' as const,
    title: '✅ RESOLVED — Email sending (RESEND_API_KEY confirmed live in Railway 31 May 2026)',
    description: 'RESEND_API_KEY confirmed set in Railway API service. Welcome emails, consent emails, weekly digests, and morning briefs are all firing.',
    mitigation: 'No action needed. Monitor Resend dashboard for bounce/spam rates as outreach volume scales.',
  },
  {
    id: 'r4',
    severity: 'high' as const,
    title: 'Stripe not configured — billing completely non-functional',
    description: 'Top-up buttons are disabled. Clients cannot purchase credits. Revenue = 0 until Stripe price IDs are added to Railway.',
    mitigation: 'Create 4 Stripe products, add price IDs to Railway env vars, set up webhook. Estimated 1 hour of setup.',
  },
  {
    id: 'r5',
    severity: 'high' as const,
    title: 'Supabase schema drift — columns missing in live DB',
    description: 'schema.sql and live DB diverge when migrations are not run. Leads to PGRST204 "column not found" errors on insert/select.',
    mitigation: 'Run MASTER_SCHEMA.sql in Supabase SQL Editor after every schema change. Add migration files to /supabase/migrations for each change.',
  },
  {
    id: 'r6',
    severity: 'high' as const,
    title: 'SSL not provisioned on app.get-kind.com',
    description: 'Custom domain shows NET::ERR_CERT_COMMON_NAME_INVALID. Magic links redirect there and break — new signups cannot authenticate.',
    mitigation: 'Provision SSL in Railway DNS settings or keep PORTAL_URL set to kindportal-production.up.railway.app until SSL resolves.',
  },
  {
    id: 'r7',
    severity: 'high' as const,
    title: 'New client sees empty product — no leads, no campaigns, no data',
    description: 'Without Apollo live and credits loaded, a new signup gets blank pages. First impression is a broken product, not an AI SDR.',
    mitigation: 'FIGSY-guided onboarding flow must run within 60 seconds of signup. Demo mode seeds 25 leads automatically on first login.',
  },
  {
    id: 'r8',
    severity: 'medium' as const,
    title: 'ANTHROPIC_API_KEY missing — ICP AI and FIGSY chat silent',
    description: 'ICP "Suggest with AI", FIGSY chat, and all agent briefs fail silently if ANTHROPIC_API_KEY is not set in Railway API service.',
    mitigation: 'Confirm ANTHROPIC_API_KEY is set in Railway. Add a /health check that validates key presence.',
  },
  {
    id: 'r9',
    severity: 'medium' as const,
    title: 'FIGSY footprint expansion increases blast radius of UI bugs',
    description: 'Making FIGSY the primary interface means any FIGSY bug affects every page. Previously a floating button bug was low impact.',
    mitigation: 'Each FIGSY panel instance has independent error boundary. Fallback to static suggestion chips if chat API fails.',
  },
  {
    id: 'r10',
    severity: 'medium' as const,
    title: 'Demo next week — platform not tested end-to-end with real client data',
    description: 'Smoke test is 17% complete. Unknown bugs may surface live in front of a prospect.',
    mitigation: 'Complete smoke test before demo. Seed demo account with 25 leads. Have admin portal open in a second tab during demo to diagnose fast.',
  },
]

const STATUS_CONFIG = {
  active: { label: 'In Progress', bg: 'bg-blue-400/10', text: 'text-blue-400', ring: 'ring-blue-400/20' },
  upcoming: { label: 'Upcoming', bg: 'bg-indigo-400/10', text: 'text-indigo-400', ring: 'ring-indigo-400/20' },
  planned: { label: 'Planned', bg: 'bg-white/5', text: 'text-gray-400', ring: 'ring-white/10' },
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
      <div className="bg-white rounded-2xl border border-purple-100 shadow-sm p-6">
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
      </div>

      {/* Revenue targets strip */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { icon: <DollarSign className="w-4 h-4" />, label: 'Month 2 MRR', value: '$2,500', sub: '5 clients' },
          { icon: <TrendingUp className="w-4 h-4" />, label: 'Month 4 MRR', value: '$8,000', sub: '20 clients' },
          { icon: <Globe className="w-4 h-4" />, label: 'Month 6 MRR', value: '$26,000', sub: '60 clients' },
          { icon: <Briefcase className="w-4 h-4" />, label: 'Month 12 MRR', value: '$100,000', sub: '200+ clients' },
        ].map(({ icon, label, value, sub }) => (
          <div key={label} className="bg-white rounded-2xl border border-purple-100 shadow-sm p-4">
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
          <div key={phase.phase} className={`bg-white rounded-2xl border border-purple-100 shadow-sm overflow-hidden ring-1 ${statusCfg.ring}`}>
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
                  <p className="text-gray-500 text-xs">MRR target · {phase.clientTarget}</p>
                </div>
              </div>
              <div className="mt-3 w-full bg-gray-100 rounded-full h-1.5">
                <div className={`${colors.progress} h-1.5 rounded-full`} style={{ width: `${pct}%` }} />
              </div>
              <p className="text-gray-400 text-xs mt-1">{done}/{phase.milestones.length} milestones · {pct}%</p>
            </div>

            {/* Milestones + Ops */}
            <div className="px-6 py-5 grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Milestones */}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Milestones</p>
                <ul className="space-y-2">
                  {phase.milestones.map((m, i) => (
                    <li key={i} className="flex items-start gap-2">
                      {m.done
                        ? <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                        : <Circle className="w-4 h-4 text-gray-300 mt-0.5 shrink-0" />}
                      <span className={`text-sm ${m.done ? 'text-gray-700' : 'text-gray-400'}`}>{m.label}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Ops */}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Operations</p>
                <ul className="space-y-2">
                  {phase.ops.map((op, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${colors.progress}`} />
                      <span className="text-sm text-gray-500">{op}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )
      })}

      {/* ── Risk Register ──────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-purple-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-red-500" />
          <h3 className="font-bold text-gray-900">Risk Register</h3>
          <span className="ml-auto text-xs text-gray-400">Identify early · Mitigate fast</span>
        </div>
        <div className="divide-y divide-gray-50">
          {RISKS.map(r => (
            <div key={r.id} className="px-6 py-4 flex items-start gap-4">
              <span className={`shrink-0 mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border ${
                r.severity === 'critical' ? 'bg-red-50 text-red-600 border-red-200' :
                r.severity === 'high'     ? 'bg-amber-50 text-amber-600 border-amber-200' :
                                            'bg-blue-50 text-blue-600 border-blue-200'
              }`}>{r.severity}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900">{r.title}</p>
                <p className="text-xs text-gray-500 mt-0.5">{r.description}</p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-[10px] text-gray-400 uppercase tracking-wide">Mitigation</p>
                <p className="text-xs text-gray-600 mt-0.5 max-w-56 text-right">{r.mitigation}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom note */}
      <p className="text-center text-xs text-gray-400 pb-4">
        Roadmap is a living document — review monthly against MRR actuals and client feedback.
      </p>
    </div>
  )
}
