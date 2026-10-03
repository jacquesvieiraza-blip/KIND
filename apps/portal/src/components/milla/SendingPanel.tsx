'use client'

// ⚑ 2 Oct (#2551 · R187 ②) — THE CLIENT'S SENDING PANEL. The founder: *"yes both. lock"* · a
// panel for every client: *"Q6. Yes"*. What is going out for them, in numbers they can track.
// A number the server could not read arrives as null and shows "—", never 0.

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { createClient } from '@/lib/supabase/client'

type Panel = {
  sentToday: number | null; sentTotal: number | null; leftToEmail: number | null; nextSendAt: string | null
  replies: number | null; bounces: number | null; optOuts: number | null; meetings: number | null
}

async function token(): Promise<string | undefined> {
  const { data: { session } } = await createClient().auth.getSession()
  return session?.access_token
}

const n = (v: number | null) => (v === null ? '—' : v.toLocaleString())

export function nextSendLabel(iso: string | null, now = new Date()): string {
  if (!iso) return 'Nothing scheduled'
  const d = new Date(iso)
  if (d.getTime() <= now.getTime()) return 'Due now'
  return d.toLocaleString(undefined, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export default function SendingPanel() {
  const [p, setP] = useState<Panel | null>(null)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    void (async () => {
      try {
        const r = await api.get<{ data: Panel }>('/my/programme/sending', await token())
        setP(r.data ?? null)
      } catch { setFailed(true) }
    })()
  }, [])

  if (failed) return null
  const cells: [string, string][] = p ? [
    ['Sent today', n(p.sentToday)], ['Sent in total', n(p.sentTotal)],
    ['Left to email', n(p.leftToEmail)], ['Next send', nextSendLabel(p.nextSendAt)],
    ['Replies', n(p.replies)], ['Bounces', n(p.bounces)],
    ['Opt-outs', n(p.optOuts)], ['Meetings', n(p.meetings)],
  ] : []

  return (
    <div className="mv-section mt-3" data-testid="sending-panel">
      <div className="mv-section-head">
        <b>Sending</b>
        <span>what is going out for you</span>
      </div>
      <div className="mv-section-body grid grid-cols-2 sm:grid-cols-4 gap-3">
        {p ? cells.map(([label, value]) => (
          <div key={label} className="min-w-0">
            <div className="text-[12px] text-[#9b8ec4]">{label}</div>
            <div className="text-[15px] font-semibold text-[#1f1235] tabular-nums">{value}</div>
          </div>
        )) : <div className="text-[13px] text-[#9b8ec4] col-span-full">Loading…</div>}
      </div>
    </div>
  )
}
