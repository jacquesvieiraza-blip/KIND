'use client'

// ═══════════════════════════════════════════════════════════════════════════════════════
// ⚑ 29 Sep (R174 · 5d) — CLIENT ADMIN: EVERY CLIENT'S STAGE, MEETINGS AND PAID STATE.
//
// ⛓️ WAS a server page reading old subscriptions and credit balances ("No plan", "Low credits"
// and "At risk" on every programme client) with a "Clone Best Client" button that added nothing
// and said it had. The rows now come from `clientAdminRows` — the same three reads the rest of
// Vida uses (see `lib/client-admin-rows.ts`). Real clients are listed; the demo and House are
// listed apart and never counted.
// ═══════════════════════════════════════════════════════════════════════════════════════
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Users } from 'lucide-react'
import { ClientsTabs } from '@/components/ClientsTabs'
import { clientAdminRows, type ClientAdminRow } from '@/lib/client-admin-rows'

async function read<T>(path: string): Promise<T> {
  const r = await fetch(`/api/proxy/operator/${path}`)
  const j = await r.json().catch(() => ({}))
  if (!r.ok || !j?.success) throw new Error(j?.error || `Could not read ${path} (${r.status})`)
  return j.data as T
}

const PAID_TONE: Record<string, string> = {
  'Paid in full': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'Part paid': 'bg-amber-50 text-amber-700 border-amber-200',
  'Not paid': 'bg-gray-100 text-gray-500 border-gray-200',
}

export default function ClientsPage() {
  const [rows, setRows] = useState<ClientAdminRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    Promise.all([
      read<Parameters<typeof clientAdminRows>[0]>('clients'),
      read<Parameters<typeof clientAdminRows>[1]>('lifecycle-board'),
      read<{ rows: Parameters<typeof clientAdminRows>[2] }>('programme-money'),
    ]).then(([clients, lifecycle, money]) => { if (alive) setRows(clientAdminRows(clients, lifecycle, money.rows)) })
      .catch(e => { if (alive) setError(e instanceof Error ? e.message : 'Could not load clients') })
    return () => { alive = false }
  }, [])

  const real = (rows ?? []).filter(r => r.group === 'real')
  const apart = (rows ?? []).filter(r => r.group !== 'real')
  const table = (list: ClientAdminRow[]) => (
    <table className="w-full text-sm">
      <thead><tr className="border-b border-purple-100">
        {['Company', 'Stage', 'Meetings', 'Paid', ''].map(h => (
          <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">{h}</th>
        ))}
      </tr></thead>
      <tbody className="divide-y divide-purple-50">
        {list.map(c => (
          <tr key={c.id} className="hover:bg-purple-50/30">
            <td className="px-5 py-3">
              <p className="font-medium text-gray-900">{c.company}</p>
              <p className="text-xs text-gray-400">{[c.industry, c.country].filter(Boolean).join(' · ') || '—'}</p>
            </td>
            <td className="px-5 py-3 text-gray-700">{c.stage ?? '—'}</td>
            <td className="px-5 py-3 tabular-nums text-gray-700">
              {c.meetings ? `${c.meetings.delivered ?? '?'} of ${c.meetings.bought}` : '—'}
              {c.programmes > 1 && <span className="text-xs text-gray-400"> · {c.programmes} programmes</span>}
            </td>
            <td className="px-5 py-3">
              <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium border ${PAID_TONE[c.paid] ?? 'bg-white text-gray-400 border-gray-200'}`}>{c.paid}</span>
            </td>
            <td className="px-5 py-3">
              <Link href={`/vida/clients-admin/${c.id}`} className="text-xs text-[#7C3AED] hover:text-purple-800 font-semibold">Open →</Link>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )

  return (
    <div className="px-8 py-6 max-w-6xl mx-auto space-y-6">
      <ClientsTabs />
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Real Clients</h1>
        <p className="text-gray-500 text-sm mt-0.5">
          {rows ? `${real.length} real client${real.length !== 1 ? 's' : ''} · stage, meetings delivered of bought, and what their current programme has paid` : 'Loading…'}
        </p>
      </div>
      {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">{error}</div>}
      {rows && (
        <div className="bg-white/80 rounded-2xl border border-brand-200/60 overflow-hidden">
          {real.length === 0
            ? <div className="text-center py-16 text-gray-400"><Users className="w-10 h-10 mx-auto mb-3 opacity-30" /><p className="text-sm">No clients yet</p></div>
            : table(real)}
        </div>
      )}
      {apart.length > 0 && (
        <details className="bg-white/60 rounded-2xl border border-gray-200/60 overflow-hidden">
          <summary className="px-5 py-3 text-sm font-semibold text-gray-500 cursor-pointer select-none">
            Demo and House ({apart.length}) — listed, never counted
          </summary>
          {table(apart)}
        </details>
      )}
    </div>
  )
}
