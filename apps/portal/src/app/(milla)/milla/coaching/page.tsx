'use client'

// M9 — COACHING. We booked the meeting; the client still has to win it. We hold the context
// they need (who this person is, why they fit, what they actually wrote), so this turns it
// into a prep brief on demand. Value-add — never a money event.

import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { createClient } from '@/lib/supabase/client'

type Meeting = {
  booking_id: string; lead_id: string; start_time: string | null; status: string | null
  name: string; job_title: string | null; company: string | null; industry: string | null
  score: number | null; why_fits: string | null; their_words: string | null; signal: string | null
}

async function token(): Promise<string | undefined> {
  try { const { data } = await createClient().auth.getSession(); return data.session?.access_token } catch { return undefined }
}
function when(iso: string | null): string {
  if (!iso) return 'Not scheduled'
  const d = new Date(iso)
  return isNaN(d.getTime()) ? 'Not scheduled'
    : d.toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

export default function MillaCoachingPage() {
  const [meetings, setMeetings] = useState<Meeting[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [briefs, setBriefs] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState<string | null>(null)

  useEffect(() => {
    (async () => {
      try {
        const r = await api.get<{ data: { meetings: Meeting[] } }>('/leads/coaching', await token())
        setMeetings(r.data.meetings)
      } catch (e) { setError(e instanceof Error ? e.message : 'Could not load your meetings') }
    })()
  }, [])

  async function getBrief(leadId: string) {
    setBusy(leadId); setError(null)
    try {
      const r = await api.post<{ data: { brief: string } }>(`/leads/coaching/${leadId}/brief`, {}, await token())
      setBriefs(b => ({ ...b, [leadId]: r.data.brief }))
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not build the brief') }
    finally { setBusy(null) }
  }

  return (
    <div className="h-full overflow-y-auto px-5 py-4">
      <div className="mb-4">
        <h1 className="text-[19px] font-extrabold text-[#1f1235]">Coaching</h1>
        <p className="text-[12.5px] text-[#9b8ec4] mt-0.5">
          We got you the meeting. Here&apos;s how to win it — built from what we know about each prospect.
        </p>
      </div>

      {error && <div className="text-[13px] text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3 mb-4">{error}</div>}
      {!meetings && !error && <p className="text-[13px] text-[#9b8ec4] py-10 text-center">Loading…</p>}

      {meetings && meetings.length === 0 && (
        <div className="bg-white border border-[#eee7f7] rounded-2xl px-5 py-10 text-center">
          <p className="text-[14px] font-bold text-[#1f1235]">No meetings booked yet.</p>
          <p className="text-[12.5px] text-[#9b8ec4] mt-1">
            Once we book one, your prep brief appears here automatically.
          </p>
        </div>
      )}

      <div className="space-y-3.5 max-w-3xl">
        {(meetings ?? []).map(m => (
          <div key={m.booking_id} className="bg-white border border-[#eee7f7] rounded-2xl p-4 sm:p-5">
            <div className="flex items-start gap-3 flex-wrap">
              <div className="min-w-0">
                <b className="text-[15px] block leading-tight">{m.name}</b>
                <span className="text-[12.5px] text-[#9b8ec4]">
                  {[m.job_title, m.company].filter(Boolean).join(' · ') || '—'}
                </span>
              </div>
              <span className="ml-auto shrink-0 text-[12px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-3 py-1">
                {when(m.start_time)}
              </span>
            </div>

            {m.why_fits && (
              <div className="mt-3 bg-[#faf8ff] border border-[#f2ecfb] rounded-xl px-3.5 py-2.5">
                <span className="text-[10px] font-extrabold uppercase tracking-wide text-[#b3a9cc]">Why they fit you</span>
                <p className="text-[12.5px] text-[#4c4368] leading-relaxed mt-1">{m.why_fits}</p>
              </div>
            )}

            {m.their_words && (
              <div className="mt-2.5 bg-[#fffbeb] border border-[#fde68a] rounded-xl px-3.5 py-2.5">
                <span className="text-[10px] font-extrabold uppercase tracking-wide text-[#b45309]">
                  Their own words{m.signal ? ` · ${m.signal}` : ''}
                </span>
                <p className="text-[12.5px] text-[#5c4a1f] leading-relaxed mt-1 whitespace-pre-wrap">{m.their_words}</p>
              </div>
            )}

            {briefs[m.lead_id] ? (
              <div className="mt-3 border border-[#e4dcf7] rounded-xl px-4 py-3.5 bg-gradient-to-br from-[#faf7ff] to-white">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-[14px]">🎓</span>
                  <b className="text-[13px]">Your prep brief</b>
                </div>
                <p className="text-[12.5px] text-[#4c4368] leading-relaxed whitespace-pre-wrap">{briefs[m.lead_id]}</p>
              </div>
            ) : (
              <button onClick={() => getBrief(m.lead_id)} disabled={busy === m.lead_id}
                className="mt-3 text-[12.5px] font-extrabold text-white rounded-xl px-4 py-2.5 bg-gradient-to-br from-[#7C3AED] to-[#EC4899] disabled:opacity-60">
                {busy === m.lead_id ? 'Building your brief…' : '🎓 Prep me for this meeting'}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
