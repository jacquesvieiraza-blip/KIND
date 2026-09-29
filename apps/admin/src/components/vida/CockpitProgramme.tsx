'use client'
// ═══════════════════════════════════════════════════════════════════════════════════════
// ⚑ 29 Sep (R174 · 5f) — THE COCKPIT'S MONEY AND AT-RISK, FROM PROGRAMME TRUTH.
//
// ⛓️ The Cockpit's money headline was subscription MRR, and "at risk" came from a churn engine
// that scores subscriptions and credit balances — so neither said anything about a programme
// client. Money now reads the one programme-money source (R174 · 4e); at-risk reads the
// programme's own signal (`/operator/programme-risk`: running, and no reply in 14 days).
// A failed read shows the failure, never $0 or "nobody at risk".
// ═══════════════════════════════════════════════════════════════════════════════════════
import { useEffect, useState } from 'react'
import Link from 'next/link'

type Totals = { cash_cents: number; meetings_sold: number; meetings_delivered: number }
type Risk = { client_id: string; company: string | null; programme_id: string; last_reply_at: string | null; reason: string }

const money = (c: number) => `$${(c / 100).toLocaleString('en-US', { maximumFractionDigits: 0 })}`

function useRead<T>(path: string): { data: T | null; error: string | null } {
  const [state, setState] = useState<{ data: T | null; error: string | null }>({ data: null, error: null })
  useEffect(() => {
    let alive = true
    fetch(`/api/proxy/operator/${path}`).then(r => r.json())
      .then(j => { if (alive) setState(j?.success ? { data: j.data as T, error: null } : { data: null, error: j?.error || 'Could not be read' }) })
      .catch(() => { if (alive) setState({ data: null, error: 'Could not be read' }) })
    return () => { alive = false }
  }, [path])
  return state
}

export default function CockpitProgramme() {
  const book = useRead<{ totals: Totals }>('programme-money')
  const risk = useRead<Risk[]>('programme-risk')
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4" data-testid="cockpit-programme">
      <div className="bg-white/80 rounded-xl border border-brand-200/60 p-5">
        <p className="text-sm text-[#7B6FA0]">Programme cash received</p>
        {book.error ? <p className="text-sm text-red-600 mt-1">{book.error}</p>
          : !book.data ? <p className="text-sm text-gray-400 mt-1">Loading…</p>
          : <>
              <p className="text-2xl font-bold text-gray-900">{money(book.data.totals.cash_cents)}</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {book.data.totals.meetings_delivered} of {book.data.totals.meetings_sold} meetings delivered · demo and House not counted ·{' '}
                <Link href="/vida/revenue" className="text-[#7C3AED] hover:underline">Revenue →</Link>
              </p>
            </>}
      </div>
      <div className="bg-white/80 rounded-xl border border-brand-200/60 p-5">
        <p className="text-sm text-[#7B6FA0]">Programmes at risk</p>
        {risk.error ? <p className="text-sm text-red-600 mt-1">{risk.error}</p>
          : !risk.data ? <p className="text-sm text-gray-400 mt-1">Loading…</p>
          : risk.data.length === 0 ? <p className="text-sm text-gray-500 mt-1">None — every running programme has had a reply in the last 14 days.</p>
          : risk.data.map(r => (
            <p key={r.programme_id} className="text-sm text-gray-900 mt-1">
              <Link href={`/vida?client=${encodeURIComponent(r.client_id)}`} className="font-medium hover:underline">{r.company ?? 'Client'}</Link>
              <span className="text-xs text-red-600"> · {r.reason}</span>
            </p>
          ))}
      </div>
    </div>
  )
}
