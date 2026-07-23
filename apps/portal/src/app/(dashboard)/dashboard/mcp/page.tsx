'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { api } from '@/lib/api'
import {
  Copy, Check, Plug, Zap, Search, BarChart2,
  ChevronRight, Send, Loader2, Sparkles, ExternalLink,
} from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://kindapi-production-e64c.up.railway.app'
const MCP_ENDPOINT = `${API_URL}/mcp`

interface Message { role: 'user' | 'assistant'; content: string }

// #478 — honesty: only figsy_suggest_campaign actually executes over MCP today (it calls
// the model and returns a real strategy). figsy_find_leads and figsy_get_campaign_stats
// return a "authenticate in the portal" stub server-side — they don't run the search/stats
// over MCP yet, so they're flagged comingSoon. The "250M+ contacts / instantly" overclaim
// is removed (we source ICP-matched leads via PDL+Hunter in the portal, not a 250M DB).
const MCP_TOOLS = [
  {
    icon: Zap,
    name: 'figsy_suggest_campaign',
    label: 'Suggest a Campaign',
    description: 'FIGSY proposes a campaign strategy: name, subject lines, and rationale — all from a single prompt.',
    example: '"Suggest a campaign targeting Series A SaaS founders in Nigeria"',
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    comingSoon: false,
  },
  {
    icon: Search,
    name: 'figsy_find_leads',
    label: 'Find B2B Leads',
    description: 'Ask Claude to find ICP-matched prospects. Runs your lead search over MCP — today this runs in the portal; MCP execution is coming soon.',
    example: '"Find 10 fintech CTOs in South Africa for FIGSY"',
    color: 'text-[#7C3AED]',
    bg: 'bg-[#F5F0FF]',
    comingSoon: true,
  },
  {
    icon: BarChart2,
    name: 'figsy_get_campaign_stats',
    label: 'Campaign Performance',
    description: 'Pull outreach stats — emails sent, reply rate, meetings booked — into your AI conversation. MCP execution is coming soon.',
    example: '"What are my FIGSY campaign stats this week?"',
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    comingSoon: true,
  },
  // milla_ask tool hidden 10 Jul (FIGSY-only cut) — returns when Milla does.
]

const SETUP_GUIDES = [
  {
    name: 'Claude.ai',
    logo: '🤖',
    steps: [
      'Open claude.ai → Settings → Integrations',
      'Click "Add MCP Server"',
      `Set Server URL to: ${API_URL}/mcp`,
      'Add your KIND Client ID as the api_key value',
      'Save — KIND tools appear in Claude\'s tool picker',
    ],
  },
  {
    name: 'Cursor',
    logo: '⚡',
    steps: [
      'Open Cursor → Settings → MCP Servers → Add',
      `Set URL: ${API_URL}/mcp`,
      'Add header key: client_api_key, value: [your KIND Client ID]',
      'Restart Cursor',
      'Open Cursor Agent — KIND tools are now available',
    ],
  },
  {
    name: 'Custom App',
    logo: '🔧',
    steps: [
      `GET ${API_URL}/mcp/tools — discover all tools`,
      `POST ${API_URL}/mcp/call with body: { tool: "tool_name", input: { ...params } }`,
      'Pass client_api_key inside the input object for authenticated tools',
      'Responses follow the MCP content format: { content: [{ type: "text", text: "..." }] }',
    ],
  },
]

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)
  function copy() {
    navigator.clipboard.writeText(value).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button onClick={copy}
      className="ml-2 p-1.5 rounded-lg hover:bg-white/20 transition-colors shrink-0"
      title="Copy">
      {copied
        ? <Check className="w-3.5 h-3.5 text-emerald-400" />
        : <Copy className="w-3.5 h-3.5 text-white/70" />}
    </button>
  )
}

export default function McpPage() {
  const supabase = createClient()
  const [clientId, setClientId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [token, setToken] = useState<string | null>(null)
  const [activeGuide, setActiveGuide] = useState(0)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      setToken(session.access_token)
      try {
        const res = await api.get<{ data: { id: string } }>('/clients/me', session.access_token)
        setClientId(res.data.id)
      } catch { /* show null state */ }
      setLoading(false)
    }
    load()
  }, [supabase])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, chatLoading])

  async function sendMessage(text: string) {
    if (!text.trim() || !token || chatLoading) return
    const userMsg: Message = { role: 'user', content: text.trim() }
    const next = [...messages, userMsg].slice(-20)
    setMessages(next)
    setInput('')
    setChatLoading(true)
    try {
      const res = await fetch(`${API_URL}/mcp/guide`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ messages: next }),
      })
      const json = await res.json()
      const reply: string = json?.data?.reply ?? 'Something went wrong — please try again.'
      setMessages(prev => [...prev, { role: 'assistant' as const, content: reply }].slice(-20))
    } catch {
      setMessages(prev => [...prev, { role: 'assistant' as const, content: 'Connection issue — please try again.' }])
    } finally {
      setChatLoading(false)
    }
  }

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input) }
  }

  const STARTERS = [
    'How do I connect to Claude.ai?',
    'How do I use this in Cursor?',
    'What can I do with figsy_find_leads?',
    'Show me the API format for a custom app',
  ]

  return (
    <div className="space-y-6 pb-10">

      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <div className="rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(135deg, #0F0929 0%, #1E0D5C 50%, #2D1480 100%)' }}>
        <div className="px-8 py-8">
          <div className="flex items-start gap-5">
            <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center shrink-0">
              <Plug className="w-7 h-7 text-white" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-semibold text-white/50 uppercase tracking-widest">MCP Server</span>
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Live
                </span>
              </div>
              <h1 className="text-2xl font-bold text-white leading-tight">KIND MCP Server</h1>
              <p className="text-white/60 text-sm mt-1.5 max-w-xl">
                Connect your KIND account to Claude.ai, Cursor, or any MCP-enabled AI tool. Ask FIGSY to suggest a campaign from wherever you work — lead search and live stats over MCP are coming soon.
              </p>
            </div>
          </div>

          {/* Endpoint + API Key */}
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3">
              <p className="text-[10px] font-semibold text-white/40 uppercase tracking-wider mb-1">MCP Endpoint</p>
              <div className="flex items-center">
                <code className="text-sm text-white font-mono flex-1 truncate">{MCP_ENDPOINT}</code>
                <CopyButton value={MCP_ENDPOINT} />
              </div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3">
              <p className="text-[10px] font-semibold text-white/40 uppercase tracking-wider mb-1">Your Client ID (API Key)</p>
              <div className="flex items-center">
                {loading
                  ? <span className="text-sm text-white/30 font-mono">Loading…</span>
                  : clientId
                    ? <>
                        <code className="text-sm text-white font-mono flex-1 truncate">{clientId}</code>
                        <CopyButton value={clientId} />
                      </>
                    : <span className="text-sm text-white/30 font-mono">Unavailable</span>
                }
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Available Tools ───────────────────────────────────────────────────── */}
      <div>
        <h2 className="text-base font-semibold text-gray-900 mb-3">Available Tools</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {MCP_TOOLS.map(tool => {
            const Icon = tool.icon
            return (
              <div key={tool.name} className="bg-white rounded-2xl border border-purple-100 shadow-sm p-4">
                <div className="flex items-start gap-3">
                  <div className={`w-9 h-9 rounded-xl ${tool.bg} flex items-center justify-center shrink-0`}>
                    <Icon className={`w-4.5 h-4.5 ${tool.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-gray-900">{tool.label}</p>
                      <code className="text-[10px] font-mono text-[#7C3AED] bg-[#F5F0FF] px-1.5 py-0.5 rounded">{tool.name}</code>
                      {tool.comingSoon && (
                        <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">Coming soon</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1 leading-relaxed">{tool.description}</p>
                    <p className="text-[11px] text-[#7C3AED]/70 mt-2 italic">{tool.example}</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Setup Guides ──────────────────────────────────────────────────────── */}
      <div>
        <h2 className="text-base font-semibold text-gray-900 mb-3">Setup Guide</h2>
        <div className="bg-white rounded-2xl border border-purple-100 shadow-sm overflow-hidden">
          {/* Tab bar */}
          <div className="flex border-b border-purple-100">
            {SETUP_GUIDES.map((guide, i) => (
              <button
                key={guide.name}
                onClick={() => setActiveGuide(i)}
                className={`flex items-center gap-2 px-5 py-3 text-sm font-medium transition-colors ${
                  activeGuide === i
                    ? 'text-[#7C3AED] border-b-2 border-[#7C3AED] bg-[#F5F0FF]/40'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <span>{guide.logo}</span>
                {guide.name}
              </button>
            ))}
          </div>

          {/* Steps */}
          <div className="p-6">
            <ol className="space-y-3">
              {SETUP_GUIDES[activeGuide].steps.map((step, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-[#7C3AED] text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  <code className="text-sm text-gray-700 font-mono leading-relaxed bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100 flex-1">
                    {step}
                  </code>
                </li>
              ))}
            </ol>

            {activeGuide === 2 && (
              <div className="mt-4 p-4 bg-[#F5F0FF] rounded-xl border border-purple-100">
                <p className="text-xs font-semibold text-[#7C3AED] mb-2">Example call</p>
                <pre className="text-xs text-gray-700 font-mono whitespace-pre-wrap leading-relaxed">{`POST ${API_URL}/mcp/call
Content-Type: application/json

{
  "tool": "figsy_find_leads",
  "input": {
    "industry": "SaaS",
    "title": "CTO",
    "country": "South Africa",
    "limit": 10
  }
}`}</pre>
              </div>
            )}

            <div className="mt-5 flex items-center gap-3 pt-4 border-t border-purple-100">
              <a
                href={`${API_URL}/mcp/tools`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-[#7C3AED] hover:text-[#6D28D9] font-medium"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                View live tool list (JSON)
              </a>
              <ChevronRight className="w-3 h-3 text-gray-300" />
              <span className="text-xs text-gray-400">Updates automatically as new tools are added</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── MCP Setup Guide Agent ──────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-[#7C3AED]" />
          <h2 className="text-base font-semibold text-gray-900">MCP Setup Guide</h2>
          <span className="text-xs text-gray-400">— ask anything about connecting KIND</span>
        </div>

        <div className="bg-white rounded-2xl border border-purple-100 shadow-sm overflow-hidden">
          {/* Agent identity bar */}
          <div className="px-5 py-3 flex items-center gap-3 border-b border-purple-100" style={{ background: 'linear-gradient(90deg, #0F0929 0%, #1E0D5C 100%)' }}>
            <div className="w-8 h-8 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center shrink-0">
              <Plug className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white leading-tight">KIND MCP Guide</p>
              <p className="text-[10px] text-white/50">Powered by K.I.N.D · Ask anything about MCP setup</p>
            </div>
            <span className="ml-auto flex items-center gap-1.5 text-[10px] text-emerald-400 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Online
            </span>
          </div>

          {/* Messages */}
          <div className="px-5 py-4 space-y-4 min-h-[180px] max-h-[340px] overflow-y-auto">
            {messages.length === 0 && (
              <div className="py-2">
                <p className="text-sm text-gray-700 font-medium mb-3">
                  Hi! I can walk you through connecting KIND to Claude.ai, Cursor, or any MCP-enabled tool. What do you need?
                </p>
                <div className="flex flex-wrap gap-2">
                  {STARTERS.map(s => (
                    <button
                      key={s}
                      onClick={() => sendMessage(s)}
                      className="text-xs px-3 py-1.5 rounded-lg bg-[#F5F0FF] text-[#7C3AED] border border-purple-100 hover:bg-[#EDE9FF] transition-colors font-medium"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                  msg.role === 'user'
                    ? 'bg-[#7C3AED] text-white rounded-tr-sm'
                    : 'bg-[#FAFAFE] border border-purple-100 text-gray-800 rounded-tl-sm'
                }`}>
                  {msg.content}
                </div>
              </div>
            ))}

            {chatLoading && (
              <div className="flex justify-start">
                <div className="bg-[#FAFAFE] border border-purple-100 rounded-2xl rounded-tl-sm px-4 py-2.5">
                  <Loader2 className="w-4 h-4 text-[#7C3AED] animate-spin" />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="px-4 pb-4">
            <div className="flex items-end gap-2 border border-purple-100 rounded-xl bg-[#FAFAFE] px-3 py-2 focus-within:ring-2 focus-within:ring-[#7C3AED]/20 focus-within:border-[#7C3AED]/40 transition-all">
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Ask how to connect KIND to Claude.ai, Cursor, or a custom app…"
                rows={1}
                className="flex-1 bg-transparent text-sm text-gray-800 placeholder-gray-400 resize-none outline-none leading-relaxed"
                style={{ minHeight: '28px', maxHeight: '120px' }}
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || chatLoading || !token}
                className="w-8 h-8 rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-colors shrink-0"
              >
                <Send className="w-3.5 h-3.5 text-white" />
              </button>
            </div>
            <p className="text-[10px] text-gray-400 mt-1.5 px-1">Press Enter to send · Shift+Enter for new line</p>
          </div>
        </div>
      </div>

    </div>
  )
}
