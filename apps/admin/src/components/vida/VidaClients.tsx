'use client'

import { useCallback, useEffect, useState } from 'react'
// ⚑ MVP1 (C20) — the refresh POLICY, not a second copy of it. A successful read replaces; a
// failed read changes nothing; an error is named only when there is nothing to show.
import {
  nextRailValue, shouldSurfaceError, shouldPollNow, RAIL_REFRESH_MS,
  visibleDrafts, reconcileDrafts,
} from '@/lib/vida-rail-refresh'
import { useSearchParams } from 'next/navigation'
import { panelView } from '@kind/shared'
import { useVidaConversation } from '@/components/vida/VidaConversation'

// ── ⚑ 4 Sep (UI-009) — THE CLIENT LIST IS A NAV GROUP NOW, NOT A COLUMN ──────────────────
//
// 🛑 WHAT THIS REPLACES. A dedicated 380px Clients panel sat between the operator nav and the
// conversation, and it cost the workspace almost everything: measured at 1440px the cockpit
// had 304px to render eleven tabs that need 894, so eight of them were off-screen behind a
// scroll with no affordance, and People truncated names and companies.
//
// ⛓️ 9 Sep — AND THE ROW IS THE APPROVED SHAPE NOW: **client name · stage word · optional
// "needs you"**, and nothing else. It carried a next-action sentence, a Suspended/Going-quiet
// cold badge, a VAT-evidence badge and industry · country — four judgements competing with the
// client's own name at 216px, none of them the question the list is for. The founder's rule:
// *"NO giant metrics in list rows."*
//
// ⚠️ NOTHING LEFT THE PRODUCT, ONLY THIS ROW. Cold state stays on the worklist API and VAT
// evidence stays in Client admin; both are still rendered where they are the point.
//
// ⚠️ SELECTING A CLIENT CARRIES ITS NAME. `setSelected(id, name)` puts the identity in the
// provider, which is what keeps "House" in the composer after the console unmounts.

type ClientRow = {
  id: string
  /** ⚑ MVP1 — the durable identity the draft rows are reconciled against. Never displayed. */
  user_id?: string | null
  company_name: string | null
  industry: string | null
  country: string | null
  is_demo: boolean | null
  house_or_demo: boolean
  vat_number?: string | null
}
/**
 * ⚑ MVP1 (Preview 07) — somebody who has signed up and whose Brief Milla is still collecting.
 *
 * 🛑 THIS IS NOT A CLIENT AND MUST NEVER BE TREATED AS ONE. It has no `clients` row, no
 * programme, no entitlement and no money. It is projected into the rail so the operator can
 * see a person exists at all — which, before this, they could not: a signup was invisible
 * until the instant they confirmed.
 *
 * ⚠️ IT IS A SEPARATE TYPE ON PURPOSE. Widening `ClientRow` with optional fields would let a
 * draft flow into every place that takes a client — the worklist, the lifecycle board, the
 * cockpit — and each would have to remember it might not be real. A distinct type makes the
 * compiler ask that question instead of a reviewer.
 */
type DraftRow = {
  id: string
  user_id: string
  company_name: string | null
  contact_name: string | null
  country: string | null
  created_at: string
  brief: { collected: number; total: number; missing: string[]; complete: boolean }
  confirmed_at: string | null
}
type ColdState = { warn: boolean; cold: boolean; exempt?: boolean; why?: string }
type NextAction = { step: number; label: string; actor: 'you' | 'them' | 'engine' }
type RatioReading = { ratio: number | null; confident: boolean; label: string }
type WorkRow = ClientRow & { cold: ColdState; next: NextAction }

/**
 * ⚑ 9 Sep — WHERE EACH CLIENT IS, FROM THE SERVER'S OWN LIFECYCLE DERIVATION.
 *
 * 🛑 THE ROW AND THE CLIENT'S OWN SCREEN MUST AGREE. Both render `deriveLifecycle`'s verdict —
 * the row does not compute a stage from a status and the panel does not compute one either.
 * Two derivations would disagree eventually, and the one nobody would notice is this one.
 */
type LifecycleRow = { client_id: string; stage_label: string; needs_you: boolean }

function initials(name: string | null): string {
  const n = (name ?? '').trim()
  if (!n) return 'CL'
  const parts = n.split(/\s+/).filter(Boolean)
  return ((parts[0]?.[0] ?? 'C') + (parts[1]?.[0] ?? parts[0]?.[1] ?? 'L')).toUpperCase()
}

export function VidaClients({ open }: { open: boolean }) {
  const { selected, selectedName, setSelected, selectedDraft, setSelectedDraft } = useVidaConversation()
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
  // ⚑ MVP1 — open onboarding drafts, merged into the rail beside confirmed clients.
  const [drafts, setDrafts] = useState<DraftRow[] | null>(null)
  const [lifecycle, setLifecycle] = useState<Record<string, LifecycleRow>>({})
  // ⚑ 9 Sep — THE FILTER IS THE RAIL'S, NOT THIS COMPONENT'S. `Needs you` in the Clients rail
  // is a link to this same screen carrying `?needs=1`, so the URL is the single place the
  // filter lives — bookmarkable, shareable, and impossible to disagree with the nav row that
  // set it. The local "Needs you / All" chips this list used to own are gone: two controls for
  // one filter is two states to keep in step, and the one that drifts is the one nobody looks at.
  const needsFilter = useSearchParams().get('needs') === '1'

  // ── ⚑ MVP1 (C20) — THE RAIL REFRESHES ─────────────────────────────────────────────────
  //
  // 🛑 EVERY READ HERE USED TO RUN ONCE, ON MOUNT, AND NEVER AGAIN. A client who signed up
  // while an operator had Vida open did not exist on this screen until somebody reloaded the
  // page. Preview 07 is literally that moment — "signed up 14 minutes ago" — on a rail that
  // could not have known.
  //
  // ⚠️ A FAILED REFRESH CHANGES NOTHING. `nextRailValue` is the whole reason this is not a
  // naive poll: assigning whatever the last response said would, on the first transient 500,
  // replace a working rail with an empty one under the operator's cursor. Stale is
  // survivable; flickering to empty is not, because it cannot be told from "they are gone".
  //
  // ⚠️ AND AN ERROR IS NAMED ONLY WHEN THERE IS NOTHING TO SHOW (`shouldSurfaceError`). A
  // banner on every blip trains an operator to ignore banners.
  //
  // ⚠️ NO NEW INFRASTRUCTURE. An interval and a visibility listener; no realtime, no socket,
  // no subscription, no library.
  const loadRail = useCallback(async (alive: () => boolean) => {
    // ⚑ MVP1 — THE DRAFTS READ NEEDS TO KNOW HOW THE CLIENTS READ WENT, IN THIS SAME ROUND.
    // A person promoted between rounds leaves the drafts answer and joins the clients answer;
    // if only the first of those lands, they are on neither and vanish from the rail. See
    // `reconcileDrafts`.
    //
    // ⚠️ IT IS A PROMISE, NOT A MUTABLE FLAG, AND THAT IS THE WHOLE CORRECTNESS. Both fetches
    // still start together, but a `let clientsOk = false` set inside one `.then` is read by
    // the other whenever it happens to finish first — so a perfectly good clients read would
    // be recorded as a failure purely because the drafts response came back sooner. The
    // drafts branch awaits this instead, which is deterministic and costs no concurrency.
    const clientsRead: Promise<boolean> =
      fetch('/api/proxy/operator/clients').then(r => r.json())
        .then(j => {
          if (!alive()) return false
          if (!j?.success) throw new Error(j?.error || 'the API returned no data')
          setClients(prev => nextRailValue(prev, { ok: true, value: (j.data ?? []) as ClientRow[] }))
          setClientsError(null)
          return true
        })
        .catch(e => {
          if (!alive()) return false
          setClients(prev => {
            if (shouldSurfaceError(prev)) setClientsError(e instanceof Error ? e.message : 'Failed to load clients')
            return nextRailValue(prev, { ok: false })
          })
          return false
        })

    await Promise.all([
      clientsRead,
      fetch('/api/proxy/operator/worklist').then(r => r.json())
        .then(j => {
          if (!alive()) return
          if (!j?.success) throw new Error(j?.error || 'the API returned no data')
          setWork(prev => nextRailValue(prev, { ok: true, value: (j.data ?? []) as WorkRow[] }))
          setBookRatio(j.meta?.ratio ?? null)
          setWorkError(null)
        })
        .catch(e => {
          if (!alive()) return
          setWork(prev => {
            if (shouldSurfaceError(prev)) setWorkError(e instanceof Error ? e.message : 'Failed to load the worklist')
            return nextRailValue(prev, { ok: false })
          })
        }),
      fetch('/api/proxy/operator/lifecycle-board').then(r => r.json())
        .then(j => {
          if (!alive() || !j?.success) return
          const m: Record<string, LifecycleRow> = {}
          for (const r of (j.data ?? []) as LifecycleRow[]) m[r.client_id] = r
          setLifecycle(m)
        })
        // ⚠️ A FAILED READ LEAVES THE ROWS WITHOUT A STAGE WORD, never with a guessed one.
        .catch(() => { /* rows fall back to industry · country, which is a fact we do have */ }),
      // ⚑ MVP1 — the fifth read, under the SAME policy as the rest: a good read replaces, a
      // failed one changes nothing. A draft that flickers off the rail on a transient blip
      // reads to an operator as "that person gave up", which is a worse lie than a stale row.
      fetch('/api/proxy/operator/brief-drafts').then(r => r.json())
        .then(async j => {
          if (!alive()) return
          if (!j?.success) throw new Error(j?.error || 'the API returned no data')
          const clientsOk = await clientsRead
          if (!alive()) return
          setDrafts(prev => reconcileDrafts(prev, { ok: true, value: (j.data ?? []) as DraftRow[] }, clientsOk))
        })
        .catch(async () => {
          if (!alive()) return
          const clientsOk = await clientsRead
          if (!alive()) return
          setDrafts(prev => reconcileDrafts(prev, { ok: false }, clientsOk))
        }),
      fetch('/api/proxy/operator/alerts').then(r => r.json())
        .then(j => { if (alive() && j?.success) setProofReview(new Set((j.data ?? [])
          .filter((a: { kind: string }) => a.kind === 'proof_review')
          .map((a: { client_id: string }) => a.client_id))) })
        .catch(() => { /* the filter simply keeps its default; the list is not blanked */ }),
    ])
  }, [])

  useEffect(() => {
    let alive = true
    const isAlive = () => alive
    void loadRail(isAlive)

    // ⚠️ HIDDEN TABS READ NOTHING. A console parked in a background tab would otherwise put
    // 1,440 rounds of four endpoints a day through the proxy for a screen nobody is reading.
    const tick = () => { if (shouldPollNow(document.hidden)) void loadRail(isAlive) }
    const timer = setInterval(tick, RAIL_REFRESH_MS)

    // ⚠️ AND COMING BACK TO THE TAB IS THE MOMENT THE ANSWER MATTERS. An operator returning
    // after a call should not wait up to a minute to see the client they were just told about.
    const onVisible = () => { if (!document.hidden) void loadRail(isAlive) }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      alive = false
      clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [loadRail])

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
  const ordered: ClientRow[] = work ? work.map(w => (clients ?? []).find(c => c.id === w.id) ?? w) : (clients ?? [])
  // ⚑ 9 Sep — NEEDS YOU IS THE SERVER'S ANSWER, not `next.actor === 'you'`.
  //
  // ⛓️ THE OLD RULE WAS THE WORKLIST'S "whose turn is it", which is a different question and a
  // much looser one: it put a client in the list for any step whose actor happened to be us,
  // including states with nothing to press. The lifecycle rule is deliberately hard to earn —
  // a real retry, Make Live, a usable Run, a reply waiting on a person, a stopped sender, or a
  // blocker only a human can clear. Everything else is Vida working, and silence is correct.
  const needsYou = (id: string) => lifecycle[id]?.needs_you === true
  // ⚠️ THE SELECTED CLIENT IS NEVER FILTERED OUT of the list they are looking at.
  const visible = needsFilter
    ? ordered.filter(c => needsYou(c.id) || proofReview.has(c.id) || c.id === selected)
    : ordered
  // ⚑ MVP1 — ONE PERSON, ONE ROW. A draft whose person is now a confirmed client is dropped,
  // whichever of the two reads is the stale one. Deduplicated on `user_id` — durable identity,
  // never a display name (see `visibleDrafts`).
  const shownDrafts = visibleDrafts(drafts, clients)

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
      {/* ⛓️ 9 Sep — THE LOCAL "Needs you / All" CHIPS ARE GONE. The Clients rail above owns
          that filter now, as a URL, so there is exactly one control for it and one place its
          state lives. Two toggles for one filter is two things to keep in step. */}
      {v.state === 'ready' && needsFilter && (
        <p className="text-[11px] font-bold text-[#7C3AED] px-2.5 pb-1.5">Showing clients that need you</p>
      )}
      {visible.length === 0 && (clients?.length ?? 0) > 0 && (
        <p className="text-[11.5px] text-[#9b8ec4] px-2.5 py-3 text-center">Nothing needs you right now. 🎉</p>
      )}
      {visible.map(c => {
        const active = c.id === selected
        // ── ⚑ 9 Sep — THE APPROVED ROW: NAME, STAGE, AND "needs you" WHEN IT IS TRUE ────
        //
        // ⛓️ WHAT CAME OFF IT. The row carried a next-action sentence, a Suspended/Going-quiet
        // cold badge, a VAT-evidence badge and industry · country — four judgements competing
        // with the client's own name at 216px, and none of them the question the list is for.
        // The founder's rule: *"NO giant metrics in list rows."*
        //
        // ⚠️ NOTHING WAS DELETED FROM THE PRODUCT — only from this row. Cold state and VAT
        // evidence are the worklist's and Client admin's, and both are still rendered there.
        const lcRow = lifecycle[c.id]
        const you = needsYou(c.id)
        const dot = you ? 'bg-[#EC4899]' : workById[c.id]?.next.actor === 'engine' ? 'bg-emerald-400' : 'bg-[#cfc4e8]'
        return (
          <button key={c.id} onClick={() => setSelected(c.id, c.company_name)}
            title={c.company_name ?? undefined}
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
              <span className="text-[11.5px] block truncate text-[#9b8ec4]">
                {lcRow?.stage_label ?? ([c.industry, c.country].filter(Boolean).join(' · ') || '—')}
                {you && <span className="text-[#EC4899] font-bold"> · needs you</span>}
              </span>
            </span>
          </button>
        )
      })}
      {/* ── ⚑ MVP1 (Preview 07) — SIGNED UP, BRIEF IN PROGRESS ─────────────────────────
          🛑 BEFORE THIS, A SIGNUP WAS INVISIBLE. No `clients` row exists until the client
          confirms, so an operator could not see that a person had signed up at all — Preview
          07's "signed up 14 minutes ago and Milla is collecting their brief" had nothing
          behind it.

          ⚠️ RENDERED BELOW THE CLIENTS, AND NEVER AS ONE. Opening a draft goes through
          `setSelectedDraft`, which is a DIFFERENT piece of state from `selected` and clears
          it — a draft id can never be handed to a `/operator/*` route as a client id, because
          it never reaches the variable those routes read. The row carries no stage word from
          the lifecycle board and no "needs you": Milla is collecting, and there is nothing
          here for the operator to press.

          ⚠️ THE COUNT IS THE SHARED ONE. `brief.collected` / `brief.total` come from
          `briefFacts()` on the server. There is no eleven-fact list in this file, and the
          card deliberately does not say "complete" — eleven facts collected still leaves the
          client's own confirmation outstanding, which is a separate gate.

          ⚠️ AND NEVER BOTH AT ONCE. The API returns only UNPROMOTED drafts, so the moment a
          person confirms they leave this list and appear above as a client. */}
      {shownDrafts.length > 0 && !needsFilter && (
        <div className="mt-1.5 pt-1.5 border-t border-[#f0eafc]">
          <p className="text-[10px] font-bold uppercase tracking-wide text-[#b3a9cc] px-2.5 pb-1">
            Signing up
          </p>
          {shownDrafts.map(d => {
            const openDraft = d.id === selectedDraft
            return (
              <button key={d.id} onClick={() => setSelectedDraft(d.id)}
                title={d.company_name ?? 'Signed up — Milla is collecting their brief'}
                className={`w-full text-left flex items-start gap-2 px-2 py-1.5 rounded-lg mb-0.5 transition-colors border ${
                  openDraft ? 'bg-[#f3ecff] border-[#e4d4fb]' : 'hover:bg-[#faf8ff] border-transparent'}`}>
                <span className="w-2 h-2 rounded-full shrink-0 mt-[6px] bg-[#e4dcf7]" />
                <span className="w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold shrink-0 bg-[#f6f2ff] text-[#b3a9cc]">
                  {initials(d.company_name)}
                </span>
                <span className="min-w-0 flex-1">
                  <b className="text-[13px] truncate block text-[#5c5279]">
                    {d.company_name || 'Signed up'}
                  </b>
                  <span className="text-[11.5px] block truncate text-[#9b8ec4]">
                    Brief · {d.brief.collected} of {d.brief.total} collected
                  </span>
                </span>
              </button>
            )
          })}
        </div>
      )}
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
