'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { api } from '@/lib/api'
import { Loader2, MessageSquare, CheckCircle, XCircle, Clock, AlertCircle, Copy, Check, RefreshCw } from 'lucide-react'

interface Reply {
  id: string
  from_email: string
  subject: string | null
  body: string
  classification: 'interested' | 'not_interested' | 'opt_out' | 'out_of_office' | 'other'
  classification_reasoning: string | null
  received_at: string
  processed_at: string
  campaign_id: string | null
  lead_id: string
  leads?: { first_name: string; last_name: string; job_title: string | null; company: string | null }
}

const classConfig = {
  interested:     { label: 'Interested 🎯',     bg: 'bg-green-50',  text: 'text-green-700',  border: 'border-green-200', icon: CheckCircle },
  not_interested: { label: 'Not now',           bg: 'bg-amber-50',  text: 'text-amber-700',  border: 'border-amber-200', icon: Clock },
  opt_out:        { label: 'Opted out',         bg: 'bg-red-50',    text: 'text-red-700',    border: 'border-red-200',   icon: XCircle },
  out_of_office:  { label: 'Out of office',     bg: 'bg-gray-50',   text: 'text-gray-600',   border: 'border-gray-200',  icon: AlertCircle },
  other:          { label: 'Other',             bg: 'bg-gray-50',   text: 'text-gray-600',   border: 'border-gray-200',  icon: MessageSquare },
}

export default function FigsyRepliesPage() {
  const supabase = createClient()
  const [replies, setReplies] = useState<Reply[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      try {
        const res = await api.get<{ data: Reply[] }>('/figsy/replies/all', session.access_token)
        setReplies(res.data ?? [])
      } catch { /* empty */ }
      setLoading(false)
    }
    load()
  }, [])

  const filtered = filter === 'all' ? replies : replies.filter(r => r.classification === filter)

  const counts = replies.reduce((acc, r) => {
    acc[r.classification] = (acc[r.classification] ?? 0) + 1
    return acc
  }, {} as Record<string, number>)

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">FIGSY Reply Inbox</h1>
        <p className="text-gray-500 text-sm mt-1">All replies across every FIGSY campaign — classified by AI</p>
      </div>

      {/* filter tabs */}
      <div className="flex gap-2 flex-wrap mb-6">
        {(['all', 'interested', 'not_interested', 'opt_out', 'out_of_office', 'other'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-full text-xs font-600 border transition-colors ${
              filter === f ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
            }`}>
            {f === 'all' ? `All (${replies.length})` : `${classConfig[f].label} (${counts[f] ?? 0})`}
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
