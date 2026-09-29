'use client'
// ⚑ 29 Sep (R174 · 4f) — THE PROGRAMME PAYMENTS LEDGER. ⛓️ Billing listed credits and
// subscriptions only, so a programme payment — the only money the product takes today — never
// appeared on it. Each paid stage, from the one programme-money read. The demo and House are
// shown greyed and marked, because neither is money that arrived.
import { useEffect, useState } from 'react'

type Payment = { stage: 'in_full' | 'first_half' | 'second_half'; cents: number; paid_at: string; ref: string | null }
type Row = { programme_id: string; company: string | null; excluded: 'demo' | 'house' | null; payments: Payment[] }

const STAGE: Record<Payment['stage'], string> = { in_full: 'Paid in full', first_half: 'First half', second_half: 'Second half' }
const money = (c: number) => `$${(c / 100).toLocaleString('en-US', { maximumFractionDigits: 2 })}`

export default function ProgrammePayments() {
  const [rows, setRows] = useState<Row[] | null>(null)
  const [err, setErr] = useState<string | null>(null)
  useEffect(() => {
    fetch('/api/proxy/operator/programme-money').then(r => r.json())
      .then(j => { if (j?.success) setRows(j.data.rows); else setErr(j?.error || 'Programme payments could not be read.') })
      .catch(() => setErr('Programme payments could not be read.'))
  }, [])
  const lines = (rows ?? []).flatMap(r => r.payments.map(p => ({ ...p, company: r.company, excluded: r.excluded, id: `${r.programme_id}-${p.stage}` })))
    .sort((a, b) => b.paid_at.localeCompare(a.paid_at))
  return (
    <section className="bg-white border border-purple-100 rounded-2xl p-5" data-testid="programme-payments">
      <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Programme payments</p>
      {err && <p className="text-sm text-red-700">{err}</p>}
      {!err && !rows && <p className="text-sm text-gray-400">Loading…</p>}
      {rows && lines.length === 0 && <p className="text-sm text-gray-400">No programme has been paid for yet.</p>}
      {lines.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-xs text-gray-400"><th className="py-1.5 pr-3">Date</th><th className="pr-3">Client</th><th className="pr-3">Payment</th><th className="pr-3 text-right">Amount</th><th>Stripe reference</th></tr></thead>
            <tbody>
              {lines.map(l => (
                <tr key={l.id} className={`border-t border-gray-50 ${l.excluded ? 'text-gray-400' : ''}`}>
                  <td className="py-1.5 pr-3 tabular-nums">{new Date(l.paid_at).toLocaleDateString('en-GB')}</td>
                  <td className="pr-3">{l.company ?? '—'}{l.excluded ? ` (${l.excluded})` : ''}</td>
                  <td className="pr-3">{STAGE[l.stage]}</td>
                  <td className="pr-3 text-right tabular-nums">{money(l.cents)}</td>
                  <td className="font-mono text-xs">{l.ref ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
