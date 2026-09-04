'use client'

import { useEffect, useState } from 'react'
import { panelView, vatBadge } from '@kind/shared'
import { useVidaConversation } from '@/components/vida/VidaConversation'

// ── ⚑ 4 Sep (UI-009) — THE CLIENT LIST IS A NAV GROUP NOW, NOT A COLUMN ──────────────────
//
// 🛑 WHAT THIS REPLACES. A dedicated 380px Clients panel sat between the operator nav and the
// conversation, and it cost the workspace almost everything: measured at 1440px the cockpit
// had 304px to render eleven tabs that need 894, so eight of them were off-screen behind a
// scroll with no affordance, and People truncated names and companies.
//
// ⚠️ THE ROWS ARE THE CONSOLE'S OWN, MOVED — not redrawn. Every indicator the operator already
// reads comes across unchanged: the actor dot (pink = needs you, green = the engine is
// working, grey = it is on them), the initials tile, the real next-action sentence, the cold
// "Suspended"/"Going quiet"/"exempt" states, the VAT evidence badge and the house/demo chip.
// No status model is invented here, and nothing decides anything locally — `vatBadge` and
// `panelView` are the same shared functions the panel used.
//
// ⚠️ SELECTING A CLIENT CARRIES ITS NAME. `setSelected(id, name)` puts the identity in the
// provider, which is what keeps "House" in the composer after the console unmounts.

type ClientRow = {
  id: string
  company_name: string | null
  industry: string | null
  country: string | null
  is_demo: boolean | null
  house_or_demo: boolean
  vat_number?: string | null
}
type ColdState = { warn: boolean; cold: boolean; exempt?: boolean; why?: string }
type NextAction = { step: number; label: string; actor: 'you' | 'them' | 'engine' }
type RatioReading = { ratio: number | null; confident: boolean; label: string }
type WorkRow = ClientRow & { cold: ColdState; next: NextAction }

function initials(name: string | null): string {
  const n = (name ?? '').trim()
  if (!n) return 'CL'
  const parts = n.split(/\s+/).filter(Boolean)
  return ((parts[0]?.[0] ?? 'C') + (parts[1]?.[0] ?? parts[0]?.[1] ?? 'L')).toUpperCase()
}

export function VidaClients({ open }: { open: boolean }) {
  const { selected, selectedName, setSelected } = useVidaConversation()
  const [clients, setClients] = useState<ClientRow[] | null>(null)
  const [work, setWork] = useState<WorkRow[] | null>(null)
  const [bookRatio, setBookRatio] = useState<RatioReading | null>(null)
  const [clientsError, setClientsError] = useState<string | null>(null)
  const [workError, setWorkError] = useState<string | null>(null)
  const [onlyNeedsYou, setOnlyNeedsYou] = useState(true)
  // ⚑ 27 Aug (PR2) — A PROOF REVIEW KEEPS ITS CLIENT ON THE LIST, and it has to be read here
  // because the filter is here. A proof-exhausted prospect is by definition NEVER FUNDED, so
  // the worklist puts them at "Waiting on their $299" with `actor: 'them'` — filtered out of
  // "Needs you", which is exactly the client the review is about.
  const [proofReview, setProofReview] = useState<Set<string>>(new Set())

  useEffect(() => {
    let alive = true
    fetch('/api/proxy/operator/clients').then(r => r.json())
      .then(j => { if (!alive) return; if (j?.success) setClients(j.data ?? []); else throw new Error(j?.error || 'the API returned no data') })
      .catch(e => { if (alive) setClientsError(e instanceof Error ? e.message : 'Failed to load clients') })
    fetch('/api/proxy/operator/worklist').then(r => r.json())
      .then(j => { if (!alive) return; if (j?.success) { setWork(j.data ?? []); setBookRatio(j.meta?.ratio ?? null) } else throw new Error(j?.error || 'the API returned no data') })
      .catch(e => { if (alive) setWorkError(e instanceof Error ? e.message : 'Failed to load the worklist') })
    fetch('/api/proxy/operator/alerts').then(r => r.json())
      .then(j => { if (alive && j?.success) setProofReview(new Set((j.data ?? [])
        .filter((a: { kind: string }) => a.kind === 'proof_review')
        .map((a: { client_id: string }) => a.client_id))) })
      .catch(() => { /* the filter simply keeps its default; the list is not blanked */ })
    return () => { alive = false }
  }, [])

  // ⚠️ THE URL STILL PICKS THE CLIENT. `?client=…` is how a Vida "Open →" link and a bookmark
  // reach a specific account, and the panel that used to read it is gone.
  useEffect(() => {
    if (selected || !clients) return
    const id = new URLSearchParams(window.location.search).get('client')
    const row = id ? clients.find(c => c.id === id) : null
    if (row) setSelected(row.id, row.company_name)
  }, [clients, selected, setSelected])

  // The list is already urgency-sorted by the API, so we only filter here.
  const workById = (work ?? []).reduce<Record<string, WorkRow>>((m, r) => { m[r.id] = r; return m }, {})
  const needsYouCount = (work ?? []).filter(r => r.next.actor === 'you').length
  const ordered: ClientRow[] = work ? work.map(w => (clients ?? []).find(c => c.id === w.id) ?? w) : (clients ?? [])
  // ⚠️ THE SELECTED CLIENT IS NEVER FILTERED OUT of the list they are looking at.
  const visible = onlyNeedsYou && work
    ? ordered.filter(c => workById[c.id]?.next.actor === 'you' || proofReview.has(c.id) || c.id === selected)
    : ordered

  // ── COLLAPSED: the selected context, compactly ──────────────────────────────────────────
  if (!open) {
    return (
      <div className="px-2.5 pb-1.5 text-[12px] font-bold text-[#7C3AED] truncate">
        {selectedName ? `· ${selectedName}` : <span className="text-[#b3a9cc] font-semibold">· no client selected</span>}
      </div>
    )
  }

  const v = panelView({ loading: !work && !workError, error: workError, count: work?.length ?? 0, label: 'the worklist' })

  return (
    <div className="pb-1">
      {clientsError && <p className="text-[11.5px] text-red-500 px-2.5 py-1.5">{clientsError}</p>}
      {/* #565 — a failed load used to sit on "Loading…" forever, which reads as "still working
          on it" rather than "this is broken". `panelView` keeps the three states apart. */}
      {v.state !== 'ready' && <p className="text-[11.5px] text-[#9b8ec4] px-2.5 py-1.5">{v.message}</p>}
      {v.state === 'ready' && (
        <div className="flex gap-1 px-2.5 pb-1.5">
          {([[true, `Needs you · ${needsYouCount}`], [false, `All · ${work?.length ?? 0}`]] as [boolean, string][]).map(([val, label]) => (
            <button key={label} onClick={() => setOnlyNeedsYou(val)}
              className={`text-[11px] font-bold rounded-full px-2 py-0.5 border ${onlyNeedsYou === val ? 'text-white bg-[#7C3AED] border-[#7C3AED]' : 'text-[#9b8ec4] bg-white border-[#ece5fb]'}`}>
              {label}
            </button>
          ))}
        </div>
      )}
      {visible.length === 0 && (clients?.length ?? 0) > 0 && (
        <p className="text-[11.5px] text-[#9b8ec4] px-2.5 py-3 text-center">Nothing needs you right now. 🎉</p>
      )}
      {visible.map(c => {
        const active = c.id === selected
        // The row says WHAT'S NEEDED, in words — never a bare count. A pink dot means it costs
        // money or trust to ignore; green is running fine; grey is on them.
        const n = workById[c.id]?.next
        const you = n?.actor === 'you'
        const dot = you ? 'bg-[#EC4899]' : n?.actor === 'engine' ? 'bg-emerald-400' : 'bg-[#cfc4e8]'
        return (
          <button key={c.id} onClick={() => setSelected(c.id, c.company_name)}
            title={n ? `Step ${n.step} · ${n.label}` : (c.company_name ?? undefined)}
            className={`w-full text-left flex items-start gap-2 px-2 py-1.5 rounded-lg mb-0.5 transition-colors border ${
              active ? 'bg-[#f3ecff] border-[#e4d4fb]' : you ? 'bg-[#fdf2f8] border-[#fbcfe8] hover:border-[#f9a8d4]' : 'hover:bg-[#faf8ff] border-transparent'
            }`}>
            <span className={`w-2 h-2 rounded-full shrink-0 mt-[6px] ${dot}`} />
            <span className={`w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold shrink-0 ${active ? 'bg-[#7C3AED] text-white' : 'bg-[#efeafc] text-[#7C3AED]'}`}>
              {initials(c.company_name)}
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1">
                <b className="text-[13px] truncate">{c.company_name || 'Unnamed'}</b>
                {c.house_or_demo && (
                  <span className="shrink-0 text-[9px] font-bold uppercase tracking-wide text-[#b3a9cc] bg-[#efeafc] rounded px-1">
                    {c.is_demo ? 'demo' : 'house'}
                  </span>
                )}
              </span>
              <span className={`text-[11.5px] block truncate ${you ? 'text-[#9d174d] font-semibold' : 'text-[#9b8ec4]'}`}>
                {n?.label ?? ([c.industry, c.country].filter(Boolean).join(' · ') || '—')}
              </span>
              {/* #619 — the API applies the exemption (`coldView`), so these cannot fire on an
                  exempt account, and the exempt hint is grey rather than a red SUSPEND. */}
              {workById[c.id]?.cold?.cold && <span className="mt-0.5 inline-block text-[9px] font-extrabold uppercase tracking-wide text-white bg-[#b91c1c] rounded px-1">Suspended</span>}
              {workById[c.id]?.cold?.warn && <span className="mt-0.5 inline-block text-[9px] font-extrabold uppercase tracking-wide text-[#92400e] bg-[#fef3c7] border border-[#fde68a] rounded px-1">Going quiet</span>}
              {workById[c.id]?.cold?.exempt && (
                <span title={workById[c.id]?.cold?.why} className="mt-0.5 inline-block text-[9px] font-semibold uppercase tracking-wide text-[#8a82a3]">cold-check exempt</span>
              )}
              {/* C6 — VAT EVIDENCE, ON THE ROW. #615 shipped `vatBadge` and nothing rendered it,
                  so "no tax ID" was a fact the operator could only find by opening the client.
                  Amber = missing, grey = they declared not-registered (the NOT_REGISTERED
                  sentinel), green = on file. The SHARED function decides — no local rule, and no
                  special case for house/demo: whatever their record says is what shows.
                  ⚠️ ON ITS OWN LINE at this width, so the client's NAME is never the thing that
                  gets truncated to make room for a badge. */}
              {(() => {
                const b = vatBadge({ vat_number: c.vat_number ?? null })
                return (
              <span title={`VAT evidence: ${b.label}`}
                className={`mt-0.5 inline-block text-[9px] font-bold uppercase tracking-wide rounded px-1 border ${
                  b.tone === 'ok' ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                  : b.tone === 'amber' ? 'text-amber-700 bg-amber-50 border-amber-200'
                  : 'text-[#8a82a3] bg-[#f4f2f9] border-[#e4dcf7]'}`}>
                {b.label}
              </span>
                )
              })()}
            </span>
          </button>
        )
      })}
      {/* THE BOOK'S RATIO — names sourced per approved lead, across every real client.
          Founder-locked 25 Jul: the cashflow model plans on 2, and this is where the real
          number comes from. Kept with the list it belongs to, not dropped in the move. */}
      {bookRatio && (
        <div className="mx-2 mt-2 rounded-lg border border-[#ece5fb] bg-[#fbfaff] px-2 py-1.5">
          <div className="text-[9.5px] font-extrabold uppercase tracking-wide text-[#b3a9cc]">Across the book</div>
          <div className={`text-[11.5px] leading-snug ${bookRatio.confident ? 'text-[#1f1235] font-semibold' : 'text-[#9b8ec4]'}`}>📐 {bookRatio.label}</div>
          {bookRatio.confident && (
            <div className="text-[10.5px] text-[#9b8ec4] mt-0.5 leading-snug">
              Data cost ${(bookRatio.ratio! * 0.28).toFixed(2)} per approved lead — put this number in the cashflow lab.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
