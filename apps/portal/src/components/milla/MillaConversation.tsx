'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { api, AI_TURN_TIMEOUT_MS } from '@/lib/api'
import { createClient } from '@/lib/supabase/client'
import {
  STAGE_QUICK_ACTION, type MillaStage,
  // ⚑ 10 Sep (C01) — THE FAILURE RULES AND THE DIFF SENTENCE ARE NOT WRITTEN HERE. They are
  // rules a client reads about their own targeting, so they live in `@kind/shared` where a
  // test can run them; see `targeting-refinement.ts` for the four failures that were all
  // wearing "I hit a snag reaching the engine".
  refinementFailureMessage, chatFailureMessage, isRetryableOnce, REFINEMENT_RETRIES,
  REVISE_STATE_CHANGED_CODE, TARGETING_UNCHANGED_SENTENCE,
  // ⚑ 15 Sep (O1) — the one sentence a customer typed on the way here, claimed once.
  claimMillaHandoff,
} from '@kind/shared'

// ── ⚑ 4 Sep — THE ONE MILLA CONVERSATION (founder-approved shell) ────────────────────────
//
// 🛑 WHAT THIS REPLACES. The conversation lived INSIDE the Milla home page component, so it
// was a child of the route. Navigating to Meetings, Programme, Reports, Documents or My ICP
// unmounted it: the transcript, the session id and the composer's contents were destroyed,
// and coming back re-fetched a fresh thread. On My ICP a SECOND transcript with its own
// composer and its own Send button sat inside a drawer — two Millas on one product.
//
// ⚠️ ONE INSTANCE · ONE TRANSCRIPT · ONE COMPOSER · ONE CONVERSATION STATE. This component is
// mounted exactly once, by `MillaShell`, beside the working area. Routes render their
// workspace content; none of them owns a conversation. A route that needs Milla to be talking
// about ITS subject calls `focus(...)` on the context below — it does not build a second one.
//
// ⚠️ THE ICP TRANSPORT IS KEPT, NOT THE ICP CHAT WIDGET. `/icps/chat-build` and
// `/icps/revise` are the client's real targeting-change path (M4) and they still run,
// unchanged, with the same explicit save. What is gone is the duplicate transcript, bubbles,
// composer and Send that used to carry them.

type Msg = { id: string; role: 'user' | 'assistant'; content: string }

/** The targeting a `/icps/chat-build` turn may propose. Identical shape to the M4 drawer's. */
type IcpDraft = {
  name?: string; industries?: string[]; job_titles?: string[]; seniority_levels?: string[]
  company_sizes?: string[]; geographies?: string[]; tech_stack?: string[]; keywords?: string[]
}

type Programme = { stage: MillaStage; hasProgramme?: boolean }
/** Only the two fields the handle's rule reads. The My ICP screen reads the same endpoint. */
type Icp = { id: string; is_active: boolean | null }
type Summary = {
  has_funded: boolean
  icp_versions: { version: string }[]
  campaign_status?: 'draft' | 'active' | 'paused' | 'paused_low_performance' | 'completed' | 'archived' | null
  calibration_set_on_desk?: boolean
}

async function token(): Promise<string | undefined> {
  try { const { data } = await createClient().auth.getSession(); return data.session?.access_token } catch { return undefined }
}

/** How the transport reports a failure. `code` arrives via `lib/api.ts` (C01). */
type ApiFailure = Error & { status?: number; code?: string }
const failureOf = (e: unknown): ApiFailure => (e ?? new Error('unknown')) as ApiFailure

/**
 * ⚑ 10 Sep (C01) — RUN IT, AND RE-SEND IT ONCE IF WE GOT NO ANSWER ABOUT IT.
 *
 * 🛑 EXACTLY ONE RETRY, AND ONLY FOR "NO ANSWER". `isRetryableOnce` draws that line
 * (status 0 or 5xx); a 4xx is the server DECIDING and re-asking a decision just produces the
 * identical refusal — which is what the old single sentence invited a client to do forever
 * against a 409.
 *
 * ⚠️ SAFE ONLY BECAUSE `/icps/revise` IS IDEMPOTENT. A lost response is not a lost write, so
 * a blind retry could have minted a second ICP version; the route now compares the incoming
 * targeting against the row it would write and returns it untouched when they match. The two
 * halves of that guarantee shipped together on purpose.
 */
async function withOneRetry<T>(run: () => Promise<T>): Promise<T> {
  let attempts = 0
  for (;;) {
    try { return await run() } catch (e) {
      attempts += 1
      if (attempts > REFINEMENT_RETRIES || !isRetryableOnce(failureOf(e).status)) throw e
    }
  }
}

// ⛓️ MOVED, NOT REWRITTEN (was `apps/portal/src/app/(milla)/milla/page.tsx`). Every constant,
// condition and string below is the wording already approved for this row; what changed is
// which component owns it.
//
// Milla answers; she does not act. "Pause campaign" and "Find more like these" used to read
// as buttons that did those things — they don't, and the message went into a table nobody
// read. It now pages the operator and appears in Vida → Asks, so these are honest REQUESTS
// rather than controls: phrased as asking us, because that is what actually happens.
// ── 🛑 10 Sep (C06) — "PLEASE FIND MORE LIKE THESE" IS GONE, AND IT WAS NOT COPY ─────────
//
// It was a chip that sent a request for MORE PEOPLE into a chat that cannot source anyone.
// The founder's ruling: there is no separate paid sourcing from chat, from a card, or as
// "find more like these" — the ONE way to a second set is the improved-set ACTION on the
// Proof panel, which the server gates (`proofUiState`) and which spends the second of two
// automatic passes. A chip asking Milla for more either did nothing, which teaches the
// client the product ignores them, or would have to become a spend control with no server
// rule behind it.
//
// ⚠️ THE QUESTION CHIP STAYS. "Which of these look strongest?" asks her about the set she
// can now actually see (C06's context block), and answering it costs nothing.
const PROOF_CHIPS = [
  'Which of these look strongest?',
]
/** Only where a programme exists and is running — not before it starts, not once it ends. */
const PAUSE_STAGES: MillaStage[] = ['Sourcing', 'Approval', 'Live', 'Review']
/** Only once outreach has had the chance to produce something to measure. */
const ROI_STAGES:   MillaStage[] = ['Live', 'Review', 'Completion']
const CHIPS = [
  ...PROOF_CHIPS,
  'Please pause my programme',
  'How is my ROI looking?',
]
/**
 * The stages at which outreach can actually have run.
 *
 * ⚠️ EXPORTED, so the home's "What Milla's learning for you" card reads THE SAME LIST. It was
 * declared inside the home component; lifting the conversation would otherwise have left two
 * copies of one rule in two files, which is exactly how the send-state and the learning card
 * would drift apart.
 */
export const OUTREACH_STAGES: MillaStage[] = ['Live', 'Review', 'Completion']

/**
 * Milla's opening line. FOUNDER-APPROVED 30 Aug, verbatim.
 *
 * ⚠️ NOT A TEMPLATE, AND NOT BRANCHED. Every earlier version of this greeting was assembled
 * from the client's lead count, pack balance and funding state — which is how "a flat $4 per
 * lead, final" ended up being the first thing a customer read. One approved sentence, no
 * interpolation, nothing for a future edit to slip a price into.
 */
/** The handle's shell, drawn once so the two targets cannot drift into two designs. */
const HANDLE = 'md:hidden shrink-0 block w-full border-t border-[#eee7f7] bg-white px-4 pt-2 pb-3 rounded-t-2xl shadow-[0_-8px_22px_rgba(124,58,237,0.07)]'
const HANDLE_GRAB = 'block w-9 h-1 rounded-full bg-[#e3daf7] mx-auto mb-2'

const MILLA_GREETING =
  'Hi, I’m Milla. Tell me what you’re trying to achieve, and I’ll help shape the right programme from there.'

/**
 * What the ONE conversation is currently talking about. `null` = the general thread.
 *
 * ⚑ 7 Sep — `icp-fresh` IS A THIRD VALUE, NOT A FLAG ON `icp`, and the distinction is the
 * whole fix. `icp` REFINES the live targeting and saves through `/icps/revise`, which parks
 * the change on the existing row. `icp-fresh` is a NEW definition for a new market or a new
 * programme: it saves through `/icps/fresh`, which inserts an INACTIVE new version and leaves
 * the live one exactly as it is. Same conversation, same composer, same proposal endpoint —
 * only the destination of the explicit Save differs.
 */
type ConversationContext = 'icp' | 'icp-fresh' | null

/** Both ICP contexts share the proposal builder; only the save destination differs. */
const isIcpContext = (c: ConversationContext): boolean => c === 'icp' || c === 'icp-fresh'

type MillaConversationApi = {
  /**
   * Put the ONE conversation into a context and focus its composer.
   *
   * ⚠️ THIS IS NOT "OPEN A CHAT". There is only ever one, and it is already on screen; this
   * says what it is talking about and puts the cursor in it.
   */
  focus: (context?: ConversationContext) => void
  /**
   * A route that has already fetched the calibration set publishes its size here, so the chip
   * row uses the SAME fact the list beside it was built from.
   *
   * ⚠️ `null` MEANS "THIS ROUTE DID NOT LOOK", never "there is none". The conversation then
   * falls back to `calibration_set_on_desk` — the server's own answer to exactly this
   * question, added 3 Sep so a chip row and a desk cannot disagree.
   */
  publishDeskSet: (count: number | null) => void
  /** Bumped whenever a targeting revision is saved, so the ICP screen re-reads its versions. */
  icpRevision: number
}

const Ctx = createContext<MillaConversationApi | null>(null)

/**
 * Read the ONE conversation's controls.
 *
 * Safe outside the provider (the `/milla/welcome` onboarding screen renders bare), where it
 * answers with inert no-ops rather than throwing.
 */
export function useMillaConversation(): MillaConversationApi {
  return useContext(Ctx) ?? INERT
}
const INERT: MillaConversationApi = { focus: () => {}, publishDeskSet: () => {}, icpRevision: 0 }

export function MillaConversationProvider(
  { children, handleOpen, handleHidden }: {
    children: React.ReactNode
    /** Phone only — raise Home's own workspace over this conversation. */
    handleOpen?: () => void
    /** Phone only — the workspace is already covering, so the handle has nothing to offer. */
    handleHidden?: boolean
  },
) {
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Msg[]>([{ id: 'greet', role: 'assistant', content: MILLA_GREETING }])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [context, setContext] = useState<ConversationContext>(null)
  const [icpDraft, setIcpDraft] = useState<IcpDraft | null>(null)
  const [icpRevision, setIcpRevision] = useState(0)
  const [icpSaving, setIcpSaving] = useState(false)
  const [deskSet, setDeskSet] = useState<number | null>(null)
  const [prog, setProg] = useState<Programme | null>(null)
  const [summary, setSummary] = useState<Summary | null>(null)
  const [icps, setIcps] = useState<Icp[] | null>(null)
  const chatBodyRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // The two facts the header pill and the chip row are derived from. Settled separately: one
  // failing must not blank the other, and neither may blank the conversation itself.
  useEffect(() => {
    ;(async () => {
      const tok = await token()
      // ⚑ 4 Sep (UI-008) — `/icps` IS THE THIRD LEG, and it is here because it is the only
      // place that knows whether a PROPOSAL IS WAITING. `milla-summary.icp_versions[].current`
      // is positional — `i === length - 1` — so it names the newest row, not an activated one,
      // and reading "waiting" out of it would be inventing a fact from an index.
      const [pr, sr, ir] = await Promise.allSettled([
        api.get<{ data: Programme }>('/my/programme', tok),
        api.get<{ data: Summary }>('/leads/milla-summary', tok),
        api.get<{ data: Icp[] }>('/icps', tok),
      ])
      if (pr.status === 'fulfilled') setProg(pr.value.data)
      if (sr.status === 'fulfilled') setSummary(sr.value.data)
      if (ir.status === 'fulfilled') setIcps(ir.value.data ?? [])
    })()
  }, [])

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
        if (sid) {
          setSessionId(sid)
          const hist = await api.get<{ data: Msg[] }>(`/milla/sessions/${sid}/messages`, tok)
          const rows = (hist.data ?? []).slice(-20)
          if (rows.length > 0) {
            setMessages(m => [...m, ...rows.map(r => ({ id: r.id, role: r.role, content: r.content }))])
          }
        }
      } catch { /* no thread yet — the greeting stands on its own */ }

      // ── 🛑 ⚑ 15 Sep (O1 correction) — THE SENTENCE TYPED BEFORE THE NAVIGATION ────────
      //
      // `AgentColumn`'s Milla card has a composer and no chat engine (the second stateless
      // `/milla/chat` Milla was removed on 14 Sep and stays removed). Its `onSend` navigates
      // here carrying the customer's typed message — and until now the message died on the
      // way: `middleware.ts` redirects with `new URL(path, base)`, which drops the query
      // string, and nothing here ever read `?q=` anyway. They typed, the screen changed, and
      // Milla greeted them as if they had said nothing.
      //
      // ⚠️ IT GOES THROUGH `send()` — THE CANONICAL SENDER, UNCHANGED. Not a new endpoint,
      // not a direct insert, not a pre-seeded transcript row: the same function the composer
      // below calls, which posts to `/milla/sessions/:id/chat` and lets the server persist
      // both turns into `milla_messages`. That is what puts it in the ONE thread and what
      // makes it there on re-entry.
      //
      // ⚠️ AFTER THE RESTORE, DELIBERATELY. Their sentence is the newest turn in the thread,
      // so it must land after the history it follows — and `send()` re-reads the session for
      // itself, so it uses the same canonical session whether or not the restore above found
      // one.
      //
      // ⚠️ CLAIM-ONCE IS WHAT STOPS A SECOND COPY. `claimMillaHandoff` deletes before it
      // returns, so StrictMode's double-mount, a remount or a second tab claims nothing.
      const handed = claimMillaHandoff()
      if (handed) await send(handed)
    })()
  }, [])

  // Scroll the CHAT container only — never the page.
  useEffect(() => { const el = chatBodyRef.current; if (el) el.scrollTop = el.scrollHeight }, [messages])

  const focus = useCallback((c: ConversationContext = null) => {
    setContext(c)
    // A frame, so the strip above the composer is on screen before the cursor lands in it.
    requestAnimationFrame(() => inputRef.current?.focus())
  }, [])
  const publishDeskSet = useCallback((count: number | null) => setDeskSet(count), [])

  /**
   * ⛓️ THE TRANSPORT SWITCHES; THE CONVERSATION DOES NOT.
   *
   * In ICP context a turn goes to `/icps/chat-build` — the same endpoint the removed drawer
   * called, with the same last-12-turn history and the same 1,000-character server cap — and
   * its reply lands in THIS transcript. Nothing else about the message changes, and no other
   * context reaches that endpoint.
   */
  async function send(text: string) {
    const msg = text.trim(); if (!msg || sending || icpSaving) return
    setInput(''); setSending(true)
    setMessages(m => [...m, { id: `u-${Date.now()}`, role: 'user', content: msg }])
    try {
      const tok = await token()
      if (isIcpContext(context)) {
        // Only the turns of THIS conversation, which is the same window the drawer sent.
        const history = messages.filter(m => m.id !== 'greet').slice(-12).map(m => ({ role: m.role, content: m.content }))
        // ⚠️ RETRIED ONCE, AND SAFE TO BE: `/icps/chat-build` proposes and writes NOTHING —
        // no ICP, no version, no message row. The session chat below is deliberately NOT
        // wrapped, because it persists both turns and a re-send would double them.
        const r = await withOneRetry(() => api.post<{ data: IcpDraft & { message?: string } }>(
          '/icps/chat-build', { message: msg, history }, tok, AI_TURN_TIMEOUT_MS))
        const d = r.data ?? {}
        setMessages(m => [...m, { id: `a-${Date.now()}`, role: 'assistant', content: d.message || 'Got it — anything else to change?' }])
        // Only treat it as a draft once there is something real to target with.
        const hasTargets = (d.industries?.length ?? 0) > 0 || (d.job_titles?.length ?? 0) > 0
        if (hasTargets) setIcpDraft(prev => ({ ...(prev ?? {}), ...d, name: d.name || prev?.name || 'My targeting' }))
        return
      }
      let sid = sessionId
      if (!sid) {
        const list = await api.get<{ data: { id: string }[] }>('/milla/sessions', tok).catch(() => null)
        sid = list?.data?.[0]?.id ?? null
        if (!sid) { const c = await api.post<{ sessionId: string }>('/milla/sessions', {}, tok); sid = c.sessionId }
        setSessionId(sid)
      }
      const res = await api.post<{ reply: string }>(`/milla/sessions/${sid}/chat`, { message: msg }, tok, AI_TURN_TIMEOUT_MS)
      setMessages(m => [...m, { id: `a-${Date.now()}`, role: 'assistant', content: res.reply }])
    } catch (e) {
      // ── 🛑 10 Sep (C01) — THE COLLAPSE IS GONE, AND SO IS THE THROWN-AWAY MESSAGE ───────
      //
      // This line used to read *"I hit a snag reaching the engine — please try again in a
      // moment"* for every failure of either transport, and in ICP context it printed the
      // server's raw `error` string instead — which is how internal review wording, and
      // `Server error (502)`, reach a customer's screen in Milla's voice.
      //
      // ⚠️ THE COMPOSER IS RESTORED FIRST. `setInput('')` runs before the request, so
      // "try again" was said to a client whose sentence had already been cleared: they had
      // to retype it, or they lost it. Their words go back exactly as typed, and only when
      // the turn failed — a successful turn must not refill the box.
      setInput(prev => (prev.trim() ? prev : msg))
      setMessages(m => [...m, { id: `e-${Date.now()}`, role: 'assistant',
        content: chatFailureMessage(failureOf(e).status) }])
    }
    finally { setSending(false) }
  }

  /**
   * THE EXPLICIT SAVE, unchanged from M4. Nothing is attached, sourced, enrolled or sent by
   * it: `/icps/revise` writes the targeting and tells us, so we can re-check who is already
   * in the campaign. It runs only when the client presses it.
   */
  async function saveIcpDraft() {
    if (!icpDraft || icpSaving) return
    setIcpSaving(true)
    // ⚑ 7 Sep — TWO DESTINATIONS, ONE BUTTON. Refine goes to `/icps/revise` exactly as it
    // always has. Fresh goes to `/icps/fresh`, which INSERTS an inactive new version and
    // touches nothing that is live — so the confirmation sentence must not promise otherwise.
    const fresh = context === 'icp-fresh'
    const say = (content: string) =>
      setMessages(m => [...m, { id: `a-${Date.now()}`, role: 'assistant', content }])
    /** The `/icps` re-read the handle's rule depends on. Never fatal to the save. */
    const rereadIcps = async () => {
      try { setIcps((await api.get<{ data: Icp[] }>('/icps', await token())).data ?? []) } catch { /* the handle keeps what it had */ }
    }
    try {
      // ⚠️ THE TOKEN IS TAKEN ONCE, OUTSIDE THE RETRY. Re-reading the session per attempt
      // would make the retry depend on a second async call that can itself fail.
      const tok = await token()
      // ⚑ 10 Sep (C01) — ONE RETRY WHEN WE GOT NO ANSWER. See `withOneRetry`; the route's
      // repeat check is what makes a re-send unable to create a second ICP version.
      const r = await withOneRetry(() => api.post<{
        pending_review?: boolean; wrote?: boolean; change?: { sentence: string | null; unchanged: boolean } | null
      }>(fresh ? '/icps/fresh' : '/icps/revise', {
        name: icpDraft.name || 'My targeting',
        industries: icpDraft.industries ?? [], job_titles: icpDraft.job_titles ?? [],
        seniority_levels: icpDraft.seniority_levels ?? [], company_sizes: icpDraft.company_sizes ?? [],
        geographies: icpDraft.geographies ?? [], tech_stack: icpDraft.tech_stack ?? [],
        keywords: icpDraft.keywords ?? [],
      }, tok))
      // ── ⚑ 10 Sep (C01) — WHAT ACTUALLY MOVED, IN THE SERVER'S OWN WORDS ────────────────
      //
      // 🛑 THREE OUTCOMES WERE WEARING ONE SENTENCE. "Updated — this is your live targeting
      // now" was said when the revision was APPLIED, when it was PARKED for review (the live
      // targeting deliberately unchanged — the exact opposite claim), and when it changed
      // nothing at all.
      //
      // ⚠️ THE DIFF IS THE SERVER'S, AND THAT IS NOT A DETAIL. This browser only ever knew
      // the draft it built; the before-state lives on the row. A sentence composed here
      // could only describe what we asked for, never what changed — which is precisely the
      // fabrication this fix removes. `null` means nothing moved, and it is SAID.
      const diff = r?.change?.sentence ?? null
      const nothingMoved = r?.change?.unchanged === true || r?.wrote === false
      say(fresh
        ? 'Saved as a new version of your targeting. Your current targeting is unchanged and still live — nothing has been sourced or contacted. Tell us when you want to use this one.'
        : nothingMoved
          ? TARGETING_UNCHANGED_SENTENCE
          : r?.pending_review
            // ⚠️ PARKED, AND SAID SO. AR9's 22-Aug lock holds a LIVE client's edit for
            // K.I.N.D; telling them it is live now would be false on that path.
            ? `${diff ?? 'I’ve sent your change through for review.'} Nothing has changed on your live targeting yet — it’s with K.I.N.D to apply.`
            : `${diff ?? 'I’ve updated your targeting.'} That’s your live targeting now, and we’ve been told so we can re-check who’s already in your campaign.`)
      setIcpDraft(null); setContext(null); setIcpRevision(v => v + 1)
      await rereadIcps()
    } catch (e) {
      const f = failureOf(e)
      // ── 🛑 THE PROPOSAL AND THE CONTEXT SURVIVE EVERY FAILURE ──────────────────────────
      //
      // Note what is NOT here: `setIcpDraft(null)` and `setContext(null)` run only on the
      // success path above. A client whose save failed still has their proposal, their
      // chips and their Save button — losing the draft would make them rebuild the change
      // in conversation before they could try again.
      //
      // ⚠️ AND THE SENTENCE IS NEVER THE SERVER'S PROSE. `e.message` printed our internal
      // review wording — and, on a non-JSON 5xx, the literal text "Server error (502)" —
      // into the transcript under Milla's name. The code selects the sentence; the prose
      // stays in the logs.
      say(refinementFailureMessage({ status: f.status, code: f.code }))
      // ⚠️ "HERE IS THE LATEST VERSION" IS A PROMISE THIS LINE KEEPS. On a state-changed
      // refusal the row moved under us, so the handle's own read of `/icps` is stale too —
      // re-reading it is what makes that sentence true rather than reassuring.
      if (f.code === REVISE_STATE_CHANGED_CODE) await rereadIcps()
    }
    finally { setIcpSaving(false) }
  }

  const needsGoLive = !!summary && summary.icp_versions.length > 0 && !summary.has_funded

  // ── ⛓️ 3 Sep — A CHIP THAT POINTS AT "THESE" NEEDS THERE TO BE SOME ────────────────────
  // ⚠️ "CONTEXTUALLY VALID" IS THE TEST THE FOUNDER SET. Offering "Please pause my programme"
  // to someone at Proof invites them to pause a programme that does not exist; a calibration
  // chip naming "these" needs a set on the desk, not merely the right stage.
  const proofSetOnDesk = (summary?.calibration_set_on_desk ?? false) || (deskSet ?? 0) > 0
  const chips = !prog ? CHIPS : [
    ...(prog.stage === 'Proof' && !proofSetOnDesk ? [] : [STAGE_QUICK_ACTION[prog.stage]]),
    ...(prog.stage === 'Proof' && proofSetOnDesk ? PROOF_CHIPS : []),
    ...(PAUSE_STAGES.includes(prog.stage) ? ['Please pause my programme'] : []),
    ...(ROI_STAGES.includes(prog.stage) ? ['How is my ROI looking?'] : []),
  ]

  const sendState = (() => {
    // Founder-locked wording, 3 Sep. CUSTOMER-FACING ONLY.
    const idle = { label: 'Outreach hasn’t started', tone: 'text-[#5c5279]', dot: 'bg-[#b3a9cc]' }
    // Unknown means idle, which is the only honest thing this widget can say.
    if (!prog || !OUTREACH_STAGES.includes(prog.stage)) return idle
    // 🛑 NO PROGRAMME MEANS NO PROGRAMME STATUS, whatever campaign rows exist.
    if (prog.hasProgramme === false) return idle
    if (needsGoLive) return { label: 'Not started', tone: 'text-[#b45309]', dot: 'bg-amber-500' }
    const st = summary?.campaign_status
    if (st === 'active') return { label: 'Programme live', tone: 'text-[#059669]', dot: 'bg-emerald-500' }
    if (st === 'paused' || st === 'paused_low_performance') return { label: 'Paused — we\u2019ll tell you why', tone: 'text-[#b45309]', dot: 'bg-amber-500' }
    if (st === 'completed' || st === 'archived') return { label: 'Programme finished', tone: 'text-[#5c5279]', dot: 'bg-[#b3a9cc]' }
    if (st === 'draft') return { label: 'Being set up', tone: 'text-[#5c5279]', dot: 'bg-[#b3a9cc]' }
    return idle
  })()

  // 🛑 UNKNOWN IS NOT "NOTHING WAITING", AND IT IS NOT "SOMETHING IS". `null` (not read yet,
  // or the read failed) resolves to false here, which sends the handle to Programme — the
  // honest default, because offering "a proposal is waiting" for one we cannot see would put a
  // claim on the customer's screen that no endpoint made.
  // ⚠️ `/icps` ANSWERS NEWEST-FIRST — the My ICP screen reverses it precisely because of that
  // ("API returns newest-first; show oldest-first"), and applies this same test to its last
  // row. Same endpoint, same rule, one answer.
  const newestIcp = icps && icps.length > 0 ? icps[0] : null
  const icpWaiting = !!newestIcp && newestIcp.is_active !== true

  const rich = (t: string) => t.split(/(\*\*[^*]+\*\*)/g).map((p, i) => p.startsWith('**') && p.endsWith('**')
    ? <b key={i} className="text-[#7C3AED]">{p.slice(2, -2)}</b> : <span key={i}>{p}</span>)

  const value = useMemo<MillaConversationApi>(
    () => ({ focus, publishDeskSet, icpRevision }), [focus, publishDeskSet, icpRevision])

  const draftChips = icpDraft ? [
    ...(icpDraft.seniority_levels ?? []), ...(icpDraft.job_titles ?? []), ...(icpDraft.industries ?? []),
    ...(icpDraft.geographies ?? []), ...(icpDraft.company_sizes ?? []).map(s => `${s} staff`),
  ].filter(Boolean) : []

  return (
    <Ctx.Provider value={value}>
      {/* ⚠️ FIXED width, 600px — the approved shell. A conversation column past ~600px is
          170+ characters a line, which reads badly however full it is. */}
      {/* ⚠️ FULL WIDTH ON A PHONE, 600px ABOVE THE BREAKPOINT. `w-[600px] shrink-0` at every
          width is what left `<main>` with zero pixels on a 390px screen. The desktop number is
          unchanged: a conversation column past ~600px is 170+ characters a line. */}
      <section data-tour="chat" className="w-full md:w-[600px] shrink-0 border-r border-[#eee7f7] bg-white flex flex-col min-h-0">
        <div className="flex items-center gap-2.5 px-4 py-3 border-b border-[#eee7f7] shrink-0">
          <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#7C3AED] to-[#EC4899] text-white font-extrabold text-[13px] flex items-center justify-center">M</span>
          {/* ⚑ 4 Sep (UI-008) — TRUNCATE, NEVER WRAP. On a 390px screen the subtitle wrapped
              onto a second line and the send-state pill wrapped INTO it, so the two overlapped
              on the first thing the customer reads. Nothing is removed at any width: the name
              and the pill hold their size, and the subtitle gives up the pixels. */}
          <div className="min-w-0 truncate"><b className="text-[15px]">Milla</b> <span className="text-[#9b8ec4] text-[12.5px]">· conversational &amp; strategic</span></div>
          <span className={`ml-auto shrink-0 text-[12.5px] font-semibold inline-flex items-center gap-1.5 whitespace-nowrap ${sendState.tone}`}>
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
        <div className="px-4 py-3 border-t border-[#eee7f7] shrink-0">
          {/* THE CONTEXT STRIP — what this conversation is talking about right now. It is a
              label on the ONE conversation, not a second one: the transcript above and the
              composer below are the same ones every other screen uses. */}
          {isIcpContext(context) && (
            <div className="flex items-center gap-2 mb-2 rounded-xl border border-[#e4d4fb] bg-[#faf8ff] px-3 py-2">
              <span className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-[#b3a9cc]">Talking about</span>
              <b className="text-[12.5px]">{context === 'icp-fresh' ? 'Who we target — a fresh one' : 'Who we target'}</b>
              <button onClick={() => { setContext(null); setIcpDraft(null) }}
                className="ml-auto text-[12px] font-semibold text-[#9b8ec4] hover:text-[#5c5279]">Done</button>
            </div>
          )}
          {/* THE DRAFT AND ITS EXPLICIT SAVE. Nothing goes live until this is pressed. */}
          {isIcpContext(context) && icpDraft && (
            <div className="border border-[#e4dcf7] bg-[#faf8ff] rounded-xl p-3.5 mb-2">
              <p className="text-[10px] font-extrabold uppercase tracking-wide text-[#b3a9cc]">Your new targeting</p>
              <b className="text-[13.5px] block mt-0.5 mb-1.5">{icpDraft.name}</b>
              <div className="flex flex-wrap gap-1.5">
                {draftChips.map((c, i) => (
                  <span key={i} className="text-[11.5px] font-semibold text-[#7C3AED] bg-[#f3ecff] rounded-full px-2.5 py-1">{c}</span>
                ))}
              </div>
              <div className="flex gap-2 mt-3">
                <button disabled={icpSaving} onClick={saveIcpDraft}
                  className="text-[13px] font-bold text-white rounded-xl py-2.5 px-5 bg-gradient-to-br from-[#7C3AED] to-[#EC4899] disabled:opacity-50">
                  {icpSaving ? 'Saving…' : context === 'icp-fresh' ? 'Save as new targeting' : 'Save — make this live'}
                </button>
                <button disabled={icpSaving} onClick={() => setIcpDraft(null)}
                  className="text-[13px] font-semibold text-[#5c5279] rounded-xl py-2.5 px-4 border border-[#ece5fb]">Keep talking</button>
              </div>
            </div>
          )}
          {/* ⚠️ NOT OFFERED IN ICP CONTEXT. Every chip here is a request to Milla — "Please
              pause my programme", "How is my ROI looking?" — and in ICP context the composer
              is talking to `/icps/chat-build`. Sending one of them there would put a
              programme question into a targeting conversation. */}
          {context !== 'icp' && (<>
            {chips.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {chips.map(c => <button key={c} onClick={() => send(c)} disabled={sending} className="text-[12.5px] font-semibold text-[#7C3AED] bg-[#f3ecff] border border-[#e4d4fb] rounded-full px-3 py-1 hover:bg-[#ebe0fc] disabled:opacity-50">{c}</button>)}
              </div>
            )}
          </>)}
          <form onSubmit={e => { e.preventDefault(); send(input) }} className="flex gap-2">
            {/* 1000 matches the server's cap on /icps/chat-build — without it a long paste
                comes back as a raw validation error instead of a reply. */}
            <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)} maxLength={1000}
              placeholder={context === 'icp' ? 'Tell Milla what should change…' : 'Ask Milla, request leads, or give feedback…'}
              className="flex-1 text-[14px] rounded-xl border border-[#e4dcf7] px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/30" />
            <button type="submit" disabled={sending || icpSaving || !input.trim()} className="text-[14px] font-bold text-white rounded-xl px-5 bg-[#7C3AED] disabled:opacity-50">Send</button>
          </form>
        </div>
        {/* ── ⚑ 4 Sep (UI-008) — THE HANDLE (phone only, founder-approved) ──────────────────
            The shortcut to the one section that matters now. The rule is the founder's, and it
            is the whole rule: A PROPOSAL WAITING → MY ICP, OTHERWISE → PROGRAMME.

            ⚠️ "WAITING" IS ASKED OF `/icps`, NOT INFERRED. The newest ICP not being active is
            the same test the My ICP screen itself applies to decide it has something to show.
            While `/icps` is unread the answer is UNKNOWN, and unknown falls to Programme —
            never to an approval prompt for a proposal we have not confirmed exists.

            ⚠️ IT IS PART OF THIS COLUMN, not floating over it, so it can never collide with
            the composer above it. It is hidden the moment the workspace is covering, because
            then the section it points at is already the screen. */}
        {!handleHidden && (
          icpWaiting ? (
            <Link href="/milla/icp" className={HANDLE}>
              <span className={HANDLE_GRAB} />
              <span className="flex items-center gap-2">
                <b className="text-[13.5px]">My ICP</b>
                <span className="ml-auto text-[11px] font-extrabold text-white bg-[#7C3AED] rounded-full px-2 py-0.5">1</span>
              </span>
              <span className="block text-[11.5px] text-[#9b8ec4] mt-0.5">A proposal is waiting — open to approve.</span>
            </Link>
          ) : (
            <button onClick={handleOpen} className={`${HANDLE} text-left`}>
              <span className={HANDLE_GRAB} />
              <span className="flex items-center gap-2">
                <b className="text-[13.5px]">Programme</b>
                {prog && <span className="ml-auto text-[11px] font-extrabold text-[#7C3AED] bg-[#f3ecff] rounded-full px-2 py-0.5">{prog.stage}</span>}
              </span>
              <span className="block text-[11.5px] text-[#9b8ec4] mt-0.5">Open for the lifecycle, outcome and progress.</span>
            </button>
          )
        )}
      </section>
      {children}
    </Ctx.Provider>
  )
}
