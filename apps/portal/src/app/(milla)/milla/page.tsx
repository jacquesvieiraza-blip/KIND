'use client'

import { Fragment, useCallback, useEffect, useRef, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { createClient } from '@/lib/supabase/client'
import ProductTour from '@/components/ProductTour'
// ⚑ 30 Aug (BUILD-004A-1) — PACK_PRICE_USD / PACK_LEADS / deskCoverage are GONE from this
// screen. They are the $299-pack and $4-per-lead economics, and the live customer path has no
// legacy customers left to serve them to. `shortfallMessage` stays imported only where the
// wallet top-up still belongs (it does not appear on this home any more).
import { MILLA_FAILURE_COPY, STAGE_QUICK_ACTION, type MillaStage } from '@kind/shared'
import ProgrammeWorkspace, { nextActionFor, type CustomerProgramme } from '@/components/milla/ProgrammeWorkspace'
// ⚑ 3 Sep (PR B) — THE CUSTOMER'S REVIEW AND THEIR ONE APPROVAL (R39, 15 Aug: "the client
// approves in Milla"). ADDITIVE: it renders BELOW the existing workspace and only at the
// Approval stage, so every other stage's screen is byte-for-byte what it was.
import ProgrammeReview from '@/components/milla/ProgrammeReview'
import { proofWaitState, invalidateProofSnapshot, classifyClaimFailure, isReconciling, PROOF_WAIT_MS } from '@/lib/proof-start'

// #497/#503/#506/#495 — MILLA HOME (docs/mv-previews/milla2.html): KPI cards row + Milla
// chat as the SPINE (centre, full height) + the programme workspace (right).
//
// ⛓️ 30 Aug (BUILD-004A-1) — THIS HEADER DESCRIBED THE LEGACY MODEL until today: masked lead
// cards fed by the per-lead approval endpoint, and "Approve charges a flat per-lead price from
// the one wallet". None of that is on this screen any more. The home now reads the customer's
// PROGRAMME and renders the shared workspace; the conversation stays the spine.

type MaskedLead = { id: string; role: string; company: string; industry: string | null; country: string | null; score: number | null; why_fits: string | null; recommended?: boolean
  /** ⚑ 25 Aug — WHICH PROOF BATCH this card came from. One shared timestamp per proof run,
   *  written once and never rewritten, so it separates pass 1 from pass 2 exactly. */
  surfaced_for_approval_at?: string | null }
type Revealed = { email: string; charged: boolean }
type IcpVersion = { version: string; current: boolean; name: string; summary: string; created_at: string | null }
type Pack = { active: boolean; included: number; used: number; left: number; nextLeadCostUsd: number }
type Summary = {
  // ⛓️ `wallet_balance_usd` REMOVED from this screen's type (BUILD-004A-1). The endpoint still
  // returns it for Billing; this home no longer reads it, and dropping the field means a future
  // edit cannot quietly render a wallet balance back onto the programme home.
  has_funded: boolean; leads_awaiting: number; meetings_booked: number
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
  /** ⚑ 26 Aug — when the CURRENT pass was claimed (ISO), written by `try_claim_proof_pass`
   *  in the same atomic statement as the counter above. The desk's authoritative clock.
   *  Absent/null = UNKNOWN (a row predating the column), never "long ago". */
  proof_started_at?: string | null
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
// ── ⚑ 30 Aug (BUILD-004A-2) — THE CHIPS ARE STAGE-AWARE ────────────────────────────────
//
// 🛑 THE LIVE ACCOUNT IS AT RECOMMENDATION AND WAS BEING OFFERED PROOF CHIPS. "Which of
// these look strongest?" and "Please find more like these" are calibration questions: they
// make sense while a client is reacting to a proof set and make none once we have proposed a
// programme. The row was a flat constant with no notion of stage at all.
//
// ⚠️ NOT ONE CHIP IS NEW WORDING. The stage-specific chip is `STAGE_QUICK_ACTION[stage]` —
// the founder's verbatim per-stage conversation accelerator from @kind/shared, already the
// approved text for exactly this job and already rendered by the Programme workspace. The
// other three are the existing approved chips; what changed is WHEN each is offered.
//
// ⚠️ "CONTEXTUALLY VALID" IS THE TEST THE FOUNDER SET for the last two. Offering "Please
// pause my programme" to someone at Proof invites them to pause a programme that does not
// exist; offering "How is my ROI looking?" before anything has been sent asks Milla for a
// return on nothing. Both are the same defect as the proof chips, in the other direction.
const PROOF_CHIPS = [
  'Which of these look strongest?',
  'Please find more like these',
]
/** Only where a programme exists and is running — not before it starts, not once it ends. */
const PAUSE_STAGES: MillaStage[] = ['Sourcing', 'Approval', 'Live', 'Review']
/** Only once outreach has had the chance to produce something to measure. */
const ROI_STAGES:   MillaStage[] = ['Live', 'Review', 'Completion']
const CHIPS = [
  ...PROOF_CHIPS,
  // ⛓️ 30 Aug (BUILD-004A-1 live-walk) — "campaign" → "programme". The customer product is
  // the PROGRAMME; "campaign" is the internal delivery object (`figsy_campaigns`) and is not
  // the customer's word for what they bought. Terminology only — this chip still just sends
  // a message to Milla, and the request it makes is unchanged.
  'Please pause my programme',
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
// ⛓️ `findingSince()` IS GONE (26 Aug). It read a `?since=` epoch out of the URL, which was
// the desk's clock before the claim recorded its own. Two sources of timing truth is what
// produced every contradiction this arc chased — a stamp written after the POST returned, a
// stamp missing on another device, a stale stamp from an older pass — so the browser clock
// was removed outright rather than demoted. Nothing writes `?since=` any more; the URL
// cleanup below still strips it so an old link in someone's history tidies itself.

/**
 * ⚑ 26 Aug — WHEN THE CURRENT PROOF PASS STARTED, from the server that claimed it.
 *
 * `clients.proof_started_at` is written inside the SAME atomic UPDATE that increments
 * `proof_passes_done`, so it always describes the latest claim and cannot exist without it.
 * This replaced a browser clock — a `?since=` stamp mirrored into localStorage — which was
 * written only AFTER the /proof POST returned, was scoped to one browser profile, and could
 * be stale from an older pass. All three of those produced wrong answers about a run that
 * was working; a value the claim itself wrote cannot.
 *
 * **0 means UNKNOWN, never "long ago"** — a row from before the column existed, or a claim
 * the summary has not caught up with. The rule treats unknown as "may still be running"
 * under the bounded poll rather than inventing an age.
 */
function serverProofStartedAt(summary: Summary | null): number {
  const raw = summary?.proof_started_at
  if (!raw) return 0
  const n = Date.parse(raw)
  return Number.isFinite(n) && n > 0 ? n : 0
}
/**
 * ⚑ 26 Aug (final review) — THE BOUND IS DERIVED FROM THE BACKEND'S OWN WORST CASE,
 * not picked. The previous 20 × 3s ≈ 60s could declare "We hit a snag" while a
 * perfectly healthy slow proof was still legitimately running. The math, from code:
 *
 *   · one PDL attempt:            fetch AbortSignal.timeout(15000)  = 15s   (pdl-search.ts)
 *   · size ladder at batch 20:    [20, 10, 5, 1]                    = 4 attempts
 *   · worst ladder walk (402s):   4 × 15s                           = 60s
 *   · one global rate-limit retry: 2.5s pause + 15s                 = 17.5s
 *   · exact search worst case:                                     ≈ 77.5s
 *   · ONE widened fallback (same shape again):                     ≈ 77.5s
 *   · pool query, DB writes, memory pass, alerts:                  ≈ seconds
 *   → worst LEGITIMATE proof runtime                               ≈ 160–180s
 *
 * 80 checks × 3s = 240s: above the honest worst case with ~60s of margin, and still a
 * hard stop — there is no server-side job timeout to lean on (the run is fire-and-forget
 * in-process), so this client-side bound is the final failsafe, sized so it cannot fire
 * before the backend could truly still be working. Bounded on purpose: an unbounded poll
 * on a run that died is a tab quietly hammering the API forever.
 */
const FINDING_POLL_MS = 3000
const FINDING_MAX_CHECKS = 80
/**
 * ⚑ 26 Aug (correction pass) — THE POLL BUDGET AND THE ELAPSED BOUND MUST BE THE SAME
 * NUMBER, because the wait can end in two different ways and they must agree:
 *   · the tab stayed open  → the poll hits `FINDING_MAX_CHECKS` and stops;
 *   · the tab was reopened → there is no poll history, so elapsed time is measured against
 *                            the durable start stamp instead (`PROOF_WAIT_MS`).
 * The bound itself lives beside the rule that reads it, in `lib/proof-start.ts`. This
 * assertion is what stops the two drifting into two different truths about one run.
 */
if (FINDING_POLL_MS * FINDING_MAX_CHECKS !== PROOF_WAIT_MS) {
  throw new Error('proof wait bound drifted: the desk poll budget and PROOF_WAIT_MS must match')
}

/**
 * Milla's opening line. FOUNDER-APPROVED 30 Aug, verbatim.
 *
 * ⚠️ NOT A TEMPLATE, AND NOT BRANCHED. Every earlier version of this greeting was assembled
 * from the client's lead count, pack balance and funding state — which is how "a flat $4 per
 * lead, final" ended up being the first thing a customer read. One approved sentence, no
 * interpolation, nothing for a future edit to slip a price into.
 */
const MILLA_GREETING =
  'Hi, I’m Milla. Tell me what you’re trying to achieve, and I’ll help shape the right programme from there.'

export default function MillaHomePage() {
  const router = useRouter()
  const [summary, setSummary] = useState<Summary | null>(null)
  // ⚑ 26 Aug — CAN WE REACH BACKEND TRUTH AT ALL? Three states, because collapsing them
  // lies in one direction or the other: 'loading' must not flash a wait state at a client
  // whose desk is simply empty, and 'unreachable' must not fall to "no leads waiting",
  // which would state as fact something the desk could not check. Once 'ok', a later poll
  // failure does NOT drop back — truth we already hold is still truth.
  const [serverState, setServerState] = useState<'loading' | 'ok' | 'unreachable'>('loading')
  // ⚑ 26 Aug — THE SERVER START WE ALREADY HELD WHEN A `/proof` CLAIM FAILED AMBIGUOUSLY.
  // `null` = not reconciling. Set once, never cleared by hand: the comparison in
  // `isReconciling` stops being true the moment the server hands back a newer start, so this
  // resolves itself and cannot get stuck on. Only a server-supplied value is ever stored.
  const [reconcileFrom, setReconcileFrom] = useState<number | null>(null)
  // #511f — the client's own Nexus, surfaced (the flywheel: they see Milla getting sharper).
  const [nexus, setNexus] = useState<{ learned: string; top_persona: string | null; reply_rate: number; meeting_rate: number; confidence: string; sample_worked: number } | null>(null)
  const [leads, setLeads] = useState<MaskedLead[] | null>(null)
  // ⚑ BUILD-004A-1 — PROGRAMME TRUTH ON THE HOME. Loaded beside the summary; a failure here
  // renders the locked sentence, never an empty programme.
  const [prog, setProg] = useState<CustomerProgramme | null>(null)
  // ── ⚑ 30 Aug (BUILD-004A-1, Option B) — WHAT THE CLIENT HAS SAID ABOUT EACH PROSPECT ──
  // A record of real reactions, keyed by lead. NOT a score, not a count of progress towards
  // anything, and nothing here is charged for. It exists so the card can acknowledge what
  // they just said, and so an optional note is attached to the RIGHT reaction.
  const [reacted, setReacted] = useState<Record<string, 'approve' | 'pass'>>({})
  /** Which card has its optional note box open, and what is in it. One at a time. */
  const [noteFor, setNoteFor] = useState<string | null>(null)
  const [noteText, setNoteText] = useState('')
  const [progFailed, setProgFailed] = useState<string | null>(null)
  const [acting, setActing] = useState<string | null>(null)
  // ⛓️ 30 Aug — READ-ONLY NOW, AND ALWAYS EMPTY ON THIS SCREEN. The only two writers were
  // the paid approve paths, both removed above. It is kept because `pendingRaw` and the
  // proof wait bound both read it, and because a reveal arriving from anywhere else must
  // still take that lead off the calibration set rather than showing it again.
  const [revealed] = useState<Record<string, Revealed>>({})
  // ⛓️ 30 Aug (BUILD-004A-1 live-walk) — THE `topUp` STATE IS GONE. It held the wallet
  // shortfall message raised by the paid approve paths; those were removed with the desk, so
  // nothing has been able to set it since. A state that can only ever be null is a rendered
  // wallet prompt waiting for someone to re-wire it.
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
      // ⛓️ 30 Aug (BUILD-004A-1, OPTION B) — THREE LEGS, AND THE MIDDLE ONE IS THE FIX.
      //
      // 🛑 THE DEFECT THIS REPLACES, IN MY OWN CODE. My first cut deleted the
      // `/leads/for-approval` fetch and substituted `/my/programme` IN ITS POSITION, resolving
      // the leads leg to `{ data: [] }`. So `leads` was permanently empty: the calibration
      // panel rendered, the cards were written, and a Proof client saw an empty set forever.
      // Nothing threw and nothing logged — the screen simply had no people on it.
      //
      // The two are DIFFERENT FACTS and now have their own legs. `/leads/for-approval` is the
      // free calibration set (masked, nobody contacted, no charge — it is only the paid
      // APPROVE that ever cost anything, and that path is gone from this file). `/my/programme`
      // is the customer's programme truth. Either can fail without blanking the other.
      const [sr, lr, pr] = await Promise.allSettled([
        api.get<{ data: Summary }>('/leads/milla-summary', tok),
        api.get<{ data: MaskedLead[] }>('/leads/for-approval', tok),
        api.get<{ data: CustomerProgramme }>('/my/programme', tok),
      ])
      // ⚠️ A FAILED PROGRAMME READ IS NOT AN EMPTY PROGRAMME. `/my/programme` answers 503 with
      // the locked sentence; that sentence is rendered, never "you have no programme".
      if (pr.status === 'fulfilled') { setProg(pr.value.data); setProgFailed(null) }
      else {
        const msg = pr.reason instanceof Error ? pr.reason.message : ''
        setProgFailed(msg && msg.length < 200 ? msg : MILLA_FAILURE_COPY.pipelineFailed)
      }
      if (sr.status === 'rejected' && lr.status === 'rejected') {
        throw sr.reason instanceof Error ? sr.reason : new Error('Failed to load your dashboard')
      }
      if (sr.status === 'rejected') setError('Some of your figures could not be loaded just now — the leads below are still correct.')
      if (lr.status === 'rejected') setError('Your leads could not be loaded just now — this is not the same as having none. Refresh in a moment.')
      const s = sr.status === 'fulfilled' ? sr.value : null
      const l = lr.status === 'fulfilled' ? lr.value : null
      // ⚑ 26 Aug — the summary leg failed. Only downgrade if we have never had it: a desk
      // holding a previously-loaded summary still has real server truth, and one bad poll
      // must not turn that into "we cannot reach the backend".
      if (!s) { setLeads(l?.data ?? []); setServerState(p => p === 'ok' ? 'ok' : 'unreachable'); return }
      if (l) setLeads(l.data)
      setSummary(s.data)
      setServerState('ok')
      // ⚑ 30 Aug (BUILD-004A-1) — THE APPROVED GREETING, AND ONLY IT.
      //
      // ⛓️ WHAT THIS REPLACES, AND WHY IT HAD TO GO WHOLESALE. The old opener branched four
      // ways and every branch taught the legacy model: "Approve the ones worth pursuing",
      // "**nothing is charged until you approve — then a flat $4 per lead, final**",
      // "**N of your 100 included leads** are still yours". A customer's FIRST SENTENCE from
      // Milla was the $4-per-lead pack — the exact truth the programme model removes.
      //
      // 🛑 ONE SENTENCE, FOUNDER-APPROVED, WORD FOR WORD. No branch on lead counts, no branch
      // on funding, no price clause. The outcome conversation is what opens the product now,
      // and the greeting is the founder's own words rather than four of mine.
      setMessages(m => [{ id: 'greet', role: 'assistant', content: MILLA_GREETING },
        ...m.filter(x => x.id !== 'greet')])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load your dashboard')
      // Same rule as the rejected-leg case above: only a desk that has NEVER had server
      // truth is unreachable. Repeated failure then reaches bounded recovery, never a
      // generic "no leads waiting" that the desk was in no position to assert.
      setServerState(p => p === 'ok' ? 'ok' : 'unreachable')
    }
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
  // ⚑ 26 Aug — ARE WE STILL WAITING TO LEARN WHETHER AN AMBIGUOUS CLAIM COMMITTED?
  //
  // `reconcileFrom` holds the `proof_started_at` this browser had ALREADY been given when a
  // `/proof` POST failed ambiguously. Until the server hands back a NEWER one, a summary
  // still showing the old pass proves nothing — the POST may simply not have committed yet.
  // Both values are the server's; this is a comparison of two server reads, not a clock.
  const reconciling = isReconciling(reconcileFrom, serverProofStartedAt(summary))
  // ⚠️ AND WHILE RECONCILING, THE START WE CAN SEE IS NOT THIS PASS'S. It belongs to the
  // pass we are trying to move on from, so using it would age a brand-new run by however
  // long the OLD one has existed — a Pass 1 start from half an hour ago would push a Pass 2
  // claimed seconds earlier straight past the bound and into the recovery card. Unknown (0)
  // is the truthful value here, and the bounded poll remains the whole budget.
  const currentStartedAt = reconciling ? 0 : serverProofStartedAt(summary)

  const terminalRun = useMemo(() => {
    // ⚑ 26 Aug — AN OLDER PASS CANNOT BE CURRENT TRUTH WHILE WE ARE STILL RECONCILING.
    //
    // THE RACE THIS CLOSES. After an ambiguous claim the desk re-reads at once, and that GET
    // can arrive BEFORE the original POST commits — returning the OLD pass perfectly
    // legitimately. Settling on it brought Pass 1's terminal card back and stopped the poll,
    // and the POST then committed Pass 2 into a desk that had already stopped looking.
    //
    // Returning null here is what makes it one line: every consumer — this render, the poll
    // guard and `proofWaitState` — reads `terminalRun`, so they are all corrected together
    // rather than each needing to learn about reconciliation.
    if (reconciling) return null
    const r = summary?.proof_run
    if (!r || !r.finished_at) return null
    const finishedAt = Date.parse(r.finished_at)
    if (!Number.isFinite(finishedAt)) return null
    // ⚑ 26 Aug — SCOPED BY THE SERVER'S OWN CLOCK. An outcome left by pass 1 must never
    // terminate pass 2's wait, and the fact that separates them is now `proof_started_at`,
    // which the claim advanced when pass 2 was taken. This used to compare against the URL's
    // `?since=` stamp — so a clean URL, another device or a lost POST response left it at 0
    // and let an OLD outcome end a NEW run's wait.
    //
    // ⚠️ 0 (no server stamp: a row predating the column) keeps the old, safe behaviour —
    // any completed run counts, which resolves to a truthful end state rather than an
    // endless spinner. Erring the other way is what shipped once already.
    return finishedAt >= serverProofStartedAt(summary) ? r : null
  }, [summary, reconciling])

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

      // ── ⚑ 26 Aug — THE PASS-2 CLAIM SUCCEEDED, SO PASS 1'S SNAPSHOT IS NOW STALE ────────
      //
      // ⚠️ THIS PAGE IS ALREADY MOUNTED AND `router.push` BELOW WILL NOT REMOUNT IT. It is a
      // same-route query change, so React keeps every piece of state: the Pass 1 summary,
      // the `finding` flag (whose effect has `[]` deps and never re-reads the URL), and
      // `findingTimedOut`. Without the three lines below the desk would read Pass 1's
      // `proof_run` against Pass 1's `proof_started_at`, call it terminal, and STOP POLLING —
      // leaving a client looking at Pass 1's result while Pass 2 was actually running.
      //
      // ⚠️ AFTER THE AWAIT, DELIBERATELY. A refused claim (the two-pass ceiling) throws to
      // the catch and never reaches here, so a valid Pass 1 desk is never blanked by a
      // refusal — only a claim the server actually granted invalidates anything.
      //
      // Nothing is invented: both proof fields become "unknown", which is precisely true for
      // a pass whose start only the server knows and whose outcome does not exist yet.
      setSummary(invalidateProofSnapshot)
      // Pass 1's exhausted poll must not end Pass 2's wait before it begins. This flag is
      // the second thing that survives the non-remount, and a stale `true` here would show
      // the recovery card instantly on a run that had just started.
      setFindingTimedOut(false)
      // ⚠️ `setFinding(true)` IS DELIBERATELY NOT CALLED, and that is not an oversight. The
      // `finding` flag is a URL hint whose mount effect will not re-run — but the wait does
      // not need it: `proofPassesDone > 0` from the refreshed summary is what makes the desk
      // wait, and the poll guard passes on `proofAwaiting` alone. Setting it here would also
      // breach the standing rule that nothing may switch `finding` back on inside this file
      // (`first-run-milla.test.ts` — a later empty desk must never reactivate a spent flag).
      // Fetch the new server state at once rather than waiting up to one poll interval for
      // it. The poll would get there on its own; this only makes the moment deterministic.
      void load()

      // ⚑ 26 Aug — `?finding=1` IS A HINT, NOT A CLOCK. It covers the one moment the server
      // cannot: between this navigation and the first summary landing. The run's actual
      // START was recorded by the claim itself (`clients.proof_started_at`), so no timestamp
      // is carried here and none is written to browser storage — there is no second source
      // of timing left to go stale, and the server's answer is the only one.
      router.push('/milla?finding=1')
    } catch (e) {
      // ── STAGE-ACCURATE, BECAUSE THE OLD SENTENCE COULD BE A LIE ────────────────────────
      // One generic message said *"Your targeting is saved"* for every failure — including
      // the ones where the save is exactly what failed. What a client is told here decides
      // whether they wait for us or go and change something themselves, so it has to match
      // what actually happened.
      const code = e instanceof Error ? e.message : ''
      const status = (e as { status?: number } | null)?.status

      // ── ⚑ 26 Aug — "WE DIDN'T HEAR BACK" IS NOT "NOTHING HAPPENED" ──────────────────────
      //
      // A Pass 2 POST can COMMIT on the server and still fail here — a 15s abort, a dropped
      // connection, a backgrounded tab. The browser cannot know which. Until this block, the
      // desk kept Pass 1's terminal card as current truth in exactly that case, so a client
      // could sit looking at Pass 1's result while Pass 2 was genuinely running, and only a
      // page reload would ever correct it.
      //
      // ⚠️ THE CLASSIFICATION IS STRUCTURED, NOT A MESSAGE MATCH. `lib/api.ts` sets
      // `status = 0` when `fetch` itself rejects and `status = res.status` when a response
      // arrived, so a 4xx is the server DECIDING (claim not made → Pass 1 is still current,
      // nothing is touched) while status 0 or a 5xx is no answer about the claim at all.
      //
      // ⚠️ GATED ON `proofAttemptedRef` so only failures at or after the POST reach this. The
      // earlier stages — stale preview, save failed, parked for review — never claimed
      // anything, and their Pass 1 desk must stay exactly as it is.
      //
      // The reconciliation is SELF-RESOLVING and guesses nothing: the refreshed summary
      // either shows Pass 2 (its clock takes over) or still shows Pass 1 (its terminal card
      // comes straight back). If the refresh itself fails, the invalidated snapshot leaves
      // the desk in the bounded wait rather than resurrecting a card we can no longer verify.
      if (proofAttemptedRef.current && classifyClaimFailure(status) === 'unknown') {
        // ⚠️ CAPTURED BEFORE THE INVALIDATION, from the summary this render still holds. It is
        // the start the SERVER had already given us, and reconciliation is over only when the
        // server hands back a newer one — a single re-read that still shows this value may
        // simply have overtaken a POST that had not committed yet.
        setReconcileFrom(serverProofStartedAt(summary))
        setSummary(invalidateProofSnapshot)
        setFindingTimedOut(false)
        void load()
      }

      setRefineErr(
        // ⛓️ 2 · REORDERED 26 Aug — A DEFINITIVE ANSWER OUTRANKS "WE DON'T KNOW".
        //
        // This branch used to sit BELOW the proof-attempted one, so the two-pass 409 — the
        // single status that PROVES the pass was not claimed — was described to the client
        // as *"we could not confirm the new search started"*. That is the ambiguity sentence,
        // and it is false here: the server told us plainly, and it even supplied the words.
        // Ordering was the whole bug; the copy itself was already right and is unchanged.
        //
        // `code` is the server's own sentence — the two-pass human handoff from the proof
        // route, or the waiting-revision conflict from `/icps/revise`. Both are definitive,
        // both are already written, and neither is invented here. The literal fallback is
        // the revise-conflict wording and only shows if the server sent no message at all.
        status === 409
          ? (code || 'You already have a targeting change waiting for K.I.N.D to review. Nothing has been changed and no new search has started.')
        // 4 · THE PROOF WAS ATTEMPTED and the answer was NOT definitive. Never invite a
        // retry and never claim the pass is definitely gone — we do not know. Only the
        // server does, and the block above has already started asking it.
        : proofAttemptedRef.current
          ? 'We saved your refinement, but we could not confirm the new search started. Please don\'t try again — K.I.N.D will check whether it began and come back to you.'
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

  // ⛓️ 30 Aug (BUILD-004A-1, Option B) — THE PICK-N BATCH APPROVE IS GONE FROM THE HOME.
  // `approveSelected` posted `/leads/approve-batch`, which reveals contacts and CHARGES. The
  // minimum-20 gate, the wallet shortfall message and the batch bar went with it. Calibration
  // is one free reaction at a time; the programme's money is the two 50% payments, and neither
  // of them is spent from this screen.

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
  // ⚑ 30 Aug (BUILD-004A-1, Option B) — RESTORED AS CALIBRATION, NOT AS THE PAID DESK.
  // ⛓️ Deleting it was the regression: replacing the approval desk took the FREE PROOF
  // reaction with it, a flow the founder's spec keeps. No price on any button — "Looks right"
  // writes no approval, reveals nothing, charges nothing, and what follows is a conversation.
  async function acceptProof(id: string) {
    setActing(id); setError(null)
    try {
      await api.post(`/leads/${id}/proof-accept`, {}, await token())
      // ⛓️ 30 Aug — THE PACK CHECKOUT IS NOT THE NEXT STEP. "Looks right" used to push
      // straight to the $299 ask. In the programme model what follows a calibration signal is
      // the RECOMMENDATION, and Milla opens that in conversation — so this records the signal
      // and navigates nowhere.
      setReacted(r => ({ ...r, [id]: 'approve' }))
    } catch {
      // ONE SENTENCE FOR EVERY FAILURE, and it claims nothing. Not that they were charged —
      // nothing here charges. Not when it will be fixed — we do not know. Not that we will
      // look again — we will not, automatically.
      setError('K.I.N.D couldn’t save what worked in that proof yet. K.I.N.D needs to check this before you go live.')
    } finally { setActing(null) }
  }

  // ⛓️ 30 Aug (BUILD-004A-1, Option B) — THE PER-LEAD PAID APPROVE IS GONE FROM THE HOME.
  // `POST /leads/:id/approve` reveals a contact and charges $4 for it. Nothing on a
  // calibration screen may do either, so the caller, the function and the reveal state it
  // wrote are all removed rather than left unwired — an unwired charge path is one onClick
  // away from being a live one.

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

  // ── ⚑ 30 Aug (BUILD-004A-1, Option B) — "TELL MILLA WHY", IN THEIR OWN WORDS ───────────
  //
  // The founder's third control on every card, and it is OPTIONAL in the strict sense: it is
  // never required to react, it never gates the next card, and it cannot fail in a way the
  // client sees. Same shape as the chip above — fire and forget.
  //
  // ⚠️ IT IS ATTACHED TO THE REACTION THEY ACTUALLY MADE. `lead_feedback` is keyed on
  // (client_id, lead_id, action), so filing a note about a prospect they said "Looks right"
  // to under `pass` would put their words on the opposite verdict. `reacted` holds what they
  // said; with no reaction yet, a note is a criticism by default and files as `pass`.
  //
  // ⚠️ STORED, NEVER PARSED. `lib/lead-feedback.ts` reads structured codes only and a human
  // reads the free text in Vida — the founder gated auto-parsing, and nothing here changes it.
  async function sendNote(leadId: string) {
    const text = noteText.trim()
    setNoteFor(null); setNoteText('')
    if (!text) return
    try {
      await api.post(`/leads/${leadId}/feedback`,
        { action: reacted[leadId] === 'approve' ? 'approve' : 'pass', free_text: text }, await token())
    } catch { /* never surfaced: their reaction stands, and a lost note is not their problem */ }
  }

  // #570 — pass() now reloads. It removed the row locally and never refreshed, so the KPI
  // still read "3 leads awaiting" after the client had passed all three — and with a desk
  // capped at 50, passing one never pulled the next one in. The screen disagreed with itself.
  // ⚑ 30 Aug (BUILD-004A-1, Option B) — RESTORED AS CALIBRATION, NOT AS THE PAID DESK.
  // ⛓️ Deleting it was the regression: replacing the approval desk took the FREE PROOF
  // reaction with it, a flow the founder's spec keeps. No price on any button — "Looks right"
  // writes no approval, reveals nothing, charges nothing, and what follows is a conversation.
  async function pass(id: string) {
    setActing(id); setError(null)
    try {
      await api.post(`/leads/${id}/pass`, {}, await token())
      setReacted(r => ({ ...r, [id]: 'pass' }))
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

  // ⛓️ 30 Aug (BUILD-004A-1, Option B) — `freeApproval`, `picked` and `togglePick` are gone.
  // They existed to say whether the NEXT $4 was covered by the pack and to hold a multi-select
  // for the batch approve. There is no charge and no selection on a calibration set.


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

  // ⚑ 26 Aug (correction pass) — A CLAIMED PROOF WITH NO OUTCOME MEANS **MAY STILL BE
  // RUNNING**, NOT **FAILED**. This is the fix for the defect in the first version.
  //
  // The predicate is unchanged — a pass was CLAIMED (the server-side counter says so), no
  // run outcome has ever been recorded, and there is nothing on the desk to show. What
  // changed is what it CONCLUDES. It used to render the recovery card the instant the page
  // loaded on a clean `/milla` URL, so a prospect who reopened the tab five seconds after
  // starting a perfectly healthy proof was told **"We hit a snag confirming your matches"**
  // about a run that was still legitimately working. A healthy proof can take ~160–180s
  // (see PROOF_WAIT_MS); declaring failure before that contradicts the bounded-wait rule
  // this same build introduced.
  //
  // It now means only "we are still waiting on this run", and feeds the SAME bounded wait a
  // `?finding=1` navigation gets — spinner until the bound, recovery after it. The clean
  // URL is no longer a different code path with a different verdict; it is the same one
  // reached without a query string.
  //
  // ⚠️ SERVER STATE ONLY, re-read on every load. Closing the browser changes none of it,
  // and the moment a terminal outcome or a real batch exists, those branches win outright:
  // they are rendered first, and `proof_run` makes this false by construction.
  // The decision itself lives in `lib/proof-start.ts` as a pure rule so it can be RUN in a
  // test rather than pattern-matched in this JSX — see that file. Here we only supply facts.
  const proofWait = proofWaitState({
    hasTerminalOutcome: !!terminalRun,
    pendingCount:       pending.length,
    revealedCount:      Object.keys(revealed).length,
    server:             serverState,
    proofPassesDone:    summary?.proof_passes_done ?? 0,
    serverStartedAt:    currentStartedAt,
    urlFinding:         finding,
    now:                Date.now(),
    pollExhausted:      findingTimedOut,
  })
  const proofAwaiting = proofWait !== 'none'
  const proofWaitEnded = proofWait === 'recovery'

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
    // ⚑ 26 Aug — the poll keeps running even after the bound has been declared, and that is
    // deliberate: a late outcome must still be able to replace the recovery card with the
    // truth (the run is fire-and-forget server-side, so "late" is a real case). It stays
    // bounded per page load, and it only ever READS.
    if ((!finding && !proofAwaiting) || pending.length > 0 || terminalRun) return
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
  }, [finding, proofAwaiting, pending.length, load, terminalRun])
  // ⛓️ 30 Aug (BUILD-004A-1, Option B) — THE MINIMUM-20 GATE IS GONE FROM THE HOME. It
  // mirrored lib/approval-batch.ts so the browser could explain a paid batch refusal. The
  // server rule is untouched and still refuses under 20 wherever a paid batch is attempted;
  // what is removed is this screen's ability to attempt one.
  // ── ⚑ 30 Aug (BUILD-004A-1 live-walk) — THE STAGE DECIDES WHETHER SENDING IS A FACT YET ──
  //
  // 🛑 WHAT THE FOUNDER SAW, AND WHY IT WAS NOT A COPY BUG. The conversation header read
  // "Paused — we'll tell you why" while the Stage card two inches above read "Proof — current"
  // and three calibration prospects sat waiting for him. One screen, two contradictory claims.
  //
  // THE CAUSE IS TWO INDEPENDENT SOURCES, ONE OF WHICH IS NOT ABOUT THE PROGRAMME AT ALL:
  //   · `prog.stage` comes from `/my/programme` → `millaStage(programmes.status)`, and NO
  //     programme row is a real answer meaning Proof (my-programme.ts:107).
  //   · this widget comes from `summary.campaign_status` — the newest `figsy_campaigns` row
  //     (milla-summary.ts:102), the internal OUTREACH object, which every legacy client has
  //     regardless of whether a programme exists.
  //
  // So a client with a legacy purchase and no programme row is at stage Proof with a stale
  // `figsy_campaigns` row sitting at `paused`. `needsGoLive` does not catch it either: it
  // reads `has_funded`, which is TRUE for exactly that client, so the guard above falls
  // through to the campaign status.
  //
  // ⚠️ AND `paused` THERE IS NOT A PROGRAMME PAUSE. Programme pause is `programmes.paused_at`
  // — deliberately NOT a stage, because pause is orthogonal to the journey
  // (programme-stage.ts:76) — and it is a different state again from a REVIEW hold. Reading a
  // campaign row's status as "your programme is paused" collapses three distinct facts into
  // one sentence, and tells a customer we stopped something we never started.
  //
  // THE FIX IS THE GATE, NOT THE WORDS. Before outreach can have run, this widget states the
  // function's own existing default. Every label below is unchanged; what changed is which
  // stages are allowed to reach the campaign-derived ones.
  const OUTREACH_STAGES: MillaStage[] = ['Live', 'Review', 'Completion']
  // ⚠️ AN UNKNOWN STAGE FALLS BACK TO THE FLAT LIST, deliberately. While `/my/programme` is
  // loading — or has failed — the row must not silently become a different set of questions,
  // and a chip that merely does not apply is a far smaller harm than a chip row that flickers.
  const chips = !prog ? CHIPS : [
    STAGE_QUICK_ACTION[prog.stage],
    ...(prog.stage === 'Proof' ? PROOF_CHIPS : []),
    ...(PAUSE_STAGES.includes(prog.stage) ? ['Please pause my programme'] : []),
    ...(ROI_STAGES.includes(prog.stage) ? ['How is my ROI looking?'] : []),
  ]
  const sendState = (() => {
    // Founder-locked wording, 3 Sep. CUSTOMER-FACING ONLY — Vida/operator terminology is
    // untouched, and this constant is not shared with it.
    const idle = { label: 'Outreach hasn’t started', tone: 'text-[#5c5279]', dot: 'bg-[#b3a9cc]' }
    // ⛓️ CORRECTED 3 Sep — "ONLY WHEN THE STAGE IS KNOWN" DID THE OPPOSITE OF WHAT IT SAID.
    // The guard was `prog && !OUTREACH_STAGES...`, so an UNKNOWN programme — still loading, or
    // the read failed — skipped it entirely and fell through to the campaign-derived labels.
    // The one moment we know least is the one moment it asserted most: a legacy client with a
    // stale `figsy_campaigns` row would flash "Programme live" while `/my/programme` was in
    // flight. Unknown now means idle, which is the only honest thing this widget can say.
    if (!prog || !OUTREACH_STAGES.includes(prog.stage)) return idle
    // 🛑 AND NO PROGRAMME MEANS NO PROGRAMME STATUS, whatever campaign rows exist. `stage`
    // cannot say this — DRAFT and none are both 'Proof' — so it is asked directly.
    if (prog.hasProgramme === false) return idle
    if (needsGoLive) return { label: 'Not started', tone: 'text-[#b45309]', dot: 'bg-amber-500' }
    const st = summary?.campaign_status
    // ⛓️ 30 Aug (BUILD-004A-1 live-walk, FOUNDER DECISION 3) — "Campaign" → "Programme" in
    // the two labels a CUSTOMER reads. Terminology only: the state still comes from
    // `figsy_campaigns.status`, the internal delivery object, whose name is untouched
    // everywhere it is not customer-facing. The customer bought a programme; "campaign" is
    // our word for how we run it.
    if (st === 'active') return { label: 'Programme live', tone: 'text-[#059669]', dot: 'bg-emerald-500' }
    if (st === 'paused' || st === 'paused_low_performance') return { label: 'Paused — we\u2019ll tell you why', tone: 'text-[#b45309]', dot: 'bg-amber-500' }
    if (st === 'completed' || st === 'archived') return { label: 'Programme finished', tone: 'text-[#5c5279]', dot: 'bg-[#b3a9cc]' }
    if (st === 'draft') return { label: 'Being set up', tone: 'text-[#5c5279]', dot: 'bg-[#b3a9cc]' }
    return idle
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
        // ⛓️ THE PACK STEP AND THE "PICK THE ONES WORTH TALKING TO" STEP ARE REMOVED.
        // Both taught the legacy model — a $299 pack counting down, and a per-lead approval
        // desk. Neither exists in the programme model, and a tour that teaches a product we
        // no longer sell is worse than no tour.
        { target: 'leads',     title: 'Your programme', body: 'This is where your programme lives — the outcome you asked for, what stage it is at, and what is waiting on whom.' },
        { target: 'chat',      title: 'Milla, any time', body: "Ask for more people, change who we're targeting, or tell me a lead was wrong. I'm how you steer it — there are no forms." },
        { target: 'kpi-meetings', title: 'What it comes back as', body: 'Booked meetings. We answer the replies, qualify them and put the meeting in your calendar — you just turn up.' },
      ]} />
      {/* ⛓️ 30 Aug (BUILD-004A-1) — THE $299 GO-LIVE BANNER IS REMOVED.
          It read "Go live — your first 100 leads are $299 … After the first 100 it's a flat
          $4 a lead". That is the legacy pack, and the live customer path has no legacy
          customers left. Going live is now a programme moment, and the Next card above says
          who it is waiting on. */}
      {/* ⚑ 30 Aug (BUILD-004A-1) — THE FOUR APPROVED CARDS.
          Replaces the pack/wallet KPI row: "Leads included · of your 100 · then $4 each",
          the wallet-balance card with its per-lead price line, the leads-awaiting card, and
          "waiting on your $299". Every one of those was the legacy economics, and there are no
          legacy customers left on the live path to serve them to.

          ⚠️ FOUR CARDS, EXACTLY AS SPECIFIED: outcome + target · current stage · progress
          toward outcome · next action / what Milla needs. No fifth card was invented. */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <KPI hero k="Outcome"
          v={prog?.outcome.target ? String(prog.outcome.target) : '—'}
          s={prog?.outcome.target ? 'booked meetings' : 'not set yet'} />
        <KPI k="Stage" v={prog ? prog.stage : '…'}
          s={prog?.paused ? 'paused' : prog?.reviewOpen ? 'review' : 'current'}
          tone={prog?.paused || prog?.reviewOpen ? '#b45309' : undefined} />
        {/* 🛑 null IS "WE COULD NOT READ IT", NEVER ZERO. Rendering a storage failure as
            "0 meetings booked" tells a client their programme has produced nothing. */}
        <KPI k="Progress"
          v={prog ? (prog.progress.outcomesAchieved === null ? '—' : String(prog.progress.outcomesAchieved)) : '…'}
          s={prog && prog.progress.outcomesAchieved === null ? 'not available right now' : 'meetings booked'}
          tone="#059669" />
        <KPI k="Next" v={prog ? nextActionFor(prog) : '…'} s="what Milla needs" />
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
              {chips.map(c => <button key={c} onClick={() => send(c)} disabled={sending} className="text-[12.5px] font-semibold text-[#7C3AED] bg-[#f3ecff] border border-[#e4d4fb] rounded-full px-3 py-1 hover:bg-[#ebe0fc] disabled:opacity-50">{c}</button>)}
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
        {/* ⚑ 30 Aug (BUILD-004A-1) — THE PROGRAMME STAGE WORKSPACE.
            ⛓️ THIS WAS THE PER-LEAD APPROVAL DESK: "New leads · masked · no charge yet", the
            per-lead cards, the Approve button that charged per lead, the proof-accept
            path and the wallet top-up banner. The programme model has ONE approval, not one
            per lead, so the desk is gone rather than hidden.

            ⚠️ THE SAME COMPONENT `/milla/programme` RENDERS. One implementation, two surfaces,
            so the home and the Programme page can never show different numbers for one
            programme — which is the whole reason it was extracted. */}
        <aside data-tour="leads" className="flex-1 min-w-0 bg-white border border-[#eee7f7] rounded-2xl flex flex-col min-h-0">
          {/* ⛓️ 3 Sep — THE HEADING WAS THE LIE, AND IT WAS UNCONDITIONAL. It said "Your
              programme" to a client who has no programme, over a list of records from a
              retired desk. A founder screenshot of House found exactly that. The panel now
              names what is actually beneath it. */}
          <div className="px-4 py-3 border-b border-[#eee7f7] flex items-center gap-2 flex-wrap">
            <b className="text-[15px]">{prog?.hasProgramme === false ? 'Your workspace' : 'Your programme'}</b>
          </div>
          {/* ⚑ 30 Aug (BUILD-004A-1, Option B) — TWO SURFACES, CHOSEN BY STAGE.
              ⛓️ MY FIRST CUT REPLACED THE DESK UNCONDITIONALLY and took the FREE PROOF
              calibration with it — a flow the founder's spec keeps. A prospect at Proof landed
              on a programme workspace with nothing to react to. Fifteen guards caught it.
              At PROOF the client gets the calibration set; at every other stage, the programme
              workspace. The paid desk is gone from both: no price on any button, no wallet, no
              pick-N gate, no per-lead approve. */}
          {progFailed ? (
            <div className="px-3.5 py-3">
              <div className="text-[13px] text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{progFailed}</div>
            </div>
          ) : !prog ? (
            <div className="px-3.5 py-3"><p className="text-[14px] text-[#9b8ec4]">Loading your programme…</p></div>
          ) : prog.hasProgramme !== false ? (
            /* ⛓️ 3 Sep — THIS BRANCHED ON `stage !== 'Proof'`, AND THAT IS NOT THE QUESTION.
               `millaStage` maps a DRAFT programme AND no programme at all to 'Proof', so a
               client WITH a programme fell into the legacy client-scoped desk below and saw
               their own history presented as current programme work. The question the branch
               actually asks is "does a programme exist", and `hasProgramme` is that fact. */
            <div className="px-3.5 py-3 overflow-y-auto">
              <ProgrammeWorkspace p={prog} />
              {/* ⚑ 3 Sep (PR B) — REVIEW + THE ONE APPROVAL, AT THE APPROVAL STAGE ONLY.
                  `millaStage` maps BOTH `READY_FOR_APPROVAL` and `APPROVED` to 'Approval', so
                  this covers the before and the after of the customer's single act: the
                  prospects and the button, then the approved state and the same prospects.
                  ⚠️ THE WORKSPACE ABOVE IS UNTOUCHED. It still renders exactly as it did at
                  every stage including this one — the review is added beneath it, never in
                  place of it, because the stage rail and the money facts are still true. */}
              {prog.stage === 'Approval' && (
                <div className="mt-4 pt-4 border-t border-[#eee7f7]">
                  <ProgrammeReview token={token} />
                </div>
              )}
            </div>
          ) : (
          <div className="px-3.5 py-3 overflow-y-auto grid gap-2.5 grid-cols-1 [@media(min-width:1100px)]:grid-cols-2 [@media(min-width:1600px)]:grid-cols-3 items-start content-start">
            {/* the wallet top-up banner is gone with the paid desk */}
            {/* ⛓️ 3 Sep — THIS SET IS NOT A PROGRAMME, AND IT NOW SAYS SO.
                This branch is reached ONLY when no programme row exists, and the list beneath
                it comes from `/leads/for-approval`, which is scoped to `client_id` and has no
                time bound at all ("NO TIME LIMIT ON PAID LEADS", founder-locked 25 Jul). For a
                client with history that is history: House's retired desk rendered here as
                three prospect cards under a heading that said "Your programme".
                🛑 NOTHING IS HIDDEN AND NOTHING IS DELETED — the founder's second acceptable
                option, taken because the first (show nothing) would also blank the FREE PROOF
                calibration set, which is the launch acquisition motion and legitimately lives
                on this screen. The records stay; the claim that they are a current programme
                does not. */}
            {leads && leads.length > 0 && (
              <div className="[@media(min-width:1100px)]:col-span-2 [@media(min-width:1600px)]:col-span-3 bg-[#faf8ff] border border-[#ece5fb] rounded-2xl px-4 py-3">
                {/* Founder-locked wording, 3 Sep. Verbatim — no extra explanation. */}
                <div className="text-[13px] text-[#4c4368] font-semibold">Earlier activity</div>
                <div className="text-[12.5px] text-[#6b6288] mt-0.5">
                  You don’t have an active programme yet. These are examples you’ve previously reviewed to help Milla learn what fits.
                </div>
              </div>
            )}
            {error && <div className="text-[13px] text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{error}</div>}
            {!leads && !error && <p className="text-[14px] text-[#9b8ec4]">Loading…</p>}
            {/* the #570 subset disclosure went with the capped approval list */}
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
            {/* ⛓️ 30 Aug — THE "APPROVED · CONTACT" CARD IS GONE. It was the receipt for a paid
                per-lead approve: a revealed email and "working it now". Calibration reveals
                nobody and contacts nobody, so there is no receipt to render. */}
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
              ) : proofAwaiting ? (
                <div className="text-[14px] text-[#9b8ec4] bg-[#faf8ff] border border-[#ece5fb] rounded-2xl px-4 py-10 text-center">
                  <div className="text-[15px] font-bold text-[#5c5279]">
                    {/* ⚑ 26 Aug — THE WAIT IS BOUNDED. When the poll exhausts and the server
                        still has no terminal outcome for this run — persistence failed, the
                        row is missing, or /milla-summary itself kept erroring — the desk
                        stops claiming to be searching. It says the approved recovery line
                        instead. No spinner runs forever, and no client-side guess becomes a
                        result: this branch only ever renders when `terminalRun` is absent,
                        so real backend truth always wins.

                        ⛓️ CORRECTION PASS — `proofAwaiting` JOINS `finding` HERE rather than
                        getting its own branch below. A clean-URL reopen used to fall to a
                        separate card that said "We hit a snag" IMMEDIATELY, with no elapsed
                        time considered at all; now it enters this identical bounded wait, so
                        a claimed proof at 30s or 90s reads "Finding your matches now…" and
                        only crosses to the recovery line once the bound is genuinely past.
                        One wait, one bound, one verdict — whether or not the URL has a
                        query string. */}
                    {proofWaitEnded ? 'We hit a snag confirming your matches' : 'Finding your matches now…'}
                  </div>
                  <div className="text-[13px] mt-1.5">
                    {/* ⚠️ Real apostrophes, NOT &rsquo;. These are JS string literals inside an
                        expression container, so an HTML entity is not decoded — it renders as
                        the literal text "We&rsquo;re". Entities only work in JSX text nodes,
                        which is what the paying-client line below is. */}
                    {proofWaitEnded
                      /* Approved recovery copy, verbatim. No retry offered, no timing
                         promised, and no technical detail — the diagnosis is in the alert. */
                      ? 'Your setup is saved and has been flagged for K.I.N.D review. You won’t need to start again.'
                      : 'Real people who match your targeting. They’ll appear here as soon as we have them — masked, free, and nobody is contacted.'}
                  </div>
                </div>
              ) : (
                <div className="text-[14px] text-[#9b8ec4] bg-[#faf8ff] border border-[#ece5fb] rounded-2xl px-4 py-10 text-center">Nothing to react to right now.</div>
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
                    {/* ⚑ 26 Aug — SAY HOW MANY, because the number is the honest part.
                        A short batch is not a failure and must not be dressed as a full
                        one: the heading states the actual count and claims nothing about
                        a target, promises no more to come, and offers no retry. Shown
                        only in proof mode, where a batch is a countable set. */}
                    {showBatchLabels && (
                      <span className="ml-1.5 font-bold text-[#9b8ec4] normal-case tracking-normal">
                        · {pending.filter(x => batchKey(x) === batchKey(l)).length} {pending.filter(x => batchKey(x) === batchKey(l)).length === 1 ? 'match' : 'matches'}
                      </span>
                    )}
                  </div>
                )}
                {/* ⛓️ THE CARD IS NO LONGER SELECTABLE. The pointer cursor and the picked
                    highlight both belonged to the pick-N gate; a calibration card is reacted
                    to, not chosen. The "we'd start here" emphasis stays — it is a steer, not
                    a selection. */}
                <div
                  className={`rounded-2xl p-3.5 transition-shadow ${
                    l.recommended ? 'border-[1.5px] border-[#d9c4fb] bg-[#fcfaff]' : 'border border-[#ece5fb]'}`}>
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
                      {/* ⛓️ 30 Aug (BUILD-004A-1, Option B) — THE THREE CONTROLS THE FOUNDER
                          SPECIFIED, AND ONLY THOSE: Looks right · Not a fit · an optional
                          "Tell Milla why". What was here instead: the proof signal, a pick-N
                          selection gate, and a paid per-lead approve carrying a price. The
                          last two were the paid desk and are gone — no button on this card
                          reveals a contact, spends a pass or costs anything. */}
                      <div className="flex gap-1.5 mt-2.5">
                        <button disabled={busy || !!reacted[l.id]} onClick={e => { e.stopPropagation(); void acceptProof(l.id) }}
                          className="flex-1 text-[13px] font-bold text-white rounded-lg py-2 bg-gradient-to-br from-[#7C3AED] to-[#EC4899] disabled:opacity-50">
                          {/* ⚠️ THE ACKNOWLEDGEMENT IS ONE WORD AND PROMISES NOTHING. Not that
                              anything starts, not that anyone is contacted, not what it is
                              worth — it states only that the reaction was recorded. */}
                          {busy ? 'Saving…' : reacted[l.id] === 'approve' ? 'Noted' : '👍 Looks right'}
                        </button>
                        <button disabled={busy} onClick={e => { e.stopPropagation(); pass(l.id) }} className="text-[13px] font-semibold text-[#5c5279] rounded-lg py-2 px-3 border border-[#ece5fb] disabled:opacity-50">Not a fit</button>
                      </div>
                      {/* THE OPTIONAL THIRD CONTROL. Ignoring it costs nothing and blocks
                          nothing; it is a text box, not a step. */}
                      {noteFor === l.id ? (
                        <div className="flex gap-1.5 mt-1.5" onClick={e => e.stopPropagation()}>
                          <input autoFocus value={noteText} onChange={e => setNoteText(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); void sendNote(l.id) } }}
                            placeholder="Tell Milla why"
                            className="flex-1 min-w-0 text-[12.5px] rounded-lg border border-[#e4dcf7] px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/30" />
                          <button onClick={e => { e.stopPropagation(); void sendNote(l.id) }}
                            className="text-[12.5px] font-bold text-white rounded-lg px-3 bg-[#7C3AED]">Send</button>
                        </div>
                      ) : (
                        <button onClick={e => { e.stopPropagation(); setNoteFor(l.id); setNoteText('') }}
                          className="text-[12px] font-semibold text-[#9b8ec4] mt-1.5 hover:text-[#7C3AED]">
                          Tell Milla why
                        </button>
                      )}
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
            {/* ⚑ THE STOP IS NOT OPTIONAL. Two proof passes is the server's hard limit, and a
                client who has spent both must be told so plainly — with no third action offered
                anywhere near it. Founder-approved wording, verbatim.
                ⛓️ 30 Aug — RESTORED. Rebuilding the panel dropped it, which left an exhausted
                client staring at a set with no statement of where they stand. */}
            {proofExhausted && (
              <div className="mt-2 rounded-2xl border border-[#ece5fb] bg-[#faf8ff] px-4 py-3 text-[13px] text-[#5c5279]">
                We&rsquo;ve used both proof passes. K.I.N.D will review this with you.
              </div>
            )}
            {/* ⛓️ NO PRICE FOOTER. It carried the per-lead price and, in proof, a promise that
                reacting takes you live. Neither is true of calibration, and the price string
                itself is forbidden on this file by name — so it is not quoted here either. */}
          {/* ⛓️ THE PICK-N BATCH BAR IS GONE. "Start work on N →" belonged to the paid
              desk: pick twenty, approve them together, charge for them. Calibration is one
              reaction at a time and costs nothing. */}
          </div>
          )}
        </aside>
      </div>

      {/* #511f — what Milla's learning for this client (the flywheel)
          ── ⚑ 30 Aug (BUILD-004A-1 live-walk) — STAGE-GATED. ────────────────────────────
          🛑 WHAT THE FOUNDER SAW AT PROOF: "Milla is learning which messages land best for
          you", beside "Reply rate 0.4%" and "Meeting rate 0%". At Proof nothing has been
          sent, so none of those three is a fact about this customer's programme.

          THE CAUSE IS THAT THIS CARD HAS NO STAGE AT ALL. Every field it renders comes from
          `/leads/nexus-summary` → `getNexusProfile`, which is entirely OUTREACH performance:
          reply rate, meeting rate, best-converting persona, winning subject lines. Its only
          condition is `sample_worked > 0` — a lifetime count — so a client carrying legacy
          outreach history is shown message-performance learning at a stage where no message
          exists. The branch that produced that exact sentence is `sample_worked >= 20` with
          no persona resolved (leads.ts:392).

          SO IT IS GATED, NOT RE-WORDED. Outreach learning renders once outreach is a real
          thing — Live, Review, Completion — and the numbers it shows are then true.

          ⚠️ WHAT THIS DELIBERATELY DOES NOT DO. It does not substitute a Proof-stage learning
          sentence about who looks right and how the ICP is being refined. That is the right
          card and the founder has approved no wording for it, so it is returned for sign-off
          rather than invented here. Showing nothing states nothing false; showing a sentence
          I wrote would put my words in Milla's voice on the customer's first screen. */}
      {nexus && nexus.sample_worked > 0 && prog && OUTREACH_STAGES.includes(prog.stage) && (
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
