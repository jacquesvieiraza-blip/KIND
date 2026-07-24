'use client'

import { useEffect, useState } from 'react'

// Vida REPORTS & BILLING — per-client revenue essentials the operator reads: prepaid credit
// balance, FIGSY credits, revealed count and worked-leads count (each approved/worked lead is
// a flat $4). Real aggregates from the live tables — no fabricated MRR. (Replaces the old rail
// link that pointed at the founder MRR/churn page.) Design ref: docs/mv-previews/vida2.html.

type Row = {
  client_id: string; company_name: string | null; house_or_demo: boolean
  credit_balance: number; figsy_credits_remaining: number; revealed_count: number; qualified_count: number
}
type Reports = { clients: Row[]; totals: { revealed: number; qualified: number } }

function initials(name: string | null): string {
  if (!name) return '—'
  const p = name.trim().split(/\s+/).filter(Boolean)
  if (!p.length) return '—'
  return (p.length === 1 ? p[0].slice(0, 2) : p[0][0] + p[p.length - 1][0]).toUpperCase()
}

export default function VidaReportsPage() {
  const [data, setData] = useState<Reports | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const res = await fetch('/api/proxy/operator/reports')
        const json = await res.json().catch(() => ({}))
        if (!res.ok || !json?.success) throw new Error(json?.error || `Failed to load reports (${res.status})`)
        if (alive) setData(json.data)
      } catch (e) { if (alive) setError(e instanceof Error ? e.message : 'Failed to load reports') }
    })()
    return () => { alive = false }
  }, [])

  return (
    <div className="h-full overflow-y-auto px-6 py-6">
      <div className="max-w-5xl">
        <h1 className="text-2xl font-bold text-[#1f1235]">Reports &amp; billing</h1>
        <p className="text-sm text-[#7c6f9b] mt-0.5">Per client · prepaid credits, contacts revealed and worked leads (a flat $4 each)</p>

        {error && <div className="mt-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">{error}</div>}
        {!data && !error && <p className="text-sm text-[#9b8ec4] mt-4">Loading…</p>}

        {data && (
          <>
            <div className="flex flex-wrap gap-2.5 mt-4">
              <div className="bg-white border border-[#ece5fb] rounded-xl px-4 py-3">
                <div className="text-2xl font-bold text-[#1f1235] tabular-nums">{data.totals.qualified.toLocaleString()}</div>
                <div className="text-[11px] text-[#9b8ec4] font-semibold uppercase tracking-wide">Worked leads · $4</div>
              </div>
              <div className="bg-white border border-[#ece5fb] rounded-xl px-4 py-3">
                <div className="text-2xl font-bold text-[#1f1235] tabular-nums">{data.totals.revealed.toLocaleString()}</div>
                <div className="text-[11px] text-[#9b8ec4] font-semibold uppercase tracking-wide">Contacts revealed</div>
              </div>
              <div className="bg-white border border-[#ece5fb] rounded-xl px-4 py-3">
                <div className="text-2xl font-bold text-[#1f1235] tabular-nums">{data.clients.length}</div>
                <div className="text-[11px] text-[#9b8ec4] font-semibold uppercase tracking-wide">Clients</div>
              </div>
            </div>

            <div className="mt-5 bg-white border border-[#ece5fb] rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[640px]">
                  <thead>
                    <tr className="bg-[#faf8ff] text-[#b3a9cc] text-[10px] uppercase tracking-wide">
                      <th className="text-left px-4 py-2.5 font-semibold">Client</th>
                      <th className="text-right px-4 py-2.5 font-semibold">Credits</th>
                      <th className="text-right px-4 py-2.5 font-semibold">FIGSY credits</th>
                      <th className="text-right px-4 py-2.5 font-semibold">Revealed</th>
                      <th className="text-right px-4 py-2.5 font-semibold">Worked leads · $4</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.clients.length === 0 && (
                      <tr><td colSpan={5} className="px-4 py-10 text-center text-sm text-[#9b8ec4]">No clients yet.</td></tr>
                    )}
                    {data.clients.map(c => (
                      <tr key={c.client_id} className="border-t border-[#f4eefb]">
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2.5">
                            <span className="w-7 h-7 rounded-lg bg-[#efeafc] text-[#7C3AED] flex items-center justify-center text-[10px] font-bold shrink-0">{initials(c.company_name)}</span>
                            <span className="font-semibold text-[#1f1235]">{c.company_name || 'Unnamed'}</span>
                            {c.house_or_demo && <span className="text-[9px] font-bold uppercase tracking-wide text-[#b3a9cc] bg-[#efeafc] rounded px-1.5 py-0.5">house</span>}
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-[#4c4368]">{c.credit_balance.toLocaleString()}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-[#4c4368]">{c.figsy_credits_remaining.toLocaleString()}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-[#4c4368]">{c.revealed_count.toLocaleString()}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums font-bold text-[#7C3AED]">{c.qualified_count.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
