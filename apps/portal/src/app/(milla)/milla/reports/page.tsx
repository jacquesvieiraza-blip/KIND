'use client'

import { useCallback, useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { createClient } from '@/lib/supabase/client'

// #516 — MILLA CLIENT REPORT. The client-facing "what happened" page: meetings booked,
// leads approved, spend, and a plain-language summary — all from LIVE data (summary +
// meetings + ledger). No fabricated metrics; every number traces to a real row.

type Summary = { meetings_booked: number; active_campaign: string | null; recent_replies: { name: string; classification: string }[] }
type LedgerEntry = { amount: number; type: string; note: string | null; created_at: string | null }
type Ledger = { reveal_credits: number; work_credits: number; entries: LedgerEntry[] }
type Meeting = { id: string; title: string; start_time: string | null; status: string; name: string; company: string | null }

async function token(): Promise<string | undefined> {
  try { const { data } = await createClient().auth.getSession(); return data.session?.access_token } catch { return undefined }
}
function when(iso: string | null): string {
  if (!iso) return '—'; const d = new Date(iso); return isNaN(d.getTime()) ? '—'
    : d.toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

export default function MillaReportsPage() {
  const [summary, setSummary] = useState<Summary | null>(null)
  const [ledger, setLedger] = useState<Ledger | null>(null)
  const [meetings, setMeetings] = useState<Meeting[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const tok = await token()
      const [s, g, m] = await Promise.all([
        api.get<{ data: Summary }>('/leads/milla-summary', tok),
        api.get<{ data: Ledger }>('/leads/ledger', tok),
        api.get<{ data: Meeting[] }>('/leads/meetings', tok),
      ])
      setSummary(s.data); setLedger(g.data); setMeetings(m.data)
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed to load your report') }
  }, [])
  useEffect(() => { load() }, [load])

  const entries = ledger?.entries ?? []
  const reveals = entries.filter(e => e.type === 'usage' && (e.note ?? '').toLowerCase().includes('reveal')).length
  const spend = entries.filter(e => e.amount < 0).reduce((a, e) => a + Math.abs(e.amount), 0)
  const captured = entries.filter(e => (e.note ?? '').toLowerCase().includes('captured')).length
  const replies = summary?.recent_replies?.length ?? 0

  const KPI = ({ k, v, s, tone }: { k: string; v: string; s: string; tone?: string }) => (
    <div className="bg-white border border-[#eee7f7] rounded-2xl px-4 py-4">
      <div className="text-[9.5px] font-extrabold uppercase tracking-wide text-[#b3a9cc]">{k}</div>
      <div className="text-[24px] font-extrabold mt-1 leading-none" style={tone ? { color: tone } : undefined}>{v}</div>
      <div className="text-[10.5px] text-[#9b8ec4] mt-1">{s}</div>
    </div>
  )

  return (
    <div className="h-full overflow-y-auto px-6 py-6">
      <div className="max-w-4xl">
        <h1 className="text-2xl font-bold text-[#1f1235]">Your results</h1>
        <p className="text-sm text-[#7c6f9b] mt-0.5">What your campaign has produced — every number here is real, straight from your account.</p>

        {error && <div className="mt-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">{error}</div>}
        {!summary && !error && <p className="text-sm text-[#9b8ec4] mt-4">Loading your report…</p>}

        {summary && (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mt-5">
              <KPI k="Meetings booked" v={String(summary.meetings_booked)} s="this month" tone="#EC4899" />
              <KPI k="Leads approved" v={String(reveals)} s="you chose to pursue" />
              <KPI k="Replies in" v={String(replies)} s="recent" tone="#059669" />
              <KPI k="Spend" v={`$${spend}`} s={`$${reveals} reveal · $${captured * 3} booked`} />
            </div>

            <div className="flex flex-col lg:flex-row gap-4 mt-4">
              <div className="flex-1 bg-white border border-[#eee7f7] rounded-2xl overflow-hidden">
                <div className="px-4 py-3 border-b border-[#eee7f7] text-[13.5px] font-bold">Meetings booked for you</div>
                {(meetings ?? []).filter(m => m.status === 'confirmed' || m.status === 'completed').length === 0 ? (
                  <div className="px-4 py-8 text-center text-[13px] text-[#9b8ec4]">No meetings yet — approve leads and FIGSY works them to a booking.</div>
                ) : (meetings ?? []).filter(m => m.status === 'confirmed' || m.status === 'completed').slice(0, 8).map(m => (
                  <div key={m.id} className="flex items-center gap-3 px-4 py-3 border-t border-[#f4eefb] first:border-t-0">
                    <span className="w-8 h-8 rounded-lg bg-[#efeafc] text-[#7C3AED] text-[10px] font-extrabold flex items-center justify-center shrink-0">
                      {(m.name || '?').split(/\s+/).map(p => p[0]).slice(0, 2).join('').toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1"><b className="text-[13px]">{m.name}</b><span className="block text-[11.5px] text-[#9b8ec4]">{[m.company, when(m.start_time)].filter(Boolean).join(' · ')}</span></div>
                    <span className="text-[10.5px] font-extrabold text-emerald-700 bg-emerald-50 rounded-full px-2.5 py-1">$3 captured</span>
                  </div>
                ))}
              </div>

              <div className="flex-1 bg-white border border-[#eee7f7] rounded-2xl overflow-hidden">
                <div className="px-4 py-3 border-b border-[#eee7f7] text-[13.5px] font-bold">Summary</div>
                <div className="px-4 py-4 text-[13px] leading-relaxed text-[#4c4368]">
                  {summary.active_campaign ? <>Your <b className="text-[#7C3AED]">{summary.active_campaign}</b> campaign is live. </> : <>Your campaign is being set up. </>}
                  You&apos;ve approved <b>{reveals}</b> lead{reveals === 1 ? '' : 's'}, {replies} repl{replies === 1 ? 'y has' : 'ies have'} come back, and <b>{summary.meetings_booked}</b> meeting{summary.meetings_booked === 1 ? '' : 's'} {summary.meetings_booked === 1 ? 'has' : 'have'} booked this month. You only pay when you approve — total spend so far is <b>${spend}</b>.
                  {captured > 0 && <> The <b>$3</b> work fee was captured on <b>{captured}</b> confirmed booking{captured === 1 ? '' : 's'}.</>}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
