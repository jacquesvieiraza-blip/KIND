'use client'

/** V2 — AGENT THINKING STATE. Full-screen preview, sample data. Gated /v2. */

import { Sparkles, CheckCircle2, Circle, Loader2 } from 'lucide-react'

const BRAND = '#7C3AED'
const card = 'bg-white rounded-2xl border border-gray-200 shadow-sm'

const STEPS = [
  ['Sourced 200 leads from Apollo', 'done'],
  ['Scored every lead against your ICP', 'done'],
  ['Deduped against your CRM', 'done'],
  ['Writing 17 personalised first emails', 'active'],
  ['Scheduling the send under the warmup cap', 'pending'],
] as const

export default function ThinkingState() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex items-center gap-2 px-6 py-2 text-xs font-semibold text-white" style={{ background: BRAND }}>
        <Sparkles className="w-3.5 h-3.5" /> V2 PREVIEW · Agent Thinking State · sample data
      </div>
      <div className="max-w-3xl mx-auto px-6 py-7 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Agent Thinking State</h1>
          <p className="text-sm text-gray-500 mt-0.5">When FIGSY is working, you see exactly what it's doing — no black box.</p>
        </div>
        <div className={`${card} p-6`}>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-full overflow-hidden ring-2 ring-[#c4b5fd]"><img src="/agents/figsy.png" alt="FIGSY" className="w-full h-full object-cover" /></div>
            <div><p className="font-bold text-gray-900">FIGSY is working…</p><p className="text-xs text-gray-400">Campaign: Q3 African fintech</p></div>
            <span className="ml-auto text-xs font-bold px-3 py-1 rounded-full" style={{ color: BRAND, background: '#f3eeff' }}>Running</span>
          </div>
          <div className="space-y-1">
            {STEPS.map(([t, st]) => (
              <div key={t} className="flex items-center gap-3 py-2.5 border-b border-gray-50 last:border-0">
                {st === 'done' ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : st === 'active' ? <Loader2 className="w-5 h-5 animate-spin" style={{ color: BRAND }} /> : <Circle className="w-5 h-5 text-gray-300" />}
                <span className={`text-sm ${st === 'pending' ? 'text-gray-400' : st === 'active' ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>{t}</span>
              </div>
            ))}
          </div>
          <div className="mt-5">
            <div className="flex justify-between text-xs text-gray-400 mb-1.5"><span>Progress</span><span>3 of 5</span></div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden"><div className="h-full rounded-full" style={{ width: '60%', background: BRAND }} /></div>
          </div>
        </div>
      </div>
    </div>
  )
}
