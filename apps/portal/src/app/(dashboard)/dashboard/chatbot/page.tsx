'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { api } from '@/lib/api'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface VidaConfig {
  id: string
  client_id: string
  bot_name: string
  greeting: string
  system_prompt: string | null
  primary_color: string
  collect_email: boolean
  collect_phone: boolean
  notify_email: string | null
  active: boolean
}

interface VidaSession {
  id: string
  visitor_name: string | null
  visitor_email: string | null
  visitor_phone: string | null
  channel: string
  lead_score: number | null
  outcome: string | null
  created_at: string
  ended_at: string | null
}

interface VidaMessage {
  id: string
  role: string
  content: string
  created_at: string
}

interface VidaStats {
  totalSessions: number
  hotLeads: number
  interested: number
  avgScore: number
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const COLOR_PRESETS = ['#0066FF', '#7c3aed', '#059669', '#dc2626', '#f59e0b', '#111827']

const OUTCOME_STYLES: Record<string, string> = {
  hot_lead:   'bg-red-100 text-red-700',
  interested: 'bg-amber-100 text-amber-700',
  browsing:   'bg-gray-100 text-gray-600',
  spam:       'bg-gray-100 text-gray-400',
}

const OUTCOME_LABELS: Record<string, string> = {
  hot_lead:   'Hot lead',
  interested: 'Interested',
  browsing:   'Browsing',
  spam:       'Spam',
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export default function ChatbotPage() {
  const supabase = createClient()
  const [tab, setTab] = useState<'configure' | 'conversations' | 'embed'>('configure')
  const [toastMsg, setToastMsg] = useState('')
  const [hasAccess, setHasAccess] = useState<boolean | null>(null)

  const toast = (msg: string) => {
    setToastMsg(msg)
    setTimeout(() => setToastMsg(''), 3500)
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { setHasAccess(false); return }
      api.get<{ data: { product: string; status: string }[] }>('/subscriptions', session.access_token)
        .then(res => setHasAccess((res.data ?? []).some(s => s.product === 'chatbot' && (s.status === 'active' || s.status === 'trialing'))))
        .catch(() => setHasAccess(false))
    })
  }, [supabase])

  if (hasAccess === null) return <div className="flex items-center justify-center min-h-[60vh]"><p className="text-sm text-gray-400">Loading…</p></div>

  if (!hasAccess) return (
    <div className="flex items-center justify-center min-h-[60vh] px-4">
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 max-w-lg w-full p-8 text-center">
        <div className="text-4xl mb-4">💬</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-3">Unlock the Chatbot Agent</h1>
        <p className="text-gray-500 text-sm leading-relaxed mb-6">Deploy an AI chatbot on your website or WhatsApp — trained on your business, live in minutes.</p>
        <ul className="text-left space-y-2.5 mb-8">
          {['Answers product questions instantly', 'Captures and qualifies leads 24/7', 'Hands off to your team when needed', 'One-line embed — any website'].map(f => (
            <li key={f} className="flex items-start gap-2.5 text-sm text-gray-700">
              <span className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-xs font-bold">✓</span>{f}
            </li>
          ))}
        </ul>
        <a href="/dashboard/billing" className="inline-block w-full bg-[#0066FF] hover:bg-blue-700 text-white font-semibold rounded-xl px-6 py-3 text-sm transition-colors">Upgrade to unlock →</a>
        <p className="text-xs text-gray-400 mt-3">This add-on is currently in early access — email hello@get-kind.com to be added.</p>
      </div>
    </div>
  )

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          Vida <span className="text-sm font-normal text-gray-400 ml-1">— AI Chatbot Agent</span>
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Qualify inbound leads and answer questions on your website and WhatsApp.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {(['configure', 'conversations', 'embed'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
              tab === t
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t === 'embed' ? 'Embed' : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'configure'     && <ConfigureTab toast={toast} />}
      {tab === 'conversations' && <ConversationsTab toast={toast} />}
      {tab === 'embed'         && <EmbedTab />}

      {/* Toast */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 bg-gray-900 text-white text-sm px-4 py-2.5 rounded-lg shadow-lg z-50">
          {toastMsg}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Configure Tab
// ─────────────────────────────────────────────────────────────────────────────

function ConfigureTab({ toast }: { toast: (msg: string) => void }) {
  const supabase = createClient()
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [config, setConfig]     = useState<Partial<VidaConfig>>({
    bot_name:      'Vida',
    greeting:      'Hi! How can I help you today?',
    system_prompt: null,
    primary_color: '#0066FF',
    collect_email: true,
    collect_phone: false,
    notify_email:  null,
  })

  const load = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await api.get<{ data: VidaConfig }>('/vida/config', session?.access_token)
      setConfig(res.data)
    } catch {
      // silently ignore — defaults are fine
    }
    setLoading(false)
  }, [supabase])

  useEffect(() => { load() }, [load])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'
      const res = await fetch(`${apiUrl}/vida/config`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({
          bot_name:      config.bot_name,
          greeting:      config.greeting,
          system_prompt: config.system_prompt || null,
          primary_color: config.primary_color,
          collect_email: config.collect_email,
          collect_phone: config.collect_phone,
          notify_email:  config.notify_email || null,
        }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error((d as any).error || 'Failed to save config')
      }
      toast('Config saved')
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to save config')
    }
    setSaving(false)
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 p-10 text-center">
        <p className="text-sm text-gray-400">Loading config…</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSave} className="space-y-5">
      <div className="bg-white rounded-xl border border-gray-100 p-6 space-y-5">

        {/* Bot name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Bot name</label>
          <input
            type="text"
            value={config.bot_name ?? ''}
            onChange={e => setConfig(c => ({ ...c, bot_name: e.target.value }))}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
            placeholder="Vida"
          />
        </div>

        {/* Greeting */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Greeting message</label>
          <input
            type="text"
            value={config.greeting ?? ''}
            onChange={e => setConfig(c => ({ ...c, greeting: e.target.value }))}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
            placeholder="Hi! How can I help you today?"
          />
        </div>

        {/* System prompt */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">System prompt</label>
          <textarea
            value={config.system_prompt ?? ''}
            onChange={e => setConfig(c => ({ ...c, system_prompt: e.target.value }))}
            rows={4}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 resize-none"
            placeholder="e.g. You help companies understand how K.I.N.D's AI tools can grow their pipeline..."
          />
          <p className="text-xs text-gray-400 mt-1">Custom instructions for Vida's persona and knowledge.</p>
        </div>

        {/* Primary color */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Primary color</label>
          <div className="flex items-center gap-3 flex-wrap">
            {COLOR_PRESETS.map(color => (
              <button
                key={color}
                type="button"
                onClick={() => setConfig(c => ({ ...c, primary_color: color }))}
                className={`w-8 h-8 rounded-full border-2 transition-all ${
                  config.primary_color === color ? 'border-gray-900 scale-110' : 'border-transparent'
                }`}
                style={{ backgroundColor: color }}
                title={color}
              />
            ))}
            <input
              type="text"
              value={config.primary_color ?? '#0066FF'}
              onChange={e => setConfig(c => ({ ...c, primary_color: e.target.value }))}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm w-28 font-mono focus:outline-none focus:ring-2 focus:ring-blue-200"
              placeholder="#0066FF"
            />
          </div>
        </div>

        {/* Toggles */}
        <div className="space-y-3">
          <Toggle
            label="Collect email"
            description="Ask visitors for their email address"
            checked={config.collect_email ?? true}
            onChange={v => setConfig(c => ({ ...c, collect_email: v }))}
          />
          <Toggle
            label="Collect phone"
            description="Ask visitors for their phone number"
            checked={config.collect_phone ?? false}
            onChange={v => setConfig(c => ({ ...c, collect_phone: v }))}
          />
        </div>

        {/* Notify email */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Hot lead alert email</label>
          <input
            type="email"
            value={config.notify_email ?? ''}
            onChange={e => setConfig(c => ({ ...c, notify_email: e.target.value }))}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
            placeholder="you@company.com"
          />
          <p className="text-xs text-gray-400 mt-1">We'll email you when Vida identifies a hot lead.</p>
        </div>
      </div>

      <button
        type="submit"
        disabled={saving}
        className="px-5 py-2.5 bg-[#0066FF] hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
      >
        {saving ? 'Saving…' : 'Save configuration'}
      </button>
    </form>
  )
}

function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string
  description: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-sm font-medium text-gray-700">{label}</p>
        <p className="text-xs text-gray-400">{description}</p>
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          checked ? 'bg-blue-600' : 'bg-gray-200'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Conversations Tab
// ─────────────────────────────────────────────────────────────────────────────

function ConversationsTab({ toast }: { toast: (msg: string) => void }) {
  const supabase = createClient()
  const [loading, setLoading]         = useState(true)
  const [stats, setStats]             = useState<VidaStats | null>(null)
  const [sessions, setSessions]       = useState<VidaSession[]>([])
  const [selectedSession, setSelected] = useState<VidaSession | null>(null)
  const [messages, setMessages]       = useState<VidaMessage[]>([])
  const [loadingMsgs, setLoadingMsgs] = useState(false)

  const load = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      const [statsRes, sessionsRes] = await Promise.all([
        api.get<{ data: VidaStats }>('/vida/stats', token),
        api.get<{ data: VidaSession[] }>('/vida/sessions', token),
      ])
      setStats(statsRes.data)
      setSessions(sessionsRes.data ?? [])
    } catch {
      toast('Failed to load conversations')
    }
    setLoading(false)
  }, [supabase])

  useEffect(() => { load() }, [load])

  async function openSession(session: VidaSession) {
    setSelected(session)
    setLoadingMsgs(true)
    try {
      const { data: { session: authSession } } = await supabase.auth.getSession()
      const res = await api.get<{ data: VidaMessage[] }>(
        `/vida/sessions/${session.id}/messages`,
        authSession?.access_token,
      )
      setMessages(res.data ?? [])
    } catch {
      toast('Failed to load messages')
    }
    setLoadingMsgs(false)
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 p-10 text-center">
        <p className="text-sm text-gray-400">Loading conversations…</p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Stats row */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total sessions',  value: stats.totalSessions },
            { label: 'Hot leads',       value: stats.hotLeads },
            { label: 'Interested',      value: stats.interested },
            { label: 'Avg lead score',  value: stats.avgScore ? `${stats.avgScore}/100` : '—' },
          ].map(({ label, value }) => (
            <div key={label} className="bg-white rounded-xl border border-gray-100 p-4">
              <p className="text-2xl font-bold text-gray-900">{value}</p>
              <p className="text-xs text-gray-400 mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Sessions table */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        {sessions.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-gray-500 font-medium mb-1">No conversations yet</p>
            <p className="text-sm text-gray-400">Once your widget is live, chat sessions will appear here.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left">
                <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Visitor</th>
                <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Email</th>
                <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Outcome</th>
                <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Date</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map(s => (
                <tr
                  key={s.id}
                  onClick={() => openSession(s)}
                  className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <td className="px-5 py-3 font-medium text-gray-900">
                    {s.visitor_name || <span className="text-gray-400 font-normal">Anonymous</span>}
                  </td>
                  <td className="px-5 py-3 text-gray-500">{s.visitor_email || '—'}</td>
                  <td className="px-5 py-3">
                    {s.outcome ? (
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${OUTCOME_STYLES[s.outcome] ?? 'bg-gray-100 text-gray-600'}`}>
                        {OUTCOME_LABELS[s.outcome] ?? s.outcome}
                      </span>
                    ) : (
                      <span className="text-gray-300 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-gray-400 text-xs">
                    {new Date(s.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Transcript slide-in panel */}
      {selectedSession && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-end z-50">
          <div className="bg-white h-full w-full max-w-md flex flex-col shadow-2xl">
            {/* Panel header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div>
                <p className="font-semibold text-gray-900">
                  {selectedSession.visitor_name || 'Anonymous visitor'}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {selectedSession.visitor_email || 'No email'} &middot; {new Date(selectedSession.created_at).toLocaleString()}
                </p>
              </div>
              <button
                onClick={() => { setSelected(null); setMessages([]) }}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors text-lg leading-none"
              >
                &times;
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              {loadingMsgs ? (
                <p className="text-sm text-gray-400 text-center mt-10">Loading transcript…</p>
              ) : messages.length === 0 ? (
                <p className="text-sm text-gray-400 text-center mt-10">No messages in this session.</p>
              ) : (
                messages.map(m => (
                  <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                      m.role === 'user'
                        ? 'bg-blue-600 text-white rounded-br-sm'
                        : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                    }`}>
                      {m.content}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Outcome badge */}
            {selectedSession.outcome && (
              <div className="px-5 py-3 border-t border-gray-100 flex items-center gap-2">
                <span className="text-xs text-gray-500">Outcome:</span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${OUTCOME_STYLES[selectedSession.outcome] ?? 'bg-gray-100 text-gray-600'}`}>
                  {OUTCOME_LABELS[selectedSession.outcome] ?? selectedSession.outcome}
                </span>
                {selectedSession.lead_score !== null && (
                  <span className="text-xs text-gray-400 ml-auto">Score: {selectedSession.lead_score}/100</span>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Embed Tab
// ─────────────────────────────────────────────────────────────────────────────

function EmbedTab() {
  const supabase = createClient()
  const [clientId, setClientId] = useState<string | null>(null)
  const [copied, setCopied]     = useState(false)

  useEffect(() => {
    ;(async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) return
      const res = await api.get<{ data: VidaConfig }>('/vida/config', session.access_token).catch(() => null)
      if (res?.data?.client_id) setClientId(res.data.client_id)
    })()
  }, [supabase])

  const embedCode = `<script>
  window.VidaConfig = { clientId: '${clientId ?? 'YOUR_CLIENT_ID'}' };
</script>
<script src="https://get-kind.com/vida-widget.js" async></script>`

  function handleCopy() {
    navigator.clipboard.writeText(embedCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-xl border border-gray-100 p-6 space-y-4">
        <div>
          <h2 className="font-semibold text-gray-900 mb-1">Embed Vida on your website</h2>
          <p className="text-sm text-gray-500">
            Paste this snippet before the <code className="bg-gray-100 px-1 py-0.5 rounded text-xs font-mono">&lt;/body&gt;</code> tag on your website.
            Vida will appear as a chat bubble in the bottom-right corner.
          </p>
        </div>

        <div className="relative">
          <pre className="bg-gray-950 text-gray-100 rounded-xl px-5 py-4 text-xs font-mono overflow-x-auto leading-relaxed whitespace-pre">
            {embedCode}
          </pre>
          <button
            onClick={handleCopy}
            className="absolute top-3 right-3 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-medium rounded-lg transition-colors"
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>

        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
          <p className="text-xs font-semibold text-blue-800 mb-2">How it works</p>
          <ol className="text-xs text-blue-700 space-y-1 list-decimal list-inside">
            <li>Copy the snippet above and paste it before <code className="bg-blue-100 px-1 rounded font-mono">&lt;/body&gt;</code> on every page</li>
            <li>Vida automatically loads your branding and greeting from the Configure tab</li>
            <li>Visitors can chat instantly — no login required</li>
            <li>Hot leads are detected and you'll receive an email alert if configured</li>
            <li>All conversations appear in the Conversations tab</li>
          </ol>
        </div>
      </div>
    </div>
  )
}
