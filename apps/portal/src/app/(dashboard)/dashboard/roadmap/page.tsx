'use client'

import { CheckCircle2, Circle, Clock, Users, Bot, MessageSquare, Briefcase, Zap, ChevronRight } from 'lucide-react'

type FeatureStatus = 'live' | 'building' | 'planned'

interface Feature {
  label: string
  status: FeatureStatus
  eta?: string
}

interface ProductRoadmap {
  key: string
  name: string
  icon: React.ReactNode
  tagline: string
  accentClass: string
  bgClass: string
  features: Feature[]
}

const STATUS_META: Record<FeatureStatus, { label: string; icon: React.ReactNode; labelClass: string }> = {
  live: {
    label: 'Live',
    icon: <CheckCircle2 className="w-4 h-4 text-green-500" />,
    labelClass: 'bg-green-50 text-green-700',
  },
  building: {
    label: 'Building',
    icon: <Clock className="w-4 h-4 text-blue-500" />,
    labelClass: 'bg-blue-50 text-blue-700',
  },
  planned: {
    label: 'Planned',
    icon: <Circle className="w-4 h-4 text-gray-300" />,
    labelClass: 'bg-gray-50 text-gray-500',
  },
}

const PRODUCTS: ProductRoadmap[] = [
  {
    key: 'lead_gen',
    name: 'AI Lead Generation',
    icon: <Users className="w-5 h-5" />,
    tagline: 'Precision B2B leads, scored and POPIA-compliant.',
    accentClass: 'text-blue-600',
    bgClass: 'bg-blue-600',
    features: [
      { label: 'Lead discovery & search', status: 'live' },
      { label: 'AI lead scoring (0–100)', status: 'live' },
      { label: 'POPIA consent workflow', status: 'live' },
      { label: 'CSV export', status: 'live' },
      { label: 'ICP builder (define your ideal customer)', status: 'building', eta: 'Jun 2026' },
      { label: 'CRM export — HubSpot & Pipedrive', status: 'building', eta: 'Jun 2026' },
      { label: 'Score reasoning & explanations', status: 'building', eta: 'Jul 2026' },
      { label: 'Enrichment: LinkedIn + company data', status: 'planned', eta: 'Q3 2026' },
      { label: 'Automated outreach sequences', status: 'planned', eta: 'Q3 2026' },
      { label: 'Team collaboration & lead assignment', status: 'planned', eta: 'Q4 2026' },
    ],
  },
  {
    key: 'virtual_assistant',
    name: 'Virtual Assistant',
    icon: <Bot className="w-5 h-5" />,
    tagline: 'Your AI co-worker for scheduling, research, and drafting.',
    accentClass: 'text-indigo-600',
    bgClass: 'bg-indigo-600',
    features: [
      { label: 'Conversational AI chat (Claude-powered)', status: 'live' },
      { label: 'Email drafting & rewriting', status: 'live' },
      { label: 'Meeting notes summarisation', status: 'building', eta: 'Jun 2026' },
      { label: 'Google Calendar scheduling', status: 'building', eta: 'Jul 2026' },
      { label: 'File upload & document Q&A', status: 'building', eta: 'Jul 2026' },
      { label: 'Custom knowledge base integration', status: 'planned', eta: 'Q3 2026' },
      { label: 'Multi-language support (French, Swahili, Hausa)', status: 'planned', eta: 'Q3 2026' },
      { label: 'Voice input (WhatsApp Audio)', status: 'planned', eta: 'Q4 2026' },
      { label: 'Workflow automation (trigger-based)', status: 'planned', eta: 'Q4 2026' },
    ],
  },
  {
    key: 'chatbot',
    name: 'AI Chatbot Agent',
    icon: <MessageSquare className="w-5 h-5" />,
    tagline: 'Deploy a smart AI agent on your website or WhatsApp.',
    accentClass: 'text-purple-600',
    bgClass: 'bg-purple-600',
    features: [
      { label: 'Chatbot configuration dashboard', status: 'live' },
      { label: 'Embed on any website (script snippet)', status: 'live' },
      { label: 'Custom persona & tone settings', status: 'building', eta: 'Jun 2026' },
      { label: 'WhatsApp Business API integration', status: 'building', eta: 'Jul 2026' },
      { label: 'Lead capture & handoff to Lead Gen', status: 'building', eta: 'Jul 2026' },
      { label: 'Conversation analytics dashboard', status: 'planned', eta: 'Q3 2026' },
      { label: 'Product catalogue & FAQ ingestion', status: 'planned', eta: 'Q3 2026' },
      { label: 'Human takeover / live-chat escalation', status: 'planned', eta: 'Q3 2026' },
      { label: 'White-label branding option', status: 'planned', eta: 'Q4 2026' },
      { label: 'Multi-channel: Instagram DM, Facebook', status: 'planned', eta: 'Q4 2026' },
    ],
  },
  {
    key: 'consulting',
    name: 'Monthly Consulting Retainer',
    icon: <Briefcase className="w-5 h-5" />,
    tagline: 'Strategic AI guidance from our team, billed monthly.',
    accentClass: 'text-green-600',
    bgClass: 'bg-green-600',
    features: [
      { label: 'Dedicated Slack channel with K.I.N.D team', status: 'live' },
      { label: 'Monthly strategy session (video call)', status: 'live' },
      { label: 'AI audit & quick-wins report', status: 'live' },
      { label: 'Quarterly Business Review (QBR) deck', status: 'building', eta: 'Jun 2026' },
      { label: 'Custom AI use-case scoping', status: 'building', eta: 'Jun 2026' },
      { label: 'Priority feature requests', status: 'planned', eta: 'Q3 2026' },
      { label: 'ROI tracking dashboard', status: 'planned', eta: 'Q3 2026' },
      { label: 'Staff AI training workshops', status: 'planned', eta: 'Q4 2026' },
    ],
  },
]

const UPCOMING_HIGHLIGHTS = [
  { label: 'ICP Builder', desc: 'Define your ideal customer profile and auto-target leads.', eta: 'Jun 2026' },
  { label: 'WhatsApp Bot', desc: 'Deploy your chatbot directly on WhatsApp Business.', eta: 'Jul 2026' },
  { label: 'CRM Sync', desc: 'Push leads straight to HubSpot or Pipedrive in one click.', eta: 'Jun 2026' },
  { label: 'Document Q&A', desc: 'Upload docs and ask your Virtual Assistant anything about them.', eta: 'Jul 2026' },
]

function StatusBadge({ status }: { status: FeatureStatus }) {
  const meta = STATUS_META[status]
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${meta.labelClass}`}>
      {meta.label}
    </span>
  )
}

export default function RoadmapPage() {
  const allFeatures = PRODUCTS.flatMap(p => p.features)
  const live = allFeatures.filter(f => f.status === 'live').length
  const building = allFeatures.filter(f => f.status === 'building').length
  const planned = allFeatures.filter(f => f.status === 'planned').length

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Zap className="w-6 h-6 text-[#0066FF]" />Product Roadmap
        </h1>
        <p className="text-gray-500 text-sm mt-1">What's live, what we're building, and what's coming next across all K.I.N.D products.</p>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { icon: <CheckCircle2 className="w-5 h-5 text-green-500" />, label: 'Live features', value: live, sub: 'Available now', bg: 'bg-green-50' },
          { icon: <Clock className="w-5 h-5 text-blue-500" />, label: 'In development', value: building, sub: 'Shipping soon', bg: 'bg-blue-50' },
          { icon: <Circle className="w-5 h-5 text-gray-400" />, label: 'Planned', value: planned, sub: 'On the horizon', bg: 'bg-gray-50' },
        ].map(({ icon, label, value, sub, bg }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-100 p-5 flex items-center gap-4">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${bg}`}>{icon}</div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{value}</p>
              <p className="text-sm text-gray-500">{label}</p>
              <p className="text-xs text-gray-400">{sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Coming soon highlights */}
      <div className="bg-gradient-to-r from-[#001f4d] to-[#003080] rounded-xl p-6 text-white">
        <h2 className="font-semibold mb-1">Coming soon</h2>
        <p className="text-white/60 text-sm mb-4">Features shipping in the next 60 days.</p>
        <div className="grid grid-cols-2 gap-3">
          {UPCOMING_HIGHLIGHTS.map(({ label, desc, eta }) => (
            <div key={label} className="bg-white/10 hover:bg-white/15 transition-colors rounded-lg p-4">
              <div className="flex items-center justify-between mb-1">
                <p className="font-medium text-sm">{label}</p>
                <span className="text-white/50 text-xs">{eta}</span>
              </div>
              <p className="text-white/60 text-xs">{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Per-product roadmaps */}
      <div className="space-y-6">
        {PRODUCTS.map(product => {
          const liveCount = product.features.filter(f => f.status === 'live').length
          const totalCount = product.features.length
          const pct = Math.round((liveCount / totalCount) * 100)

          return (
            <div key={product.key} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              {/* Product header */}
              <div className={`${product.bgClass} px-6 py-4 text-white`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center">
                      {product.icon}
                    </div>
                    <div>
                      <h3 className="font-semibold">{product.name}</h3>
                      <p className="text-white/70 text-xs">{product.tagline}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">{liveCount}/{totalCount} live</p>
                    <div className="w-24 bg-white/20 rounded-full h-1.5 mt-1.5">
                      <div className="bg-white h-1.5 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Feature list */}
              <div className="p-6">
                <div className="space-y-3">
                  {product.features.map((feature, i) => {
                    const meta = STATUS_META[feature.status]
                    return (
                      <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                        <div className="flex items-center gap-3">
                          {meta.icon}
                          <span className={`text-sm ${feature.status === 'live' ? 'text-gray-700 font-medium' : feature.status === 'building' ? 'text-gray-700' : 'text-gray-400'}`}>
                            {feature.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          {feature.eta && (
                            <span className="text-xs text-gray-400 hidden sm:block">{feature.eta}</span>
                          )}
                          <StatusBadge status={feature.status} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Feedback CTA */}
      <div className="bg-gray-50 border border-gray-100 rounded-xl p-6 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-gray-900">Have a feature request?</h3>
          <p className="text-sm text-gray-500 mt-0.5">We build based on what our clients need. Tell us what would help your business most.</p>
        </div>
        <a
          href="mailto:hello@kind.ai?subject=Feature+Request"
          className="flex items-center gap-2 bg-[#0066FF] hover:bg-[#0055dd] text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors shrink-0 ml-4"
        >
          Request a feature <ChevronRight className="w-4 h-4" />
        </a>
      </div>
    </div>
  )
}
