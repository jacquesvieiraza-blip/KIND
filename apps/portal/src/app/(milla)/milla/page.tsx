'use client'

import { Fragment, useCallback, useEffect, useRef, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { createClient } from '@/lib/supabase/client'
import ProductTour from '@/components/ProductTour'
import { shortfallMessage, deskCoverage, PACK_PRICE_USD, PACK_LEADS } from '@kind/shared'

// #497/#503/#506/#495 — MILLA HOME (docs/mv-previews/milla2.html): KPI cards row + Milla
// chat as the SPINE (centre, full height, real-data opener) + masked lead cards (right).
// Every number is live: summary → KPIs/opener, /for-approval → cards. Approve charges a
// flat $4 per approved lead from the one wallet. The wallet ledger moved to Billing (M4)
// and the ICP card to its own rail page (/milla/icp) — this screen is leads + Milla only.

type MaskedLead = { id: string; role: string; company: string; industry: string | null; country: string | null; score: number | null; why_fits: string | null; recommended?: boolean
  /** ⚑ 25 Aug — WHICH PROOF BATCH this card came from. One shared timestamp per proof run,
   *  written once and never rewritten, so it separates pass 1 from pass 2 exactly. */
  surfaced_for_approval_at?: string | null }
type Revealed = { email: string; charged: boolean }
type IcpVersion = { version: string; current: boolean; name: string; summary: string; created_at: string | null }
type Pack = { active: boolean; included: number; used: number; left: number; nextLeadCostUsd: number }
type Summary = {
  wallet_balance_usd: number; has_funded: boolean; leads_awaiting: number; meetings_booked: number
  active_campaign: string | null; icp_versions: IcpVersion[]
  /** The newest campaign's real state, whatever it is — drives the live/paused badge. */
  campaign_name?: string | null
  campaign_status?: 'draft' | 'active' | 'paused' | 'paused_low_performance' | 'completed' | 'archived' | null
  /** Every lead they have ever approved — releases the minimum-20 gate at 20. */
  leads_approved_total?: number
  pack?: Pack
  /** ⚑ 24 Aug — how many free-proof batches this prospect has been shown, from
   *  `clients.proof_passes_done` (the same column try_claim_proof_pass increments).
   *  Lets the desk tell 0 / 1 / 2 apart WITHOUT making the client press something
   *  just to discover a 409. */
  proof_passes_done?: number
  /** ⚑ 26 Aug — the terminal truth of the newest COMPLETED run. `null` = none has ever
   *  finished, which is NOT the same as "still running". See `terminalRun` below. */
  proof_run?: { status: string; message: string; total_inserted: number; finished_at: string | null } | null
}
/** The targeting fields a refinement may touch — exactly the ICP's own, nothing more. */
type IcpTargeting = {
  name?: string
  job_titles?: string[]; seniority_levels?: string[]; industries?: string[]
  company_sizes?: string[]; geographies?: string[]; tech_stack?: string[]; keywords?: string[]
  /**
   * ⚑ 25 Aug — CARRIED, NEVER DECIDED HERE. `/icps/revise` validates the WHOLE ICP and
   * `icpSchema` gives this field `.default(true)`, so a payload that simply omits it does
   * not "leave it alone" — it silently rewrites a client's provider-consent setting to
   * true. A refinement about job titles must not change which provider may source them.
   * It is copied from the existing row and sent back unchanged; it is never editable,
   * clearable, shown, defaulted by this flow, or inferred from anything.
   */
  apollo_only_consented?: boolean
}
/**
 * ⚑ 25 Aug — THE FIVE TARGETING DIMENSIONS A REFINEMENT SPEAKS ABOUT (founder-ruled).
 *
 * ⚠️ ALL FIVE ARE ALWAYS SHOWN, INCLUDING THE UNCHANGED ONES. The reflect-back used to
 * render only what the model returned, so a client refining job titles saw title chips and
 * nothing else — while the payload silently carried their existing industries, sizes and
 * countries. What they read was not what would run. Rendering the whole five, preserved
 * values included, is what makes the panel true.
 *
 * The labels are the client's words, not the column names, and the same list drives BOTH
 * the display and the merge — they cannot describe different fields.
 */
const REFINE_FIELDS = [
  ['seniority_levels', 'Seniority'],
  ['job_titles',       'Job titles'],
  ['industries',       'Industry'],
  ['company_sizes',    'Company size'],
  ['geographies',      'Geography'],
] as const
type RefineField = (typeof REFINE_FIELDS)[number][0]
type Msg = { id: string; role: 'user' | 'assistant'; content: string }

async function token(): Promise<string | undefined> {
  try { const { data } = await createClient().auth.getSession(); return data.session?.access_token } catch { return undefined }
}
// Milla answers; she does not act. "Pause campaign" and "Find more like these" used to read
// as buttons that did those things — they don't, and the message went into a table nobody
// read. It now pages the operator and appears in Vida → Asks, so these are honest REQUESTS
// rather than controls: phrased as asking us, because that is what actually happens.
const CHIPS = [
  'Which of these look strongest?',
  'Please find more like these',
  'Please pause my campaign',
  'How is my ROI looking?',
]

// ── FINDING — THE FIRST PROOF RUN IS IN FLIGHT (founder-ruled 24 Aug) ────────────────────
//
// `POST /icps/:id/proof` claims a pass and starts `runIcpJob` FIRE-AND-FORGET: the prospect
// gets an immediate 200 while the sourcing is still running. Milla's confirmation screen now
// sends them straight here — and this page fetched once on mount and never again, so they
// arrived to "No leads waiting right now" and the screen stayed that way until they happened
// to reload. Free proof was being delivered and then hidden.
//
// ⚠️ THE FLAG IS EXPLICIT, NOT INFERRED. "proofMode && zero leads" is ALSO the state of a
// prospect who never started a run, and telling them we are finding people would be a lie.
// Only a proof start that was actually accepted sets `?finding=1`.
//
// Read from the URL on demand rather than via `useSearchParams`, which opts the whole route
// out of pre-rendering and needs a Suspense boundary (see the note in /auth/reset). This is
// the same `new URLSearchParams(window.location.search)` the referral capture already uses,
// and it is called inside `load` — which is a `useCallback` with no deps and would otherwise
// close over a stale value.
function isFinding(): boolean {
  try { return new URLSearchParams(window.location.search).get('finding') === '1' } catch { return false }
}
/**
 * WHEN the run we are waiting on was started, as epoch ms, carried in the URL.
 *
 * ⚠️ IT LIVES IN THE URL SO IT SURVIVES A RELOAD. A ref or component state resets on
 * refresh, and then a run that had already finished looked older than "now" and the desk
 * went back to spinning — the exact reload defect this build exists to kill.
 *
 * ⚠️ MISSING OR UNPARSEABLE RETURNS 0, which makes ANY completed run count as terminal.
 * That is the safe direction: an old link resolves to a truthful end state rather than a
 * spinner that never stops. Erring the other way is what shipped.
 */
function findingSince(): number {
  try {
    const raw = new URLSearchParams(window.location.search).get('since')
    const n = raw ? Number(raw) : NaN
    return Number.isFinite(n) && n > 0 ? n : 0
  } catch { return 0 }
}
/** Every 3s, at most 20 times — ~60s, then we stop and say so. Bounded on purpose: an
 *  unbounded poll on a run that died is a tab quietly hammering the API forever. */
const FINDING_POLL_MS = 3000
const FINDING_MAX_CHECKS = 20

export default function MillaHomePage() {
  const router = useRouter()
  const [summary, setSummary] = useState<Summary | null>(null)
  // #511f — the client's own Nexus, surfaced (the flywheel: they see Milla getting sharper).
  const [nexus, setNexus] = useState<{ learned: string; top_persona: string | null; reply_rate: number; meeting_rate: number; confidence: string; sample_worked: number } | null>(null)
  const [leads, setLeads] = useState<MaskedLead[] | null>(null)
  const [acting, setActing] = useState<string | null>(null)
  const [revealed, setRevealed] = useState<Record<string, Revealed>>({})
  const [topUp, setTopUp] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // ── ⚑ 24 Aug — BATCH REFINEMENT (founder-ruled): pass 1 → "these aren't right" → pass 2.
  // Per-lead "Not a fit" is unchanged and still recorded; this is the BATCH verdict, which
  // is a different statement and was the missing half of 20 → refine → 20 → human.
  const [refineOpen, setRefineOpen]   = useState(false)
  const [refineText, setRefineText]   = useState('')
  /** ⚑ 25 Aug — THE ONE FINAL OBJECT. Built once, rendered, then sent unchanged. See below. */
  const [refineFinal, setRefineFinal] = useState<IcpTargeting | null>(null)
  /** The ICP the preview was built against — proved unchanged before anything is spent. */
  const [refineIcpId, setRefineIcpId] = useState<string | null>(null)
  const [refineSaid, setRefineSaid]   = useState<string | null>(null)
  const [refineBusy, setRefineBusy]   = useState(false)
  const [refineErr, setRefineErr]     = useState<string | null>(null)
  /**
   * ⚑ 25 Aug — THE PROOF ATTEMPT IS ONE-WAY, AND A REF IS WHY IT ACTUALLY IS.
   *
   * The failure path used to clear `refineBusy` while `refineFinal` was still set, so after
   * a failed `/proof` the confirm button became clickable again. That breaks the one-attempt
   * rule in the worst possible way: an HTTP timeout or a dropped connection can happen AFTER
   * the server has already claimed the pass, so "it failed, try again" is exactly when a
   * second POST would burn the client's last one. There is no release RPC.
   *
   * The REF is the lock, not the state. `setState` is async and a synchronous re-entry in
   * the same tick would not see it; a ref flips immediately and is read at the top of the
   * handler. The state exists only so the panel can re-render into its handed-off form.
   * Neither ever returns to false while this page stays mounted.
   */
  const proofAttemptedRef = useRef(false)
  const [proofAttempted, setProofAttempted] = useState(false)

  // Set once, from the URL, after mount — an effect never runs during a pre-render.
  const [finding, setFinding] = useState(false)
  const [findingTimedOut, setFindingTimedOut] = useState(false)

  const [sessionId, setSessionId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const chatBodyRef = useRef<HTMLDivElement>(null)

  const load = useCallback(async () => {
    try {
      const tok = await token()
      // #570 — allSettled, not all. With `Promise.all`, ONE failing endpoint rejected the
      // pair and the client's entire dashboard went blank — including the half that had
      // loaded fine. The billing page already used allSettled; the desk did not.
      const [sr, lr] = await Promise.allSettled([
        api.get<{ data: Summary }>('/leads/milla-summary', tok),
        api.get<{ data: MaskedLead[] }>('/leads/for-approval', tok),
      ])
      if (sr.status === 'rejected' && lr.status === 'rejected') {
        throw sr.reason instanceof Error ? sr.reason : new Error('Failed to load your dashboard')
      }
      if (sr.status === 'rejected') setError('Some of your figures could not be loaded just now — the leads below are still correct.')
      if (lr.status === 'rejected') setError('Your leads could not be loaded just now — this is not the same as having none. Refresh in a moment.')
      const s = sr.status === 'fulfilled' ? sr.value : null
      const l = lr.status === 'fulfilled' ? lr.value : null
      if (!s) { setLeads(l?.data ?? []); return }
      if (l) setLeads(l.data)
      setSummary(s.data)
      const n = s.data.leads_awaiting
      const camp = s.data.active_campaign ? ` for your **${s.data.active_campaign}** campaign` : ''
      // The greeting quoted "a flat $4 per lead, final" to every client, including one
      // holding 100 free approvals. It was written before the pack existed.
      const left = s.data.pack?.active ? (s.data.pack.left ?? 0) : 0
      const priceLine = left > 0
        ? `**${left} of your ${s.data.pack!.included} included leads** are still yours — approving costs nothing until they run out`
        : '**nothing is charged until you approve — then a flat $4 per lead, final**'
      // Functional update, and the greeting is keyed 'greet': the thread-history effect
      // below races this one, and whichever lands second must not wipe the other.
      setMessages(m => [{ id: 'greet', role: 'assistant', content: n > 0
        ? (s.data.icp_versions.length > 0 && !s.data.has_funded
            // A prospect is looking at free PROOF, so the opener must not ask them to
            // approve anything — there is nothing commercial for them to approve yet.
            ? `Hi 👋 I'm Milla. Here are **${n} real ${n === 1 ? 'person' : 'people'}** who match your targeting — masked, free, and nobody has been contacted. Tell me what looks right and I'll get you live.`
            : `Hi 👋 I'm Milla, your campaign partner. FIGSY qualified **${n} new lead${n === 1 ? '' : 's'}**${camp} — they're in the panel on the right. Approve the ones worth pursuing; ${priceLine}. Want me to talk you through them?`)
        // ⚠️ NOT "no new leads waiting" WHEN A PROOF RUN IS IN FLIGHT. That sentence is
        // false at the one moment it matters most — the prospect has just confirmed their
        // targeting and we are finding their people right now. No completion time is
        // promised, and no notification is promised, because nothing sends one.
        : isFinding()
          ? `Hi 👋 I'm Milla. I'm finding real people who match your targeting right now — they'll appear on the right as soon as I have them.`
          : `Hi 👋 I'm Milla, your campaign partner. No new leads waiting this moment${camp ? ` — the ${s.data.active_campaign} engine is still sourcing` : ''}. Ask me anything, or tell me who to target next.` },
        ...m.filter(x => x.id !== 'greet')])
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed to load your dashboard') }
  }, [])

  useEffect(() => { load() }, [load])

  useEffect(() => { setFinding(isFinding()) }, [])

  // M2 — the thread persists, so anything WE asked them (Vida's "Ask them for these" writes
  // straight into this thread) is waiting here when they next open Milla, and their answer
  // lands in the same thread where we read it. Without this the chat started blank every
  // visit and an ask could never be seen, let alone answered.
  useEffect(() => {
    (async () => {
      try {
        const tok = await token()
        const list = await api.get<{ data: { id: string }[] }>('/milla/sessions', tok)
        const sid = list.data?.[0]?.id
        if (!sid) return
        setSessionId(sid)
        const hist = await api.get<{ data: { id: string; role: 'user' | 'assistant'; content: string }[] }>(
          `/milla/sessions/${sid}/messages`, tok)
        const rows = (hist.data ?? []).slice(-20)
        if (rows.length > 0) {
          setMessages(m => [...m, ...rows.map(r => ({ id: r.id, role: r.role, content: r.content }))])
        }
      } catch { /* no thread yet — the greeting stands on its own */ }
    })()
  }, [])
  // #511f — best-effort Nexus summary (never blocks the dashboard).
  useEffect(() => {
    (async () => {
      try {
        const r = await api.get<{ data: typeof nexus }>('/leads/nexus-summary', await token())
        setNexus(r.data)
      } catch { /* silent — the card just doesn't render */ }
    })()
  }, [])
  // #513 wiring — a client with no ICP yet hasn't onboarded: send them to Milla's
  // conversational setup. Once they approve an ICP (v1 exists) they stay on the dashboard.
  useEffect(() => {
    if (summary && summary.icp_versions.length === 0) router.replace('/milla/welcome')
  }, [summary, router])
  // $99 AT GO-LIVE (founder-locked) — a client who hasn't paid can still onboard, build
  // their plan and browse their masked leads FREE. They're NOT walled out. The $99 is the
  // GO-LIVE step: nothing sources or sends until it's paid (money rails enforce $0 = no
  // work), and a "Go live — load $99" banner sits on the dashboard until they do.
  const needsGoLive = !!summary && summary.icp_versions.length > 0 && !summary.has_funded
  // ── FREE PROOF: THE SAME DESK, WITHOUT THE COMMERCIAL CONTROLS (22 Aug round 4) ──
  //
  // A prospect who has never paid is looking at PROOF leads — real people, masked, sourced
  // free to show the targeting works. The card must not offer "Approve qualified lead · $4":
  // that control reveals an email, takes a pack slot and charges, and none of those may
  // happen before payment. Their two answers are LOOKS RIGHT and NOT A FIT.
  //
  // `has_funded` is the same fact the go-live banner already reads — no new state, no new
  // endpoint, and a client who pays flips to the commercial desk by paying.
  const proofMode = needsGoLive

  // ── ⚑ 24 Aug — WHERE THIS PROSPECT IS IN THE TWO-PASS PROOF JOURNEY ──────────────────
  //
  // ⚠️ BOTH CONDITIONS, ALWAYS. `proofMode` is the authoritative unpaid/proof signal the
  // desk already had (`has_funded` is the purchase count — real money, not a guess); the
  // pass count alone is NOT a proof signal, because a client who later PAID still carries
  // `proof_passes_done = 1` forever. Gating on the count alone would show a paying client a
  // "these aren't right, find me another free set" control. Hence `proofMode &&`.
  //
  // ⛓️ CORRECTED 25 Aug — this said an unknown count "offers the refinement rather than
  // hiding it". It is the OPPOSITE: `canRefine` requires `=== 1`, so a missing count reads
  // as 0 and the control is HIDDEN. That is still the safe direction — an unknown state
  // offers nothing rather than offering a spend — and the server's `try_claim_proof_pass`
  // 409 remains the hard fence behind it either way. The behaviour was right; the sentence
  // describing it was wrong, and the sentence is what changed.
  // Nothing here is a gate; it decides what the client is OFFERED.
  const proofPassesDone = summary?.proof_passes_done ?? 0

  // ── ⚑ 26 Aug — A FINISHED RUN MUST LOOK FINISHED ────────────────────────────────
  //
  // THE DEFECT THIS REPLACES. `finding` came from a URL flag and was cleared by exactly
  // one thing: leads arriving. So a run that genuinely ended with ZERO never cleared it —
  // no leads, nothing to clear it, and after ~60s the copy only softened to "we're still
  // finding your matches", which was untrue. The run had ended. A reload re-read the flag
  // and started the whole loop again.
  //
  // THE FIX. `runIcpJob` already writes one `icp_run_outcomes` row when it finishes, with
  // canonical client copy. The desk now reads it. A run counts as OURS — and therefore
  // ends this wait — only when it finished AFTER the moment we started waiting, so an
  // outcome left by pass 1 can never terminate pass 2.
  //
  // ⚠️ NO NEW COPY IS INVENTED HERE. `message` is the server's own canonical sentence
  // (`runOutcomeMessage`), the same text the paying-client dashboard already renders.
  const terminalRun = useMemo(() => {
    const r = summary?.proof_run
    if (!r || !r.finished_at) return null
    const finishedAt = Date.parse(r.finished_at)
    if (!Number.isFinite(finishedAt)) return null
    // `findingSince()` is 0 for an old link with no stamp — then any completed run counts,
    // which resolves to a truthful end state rather than an endless spinner.
    return finishedAt >= findingSince() ? r : null
  }, [summary?.proof_run])

  // Zero is a RESULT, not an absence. It ends the wait and never triggers another search:
  // nothing here starts sourcing, and the one proof POST lives on the confirmation screen.
  const proofEndedEmpty = !!terminalRun && terminalRun.total_inserted === 0
  // A crashed run is its own terminal state. The prospect is NEVER shown the word
  // "failed" — that is the internal status name; they get the approved recovery copy.
  const proofFailed = terminalRun?.status === 'failed'
  const canRefine       = proofMode && proofPassesDone === 1
  const proofExhausted  = proofMode && proofPassesDone >= 2

  // STEP 1 — opening the panel. Deliberately does NOTHING else: no call, no mutation, no
  // spend. Pressing "these aren't right" must never cost a pass.
  function openRefine() {
    setRefineOpen(true); setRefineErr(null); setRefineFinal(null); setRefineIcpId(null); setRefineSaid(null)
  }

  // ── STEP 2 — THEIR WORDS BECOME THE FINAL TARGETING, HERE AND ONLY HERE ────────────────
  //
  // ⚠️ THE MERGE MOVED INTO THIS STEP, AND THAT IS THE WHOLE CORRECTION (founder-ruled
  // 25 Aug). It used to live in `confirmRefine`: the panel rendered the model's raw draft
  // while the payload was built later from draft + preserved existing values. Those are two
  // different objects, so a client refining job titles saw title chips, pressed confirm, and
  // saved industries and countries nobody had shown them. The preview was not a preview.
  //
  // Now ONE object is built before the confirmation exists, it is what the panel renders,
  // and `confirmRefine` sends it byte-for-byte. There is no second merge anywhere.
  //
  // ⚠️ STILL COSTS NOTHING. `/icps/chat-build` only proposes — no write, no provider, no
  // spend — and `/icps` is a read. Both are free and repeatable; the spend starts at step 3.
  //
  // THE THREE-WAY RULE, exactly as ruled:
  //   • listed in `clear_fields`  → []          (an explicit "any industry" / "anywhere")
  //   • returned non-empty        → the new value
  //   • omitted, or [] with no clear_fields → the value already saved, PRESERVED
  //
  // `name`, `tech_stack` and `keywords` are carried through unchanged. They are not editable
  // in this launch refinement and are never shown as changed — but `/icps/revise` validates
  // the whole ICP, so they must travel with it, holding exactly today's values.
  async function submitRefine(text: string) {
    const msg = text.trim(); if (!msg || refineBusy) return
    setRefineBusy(true); setRefineErr(null)
    try {
      const tk = await token()
      const r = await api.post<{ data: IcpTargeting & { message?: string; clear_fields?: string[] } }>(
        '/icps/chat-build', { message: msg, history: [] }, tk)
      const d = r.data ?? {}
      // The server already allowlisted these to the five clearable filters and fails closed;
      // filtering again here is belt-and-braces against a stale or hand-built response.
      const cleared = new Set<RefineField>(
        (Array.isArray(d.clear_fields) ? d.clear_fields : [])
          .filter((f): f is RefineField => REFINE_FIELDS.some(([k]) => k === f)),
      )
      // A refinement that neither names anyone new nor removes a filter has told us nothing
      // yet — so we ask again rather than offering to spend a pass on an unchanged ICP.
      const touched = REFINE_FIELDS.some(([k]) =>
        (Array.isArray(d[k]) && (d[k] as string[]).length > 0) || cleared.has(k))
      if (!touched) {
        setRefineSaid(d.message || 'Tell me a bit more — who should we be looking for instead?')
        setRefineFinal(null); setRefineIcpId(null)
        return
      }

      const before = await api.get<{ data: Array<IcpTargeting & { id: string }> }>('/icps', tk)
      const core = before.data?.[0]
      if (!core?.id) throw new Error('no icp')

      // ⚠️ NOT `?? true`. A fallback here would be this flow DECIDING provider consent for
      // a client who never mentioned it — the exact defaulting the field must be protected
      // from. The column is NOT NULL on the ICP, so a non-boolean means the read is wrong,
      // and we stop rather than send a guess.
      if (typeof core.apollo_only_consented !== 'boolean') throw new Error('icp-shape')

      const final: IcpTargeting = {
        name:       core.name || 'My targeting',
        tech_stack: core.tech_stack ?? [],
        keywords:   core.keywords ?? [],
        apollo_only_consented: core.apollo_only_consented,
      }
      for (const [k] of REFINE_FIELDS) {
        const next = d[k]
        final[k] = cleared.has(k) ? []
          : (Array.isArray(next) && next.length > 0 ? next : (core[k] ?? []))
      }
      setRefineFinal(final); setRefineIcpId(core.id); setRefineSaid(d.message ?? null)
    } catch (e) {
      setRefineErr(e instanceof Error ? e.message : 'I could not read that just yet — say it again?')
    } finally { setRefineBusy(false) }
  }

  // STEP 3 — THE SPEND BOUNDARY. Everything above is free and reversible; this is the first
  // line that mutates anything or costs a pass, and it only runs on an explicit confirm.
  //
  // Order is load-bearing: REVISE FIRST, and only claim the pass if it succeeded. Claiming
  // first would burn a pass the client can never get back on targeting that was never saved.
  //
  // ⚠️ NO MERGE HERE. `refineFinal` is sent exactly as the panel rendered it. The only thing
  // added to the payload is `proof_refinement`, which is a DECLARATION and not a permission:
  // the server proves the exception for itself from the funding ledger,
  // `proof_passes_done` and the ICP's own `pending_targeting`, and ignores this field
  // entirely for anyone else.
  async function confirmRefine() {
    // The REF, not the state — see its declaration. This is the line that makes the attempt
    // one-way, and it must be read before anything else can start a second one.
    if (!refineFinal || refineBusy || proofAttemptedRef.current) return
    setRefineBusy(true); setRefineErr(null)
    try {
      const tk = await token()
      // The SAME ICP, read before and compared after. `/icps` is newest-first and
      // `saveClientTargeting` updates the client's core row in place — this proves it did.
      // It is also compared to the id the PREVIEW was built against, so a panel left open
      // while the targeting moved underneath cannot spend the pass on a stale reflection.
      const before = await api.get<{ data: Array<IcpTargeting & { id: string }> }>('/icps', tk)
      const core = before.data?.[0]
      if (!core?.id || core.id !== refineIcpId) throw new Error('same-icp')

      const revised = await api.post<{ data?: { id?: string }; pending_review?: boolean }>(
        '/icps/revise', { ...refineFinal, proof_refinement: true }, tk)
      const afterId = revised?.data?.id
      // SAME ICP, enforced at RUNTIME and not only in a test. If a revise ever created a
      // second row, we stop here rather than spending the pass against the wrong targeting.
      if (!afterId || afterId !== core.id) throw new Error('same-icp')

      // ⚠️ THE SAME ROW COMING BACK IS NOT PROOF THE EDIT LANDED. `saveClientTargeting`
      // returns that identical row whether it wrote the live targeting columns or merely
      // parked the revision in `pending_targeting` — so the id check alone would have let a
      // pass be spent on the OLD targeting, which is the exact defect this whole build
      // exists to close. `pending_review === false` is the server saying it went live.
      //
      // FAILS CLOSED: `undefined !== false`, so an older API that does not send the field
      // stops here rather than guessing. The server already refuses the conflict outright;
      // this is a second, independent fence, and two independent fences is the point.
      if (revised?.pending_review !== false) throw new Error('not-live')

      // EXACTLY ONE claim. The ref flips BEFORE the request leaves, because the pass can be
      // claimed server-side and the response still never arrive — a timeout is not a
      // rollback. From here there is no retry of any kind, automatic or manual.
      proofAttemptedRef.current = true
      setProofAttempted(true)
      await api.post(`/icps/${afterId}/proof`, {}, tk)
      router.push(`/milla?finding=1&since=${Date.now()}`)
    } catch (e) {
      // ── STAGE-ACCURATE, BECAUSE THE OLD SENTENCE COULD BE A LIE ────────────────────────
      // One generic message said *"Your targeting is saved"* for every failure — including
      // the ones where the save is exactly what failed. What a client is told here decides
      // whether they wait for us or go and change something themselves, so it has to match
      // what actually happened.
      const code = e instanceof Error ? e.message : ''
      const status = (e as { status?: number } | null)?.status
      setRefineErr(
        // 4 · THE PROOF WAS ATTEMPTED. Never invite a retry and never claim the pass is
        // definitely gone — we do not know. Only the server does.
        proofAttemptedRef.current
          ? 'We saved your refinement, but we could not confirm the new search started. Please don\'t try again — K.I.N.D will check whether it began and come back to you.'
        // 2 · THE CONFLICT. Both the live targeting and the waiting revision are intact.
        : status === 409
          ? (code || 'You already have a targeting change waiting for K.I.N.D to review. Nothing has been changed and no new search has started.')
        // 1 · STALE PREVIEW. Nothing was written; the panel described a different ICP.
        : code === 'same-icp'
          ? 'Something is out of step with your targeting — K.I.N.D needs to look at this before we search again. Nothing has been changed and no new search has started.'
        // 3 · THE SAVE FAILED, OR LANDED FOR REVIEW INSTEAD OF GOING LIVE. Do NOT tell them
        // it saved. No pass was claimed either way.
          : 'We could not save that refinement, so your targeting is unchanged and no new search has started. K.I.N.D needs to look at this.',
      )
      // Only the pre-proof stages release the panel — they cost nothing, so the client may
      // cancel or keep their current targeting. Once the proof was attempted the ref stays
      // true and the confirm is gone for good.
      setRefineBusy(false)
    }
  }

  // Scroll the CHAT container only — never the page (that would hide the KPI row).
  useEffect(() => { const el = chatBodyRef.current; if (el) el.scrollTop = el.scrollHeight }, [messages])

  // THE MINIMUM-20 GATE (founder-locked 25 Jul). We can't run a real campaign off five
  // people, and a client's sender costs us ~$40/month from the day they sign — so the first
  // time round they choose at least 20. The server refuses below the minimum regardless of
  // what this UI does; these are the words that make the refusal make sense.
  async function approveSelected() {
    const ids = [...picked]
    if (ids.length === 0) return
    setActing('batch'); setTopUp(null); setError(null)
    try {
      const tok = await token()
      const res = await api.post<{ approved: number; attempted: number; message: string;
        results: Array<{ id: string; status: string; email?: string | null; charged?: boolean }> }>(
        '/leads/approve-batch', { lead_ids: ids }, tok)
      setRevealed(r => {
        const next = { ...r }
        for (const x of res.results) if (x.status === 'approved') next[x.id] = { email: x.email ?? '', charged: !!x.charged }
        return next
      })
      // Only the ones that actually went through leave the selection. Clearing everything
      // made a client re-find the leads they still needed to retry.
      const done = new Set(res.results.filter(x => x.status === 'approved').map(x => x.id))
      setPicked(p => new Set([...p].filter(id => !done.has(id))))
      if (res.approved < res.attempted) setError(res.message)
      // The pack counter is the number they watch most, and it was stale until a manual
      // refresh — approve 20 and the hero still read "100 included".
      void load()
    } catch (e) {
      const err = e as Error & { status?: number }
      // #570 — the figure is no longer invented in the browser. `ids.length * 4` ignored the
      // wallet balance AND the leads still inside the included pack, so it named a total we
      // could not stand behind on a payment screen. Use the server's numbers when it sends
      // them; otherwise state the rule rather than a made-up total.
      if (err.status === 402) setTopUp(shortfallMessage({
        count: ids.length,
        neededUsd: (err as { needed_usd?: number }).needed_usd,
        balanceUsd: (err as { balance_usd?: number }).balance_usd,
      }))
      else if (err.message === 'batch_minimum') setError(`Choose ${gate.required} to start — we need enough people to run a real campaign.`)
      else setError(err.message || 'Could not approve — please try again')
    } finally { setActing(null) }
  }

  // ── ⚑ 25 Aug — 👍 LOOKS RIGHT NOW ASKS THE SERVER FIRST (founder-ruled) ──────────────
  //
  // It used to be `router.push('/milla/billing…')` and nothing else. Two things could follow:
  // a client could pay for an ICP whose saved targeting had already been proved to find
  // nobody (the widened set they approved was search-time only), and — the live Glean state —
  // a client whose pass 2 produced no second set could click an EARLIER card and walk past
  // the human review that failed pass is for.
  //
  // ⚠️ WE SEND ONE THING: WHICH CARD THEY CLICKED. No targeting, no batch, no flags. The
  // server owns every other fact and would ignore ours if we sent them.
  //
  // ⚠️ NAVIGATION IS THE LAST STEP, NOT THE FIRST. Anything other than success — refused,
  // failed, or a request that never got an answer — leaves them here with the honest sentence
  // and the button live again. Pressing it again retries the ACCEPTANCE only: it sources
  // nothing, spends no pass and creates no batch, because the endpoint does none of those.
  async function acceptProof(id: string) {
    setActing(id); setTopUp(null); setError(null)
    try {
      await api.post(`/leads/${id}/proof-accept`, {}, await token())
      router.push('/milla/billing?start=1&from=proof')
    } catch {
      // ONE SENTENCE FOR EVERY FAILURE, and it claims nothing. Not that they were charged —
      // nothing here charges. Not when it will be fixed — we do not know. Not that we will
      // look again — we will not, automatically.
      setError('K.I.N.D couldn’t save what worked in that proof yet. K.I.N.D needs to check this before you go live.')
    } finally { setActing(null) }
  }

  async function approve(id: string) {
    setActing(id); setTopUp(null); setError(null)
    try {
      const tok = await token()
      const res = await api.post<{ email: string; charged: boolean }>(`/leads/${id}/approve`, {}, tok)
      setRevealed(r => ({ ...r, [id]: { email: res.email, charged: res.charged } }))
      void load()   // keep the pack counter honest — see approveSelected

    } catch (e) {
      const err = e as Error & { status?: number }
      if (err.status === 402) setTopUp(shortfallMessage({
        count: 1,
        neededUsd: (err as { needed_usd?: number }).needed_usd,
        balanceUsd: (err as { balance_usd?: number }).balance_usd,
      }))
      // The api helper surfaces the server's `error` CODE as the message — translate the
      // known codes into plain English rather than showing a client "no_campaign".
      else if (err.message === 'no_campaign') setError("Your campaign isn't switched on yet, so we can't start outreach — you have not been charged. We've been alerted and will get it live.")
      else if (err.message === 'already_in_crm') setError('This contact is already in your CRM — no charge.')
      else if (err.message === 'no_email_found') setError('We could not verify an email for this lead — you were not charged.')
      else setError(err.message || 'Could not approve — please try again')
    } finally { setActing(null) }
  }
  // ── CALIBRATION v1 (P32) — the reason chip ────────────────────────────────────────────
  // Founder doctrine (Jack&Jill K.2): "Approve/Pass IS the calibration event — capture the
  // REASON and the product gets smarter every time a client clicks."
  //
  // ⚠️ FIRE-AND-FORGET, DELIBERATELY. The pass has already succeeded. If this call fails, is
  // slow, or is never made, the client's action stands and their screen is unaffected — which
  // is the whole difference between a calibration prompt and a gate.
  const [justPassed, setJustPassed] = useState<{ id: string; at: number } | null>(null)
  const REASON_CHIPS: { code: string; label: string }[] = [
    { code: 'too_big',         label: 'Too big' },
    { code: 'too_small',       label: 'Too small' },
    { code: 'wrong_industry',  label: 'Wrong industry' },
    { code: 'wrong_role',      label: 'Wrong role' },
    { code: 'wrong_geography', label: 'Wrong geography' },
    { code: 'bad_timing',      label: 'Bad timing' },
    { code: 'other',           label: 'Other' },
  ]
  async function sendReason(leadId: string, code: string) {
    setJustPassed(null)                       // acknowledge the tap at once — no spinner on a nicety
    try { await api.post(`/leads/${leadId}/feedback`, { action: 'pass', reason_code: code }, await token()) }
    catch { /* never surfaced: the pass stands, and a lost chip is not the client's problem */ }
  }

  // #570 — pass() now reloads. It removed the row locally and never refreshed, so the KPI
  // still read "3 leads awaiting" after the client had passed all three — and with a desk
  // capped at 50, passing one never pulled the next one in. The screen disagreed with itself.
  async function pass(id: string) {
    setActing(id); setError(null)
    try {
      await api.post(`/leads/${id}/pass`, {}, await token())
      setLeads(ls => (ls ?? []).filter(l => l.id !== id))   // instant, so the row goes at once
      // ── CALIBRATION v1 (P32) — ask WHY, after the fact, never before ──────────────────
      // The pass is DONE by this line. The chip row is a second, optional call; the founder's
      // rule is "one tap, never mandatory, never blocks the action". Nothing below can undo,
      // delay or fail the pass the client just made.
      setJustPassed({ id, at: Date.now() })
      void load()                                          // then the real counts, from the server
    }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not pass — please try again') }
    finally { setActing(null) }
  }
  async function send(text: string) {
    const msg = text.trim(); if (!msg || sending) return
    setInput(''); setSending(true); setMessages(m => [...m, { id: `u-${Date.now()}`, role: 'user', content: msg }])
    try {
      const tok = await token(); let sid = sessionId
      if (!sid) {
        const list = await api.get<{ data: { id: string }[] }>('/milla/sessions', tok).catch(() => null)
        sid = list?.data?.[0]?.id ?? null
        if (!sid) { const c = await api.post<{ sessionId: string }>('/milla/sessions', {}, tok); sid = c.sessionId }
        setSessionId(sid)
      }
      const res = await api.post<{ reply: string }>(`/milla/sessions/${sid}/chat`, { message: msg }, tok)
      setMessages(m => [...m, { id: `a-${Date.now()}`, role: 'assistant', content: res.reply }])
    } catch { setMessages(m => [...m, { id: `e-${Date.now()}`, role: 'assistant', content: 'I hit a snag reaching the engine — please try again in a moment.' }]) }
    finally { setSending(false) }
  }

  // While the pack has leads left an approval costs nothing — a card that still says

  // "$4" is the difference between a client working through 100 leads and stopping.

  const freeApproval = !!summary?.pack?.active && (summary.pack.left ?? 0) > 0
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const togglePick = (id: string) => setPicked(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n })


  const pendingRaw = (leads ?? []).filter(l => !revealed[l.id])

  // ── ⚑ 25 Aug — TWO PROOF SETS, KEPT AND LABELLED (founder-ruled) ──────────────────────
  //
  // WHAT WAS ACTUALLY HAPPENING. `/leads/for-approval` returns every undecided lead ordered
  // by score, with no time limit (founder-locked 25 Jul) — so after pass 2 a prospect with
  // 16 pass-1 leads still pending received 36 rows, SCORE-INTERLEAVED, with nothing on any
  // card to say which batch it came from. They asked for a different set and got one list
  // containing both, silently mixed.
  //
  // ⚠️ NOTHING IS DELETED, PASSED OR HIDDEN TO ACHIEVE THIS. All 36 stay, all 36 stay
  // actionable; the only thing that changes is that they are sorted into their batches and
  // the batches are named. `surfaced_for_approval_at` is one shared timestamp per proof run
  // and is never rewritten, so it separates them exactly — no `batch_id`, no migration.
  //
  // ⚠️ PROOF ONLY. A paying client's ordering is the API's score ranking, untouched: their
  // leads arrive continuously and "Latest set / Earlier set" would be a fiction there.
  const batchKey = (l: MaskedLead) => l.surfaced_for_approval_at ?? ''
  const pending = proofMode
    ? [...pendingRaw].sort((a, b) =>
        batchKey(b).localeCompare(batchKey(a)) || Number(b.score ?? 0) - Number(a.score ?? 0))
    : pendingRaw
  /** Newest batch first — index 0 is the set they just asked for. */
  const proofBatches = proofMode ? [...new Set(pending.map(batchKey))] : []
  /** Headings appear only when there is genuinely more than one set to tell apart. */
  const showBatchLabels = proofBatches.length > 1
  /**
   * THE REFINEMENT BELONGS TO THE LATEST SET, so it is rendered directly beneath that set's
   * last card — above the "Earlier set" heading, never stranded at the bottom of a list that
   * ends with pass 1. With only one set this is the final card, exactly as before.
   */
  const lastLatestIdx = proofMode
    ? pending.map(batchKey).lastIndexOf(proofBatches[0] ?? '')
    : -1

  // ── ⚑ 24 Aug — THE BATCH VERDICT (founder-ruled) ──────────────────────────────────────
  //
  // "Not a fit" on a card is PER LEAD and stays exactly as it was — it is recorded as
  // evidence either way. This is a different statement: the whole set is wrong. It was the
  // missing half of 20 → refine → 20 → human, and without it a prospect who said so
  // conversationally was told to go and find My ICP.
  //
  // ⚠️ NOTHING HERE SPENDS ANYTHING UNTIL THE CONFIRM. Opening the panel is free, describing
  // what is wrong is free (`/icps/chat-build` only proposes), and the FINAL targeting — the
  // exact five values that will be saved and run — is shown back BEFORE a single mutation.
  //
  // ⚑ 25 Aug — LIFTED OUT OF THE LIST so it can be rendered beneath the LATEST set's last
  // card rather than at the bottom of everything. The control refines the set they were just
  // shown; sitting under a trailing "Earlier set" would say it refines pass 1.
  const refineControl = !canRefine || pending.length === 0 ? null : (
    <div>
      {!refineOpen && (
        <button onClick={openRefine}
          className="w-full text-[13px] font-semibold text-[#5c5279] rounded-xl py-2.5 mt-1 border border-[#ece5fb] bg-white hover:bg-[#faf8ff]">
          These aren&rsquo;t right
        </button>
      )}

      {refineOpen && (
        <div className="mt-2 rounded-2xl border border-[#e4d4fb] bg-[#faf8ff] p-3.5">
          <div className="text-[14px] font-bold text-[#1f1235]">What&rsquo;s off about this batch?</div>
          <div className="text-[12px] text-[#9b8ec4] mt-0.5">
            Tell me in your own words — the wrong seniority, the wrong industry, the wrong places. I&rsquo;ll adjust who we look for.
          </div>

          {!refineFinal && (
            <div className="flex gap-2 mt-2.5">
              <input value={refineText} onChange={e => setRefineText(e.target.value)} disabled={refineBusy}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitRefine(refineText) } }}
                placeholder="e.g. too IT-focused — I want Heads of Marketing and HR"
                className="flex-1 text-[13px] rounded-xl border border-[#e4dcf7] px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/30 disabled:opacity-50" />
              <button disabled={refineBusy || !refineText.trim()} onClick={() => submitRefine(refineText)}
                className="text-[13px] font-bold text-white rounded-xl px-4 bg-[#7C3AED] disabled:opacity-50">
                {refineBusy ? '…' : 'Send'}
              </button>
            </div>
          )}

          {refineSaid && !refineFinal && (
            <div className="text-[12.5px] text-[#5c5279] mt-2.5">{refineSaid}</div>
          )}

          {/* ⚑ 25 Aug — REFLECT BACK THE WHOLE TARGETING, NOT JUST WHAT CHANGED.
              This rendered the model's raw draft, so only the dimensions it happened to
              mention appeared — while the saved payload also carried every preserved value
              the client never saw. All five are now listed from the ONE final object that
              `/icps/revise` receives, so what they read IS what runs.

              An empty dimension reads "Any", never a blank space: it is either a filter
              they explicitly asked us to drop, or one they never set. Both mean the same
              thing to the search, and silently omitting the row would hide a removal. */}
          {refineFinal && (
            <div className="mt-2.5">
              <div className="text-[12px] text-[#5c5279]">Here&rsquo;s exactly who we&rsquo;d look for:</div>
              <div className="mt-1.5 space-y-1.5">
                {REFINE_FIELDS.map(([k, label]) => {
                  const vals = refineFinal[k] ?? []
                  return (
                    <div key={k} className="flex gap-2 items-baseline">
                      <span className="text-[11px] font-extrabold uppercase tracking-wide text-[#b3a9cc] shrink-0 w-[86px]">{label}</span>
                      {vals.length === 0
                        ? <span className="text-[12px] text-[#9b8ec4] italic">Any</span>
                        : (
                          <span className="flex flex-wrap gap-1.5">
                            {vals.map((chip, i) => (
                              <span key={i} className="text-[11.5px] font-semibold text-[#7C3AED] bg-white border border-[#e4d4fb] rounded-full px-2.5 py-1">{chip}</span>
                            ))}
                          </span>
                        )}
                    </div>
                  )
                })}
              </div>
              {/* ⚑ 25 Aug — ONCE THE PROOF HAS BEEN ATTEMPTED THERE IS NO CONTROL AT ALL.
                  Not a disabled button, not a "try again": both buttons stop rendering and
                  the panel becomes a handoff. A pass may already be spent server-side even
                  though the request looked like it failed, so the only honest thing left on
                  screen is who is picking this up. */}
              {proofAttempted ? (
                <div className="text-[12px] text-[#5c5279] mt-2.5">
                  K.I.N.D is checking this one with you — nothing more to do here.
                </div>
              ) : (
                <>
                  <div className="text-[12px] text-[#5c5279] mt-2.5 font-semibold">Use this refinement and find another set?</div>
                  <div className="text-[11.5px] text-[#9b8ec4] mt-0.5">
                    This is your second and last free set — after it, we talk it through together.
                  </div>
                  <div className="flex gap-2 mt-2">
                    <button disabled={refineBusy} onClick={confirmRefine}
                      className="flex-1 text-[13px] font-bold text-white rounded-xl py-2.5 bg-gradient-to-br from-[#7C3AED] to-[#EC4899] disabled:opacity-50">
                      {refineBusy ? 'Finding…' : 'Yes — find another set'}
                    </button>
                    <button disabled={refineBusy}
                      onClick={() => { setRefineOpen(false); setRefineFinal(null); setRefineIcpId(null); setRefineText(''); setRefineSaid(null); setRefineErr(null) }}
                      className="text-[13px] font-semibold text-[#5c5279] rounded-xl py-2.5 px-4 border border-[#ece5fb] bg-white disabled:opacity-50">
                      Keep current
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {refineErr && <div className="mt-2.5 text-[12px] text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{refineErr}</div>}
        </div>
      )}
    </div>
  )

  // ── FINDING → PROOF READY: THE SIGNAL IS CONSUMED, ONCE ─────────────────────────────
  //
  // ⚠️ THE ARRIVAL IS A ONE-WAY TRANSITION, AND IT HAS TO BE SPENT. Stopping the poll when
  // leads land is not enough on its own: `finding` stayed true, `findingTimedOut` could
  // still be true, and `?finding=1` stayed in the address bar. So the moment the client
  // worked through everything they were shown — approved them, passed them — `pending`
  // returned to zero and the whole finding state came BACK: a spinner and "Finding your
  // matches now…" for a batch that arrived long ago, plus a poll re-armed against a run
  // that had already finished. A signal that is not consumed is a signal that fires twice.
  //
  // Clearing the flags handles this render; stripping the query param is what makes it
  // permanent, because `isFinding()` reads the URL and a reload would otherwise resurrect
  // it. `history.replaceState` rather than `router.replace` — this is cosmetic URL
  // hygiene, not a navigation, and it must not remount the desk or touch the history stack.
  //
  // READ-ONLY, like everything else on this page's proof path: no POST, no `/proof`, no
  // provider call, no server or customer mutation, no billing navigation.
  useEffect(() => {
    if (!finding || pending.length === 0) return
    setFinding(false)
    setFindingTimedOut(false)
    try {
      const url = new URL(window.location.href)
      url.searchParams.delete('finding')
      url.searchParams.delete('since')
      window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`)
    } catch { /* the flags are already cleared — the URL is cosmetic, never the gate */ }
  }, [finding, pending.length])

  // ── BOUNDED, READ-ONLY POLLING WHILE THE PROOF RUN FINISHES ─────────────────────────
  //
  // The ONLY thing this does is call `load()` again — the same `/leads/milla-summary` +
  // `/leads/for-approval` GETs the page already makes on mount. No new endpoint, no POST,
  // no provider call, no mutation, and above all NO second `/icps/:id/proof`: that would
  // claim the client's SECOND pass. There is exactly one proof POST in the whole journey
  // and it lives on the confirmation screen.
  //
  // Stops on the FIRST of: leads arrive · 20 checks (~60s) · unmount.
  useEffect(() => {
    // A terminal outcome ends the poll as surely as leads arriving would: the run is
    // over, so re-asking cannot change the answer and would only hammer the API.
    if (!finding || pending.length > 0 || terminalRun) return
    let cancelled = false
    let checks = 0
    let inFlight = false                       // one request at a time — never overlap
    const timer = setInterval(() => {
      if (cancelled || inFlight) return
      if (checks >= FINDING_MAX_CHECKS) { clearInterval(timer); setFindingTimedOut(true); return }
      checks += 1
      inFlight = true
      void load().finally(() => { inFlight = false })
    }, FINDING_POLL_MS)
    // Cleanup is what guarantees a single loop: the effect re-runs only when `finding` or
    // the pending COUNT changes, and each re-run tears the previous interval down first.
    return () => { cancelled = true; clearInterval(timer) }
  }, [finding, pending.length, load, terminalRun])
  // Mirrors lib/approval-batch.ts on the server. `approvedEver` comes from the summary, so a
  // client already past 20 gets one-tap approve back — the gate starts the relationship, it
  // doesn't nag someone already working with us.
  const approvedEver = summary?.leads_approved_total ?? 0
  const gate = (() => {
    const MIN = 20
    if (approvedEver >= MIN) return { required: 1, batch: false }
    return { required: Math.min(MIN - approvedEver, pending.length), batch: pending.length > 0 }
  })()
  // What is actually happening with their sending, in the client's words. Ordered by what
  // matters most to them: unpaid beats paused, because paying is what unblocks it.
  const sendState = (() => {
    if (needsGoLive) return { label: `Not started — waiting on your $${PACK_PRICE_USD}`, tone: 'text-[#b45309]', dot: 'bg-amber-500' }
    const st = summary?.campaign_status
    if (st === 'active') return { label: 'Campaign live', tone: 'text-[#059669]', dot: 'bg-emerald-500' }
    if (st === 'paused' || st === 'paused_low_performance') return { label: 'Paused — we\u2019ll tell you why', tone: 'text-[#b45309]', dot: 'bg-amber-500' }
    if (st === 'completed' || st === 'archived') return { label: 'Campaign finished', tone: 'text-[#5c5279]', dot: 'bg-[#b3a9cc]' }
    if (st === 'draft') return { label: 'Being set up', tone: 'text-[#5c5279]', dot: 'bg-[#b3a9cc]' }
    return { label: 'Nothing sending yet', tone: 'text-[#5c5279]', dot: 'bg-[#b3a9cc]' }
  })()

  const rich = (t: string) => t.split(/(\*\*[^*]+\*\*)/g).map((p, i) => p.startsWith('**') && p.endsWith('**')
    ? <b key={i} className="text-[#7C3AED]">{p.slice(2, -2)}</b> : <span key={i}>{p}</span>)

  const KPI = ({ k, v, s, tone, hero, tour }: { k: string; v: string; s: string; tone?: string; hero?: boolean; tour?: string }) => (
    <div data-tour={tour} className={`rounded-2xl px-4 py-3.5 border ${hero ? 'text-white border-transparent bg-gradient-to-br from-[#7C3AED] to-[#6d28d9]' : 'bg-white border-[#eee7f7]'}`}>
      <div className={`text-[10.5px] font-extrabold uppercase tracking-wide ${hero ? 'text-[#e9d5ff]' : 'text-[#b3a9cc]'}`}>{k}</div>
      <div className="text-[22px] font-extrabold mt-0.5 leading-tight" style={!hero && tone ? { color: tone } : undefined}>{v}</div>
      <div className={`text-[11.5px] mt-0.5 ${hero ? 'text-[#e9d5ff]' : 'text-[#9b8ec4]'}`}>{s}</div>
    </div>
  )

  return (
    <div className="h-full flex flex-col overflow-hidden px-5 py-4">
      {/* THE WALKTHROUGH (flow v2 step 1) — once, on their first visit, then never again.
          Steps whose element isn't on screen skip themselves, so a fresh account with an
          empty lead desk still gets a coherent tour. */}
      <ProductTour steps={[
        { target: 'kpi-pack',  title: 'What you have', body: `Your $${PACK_PRICE_USD} includes ${PACK_LEADS} approved leads. This counts down as you approve — nothing else is charged until it runs out.` },
        { target: 'leads',     title: 'This is your job', body: "Everyone we find lands here, scored and masked. Pick the ones worth talking to — we start work the moment you do. The first time round, choose 20 so there are enough people to run a real campaign." },
        { target: 'chat',      title: 'Milla, any time', body: "Ask for more people, change who we're targeting, or tell me a lead was wrong. I'm how you steer it — there are no forms." },
        { target: 'kpi-meetings', title: 'What it comes back as', body: 'Booked meetings. We answer the replies, qualify them and put the meeting in your calendar — you just turn up.' },
      ]} />
      {/* $99 GO-LIVE banner — shown until the client funds their wallet. Browsing is free;
          this is the step that switches their campaign on. */}
      {needsGoLive && (
        <a href="/milla/billing?start=1" className="block mb-4 rounded-2xl border border-[#7C3AED]/25 bg-gradient-to-r from-[#f3ecff] to-[#fdecf5] px-5 py-4 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <p className="font-extrabold text-[#5b21b6] text-[16px]">Go live — your first {PACK_LEADS} leads are ${PACK_PRICE_USD}</p>
              <p className="text-[14px] text-[#6b6088] mt-0.5">Your first purchase is <b>${PACK_PRICE_USD}</b> and it includes <b>{PACK_LEADS} approved leads</b>. Browsing and building your plan is free — nothing sources or sends until you go live. After the first 100 it&rsquo;s a flat $4 a lead.</p>
            </div>
            <span className="shrink-0 text-[14px] font-bold text-white rounded-xl px-4 py-2 bg-gradient-to-br from-[#7C3AED] to-[#EC4899]">Go live — ${PACK_PRICE_USD} · {PACK_LEADS} leads →</span>
          </div>
        </a>
      )}
      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* While the $99 pack has leads left, THAT is the number that matters to the client —
            a wallet reading $0 next to "100 included" reads as broken. Falls back to the
            wallet once the pack is used. */}
        {summary?.pack?.active && summary.pack.left > 0
          ? <KPI hero tour="kpi-pack" k="Leads included" v={`${summary.pack.left}`} s={`of your ${summary.pack.included} · then $4 each`} />
          : <KPI hero tour="kpi-pack" k="Wallet balance" v={summary ? `$${summary.wallet_balance_usd.toLocaleString()}` : '…'} s="$4 per approved lead" />}
        <KPI k="Leads awaiting you" v={summary ? String(summary.leads_awaiting) : '…'} s={summary && summary.leads_awaiting ? '1 tap to approve' : 'all caught up'} tone="#EC4899" />
        <KPI tour="kpi-meetings" k="Meetings booked" v={summary ? String(summary.meetings_booked) : '…'} s="this month" tone="#059669" />
        {/* DORMANT (flow v2 step 2). An approved ICP with no $99 behind it is live on paper
            and doing nothing in practice — nothing sources, nothing sends. Saying "—" here
            let a client sit for days assuming we were working. */}
        {needsGoLive && (summary?.icp_versions?.length ?? 0) > 0
          ? <KPI k="Your targeting" v="Dormant" s={`approved — waiting on your $${PACK_PRICE_USD}`} tone="#b45309" />
          : <KPI k="Active campaign" v={summary?.active_campaign ?? '—'} s={summary?.icp_versions?.find(v => v.current)?.version ? `ICP ${summary.icp_versions.find(v => v.current)!.version}` : 'no campaign yet'} />}
      </div>

      {/* Milla is the SPINE: she fills the console, leads canvas beside her. */}
      <div className="flex-1 flex gap-4 mt-4 min-h-0">
        {/* chat — FIXED width. A conversation column past ~600px is 170+ characters a line,
            which reads badly however full it is. */}
        <section data-tour="chat" className="w-[600px] shrink-0 bg-white border border-[#eee7f7] rounded-2xl flex flex-col min-h-0">
          <div className="flex items-center gap-2.5 px-4 py-3 border-b border-[#eee7f7]">
            <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#7C3AED] to-[#EC4899] text-white font-extrabold text-[13px] flex items-center justify-center">M</span>
            <div><b className="text-[15px]">Milla</b> <span className="text-[#9b8ec4] text-[12.5px]">· conversational &amp; strategic</span></div>
            {/* Was hardcoded "● Campaign live" with no condition on it, sitting inches from
                the KPI that correctly said "Dormant" — the product contradicting itself on
                one screen. Now it reads the real campaign state. */}
            <span className={`ml-auto text-[12.5px] font-semibold inline-flex items-center gap-1.5 ${sendState.tone}`}>
              <span className={`w-2 h-2 rounded-full ${sendState.dot}`} /> {sendState.label}
            </span>
          </div>
          <div ref={chatBodyRef} className="flex-1 overflow-y-auto px-4 py-4">
            <div className="max-w-2xl space-y-3">
              {messages.map(m => (
                <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[86%] rounded-2xl px-4 py-2.5 text-[14px] leading-relaxed whitespace-pre-wrap ${m.role === 'user' ? 'bg-[#1f1235] text-white' : 'bg-[#f3ecff] text-[#1f1235]'}`}>{m.role === 'assistant' ? rich(m.content) : m.content}</div>
                </div>
              ))}
              {sending && <div className="flex justify-start"><div className="bg-[#f3ecff] rounded-2xl px-4 py-2.5 text-[#9b8ec4] text-[14px]">Milla is thinking…</div></div>}
            </div>
          </div>
          <div className="px-4 py-3 border-t border-[#eee7f7]">
            <div className="flex flex-wrap gap-1.5 mb-2">
              {CHIPS.map(c => <button key={c} onClick={() => send(c)} disabled={sending} className="text-[12.5px] font-semibold text-[#7C3AED] bg-[#f3ecff] border border-[#e4d4fb] rounded-full px-3 py-1 hover:bg-[#ebe0fc] disabled:opacity-50">{c}</button>)}
            </div>
            <form onSubmit={e => { e.preventDefault(); send(input) }} className="flex gap-2">
              <input value={input} onChange={e => setInput(e.target.value)} placeholder="Ask Milla, request leads, or give feedback…" className="flex-1 text-[14px] rounded-xl border border-[#e4dcf7] px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/30" />
              <button type="submit" disabled={sending || !input.trim()} className="text-[14px] font-bold text-white rounded-xl px-5 bg-[#7C3AED] disabled:opacity-50">Send</button>
            </form>
          </div>
        </section>

        {/* lead cards */}
        {/* LEADS — this is what the client is here to DO, so it gets the room. It FLEXES and
            the conversation is fixed; the other way round meant every extra pixel of a bigger
            monitor went to the chat while the work stayed pinned at 380px. Cards flow into
            columns once there's width for them. */}
        <aside data-tour="leads" className="flex-1 min-w-0 bg-white border border-[#eee7f7] rounded-2xl flex flex-col min-h-0">
          <div className="px-4 py-3 border-b border-[#eee7f7] flex items-center gap-2 flex-wrap">
            <b className="text-[15px]">New leads</b>
            <span className="text-[#9b8ec4] text-[12.5px]">· masked · no charge yet</span>
            {gate.batch && gate.required > 1 && (
              <span className="ml-auto text-[12.5px] font-bold text-[#7C3AED] bg-[#f3ecff] border border-[#e4d4fb] rounded-full px-3 py-1">
                Pick {gate.required} to start
              </span>
            )}
          </div>
          <div className="px-3.5 py-3 overflow-y-auto grid gap-2.5 grid-cols-1 [@media(min-width:1100px)]:grid-cols-2 [@media(min-width:1600px)]:grid-cols-3 items-start content-start">
            {topUp && <div className="text-[13px] text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">{topUp}</div>}
            {error && <div className="text-[13px] text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{error}</div>}
            {!leads && !error && <p className="text-[14px] text-[#9b8ec4]">Loading…</p>}
            {/* #570 — the KPI counts EVERY lead awaiting a decision; this list is capped at
                50. A client with 120 waiting read "120 leads awaiting you" above a list of
                50, with nothing explaining the other 70 — which reads as us having lost them. */}
            {(() => {
              const note = summary && leads ? deskCoverage({ awaiting: summary.leads_awaiting, shown: leads.length }) : null
              return note ? <div className="text-[12.5px] text-[#5c5279] bg-[#faf8ff] border border-[#ece5fb] rounded-xl px-3 py-2">{note}</div> : null
            })()}
            {/* ── CALIBRATION v1 (P32) — the reason chip row ─────────────────────────────
                Appears ONLY after a pass, above the list, and disappears on any tap. It is
                skippable by ignoring it: nothing here blocks the next action, and the pass it
                refers to has already completed. "One tap, never mandatory." */}
            {justPassed && (
              <div className="bg-[#faf8ff] border border-[#ece5fb] rounded-2xl px-4 py-3.5">
                <div className="text-[13px] text-[#4c4368] font-semibold">Passed. What was off about them?</div>
                <div className="text-[12px] text-[#9b8ec4] mt-0.5">Optional — it tunes what I find you next.</div>
                <div className="flex flex-wrap gap-1.5 mt-2.5">
                  {REASON_CHIPS.map(c => (
                    <button key={c.code}
                      onClick={() => void sendReason(justPassed.id, c.code)}
                      className="text-[12.5px] font-bold text-[#7C3AED] bg-white border-[1.5px] border-[#e4d4fb] rounded-lg px-2.5 py-1.5">
                      {c.label}
                    </button>
                  ))}
                  <button onClick={() => setJustPassed(null)}
                    className="text-[12.5px] font-semibold text-[#9b8ec4] px-2.5 py-1.5">
                    Skip
                  </button>
                </div>
              </div>
            )}
            {leads?.filter(l => revealed[l.id]).map(l => (
              <div key={l.id} className="bg-white border-[1.5px] border-emerald-200 rounded-2xl p-3.5">
                <div className="flex items-center gap-2"><span className="text-emerald-600">✓</span><b className="text-[14px]">Approved · {l.role} @ {l.company}</b></div>
                <div className="text-[13px] text-[#4c4368] mt-1">Contact: <b>{revealed[l.id].email}</b></div>
                <div className="text-[12px] text-[#7c6f9b] mt-0.5">{revealed[l.id].charged ? '$4 charged' : 'Included in your 100'} — working it now</div>
              </div>
            ))}
            {leads && pending.length === 0 && Object.keys(revealed).length === 0 && (
              /* ⚑ 24 Aug — FINDING vs GENUINELY EMPTY. These are different facts and used to
                 render the same sentence. A prospect whose proof run is in flight was told
                 "no leads waiting" and promised a notification nothing sends. The paying
                 client's copy below is UNCHANGED on purpose — its own "we'll notify you"
                 claim predates this build and is the founder's call, not this commit's. */
              /* ⚑ 26 Aug — TERMINAL BEATS SPINNER. Checked BEFORE `finding`, because
                 `finding` is only ever a claim about what we started; `terminalRun` is
                 the server's record of how it actually ended. When both are true the run
                 is over and the flag is stale. */
              terminalRun ? (
                <div className="text-[14px] text-[#4c4368] bg-[#faf8ff] border border-[#ece5fb] rounded-2xl px-4 py-10 text-center">
                  <div className="text-[15px] font-bold text-[#5c5279]">
                    {/* ⚠️ FOUNDER-APPROVED RECOVERY COPY (26 Aug), verbatim. The word
                        "failed" is the internal status and never appears here. */}
                    {proofFailed
                      ? 'We hit a snag confirming your matches'
                      : proofEndedEmpty ? 'No matches this time' : 'That search has finished'}
                  </div>
                  {/* The server's own canonical sentence — never re-written here, and for a
                      crash it carries no provider name, status code or stack. */}
                  <div className="text-[13px] mt-1.5 text-[#7c6f9b]">{terminalRun.message}</div>
                  {/* Nothing on this branch starts another search, and no control offers to. */}
                </div>
              ) : finding ? (
                <div className="text-[14px] text-[#9b8ec4] bg-[#faf8ff] border border-[#ece5fb] rounded-2xl px-4 py-10 text-center">
                  <div className="text-[15px] font-bold text-[#5c5279]">Finding your matches now…</div>
                  <div className="text-[13px] mt-1.5">
                    {/* ⚠️ Real apostrophes, NOT &rsquo;. These are JS string literals inside an
                        expression container, so an HTML entity is not decoded — it renders as
                        the literal text "We&rsquo;re". Entities only work in JSX text nodes,
                        which is what the paying-client line below is. */}
                    {findingTimedOut
                      /* No notification promised, no time promised — neither is true. */
                      ? 'We’re still finding your matches. You can come back to this page shortly.'
                      : 'Real people who match your targeting. They’ll appear here as soon as we have them — masked, free, and nobody is contacted.'}
                  </div>
                </div>
              ) : (
                <div className="text-[14px] text-[#9b8ec4] bg-[#faf8ff] border border-[#ece5fb] rounded-2xl px-4 py-10 text-center">No leads waiting right now. We&apos;ll notify you the moment FIGSY qualifies the next. 🎯</div>
              )
            )}
            {pending.map((l, i) => {
              const busy = acting === l.id
              // ⚑ 25 Aug — ONE HEADING AT EACH BATCH BOUNDARY. `pending` is already sorted
              // newest batch first, so a heading is due whenever this row's batch differs
              // from the row above it. Proof only, and only when there are two sets to tell
              // apart — a single set needs no label and a paying client has no sets at all.
              const newBatch = showBatchLabels && (i === 0 || batchKey(pending[i - 1]) !== batchKey(l))
              return (
                <Fragment key={l.id}>
                {newBatch && (
                  <div className="text-[11px] font-extrabold uppercase tracking-wide text-[#b3a9cc] pt-1.5 px-1">
                    {batchKey(l) === proofBatches[0] ? 'Latest set' : 'Earlier set'}
                  </div>
                )}
                <div onClick={() => gate.batch && gate.required > 1 && togglePick(l.id)}
                  className={`rounded-2xl p-3.5 transition-shadow ${gate.batch && gate.required > 1 ? 'cursor-pointer' : ''} ${
                    picked.has(l.id) ? 'border-[1.5px] border-[#7C3AED] bg-[#f7f2ff] shadow-sm'
                    : l.recommended ? 'border-[1.5px] border-[#d9c4fb] bg-[#fcfaff]' : 'border border-[#ece5fb]'}`}>
                  {/* WE'D START HERE — the API ranks everyone we sourced and marks its top 20.
                      It was computing this and the client never saw it, which left them facing
                      200 identical cards with no steer. */}
                  {l.recommended && <div className="text-[11px] font-extrabold uppercase tracking-wide text-[#7C3AED] mb-2">★ We&apos;d start here</div>}
                  <div className="flex items-start gap-2.5">
                    <span className="w-9 h-9 rounded-lg bg-[#efeafc] text-[#7C3AED] flex items-center justify-center shrink-0">🎭</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start gap-2">
                        <div className="min-w-0"><b className="text-[14px] block leading-tight">{l.role}</b><span className="text-[12.5px] text-[#9b8ec4]">@ {l.company}</span></div>
                        {l.score != null && <span className="ml-auto text-right"><span className="text-[16px] font-extrabold text-[#7C3AED] tabular-nums">{l.score}</span><span className="block text-[10px] uppercase tracking-wide text-[#b3a9cc] font-extrabold">score</span></span>}
                      </div>
                      {l.why_fits && <div className="text-[13px] text-[#5c5279] mt-2 leading-relaxed bg-[#faf8ff] rounded-lg px-2.5 py-2"><b className="text-[#7c6f9b]">Why this fits:</b> {l.why_fits}</div>}
                      <div className="flex gap-1.5 mt-2.5">
                        {/* Under the gate the card is a CHOICE, not an action — you pick your
                            20 and start them together. Past it, one tap approves as before. */}
                        {proofMode ? (
                          /* LOOKS RIGHT — a calibration signal and nothing else. It writes
                             no approval, reveals nothing, charges nothing and takes no pack
                             slot; it moves them toward going live, which is the $299. */
                          <button disabled={busy} onClick={e => { e.stopPropagation(); void acceptProof(l.id) }}
                            className="flex-1 text-[13px] font-bold text-white rounded-lg py-2 bg-gradient-to-br from-[#7C3AED] to-[#EC4899] disabled:opacity-50">
                            {busy ? 'Saving…' : '👍 Looks right'}
                          </button>
                        ) : gate.batch && gate.required > 1 ? (
                          <button onClick={e => { e.stopPropagation(); togglePick(l.id) }}
                            className={`flex-1 text-[13px] font-bold rounded-lg py-2 border-[1.5px] ${picked.has(l.id)
                              ? 'text-white bg-[#7C3AED] border-[#7C3AED]'
                              : 'text-[#7C3AED] bg-white border-[#e4d4fb]'}`}>
                            {picked.has(l.id) ? '✓ Picked' : 'Pick this one'}
                          </button>
                        ) : (
                          <button disabled={busy} onClick={e => { e.stopPropagation(); approve(l.id) }} className="flex-1 text-[13px] font-bold text-white rounded-lg py-2 bg-gradient-to-br from-[#7C3AED] to-[#EC4899] disabled:opacity-50">{busy ? '…' : freeApproval ? '✓ Approve · included' : '✓ Approve qualified lead · $4'}</button>
                        )}
                        <button disabled={busy} onClick={e => { e.stopPropagation(); pass(l.id) }} className="text-[13px] font-semibold text-[#5c5279] rounded-lg py-2 px-3 border border-[#ece5fb] disabled:opacity-50">Not a fit</button>
                      </div>
                    </div>
                  </div>
                </div>
                {/* THE REFINEMENT SITS WITH THE SET IT REFINES — under the last card of the
                    LATEST batch, above any "Earlier set" heading. With one batch this is the
                    final card, which is exactly where it rendered before. */}
                {i === lastLatestIdx && refineControl}
                </Fragment>
              )
            })}
            {/* Said "$4 per approved lead" even while the button above it said "included" —
                two prices on one screen. */}
            {/* ⚠️ BOTH PASSES SPENT — AND WE SAY SO RATHER THAN OFFERING A THIRD. The server
                refuses a third claim outright (`try_claim_proof_pass` returns 0 → 409), and
                that fence is untouched. This is the desk telling them BEFORE they press
                anything, instead of letting them discover it as an error. */}
            {proofExhausted && (
              <div className="mt-2 rounded-2xl border border-[#ece5fb] bg-[#faf8ff] px-4 py-3 text-[13px] text-[#5c5279]">
                We&rsquo;ve used both proof passes. K.I.N.D will review this with you.
              </div>
            )}

            <div className="text-[11.5px] text-[#b3a9cc] px-1 pt-1">
              {proofMode
                ? 'These are real people who match your targeting — free, and nobody has been contacted. Tell us what looks right and we will go live.'
                : freeApproval
                  ? `Included in your ${summary?.pack?.included ?? 100} — nothing charged until the pack runs out. Reviewing is free.`
                  : '$4 per approved lead — final. Reviewing is free.'}
            </div>
          </div>
          {/* THE START BAR — sticks to the bottom of the lead desk while the gate is on, so
              "how many more" is never something the client has to count for themselves. */}
          {!proofMode && gate.batch && gate.required > 1 && (
            <div className="shrink-0 border-t border-[#eee7f7] bg-[#faf8ff] px-4 py-3 flex items-center gap-3 flex-wrap">
              <span className="text-[13.5px] text-[#5c5279]">
                <b className="text-[#1f1235]">{picked.size} of {gate.required} picked</b>
                <span className="block text-[12px] text-[#9b8ec4]">
                  {picked.size >= gate.required
                    ? freeApproval ? 'All included in your 100 — nothing extra to pay.' : `That's $${picked.size * 4}.`
                    : 'We start with a full batch so the campaign has enough people to work.'}
                </span>
              </span>
              <button onClick={approveSelected} disabled={picked.size < gate.required || acting === 'batch'}
                className="ml-auto text-[14px] font-bold text-white rounded-xl px-5 py-2.5 bg-gradient-to-br from-[#7C3AED] to-[#EC4899] disabled:opacity-40">
                {acting === 'batch' ? 'Starting…' : `Start work on ${picked.size || gate.required} →`}
              </button>
            </div>
          )}
        </aside>
      </div>

      {/* #511f — what Milla's learning for this client (the flywheel) */}
      {nexus && nexus.sample_worked > 0 && (
        <div className="mt-4 bg-gradient-to-br from-[#faf7ff] to-white border border-[#ece5fb] rounded-2xl px-5 py-4">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[16px]">🧠</span>
            <b className="text-[14.5px]">What Milla&apos;s learning for you</b>
            <span className="text-[10.5px] font-extrabold uppercase tracking-wide text-[#9b8ec4] bg-white border border-[#ece5fb] rounded-full px-2 py-0.5 ml-auto">{nexus.confidence}</span>
          </div>
          <p className="text-[14px] text-[#5c5279] leading-relaxed">{nexus.learned}</p>
          <div className="flex flex-wrap gap-2.5 mt-2.5">
            {nexus.top_persona && <span className="text-[12.5px] font-semibold text-[#7C3AED] bg-[#f3ecff] rounded-full px-2.5 py-1">Books best: {nexus.top_persona}</span>}
            <span className="text-[12.5px] font-semibold text-[#5c5279] bg-white border border-[#ece5fb] rounded-full px-2.5 py-1">Reply rate {Math.round(nexus.reply_rate * 1000) / 10}%</span>
            <span className="text-[12.5px] font-semibold text-[#5c5279] bg-white border border-[#ece5fb] rounded-full px-2.5 py-1">Meeting rate {Math.round(nexus.meeting_rate * 1000) / 10}%</span>
          </div>
        </div>
      )}
    </div>
  )
}
