'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Webhook, Copy, CheckCheck, Send, ChevronDown } from 'lucide-react'

const ENDPOINT = 'https://kindapi-production-e64c.up.railway.app/figsy/webhook/enrol'

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
    <div className="px-6 py-8 max-w-3xl mx-auto space-y-8">

      {/* ── Page header ──────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#7C3AED]/15 flex items-center justify-center shrink-0">
          <Webhook className="w-5 h-5 text-[#7C3AED]" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Webhook Triggers</h1>
          <p className="text-purple-300/60 text-sm mt-0.5">
            Fire a webhook to automatically enrol a lead in a FIGSY campaign — useful for CRM events, form submissions, or Zapier.
          </p>
        </div>
      </div>

      {/* ── Endpoint card ────────────────────────────────────────── */}
      <div className="rounded-2xl border border-white/[0.10] bg-white/[0.04] overflow-hidden">
        <div className="px-5 py-4 border-b border-white/[0.07]">
          <p className="text-xs font-semibold text-purple-300/50 uppercase tracking-widest">Endpoint</p>
          <div className="mt-2 flex items-center gap-3">
            <span className="shrink-0 text-[11px] font-bold bg-[#7C3AED]/20 text-[#A78BFA] px-2 py-0.5 rounded font-mono">POST</span>
            <code className="text-sm text-purple-100 font-mono break-all flex-1">{ENDPOINT}</code>
            <button
              onClick={copyEndpoint}
              className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors bg-[#7C3AED]/20 text-[#A78BFA] hover:bg-[#7C3AED]/35"
            >
              {copied ? <CheckCheck className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied!' : 'Copy endpoint'}
            </button>
          </div>
        </div>

        {/* Request body */}
        <div className="px-5 py-4 border-b border-white/[0.07]">
          <p className="text-xs font-semibold text-purple-300/50 uppercase tracking-widest mb-3">Request Body</p>
          <pre className="bg-black/30 rounded-xl p-4 text-sm text-emerald-300 font-mono overflow-x-auto whitespace-pre leading-relaxed">
            {REQUEST_BODY_EXAMPLE}
          </pre>
        </div>

        {/* Auth */}
        <div className="px-5 py-4">
          <p className="text-xs font-semibold text-purple-300/50 uppercase tracking-widest mb-3">Authentication</p>
          <p className="text-sm text-purple-200/70">
            Include your API key as:{' '}
            <code className="bg-white/[0.07] text-purple-200 px-2 py-0.5 rounded font-mono text-xs">
              Authorization: Bearer YOUR_API_KEY
            </code>
          </p>
        </div>
      </div>

      {/* ── Test webhook ─────────────────────────────────────────── */}
      <div className="rounded-2xl border border-white/[0.10] bg-white/[0.04] overflow-hidden">
        <div className="px-5 py-4 border-b border-white/[0.07]">
          <p className="text-xs font-semibold text-purple-300/50 uppercase tracking-widest">Test Webhook</p>
          <p className="text-sm text-purple-200/50 mt-1">Send a live test enrolment to verify your setup.</p>
        </div>

        <form onSubmit={sendTest} className="px-5 py-5 space-y-4">
          {/* Campaign selector */}
          <div>
            <label className="block text-xs font-medium text-purple-300/60 mb-1.5">Campaign</label>
            {loadingCampaigns ? (
              <div className="h-10 rounded-lg bg-white/[0.06] animate-pulse" />
            ) : campaigns.length === 0 ? (
              <p className="text-xs text-purple-300/40 italic">No campaigns found. Create one first.</p>
            ) : (
              <div className="relative">
                <select
                  value={testCampaignId}
                  onChange={e => setTestCampaignId(e.target.value)}
                  required
                  className="w-full appearance-none bg-white/[0.06] border border-white/[0.10] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/40 focus:border-[#7C3AED]/50 pr-9"
                >
                  {campaigns.map(c => (
                    <option key={c.id} value={c.id} className="bg-[#1E1152] text-white">
                      {c.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-300/40 pointer-events-none" />
              </div>
            )}
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-medium text-purple-300/60 mb-1.5">Email</label>
            <input
              type="email"
              value={testEmail}
              onChange={e => setTestEmail(e.target.value)}
              placeholder="lead@example.com"
              required
              className="w-full bg-white/[0.06] border border-white/[0.10] rounded-lg px-3 py-2.5 text-sm text-white placeholder-purple-300/30 focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/40 focus:border-[#7C3AED]/50"
            />
          </div>

          {/* First name */}
          <div>
            <label className="block text-xs font-medium text-purple-300/60 mb-1.5">First name <span className="text-purple-300/30 font-normal">(optional)</span></label>
            <input
              type="text"
              value={testFirstName}
              onChange={e => setTestFirstName(e.target.value)}
              placeholder="Alex"
              className="w-full bg-white/[0.06] border border-white/[0.10] rounded-lg px-3 py-2.5 text-sm text-white placeholder-purple-300/30 focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/40 focus:border-[#7C3AED]/50"
            />
          </div>

          {/* Result */}
          {result && (
            <div className={`rounded-lg px-4 py-3 text-sm font-medium ${result.ok ? 'bg-emerald-400/10 text-emerald-300 border border-emerald-400/20' : 'bg-red-400/10 text-red-300 border border-red-400/20'}`}>
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
