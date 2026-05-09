import { createClient } from '@/lib/supabase/server'
import { api } from '@/lib/api'
import { MapPin, CheckCircle2, Circle, Lock, Zap, TrendingUp, ArrowRight, Sparkles } from 'lucide-react'

interface Milestone {
  id: string
  label: string
  completed: boolean
}

interface Phase {
  id: string
  name: string
  description: string
  products_required: string[]
  milestones: Milestone[]
  status: 'completed' | 'current' | 'upcoming'
}

interface Recommendation {
  product: string
  tier: string
  rationale: string
  estimated_roi: string
  time_to_value: string
}

interface RoiPeriod {
  leads: number
  revenue_impact_zar: number
}

interface RoadmapData {
  company_name: string
  industry: string
  maturity_score: number
  current_phase: string
  active_products: string[]
  phases: Phase[]
  next_recommendation: Recommendation
  roi_projection: {
    months_3: RoiPeriod
    months_6: RoiPeriod
    months_12: RoiPeriod
  }
  usage: {
    leads_sourced: number
    va_messages: number
    chatbot_conversations: number
  }
}

const PHASE_COLORS = {
  completed: {
    card: 'border-green-200 bg-green-50',
    badge: 'bg-green-100 text-green-700',
    dot: 'bg-green-500',
    connector: 'bg-green-400',
  },
  current: {
    card: 'border-brand-500 bg-white ring-2 ring-brand-500/20',
    badge: 'bg-brand-500 text-white',
    dot: 'bg-brand-500',
    connector: 'bg-gray-200',
  },
  upcoming: {
    card: 'border-gray-200 bg-white opacity-60',
    badge: 'bg-gray-100 text-gray-500',
    dot: 'bg-gray-300',
    connector: 'bg-gray-200',
  },
}

const PHASE_STATUS_LABELS = {
  completed: 'Done',
  current: 'Active',
  upcoming: 'Upcoming',
}

function MaturityGauge({ score }: { score: number }) {
  const segments = [
    { label: 'Foundation', min: 0, max: 25, color: 'bg-blue-400' },
    { label: 'Growth', min: 25, max: 50, color: 'bg-indigo-500' },
    { label: 'Scale', min: 50, max: 75, color: 'bg-violet-500' },
    { label: 'Enterprise', min: 75, max: 100, color: 'bg-brand-500' },
  ]

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-gray-900">AI Maturity Score</h3>
          <p className="text-sm text-gray-500">Based on your active products and usage</p>
        </div>
        <div className="text-right">
          <p className="text-4xl font-bold text-gray-900">{score}</p>
          <p className="text-sm text-gray-400">/ 100</p>
        </div>
      </div>

      {/* Track */}
      <div className="relative h-3 rounded-full bg-gray-100 overflow-hidden mb-2">
        <div
          className="absolute left-0 top-0 h-full rounded-full bg-gradient-to-r from-blue-400 via-indigo-500 via-violet-500 to-brand-500 transition-all duration-700"
          style={{ width: `${score}%` }}
        />
      </div>

      {/* Segment labels */}
      <div className="flex justify-between text-xs text-gray-400 mt-1">
        {segments.map((s) => (
          <span key={s.label}>{s.label}</span>
        ))}
      </div>
    </div>
  )
}

function PhaseCard({ phase, index, total }: { phase: Phase; index: number; total: number }) {
  const colors = PHASE_COLORS[phase.status]
  const isLast = index === total - 1

  return (
    <div className="flex gap-4">
      {/* Timeline spine */}
      <div className="flex flex-col items-center">
        <div className={`w-4 h-4 rounded-full shrink-0 mt-5 ${colors.dot} ${phase.status === 'current' ? 'ring-4 ring-brand-500/20' : ''}`} />
        {!isLast && <div className={`w-0.5 flex-1 mt-1 ${colors.connector}`} />}
      </div>

      {/* Card */}
      <div className={`flex-1 mb-4 border rounded-xl p-5 transition-all ${colors.card}`}>
        <div className="flex items-start justify-between mb-2">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-gray-900">{phase.name}</h3>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${colors.badge}`}>
                {PHASE_STATUS_LABELS[phase.status]}
              </span>
            </div>
            <p className="text-sm text-gray-500">{phase.description}</p>
          </div>
          {phase.status === 'upcoming' && <Lock className="w-4 h-4 text-gray-300 shrink-0 mt-0.5" />}
        </div>

        {/* Products required */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {phase.products_required.map((p) => (
            <span key={p} className="text-xs bg-white/60 border border-gray-200 text-gray-600 px-2 py-0.5 rounded-md">
              {p}
            </span>
          ))}
        </div>

        {/* Milestones */}
        {phase.milestones.length > 0 && (
          <div className="space-y-1.5">
            {phase.milestones.map((m) => (
              <div key={m.id} className="flex items-center gap-2">
                {m.completed ? (
                  <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                ) : (
                  <Circle className="w-4 h-4 text-gray-300 shrink-0" />
                )}
                <span className={`text-sm ${m.completed ? 'text-gray-700' : 'text-gray-400'}`}>{m.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function formatZar(amount: number) {
  return `R${(amount / 1000).toFixed(0)}K`
}

export default async function RoadmapPage() {
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  let roadmap: RoadmapData | null = null

  if (session) {
    try {
      const res = await api.get<{ data: RoadmapData }>('/roadmap', session.access_token)
      roadmap = res.data
    } catch {
      // API not yet available / client not onboarded
    }
  }

  if (!roadmap) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <MapPin className="w-12 h-12 text-brand-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Roadmap unavailable</h2>
          <p className="text-gray-500 mb-4">Complete your business profile to generate your AI roadmap.</p>
          <a
            href="/onboard"
            className="inline-block bg-brand-500 hover:bg-brand-600 text-white font-medium rounded-lg px-5 py-2.5 text-sm transition-colors"
          >
            Set up my profile
          </a>
        </div>
      </div>
    )
  }

  const { phases, next_recommendation: rec, roi_projection: roi, maturity_score, usage } = roadmap

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">AI Business Roadmap</h1>
        <p className="text-gray-500 text-sm mt-1">
          Your personalised journey to full AI transformation — tailored to {roadmap.company_name}.
        </p>
      </div>

      {/* Top row — maturity + usage stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <MaturityGauge score={maturity_score} />
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-100 p-5 flex flex-col gap-3">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <TrendingUp className="w-4 h-4 text-brand-500" />
              Platform Activity
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Leads sourced</span>
                <span className="font-medium text-gray-900">{usage.leads_sourced.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">VA messages</span>
                <span className="font-medium text-gray-900">{usage.va_messages.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Chatbot conversations</span>
                <span className="font-medium text-gray-900">{usage.chatbot_conversations.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Phase roadmap */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <MapPin className="w-5 h-5 text-brand-500" />
          Your Roadmap
        </h2>
        <div className="pl-1">
          {phases.map((phase, i) => (
            <PhaseCard key={phase.id} phase={phase} index={i} total={phases.length} />
          ))}
        </div>
      </div>

      {/* Next recommendation */}
      <div className="bg-gradient-to-br from-brand-900 to-brand-700 rounded-xl p-6 text-white">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-brand-300" />
            <h2 className="font-semibold text-lg">Recommended Next Step</h2>
          </div>
          <span className="text-xs bg-white/10 border border-white/20 px-2 py-1 rounded-full text-white/80">
            {rec.tier}
          </span>
        </div>

        <h3 className="text-xl font-bold mb-2">{rec.product}</h3>
        <p className="text-white/70 text-sm mb-5">{rec.rationale}</p>

        <div className="grid grid-cols-2 gap-4 mb-5">
          <div className="bg-white/10 rounded-lg p-3">
            <p className="text-white/50 text-xs mb-0.5">Estimated ROI</p>
            <p className="text-white font-medium text-sm">{rec.estimated_roi}</p>
          </div>
          <div className="bg-white/10 rounded-lg p-3">
            <p className="text-white/50 text-xs mb-0.5">Time to value</p>
            <p className="text-white font-medium text-sm">{rec.time_to_value}</p>
          </div>
        </div>

        <a
          href="/dashboard/billing"
          className="inline-flex items-center gap-2 bg-white text-brand-900 font-medium px-4 py-2.5 rounded-lg text-sm hover:bg-brand-50 transition-colors"
        >
          View plans
          <ArrowRight className="w-4 h-4" />
        </a>
      </div>

      {/* ROI Projection */}
      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Zap className="w-5 h-5 text-brand-500" />
          <h2 className="text-lg font-semibold text-gray-900">Revenue Impact Projection</h2>
        </div>
        <p className="text-sm text-gray-500 mb-5">
          Based on your current lead volume, 4% B2B conversion rate, and R85K avg deal value.
        </p>

        <div className="grid grid-cols-3 gap-4">
          {(
            [
              { label: '3 Months', data: roi.months_3 },
              { label: '6 Months', data: roi.months_6 },
              { label: '12 Months', data: roi.months_12 },
            ] as const
          ).map(({ label, data }) => (
            <div key={label} className="text-center border border-gray-100 rounded-xl p-4">
              <p className="text-xs text-gray-400 mb-1">{label}</p>
              <p className="text-2xl font-bold text-gray-900">{formatZar(data.revenue_impact_zar)}</p>
              <p className="text-xs text-gray-500 mt-1">{data.leads.toLocaleString()} leads</p>
            </div>
          ))}
        </div>

        <p className="text-xs text-gray-400 mt-4">
          * Projections are indicative. Actual results depend on your sales cycle, ICP fit, and follow-up speed.
        </p>
      </div>
    </div>
  )
}
