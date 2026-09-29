'use client'

import { useEffect, useState } from 'react'

// ═══════════════════════════════════════════════════════════════════════════════════════
// ⚑ 29 Sep (R174 · 4h) — VIDA MEETINGS READS THE MEETINGS TABLE.
//
// ⛓️ WAS #499's view of `calendar_bookings` (the old bookings table): the demo read "0 confirmed"
// while Milla showed its meetings, "up to 2 goodwill rebooks" contradicted the one free
// reschedule (R141), and a second rebook told the client to "re-run them for $4". The list and
// its actions are now the Programme tab's own meetings panel (`MeetingQualifyPanel` — qualify,
// challenge, no-show, reschedule, all on `public.meetings`), so there is one set of meeting rules.
// The test-booking tool stays (made safe in 1c: nobody real is invited, nothing is counted).
// ═══════════════════════════════════════════════════════════════════════════════════════
import MeetingQualifyPanel from '@/components/vida/MeetingQualifyPanel'

type ClientRow = { id: string; company_name: string | null; industry: string | null; country: string | null }
function initials(name: string | null): string {
  if (!name) return '—'
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '—'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}
export default function VidaBookingsPage() {
  const [clients, setClients] = useState<ClientRow[] | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

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
  // ⚠️ A PICKER, NOT A TEXT BOX. The first version asked for a lead UUID — and no screen in
  // Vida renders one, so it meant "go and query the database". A tool that needs an id a human
  // cannot see is not a tool.
  // ⚠️ A SEPARATE ERROR STATE, BECAUSE [] AND "BROKEN" ARE DIFFERENT ANSWERS. The first version
  // mapped every failure to an empty array, so a failing query rendered as "This client has no
  // leads yet" on every client — the founder reported no data when the truth was a broken
  // request. A screen that cannot tell "none" from "broken" sends somebody looking in the
  // wrong place.
  const [linkResult, setLinkResult] = useState<{ url: string | null; blocked: string | null; lead?: { name: string | null; company: string | null } } | null>(null)
  const [linkBusy, setLinkBusy] = useState(false)

  useEffect(() => { setLinkResult(null) }, [selected])

  async function issueLink() {
    if (!selected || linkBusy) return
    setLinkBusy(true); setLinkResult(null)
    try {
      // ⚑ 29 Sep (R174 ② · 1c) — the tool's own test person, never a real prospect.
      const r = await fetch(`/api/proxy/operator/clients/${encodeURIComponent(selected)}/test-booking-link`, { method: 'POST' })
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

  useEffect(() => {
    if (!selected) return
    const url = new URL(window.location.href); url.searchParams.set('client', selected)
    window.history.replaceState(null, '', url.toString())
  }, [selected])

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
              <b className="text-[15px]">{selectedClient?.company_name || 'Client'} — meetings</b>
              <p className="text-[10.5px] text-[#b3a9cc] mt-1.5">From the meetings table — the same list and rules as the client&apos;s Programme tab and Milla. One free reschedule (R141). No money moves here.</p>
            </div>

            {/* ── TEST BOOKING LINK (P47 follow-on) ──────────────────────────────────────
                R55/L2: proves a booking reaches a REAL calendar without a live campaign send.
                The link is the product's own prospect link — not a shortcut around it. */}
            <div className="mx-[22px] mt-3 border border-[#ece5fb] rounded-xl p-3.5 bg-[#faf8ff]">
              <b className="text-[12.5px] text-[#4c4368]">Test a real booking</b>
              <p className="text-[10.5px] text-[#9b8ec4] mt-0.5 leading-relaxed">
                Makes a link for this client's own <b>test person</b> (never a real prospect). Open it, pick a slot,
                and a TEST event lands in their connected Google Calendar — nobody is invited, and nothing is
                recorded or counted as a meeting.
              </p>
              <button onClick={() => void issueLink()} disabled={linkBusy}
                className="mt-2.5 text-[12px] font-bold text-white bg-[#7C3AED] rounded-lg px-3 py-1.5 disabled:opacity-40">
                {linkBusy ? 'Making…' : 'Make a test booking link'}
              </button>
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
                    {' '}— the real booking page, for the test person. The event is marked TEST and invites nobody.
                  </p>
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto px-[22px] py-3.5">
              <MeetingQualifyPanel clientId={selected} />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
