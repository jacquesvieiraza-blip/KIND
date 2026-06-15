'use client'

/**
 * STATUS BAR (#104) — live pulse at the foot of the sidebar.
 * --------------------------------------------------------------------------
 * Shows real, client-scoped signals that already exist in the platform:
 *   • FIGSY state    — active campaigns running, or idle
 *   • Today's sends  — emails sent this UTC day vs the warmup cap (if set)
 *   • System health  — /health probe (operational / disruption)
 *
 * All numbers come from GET /figsy/pulse — no fabricated values. Polls every
 * 60s. Degrades silently to a neutral state on any error; never blocks render.
 */

import { useEffect, useState } from 'react'
import { Activity, Send } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { api } from '@/lib/api'

interface Pulse {
  active_campaigns: number
  sent_today: number
  warmup_cap: number | null
  credit_balance: number
}

type Health = 'checking' | 'ok' | 'degraded'

export function StatusBar() {
  const supabase = createClient()
  const [pulse, setPulse] = useState<Pulse | null>(null)
  const [health, setHealth] = useState<Health>('checking')

  // ── Pulse (client-scoped, authed) ──────────────────────────────────────────
  useEffect(() => {
    let alive = true
    async function load() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) return
        const res = await api.get<{ data: Pulse }>('/figsy/pulse', session.access_token)
        if (alive) setPulse(res.data)
      } catch { /* keep last good / neutral */ }
    }
    load()
    const iv = setInterval(load, 60000)
    return () => { alive = false; clearInterval(iv) }
  }, [supabase])

  // ── System health probe ────────────────────────────────────────────────────
  useEffect(() => {
    let alive = true
    const url = process.env.NEXT_PUBLIC_API_URL || 'https://kindapi-production-e64c.up.railway.app'
    fetch(`${url}/health`, { signal: AbortSignal.timeout(5000) })
      .then(r => { if (alive) setHealth(r.ok ? 'ok' : 'degraded') })
      .catch(() => { if (alive) setHealth('degraded') })
    return () => { alive = false }
  }, [])

  const figsyActive = (pulse?.active_campaigns ?? 0) > 0
  const sentToday   = pulse?.sent_today ?? 0
  const cap         = pulse?.warmup_cap ?? null
  const capPct      = cap && cap > 0 ? Math.min(100, Math.round((sentToday / cap) * 100)) : null

  const healthDot   = health === 'ok' ? 'bg-emerald-400' : health === 'degraded' ? 'bg-amber-400' : 'bg-[#7C3AED]/30'
  const healthLabel = health === 'ok' ? 'All systems operational' : health === 'degraded' ? 'Service disruption' : 'Checking…'

  return (
    <div className="rounded-lg bg-purple-50 px-3 py-2.5 space-y-2">
      {/* FIGSY pulse */}
      <div className="flex items-center gap-2">
        <span className="relative flex h-2 w-2 shrink-0">
          {figsyActive && <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60 animate-ping" />}
          <span className={`relative inline-flex h-2 w-2 rounded-full ${figsyActive ? 'bg-emerald-400' : 'bg-[#7C3AED]/25'}`} />
        </span>
        <Activity className="w-3.5 h-3.5 text-[#7C3AED]/50 shrink-0" />
        <span className="text-[11px] font-medium text-[#6B21A8]/70 truncate">
          {pulse === null
            ? 'FIGSY · loading…'
            : figsyActive
              ? `FIGSY active · ${pulse.active_campaigns} campaign${pulse.active_campaigns === 1 ? '' : 's'}`
              : 'FIGSY idle'}
        </span>
      </div>

      {/* Today's sends vs warmup cap */}
      <div className="flex items-center gap-2">
        <Send className="w-3.5 h-3.5 text-[#7C3AED]/50 shrink-0" />
        <span className="text-[11px] text-[#6B21A8]/70 shrink-0">
          {cap !== null ? `${sentToday} / ${cap} today` : `${sentToday} sent today`}
        </span>
        {capPct !== null && (
          <div className="flex-1 h-1 rounded-full bg-[#7C3AED]/10 overflow-hidden ml-1">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${capPct}%`, background: capPct >= 90 ? '#ea580c' : '#7C3AED' }}
            />
          </div>
        )}
      </div>

      {/* System health */}
      <div className="flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full shrink-0 ${healthDot} ${health === 'ok' ? 'animate-pulse' : ''}`} />
        <span className="text-[11px] text-[#7C3AED]/50 truncate">{healthLabel}</span>
      </div>
    </div>
  )
}
