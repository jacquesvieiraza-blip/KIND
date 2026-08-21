'use client'

import { useCallback, useEffect, useState } from 'react'

// #499 — VIDA BOOKINGS. The operator's meetings view for a client: every confirmed meeting
// plus any marked no-show, joined to the lead. Real read of calendar_bookings via
// /api/proxy/operator/bookings. Meetings are REPORTED, never a money condition — no money
// moves here. "Mark no-show" is a STATE-ONLY write, and a no-show gets up to 2 goodwill
// rebooks (no new charge).

type ClientRow = { id: string; company_name: string | null; industry: string | null; country: string | null }
type Booking = {
  id: string; lead_id: string | null; meeting_title: string | null; start_time: string | null
  end_time: string | null; status: string | null; meeting_link: string | null; no_show_at: string | null
  rebook_count: number; first_name: string | null; last_name: string | null; company: string | null
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
  const [rebookOpen, setRebookOpen] = useState<string | null>(null) // booking id with the reschedule input open
  const [rebookWhen, setRebookWhen] = useState('')                  // datetime-local value

  // ── TEST BOOKING LINK (P47 follow-on, 21 Aug) ─────────────────────────────────────────
  // R55/L2: the founder connected Google on 20 Aug and it worked — then could not test the
  // half that matters, because NOTHING in the product books anything. `/calendar/book` has no
  // screen anywhere (grepped portal + admin: zero callers), and the only path to a real
  // calendar is the COLD-PROSPECT page `/book/<token>`. Proving a booking therefore meant
  // sourcing → approving → enrolling → a live send → clicking the link as the recipient.
  //
  // This mints that same token for any lead so the real page can be walked in two minutes.
  // It is not a shortcut around the product: the URL IS the product's URL, and booking still
  // happens on the real page through the real `performBooking`.
  const [linkLeadId, setLinkLeadId] = useState('')
  const [linkResult, setLinkResult] = useState<{ url: string | null; blocked: string | null; lead?: { name: string | null; company: string | null } } | null>(null)
  const [linkBusy, setLinkBusy] = useState(false)

  async function issueLink() {
    if (!selected || !linkLeadId.trim() || linkBusy) return
    setLinkBusy(true); setLinkResult(null)
    try {
      const r = await fetch(`/api/proxy/operator/leads/${linkLeadId.trim()}/booking-link?client_id=${selected}`)
      const j = await r.json()
      if (!j?.success) { setLinkResult({ url: null, blocked: j?.error ?? 'Could not issue a link' }); return }
      setLinkResult({ url: j.url ?? null, blocked: j.blocked ?? null, lead: j.lead })
    } catch {
      setLinkResult({ url: null, blocked: 'Could not reach the engine' })
    } finally { setLinkBusy(false) }
  }

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

  // #499m — a goodwill rebook after a no-show. No new charge; max 2 (backend enforces).
  // `when` is the operator-agreed new time (optional — omitting just counts the retry).
  async function rebook(id: string, when: string) {
    if (!selected) return
    setActing(id)
    try {
      const body: Record<string, unknown> = { client_id: selected }
      if (when) body.new_start = new Date(when).toISOString()
      const res = await fetch(`/api/proxy/operator/bookings/${encodeURIComponent(id)}/rebook`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json?.success) throw new Error(json?.error || `Rebook failed (${res.status})`)
      setRebookOpen(null); setRebookWhen('')
      await load(selected)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Rebook failed')
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
                <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-0.5">{counts?.confirmed ?? 0} confirmed</span>
                <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2.5 py-0.5">{counts?.no_show ?? 0} no-show</span>
              </div>
              <p className="text-[10.5px] text-[#b3a9cc] mt-1.5">Meetings are reported to the client — no money moves here. A no-show gets up to <b className="text-[#5c5279]">2 goodwill rebooks</b>.</p>
            </div>

            {/* ── TEST BOOKING LINK (P47 follow-on) ──────────────────────────────────────
                R55/L2: proves a booking reaches a REAL calendar without a live campaign send.
                The link is the product's own prospect link — not a shortcut around it. */}
            <div className="mx-[22px] mt-3 border border-[#ece5fb] rounded-xl p-3.5 bg-[#faf8ff]">
              <b className="text-[12.5px] text-[#4c4368]">Test a real booking</b>
              <p className="text-[10.5px] text-[#9b8ec4] mt-0.5 leading-relaxed">
                Paste a lead ID for this client to get the prospect booking link. Open it, pick a slot,
                and the meeting lands in their connected Google Calendar — the same page a real prospect uses.
              </p>
              <div className="flex gap-2 mt-2.5">
                <input value={linkLeadId} onChange={e => setLinkLeadId(e.target.value)}
                  placeholder="lead id (uuid)"
                  className="flex-1 text-[12px] border border-[#e4d4fb] rounded-lg px-2.5 py-1.5 bg-white" />
                <button onClick={() => void issueLink()} disabled={!linkLeadId.trim() || linkBusy}
                  className="text-[12px] font-bold text-white bg-[#7C3AED] rounded-lg px-3 py-1.5 disabled:opacity-40">
                  {linkBusy ? 'Issuing…' : 'Get link'}
                </button>
              </div>
              {linkResult?.blocked && (
                <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-2 mt-2.5">
                  {linkResult.blocked}
                </p>
              )}
              {linkResult?.url && (
                <div className="mt-2.5">
                  <a href={linkResult.url} target="_blank" rel="noopener"
                    className="text-[12px] font-bold text-[#7C3AED] underline break-all">{linkResult.url}</a>
                  <p className="text-[10.5px] text-[#9b8ec4] mt-1">
                    {linkResult.lead?.name || 'This lead'}{linkResult.lead?.company ? ` · ${linkResult.lead.company}` : ''}
                    {' '}— opens the real prospect page. Booking there is a real calendar event.
                  </p>
                </div>
              )}
            </div>

            {error && <div className="mx-[22px] mt-3 text-xs text-red-500">{error}</div>}
            {loading && !bookings && <div className="px-[22px] py-6 text-sm text-[#9b8ec4]">Loading bookings…</div>}
            {bookings && bookings.length === 0 && !loading && (
              <div className="mx-[22px] mt-4 text-[13px] text-[#9b8ec4] border border-dashed border-[#ece5fb] rounded-xl py-10 text-center">No meetings booked yet for this client.</div>
            )}

            <div className="flex-1 overflow-y-auto px-[22px] py-3.5 space-y-2.5">
              {bookings?.map(b => {
                const noShow = b.status === 'no_show'
                const used = b.rebook_count ?? 0
                const atMax = used >= 2
                const isOpen = rebookOpen === b.id
                return (
                  <div key={b.id} className={`bg-white border rounded-xl px-4 py-3 ${noShow ? 'border-amber-200' : 'border-[#eee7f7]'}`}>
                    <div className="flex items-center gap-3">
                      <span className="w-9 h-9 rounded-lg bg-[#efeafc] text-[#7C3AED] flex items-center justify-center text-[12px] font-bold shrink-0">
                        {initials(fullName(b.first_name, b.last_name))}
                      </span>
                      <div className="min-w-0 flex-1">
                        <b className="text-[13.5px] block truncate">{fullName(b.first_name, b.last_name)}</b>
                        <span className="text-[11.5px] text-[#9b8ec4] block truncate">
                          {[b.company, b.meeting_title].filter(Boolean).join(' · ') || '—'}
                          {used > 0 && <span className="text-[#b45309] font-semibold"> · rebooked {used}/2</span>}
                        </span>
                        {b.lead_id && <a href={`/vida/record?lead_id=${encodeURIComponent(b.lead_id)}`} className="text-[10.5px] font-bold text-[#7C3AED] hover:underline">Record →</a>}
                      </div>
                      <div className="text-right shrink-0">
                        <span className={`text-[12px] font-semibold block ${noShow ? 'text-amber-600' : 'text-emerald-600'}`}>{fmtWhen(b.start_time)}</span>
                        <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: noShow ? '#b45309' : '#059669' }}>{noShow ? 'no-show' : 'confirmed'}</span>
                      </div>
                      {b.meeting_link && !noShow && (
                        <a href={b.meeting_link} target="_blank" rel="noreferrer" className="text-[11px] font-bold text-[#7C3AED] shrink-0 hover:underline">Open ↗</a>
                      )}
                      {!noShow && (
                        <button disabled={acting === b.id} onClick={() => markNoShow(b.id, true)}
                          className="text-[11px] font-semibold text-amber-700 rounded-lg py-1.5 px-3 border border-amber-200 bg-amber-50 hover:bg-amber-100 disabled:opacity-50 shrink-0">
                          {acting === b.id ? '…' : 'Mark no-show'}
                        </button>
                      )}
                      {noShow && atMax && (
                        <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg py-1.5 px-3 shrink-0">2 rebooks used</span>
                      )}
                      {noShow && !atMax && (
                        <div className="flex gap-1.5 shrink-0">
                          <button disabled={acting === b.id} onClick={() => { setRebookOpen(isOpen ? null : b.id); setRebookWhen('') }}
                            className="text-[11px] font-bold text-[#7C3AED] rounded-lg py-1.5 px-3 border border-[#e4d4fb] bg-[#f3ecff] hover:bg-[#ebe0fc] disabled:opacity-50">
                            {isOpen ? 'Cancel' : `Rebook (${used}/2)`}
                          </button>
                          <button disabled={acting === b.id} onClick={() => markNoShow(b.id, false)}
                            className="text-[11px] font-semibold text-[#5c5279] rounded-lg py-1.5 px-3 border border-[#ece5fb] bg-white disabled:opacity-50">
                            Undo
                          </button>
                        </div>
                      )}
                    </div>
                    {/* #499m inline reschedule — operator enters the agreed new time (optional) */}
                    {noShow && !atMax && isOpen && (
                      <div className="mt-2.5 flex items-center gap-2 pl-12">
                        <input type="datetime-local" value={rebookWhen} min={new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)} onChange={e => setRebookWhen(e.target.value)}
                          className="text-[12px] rounded-lg border border-[#e4dcf7] bg-white px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/30" />
                        <button disabled={acting === b.id} onClick={() => rebook(b.id, rebookWhen)}
                          className="text-[11px] font-bold text-white rounded-lg py-1.5 px-4 bg-gradient-to-br from-[#7C3AED] to-[#EC4899] disabled:opacity-50">
                          {acting === b.id ? '…' : rebookWhen ? 'Confirm new time' : 'Count rebook (no time)'}
                        </button>
                        <span className="text-[10.5px] text-[#b3a9cc]">No new charge · you send the new invite</span>
                      </div>
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
