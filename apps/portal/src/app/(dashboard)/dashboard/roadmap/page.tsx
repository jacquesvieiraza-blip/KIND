'use client'

import {
  CheckCircle2, Circle, Clock, Users, Bot, MessageSquare,
  Briefcase, Zap, ChevronRight, Brain, Inbox, Shield,
  Sparkles, BarChart2, BookOpen,
} from 'lucide-react'

type FeatureStatus = 'live' | 'building' | 'planned'

interface Feature {
  label: string
  status: FeatureStatus
  eta?: string
  new?: boolean
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
    icon: <Clock className="w-4 h-4 text-purple-500" />,
    labelClass: 'bg-[#F5F0FF] text-[#6D28D9]',
  },
  planned: {
    label: 'Planned',
    icon: <Circle className="w-4 h-4 text-gray-300" />,
    labelClass: 'bg-gray-50 text-[#7B6FA0]',
  },
}

const PRODUCTS: ProductRoadmap[] = [
  {
    key: 'lead_gen',
    name: 'AI Lead Generation',
    icon: <Users className="w-5 h-5" />,
    tagline: 'Precision B2B leads, scored and POPIA-compliant.',
    accentClass: 'text-[#7C3AED]',
    bgClass: 'bg-[#7C3AED]',
    features: [
      { label: 'Lead discovery & search', status: 'live' },
      { label: 'AI lead scoring (0–100)', status: 'live' },
      { label: 'POPIA consent workflow', status: 'live' },
      { label: 'ICP builder (define your ideal customer)', status: 'live' },
      { label: 'CSV export & bulk actions', status: 'live' },
      { label: 'CRM push — HubSpot & Pipedrive', status: 'live' },
      { label: 'Pipeline stage tabs (Pending / Consented / In FIGSY)', status: 'live', new: true },
      { label: 'AI research per lead — 3 insight bullets per prospect before outreach', status: 'live', new: true },
      { label: 'Team seats, invite flow & role-based access', status: 'live', new: true },
      { label: 'Score reasoning & explanations', status: 'building', eta: 'Jul 2026' },
      { label: 'Lead enrichment: LinkedIn + firmographic data', status: 'building', eta: 'Q3 2026' },
      { label: 'ICP builder with live name preview — see real contacts as you filter', status: 'planned', eta: 'Q3 2026' },
      { label: 'Waterfall enrichment (Apollo → PDL → Hunter) — richer lead data', status: 'planned', eta: 'Q3 2026' },
      { label: 'Intent signal triggers — job change / funding / tech stack signals', status: 'planned', eta: 'Q3 2026' },
      { label: 'Social signals audience source — LinkedIn engagement filters', status: 'planned', eta: 'Q4 2026' },
      { label: 'AI enrichment columns (technographics, news signals)', status: 'planned', eta: 'Q4 2026' },
    ],
  },
  {
    key: 'figsy',
    name: 'FIGSY — AI SDR',
    icon: <Zap className="w-5 h-5" />,
    tagline: 'Autonomous outreach — personalise, send, follow up, book meetings.',
    accentClass: 'text-amber-600',
    bgClass: 'bg-[#7C3AED]',
    features: [
      { label: 'AI-personalised email generation (per lead)', status: 'live' },
      { label: '3-step outreach sequences', status: 'live' },
      { label: 'Reply detection & AI classification', status: 'live' },
      { label: 'Campaign creation & management', status: 'live' },
      { label: 'Opt-out & POPIA suppression handling', status: 'live' },
      { label: 'CRM deal push on positive reply', status: 'live' },
      { label: 'Three-panel inbox with expanded reply classification (referral, OOO, unsubscribe, wrong-person)', status: 'live', new: true },
      { label: 'Co-Pilot approval mode (you review before send)', status: 'live', new: true },
      { label: 'AI Reply Assist (Help me reply)', status: 'live', new: true },
      { label: 'Knowledge & Compass training layer', status: 'live', new: true },
      { label: 'Campaign template library (6 pre-built sequences)', status: 'live', new: true },
      { label: 'Email score badge — AI quality check before send', status: 'live', new: true },
      { label: 'Suggest a campaign — AI recommends based on your ICP', status: 'live', new: true },
      { label: 'Meeting booking automation', status: 'building', eta: 'Jul 2026' },
      { label: 'Visual branching sequence builder', status: 'building', eta: 'Q3 2026' },
      { label: 'Adaptive send volume — auto-reduces sends when bounce/spam rate rises', status: 'live', new: true },
      { label: 'A/B subject line testing — 2 variants, FIGSY picks the winner', status: 'live', new: true },
      { label: 'Conditional sequence branching — behaviour-triggered follow-ups', status: 'live', new: true },
      { label: 'Kanban deal view — visual pipeline', status: 'live', new: true },
      { label: 'A/Z multi-variant testing (3–5 variants)', status: 'planned', eta: 'Q3 2026' },
      { label: 'Personalised images per lead — name/logo in email', status: 'planned', eta: 'Q4 2026' },
      { label: 'FIGSY Vertical Modes — industry-trained ICPs (Fintech, Health, Property)', status: 'planned', eta: 'Q4 2026' },
      { label: 'FIGSY Version B — live AI conversation in agent panel (real-time Claude responses)', status: 'planned', eta: 'Q3 2026' },
      { label: 'LinkedIn outreach channel', status: 'planned', eta: 'Q3 2026' },
      { label: 'Voice outreach via Vapi + Twilio', status: 'planned', eta: 'Q4 2026' },
      { label: 'WhatsApp outreach channel', status: 'planned', eta: 'Q4 2026' },
    ],
  },
  {
    key: 'virtual_assistant',
    name: 'Milla — Virtual Assistant',
    icon: <Bot className="w-5 h-5" />,
    tagline: 'Your AI co-worker for scheduling, research, and drafting.',
    accentClass: 'text-purple-600',
    bgClass: 'bg-purple-600',
    features: [
      { label: 'Conversational AI chat (Claude-powered)', status: 'live' },
      { label: 'Document upload & knowledge base', status: 'live' },
      { label: 'External tool integrations panel — Google Calendar, Google Docs, HubSpot, Slack', status: 'live', new: true },
      { label: 'Multi-language support — English, Français, Kiswahili, Hausa', status: 'live', new: true },
      { label: 'Email drafting & rewriting', status: 'building', eta: 'Jun 2026' },
      { label: 'Google Calendar scheduling (live connect)', status: 'building', eta: 'Jul 2026' },
      { label: 'Meeting notes summarisation', status: 'building', eta: 'Jul 2026' },
      { label: '3-type memory model — episodic, long-term, preference', status: 'live', new: true },
      { label: 'Voice input (WhatsApp Audio)', status: 'planned', eta: 'Q4 2026' },
      { label: 'Workflow automation (trigger-based)', status: 'planned', eta: 'Q4 2026' },
    ],
  },
  {
    key: 'chatbot',
    name: 'Vida — AI Chatbot Agent',
    icon: <MessageSquare className="w-5 h-5" />,
    tagline: 'Deploy a smart AI agent on your website or WhatsApp.',
    accentClass: 'text-teal-600',
    bgClass: 'bg-teal-600',
    features: [
      { label: 'Chatbot configuration dashboard', status: 'live' },
      { label: 'Embed on any website (script snippet)', status: 'live' },
      { label: 'Custom persona & tone settings', status: 'building', eta: 'Jun 2026' },
      { label: 'WhatsApp Business API integration', status: 'building', eta: 'Jul 2026' },
      { label: 'Lead capture & handoff to Lead Gen', status: 'building', eta: 'Jul 2026' },
      { label: 'Conversation analytics dashboard', status: 'planned', eta: 'Q3 2026' },
      { label: 'Product catalogue & FAQ ingestion', status: 'planned', eta: 'Q3 2026' },
      { label: 'Human takeover / live-chat escalation', status: 'planned', eta: 'Q3 2026' },
      { label: 'Multi-channel: Instagram DM, Facebook', status: 'planned', eta: 'Q4 2026' },
    ],
  },
  {
    key: 'platform',
    name: 'Platform & Intelligence',
    icon: <Brain className="w-5 h-5" />,
    tagline: 'Cross-agent intelligence, analytics, and compliance.',
    accentClass: 'text-gray-600',
    bgClass: 'bg-gray-700',
    features: [
      { label: 'Multi-agent dashboard (FIGSY + Milla + Vida)', status: 'live' },
      { label: 'Credit-based billing & usage tracking', status: 'live' },
      { label: 'POPIA compliance framework', status: 'live' },
      { label: 'Ask FIGSY AI assistant (always-on)', status: 'live', new: true },
      { label: 'Performance dashboard with funnel analytics', status: 'live', new: true },
      { label: 'Realtime dashboard — live stats, Supabase realtime', status: 'live', new: true },
      { label: 'System status monitoring', status: 'live' },
      { label: 'Team seats & role-based access — invite, roles, team dashboard', status: 'live', new: true },
      { label: 'White-label performance PDF export', status: 'live', new: true },
      { label: 'Network benchmarks — "Your industry averages X% reply rate"', status: 'live', new: true },
      { label: 'ICP auto-refinement — AI analyses 50+ leads and suggests ICP improvements', status: 'live', new: true },
      { label: 'Revenue forecasting — AI-predicted MRR for next 90 days (admin)', status: 'live', new: true },
      { label: 'Configurable agent triggers — send schedule, day/hour controls', status: 'live', new: true },
      { label: 'In-portal client messaging — direct message thread with your K.I.N.D team', status: 'live', new: true },
      { label: 'White-label / agency mode — run K.I.N.D under your own brand', status: 'live', new: true },
      { label: 'File approval workflow — sequence copy queued for client sign-off', status: 'planned', eta: 'Q4 2026' },
      { label: 'Cross-agent analytics (FIGSY + Vida combined funnel)', status: 'planned', eta: 'Q4 2026' },
      { label: 'African data moat — structured pan-African B2B dataset', status: 'planned', eta: '2027' },
    ],
  },
  {
    key: 'mcp',
    name: 'MCP Integrations',
    icon: <Zap className="w-5 h-5" />,
    tagline: 'Connect your tools to FIGSY — and use FIGSY from anywhere.',
    accentClass: 'text-blue-600',
    bgClass: 'bg-blue-600',
    features: [
      { label: 'K.I.N.D as MCP server — run FIGSY directly from Claude.ai with natural language', status: 'live', new: true },
      { label: 'MCP Connect page — step-by-step setup guide + AI agent walkthrough in portal', status: 'live', new: true },
      { label: 'Gmail MCP — email style training + send FIGSY outreach from your own domain', status: 'planned', eta: 'Q3 2026' },
      { label: 'Outlook MCP — send outreach from your Microsoft 365 address', status: 'planned', eta: 'Q3 2026' },
      { label: 'Google Calendar MCP — FIGSY books meetings directly into your calendar', status: 'planned', eta: 'Q3 2026' },
      { label: 'Slack MCP — instant team notification when a lead qualifies', status: 'planned', eta: 'Q3 2026' },
      { label: 'Salesforce MCP — bi-directional CRM sync (Dominate plan only)', status: 'planned', eta: 'Q4 2026' },
      { label: 'HubSpot MCP — bi-directional CRM sync (Dominate plan only)', status: 'planned', eta: 'Q4 2026' },
    ],
  },
]

const UPCOMING_HIGHLIGHTS = [
  { label: 'Meeting Booking', desc: 'FIGSY detects interest and books meetings automatically via Cal.com.', eta: 'Jul 2026', icon: <CheckCircle2 className="w-5 h-5 text-green-400" /> },
  { label: 'Adaptive Sending', desc: 'FIGSY auto-reduces send volume when bounce/spam rises — protecting your domain reputation.', eta: 'Q3 2026', icon: <Zap className="w-5 h-5 text-blue-400" /> },
  { label: 'A/B Subject Lines', desc: 'Test 2 subject line variants per sequence step — FIGSY picks the winner automatically.', eta: 'Q3 2026', icon: <Sparkles className="w-5 h-5 text-purple-400" /> },
  { label: 'Revenue Forecasting', desc: 'AI-predicted MRR for the next 90 days based on your pipeline and churn signals.', eta: 'Q3 2026', icon: <BarChart2 className="w-5 h-5 text-green-400" /> },
  { label: 'ICP Auto-Refinement', desc: 'After 50+ leads, FIGSY analyses patterns and suggests improvements to your ideal customer profile.', eta: 'Q3 2026', icon: <Brain className="w-5 h-5 text-amber-400" /> },
  { label: 'Sequence Branching', desc: 'Build conditional follow-up paths — FIGSY adapts the sequence based on how a lead responds.', eta: 'Q3 2026', icon: <BookOpen className="w-5 h-5 text-blue-400" /> },
]

function StatusBadge({ status, isNew }: { status: FeatureStatus; isNew?: boolean }) {
  const meta = STATUS_META[status]
  return (
    <div className="flex items-center gap-1.5">
      {isNew && (
        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[#7C3AED] text-white uppercase tracking-wide">
          New
        </span>
      )}
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${meta.labelClass}`}>
        {meta.label}
      </span>
    </div>
  )
}

export default function RoadmapPage() {
  const allFeatures = PRODUCTS.flatMap(p => p.features)
  const live     = allFeatures.filter(f => f.status === 'live').length
  const building = allFeatures.filter(f => f.status === 'building').length
  const planned  = allFeatures.filter(f => f.status === 'planned').length
  const newCount = allFeatures.filter(f => f.new).length

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Page header */}
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#7C3AED] to-[#6D28D9] flex items-center justify-center shrink-0">
          <BarChart2 className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Product Roadmap</h1>
          <p className="text-[#7B6FA0] text-sm mt-1">What's live, what we're building, and what's coming next across all K.I.N.D agents.</p>
        </div>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon: <CheckCircle2 className="w-5 h-5 text-green-500" />, label: 'Live features', value: live, sub: 'Available now', bg: 'bg-green-50' },
          { icon: <Sparkles className="w-5 h-5 text-[#7C3AED]" />, label: 'Just shipped', value: newCount, sub: 'This sprint', bg: 'bg-[#F5F0FF]' },
          { icon: <Clock className="w-5 h-5 text-amber-500" />, label: 'In development', value: building, sub: 'Shipping soon', bg: 'bg-amber-50' },
          { icon: <Circle className="w-5 h-5 text-[#9B8EC4]" />, label: 'Planned', value: planned, sub: 'On the horizon', bg: 'bg-gray-50' },
        ].map(({ icon, label, value, sub, bg }) => (
          <div key={label} className="bg-white/80 backdrop-blur-sm rounded-xl border border-purple-100/60 p-4 flex items-center gap-3">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${bg} shrink-0`}>{icon}</div>
            <div>
              <p className="text-xl font-bold text-gray-900">{value}</p>
              <p className="text-xs font-medium text-gray-600">{label}</p>
              <p className="text-[11px] text-[#9B8EC4]">{sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Coming soon highlights */}
      <div className="bg-gradient-to-br from-[#1A0F47] to-[#0F0929] rounded-2xl p-6 text-white">
        <div className="flex items-center gap-2 mb-1">
          <Zap className="w-4 h-4 text-blue-300" />
          <h2 className="font-bold text-white">Shipping next</h2>
        </div>
        <p className="text-white/50 text-sm mb-5">Features landing in the next 60 days.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {UPCOMING_HIGHLIGHTS.map(({ label, desc, eta, icon }) => (
            <div key={label} className="bg-white/8 hover:bg-white/12 transition-colors rounded-xl p-4 border border-white/8">
              <div className="flex items-start gap-3 mb-2">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                  {icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm leading-tight">{label}</p>
                  <p className="text-white/40 text-[10px] mt-0.5">{eta}</p>
                </div>
              </div>
              <p className="text-white/55 text-xs leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Per-product roadmaps */}
      <div className="space-y-5">
        {PRODUCTS.map(product => {
          const liveCount  = product.features.filter(f => f.status === 'live').length
          const totalCount = product.features.length
          const pct        = Math.round((liveCount / totalCount) * 100)
          const newFeatures = product.features.filter(f => f.new).length

          return (
            <div key={product.key} className="bg-white/80 backdrop-blur-sm rounded-xl border border-purple-100/60 overflow-hidden">
              {/* Product header */}
              <div className={`${product.bgClass} px-5 py-4 text-white`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                      {product.icon}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-sm">{product.name}</h3>
                        {newFeatures > 0 && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-white/20 text-white uppercase tracking-wide">
                            {newFeatures} new
                          </span>
                        )}
                      </div>
                      <p className="text-white/65 text-xs mt-0.5">{product.tagline}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-semibold text-white/80">{liveCount}/{totalCount} live</p>
                    <div className="w-20 bg-white/20 rounded-full h-1.5 mt-1.5">
                      <div className="bg-white h-1.5 rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    <p className="text-[10px] text-white/50 mt-1">{pct}% complete</p>
                  </div>
                </div>
              </div>

              {/* Feature list */}
              <div className="px-5 py-4">
                <div className="space-y-0.5">
                  {product.features.map((feature, i) => {
                    const meta = STATUS_META[feature.status]
                    return (
                      <div key={i} className={`flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0 ${feature.status === 'planned' ? 'opacity-60' : ''}`}>
                        <div className="flex items-center gap-3">
                          {meta.icon}
                          <span className={`text-sm ${
                            feature.status === 'live'     ? 'text-gray-800 font-medium' :
                            feature.status === 'building' ? 'text-gray-700' :
                                                           'text-[#9B8EC4]'
                          }`}>
                            {feature.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 shrink-0 ml-4">
                          {feature.eta && (
                            <span className="text-xs text-[#9B8EC4] hidden sm:block">{feature.eta}</span>
                          )}
                          <StatusBadge status={feature.status} isNew={feature.new} />
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
      <div className="bg-gray-50 border border-purple-100/60 rounded-xl p-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="font-bold text-gray-900">Have a feature request?</h3>
          <p className="text-sm text-[#7B6FA0] mt-0.5">We build based on what our clients need. Tell us what would help your business most.</p>
        </div>
        <a
          href="mailto:hello@get-kind.com?subject=Feature+Request"
          className="flex items-center gap-2 bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors shrink-0"
        >
          Request a feature <ChevronRight className="w-4 h-4" />
        </a>
      </div>
    </div>
  )
}
