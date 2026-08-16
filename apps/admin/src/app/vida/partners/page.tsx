'use client'

// Vida PARTNERS — the seller seats, INSIDE the Vida console.
//
// ⚠️ Why this page exists at all. The seat-creation card first shipped on `/partners`, the
// OLD admin console — a different shell, different nav, Nora's panel. Clicking "Partners" in
// the Vida menu threw the operator out of Vida entirely, which the founder hit within a
// minute of the walk starting: *"i click partners in the vida and it takes me to the old
// version this needs to stay on the new version."* The old page still exists and still
// works; this is the Vida-native surface for the thing an operator actually does here —
// create a Client Partner seat (R40) and see who holds what.
//
// R40 shapes what is shown: land 20% once, retain per SEAT (a Client Partner earns 8%
// because she also runs customer success; a legacy referral partner earns 5%). Rates are
// read from the row, never typed here.

import { useEffect, useState, useCallback } from 'react'

type Partner = {
  id: string
  name: string | null
  company: string | null
  email: string | null
  seat_type?: string | null
  retain_rate?: number | null
  commission_rate?: number | null
  referral_code: string | null
  country?: string | null
  onboarding_state?: string | null
  status: string | null
  referral_count?: number | null
}

type PartnerDoc = {
  id: string
  title: string
  version: string
  updated: string
  signatureRequired: boolean
  summary: string
  body: string
  live?: boolean
}

// R42 — where a seat is in the flow. 'active' is also what every LEGACY row reads, because
// the migration defaults to it: those partners predate this flow and must not be switched off.
const STATE_LABEL: Record<string, { label: string; cls: string }> = {
  invited:              { label: 'Invited',          cls: 'bg-[#eef2f7] text-[#5c5279]' },
  pack_pending:         { label: 'Completing pack',  cls: 'bg-[#f3ecff] text-[#7C3AED]' },
  awaiting_countersign: { label: 'Awaiting you',     cls: 'bg-[#fff6e5] text-[#7a4b00]' },
  active:               { label: 'Live',             cls: 'bg-emerald-50 text-emerald-700' },
  archived:             { label: 'Archived',         cls: 'bg-[#f1f1f4] text-[#8b8b95]' },
}

function StatePill({ state }: { state?: string | null }) {
  const s = STATE_LABEL[state ?? 'active'] ?? STATE_LABEL.active
  return <span className={`inline-block text-[10.5px] font-bold rounded-full px-2.5 py-1 ${s.cls}`}>{s.label}</span>
}

function pct(v: number | null | undefined, fallback: number): string {
  const n = Number(v)
  return `${Math.round((Number.isFinite(n) && n > 0 ? n : fallback) * 100)}%`
}

export default function VidaPartnersPage() {
  const [partners, setPartners] = useState<Partner[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [docsFor, setDocsFor] = useState<{ seat: Partner; documents: PartnerDoc[] } | null>(null)
  const [docsBusy, setDocsBusy] = useState<string | null>(null)
  // A row action's failure belongs NEXT TO THE ROW. This used to reuse the page-level
  // `error`, which renders under the heading — so a failed "Open pack" looked, from where
  // the operator was actually looking, like a button that did nothing at all.
  const [docsError, setDocsError] = useState<string | null>(null)
  const [openDoc, setOpenDoc] = useState<PartnerDoc | null>(null)
  const [showArchived, setShowArchived] = useState(false)
  const [countersignName, setCountersignName] = useState('')
  const [actionBusy, setActionBusy] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/proxy/partners/admin/list')
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.error || `Failed to load partners (${res.status})`)
      setPartners((json.partners ?? json.data ?? json) as Partner[])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load partners')
    }
  }, [])

  useEffect(() => { void load() }, [load])

  // #202 — the seat's paperwork, read from Vida. The pack is generated per seat rather than
  // stored per seat, because the retain rate belongs to the SEAT (R40) and a stored file
  // cannot follow a rate change.
  async function openDocuments(seat: Partner) {
    setDocsBusy(seat.id); setDocsError(null)
    try {
      const res = await fetch(`/api/proxy/partners/admin/${seat.id}/documents`)
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.error || `Could not load documents (${res.status})`)
      setDocsFor({ seat, documents: json.documents ?? [] })
    } catch (e) {
      setDocsError(`${seat.name || seat.email || 'This seat'}: ${e instanceof Error ? e.message : 'Could not load documents'}`)
    }
    setDocsBusy(null)
  }

  // R42 — THE ONLY THING THAT MAKES A SEAT LIVE. Until this runs, her referral code does not
  // resolve, so an unsigned partner cannot land a client.
  async function countersign(seat: Partner) {
    if (!countersignName.trim()) { setDocsError('Type your full name to counter-sign.'); return }
    setActionBusy(seat.id); setDocsError(null)
    try {
      const res = await fetch(`/api/proxy/partners/admin/${seat.id}/countersign`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signed_name: countersignName.trim() }),
      })
      const json = await res.json().catch(() => ({}))
      if (!json?.success) throw new Error(json?.error || `Could not counter-sign (${res.status})`)
      setCountersignName(''); setDocsFor(null); void load()
    } catch (e) {
      setDocsError(e instanceof Error ? e.message : 'Could not counter-sign')
    }
    setActionBusy(null)
  }

  // Archive, never delete: a partner who has ever earned has commission rows, and deleting the
  // seat would orphan them.
  async function archive(seat: Partner) {
    setActionBusy(seat.id); setDocsError(null)
    try {
      const res = await fetch(`/api/proxy/partners/admin/${seat.id}/archive`, { method: 'POST' })
      const json = await res.json().catch(() => ({}))
      if (!json?.success) throw new Error(json?.error || `Could not archive (${res.status})`)
      void load()
    } catch (e) {
      setDocsError(e instanceof Error ? e.message : 'Could not archive')
    }
    setActionBusy(null)
  }

  async function createSeat() {
    // R42 — name and email are all HE needs. She supplies her own address, mobile and payout
    // details when she completes her pack, because she is the one who knows them.
    if (!name.trim() || !email.trim()) {
      setMsg({ ok: false, text: 'A name and an email address are both required.' }); return
    }
    setBusy(true); setMsg(null)
    try {
      const res = await fetch('/api/proxy/operator/seats/client-partner', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), email: email.trim() }),
      })
      const json = await res.json().catch(() => ({}))
      if (!json?.success) throw new Error(json?.error || `Seat not created (${res.status})`)
      setMsg({
        ok: true,
        text: json.data.invite_sent
          ? `Invited — referral code ${json.data.referral_code}. She completes her own details and signs; it comes back to you to counter-sign before the seat goes live.`
          : `Seat created (code ${json.data.referral_code}) BUT THE INVITE EMAIL DID NOT SEND. She has not been told. Send her the link yourself or remove the seat.`,
      })
      setName(''); setEmail('')
      void load()
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : 'Seat not created' })
    }
    setBusy(false)
  }

  const all = partners ?? []
  const seats = showArchived ? all : all.filter(p => p.onboarding_state !== 'archived')
  const archivedCount = all.filter(p => p.onboarding_state === 'archived').length
  const clientPartners = seats.filter(p => p.seat_type === 'client_partner')
  const awaiting = all.filter(p => p.onboarding_state === 'awaiting_countersign')

  return (
    <div className="h-full overflow-y-auto px-6 py-6">
      <div className="max-w-4xl">
        <h1 className="text-2xl font-bold text-[#1f1235]">Partners</h1>
        <p className="text-sm text-[#7c6f9b] mt-0.5">
          Seller seats · a Client Partner sells <em>and</em> runs customer success, from their own network
        </p>

        {error && <div className="mt-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">{error}</div>}

        {awaiting.length > 0 && (
          <div className="mt-3 text-sm text-[#7a4b00] bg-[#fff6e5] border border-[#f5d9a0] rounded-xl px-4 py-3">
            <strong>{awaiting.length} seat{awaiting.length === 1 ? '' : 's'} awaiting your signature.</strong>{' '}
            {awaiting.map(a => a.name || a.email).join(', ')} — they have signed everything. Open their pack below and
            counter-sign; nothing of theirs is live until you do.
          </div>
        )}

        {/* ── create a seat ─────────────────────────────────────────────── */}
        <div className="mt-5 bg-white border border-[#ece5fb] rounded-2xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-[#f3eefe] flex items-center gap-2 flex-wrap">
            <span className="text-sm font-bold text-[#1f1235]">New Client Partner seat</span>
            <span className="ml-auto text-[12px] text-[#9b8ec4]">invite only · nothing is live until both sides sign</span>
          </div>
          <div className="p-5 flex flex-wrap gap-3 items-end">
            <label className="text-[12px] text-[#7c6f9b] flex flex-col gap-1">
              Name
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Full name"
                className="text-sm border border-[#ece5fb] rounded-lg px-3 py-2 min-w-[190px]" />
            </label>
            <label className="text-[12px] text-[#7c6f9b] flex flex-col gap-1">
              Email
              <input value={email} onChange={e => setEmail(e.target.value)} placeholder="name@example.com"
                className="text-sm border border-[#ece5fb] rounded-lg px-3 py-2 min-w-[230px]" />
            </label>

            <button onClick={createSeat} disabled={busy}
              className="text-sm font-bold text-white bg-[#7C3AED] rounded-lg px-4 py-2 disabled:opacity-50">
              {busy ? 'Creating…' : 'Create seat'}
            </button>
            {msg && (
              <p className={`text-[12.5px] basis-full ${msg.ok ? 'text-emerald-700' : 'text-red-600'}`}>{msg.text}</p>
            )}
          </div>
          <div className="px-5 pb-4 text-[12px] text-[#9b8ec4]">
            Creating a seat emails an invitation. She sets her own password, fills in her details and payout
            method, then signs — and the seat only goes live when you counter-sign below. Written to the audit log.
          </div>
        </div>

        {/* ── the seats ─────────────────────────────────────────────────── */}
        <div className="mt-4 bg-white border border-[#ece5fb] rounded-2xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-[#f3eefe] flex items-center gap-2">
            <span className="text-sm font-bold text-[#1f1235]">Seats</span>
            <span className="ml-auto text-[11px] font-bold text-[#7C3AED] bg-[#f3ecff] rounded-full px-2.5 py-1">
              {clientPartners.length} client partner{clientPartners.length === 1 ? '' : 's'} · {seats.length} total
            </span>
            {archivedCount > 0 && (
              <button onClick={() => setShowArchived(v => !v)}
                className="text-[11.5px] font-semibold text-[#9b8ec4] hover:text-[#5c5279] hover:underline">
                {showArchived ? 'Hide' : 'Show'} {archivedCount} archived
              </button>
            )}
          </div>

          {!partners && !error && <p className="px-5 py-6 text-sm text-[#9b8ec4]">Loading…</p>}
          {partners && seats.length === 0 && (
            <p className="px-5 py-8 text-sm text-[#9b8ec4] text-center">No seats yet — create the first one above.</p>
          )}

          {docsError && (
            <div className="mx-5 mt-3 text-[12.5px] text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5">
              {docsError}
              <span className="block text-[11.5px] text-red-500/90 mt-1">
                If this says the seat was not found, run the migrations first: Vida → Engine → Run migrations (should read 20 of 20), then reload.
              </span>
            </div>
          )}

          {seats.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-[13.5px]">
                <thead>
                  <tr className="text-[10.5px] font-bold uppercase tracking-wider text-[#9b8ec4]">
                    <th className="text-left px-5 py-2.5 border-b border-[#f3eefe]">Seat</th>
                    <th className="text-left px-5 py-2.5 border-b border-[#f3eefe]">Type</th>
                    <th className="text-left px-5 py-2.5 border-b border-[#f3eefe]">Country</th>
                    <th className="text-left px-5 py-2.5 border-b border-[#f3eefe]">Referral code</th>
                    <th className="text-right px-5 py-2.5 border-b border-[#f3eefe]">Land</th>
                    <th className="text-right px-5 py-2.5 border-b border-[#f3eefe]">Retain</th>
                    <th className="text-left px-5 py-2.5 border-b border-[#f3eefe]">Onboarding</th>
                    <th className="text-left px-5 py-2.5 border-b border-[#f3eefe]">Status</th>
                    <th className="text-left px-5 py-2.5 border-b border-[#f3eefe]">Documents</th>
                  </tr>
                </thead>
                <tbody>
                  {seats.map(p => {
                    const isCp = p.seat_type === 'client_partner'
                    return (
                      <tr key={p.id}>
                        <td className="px-5 py-3 border-b border-[#f6f2fd]">
                          <div className="font-semibold text-[#1f1235]">{p.name || '—'}</div>
                          <div className="text-[12px] text-[#9b8ec4]">{p.email || p.company || ''}</div>
                        </td>
                        <td className="px-5 py-3 border-b border-[#f6f2fd]">
                          <span className={`inline-block text-[10.5px] font-bold rounded-full px-2.5 py-1 ${
                            isCp ? 'bg-[#f3ecff] text-[#7C3AED]' : 'bg-[#eef2f7] text-[#5c5279]'}`}>
                            {isCp ? 'Client Partner' : 'Referral partner'}
                          </span>
                        </td>
                        <td className="px-5 py-3 border-b border-[#f6f2fd] text-[#5c5279]">{p.country || '—'}</td>
                        <td className="px-5 py-3 border-b border-[#f6f2fd]">
                          <code className="text-[12px] bg-[#faf7ff] border border-[#ece5fb] rounded px-2 py-0.5">{p.referral_code || '—'}</code>
                        </td>
                        <td className="px-5 py-3 border-b border-[#f6f2fd] text-right tabular-nums">{pct(p.commission_rate, 0.2)}</td>
                        <td className="px-5 py-3 border-b border-[#f6f2fd] text-right tabular-nums font-semibold text-[#0b7a55]">
                          {pct(p.retain_rate, 0.05)}
                        </td>
                        <td className="px-5 py-3 border-b border-[#f6f2fd]"><StatePill state={p.onboarding_state} /></td>
                        <td className="px-5 py-3 border-b border-[#f6f2fd]">
                          <span className={`inline-block text-[10.5px] font-bold rounded-full px-2.5 py-1 ${
                            p.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-[#efeafc] text-[#5c5279]'}`}>
                            {p.status === 'active' ? 'Active' : (p.status || '—')}
                          </span>
                        </td>
                        <td className="px-5 py-3 border-b border-[#f6f2fd]">
                          <button onClick={() => openDocuments(p)} disabled={docsBusy === p.id}
                            className="text-[12.5px] font-bold text-[#7C3AED] hover:underline disabled:opacity-50">
                            {docsBusy === p.id ? 'Opening…' : 'Open pack'}
                          </button>
                          {p.onboarding_state !== 'archived' && (
                            <button onClick={() => archive(p)} disabled={actionBusy === p.id}
                              className="ml-3 text-[12.5px] text-[#9b8ec4] hover:text-[#5c5279] hover:underline disabled:opacity-50">
                              {actionBusy === p.id ? '…' : 'Archive'}
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── the seat's document pack ──────────────────────────────────── */}
        {docsFor && (
          <div className="mt-4 bg-white border border-[#ece5fb] rounded-2xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-[#f3eefe] flex items-center gap-2 flex-wrap">
              <span className="text-sm font-bold text-[#1f1235]">Documents — {docsFor.seat.name || docsFor.seat.email}</span>
              <button onClick={() => setDocsFor(null)}
                className="ml-auto text-[12px] font-bold text-[#9b8ec4] hover:text-[#1f1235]">Close</button>
            </div>
            <div className="divide-y divide-[#f6f2fd]">
              {docsFor.documents.map(d => (
                <div key={d.id} className="px-5 py-3.5 flex items-start gap-3 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[13.5px] font-semibold text-[#1f1235]">{d.title}</span>
                      {d.signatureRequired && (
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#b9781f] bg-[#fdf3e2] rounded-full px-2 py-0.5">to sign</span>
                      )}
                      {d.live && (
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#0b7a55] bg-[#e7f7f0] rounded-full px-2 py-0.5">live</span>
                      )}
                    </div>
                    <p className="text-[12px] text-[#9b8ec4] mt-0.5">{d.summary}</p>
                  </div>
                  {d.live ? (
                    <span className="text-[12px] text-[#9b8ec4] self-center">Generated from her commission rows</span>
                  ) : (
                    <button onClick={() => setOpenDoc(d)}
                      className="text-[12.5px] font-bold text-[#7C3AED] hover:underline self-center">Read</button>
                  )}
                </div>
              ))}
            </div>
            {/* R42 — the counter-signature. This is the last gate before a referral code works. */}
            {docsFor.seat.onboarding_state === 'awaiting_countersign' ? (
              <div className="px-5 py-4 border-t border-[#f3eefe] bg-[#fffdf7]">
                <p className="text-[13px] font-bold text-[#7a4b00] mb-1">They have signed. Your signature makes this live.</p>
                <p className="text-[12px] text-[#9b8ec4] mb-3">
                  Read their signed copies above first — those are frozen exactly as they signed them.
                  Counter-signing activates their referral code and emails them their link.
                </p>
                <div className="flex flex-wrap gap-3 items-center">
                  <input value={countersignName} onChange={e => setCountersignName(e.target.value)}
                    placeholder="Type your full name"
                    className="text-sm border border-[#ece5fb] rounded-lg px-3 py-2 min-w-[230px]" />
                  <button onClick={() => countersign(docsFor.seat)} disabled={actionBusy === docsFor.seat.id}
                    className="text-sm font-bold text-white bg-[#7C3AED] rounded-lg px-4 py-2 disabled:opacity-50">
                    {actionBusy === docsFor.seat.id ? 'Signing…' : 'Counter-sign and go live'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="px-5 py-3.5 text-[12px] text-[#9b8ec4] border-t border-[#f3eefe]">
                {docsFor.seat.onboarding_state === 'active'
                  ? 'This seat is live — its referral code resolves and it can be paid.'
                  : 'Nothing here is live yet. They must complete their pack and sign before you can counter-sign.'}
              </div>
            )}

            <div className="px-5 pb-4 text-[12px] text-[#9b8ec4]">
              These are drafts written by Claude Code, not by a lawyer, and are not legal advice —
              each document says so in its own text.
            </div>
          </div>
        )}

        {openDoc && (
          <div className="fixed inset-0 z-50 bg-black/40 flex items-start justify-center p-4 sm:p-8 overflow-y-auto"
            role="dialog" aria-modal="true" aria-label={openDoc.title} onClick={() => setOpenDoc(null)}>
            <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full my-4" onClick={e => e.stopPropagation()}>
              <div className="flex items-start gap-3 px-6 py-4 border-b border-[#eee9f7] sticky top-0 bg-white rounded-t-2xl">
                <div className="min-w-0">
                  <h2 className="text-base font-bold text-[#1f1235] truncate">{openDoc.title}</h2>
                  <p className="text-[12px] text-[#9b8ec4]">Version {openDoc.version}{openDoc.updated ? ` · ${openDoc.updated}` : ''}</p>
                </div>
                <button onClick={() => setOpenDoc(null)} aria-label="Close"
                  className="ml-auto shrink-0 text-[#9b8ec4] hover:text-[#1f1235] p-1 text-lg leading-none">×</button>
              </div>
              {/* The stored text, rendered exactly as stored — no markdown transformation
                  between what a person signs and what a person reads. */}
              <div className="px-6 py-5">
                <pre className="whitespace-pre-wrap font-sans text-[13.5px] leading-relaxed text-[#2c2440]">{openDoc.body}</pre>
              </div>
              <div className="px-6 py-4 border-t border-[#eee9f7] flex flex-wrap gap-3 items-center">
                <button onClick={() => window.print()}
                  className="text-[13px] font-bold text-white bg-[#7C3AED] hover:bg-[#6D28D9] rounded-lg px-4 py-2">Print</button>
                <span className="text-[12px] text-[#9b8ec4]">Print to send for signature.</span>
              </div>
            </div>
          </div>
        )}

        <p className="mt-4 text-[12px] text-[#9b8ec4]">
          Commission detail, deals and payout history remain on the full partner console.
        </p>
      </div>
    </div>
  )
}
