'use client'

import { useCallback, useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { createClient } from '@/lib/supabase/client'

// #507 — MILLA MEETINGS tab: the client's booked meetings (their calendar), from live
// calendar_bookings. Each booked meeting is where the $3 was captured (#492).

type Meeting = { id: string; title: string; start_time: string | null; status: string; name: string; company: string | null }

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

  const now = Date.now()
  const upcoming = (meetings ?? []).filter(m => m.start_time && new Date(m.start_time).getTime() >= now && m.status === 'confirmed')
  const past = (meetings ?? []).filter(m => !(m.start_time && new Date(m.start_time).getTime() >= now && m.status === 'confirmed'))

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
      <span className={`text-[11px] font-extrabold rounded-full px-3 py-1 ${m.status === 'completed' ? 'text-indigo-700 bg-indigo-50' : 'text-emerald-700 bg-emerald-50'}`}>
        {m.status === 'completed' ? 'Completed' : 'Confirmed'} · $3 captured
      </span>
    </div>
  )

  return (
    <div className="h-full overflow-y-auto px-6 py-6">
      <div className="max-w-3xl">
        <h1 className="text-2xl font-bold text-[#1f1235]">Meetings</h1>
        <p className="text-sm text-[#7c6f9b] mt-0.5">Every meeting FIGSY booked from your approved leads. The $3 is captured when a meeting confirms.</p>

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
