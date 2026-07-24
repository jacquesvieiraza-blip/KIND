'use client'

import { useCallback, useEffect, useState } from 'react'

// #499 — VIDA BOOKINGS. The operator's meetings view for a client: every confirmed meeting
// (the $3 captured at booking) plus any marked no-show, joined to the lead. Real read of
// calendar_bookings via /api/proxy/operator/bookings. "Mark no-show" is a STATE-ONLY write
// (it does not release or keep the $3) — the no-show → rebook×2 → keep/release MONEY
// automation is deliberately NOT here; that is a flagged founder capture-timing decision.

type ClientRow = { id: string; company_name: string | null; industry: string | null; country: string | null }
type Booking = {
  id: string; lead_id: string | null; meeting_title: string | null; start_time: string | null
  end_time: string | null; status: string | null; meeting_link: string | null; no_show_at: string | null
  first_name: string | null; last_name: string | null; company: string | null
}
type Counts = { total: number; confirmed: number; no_show: number }

function initials(name: string | null): string {
  if (!name) return '—'
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '—'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}
function fullName(f: string | null, l: string | null): string {
  return [f, l].filter(Boolean).join(' ').trim() || 'Unknown lead'
}
function fmtWhen(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return isNaN(d.getTime()) ? '—' : d.toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

export default function VidaBookingsPage() {
  const [clients, setClients] = useState<ClientRow[] | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [bookings, setBookings] = useState<Booking[] | null>(null)
  const [counts, setCounts] = useState<Counts | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [acting, setActing] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/proxy/operator/clients').then(r => r.json()).then(j => {
      if (!j?.success) return
      const rows: ClientRow[] = j.data ?? []
      setClients(rows)
      const urlClient = new URLSearchParams(window.location.search).get('client')
      if (urlClient && rows.some(r => r.id === urlClient)) setSelected(urlClient)
      else if (rows.length > 0) setSelected(rows[0].id)
    }).catch(() => setError('Failed to load clients'))
  }, [])

  const load = useCallback(async (clientId: string) => {
    setLoading(true); setError(null)
    try {
      const res = await fetch(`/api/proxy/operator/bookings?client_id=${encodeURIComponent(clientId)}`)
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json?.success) throw new Error(json?.error || `Failed to load bookings (${res.status})`)
      setBookings(json.data ?? []); setCounts(json.counts ?? null)
    } catch (e) {
      setBookings(null); setError(e instanceof Error ? e.message : 'Failed to load bookings')
    } finally { setLoading(false) }
  }, [])

  useEffect(() => {
    if (!selected) return
    const url = new URL(window.location.href); url.searchParams.set('client', selected)
    window.history.replaceState(null, '', url.toString())
    load(selected)
  }, [selected, load])

  async function markNoShow(id: string, noShow: boolean) {
    if (!selected) return
    setActing(id)
    try {
      const res = await fetch(`/api/proxy/operator/bookings/${encodeURIComponent(id)}/no-show`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ client_id: selected, no_show: noShow }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json?.success) throw new Error(json?.error || `Action failed (${res.status})`)
      await load(selected)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Action failed')
    } finally { setActing(null) }
  }

  const selectedClient = clients?.find(c => c.id === selected) ?? null

  return (
    <div className="flex h-full min-h-0">
      {/* client picker */}
      <div className="w-[300px] shrink-0 border-r border-[#eee7f7] bg-white flex flex-col overflow-hidden">
        <div className="px-[18px] pt-[15px] pb-2.5">
          <b className="text-[14.5px]">Bookings</b>
          <span className="block text-[11.5px] text-[#9b8ec4]">Pick a client to see their meetings</span>
        </div>
        <div className="flex-1 overflow-y-auto px-3 pb-3">
          {!clients && !error && <p className="text-xs text-[#9b8ec4] px-2 py-3">Loading clients…</p>}
          {clients?.length === 0 && <p className="text-xs text-[#9b8ec4] px-2 py-3">No clients yet.</p>}
          {clients?.map(c => {
            const active = c.id === selected
            return (
              <button key={c.id} onClick={() => setSelected(c.id)}
                className={`w-full text-left flex items-center gap-2.5 px-2.5 py-2.5 rounded-xl mb-1 transition-colors ${
                  active ? 'bg-[#f3ecff] border border-[#e4d4fb]' : 'hover:bg-[#faf8ff] border border-transparent'
                }`}>
                <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-[11px] font-bold shrink-0 ${active ? 'bg-[#7C3AED] text-white' : 'bg-[#efeafc] text-[#7C3AED]'}`}>
                  {initials(c.company_name)}
                </span>
                <span className="min-w-0 flex-1">
                  <b className="text-[13px] block truncate">{c.company_name || 'Unnamed'}</b>
                  <span className="text-[11px] text-[#9b8ec4] block truncate">{[c.industry, c.country].filter(Boolean).join(' · ') || '—'}</span>
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* bookings list */}
      <div className="flex-1 flex flex-col bg-[#fbfaff] overflow-hidden">
        {!selected ? (
          <div className="flex-1 flex items-center justify-center text-[#9b8ec4] text-sm">Select a client to see their meetings.</div>
        ) : (
          <>
            <div className="shrink-0 px-[22px] pt-[15px] pb-2 border-b border-[#eee7f7] bg-white">
              <b className="text-[15px]">{selectedClient?.company_name || 'Client'} — bookings</b>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-0.5">{counts?.confirmed ?? 0} confirmed · $3 captured</span>
                <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2.5 py-0.5">{counts?.no_show ?? 0} no-show</span>
              </div>
              <p className="text-[10.5px] text-[#b3a9cc] mt-1.5">Marking a no-show records the state only — it does not release or keep the $3. The rebook / keep money rule is a separate step (flagged for the founder).</p>
            </div>

            {error && <div className="mx-[22px] mt-3 text-xs text-red-500">{error}</div>}
            {loading && !bookings && <div className="px-[22px] py-6 text-sm text-[#9b8ec4]">Loading bookings…</div>}
            {bookings && bookings.length === 0 && !loading && (
              <div className="mx-[22px] mt-4 text-[13px] text-[#9b8ec4] border border-dashed border-[#ece5fb] rounded-xl py-10 text-center">No meetings booked yet for this client.</div>
            )}

            <div className="flex-1 overflow-y-auto px-[22px] py-3.5 space-y-2.5">
              {bookings?.map(b => {
                const noShow = b.status === 'no_show'
                return (
                  <div key={b.id} className={`bg-white border rounded-xl px-4 py-3 flex items-center gap-3 ${noShow ? 'border-amber-200' : 'border-[#eee7f7]'}`}>
                    <span className="w-9 h-9 rounded-lg bg-[#efeafc] text-[#7C3AED] flex items-center justify-center text-[12px] font-bold shrink-0">
                      {initials(fullName(b.first_name, b.last_name))}
                    </span>
                    <div className="min-w-0 flex-1">
                      <b className="text-[13.5px] block truncate">{fullName(b.first_name, b.last_name)}</b>
                      <span className="text-[11.5px] text-[#9b8ec4] block truncate">{[b.company, b.meeting_title].filter(Boolean).join(' · ') || '—'}</span>
                    </div>
                    <div className="text-right shrink-0">
                      <span className={`text-[12px] font-semibold block ${noShow ? 'text-amber-600' : 'text-emerald-600'}`}>{fmtWhen(b.start_time)}</span>
                      <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: noShow ? '#b45309' : '#059669' }}>{noShow ? 'no-show' : 'confirmed'}</span>
                    </div>
                    {b.meeting_link && !noShow && (
                      <a href={b.meeting_link} target="_blank" rel="noreferrer" className="text-[11px] font-bold text-[#7C3AED] shrink-0 hover:underline">Open ↗</a>
                    )}
                    {noShow ? (
                      <button disabled={acting === b.id} onClick={() => markNoShow(b.id, false)}
                        className="text-[11px] font-semibold text-[#5c5279] rounded-lg py-1.5 px-3 border border-[#ece5fb] bg-white disabled:opacity-50 shrink-0">
                        {acting === b.id ? '…' : 'Undo no-show'}
                      </button>
                    ) : (
                      <button disabled={acting === b.id} onClick={() => markNoShow(b.id, true)}
                        className="text-[11px] font-semibold text-amber-700 rounded-lg py-1.5 px-3 border border-amber-200 bg-amber-50 hover:bg-amber-100 disabled:opacity-50 shrink-0">
                        {acting === b.id ? '…' : 'Mark no-show'}
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
