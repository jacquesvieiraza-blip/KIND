'use client'

import { useCallback, useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { createClient } from '@/lib/supabase/client'
import MeetingChallenges from '@/components/milla/MeetingChallenges'
import { useLiveRefresh } from '@/lib/use-live-refresh'

// #507 — MILLA MEETINGS tab: the client's booked meetings, from `GET /leads/meetings`, which
// reads `public.meetings` (the one meeting record). Meetings are REPORTED here — never a money
// condition.

type Meeting = { id: string; title: string; start_time: string | null; status: string; state?: string; name: string; company: string | null }

// ⛓️ 28 Sep — UPCOMING IS A BOOKED MEETING IN THE FUTURE. WAS ~~`m.status === 'confirmed'`~~ — a
// value the API has not sent since meetings moved to `public.meetings` (it sends a label:
// Booked · Held · No-show · Awaiting verification · Rescheduled, plus the raw `state`). So every
// meeting was filed under PAST and badged "Confirmed" — a meeting two days away included. Seen on
// the Northwind demo; true for every client. The badge now shows the API's own label.
const UPCOMING_STATES = ['BOOKED', 'BOOKED_UNVERIFIED']
function isUpcoming(m: Pick<Meeting, 'start_time' | 'state'>, now: number): boolean {
  return !!m.start_time && new Date(m.start_time).getTime() >= now && UPCOMING_STATES.includes(m.state ?? '')
}

async function token(): Promise<string | undefined> {
  try { const { data } = await createClient().auth.getSession(); return data.session?.access_token } catch { return undefined }
}
function when(iso: string | null): string {
  if (!iso) return '—'; const d = new Date(iso); return isNaN(d.getTime()) ? '—'
    : d.toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

export default function MillaMeetingsPage() {
  const [meetings, setMeetings] = useState<Meeting[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try { const r = await api.get<{ data: Meeting[] }>('/leads/meetings', await token()); setMeetings(r.data) }
    catch (e) { setError(e instanceof Error ? e.message : 'Failed to load meetings') }
  }, [])
  useEffect(() => { load() }, [load])
  // ⚑ 28 Sep (R171) — re-read every 20s and on return to the tab: what Vida records shows here.
  useLiveRefresh(load)

  const now = Date.now()
  const upcoming = (meetings ?? []).filter(m => isUpcoming(m, now))
  const past = (meetings ?? []).filter(m => !isUpcoming(m, now))

  const Card = ({ m }: { m: Meeting }) => (
    <div className="bg-white border border-[#eee7f7] rounded-2xl p-4 flex items-center gap-3.5">
      <span className="w-10 h-10 rounded-xl bg-[#efeafc] text-[#7C3AED] font-extrabold flex items-center justify-center shrink-0">
        {(m.name || '?').split(/\s+/).map(p => p[0]).slice(0, 2).join('').toUpperCase()}
      </span>
      <div className="min-w-0 flex-1">
        <b className="text-[14px] block">{m.name}</b>
        <span className="text-[12px] text-[#9b8ec4]">{[m.company, m.title].filter(Boolean).join(' · ')}</span>
        <div className="text-[12px] text-[#5c5279] mt-0.5">{when(m.start_time)}</div>
      </div>
      <span className={`text-[11px] font-extrabold rounded-full px-3 py-1 ${
        m.state === 'HELD' ? 'text-indigo-700 bg-indigo-50'
        : m.state === 'NO_SHOW' ? 'text-red-700 bg-red-50'
        : m.state === 'BOOKED_UNVERIFIED' ? 'text-amber-700 bg-amber-50'
        : 'text-emerald-700 bg-emerald-50'}`}>
        {m.status || 'Booked'}
      </span>
    </div>
  )

  return (
    <div className="h-full overflow-y-auto px-6 py-6">
      <div className="max-w-3xl">
        <h1 className="text-2xl font-bold text-[#1f1235]">Meetings</h1>
        <p className="text-sm text-[#7c6f9b] mt-0.5">Every meeting FIGSY booked from your approved leads.</p>
        {/* ⚑ 25 Sep (R141 · P5b) — your programme's meetings and the 3-business-day challenge. The
            same card as the Programme screen (one implementation); hidden until a meeting exists. */}
        <MeetingChallenges />

        {error && <div className="mt-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">{error}</div>}
        {!meetings && !error && <p className="text-sm text-[#9b8ec4] mt-4">Loading your meetings…</p>}
        {meetings && meetings.length === 0 && (
          <div className="mt-4 text-sm text-[#9b8ec4] bg-white border border-[#ece5fb] rounded-2xl px-4 py-10 text-center">No meetings booked yet. Approve leads and FIGSY works them to a booking. 📅</div>
        )}

        {upcoming.length > 0 && <>
          <h2 className="text-[13px] font-extrabold uppercase tracking-wide text-[#b3a9cc] mt-6 mb-2.5">Upcoming</h2>
          <div className="space-y-2.5">{upcoming.map(m => <Card key={m.id} m={m} />)}</div>
        </>}
        {past.length > 0 && <>
          <h2 className="text-[13px] font-extrabold uppercase tracking-wide text-[#b3a9cc] mt-6 mb-2.5">Past</h2>
          <div className="space-y-2.5">{past.map(m => <Card key={m.id} m={m} />)}</div>
        </>}
      </div>
    </div>
  )
}
