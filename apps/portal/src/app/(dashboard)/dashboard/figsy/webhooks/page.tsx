'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Webhook, Copy, CheckCheck, Send, ChevronDown } from 'lucide-react'

const ENDPOINT = `${process.env.NEXT_PUBLIC_API_URL ?? 'https://kindapi-production-e64c.up.railway.app'}/figsy/webhook/enrol`

const REQUEST_BODY_EXAMPLE = `{
  "campaign_id": "your-campaign-id",
  "email": "lead@example.com",
  "first_name": "Alex",
  "last_name": "Smith",
  "company": "Acme Ltd",
  "title": "CEO"
}`

interface Campaign {
  id: string
  name: string
  status?: string
}

export default function WebhooksPage() {
  const supabase = createClient()

  const [copied, setCopied] = useState(false)
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loadingCampaigns, setLoadingCampaigns] = useState(true)

  // Test form state
  const [testEmail, setTestEmail] = useState('')
  const [testFirstName, setTestFirstName] = useState('')
  const [testCampaignId, setTestCampaignId] = useState('')
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null)

  // Fetch campaigns for the selector
  useEffect(() => {
    async function load() {
      setLoadingCampaigns(true)
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) return
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://kindapi-production-e64c.up.railway.app'
        const res = await fetch(`${apiUrl}/figsy/campaigns`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
          signal: AbortSignal.timeout(8000),
        })
        if (res.ok) {
          const json = await res.json()
          const list: Campaign[] = Array.isArray(json?.data) ? json.data : Array.isArray(json) ? json : []
          setCampaigns(list)
          if (list.length > 0) setTestCampaignId(list[0].id)
        }
      } catch {
        // silent — user may have no campaigns yet
      } finally {
        setLoadingCampaigns(false)
      }
    }
    load()
  }, [supabase])

  async function copyEndpoint() {
    try {
      await navigator.clipboard.writeText(ENDPOINT)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // fallback — do nothing
    }
  }

  async function sendTest(e: React.FormEvent) {
    e.preventDefault()
    if (!testEmail || !testCampaignId) return
    setSending(true)
    setResult(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/proxy/figsy/webhook/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({
          campaign_id: testCampaignId,
          email: testEmail,
          first_name: testFirstName || undefined,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (res.ok) {
        setResult({ ok: true, message: json?.message || 'Test webhook sent successfully.' })
      } else {
        setResult({ ok: false, message: json?.error || json?.message || `Error ${res.status}` })
      }
    } catch (err: unknown) {
      setResult({ ok: false, message: err instanceof Error ? err.message : 'Network error' })
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="space-y-6">

      {/* ── Page header ──────────────────────────────────────────── */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">Webhook Triggers</h1>
        <p className="text-sm text-[#7B6FA0] mt-1">Enrol any external lead directly into a FIGSY campaign via a simple HTTP request.</p>
      </div>

      {/* ── Endpoint card ────────────────────────────────────────── */}
      <div className="rounded-2xl bg-white border border-purple-100/60 shadow-sm overflow-hidden">
        <div className="border-b border-purple-100/60 px-5 py-4">
          <p className="text-xs font-semibold text-[#9B8EC4] uppercase tracking-widest">Endpoint</p>
          <div className="mt-2 flex items-center gap-3 bg-[#F5F0FF] border border-purple-200 rounded-xl px-4 py-3">
            <span className="shrink-0 text-[11px] font-bold bg-[#7C3AED] text-white px-2 py-0.5 rounded font-mono">POST</span>
            <code className="text-sm text-gray-800 font-mono break-all flex-1">{ENDPOINT}</code>
            <button
              onClick={copyEndpoint}
              className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#7C3AED] text-white hover:bg-[#6D28D9] transition-colors"
            >
              {copied ? <CheckCheck className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>

        {/* Request body */}
        <div className="px-5 py-4 border-b border-purple-100/60">
          <p className="text-xs font-semibold text-[#9B8EC4] uppercase tracking-widest mb-3">Request Body</p>
          <pre className="bg-gray-50 border border-purple-100/60 rounded-xl p-4 text-sm text-gray-700 font-mono overflow-x-auto whitespace-pre leading-relaxed">
            {REQUEST_BODY_EXAMPLE}
          </pre>
        </div>

        {/* Auth */}
        <div className="px-5 py-4">
          <p className="text-xs font-semibold text-[#9B8EC4] uppercase tracking-widest mb-3">Authentication</p>
          <p className="text-sm text-gray-600">
            Include your API key as:{' '}
            <code className="bg-[#F5F0FF] text-[#7C3AED] px-2 py-0.5 rounded font-mono text-xs">
              Authorization: Bearer YOUR_API_KEY
            </code>
          </p>
        </div>
      </div>

      {/* ── Test webhook ─────────────────────────────────────────── */}
      <div className="rounded-2xl bg-white border border-purple-100/60 shadow-sm overflow-hidden">
        <div className="border-b border-purple-100/60 px-5 py-4">
          <p className="text-xs font-semibold text-[#9B8EC4] uppercase tracking-widest">Test Webhook</p>
          <p className="text-sm text-gray-500 mt-1">Send a live test enrolment to verify your setup.</p>
        </div>

        <form onSubmit={sendTest} className="px-5 py-5 space-y-4">
          {/* Campaign selector */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Campaign</label>
            {loadingCampaigns ? (
              <div className="h-10 rounded-lg bg-gray-100 animate-pulse" />
            ) : campaigns.length === 0 ? (
              <p className="text-xs text-gray-400 italic">No campaigns found. Create one first.</p>
            ) : (
              <div className="relative">
                <select
                  value={testCampaignId}
                  onChange={e => setTestCampaignId(e.target.value)}
                  required
                  className="w-full appearance-none bg-gray-50 border border-purple-100/60 text-gray-800 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/40 focus:border-[#7C3AED]/50 pr-9"
                >
                  {campaigns.map(c => (
                    <option key={c.id} value={c.id} className="bg-white">
                      {c.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            )}
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Email</label>
            <input
              type="email"
              value={testEmail}
              onChange={e => setTestEmail(e.target.value)}
              placeholder="lead@example.com"
              required
              className="w-full bg-gray-50 border border-purple-100/60 text-gray-800 placeholder-gray-400 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/40 focus:border-[#7C3AED]/50"
            />
          </div>

          {/* First name */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">First name <span className="text-gray-400 font-normal">(optional)</span></label>
            <input
              type="text"
              value={testFirstName}
              onChange={e => setTestFirstName(e.target.value)}
              placeholder="Alex"
              className="w-full bg-gray-50 border border-purple-100/60 text-gray-800 placeholder-gray-400 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/40 focus:border-[#7C3AED]/50"
            />
          </div>

          {/* Result */}
          {result && (
            <div className={`rounded-lg px-4 py-3 text-sm font-medium ${result.ok ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
              {result.message}
            </div>
          )}

          <button
            type="submit"
            disabled={sending || campaigns.length === 0}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#7C3AED] text-white text-sm font-semibold hover:bg-[#6D28D9] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
            {sending ? 'Sending…' : 'Send test'}
          </button>
        </form>
      </div>

    </div>
  )
}
