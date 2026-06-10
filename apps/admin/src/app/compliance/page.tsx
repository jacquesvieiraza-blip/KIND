import { CheckCircle2, Clock, AlertCircle, ExternalLink, Shield } from 'lucide-react'

interface Cert {
  id: string
  name: string
  subtitle: string
  status: 'done' | 'in-progress' | 'planned'
  trigger: string
  cost: string
  timeline: string
  description: string
  whyItMatters: string
  currentReadiness: { item: string; done: boolean }[]
  nextStep: string
  accentColor: string
  badgeColor: string
}

const CERTIFICATIONS: Cert[] = [
  {
    id: 'gdpr',
    name: 'GDPR',
    subtitle: 'EU/UK Data Protection',
    status: 'done',
    trigger: 'Regulatory requirement',
    cost: '£0',
    timeline: 'Complete',
    description: 'EU/UK data protection regulation. Not a third-party certification — a compliance claim backed by documented controls and published policies.',
    whyItMatters: 'Required for any EU/UK client. Signals seriousness to enterprise buyers worldwide.',
    currentReadiness: [
      { item: 'trust.html published — Articles 6(1)(f), 17, 13/14', done: true },
      { item: 'dpa.html published — Data Processing Agreement', done: true },
      { item: 'Standard Contractual Clauses (SCCs) included', done: true },
      { item: 'Data stored in af-south-1 (Cape Town) — documented', done: true },
      { item: 'Legitimate interest basis documented', done: true },
      { item: 'Data subject rights (deletion, access) implemented', done: true },
    ],
    nextStep: 'Optional: third-party GDPR compliance assessment from a UK/EU solicitor (~£500–1,500) for enterprise sales conversations.',
    accentColor: 'text-emerald-400',
    badgeColor: 'border-emerald-400/30 bg-emerald-400/5',
  },
  {
    id: 'ccpa',
    name: 'CCPA',
    subtitle: 'California Consumer Privacy Act',
    status: 'done',
    trigger: 'Regulatory requirement',
    cost: '£0',
    timeline: 'Complete',
    description: 'California Consumer Privacy Act. Applies to businesses serving California residents. K.I.N.D is below the revenue/record thresholds currently but compliance is built in.',
    whyItMatters: 'Required for US market. Any California-based prospect or investor will check this.',
    currentReadiness: [
      { item: 'trust.html — CCPA rights documented', done: true },
      { item: 'dpa-us.html — US state laws catch-all (VCDPA, CPA, etc.)', done: true },
      { item: 'Opt-out mechanism implemented', done: true },
      { item: 'Data deletion on request implemented', done: true },
    ],
    nextStep: 'Already complete. No action required.',
    accentColor: 'text-blue-400',
    badgeColor: 'border-blue-400/30 bg-blue-400/5',
  },
  {
    id: 'soc2',
    name: 'SOC 2 Type II',
    subtitle: 'Security & Availability Audit',
    status: 'planned',
    trigger: 'First enterprise client OR 50+ paying clients',
    cost: '~$50,000 Year 1 (audit + tooling + pen test)',
    timeline: '12–18 months from start',
    description: 'The gold standard for SaaS security compliance. An independent CPA firm audits security controls over a 6–12 month observation period. Type II (not Type I) — ongoing proof, not a snapshot.',
    whyItMatters: 'Required by most enterprise procurement teams above $50k contract value. US companies almost always ask for it. Opens corporate, fintech, and healthcare deals.',
    currentReadiness: [
      { item: 'HTTPS enforced on all endpoints', done: true },
      { item: 'Supabase RLS (Row Level Security) enabled', done: true },
      { item: 'Service role keys not exposed to client', done: true },
      { item: 'Environment variables in Railway (not hardcoded)', done: true },
      { item: 'Formal access control policy documented', done: false },
      { item: 'Incident response plan written', done: false },
      { item: 'Vendor risk register (Apollo, Resend, Vercel, Railway)', done: false },
      { item: 'Security awareness training records', done: false },
      { item: 'Penetration test completed', done: false },
      { item: 'MFA enforced on all production systems', done: false },
      { item: 'Formal change management process documented', done: false },
      { item: 'Vanta or Drata compliance platform set up', done: false },
    ],
    nextStep: 'Run Vanta free gap assessment (vanta.com) to get exact list of gaps. No commitment required. Do this when 30+ clients are paying — gives the full picture before investing.',
    accentColor: 'text-orange-400',
    badgeColor: 'border-orange-400/30 bg-orange-400/5',
  },
  {
    id: 'iso27001',
    name: 'ISO 27001',
    subtitle: 'Information Security Management',
    status: 'planned',
    trigger: 'Year 2 — African enterprise pipeline active',
    cost: '~£15,000–25,000 Year 1',
    timeline: '6–12 months from start',
    description: 'International standard for Information Security Management Systems (ISMS). More recognised globally than SOC 2 — especially in Europe, Middle East, and Africa.',
    whyItMatters: 'African enterprise clients (banks, telecoms, large SA corporates) are more familiar with ISO 27001 than SOC 2. Opens Nigerian fintechs, Kenyan banks, SA corporate procurement.',
    currentReadiness: [
      { item: 'Security controls implemented (RLS, HTTPS, env vars)', done: true },
      { item: 'Data residency documented (af-south-1)', done: true },
      { item: 'Formal ISMS documentation started', done: false },
      { item: 'Risk assessment completed', done: false },
      { item: 'Statement of Applicability written', done: false },
      { item: 'Asset register created', done: false },
      { item: 'Accredited certification body selected', done: false },
    ],
    nextStep: 'Efficiency play: do ISO 27001 and SOC 2 simultaneously in Year 2 — they share ~70% of controls. One compliance programme (Vanta covers both), ~40% cost saving vs doing separately.',
    accentColor: 'text-purple-400',
    badgeColor: 'border-purple-400/30 bg-purple-400/5',
  },
  {
    id: 'iso42001',
    name: 'ISO 42001',
    subtitle: 'AI Management System',
    status: 'planned',
    trigger: 'Year 2 — early mover opportunity',
    cost: '~£10,000–20,000 Year 1',
    timeline: '6–12 months from start',
    description: 'The world\'s first international standard for AI Management Systems. Published December 2023. Covers responsible AI development, bias assessment, transparency, human oversight, and AI risk governance.',
    whyItMatters: 'Brand new — very few companies have it. As an AI-native product (FIGSY, lead scoring, email generation), K.I.N.D has a natural story. EU AI Act and emerging African AI governance frameworks are moving in this direction. Being an early certified AI company is a genuine differentiator.',
    currentReadiness: [
      { item: 'Human oversight: FIGSY can be paused, leads manually overridden', done: true },
      { item: 'AI model documentation: Claude Haiku + Sonnet — roles documented', done: true },
      { item: 'POPIA consent before AI processes personal data', done: true },
      { item: 'Formal AI risk register created', done: false },
      { item: 'Bias assessment for lead scoring model', done: false },
      { item: 'FIGSY transparency layer (why each email was written)', done: false },
      { item: 'AI incident response plan written', done: false },
      { item: 'AI Ethics & Governance page published on website', done: false },
    ],
    nextStep: 'Start the AI risk register now — it\'s a Google Doc, costs nothing, and can be used in enterprise sales conversations immediately. Publish an AI Ethics page on the website. Pursue formal certification alongside ISO 27001 in Year 2.',
    accentColor: 'text-cyan-400',
    badgeColor: 'border-cyan-400/30 bg-cyan-400/5',
  },
]

function StatusBadge({ status }: { status: Cert['status'] }) {
  if (status === 'done') return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-400/10 text-emerald-400 border border-emerald-400/20">
      <CheckCircle2 className="w-3 h-3" /> Complete
    </span>
  )
  if (status === 'in-progress') return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-400/10 text-amber-400 border border-amber-400/20">
      <Clock className="w-3 h-3" /> In Progress
    </span>
  )
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-white text-gray-400 border border-gray-200">
      <AlertCircle className="w-3 h-3" /> Planned
    </span>
  )
}

function ReadinessBar({ items }: { items: { item: string; done: boolean }[] }) {
  const done = items.filter(i => i.done).length
  const pct = Math.round((done / items.length) * 100)
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs">
        <span className="text-gray-400">Readiness</span>
        <span className="text-gray-500 font-medium">{done}/{items.length} controls</span>
      </div>
      <div className="w-full bg-white rounded-full h-1.5">
        <div
          className={`h-1.5 rounded-full transition-all ${pct === 100 ? 'bg-emerald-400' : pct >= 50 ? 'bg-amber-400' : 'bg-gray-200'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

export default function CompliancePage() {
  const done = CERTIFICATIONS.filter(c => c.status === 'done').length
  const planned = CERTIFICATIONS.filter(c => c.status === 'planned').length

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <Shield className="w-6 h-6 text-gray-500" />
          <h1 className="text-xl font-semibold text-gray-900">Compliance & Certifications</h1>
        </div>
        <p className="text-gray-400 text-sm ml-9">Track the path from current compliance to enterprise-grade certification.</p>
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Certified / Compliant', value: done, color: 'text-emerald-400', sub: 'GDPR + CCPA — done' },
          { label: 'In Progress', value: 0, color: 'text-amber-400', sub: 'None currently active' },
          { label: 'Planned', value: planned, color: 'text-gray-400', sub: 'SOC 2, ISO 27001, ISO 42001' },
        ].map(({ label, value, color, sub }) => (
          <div key={label} className="bg-white border border-purple-100 rounded-xl p-5">
            <p className={`text-3xl font-bold ${color}`}>{value}</p>
            <p className="text-gray-500 text-sm mt-1">{label}</p>
            <p className="text-gray-400 text-xs mt-0.5">{sub}</p>
          </div>
        ))}
      </div>

      {/* Roadmap overview */}
      <div className="bg-white border border-purple-100 rounded-xl p-6">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">Certification Roadmap</h2>
        <div className="space-y-3">
          {[
            { name: 'GDPR',         status: 'done',    trigger: 'Done',                           cost: '£0',          timeline: 'Complete' },
            { name: 'CCPA',         status: 'done',    trigger: 'Done',                           cost: '£0',          timeline: 'Complete' },
            { name: 'SOC 2 Type II', status: 'planned', trigger: 'First enterprise OR 50 clients', cost: '~$50,000',    timeline: '12–18 months' },
            { name: 'ISO 27001',    status: 'planned', trigger: 'Year 2 — African enterprise',    cost: '~£15–25,000', timeline: '6–12 months' },
            { name: 'ISO 42001',    status: 'planned', trigger: 'Year 2 — early mover play',      cost: '~£10–20,000', timeline: '6–12 months' },
          ].map(row => (
            <div key={row.name} className="flex items-center gap-4 text-sm">
              <div className="w-28 font-medium text-gray-800">{row.name}</div>
              <div className="w-6">
                {row.status === 'done'
                  ? <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  : <AlertCircle className="w-4 h-4 text-gray-300" />}
              </div>
              <div className="flex-1 text-gray-400 text-xs">{row.trigger}</div>
              <div className="w-28 text-right text-gray-400 text-xs">{row.cost}</div>
              <div className="w-28 text-right text-gray-400 text-xs">{row.timeline}</div>
            </div>
          ))}
        </div>
        <div className="mt-4 pt-4 border-t border-gray-100">
          <p className="text-gray-400 text-xs">
            💡 Efficiency play: do SOC 2 + ISO 27001 + ISO 42001 simultaneously in Year 2 using Vanta (~$80–100k total vs ~$120k separately). Shared controls = one programme, three badges.
          </p>
        </div>
      </div>

      {/* Individual cert cards */}
      <div className="space-y-6">
        {CERTIFICATIONS.map(cert => {
          const doneItems = cert.currentReadiness.filter(i => i.done).length
          return (
            <div key={cert.id} className={`border rounded-xl p-6 ${cert.badgeColor}`}>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className={`text-lg font-bold ${cert.accentColor}`}>{cert.name}</h3>
                    <StatusBadge status={cert.status} />
                  </div>
                  <p className="text-gray-500 text-sm">{cert.subtitle}</p>
                </div>
                <div className="text-right">
                  <p className="text-gray-500 text-xs">Est. cost</p>
                  <p className="text-gray-800 text-sm font-medium">{cert.cost}</p>
                  <p className="text-gray-400 text-xs mt-0.5">{cert.timeline}</p>
                </div>
              </div>

              <p className="text-gray-500 text-sm mb-4">{cert.description}</p>

              <div className="bg-black/20 rounded-lg p-3 mb-4">
                <p className="text-gray-400 text-xs uppercase tracking-wider font-semibold mb-1">Why it matters</p>
                <p className="text-gray-500 text-sm">{cert.whyItMatters}</p>
              </div>

              <div className="mb-4">
                <p className="text-gray-400 text-xs uppercase tracking-wider font-semibold mb-2">
                  Controls & Readiness — {doneItems}/{cert.currentReadiness.length}
                </p>
                <ReadinessBar items={cert.currentReadiness} />
                <div className="mt-3 space-y-1.5">
                  {cert.currentReadiness.map(item => (
                    <div key={item.item} className="flex items-start gap-2">
                      {item.done
                        ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                        : <div className="w-3.5 h-3.5 rounded-full border border-gray-200 flex-shrink-0 mt-0.5" />}
                      <span className={`text-xs ${item.done ? 'text-gray-500' : 'text-gray-300'}`}>{item.item}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-black/20 rounded-lg p-3">
                <p className="text-gray-400 text-xs uppercase tracking-wider font-semibold mb-1">Next step</p>
                <p className="text-gray-500 text-sm">{cert.nextStep}</p>
              </div>

              {cert.id === 'soc2' && (
                <div className="mt-3 flex items-center gap-2">
                  <a
                    href="https://www.vanta.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-orange-400/70 hover:text-orange-400 transition-colors"
                  >
                    <ExternalLink className="w-3 h-3" />
                    Run free Vanta gap assessment →
                  </a>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="bg-white border border-purple-100 rounded-xl p-5">
        <p className="text-gray-400 text-xs leading-relaxed">
          <span className="text-gray-500 font-medium">Important distinction:</span> GDPR and CCPA are regulatory compliance claims — they signal you follow the law. SOC 2, ISO 27001, and ISO 42001 are third-party audited certifications — they signal you can prove it. Both types matter. The badges above represent the combination that unlocks enterprise deals.
        </p>
      </div>
    </div>
  )
}
