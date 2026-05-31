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
  const [csClientId, setCsClientId] = useState('')
  const [csStep, setCsStep]         = useState<'day1'|'day3'|'day7'>('day1')
  const [csSending, setCsSending]   = useState(false)
  const [csResult, setCsResult]     = useState('')
  const [demoName, setDemoName]     = useState('')
  const [demoEmail, setDemoEmail]   = useState('')
  const [demoCompany, setDemoCompany] = useState('')
  const [demoMsg, setDemoMsg]       = useState('')
  const [demoSending, setDemoSending] = useState(false)
  const [demoResult, setDemoResult]   = useState('')

  useEffect(() => {
    adminFetch<{ data: Digest }>('/founder/digest')
      .then(r => setDigest(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  async function sendCsFollowup(e: React.FormEvent) {
    e.preventDefault()
    setCsSending(true)
    try {
      const r = await adminFetch<{ success: boolean; data: { subject: string; sent: boolean } }>('/founder/cs/followup', {
        method: 'POST',
        body: JSON.stringify({ client_id: csClientId, step: csStep }),
      })
      setCsResult(r.success ? `Sent: "${r.data?.subject}"` : 'Failed')
    } catch { setCsResult('Error') }
    setCsSending(false)
  }

  async function sendDemoRequest(e: React.FormEvent) {
    e.preventDefault()
    setDemoSending(true)
    try {
      const r = await adminFetch<{ success: boolean; data: { subject: string; sent: boolean } }>('/founder/ae/demo-request', {
        method: 'POST',
        body: JSON.stringify({ name: demoName, email: demoEmail, company: demoCompany, message: demoMsg }),
      })
      setDemoResult(r.success ? `Sent: "${r.data?.subject}"` : 'Failed')
    } catch { setDemoResult('Error') }
    setDemoSending(false)
  }

  const AGENT_COLORS: Record<string, string> = {
    support: 'bg-blue-400/10 border border-blue-400/20 text-blue-400',
    cs:      'bg-emerald-400/10 border border-emerald-400/20 text-emerald-400',
    ae:      'bg-purple-400/10 border border-purple-400/20 text-purple-400',
  }

  const inputClass = 'w-full bg-white/5 border border-white/10 text-gray-900 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#0066FF] placeholder:text-gray-300'

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
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold shrink-0 ${AGENT_COLORS[log.agent] ?? 'bg-white/5 border border-white/10 text-gray-500'}`}>{log.agent}</span>
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

      {/* Manual triggers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* CS follow-up */}
        <div className="bg-white rounded-2xl border border-purple-100 shadow-sm p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Trigger CS follow-up</h2>
          <form onSubmit={sendCsFollowup} className="space-y-3">
            <input value={csClientId} onChange={e => setCsClientId(e.target.value)} placeholder="Client UUID" required className={inputClass} />
            <select value={csStep} onChange={e => setCsStep(e.target.value as 'day1'|'day3'|'day7')} className={inputClass}>
              <option value="day1">Day 1</option>
              <option value="day3">Day 3</option>
              <option value="day7">Day 7</option>
            </select>
            <button type="submit" disabled={csSending}
              className="w-full px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-gray-900 text-sm font-medium rounded-lg transition-colors">
              {csSending ? 'Sending…' : 'Send follow-up'}
            </button>
            {csResult && <p className="text-xs text-gray-400">{csResult}</p>}
          </form>
        </div>

        {/* AE demo request */}
        <div className="bg-white rounded-2xl border border-purple-100 shadow-sm p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Trigger AE demo email</h2>
          <form onSubmit={sendDemoRequest} className="space-y-3">
            <input value={demoName} onChange={e => setDemoName(e.target.value)} placeholder="Prospect name" required className={inputClass} />
            <input value={demoEmail} onChange={e => setDemoEmail(e.target.value)} placeholder="Prospect email" required type="email" className={inputClass} />
            <input value={demoCompany} onChange={e => setDemoCompany(e.target.value)} placeholder="Company (optional)" className={inputClass} />
            <textarea value={demoMsg} onChange={e => setDemoMsg(e.target.value)} placeholder="Their message (optional)" rows={2} className={inputClass} />
            <button type="submit" disabled={demoSending}
              className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-gray-900 text-sm font-medium rounded-lg transition-colors">
              {demoSending ? 'Sending…' : 'Send demo email'}
            </button>
            {demoResult && <p className="text-xs text-gray-400">{demoResult}</p>}
          </form>
        </div>
      </div>
    </div>
  )
}
