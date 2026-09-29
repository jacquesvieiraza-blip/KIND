'use client'
// ═══════════════════════════════════════════════════════════════════════════════════════
// ⚑ 29 Sep (R174 · 4e) — REVENUE, FROM WHAT PROGRAMMES WERE BOUGHT FOR AND WHAT WAS PAID.
//
// ⛓️ The Finance page was subscription MRR end to end — every programme client, and every
// dollar the product takes today, was invisible on it. This leads the page now, read from the
// one programme-money source (`/operator/programme-money`). Cash is the contribution rule:
// paid stages, less wallet credit, less make-whole, nothing for a disputed programme. The demo
// and House are listed but never counted. A failed read shows the failure, never a $0.
// ═══════════════════════════════════════════════════════════════════════════════════════
import { useEffect, useState } from 'react'

type Row = {
  programme_id: string; company: string | null; band: string | null; status: string
  meetings_bought: number; price_per_meeting_cents: number; price_total_cents: number
  cash_cents: number; meetings_delivered: number | null; settled: boolean
  shortfall_credit_cents: number; excluded: 'demo' | 'house' | null
}
type Book = {
  rows: Row[]
  totals: { cash_cents: number; cash_by_band_cents: Record<string, number>; meetings_sold: number; meetings_delivered: number; shortfall_credit_cents: number }
}

const money = (cents: number) => `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
const BAND_LABEL: Record<string, string> = { founders: 'Founders', growth: 'Growth', enterprise: 'Enterprise', curve: 'Older curve' }

export default function ProgrammeRevenue() {
  const [book, setBook] = useState<Book | null>(null)
  const [err, setErr] = useState<string | null>(null)
  useEffect(() => {
    fetch('/api/proxy/operator/programme-money').then(r => r.json())
      .then(j => { if (j?.success) setBook(j.data); else setErr(j?.error || 'Programme money could not be read.') })
      .catch(() => setErr('Programme money could not be read.'))
  }, [])

  return (
    <section className="bg-white border border-purple-100 rounded-2xl p-5" data-testid="programme-revenue">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Programme revenue</span>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">cash received · demo and House not counted</span>
      </div>
      {err && <p className="text-sm text-red-700">{err}</p>}
      {!err && !book && <p className="text-sm text-gray-400">Loading…</p>}
      {book && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="rounded-xl border border-gray-100 p-3"><p className="text-xs text-gray-400">Cash received</p><p className="text-2xl font-bold tabular-nums">{money(book.totals.cash_cents)}</p></div>
            <div className="rounded-xl border border-gray-100 p-3"><p className="text-xs text-gray-400">Meetings sold</p><p className="text-2xl font-bold tabular-nums">{book.totals.meetings_sold}</p></div>
            <div className="rounded-xl border border-gray-100 p-3"><p className="text-xs text-gray-400">Meetings delivered</p><p className="text-2xl font-bold tabular-nums">{book.totals.meetings_delivered}</p></div>
            <div className="rounded-xl border border-gray-100 p-3"><p className="text-xs text-gray-400">Shortfall credit granted</p><p className="text-2xl font-bold tabular-nums">{money(book.totals.shortfall_credit_cents)}</p></div>
          </div>
          <div className="flex flex-wrap gap-2 mt-3">
            {Object.entries(book.totals.cash_by_band_cents).map(([k, v]) => (
              <span key={k} className="text-xs rounded-full bg-purple-50 text-purple-800 px-2.5 py-1">{BAND_LABEL[k] ?? k}: {money(v)}</span>
            ))}
          </div>
          <div className="overflow-x-auto mt-4">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-xs text-gray-400">
                <th className="py-1.5 pr-3">Client</th><th className="pr-3">Band</th><th className="pr-3">Stage</th>
                <th className="pr-3 text-right">Bought</th><th className="pr-3 text-right">Delivered</th>
                <th className="pr-3 text-right">Price</th><th className="pr-3 text-right">Cash</th><th className="text-right">Credit</th>
              </tr></thead>
              <tbody>
                {book.rows.map(r => (
                  <tr key={r.programme_id} className={`border-t border-gray-50 ${r.excluded ? 'text-gray-400' : ''}`}>
                    <td className="py-1.5 pr-3">{r.company ?? '—'}{r.excluded ? ` (${r.excluded} — not counted)` : ''}</td>
                    <td className="pr-3">{r.band ? (BAND_LABEL[r.band] ?? r.band) : BAND_LABEL.curve}</td>
                    <td className="pr-3">{r.status.toLowerCase().replace(/_/g, ' ')}</td>
                    <td className="pr-3 text-right tabular-nums">{r.meetings_bought}</td>
                    <td className="pr-3 text-right tabular-nums">{r.meetings_delivered ?? '—'}{r.settled ? ' ✓' : ''}</td>
                    <td className="pr-3 text-right tabular-nums">{money(r.price_total_cents)}</td>
                    <td className="pr-3 text-right tabular-nums">{money(r.cash_cents)}</td>
                    <td className="text-right tabular-nums">{r.shortfall_credit_cents ? money(r.shortfall_credit_cents) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  )
}
