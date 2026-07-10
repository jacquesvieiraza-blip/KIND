'use client'

/** FIGSY "thinking" panel — shows what the agent is doing during an async run
 *  (sourcing, scoring, deduping, writing, scheduling). Gated at the call site by
 *  FEATURE_V2_SCREENS=thinking. Auto-advances for a live, no-black-box feel. */

import { useState, useEffect } from 'react'
import { CheckCircle2, Circle, Loader2 } from 'lucide-react'

const BRAND = '#7C3AED'

const STEPS = [
  'Sourcing your leads',
  'Scoring every lead against your ICP',
  'Deduping against your CRM',
  'Writing personalised first emails',
  'Scheduling under the warmup cap',
]

export function FigsyThinking({ campaignName }: { campaignName?: string }) {
  const [active, setActive] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setActive(a => Math.min(a + 1, STEPS.length - 1)), 3500)
    return () => clearInterval(t)
  }, [])

  const pct = Math.round(((active + 1) / STEPS.length) * 100)

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-full overflow-hidden ring-2 ring-[#c4b5fd]">
          <img src="/agents/figsy.png" alt="FIGSY" className="w-full h-full object-cover object-top" />
        </div>
        <div>
          <p className="font-bold text-gray-900">FIGSY is working…</p>
          {campaignName && <p className="text-xs text-gray-400">Campaign: {campaignName}</p>}
        </div>
        <span className="ml-auto text-xs font-bold px-3 py-1 rounded-full" style={{ color: BRAND, background: '#f3eeff' }}>Running</span>
      </div>
      <div className="space-y-1">
        {STEPS.map((t, i) => {
          const st = i < active ? 'done' : i === active ? 'active' : 'pending'
          return (
            <div key={t} className="flex items-center gap-3 py-2.5 border-b border-gray-50 last:border-0">
              {st === 'done' ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : st === 'active' ? <Loader2 className="w-5 h-5 animate-spin" style={{ color: BRAND }} /> : <Circle className="w-5 h-5 text-gray-300" />}
              <span className={`text-sm ${st === 'pending' ? 'text-gray-400' : st === 'active' ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>{t}</span>
            </div>
          )
        })}
      </div>
      <div className="mt-5">
        <div className="flex justify-between text-xs text-gray-400 mb-1.5"><span>Progress</span><span>{active + 1} of {STEPS.length}</span></div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden"><div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: BRAND }} /></div>
      </div>
    </div>
  )
}
