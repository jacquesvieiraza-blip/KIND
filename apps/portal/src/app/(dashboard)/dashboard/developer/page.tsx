'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { api } from '@/lib/api'
import { Code2, Key, Copy, Trash2, Plus, CheckCircle, X, Eye, EyeOff, Webhook } from 'lucide-react'

interface DevKey {
  id: string
  key_prefix: string
  name: string
  created_at: string
  last_used_at: string | null
  total_requests: number
}

interface NewKeyResult extends DevKey {
  key: string
}

interface WebhookEndpoint {
  id: string
  url: string
  event_types: string[]
  active: boolean
  created_at: string
}

interface NewWebhookResult extends WebhookEndpoint {
  secret: string
}

const WEBHOOK_EVENTS = [
  { id: 'lead.delivered', label: 'Lead delivered' },
  { id: 'reply.received', label: 'Reply received' },
  { id: 'meeting.booked', label: 'Meeting booked' },
  { id: 'opt_out',        label: 'Opt-out' },
]

// Stable outbound payload — documented for Zapier / Make / n8n / Slack.
const WEBHOOK_PAYLOAD_EXAMPLE = `{
  "event": "meeting.booked",
  "occurred_at": "2026-06-22T10:00:00.000Z",
  "client_id": "your-client-id",
  "campaign_id": "uuid-or-null",
  "lead_id": "uuid-or-null",
  "enrollment_id": "uuid-or-null",
  "channel": "email",
  "data": { "...full event detail..." }
}

// Headers on every delivery:
//   X-Kind-Event:     meeting.booked
//   X-Kind-Delivery:  <unique id>
//   X-Kind-Signature: HMAC-SHA256(body, your secret)  // verify authenticity`

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://kindapi-production-e64c.up.railway.app'

const QUICK_START_CODE = `// Add to your Claude Desktop config (~/Library/Application Support/Claude/claude_desktop_config.json):
{
  "mcpServers": {
    "kind": {
      "url": "${API_URL}/mcp",
      "headers": { "Authorization": "Bearer YOUR_API_KEY" }
    }
  }
}

// Or use the REST API directly:
const res = await fetch('${API_URL}/mcp/call', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_API_KEY'
  },
  body: JSON.stringify({ tool: 'figsy_find_leads', params: { industry: 'SaaS', title: 'Founder', country: 'South Africa' } })
})`

export default function DeveloperPage() {
  const supabase = createClient()
  const [token, setToken] = useState<string | null>(null)
  const [keys, setKeys] = useState<DevKey[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [newKeyName, setNewKeyName] = useState('')
  const [creating, setCreating] = useState(false)
  const [createdKey, setCreatedKey] = useState<NewKeyResult | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [revokingId, setRevokingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showKey, setShowKey] = useState(false)

  // Outbound webhooks (#182/#185)
  const [hooks, setHooks] = useState<WebhookEndpoint[]>([])
  const [hookUrl, setHookUrl] = useState('')
  const [hookEvents, setHookEvents] = useState<string[]>([])
  const [creatingHook, setCreatingHook] = useState(false)
  const [createdHook, setCreatedHook] = useState<NewWebhookResult | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { setLoading(false); return }
      setToken(session.access_token)
      try {
        const res = await api.get<DevKey[]>('/developer/keys', session.access_token)
        setKeys(Array.isArray(res) ? res : [])
      } catch { setKeys([]) }
      try {
        const wh = await api.get<WebhookEndpoint[]>('/developer/webhooks', session.access_token)
        setHooks(Array.isArray(wh) ? wh : [])
      } catch { setHooks([]) }
      setLoading(false)
    })
  }, [])

  async function handleCreateHook() {
    if (!token || creatingHook) return
    if (!/^https?:\/\//i.test(hookUrl)) { setError('Enter a valid http(s) URL'); return }
    setCreatingHook(true)
    setError(null)
    try {
      const result = await api.post<NewWebhookResult>('/developer/webhooks', { url: hookUrl, event_types: hookEvents }, token)
      setCreatedHook(result)
      setHooks(prev => [result, ...prev])
      setHookUrl('')
      setHookEvents([])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add webhook (the table may not be migrated yet)')
    }
    setCreatingHook(false)
  }

  async function handleDeleteHook(id: string) {
    if (!token || !confirm('Delete this webhook endpoint? Deliveries will stop immediately.')) return
    try {
      await api.delete_(`/developer/webhooks/${id}`, token)
      setHooks(prev => prev.filter(h => h.id !== id))
    } catch {
      setError('Failed to delete webhook')
    }
  }

  function toggleHookEvent(id: string) {
    setHookEvents(prev => prev.includes(id) ? prev.filter(e => e !== id) : [...prev, id])
  }

  async function handleCreate() {
    if (!token || creating) return
    setCreating(true)
    setError(null)
    try {
      const result = await api.post<NewKeyResult>('/developer/keys', { name: newKeyName || 'My API Key' }, token)
      setCreatedKey(result)
      setKeys(prev => [result, ...prev])
      setNewKeyName('')
      setShowCreate(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create key')
    }
    setCreating(false)
  }

  async function handleRevoke(id: string) {
    if (!token || !confirm('Revoke this key? It will stop working immediately.')) return
    setRevokingId(id)
    try {
      await api.delete_(`/developer/keys/${id}`, token)
      setKeys(prev => prev.filter(k => k.id !== id))
    } catch {
      setError('Failed to revoke key')
    }
    setRevokingId(null)
  }

  function copyToClipboard(text: string, id: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
    })
  }

  function formatDate(dt: string | null) {
    if (!dt) return '—'
    return new Date(dt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-8 h-8 rounded-xl bg-[#7C3AED] flex items-center justify-center shadow-sm">
              <Code2 className="w-4 h-4 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-[#1E1152]">Developer API</h1>
          </div>
          <p className="text-sm text-[#7C3AED]/60">
            Use K.I.N.D's MCP server from Claude.ai, Cursor, or your own code
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-sm font-semibold rounded-xl transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Create new key
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 flex items-center gap-2">
          <X className="w-4 h-4 shrink-0" />
          {error}
          <button onClick={() => setError(null)} className="ml-auto"><X className="w-3.5 h-3.5" /></button>
        </div>
      )}

      {/* New key revealed — show ONCE */}
      {createdKey && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Key className="w-4 h-4 text-amber-600" />
            <p className="text-sm font-bold text-amber-800">Your new API key — store it now, you won't see it again</p>
          </div>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-white border border-amber-200 rounded-lg px-3 py-2 text-sm font-mono text-gray-800 truncate">
              {showKey ? createdKey.key : createdKey.key.slice(0, 16) + '••••••••••••••••••••••'}
            </code>
            <button
              onClick={() => setShowKey(v => !v)}
              className="p-2 text-amber-600 hover:text-amber-800 transition-colors"
            >
              {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
            <button
              onClick={() => copyToClipboard(createdKey.key, 'new')}
              className="flex items-center gap-1.5 px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg transition-colors"
            >
              {copiedId === 'new' ? <CheckCircle className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedId === 'new' ? 'Copied!' : 'Copy'}
            </button>
            <button
              onClick={() => setCreatedKey(null)}
              className="p-2 text-amber-400 hover:text-amber-700 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Create key modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-[#1E1152]">Create API Key</h2>
              <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Key name</label>
                <input
                  type="text"
                  value={newKeyName}
                  onChange={e => setNewKeyName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleCreate()}
                  placeholder="e.g. Claude Desktop, Production app"
                  className="w-full border border-purple-100/80 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]"
                  autoFocus
                />
              </div>
              <button
                onClick={handleCreate}
                disabled={creating}
                className="w-full py-2.5 bg-[#7C3AED] hover:bg-[#6D28D9] disabled:opacity-50 text-white font-semibold rounded-xl text-sm transition-colors"
              >
                {creating ? 'Creating…' : 'Create key'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* API Keys table */}
      <div className="bg-white rounded-2xl border border-purple-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-purple-100 flex items-center gap-2">
          <Key className="w-4 h-4 text-[#7C3AED]" />
          <h2 className="font-semibold text-[#1E1152] text-sm">Your API Keys</h2>
          <span className="ml-auto text-xs text-[#7C3AED]/50">{keys.length} key{keys.length !== 1 ? 's' : ''}</span>
        </div>

        {loading ? (
          <div className="px-5 py-10 text-center text-sm text-gray-400">Loading keys…</div>
        ) : keys.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <Key className="w-8 h-8 text-purple-200 mx-auto mb-3" />
            <p className="text-sm text-gray-500">No API keys yet — create one to get started</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-purple-50/50">
                <tr>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-[#7C3AED]/60 uppercase tracking-wider">Name</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-[#7C3AED]/60 uppercase tracking-wider">Key prefix</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-[#7C3AED]/60 uppercase tracking-wider">Created</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-[#7C3AED]/60 uppercase tracking-wider">Last used</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-[#7C3AED]/60 uppercase tracking-wider">Requests</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-purple-50">
                {keys.map(key => (
                  <tr key={key.id} className="hover:bg-purple-50/30 transition-colors">
                    <td className="px-5 py-3.5 font-medium text-gray-900">{key.name}</td>
                    <td className="px-5 py-3.5">
                      <code className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xs font-mono">{key.key_prefix}…</code>
                    </td>
                    <td className="px-5 py-3.5 text-gray-500 text-xs">{formatDate(key.created_at)}</td>
                    <td className="px-5 py-3.5 text-gray-500 text-xs">{formatDate(key.last_used_at)}</td>
                    <td className="px-5 py-3.5 text-gray-700 font-mono text-xs">{key.total_requests.toLocaleString()}</td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        onClick={() => handleRevoke(key.id)}
                        disabled={revokingId === key.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-red-600 hover:bg-red-50 border border-red-100 hover:border-red-200 rounded-lg text-xs font-medium transition-colors disabled:opacity-40 ml-auto"
                      >
                        <Trash2 className="w-3 h-3" />
                        {revokingId === key.id ? 'Revoking…' : 'Revoke'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quick Start */}
      <div className="bg-white rounded-2xl border border-purple-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-purple-100">
          <h2 className="font-semibold text-[#1E1152] text-sm">Quick Start</h2>
          <p className="text-xs text-[#7C3AED]/60 mt-0.5">Connect to K.I.N.D's MCP server from Claude.ai or Cursor</p>
        </div>
        <div className="p-5">
          <div className="relative">
            <pre className="bg-gray-900 text-green-300 rounded-xl p-4 text-xs font-mono overflow-x-auto leading-relaxed">{QUICK_START_CODE}</pre>
            <button
              onClick={() => copyToClipboard(QUICK_START_CODE, 'quickstart')}
              className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs rounded-lg transition-colors"
            >
              {copiedId === 'quickstart' ? <CheckCircle className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedId === 'quickstart' ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>
      </div>

      {/* MCP Server info */}
      <div className="bg-white rounded-2xl border border-purple-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-purple-100">
          <h2 className="font-semibold text-[#1E1152] text-sm">MCP Server</h2>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Server URL</p>
            <div className="flex items-center gap-2">
              <code className="bg-gray-100 px-3 py-2 rounded-lg text-sm font-mono text-gray-800 flex-1">{API_URL}/mcp</code>
              <button
                onClick={() => copyToClipboard(`${API_URL}/mcp`, 'url')}
                className="p-2 text-gray-400 hover:text-[#7C3AED] transition-colors"
              >
                {copiedId === 'url' ? <CheckCircle className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Available Tools</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { name: 'figsy_find_leads', desc: 'Search B2B leads matching your ICP (Apollo, 250M+ contacts)' },
                { name: 'figsy_get_campaign_stats', desc: 'Emails sent, open rate, reply rate, meetings booked' },
                { name: 'figsy_suggest_campaign', desc: 'Suggest a campaign strategy from your ICP & pipeline' },
              ].map(tool => (
                <div key={tool.name} className="bg-purple-50 rounded-xl p-3">
                  <code className="text-[#7C3AED] font-mono font-semibold text-xs">{tool.name}</code>
                  <p className="text-[11px] text-gray-500 mt-0.5">{tool.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Outbound Webhooks (#182 Zapier/Make · #185 outbound events) ─────────── */}
      <div className="bg-white rounded-2xl border border-purple-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-purple-100 flex items-center gap-2">
          <Webhook className="w-4 h-4 text-[#7C3AED]" />
          <h2 className="font-semibold text-[#1E1152] text-sm">Outbound Webhooks</h2>
          <span className="ml-auto text-xs text-[#7C3AED]/50">{hooks.length} endpoint{hooks.length !== 1 ? 's' : ''}</span>
        </div>
        <div className="p-5 space-y-5">
          <p className="text-sm text-gray-600">
            Push key events — lead delivered, reply received, meeting booked, opt-out — to any URL.
            Point it at a <span className="font-medium">Zapier</span> or <span className="font-medium">Make</span> webhook
            trigger to connect 6,000+ apps with no custom build.
          </p>

          {/* New webhook secret — show ONCE */}
          {createdHook && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <p className="text-sm font-bold text-amber-800 mb-2">Signing secret — store it now, you won't see it again</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-white border border-amber-200 rounded-lg px-3 py-2 text-xs font-mono text-gray-800 truncate">{createdHook.secret}</code>
                <button
                  onClick={() => copyToClipboard(createdHook.secret, 'whsec')}
                  className="flex items-center gap-1.5 px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg transition-colors"
                >
                  {copiedId === 'whsec' ? <CheckCircle className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedId === 'whsec' ? 'Copied!' : 'Copy'}
                </button>
                <button onClick={() => setCreatedHook(null)} className="p-2 text-amber-400 hover:text-amber-700"><X className="w-4 h-4" /></button>
              </div>
              <p className="text-[11px] text-amber-700 mt-2">Verify deliveries with HMAC-SHA256 over the raw body, compared to <code>X-Kind-Signature</code>.</p>
            </div>
          )}

          {/* Add endpoint */}
          <div className="rounded-xl border border-purple-100 p-4 space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Endpoint URL</label>
              <input
                type="url"
                value={hookUrl}
                onChange={e => setHookUrl(e.target.value)}
                placeholder="https://hooks.zapier.com/hooks/catch/..."
                className="w-full border border-purple-100/80 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Events <span className="text-gray-400 font-normal">(none selected = all)</span></label>
              <div className="flex flex-wrap gap-2">
                {WEBHOOK_EVENTS.map(ev => (
                  <button
                    key={ev.id}
                    type="button"
                    onClick={() => toggleHookEvent(ev.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      hookEvents.includes(ev.id)
                        ? 'bg-[#7C3AED] text-white border-[#7C3AED]'
                        : 'bg-white text-gray-600 border-purple-100 hover:border-[#7C3AED]/40'
                    }`}
                  >
                    {ev.label}
                  </button>
                ))}
              </div>
            </div>
            <button
              onClick={handleCreateHook}
              disabled={creatingHook || !hookUrl}
              className="flex items-center gap-2 px-4 py-2 bg-[#7C3AED] hover:bg-[#6D28D9] disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors"
            >
              <Plus className="w-4 h-4" />
              {creatingHook ? 'Adding…' : 'Add webhook'}
            </button>
          </div>

          {/* Existing endpoints */}
          {hooks.length > 0 && (
            <div className="divide-y divide-purple-50 border border-purple-100 rounded-xl overflow-hidden">
              {hooks.map(h => (
                <div key={h.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <code className="text-xs font-mono text-gray-800 truncate block">{h.url}</code>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      {(!h.event_types || h.event_types.length === 0) ? 'All events' : h.event_types.join(', ')}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDeleteHook(h.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-red-600 hover:bg-red-50 border border-red-100 rounded-lg text-xs font-medium transition-colors"
                  >
                    <Trash2 className="w-3 h-3" /> Delete
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Payload shape + polling API docs */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Payload shape</p>
            <pre className="bg-gray-900 text-green-300 rounded-xl p-4 text-[11px] font-mono overflow-x-auto leading-relaxed whitespace-pre">{WEBHOOK_PAYLOAD_EXAMPLE}</pre>
            <p className="text-xs text-gray-500 mt-3">
              Prefer polling? Use the read-only event API with your API key:{' '}
              <code className="bg-purple-50 text-[#7C3AED] px-1.5 py-0.5 rounded font-mono text-[11px]">GET {API_URL}/developer/events?since=&lt;ISO&gt;&amp;type=meeting.booked</code>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
