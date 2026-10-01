'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { createClient } from '@/lib/supabase/client'

// ⚑ 1 Oct (R180 · Coaching #2490 · #2493 · #2499) — YOUR PLAN, as one section on the existing
// Programme screen, in its existing style (R167): the same `mv-section` and `mv-kv-list` the 25/50/75%
// moment uses. Every word and every price is the server's (`lib/plan-overview.ts`, prices from
// `@kind/shared`) — this component adds no number and no wording of its own.
//
// ⚠️ NO SELL. The Full Coaching row is a fact, with no price and no button; the offer is the 50%
// moment's. No plan (no band yet, or an unreadable read) → the section is simply absent.

type Plan = {
  plan: 'founders' | 'growth' | 'enterprise'; name: string; promise: string; summary: string
  price: string; size: string; includes: string[]
  fullCoaching: 'included' | 'on' | 'off'; fullCoachingLine: string
}

async function token(): Promise<string | undefined> {
  try { const { data } = await createClient().auth.getSession(); return data.session?.access_token } catch { return undefined }
}

export default function PlanOverview() {
  const [v, setV] = useState<Plan | null>(null)
  useEffect(() => {
    let live = true
    void (async () => {
      try {
        const r = await api.get<{ data: { plan: Plan | null } }>('/my/programme/plan', await token())
        if (live) setV(r.data.plan)
      } catch { if (live) setV(null) }
    })()
    return () => { live = false }
  }, [])

  if (!v) return null
  return (
    <div className="mv-section" data-testid="plan-overview">
      <div className="mv-section-head">
        <b>Your plan · {v.name}</b>
        <span>{v.price}</span>
      </div>
      <div className="mv-section-body">
        <p className="text-[13.5px] font-extrabold text-[#1f1235]">{v.promise}</p>
        <p className="text-[12.5px] text-[#4c4368] leading-relaxed mt-0.5">{v.summary}</p>
        <ul className="flex flex-col gap-1 mt-2.5">
          {v.includes.map(i => (
            <li key={i} className="text-[12.5px] text-[#4c4368] leading-relaxed">✓ {i}</li>
          ))}
        </ul>
        <div className="mv-kv-list mt-2.5">
          <div className="mv-kv-row"><span>Full Coaching</span><strong>{v.fullCoachingLine}</strong></div>
          <div className="mv-kv-row"><span>Set by your company size</span><strong>{v.size}</strong></div>
        </div>
      </div>
    </div>
  )
}
