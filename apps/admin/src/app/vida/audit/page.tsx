'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

// #486 — OPERATOR AUDIT VIEWER (read-only).
// Renders operator_audit_log through the /api/proxy/operator/audit gate: every
// approve-on-behalf / pass that an operator took, newest first, attributable to a real
// operator email. Optional client filter. No mutation happens here — this is the
// accountability record clients pay for ("human oversight").

type AuditRow = {
  id?: string
  operator_email: string | null
  client_id: string | null
  action: string | null
  subject_type: string | null
  subject_id: string | null
  detail: unknown
  created_at: string | null
}

type ClientRow = { id: string; company_name: string | null }

function fmt(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

function actionTone(a: string | null): string {
  const v = (a ?? '').toLowerCase()
  if (v.includes('approve')) return 'bg-emerald-50 text-emerald-700'
  if (v.includes('pass')) return 'bg-amber-50 text-amber-700'
  return 'bg-purple-50 text-[#7C3AED]'
}

export default function VidaAuditPage() {
  const [rows, setRows] = useState<AuditRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [clients, setClients] = useState<ClientRow[]>([])
  const [filter, setFilter] = useState<string>('') // client_id filter, '' = all

  // Client list for the filter dropdown (best-effort; audit still works without it).
  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const res = await fetch('/api/proxy/operator/clients')
        const json = await res.json().catch(() => ({}))
        if (alive && json?.success) setClients((json.data ?? []).map((c: ClientRow) => ({ id: c.id, company_name: c.company_name })))
      } catch { /* filter is optional */ }
    })()
    return () => { alive = false }
  }, [])

  useEffect(() => {
    let alive = true
    setRows(null)
    setError(null)
    ;(async () => {
      try {
        const qs = filter ? `?client_id=${encodeURIComponent(filter)}` : ''
        const res = await fetch(`/api/proxy/operator/audit${qs}`)
        const json = await res.json().catch(() => ({}))
        if (!res.ok || !json?.success) throw new Error(json?.error || `Failed to load audit log (${res.status})`)
        if (alive) setRows(json.data ?? [])
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : 'Failed to load audit log')
      }
    })()
    return () => { alive = false }
  }, [filter])

  const clientName = useMemo(() => {
    const m = new Map(clients.map(c => [c.id, c.company_name]))
    return (id: string | null) => (id ? (m.get(id) ?? id.slice(0, 8)) : '—')
  }, [clients])

  return (
    <div className="px-6 py-6 max-w-5xl mx-auto space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/vida" className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#7C3AED] hover:bg-purple-50 rounded-lg px-2 py-1">
          <ArrowLeft className="w-4 h-4" /> Vida console
        </Link>
      </div>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Operator audit log</h1>
          <p className="text-sm text-gray-500 mt-0.5">Every approve-on-behalf and pass, attributed to the operator who took it · newest first</p>
        </div>
        <select
          value={filter}
          onChange={e => setFilter(e.target.value)}
          className="text-sm border border-purple-200 rounded-xl px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/40"
        >
          <option value="">All clients</option>
          {clients.map(c => (
            <option key={c.id} value={c.id}>{c.company_name ?? c.id.slice(0, 8)}</option>
          ))}
        </select>
      </div>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">{error}</div>
      )}

      {!rows && !error && <p className="text-sm text-gray-400">Loading audit log…</p>}

      {rows && rows.length === 0 && (
        <div className="text-sm text-gray-400 bg-white border border-purple-100 rounded-2xl px-4 py-8 text-center">
          No audit entries {filter ? 'for this client ' : ''}yet.
        </div>
      )}

      {rows && rows.length > 0 && (
        <div className="bg-white border border-purple-100 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[720px]">
              <thead>
                <tr className="bg-gray-50 text-gray-400 text-[10px] uppercase tracking-wide">
                  <th className="text-left px-4 py-2.5 font-semibold">Operator</th>
                  <th className="text-left px-4 py-2.5 font-semibold">Action</th>
                  <th className="text-left px-4 py-2.5 font-semibold">Client</th>
                  <th className="text-left px-4 py-2.5 font-semibold">Subject</th>
                  <th className="text-left px-4 py-2.5 font-semibold">Time</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.id ?? i} className="border-t border-purple-50">
                    <td className="px-4 py-2.5 text-gray-700 font-medium">{r.operator_email ?? 'unknown-operator'}</td>
                    <td className="px-4 py-2.5">
                      <span className={`text-[10px] font-bold uppercase tracking-wide rounded-full px-2 py-0.5 ${actionTone(r.action)}`}>
                        {r.action ?? '—'}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-gray-600">{clientName(r.client_id)}</td>
                    <td className="px-4 py-2.5 text-gray-500 tabular-nums">
                      {r.subject_type ?? '—'}{r.subject_id ? ` · ${r.subject_id.slice(0, 8)}` : ''}
                    </td>
                    <td className="px-4 py-2.5 text-gray-500 whitespace-nowrap">{fmt(r.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
