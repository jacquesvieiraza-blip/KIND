'use client'

// M10 — CLIENT PIPELINE. The gap between "I approved this lead" and "a meeting appeared":
// the client paid $4 and then couldn't see what happened next. This shows their approved
// leads moving Approved → Contacted → Replied → Booked, from GET /leads/pipeline.
// Read-only by design — the client approves, we do the work (founder-locked north star).

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { createClient } from '@/lib/supabase/client'

type Card = { id: string; name: string; company: string | null; job_title: string | null; score: number | null; classification?: string | null; start_time?: string | null }
type Pipeline = {
  counts: { approved: number; contacted: number; replied: number; booked: number }
  stages: { approved: Card[]; contacted: Card[]; replied: Card[]; booked: Card[] }
}

async function token(): Promise<string | undefined> {
  try { const { data } = await createClient().auth.getSession(); return data.session?.access_token } catch { return undefined }
}

const STAGES: { key: keyof Pipeline['stages']; label: string; sub: string; tone: string; bg: string }[] = [
  { key: 'approved',  label: 'Approved',  sub: 'you said go — we start outreach', tone: '#7C3AED', bg: '#f3ecff' },
  { key: 'contacted', label: 'Contacted', sub: 'we have emailed them',            tone: '#0369a1', bg: '#e0f2fe' },
  { key: 'replied',   label: 'Replied',   sub: 'they answered — we handle it',    tone: '#b45309', bg: '#fef3c7' },
  { key: 'booked',    label: 'Booked',    sub: 'meeting in the diary',            tone: '#059669', bg: '#ecfdf5' },
]

export default function MillaPipelinePage() {
  const [p, setP] = useState<Pipeline | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    (async () => {
      try {
        const r = await api.get<{ data: Pipeline }>('/leads/pipeline', await token())
        setP(r.data)
      } catch (e) { setError(e instanceof Error ? e.message : 'Could not load your pipeline') }
    })()
  }, [])

  const total = p ? p.counts.approved + p.counts.contacted + p.counts.replied + p.counts.booked : 0

  return (
    <div className="h-full overflow-y-auto px-5 py-4">
      <div className="mb-4">
        <h1 className="text-[19px] font-extrabold text-[#1f1235]">Pipeline</h1>
        <p className="text-[12.5px] text-[#9b8ec4] mt-0.5">
          Every lead you approved, and exactly where we&apos;ve got to with them. We run it — nothing here needs you.
        </p>
      </div>

      {error && <div className="text-[13px] text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3 mb-4">{error}</div>}
      {!p && !error && <p className="text-[13px] text-[#9b8ec4] py-10 text-center">Loading…</p>}

      {p && total === 0 && (
        <div className="bg-white border border-[#eee7f7] rounded-2xl px-5 py-10 text-center">
          <p className="text-[14px] font-bold text-[#1f1235]">Nothing in the pipeline yet.</p>
          <p className="text-[12.5px] text-[#9b8ec4] mt-1">Approve a lead on <a href="/milla" className="font-bold text-[#7C3AED] hover:underline">New leads</a> and it will appear here as we work it.</p>
        </div>
      )}

      {p && total > 0 && (
        <div className="flex gap-3.5 overflow-x-auto pb-2">
          {STAGES.map(st => {
            const cards = p.stages[st.key]
            return (
              <div key={st.key} className="w-[260px] shrink-0">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-extrabold uppercase tracking-[0.05em] text-[#9b8ec4]">{st.label}</span>
                  <span className="text-[12px] font-extrabold tabular-nums rounded-full px-2" style={{ color: st.tone, background: st.bg }}>{cards.length}</span>
                </div>
                <p className="text-[10.5px] text-[#b3a9cc] mb-2">{st.sub}</p>

                {cards.length === 0 ? (
                  <div className="text-[11.5px] text-[#c3bad9] border border-dashed border-[#ece5fb] rounded-xl py-5 text-center">Nothing here yet</div>
                ) : cards.map(c => (
                  <div key={c.id} className="bg-white border border-[#eee7f7] rounded-xl p-3 mb-2.5">
                    <div className="flex items-start gap-2">
                      <div className="min-w-0">
                        <b className="text-[13px] block leading-tight truncate">{c.name}</b>
                        <span className="text-[11.5px] text-[#9b8ec4] block truncate">{[c.job_title, c.company].filter(Boolean).join(' · ') || '—'}</span>
                      </div>
                      {c.score != null && <span className="ml-auto shrink-0 text-[13px] font-extrabold tabular-nums text-[#1f1235]">{c.score}</span>}
                    </div>
                    {c.classification && (
                      <span className="inline-block mt-2 text-[10.5px] font-bold rounded-full px-2 py-0.5" style={{ color: st.tone, background: st.bg }}>{c.classification}</span>
                    )}
                    {c.start_time && (
                      <span className="block mt-2 text-[11px] font-bold text-emerald-700">
                        {new Date(c.start_time).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
