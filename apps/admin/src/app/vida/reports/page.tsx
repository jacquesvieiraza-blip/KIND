'use client'

import { useEffect, useState } from 'react'

// ═══════════════════════════════════════════════════════════════════════════════════════
// ⚑ 29 Sep (R174 · 4g) — VIDA REPORTS: PER CLIENT, THE PROGRAMME — BOUGHT, DELIVERED, PAID, CREDIT.
//
// ⛓️ WAS "prepaid credits, contacts revealed and worked leads (a flat $4 each)" from
// `/operator/reports`: the wallet and per-lead model the product retired (R137), and the demo
// shown as "house" carrying $4 charges it never paid. It now reads the one programme-money
// source (`/operator/programme-money`, R174 · 4e) — the same numbers Revenue and Billing show.
// The demo and House are each named for what they are, and neither is counted as money.
// ═══════════════════════════════════════════════════════════════════════════════════════

type ProgrammeRow = {
  programme_id: string; client_id: string; company: string | null; band: string | null; status: string
  meetings_bought: number; meetings_delivered: number | null; settled: boolean
  price_total_cents: number; cash_cents: number; shortfall_credit_cents: number
  excluded: 'demo' | 'house' | null
}
type ClientReport = {
  client_id: string; company: string | null; excluded: 'demo' | 'house' | null
  programmes: number; stage: string; bought: number; delivered: number; price_cents: number; paid_cents: number; credit_cents: number
}

const money = (c: number) => `$${(c / 100).toLocaleString('en-US', { maximumFractionDigits: 2 })}`

function byClient(rows: ProgrammeRow[]): ClientReport[] {
  const m = new Map<string, ClientReport>()
  for (const r of rows) {  // rows arrive newest first, so the first seen is the current programme
    const c = m.get(r.client_id) ?? {
      client_id: r.client_id, company: r.company, excluded: r.excluded, programmes: 0,
      stage: r.status.toLowerCase().replace(/_/g, ' '), bought: 0, delivered: 0, price_cents: 0, paid_cents: 0, credit_cents: 0,
    }
    c.programmes += 1
    c.bought += r.meetings_bought
    c.delivered += r.meetings_delivered ?? 0
    c.price_cents += r.price_total_cents
    c.paid_cents += r.cash_cents
    c.credit_cents += r.shortfall_credit_cents
    m.set(r.client_id, c)
  }
  return [...m.values()]
}

export default function VidaReportsPage() {
  const [rows, setRows] = useState<ClientReport[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const res = await fetch('/api/proxy/operator/programme-money')
        const json = await res.json().catch(() => ({}))
        if (!res.ok || !json?.success) throw new Error(json?.error || `Failed to load reports (${res.status})`)
        if (alive) setRows(byClient(json.data.rows as ProgrammeRow[]))
      } catch (e) { if (alive) setError(e instanceof Error ? e.message : 'Failed to load reports') }
    })()
    return () => { alive = false }
  }, [])

  const real = (rows ?? []).filter(r => r.excluded === null)
  return (
    <div className="h-full overflow-y-auto px-6 py-6">
      <div className="max-w-5xl">
        <h1 className="text-2xl font-bold text-[#1f1235]">Reports</h1>
        <p className="text-sm text-[#7c6f9b] mt-0.5">Per client · meetings bought against delivered, what was paid, and any shortfall credit</p>

        {error && <div className="mt-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">{error}</div>}
        {!error && !rows && <p className="mt-4 text-sm text-[#9b8ec4]">Loading…</p>}

        {rows && (
          <>
            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                ['Meetings bought', String(real.reduce((n, r) => n + r.bought, 0))],
                ['Meetings delivered', String(real.reduce((n, r) => n + r.delivered, 0))],
                ['Paid', money(real.reduce((n, r) => n + r.paid_cents, 0))],
                ['Shortfall credit', money(real.reduce((n, r) => n + r.credit_cents, 0))],
              ].map(([k, v]) => (
                <div key={k} className="bg-white border border-[#eee7f7] rounded-xl px-4 py-3">
                  <div className="text-[11px] text-[#9b8ec4] font-semibold uppercase tracking-wide">{k}</div>
                  <div className="text-[22px] font-extrabold text-[#1f1235] tabular-nums">{v}</div>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-[#9b8ec4] mt-2">Totals are real clients only. The demo and House are listed below and never counted as money.</p>

            <div className="mt-4 bg-white border border-[#eee7f7] rounded-2xl overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead><tr className="text-[11px] uppercase tracking-wide text-[#9b8ec4] text-left">
                  <th className="px-4 py-2.5 font-semibold">Client</th><th className="px-4 py-2.5 font-semibold">Stage</th>
                  <th className="px-4 py-2.5 font-semibold text-right">Bought</th><th className="px-4 py-2.5 font-semibold text-right">Delivered</th>
                  <th className="px-4 py-2.5 font-semibold text-right">Price</th><th className="px-4 py-2.5 font-semibold text-right">Paid</th>
                  <th className="px-4 py-2.5 font-semibold text-right">Credit</th>
                </tr></thead>
                <tbody>
                  {rows.length === 0 && <tr><td colSpan={7} className="px-4 py-6 text-center text-[#9b8ec4]">No programmes yet.</td></tr>}
                  {rows.map(c => (
                    <tr key={c.client_id} className={`border-t border-[#f3eefb] ${c.excluded ? 'text-[#b3a9cc]' : 'text-[#4c4368]'}`}>
                      <td className="px-4 py-2.5">
                        {c.company ?? '—'}
                        {c.excluded && <span className="ml-2 text-[9px] font-bold uppercase tracking-wide bg-[#efeafc] rounded px-1.5 py-0.5">{c.excluded} — not money</span>}
                        {c.programmes > 1 && <span className="ml-2 text-[11px] text-[#9b8ec4]">{c.programmes} programmes</span>}
                      </td>
                      <td className="px-4 py-2.5">{c.stage}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{c.bought}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{c.delivered}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{money(c.price_cents)}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{money(c.paid_cents)}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{c.credit_cents ? money(c.credit_cents) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
