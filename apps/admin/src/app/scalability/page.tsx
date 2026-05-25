export const dynamic = 'force-dynamic'

import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'
import { TrendingUp } from 'lucide-react'

async function getClientCount(): Promise<number> {
  try {
    const db = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    )
    const { count } = await db.from('clients').select('*', { count: 'exact', head: true })
    return count || 0
  } catch { return 0 }
}

type Stage = { label: string; range: string; min: number; max: number; hire: string; focus: string }

const STAGES: Stage[] = [
  { label: 'Founder Sales', range: '0–10 clients', min: 0, max: 10, hire: 'No hire yet', focus: 'Close everything yourself. Document every call.' },
  { label: 'SDR Support', range: '10–30 clients', min: 10, max: 30, hire: '1 × SDR (R20–30k/mo)', focus: 'SDR qualifies inbound, you close. Build the playbook.' },
  { label: 'First AE', range: '30–80 clients', min: 30, max: 80, hire: '1 × Junior AE (R35–50k/mo)', focus: 'AE runs documented playbook. You close edge cases only.' },
  { label: 'Sales Team', range: '80–200 clients', min: 80, max: 200, hire: '2–3 AEs + 1 SE', focus: 'Structured pipeline. Founder moves to partners + enterprise.' },
  { label: 'Full Org', range: '200+ clients', min: 200, max: 9999, hire: 'Sales manager + territories', focus: 'Market leader motion.' },
]

const PRE_HIRE_CHECKLIST = [
  { item: 'Sales process fully documented in writing', done: false, blocker: true },
  { item: 'Discovery script written and tested', done: false, blocker: true },
  { item: 'Demo flow is a repeatable 20-min script', done: false, blocker: true },
  { item: 'Objection-response library built', done: false, blocker: false },
  { item: 'All deals tracked in HubSpot with loss reasons', done: false, blocker: true },
  { item: '3+ months of closed deal data', done: false, blocker: true },
  { item: 'FIGSY pipeline generating overflow (more leads than you can handle)', done: false, blocker: true },
  { item: 'Apollo Professional plan live', done: false, blocker: true },
  { item: '$10,000 MRR reached', done: false, blocker: true },
  { item: 'Growing 20%+ month-on-month', done: false, blocker: false },
]

const HIRE_TRIGGERS = [
  { label: 'Repeatable documented sales process', description: 'Discovery script, demo flow, objection responses, proposal template all written down' },
  { label: 'Overflow pipeline', description: 'More qualified leads coming in than you can personally handle — leads going cold' },
  { label: '3+ months of deal data', description: 'You know your average sales cycle, close rate per channel, deal size distribution' },
]

export default async function ScalabilityPage() {
  const clientCount = await getClientCount()
  const currentStage = STAGES.find(s => clientCount >= s.min && clientCount < s.max) || STAGES[0]
  const currentStageIndex = STAGES.indexOf(currentStage)

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Scalability Tracker</h1>
        <p className="text-white/40 text-sm mt-1">Founder sales → full sales team. Where you are. What comes next.</p>
      </div>

      {/* Current Stage */}
      <div className="bg-[#0066FF]/10 border border-[#0066FF]/20 rounded-xl p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-[#0066FF] font-semibold uppercase tracking-wider mb-1">Current Stage</p>
            <h2 className="text-xl font-bold text-white">{currentStage.label}</h2>
            <p className="text-white/50 text-sm mt-1">{currentStage.range} · {clientCount} clients now</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-white/30 mb-1">Next hire</p>
            <p className="text-sm text-white/70 font-medium">{STAGES[currentStageIndex + 1]?.hire || 'Full team'}</p>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-[#0066FF]/20">
          <p className="text-sm text-white/60"><span className="text-white font-medium">Focus right now:</span> {currentStage.focus}</p>
        </div>
      </div>

      {/* Scaling Path */}
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-6">
        <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-6">The Scaling Path</h2>
        <div className="space-y-0">
          {STAGES.map((stage, i) => {
            const isActive = i === currentStageIndex
            const isPast = i < currentStageIndex
            const isFuture = i > currentStageIndex
            return (
              <div key={stage.label} className="flex gap-4">
                {/* Line + dot */}
                <div className="flex flex-col items-center">
                  <div className={`w-3 h-3 rounded-full flex-shrink-0 mt-1 ${isActive ? 'bg-[#0066FF]' : isPast ? 'bg-emerald-400' : 'bg-white/20'}`} />
                  {i < STAGES.length - 1 && <div className={`w-px flex-1 my-1 ${isPast ? 'bg-emerald-400/40' : 'bg-white/10'}`} style={{minHeight:'32px'}} />}
                </div>
                {/* Content */}
                <div className={`pb-6 ${isFuture ? 'opacity-40' : ''}`}>
                  <div className="flex items-center gap-3 mb-0.5">
                    <p className={`text-sm font-semibold ${isActive ? 'text-white' : isPast ? 'text-emerald-400' : 'text-white/60'}`}>{stage.label}</p>
                    <span className="text-xs text-white/30">{stage.range}</span>
                    {isActive && <span className="text-[10px] bg-[#0066FF]/20 text-[#0066FF] px-2 py-0.5 rounded-full font-medium">YOU ARE HERE</span>}
                  </div>
                  <p className="text-xs text-white/40 mb-1">Hire: {stage.hire}</p>
                  <p className="text-xs text-white/50">{stage.focus}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Two columns */}
      <div className="grid grid-cols-2 gap-6">
        {/* Hire Triggers */}
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-6">
          <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-4">The 3 Hire Triggers</h2>
          <p className="text-xs text-white/30 mb-4">All 3 must be true before hiring an AE. Not 2 out of 3.</p>
          <div className="space-y-4">
            {HIRE_TRIGGERS.map((trigger, i) => (
              <div key={i} className="flex gap-3">
                <div className="w-5 h-5 rounded border border-white/20 flex-shrink-0 mt-0.5 flex items-center justify-center">
                  <span className="text-white/20 text-xs">{i + 1}</span>
                </div>
                <div>
                  <p className="text-sm text-white/80 font-medium">{trigger.label}</p>
                  <p className="text-xs text-white/40 mt-0.5">{trigger.description}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-white/[0.06]">
            <p className="text-xs text-amber-400/80">⚠️ Don&apos;t hire to solve a capacity problem you haven&apos;t had yet. Hire to scale a process you&apos;ve already proven.</p>
          </div>
        </div>

        {/* Pre-hire checklist */}
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-6">
          <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-4">Pre-Hire Checklist</h2>
          <p className="text-xs text-white/30 mb-4">Complete before any sales hire. Red = blocker.</p>
          <div className="space-y-2">
            {PRE_HIRE_CHECKLIST.map((check, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <div className={`w-4 h-4 rounded border flex-shrink-0 mt-0.5 ${check.done ? 'bg-emerald-400 border-emerald-400' : check.blocker ? 'border-red-400/50' : 'border-white/20'}`} />
                <p className={`text-xs ${check.done ? 'text-white/40 line-through' : check.blocker ? 'text-white/70' : 'text-white/50'}`}>
                  {check.item}
                  {check.blocker && !check.done && <span className="ml-1.5 text-red-400/70 text-[10px]">blocker</span>}
                </p>
              </div>
            ))}
          </div>
          <p className="text-xs text-white/20 mt-4">0 / {PRE_HIRE_CHECKLIST.length} complete</p>
        </div>
      </div>

      {/* Economics */}
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-6">
        <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-4">SA Market Salary Benchmarks</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.06]">
              {['Role', 'Base/mo', 'OTE/mo', 'Quota', 'Break-even pipeline'].map(h => (
                <th key={h} className="text-left px-0 py-2 text-xs text-white/30 uppercase tracking-wider pr-6">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {[
              ['Junior AE', 'R35–50k', 'R70–90k', '5–8× OTE in ARR', '20–30 clients/mo at $80 ARPU'],
              ['Mid-market AE', 'R60–80k', 'R120–160k', '5–8× OTE', '50+ clients/mo'],
              ['Sales Engineer', 'R50–70k', 'R100–130k', 'Tied to AE', 'Deal size >$5k to justify'],
              ['SDR (first hire)', 'R20–30k', 'R35–45k', '20 qualified calls/mo', '~2–3 closed deals/mo from their pipeline'],
            ].map(([role, base, ote, quota, be]) => (
              <tr key={role}>
                <td className="py-3 text-white font-medium pr-6">{role}</td>
                <td className="py-3 text-white/60 pr-6">{base}</td>
                <td className="py-3 text-white/60 pr-6">{ote}</td>
                <td className="py-3 text-white/60 pr-6">{quota}</td>
                <td className="py-3 text-white/40 text-xs">{be}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Links */}
      <div className="flex gap-4">
        <Link href="/docs/master" className="text-xs text-[#0066FF] hover:text-blue-400 transition-colors">
          Read Section 29 in MASTER →
        </Link>
        <Link href="/clients" className="text-xs text-white/40 hover:text-white/60 transition-colors">
          View all clients →
        </Link>
      </div>
    </div>
  )
}
