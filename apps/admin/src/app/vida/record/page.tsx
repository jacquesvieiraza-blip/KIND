'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'

// #517 — UNIFIED OPERATING RECORD. One lead's whole story on a page: the money state, every
// reply, and a merged chronological timeline (sends · replies · bookings · operator actions ·
// money moves) assembled server-side from outcome_events + audit + ledger + bookings + replies.
// Opened with ?lead_id=… (the board / bookings pages link here). Pure read — nothing to spend.

type Money = { held: boolean; captured: boolean; released: boolean; state: string }
type Entry = { at: string | null; kind: string; label: string; detail?: string | null }
type Reply = { classification: string | null; qualified: boolean; at: string | null }
type Record_ = {
  client: { id: string; company_name: string | null }
  lead: { id: string; name: string | null; company: string | null; job_title: string | null; status: string | null; score: number | null; revealed: boolean }
  money: Money
  replies: Reply[]
  timeline: Entry[]
}

function fmt(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return isNaN(d.getTime()) ? '—' : d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

// A dot colour per timeline family so the eye can scan sends vs money vs bookings.
function tone(kind: string): string {
  if (kind.startsWith('money:')) return '#7C3AED'
  if (kind.startsWith('booking:')) return '#059669'
  if (kind.startsWith('operator:')) return '#0369a1'
  if (kind.startsWith('event:risk_escalation')) return '#dc2626'
  if (kind.startsWith('event:reply')) return '#b45309'
  return '#9b8ec4'
}

function RecordInner() {
  const params = useSearchParams()
  const leadId = params.get('lead_id') || ''
  const [rec, setRec] = useState<Record_ | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!leadId) { setError('No lead_id — open a record from a lead card.'); return }
    setLoading(true); setError(null)
    fetch(`/api/proxy/operator/record?lead_id=${encodeURIComponent(leadId)}`)
      .then(r => r.json()).then(j => {
        if (!j?.success) throw new Error(j?.error || 'Failed to load record')
        setRec(j)
      }).catch(e => setError(e instanceof Error ? e.message : 'Failed to load record'))
      .finally(() => setLoading(false))
  }, [leadId])

  return (
    <div className="h-full overflow-y-auto px-6 py-6">
      <div className="max-w-3xl">
        <a href="/vida" className="text-[12px] font-semibold text-[#7C3AED] hover:underline">← Back to board</a>
        {error && <div className="mt-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">{error}</div>}
        {loading && !rec && <p className="text-sm text-[#9b8ec4] mt-4">Loading record…</p>}

        {rec && (
          <>
            <div className="mt-3 flex items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-[#1f1235]">{rec.lead.name || 'Unknown lead'}</h1>
                <p className="text-sm text-[#7c6f9b] mt-0.5">{[rec.lead.job_title, rec.lead.company].filter(Boolean).join(' · ') || '—'} · {rec.client.company_name}</p>
              </div>
              <div className="text-right shrink-0">
                <span className="inline-block text-[11px] font-bold rounded-full px-2.5 py-1 border" style={{
                  color: rec.money.captured ? '#059669' : rec.money.held ? '#7C3AED' : '#9b8ec4',
                  background: rec.money.captured ? '#ecfdf5' : rec.money.held ? '#f3ecff' : '#f7f4fd',
                  borderColor: rec.money.captured ? '#a7f3d0' : rec.money.held ? '#e4d4fb' : '#eee7f7',
                }}>{rec.money.state}</span>
              </div>
            </div>

            {/* fact chips */}
            <div className="flex flex-wrap gap-2 mt-3">
              <span className="text-[11.5px] font-semibold text-[#5c5279] bg-white border border-[#ece5fb] rounded-full px-3 py-1">Status: {rec.lead.status || '—'}</span>
              <span className="text-[11.5px] font-semibold text-[#5c5279] bg-white border border-[#ece5fb] rounded-full px-3 py-1">Score: {rec.lead.score ?? '—'}</span>
              <span className="text-[11.5px] font-semibold text-[#5c5279] bg-white border border-[#ece5fb] rounded-full px-3 py-1">{rec.lead.revealed ? 'Revealed ($1)' : 'Masked'}</span>
              {rec.replies.some(r => r.qualified) && <span className="text-[11.5px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-3 py-1">✓ Qualified</span>}
            </div>

            {/* timeline */}
            <div className="mt-6">
              <div className="text-[13px] font-extrabold uppercase tracking-wide text-[#b3a9cc] mb-3">Operating record · timeline</div>
              {rec.timeline.length === 0 ? (
                <p className="text-sm text-[#9b8ec4]">No events recorded yet.</p>
              ) : (
                <div className="relative pl-5">
                  <div className="absolute left-[5px] top-1 bottom-1 w-px bg-[#ece5fb]" />
                  {rec.timeline.map((e, i) => (
                    <div key={i} className="relative mb-3.5">
                      <span className="absolute -left-5 top-1 w-[11px] h-[11px] rounded-full border-2 border-white" style={{ background: tone(e.kind) }} />
                      <div className="flex items-baseline justify-between gap-3">
                        <b className="text-[13px] text-[#1f1235] capitalize">{e.label}</b>
                        <span className="text-[11px] text-[#9b8ec4] shrink-0 tabular-nums">{fmt(e.at)}</span>
                      </div>
                      {e.detail && <p className="text-[11.5px] text-[#7c6f9b] mt-0.5 break-words">{e.detail}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default function VidaRecordPage() {
  return <Suspense fallback={<div className="px-6 py-6 text-sm text-[#9b8ec4]">Loading…</div>}><RecordInner /></Suspense>
}
