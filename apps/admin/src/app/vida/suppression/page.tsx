'use client'

import { useEffect, useState } from 'react'

// Vida SUPPRESSION — the REAL do-not-contact / opt-out list (opt_out_blocklist): the
// compliance-critical list the send path checks before every send. Read-only viewer:
// total + by-reason breakdown + the latest entries. (This replaces the old rail link that
// wrongly pointed at the static certifications page.) Design ref: docs/mv-previews/vida2.html.

type Sup = { total: number; showing: number; by_reason: Record<string, number>; entries: { email: string | null; reason: string | null; created_at: string | null }[] }

function fmt(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}
function reasonTone(r: string | null): string {
  const v = (r ?? '').toLowerCase()
  if (v.includes('bounce')) return 'bg-amber-50 text-amber-700'
  if (v.includes('spam') || v.includes('complaint')) return 'bg-red-50 text-red-600'
  if (v.includes('unsub') || v.includes('opt')) return 'bg-purple-50 text-[#7C3AED]'
  return 'bg-[#efeafc] text-[#5c5279]'
}

export default function VidaSuppressionPage() {
  const [data, setData] = useState<Sup | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const res = await fetch('/api/proxy/operator/suppression')
        const json = await res.json().catch(() => ({}))
        if (!res.ok || !json?.success) throw new Error(json?.error || `Failed to load suppression list (${res.status})`)
        if (alive) setData(json.data)
      } catch (e) { if (alive) setError(e instanceof Error ? e.message : 'Failed to load suppression list') }
    })()
    return () => { alive = false }
  }, [])

  const reasons = data ? Object.entries(data.by_reason).sort((a, b) => b[1] - a[1]) : []

  return (
    <div className="h-full overflow-y-auto px-6 py-6">
      <div className="max-w-4xl">
        <h1 className="text-2xl font-bold text-[#1f1235]">Suppression</h1>
        <p className="text-sm text-[#7c6f9b] mt-0.5">The do-not-contact list every send is checked against · opt-outs, unsubscribes, hard bounces and spam complaints</p>

        {error && <div className="mt-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">{error}</div>}
        {!data && !error && <p className="text-sm text-[#9b8ec4] mt-4">Loading…</p>}

        {data && (
          <>
            <div className="flex flex-wrap gap-2.5 mt-4">
              <div className="bg-white border border-[#ece5fb] rounded-xl px-4 py-3">
                <div className="text-2xl font-bold text-[#1f1235] tabular-nums">{data.total.toLocaleString()}</div>
                <div className="text-[11px] text-[#9b8ec4] font-semibold uppercase tracking-wide">Total suppressed</div>
              </div>
              {reasons.map(([r, n]) => (
                <div key={r} className="bg-white border border-[#ece5fb] rounded-xl px-4 py-3">
                  <div className="text-2xl font-bold text-[#1f1235] tabular-nums">{n}</div>
                  <div className="text-[11px] text-[#9b8ec4] font-semibold uppercase tracking-wide">{r.replace(/_/g, ' ')}</div>
                </div>
              ))}
            </div>

            <div className="mt-5 bg-white border border-[#ece5fb] rounded-2xl overflow-hidden">
              <div className="px-4 py-2.5 border-b border-[#f0ebfa] text-[11px] text-[#9b8ec4] font-semibold">
                Showing latest {data.showing} of {data.total.toLocaleString()}
              </div>
              {data.entries.length === 0 ? (
                <div className="px-4 py-10 text-center text-sm text-[#9b8ec4]">No one is on the suppression list.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[520px]">
                    <thead>
                      <tr className="bg-[#faf8ff] text-[#b3a9cc] text-[10px] uppercase tracking-wide">
                        <th className="text-left px-4 py-2.5 font-semibold">Email</th>
                        <th className="text-left px-4 py-2.5 font-semibold">Reason</th>
                        <th className="text-left px-4 py-2.5 font-semibold">Suppressed</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.entries.map((e, i) => (
                        <tr key={`${e.email}-${i}`} className="border-t border-[#f4eefb]">
                          <td className="px-4 py-2.5 text-[#4c4368] font-medium">{e.email || '—'}</td>
                          <td className="px-4 py-2.5"><span className={`text-[10px] font-bold uppercase tracking-wide rounded-full px-2 py-0.5 ${reasonTone(e.reason)}`}>{(e.reason || 'unknown').replace(/_/g, ' ')}</span></td>
                          <td className="px-4 py-2.5 text-[#9b8ec4] whitespace-nowrap">{fmt(e.created_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
