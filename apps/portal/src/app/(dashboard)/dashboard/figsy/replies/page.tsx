'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { api } from '@/lib/api'
import { Loader2, MessageSquare, Flame, ThermometerSun, Snowflake, Ban, UserX, Plane, HelpCircle, Copy, Check, RefreshCw } from 'lucide-react'

type ReplyClassification =
  | 'hot'
  | 'warm'
  | 'cold'
  | 'opt_out'
  | 'wrong_person'
  | 'out_of_office'
  | 'other'
  // legacy — mapped to hot on ingest but may exist in DB
  | 'interested'
  | 'not_interested'

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
  leads?: { first_name: string; last_name: string; job_title: string | null; company: string | null }
}

const classConfig: Record<ReplyClassification, {
  label: string
  bg: string
  text: string
  border: string
  icon: React.ElementType
  priority: number
}> = {
  hot:          { label: '🔥 Hot',          bg: 'bg-red-50',    text: 'text-red-700',    border: 'border-red-200',    icon: Flame,         priority: 1 },
  interested:   { label: '🔥 Hot',          bg: 'bg-red-50',    text: 'text-red-700',    border: 'border-red-200',    icon: Flame,         priority: 1 },
  warm:         { label: '🌤️ Warm',         bg: 'bg-amber-50',  text: 'text-amber-700',  border: 'border-amber-200',  icon: ThermometerSun, priority: 2 },
  cold:         { label: '❄️ Cold',          bg: 'bg-blue-50',   text: 'text-blue-600',   border: 'border-blue-200',   icon: Snowflake,     priority: 3 },
  not_interested:{ label: '❄️ Cold',         bg: 'bg-blue-50',   text: 'text-blue-600',   border: 'border-blue-200',   icon: Snowflake,     priority: 3 },
  opt_out:      { label: '🚫 Opted out',    bg: 'bg-rose-50',   text: 'text-rose-700',   border: 'border-rose-200',   icon: Ban,           priority: 4 },
  wrong_person: { label: '👤 Wrong person', bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', icon: UserX,         priority: 5 },
  out_of_office:{ label: '✈️ OOO',          bg: 'bg-gray-50',   text: 'text-gray-500',   border: 'border-gray-200',   icon: Plane,         priority: 6 },
  other:        { label: '❓ Other',         bg: 'bg-gray-50',   text: 'text-gray-500',   border: 'border-gray-200',   icon: HelpCircle,    priority: 7 },
}

const FILTER_OPTIONS = [
  { value: 'all',          label: 'All' },
  { value: 'hot',          label: '🔥 Hot' },
  { value: 'warm',         label: '🌤️ Warm' },
  { value: 'cold',         label: '❄️ Cold' },
  { value: 'opt_out',      label: '🚫 Opted out' },
  { value: 'wrong_person', label: '👤 Wrong person' },
  { value: 'out_of_office',label: '✈️ OOO' },
  { value: 'other',        label: '❓ Other' },
]

function DraftReplyButton({ replyId, token }: { replyId: string; token: string }) {
  const [loading, setLoading]       = useState(false)
  const [suggestion, setSuggestion] = useState('')
  const [used, setUsed]             = useState(false)
  const [copied, setCopied]         = useState(false)

  async function fetchSuggestion() {
    setLoading(true)
    try {
      const res = await api.post<{ data: { suggestion: string } }>(
        `/figsy/replies/${replyId}/suggest`,
        {},
        token
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
    <div className="mt-3">
      <button
        onClick={fetchSuggestion}
        disabled={loading}
        className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white transition-colors"
      >
        {loading ? (
          <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Drafting…</>
        ) : used ? (
          <><RefreshCw className="w-3.5 h-3.5" /> Regenerate</>
        ) : (
          'Draft reply →'
        )}
      </button>

      {suggestion && (
        <div className="mt-3">
          <textarea
            value={suggestion}
            onChange={e => setSuggestion(e.target.value)}
            rows={6}
            className="w-full text-sm text-gray-800 border border-red-200 bg-white rounded-lg px-3 py-2.5 resize-y focus:outline-none focus:ring-2 focus:ring-red-300 leading-relaxed"
          />
          <button
            onClick={copyToClipboard}
            className="mt-2 flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 transition-colors px-2 py-1 rounded hover:bg-white border border-transparent hover:border-gray-200"
          >
            {copied ? (
              <><Check className="w-3.5 h-3.5 text-green-500" /> Copied to clipboard</>
            ) : (
              <><Copy className="w-3.5 h-3.5" /> Copy to clipboard</>
            )}
          </button>
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
  const [expanded, setExpanded] = useState<string | null>(null)
  const [token, setToken]     = useState('')

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      setToken(session.access_token)
      try {
        const res = await api.get<{ data: Reply[] }>('/figsy/replies/all', session.access_token)
        // Sort: hot first, then warm, then cold, etc.
        const sorted = (res.data ?? []).sort((a, b) => {
          const pa = classConfig[a.classification]?.priority ?? 9
          const pb = classConfig[b.classification]?.priority ?? 9
          if (pa !== pb) return pa - pb
          return new Date(b.processed_at).getTime() - new Date(a.processed_at).getTime()
        })
        setReplies(sorted)
      } catch { /* empty */ }
      setLoading(false)
    }
    load()
  }, [])

  // Normalise filter for legacy values
  const normaliseClass = (c: ReplyClassification): string => {
    if (c === 'interested') return 'hot'
    if (c === 'not_interested') return 'cold'
    return c
  }

  const filtered = filter === 'all'
    ? replies
    : replies.filter(r => normaliseClass(r.classification) === filter)

  // Count by normalised classification
  const counts = replies.reduce((acc, r) => {
    const key = normaliseClass(r.classification)
    acc[key] = (acc[key] ?? 0) + 1
    return acc
  }, {} as Record<string, number>)

  // Summary bar — hot + warm = actionable
  const actionable = (counts['hot'] ?? 0) + (counts['warm'] ?? 0)

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">FIGSY Reply Inbox</h1>
        <p className="text-gray-500 text-sm mt-1">All replies across every campaign — classified by AI</p>
      </div>

      {/* Actionable summary */}
      {!loading && actionable > 0 && (
        <div className="mb-5 flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <Flame className="w-5 h-5 text-red-600 flex-shrink-0" />
          <p className="text-sm font-semibold text-red-700">
            {actionable} reply{actionable !== 1 ? 's' : ''} need{actionable === 1 ? 's' : ''} your attention —{' '}
            {counts['hot'] ?? 0} hot, {counts['warm'] ?? 0} warm
          </p>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap mb-6">
        {FILTER_OPTIONS.map(opt => (
          <button key={opt.value} onClick={() => setFilter(opt.value)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
              filter === opt.value
                ? 'bg-gray-900 text-white border-gray-900'
                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
            }`}>
            {opt.value === 'all'
              ? `All (${replies.length})`
              : `${opt.label}${counts[opt.value] ? ` (${counts[opt.value]})` : ''}`}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No replies yet</p>
          <p className="text-sm mt-1">Replies will appear here as leads respond to FIGSY emails</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(reply => {
            const cfg = classConfig[reply.classification] ?? classConfig.other
            const Icon = cfg.icon
            const lead = reply.leads
            const isOpen = expanded === reply.id
            const isHot = reply.classification === 'hot' || reply.classification === 'interested'
            return (
              <div key={reply.id}
                className={`border rounded-xl overflow-hidden ${cfg.border} bg-white`}>
                <button className="w-full text-left px-4 py-3 flex items-start gap-3"
                  onClick={() => setExpanded(isOpen ? null : reply.id)}>
                  <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${cfg.text}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm text-gray-900">
                        {lead ? `${lead.first_name} ${lead.last_name}` : reply.from_email}
                      </span>
                      {lead && (
                        <span className="text-xs text-gray-400">{[lead.job_title, lead.company].filter(Boolean).join(' · ')}</span>
                      )}
                      <span className={`ml-auto text-xs font-semibold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.text}`}>
                        {cfg.label}
                      </span>
                    </div>
                    {reply.subject && <p className="text-xs text-gray-500 mt-0.5 truncate">{reply.subject}</p>}
                  </div>
                  <span className="text-xs text-gray-400 flex-shrink-0 ml-2">
                    {new Date(reply.received_at ?? reply.processed_at).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })}
                  </span>
                </button>
                {isOpen && (
                  <div className={`px-4 pb-4 pt-1 ${cfg.bg} border-t ${cfg.border}`}>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{reply.body}</p>
                    {reply.classification_reasoning && (
                      <p className="text-xs text-gray-400 mt-3 italic">AI: {reply.classification_reasoning}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">{reply.from_email}</p>
                    {isHot && token && (
                      <DraftReplyButton replyId={reply.id} token={token} />
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
