'use client'

/**
 * ACTIVITY FEED (#102)
 * --------------------------------------------------------------------------
 * Live timeline of what's happening across the workspace — sends, replies,
 * meetings — newest first. Reads GET /figsy/activity (real, client-scoped
 * events; no fabricated entries). Polls every 30s so it feels live.
 */

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { api } from '@/lib/api'
import { Loader2, Send, MessageSquare, CalendarCheck, Activity, RefreshCw } from 'lucide-react'

interface Event {
  type: 'sent' | 'reply' | 'meeting'
  title: string
  subtitle: string
  at: string
  tone: 'neutral' | 'positive' | 'warn'
}

function timeAgo(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return 'just now'
  const m = Math.floor(s / 60); if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24); return `${d}d ago`
}

const ICON = { sent: Send, reply: MessageSquare, meeting: CalendarCheck }

export default function ActivityPage() {
  const supabase = createClient()
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  async function load() {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const res = await api.get<{ data: Event[] }>('/figsy/activity?limit=50', session.access_token)
      setEvents(res.data ?? [])
    } catch { /* keep last good */ }
    finally { setLoading(false); setRefreshing(false) }
  }

  useEffect(() => {
    load()
    const iv = setInterval(load, 30000)
    return () => clearInterval(iv)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Activity className="w-5 h-5 text-[#7C3AED]" /> Activity
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Everything happening across your workspace, live.</p>
        </div>
        <button
          onClick={() => { setRefreshing(true); load() }}
          className="flex items-center gap-1.5 text-xs font-medium text-[#7C3AED] hover:bg-purple-50 px-3 py-2 rounded-lg transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48 text-[#7C3AED]">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : events.length === 0 ? (
        <div className="rounded-xl border border-purple-100/60 bg-white p-10 text-center">
          <Activity className="w-8 h-8 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">No activity yet. Once FIGSY starts sending, it shows up here in real time.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-purple-100/60 bg-white divide-y divide-gray-50">
          {events.map((e, i) => {
            const Icon = ICON[e.type]
            const tone = e.tone === 'positive'
              ? 'bg-emerald-100 text-emerald-600'
              : e.tone === 'warn'
                ? 'bg-amber-100 text-amber-600'
                : 'bg-[#7C3AED]/10 text-[#7C3AED]'
            return (
              <div key={i} className="flex items-start gap-3 px-4 py-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${tone}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{e.title}</p>
                  <p className="text-xs text-gray-500 truncate">{e.subtitle}</p>
                </div>
                <span className="text-[11px] text-gray-400 shrink-0 mt-1">{timeAgo(e.at)}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
