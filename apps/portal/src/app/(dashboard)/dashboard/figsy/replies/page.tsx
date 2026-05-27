'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { api } from '@/lib/api'
import {
  Loader2, MessageSquare, Flame, ThermometerSun, Snowflake, Ban,
  UserX, Plane, HelpCircle, Copy, Check, RefreshCw, Send,
  Linkedin, Mail, Calendar, ChevronRight, Inbox, Sparkles,
  ArrowUpRight, Clock,
} from 'lucide-react'

type ReplyClassification =
  | 'hot' | 'warm' | 'cold'
  | 'opt_out' | 'wrong_person' | 'out_of_office' | 'other'
  | 'interested' | 'not_interested'

interface Reply {
  id: string
  from_email: string
  subject: string | null
  body: string
  classification: ReplyClassification
  classification_reasoning: string | null
  received_at: string
  processed_at: string
  campaign_id: string | null
  lead_id: string
  leads?: {
    first_name: string
    last_name: string
    job_title: string | null
    company: string | null
    linkedin_url?: string | null
  }
}

const classConfig: Record<ReplyClassification, {
  label: string
  bg: string
  text: string
  border: string
  dot: string
  icon: React.ElementType
  priority: number
}> = {
  hot:          { label: 'Meeting Booked', bg: 'bg-red-50',    text: 'text-red-700',    border: 'border-red-200',    dot: 'bg-red-500',    icon: Flame,          priority: 1 },
  interested:   { label: 'Positive',       bg: 'bg-green-50',  text: 'text-green-700',  border: 'border-green-200',  dot: 'bg-green-500',  icon: Flame,          priority: 1 },
  warm:         { label: 'Nurturing',      bg: 'bg-amber-50',  text: 'text-amber-700',  border: 'border-amber-200',  dot: 'bg-amber-400',  icon: ThermometerSun, priority: 2 },
  cold:         { label: 'Bad Timing',     bg: 'bg-blue-50',   text: 'text-blue-600',   border: 'border-blue-200',   dot: 'bg-blue-400',   icon: Snowflake,      priority: 3 },
  not_interested:{ label: 'Irrelevant',    bg: 'bg-gray-50',   text: 'text-gray-500',   border: 'border-gray-200',   dot: 'bg-gray-400',   icon: Snowflake,      priority: 4 },
  opt_out:      { label: 'Opted Out',      bg: 'bg-rose-50',   text: 'text-rose-700',   border: 'border-rose-200',   dot: 'bg-rose-500',   icon: Ban,            priority: 5 },
  wrong_person: { label: 'Wrong Person',   bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', dot: 'bg-purple-400', icon: UserX,          priority: 6 },
  out_of_office:{ label: 'OOO',           bg: 'bg-gray-50',   text: 'text-gray-500',   border: 'border-gray-200',   dot: 'bg-gray-300',   icon: Plane,          priority: 7 },
  other:        { label: 'Need Followup',  bg: 'bg-gray-50',   text: 'text-gray-500',   border: 'border-gray-200',   dot: 'bg-gray-300',   icon: HelpCircle,     priority: 8 },
}

const FOLDER_TABS = [
  { value: 'all',          label: 'All',         icon: Inbox },
  { value: 'hot',          label: 'Meeting Booked', icon: Calendar },
  { value: 'interested',   label: 'Positive',    icon: Flame },
  { value: 'warm',         label: 'Nurturing',   icon: ThermometerSun },
  { value: 'cold',         label: 'Bad Timing',  icon: Snowflake },
  { value: 'not_interested',label: 'Irrelevant', icon: HelpCircle },
  { value: 'opt_out',      label: 'Opted Out',   icon: Ban },
  { value: 'wrong_person', label: 'Wrong Person',icon: UserX },
  { value: 'out_of_office',label: 'OOO',         icon: Plane },
  { value: 'other',        label: 'Need Followup',icon: Clock },
]

function normaliseClass(c: ReplyClassification): string {
  return c // keep as-is since our tabs now match the actual classifications
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })
}

function AISuggestionPanel({
  replyId, token, reply
}: {
  replyId: string
  token: string
  reply: Reply
}) {
  const [loading, setLoading]       = useState(false)
  const [suggestion, setSuggestion] = useState('')
  const [used, setUsed]             = useState(false)
  const [copied, setCopied]         = useState(false)

  async function fetchSuggestion() {
    setLoading(true)
    try {
      const res = await api.post<{ data: { suggestion: string } }>(
        `/figsy/replies/${replyId}/suggest`, {}, token
      )
      setSuggestion(res.data?.suggestion ?? '')
      setUsed(true)
    } catch { /* ignore */ }
    setLoading(false)
  }

  function copyToClipboard() {
    navigator.clipboard.writeText(suggestion).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="border-t border-gray-100 pt-4 mt-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-6 h-6 rounded-md bg-gradient-to-br from-[#0066FF] to-[#003d99] flex items-center justify-center">
          <Sparkles className="w-3.5 h-3.5 text-white" />
        </div>
        <span className="text-sm font-semibold text-gray-900">FIGSY Reply Assist</span>
      </div>
      {!used ? (
        <button
          onClick={fetchSuggestion}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#0066FF] hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium transition-colors"
        >
          {loading ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Drafting reply…</>
          ) : (
            <><Sparkles className="w-4 h-4" /> Help me reply</>
          )}
        </button>
      ) : (
        <div className="space-y-2">
          <textarea
            value={suggestion}
            onChange={e => setSuggestion(e.target.value)}
            rows={5}
            className="w-full text-sm text-gray-800 border border-blue-200 bg-blue-50/30 rounded-xl px-3 py-2.5 resize-y focus:outline-none focus:ring-2 focus:ring-blue-300 leading-relaxed"
          />
          <div className="flex gap-2">
            <button
              onClick={copyToClipboard}
              className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg bg-gray-900 hover:bg-gray-800 text-white transition-colors"
            >
              {copied ? (
                <><Check className="w-3.5 h-3.5 text-green-400" /> Copied!</>
              ) : (
                <><Copy className="w-3.5 h-3.5" /> Copy to clipboard</>
              )}
            </button>
            <button
              onClick={fetchSuggestion}
              disabled={loading}
              className="px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-xs font-medium text-gray-600 disabled:opacity-50 transition-colors flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" /> Regenerate
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function FigsyRepliesPage() {
  const supabase = createClient()
  const [replies, setReplies] = useState<Reply[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter]   = useState<string>('all')
  const [selected, setSelected] = useState<Reply | null>(null)
  const [token, setToken]     = useState('')

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      setToken(session.access_token)
      try {
        const res = await api.get<{ data: Reply[] }>('/figsy/replies/all', session.access_token)
        const sorted = (res.data ?? []).sort((a, b) => {
          const pa = classConfig[a.classification]?.priority ?? 9
          const pb = classConfig[b.classification]?.priority ?? 9
          if (pa !== pb) return pa - pb
          return new Date(b.processed_at).getTime() - new Date(a.processed_at).getTime()
        })
        setReplies(sorted)
        if (sorted.length > 0) setSelected(sorted[0])
      } catch { /* empty */ }
      setLoading(false)
    }
    load()
  }, [])

  const filtered = filter === 'all'
    ? replies
    : replies.filter(r => r.classification === filter)

  const counts = replies.reduce((acc, r) => {
    acc[r.classification] = (acc[r.classification] ?? 0) + 1
    return acc
  }, {} as Record<string, number>)

  const actionable = (counts['hot'] ?? 0) + (counts['interested'] ?? 0) + (counts['warm'] ?? 0)

  const cfg = selected ? classConfig[selected.classification] ?? classConfig.other : null
  const lead = selected?.leads

  return (
    <div className="flex h-[calc(100vh-64px)] -m-6 lg:-m-8">
      {/* ── LEFT PANEL — Folder tabs ─────────────────────────────── */}
      <div className="w-52 shrink-0 bg-white border-r border-gray-100 flex flex-col">
        <div className="px-4 pt-5 pb-3 border-b border-gray-50">
          <h2 className="text-sm font-bold text-gray-900">Inbox</h2>
          {actionable > 0 && (
            <p className="text-xs text-[#0066FF] mt-0.5 font-medium">{actionable} need attention</p>
          )}
        </div>
        <nav className="flex-1 overflow-y-auto py-2 space-y-0.5 px-2">
          {FOLDER_TABS.map(({ value, label, icon: Icon }) => {
            const count = value === 'all' ? replies.length : (counts[value] ?? 0)
            const isActive = filter === value
            const isUrgent = (value === 'hot' || value === 'interested') && count > 0
            return (
              <button
                key={value}
                onClick={() => setFilter(value)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs transition-colors text-left ${
                  isActive
                    ? 'bg-[#0066FF] text-white font-semibold'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span className="flex-1">{label}</span>
                {count > 0 && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : isUrgent
                      ? 'bg-red-100 text-red-600'
                      : 'bg-gray-100 text-gray-500'
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </nav>
      </div>

      {/* ── MIDDLE PANEL — Conversation list ─────────────────────── */}
      <div className="w-80 shrink-0 border-r border-gray-100 bg-gray-50/50 flex flex-col">
        <div className="px-4 pt-4 pb-3 border-b border-gray-100 bg-white">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            {filter === 'all' ? `All Replies` : FOLDER_TABS.find(t => t.value === filter)?.label ?? filter}
            <span className="ml-2 text-gray-300 font-normal">{filtered.length}</span>
          </p>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 px-6 text-gray-400">
              <MessageSquare className="w-8 h-8 mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium">No replies here</p>
            </div>
          ) : (
            filtered.map(reply => {
              const c = classConfig[reply.classification] ?? classConfig.other
              const l = reply.leads
              const isSelected = selected?.id === reply.id
              return (
                <button
                  key={reply.id}
                  onClick={() => setSelected(reply)}
                  className={`w-full text-left px-4 py-3.5 border-b border-gray-100 transition-colors ${
                    isSelected ? 'bg-blue-50 border-l-2 border-l-[#0066FF]' : 'hover:bg-white'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-xs font-bold text-gray-600">
                        {l ? l.first_name[0] : reply.from_email[0].toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="text-xs font-semibold text-gray-900 truncate">
                          {l ? `${l.first_name} ${l.last_name}` : reply.from_email}
                        </span>
                        <span className="text-[10px] text-gray-400 shrink-0">
                          {timeAgo(reply.received_at ?? reply.processed_at)}
                        </span>
                      </div>
                      {l && (l.job_title || l.company) && (
                        <p className="text-[10px] text-gray-400 truncate mb-1">
                          {[l.job_title, l.company].filter(Boolean).join(' · ')}
                        </p>
                      )}
                      <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
                        {reply.body.slice(0, 100)}
                      </p>
                      {/* Tag chip */}
                      <div className="mt-1.5 flex items-center gap-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${c.dot}`} />
                        <span className={`text-[10px] font-semibold ${c.text}`}>{c.label}</span>
                      </div>
                    </div>
                  </div>
                </button>
              )
            })
          )}
        </div>
      </div>

      {/* ── RIGHT PANEL — Conversation detail ────────────────────── */}
      <div className="flex-1 bg-white overflow-y-auto">
        {!selected || !cfg ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <MessageSquare className="w-10 h-10 mb-3 opacity-20" />
            <p className="text-sm font-medium">Select a conversation</p>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto px-6 py-6">
            {/* Contact header */}
            <div className="flex items-start justify-between gap-4 mb-5">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center shrink-0">
                  <span className="text-base font-bold text-gray-600">
                    {lead ? lead.first_name[0] : selected.from_email[0].toUpperCase()}
                  </span>
                </div>
                <div>
                  <h2 className="text-base font-bold text-gray-900">
                    {lead ? `${lead.first_name} ${lead.last_name}` : selected.from_email}
                  </h2>
                  {lead && (lead.job_title || lead.company) && (
                    <p className="text-sm text-gray-500 mt-0.5">
                      {[lead.job_title, lead.company].filter(Boolean).join(' at ')}
                    </p>
                  )}
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="flex items-center gap-1.5 text-xs text-gray-400">
                      <Mail className="w-3.5 h-3.5" />
                      {selected.from_email}
                    </span>
                    {lead?.linkedin_url && (
                      <a
                        href={lead.linkedin_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
                      >
                        <Linkedin className="w-3.5 h-3.5" />
                        LinkedIn
                        <ArrowUpRight className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
              </div>

              {/* Classification badge */}
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${cfg.bg} ${cfg.text} ${cfg.border} shrink-0`}>
                <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                {cfg.label}
              </div>
            </div>

            {/* Email thread */}
            <div className={`rounded-xl border ${cfg.border} overflow-hidden mb-4`}>
              {/* Subject */}
              {selected.subject && (
                <div className={`px-4 py-2.5 border-b ${cfg.border} ${cfg.bg}`}>
                  <p className="text-xs font-semibold text-gray-500">Subject</p>
                  <p className="text-sm font-medium text-gray-900">{selected.subject}</p>
                </div>
              )}

              {/* Body */}
              <div className="px-4 py-4">
                <div className="flex items-center gap-2 mb-3">
                  <Mail className="w-4 h-4 text-gray-400" />
                  <span className="text-xs text-gray-400">
                    {new Date(selected.received_at ?? selected.processed_at).toLocaleString('en-ZA', {
                      weekday: 'short', day: 'numeric', month: 'short',
                      hour: '2-digit', minute: '2-digit'
                    })}
                  </span>
                </div>
                <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                  {selected.body}
                </p>
              </div>
            </div>

            {/* AI reasoning */}
            {selected.classification_reasoning && (
              <div className="mb-4 rounded-xl bg-gray-50 border border-gray-100 px-4 py-3">
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">FIGSY AI Analysis</p>
                <p className="text-xs text-gray-500 leading-relaxed italic">{selected.classification_reasoning}</p>
              </div>
            )}

            {/* Reply assist — show for actionable replies */}
            {(selected.classification === 'hot' || selected.classification === 'interested' || selected.classification === 'warm') && token && (
              <AISuggestionPanel replyId={selected.id} token={token} reply={selected} />
            )}

            {/* Opt-out notice */}
            {selected.classification === 'opt_out' && (
              <div className="mt-4 rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 flex items-start gap-2">
                <Ban className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-rose-700">Contact opted out</p>
                  <p className="text-xs text-rose-500 mt-0.5">This contact has been permanently suppressed across all K.I.N.D campaigns.</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
