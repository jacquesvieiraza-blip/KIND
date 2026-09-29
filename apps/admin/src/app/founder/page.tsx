'use client'

import { useState, useEffect } from 'react'

interface AgentLog {
  id: string
  agent: string
  action: string
  payload: Record<string, unknown>
  created_at: string
}

interface Digest {
  total_clients:    number
  new_leads_7d:     number
  agent_actions_7d: { support: number; cs: number; ae: number }
  recent_logs:      AgentLog[]
}

function adminFetch<T>(path: string, opts?: RequestInit): Promise<T> {
  return fetch(`/api/proxy${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...opts?.headers },
  }).then(r => r.json())
}

export default function FounderPage() {
  const [digest, setDigest]     = useState<Digest | null>(null)
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    adminFetch<{ data: Digest }>('/founder/digest')
      .then(r => setDigest(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const AGENT_COLORS: Record<string, string> = {
    support: 'bg-blue-400/10 border border-blue-400/20 text-blue-400',
    cs:      'bg-emerald-400/10 border border-emerald-400/20 text-emerald-400',
    ae:      'bg-purple-400/10 border border-purple-400/20 text-purple-400',
  }


  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Founder Agent Stack</h1>
        <p className="text-gray-400 text-sm mt-1">Support, CS, and AE agents running K.I.N.D&apos;s own business.</p>
      </div>

      {loading ? (
        <p className="text-gray-400">Loading…</p>
      ) : digest ? (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            {[
              { label: 'Total clients',     value: digest.total_clients },
              { label: 'New leads (7d)',     value: digest.new_leads_7d },
              { label: 'Support actions',    value: digest.agent_actions_7d.support },
              { label: 'CS actions',         value: digest.agent_actions_7d.cs },
              { label: 'AE actions',         value: digest.agent_actions_7d.ae },
            ].map(({ label, value }) => (
              <div key={label} className="bg-white rounded-2xl border border-purple-100 shadow-sm p-4">
                <p className="text-2xl font-bold text-gray-900">{value}</p>
                <p className="text-xs text-gray-400 mt-0.5">{label}</p>
              </div>
            ))}
          </div>

          {/* Recent logs */}
          <div className="bg-white rounded-2xl border border-purple-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Recent agent actions</h2>
            </div>
            <div className="divide-y divide-purple-50">
              {digest.recent_logs.length === 0 ? (
                <p className="px-5 py-8 text-sm text-gray-400 text-center">No actions yet.</p>
              ) : digest.recent_logs.map(log => (
                <div key={log.id} className="px-5 py-3 flex items-start gap-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold shrink-0 ${AGENT_COLORS[log.agent] ?? 'bg-white border border-gray-200 text-gray-500'}`}>{log.agent}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-700">{log.action}</p>
                    <p className="text-xs text-gray-400 truncate">{JSON.stringify(log.payload).slice(0, 80)}</p>
                  </div>
                  <p className="text-xs text-gray-400 shrink-0">{new Date(log.created_at).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' })}</p>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : null}

      {/* ⛓️ 29 Sep (R174 ② · 1b) — ~~Trigger CS follow-up · Trigger AE demo email~~: two one-click
          forms that emailed a model-written message to a real client, or to any address typed in,
          with no preview. Founder ruling: removed. Follow up a client from Vida → the client →
          Asks (it lands in their Milla thread); invite a prospect from your own mailbox. */}
    </div>
  )
}
