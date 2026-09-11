// ═══════════════════════════════════════════════════════════════════════════════════════
// GATHERING THE FACTS THE LIFECYCLE IS DERIVED FROM — the one place schema appears.
//
// `deriveLifecycle` is pure and takes named facts. This file turns a client id into those
// facts, and everything about tables, columns and providers stops here. Two entry points:
//
//   `lifecycleDetailFor(clientId)`  — everything the selected client's three columns render
//   `lifecycleBoard(clientIds)`     — stage + needs-you for the whole list, in bulk
//
// ── EVERY COUNT IS SCOPED TO THE EXACT PROGRAMME ────────────────────────────────────────
//
// 🛑 THE FAILURE THIS FILE IS WRITTEN AGAINST. A client-wide counter rendered beside a
// programme reads as that programme's result. It has happened here before: House's retired
// desk showed prospects waiting and meetings booked for work a different commercial model did,
// and a 2026 reply sat in the rail as current activity. So sends, replies, meetings and
// enrolments are all resolved through **this programme's campaign** or **this programme's
// leads** — never through `client_id` alone — and a count that cannot be scoped is reported as
// unknown rather than substituted with a client-wide one.
//
// ── AND AN UNREADABLE FACT NEVER FLATTERS ───────────────────────────────────────────────
//
// Reads fail soft in the direction that does NOT invent work: an unreadable sender is treated
// as sendable (so a transient error does not raise a false alarm on every client at once), an
// unreadable reply count is zero, and an unreadable proof signal is `null`, which the
// derivation reads as Signup. The one exception is `humanBlockers`, which comes from readiness
// and already fails closed on its own.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { db } from '@kind/db'
import {
  deriveLifecycle, type LifecycleFacts, type LifecycleVerdict,
} from './programme-lifecycle'
import { PREPARATION_CLEARS } from './preparation-readiness'
// 🛑 AUTHORITY IS ASKED, NEVER RE-DERIVED. `p2Authorised` is the one definition of "the second
// half is settled", and it owns the columns that answer it — internal authorisation as well as
// a real payment, which is the difference between House being authorised and House looking
// unpaid. A second copy of that test here would be a second opinion about whether a programme
// may go live, on the screen that draws the button.
import { p2Authorised, type ProgrammeRow as AuthorityRow } from './programme'

/** Replies the pipeline handles by itself. Everything else wants a person. */
const AUTO_HANDLED_REPLY = new Set(['opt_out', 'unsubscribe', 'out_of_office'])

/** Mailbox states that can actually send. Mirrors `sending-inbox`'s own set. */
const SENDABLE_INBOX = new Set(['assigned', 'active'])

type ProgrammeRow = {
  id: string; client_id: string; status: string; paused_at: string | null
  approved_at: string | null; second_paid_at: string | null; second_payment_ref: string | null
  second_authorised_at: string | null; first_paid_at: string | null; first_authorised_at: string | null
  went_live_at: string | null
  /** ⚑ 10 Sep (H) — Run, the second operator act. Optional: the column is new, so rows read
   *  before `20260910_programme_run_authority` carry `undefined`, which reads as never-run. */
  run_at?: string | null
  meeting_target: number | null; sourcing_ceiling: number | null
  sourced_used: number | null; sourced_reserved: number | null
  recommended_volume: number | null; created_at: string | null
}

// ⚠️ THE AUTHORITY COLUMNS ARE SELECTED BUT NEVER INTERPRETED HERE —
// `p2Authorised` is the only thing that reads them, and it owns that meaning.
const PROGRAMME_COLUMNS =
  'id, client_id, status, paused_at, approved_at, second_paid_at, second_payment_ref, ' +
  'second_authorised_at, first_paid_at, first_authorised_at, went_live_at, meeting_target, ' +
  // ⚑ 10 Sep (H) — `run_at` IS SELECTED BECAUSE THE DERIVATION NOW ASKS IT. Unselected it
  // reads `undefined`, which the rule treats as never-run — safe, but it would hold every
  // started programme at "ready to run" for ever.
  'run_at, ' +
  'sourcing_ceiling, sourced_used, sourced_reserved, recommended_volume, created_at'

/** The programme a client is working RIGHT NOW — newest non-terminal, else newest completed. */
function currentProgramme(rows: ProgrammeRow[]): ProgrammeRow | null {
  const byNewest = [...rows].sort((a, b) => String(b.created_at ?? '').localeCompare(String(a.created_at ?? '')))
  return byNewest.find(r => r.status !== 'COMPLETED' && r.status !== 'CANCELLED') ?? byNewest[0] ?? null
}

/** The five commercial/authority facts the derivation needs, from one row. */
function programmeFacts(p: ProgrammeRow): NonNullable<LifecycleFacts['programme']> {
  return {
    status: String(p.status),
    paused: !!p.paused_at,
    approved: !!p.approved_at,
    secondAuthorised: p2Authorised(p as unknown as AuthorityRow),
    live: !!p.went_live_at || String(p.status) === 'LIVE',
    // 🛑 ARMED AND STARTED ARE TWO FACTS. `live` is Make Live's work; this is Run's, and only
    // Run permits delivery. A missing column reads as never-run, which is the safe direction.
    run: !!p.run_at,
  }
}

/** This programme's campaign id, positively linked through its attached ICP. */
async function campaignIdFor(programmeId: string): Promise<string | null> {
  try {
    const { resolveProgrammeChain } = await import('./programme-chain')
    const r = await resolveProgrammeChain(programmeId)
    return r.ok ? r.chain.campaignId : null
  } catch { return null }
}

async function countRows(table: string, apply: (q: never) => unknown): Promise<number> {
  try {
    const q = db.from(table).select('id', { count: 'exact', head: true })
    const { count, error } = await (apply(q as never) as Promise<{ count: number | null; error: unknown }>)
    return error ? 0 : (count ?? 0)
  } catch { return 0 }
}

/**
 * Has Milla started Proof for this client?
 *
 * ⛓️ THERE IS NO "PROOF STARTED" COLUMN, AND ONE IS NOT INVENTED HERE. The honest signal is
 * that calibration has produced something a person could look at: an ICP exists for the client
 * with no programme attached to it yet. That is exactly what Proof is — targeting being shaped
 * before a programme is recommended.
 *
 * ⚠️ AN UNREADABLE ANSWER IS `null`, NOT `false`. `null` means "we could not tell", and the
 * derivation reads it as Signup — the earlier, safer stage. Showing a client at Proof who is
 * really at Signup makes Vida look like it is watching work nobody is doing.
 */
/**
 * ⚑ 10 Sep (C07) — is the automatic Proof loop handed to a person and still unresolved?
 *
 * ⚠️ FAILS SOFT TO `null`, NOT `false`. `false` asserts "this client is fine", which on an
 * unreadable answer would hide the one Proof-stage task from the operator — and the client
 * has already been told a person will call them. `null` asserts nothing.
 */
async function proofCalibrationFailedFor(clientId: string): Promise<boolean | null> {
  try {
    const { data, error } = await db.from('clients')
      .select('proof_review_requested_at, proof_review_resolved_at').eq('id', clientId).maybeSingle()
    if (error || !data) return null
    const c = data as unknown as { proof_review_requested_at: string | null; proof_review_resolved_at: string | null }
    return !!c.proof_review_requested_at && !c.proof_review_resolved_at
  } catch { return null }
}

/**
 * ⚑ 10 Sep (A) — did the client say their examples are right? `clients.proof_completed_at`.
 *
 * ⚠️ FAILS SOFT TO `null`, which reads as "not accepted" and keeps them at Proof. Promoting a
 * client to the calculator on an unreadable answer would be inventing a decision they may not
 * have made.
 */
async function proofCompletedFor(clientId: string): Promise<boolean | null> {
  try {
    const { data, error } = await db.from('clients')
      .select('proof_completed_at').eq('id', clientId).maybeSingle()
    if (error || !data) return null
    return !!(data as unknown as { proof_completed_at: string | null }).proof_completed_at
  } catch { return null }
}

/**
 * ⚑ MVP1 (C03) — WHAT THE CLIENT SAID THEY WANT, IN THEIR OWN WORDS.
 *
 * 🛑 THE FACT VIDA WAS NEVER TOLD. `clients.outcome_stated` has existed since
 * 20260910_client_stated_outcome, and `vida-lifecycle-copy.ts` already TYPES `outcomeStated`
 * and renders it in three places — "In their words", with the sentence beneath. Nothing ever
 * supplied it: this function did not exist and `vida/page.tsx` passed nothing. So all three
 * call sites fell to their else-branch and Vida said "Being agreed" about every client in the
 * book, including the ones who had said exactly what they wanted at signup.
 *
 * ⚠️ IT IS THE CLIENT'S SENTENCE, NOT THE PROGRAMME'S TARGET. A meeting target is agreed
 * later, at Programme. This is what they said before any number existed, and an operator
 * about to agree that number needs to have read it.
 *
 * ⚠️ FAILS SOFT TO `null`, like every other read here — and `null` is the honest answer for
 * "unreadable" AND for "never said". Neither may become a sentence: a fabricated outcome on
 * an operator's screen is a claim about a client's intent that the client never made.
 *
 * ⚠️ TRIMMED, because an empty string is not a stated outcome. A blank column that reached
 * the copy module would render as `""` under "In their words" — quotation marks around
 * nothing, attributed to a person.
 */
async function outcomeStatedFor(clientId: string): Promise<string | null> {
  try {
    const { data, error } = await db.from('clients')
      .select('outcome_stated').eq('id', clientId).maybeSingle()
    if (error || !data) return null
    const v = (data as unknown as { outcome_stated: string | null }).outcome_stated
    return typeof v === 'string' && v.trim() !== '' ? v.trim() : null
  } catch { return null }
}

async function proofStartedFor(clientId: string): Promise<boolean | null> {
  try {
    const { data, error } = await db.from('icps')
      .select('id').eq('client_id', clientId).limit(1)
    if (error) return null
    return (data ?? []).length > 0
  } catch { return null }
}

/**
 * Can the mailbox this programme would send from actually send?
 *
 * ── 🛑 ⚑ 10 Sep (I2) — IT ASKS THE GATE'S OWN QUESTION NOW ──────────────────────────────
 *
 * ⛓️ WHAT THIS REPLACES. It used to read `client_inboxes.status` and answer "yes" if any row
 * was `assigned` or `active`. `authorityFor(OUTREACH)` asks `programmeSenderSafety`, which
 * additionally refuses a TIE between equally-ranked boxes, an address live on ANOTHER client,
 * and (as of today) a mailbox nobody has proved can log in. So the panel drew a healthy sender
 * while the send door refused — the #565/#576 shape again: a calm colour over an untested claim.
 *
 * ⚠️ ONE RULEBOOK, ASKED TWICE. The safety verdict is not re-derived here; a second copy is how
 * a console and a sender start disagreeing about the same mailbox without anything failing.
 *
 * ⚠️ AN UNREADABLE ANSWER STILL FAILS SOFT TO "SENDABLE". A read error would otherwise raise a
 * sender alarm on every client at once, and a wall of false exceptions is how a real one gets
 * missed. `unreadable` is the safety module's own word for that, and it is not a client's fault.
 */
async function senderSendableFor(clientId: string): Promise<{ sendable: boolean; detail: string | null }> {
  try {
    const { programmeSenderSafety } = await import('./programme-sender')
    const s = await programmeSenderSafety(clientId)
    if (s.ok) return { sendable: true, detail: null }
    if (s.reason === 'unreadable') return { sendable: true, detail: null }
    return { sendable: false, detail: s.detail }
  } catch { return { sendable: true, detail: null } }
}

export type LifecycleCounts = {
  /** Current batch, as the client's own numbers. */
  sourced: number; qualified: number; rejected: number; stillToCheck: number
  enrolled: number
  sends: number; replies: number; positive: number; meetings: number
  repliesAwaitingDecision: number
}

const NO_COUNTS: LifecycleCounts = {
  sourced: 0, qualified: 0, rejected: 0, stillToCheck: 0, enrolled: 0,
  sends: 0, replies: 0, positive: 0, meetings: 0, repliesAwaitingDecision: 0,
}

/** Every number the panels show, all of them scoped to this exact programme. */
async function countsFor(programmeId: string, clientId: string, campaignId: string | null): Promise<LifecycleCounts> {
  const out: LifecycleCounts = { ...NO_COUNTS }

  // ── THE CURRENT BATCH ────────────────────────────────────────────────────────────────
  // The client reviews ONE batch. Counting across every batch a programme ever had would mix
  // an already-decided set into the numbers beside the one being prepared now.
  const { data: batchRows } = await db.from('programme_batches')
    .select('id').eq('programme_id', programmeId).order('seq', { ascending: false }).limit(1)
  const batchId = ((batchRows ?? []) as { id: string }[])[0]?.id ?? null

  if (batchId) {
    const onBatch = () => db.from('leads').select('id', { count: 'exact', head: true })
      .eq('programme_id', programmeId).eq('client_id', clientId).eq('batch_id', batchId)
    const [sourced, qualified, rejected] = await Promise.all([
      onBatch().then(r => r.count ?? 0, () => 0),
      onBatch().not('qualified_at', 'is', null).then(r => r.count ?? 0, () => 0),
      onBatch().not('disqualified_at', 'is', null).then(r => r.count ?? 0, () => 0),
    ])
    out.sourced = sourced
    out.qualified = qualified
    out.rejected = rejected
    out.stillToCheck = Math.max(0, sourced - qualified - rejected)
  }

  out.enrolled = await countRows('figsy_enrollments', q =>
    (q as unknown as { eq: (c: string, v: string) => unknown }).eq('programme_id', programmeId))

  if (campaignId) {
    // ⚠️ SENDS STAY CAMPAIGN-KEYED, and that is not an inconsistency with the meetings read
    // below. `figsy_sent_emails` has no `programme_id` column — its own module says so — so the
    // campaign IS the bridge to this programme's sends. Founder, 10 Sep: "preserve campaign_id
    // as operational metadata/bridge where needed."
    out.sends = await countRows('figsy_sent_emails', q =>
      (q as unknown as { eq: (c: string, v: string) => unknown }).eq('campaign_id', campaignId))
  }

  // ── 🛑 ⚑ 10 Sep (I4) — MEETINGS ARE ATTRIBUTED BY `programme_id`, NEVER BY CAMPAIGN ────
  //
  // ⛓️ WHAT THIS FIXES. This read was `campaignMeetingCount(campaignId)`, which answers "how
  // many meetings did this CAMPAIGN produce". Milla answers the same question for the same
  // client with `meetingCounts({ programmeId })`, and the review hold answered it with
  // `clientMeetingCounts`. Three keys, three answers, one number — and it is the number the
  // whole commercial model is judged on.
  //
  // A campaign is not a programme. `resolveProgrammeChain` links them today, but the link is
  // operational plumbing: a campaign re-pointed, reused or resolved through a different chain
  // moves the count with it, and a meeting booked through one programme's campaign would be
  // reported as another programme's outcome. `meetings.programme_id` is stamped from the LEAD's
  // own provenance and cannot drift.
  //
  // Founder, 10 Sep: "programme_id remains canonical for outcome attribution."
  //
  // ⚠️ THE UNREADABLE CASE STILL RENDERS 0, and that is unchanged from what this file already
  // did — `LifecycleCounts.meetings` is a number and widening it to `number | null` would
  // change every screen that renders it. It is logged loudly instead, because a storage failure
  // rendered as "0 meetings" is the one that reads as a verdict on the programme.
  try {
    const { meetingCounts } = await import('./meeting-truth')
    const counts = await meetingCounts({ clientId, programmeId })
    if (counts === null) {
      console.error(`[lifecycle-facts] meetings unreadable for programme ${programmeId} — rendering 0, which is NOT the same fact`)
      out.meetings = 0
    } else {
      out.meetings = counts.booked
    }
  } catch { out.meetings = 0 }

  // ── REPLIES, THROUGH THIS PROGRAMME'S OWN LEADS ──────────────────────────────────────
  // 🛑 POSITIVE ATTRIBUTION, NOT `client_id`. This is the read that put a retired programme's
  // replies into a live client's rail; the lead's `programme_id` is the only link that cannot
  // drift, so the reply set is derived from it even though it costs a second query.
  try {
    const { data: leadRows } = await db.from('leads')
      .select('id').eq('programme_id', programmeId).eq('client_id', clientId).limit(20000)
    const ids = ((leadRows ?? []) as { id: string }[]).map(r => r.id)
    if (ids.length > 0) {
      const { data: replyRows } = await db.from('figsy_replies')
        .select('classification, qualified_at').in('lead_id', ids)
      const replies = (replyRows ?? []) as { classification: string | null; qualified_at: string | null }[]
      out.replies = replies.length
      out.positive = replies.filter(r => ['hot', 'warm', 'interested', 'referral'].includes(String(r.classification))).length
      // ⚠️ "AWAITING A DECISION" IS NOT "UNREAD". A reply the pipeline already handles — an
      // opt-out, an unsubscribe, an out-of-office — needs nobody, and counting it would put a
      // client into Needs you for a message that resolved itself.
      out.repliesAwaitingDecision = replies.filter(r =>
        !r.qualified_at && !AUTO_HANDLED_REPLY.has(String(r.classification))).length
    }
  } catch { /* counts stay zero — an unreadable reply set never invents a task */ }

  return out
}

/** The one operator-facing reply that is waiting, so the panel can name a person. */
async function replyAwaitingFor(programmeId: string, clientId: string): Promise<
  { id: string; name: string | null; company: string | null; classification: string | null } | null> {
  try {
    const { data: leadRows } = await db.from('leads')
      .select('id, company').eq('programme_id', programmeId).eq('client_id', clientId).limit(20000)
    const leads = (leadRows ?? []) as { id: string; company: string | null }[]
    if (leads.length === 0) return null
    const byLead = new Map(leads.map(l => [l.id, l.company]))
    const { data } = await db.from('figsy_replies')
      .select('id, lead_id, from_name, classification, qualified_at, received_at')
      .in('lead_id', leads.map(l => l.id))
      .is('qualified_at', null)
      .order('received_at', { ascending: false }).limit(20)
    const rows = (data ?? []) as { id: string; lead_id: string | null; from_name: string | null; classification: string | null }[]
    const first = rows.find(r => !AUTO_HANDLED_REPLY.has(String(r.classification)))
    if (!first) return null
    return {
      id: first.id, name: first.from_name,
      company: first.lead_id ? (byLead.get(first.lead_id) ?? null) : null,
      classification: first.classification,
    }
  } catch { return null }
}

export type LifecycleDetail = {
  verdict: LifecycleVerdict
  counts: LifecycleCounts
  programme: null | {
    id: string; status: string
    meetingTarget: number | null
    entitlementUsed: number; entitlementTotal: number; entitlementRemaining: number
  }
  /** The named person behind a `review_reply`, so the card is about somebody. */
  replyAwaiting: { id: string; name: string | null; company: string | null; classification: string | null } | null
  /** Blockers a human must clear, in the plain sentences readiness already writes. */
  humanBlockers: { code: string; detail: string }[]
  /** Founder-plain sentence for a stopped preparation. Never a stack trace, never lead ids. */
  stoppedDetail: string | null
  senderSendable: boolean
  /**
   * ⚑ 10 Sep (I2) — WHY the sender is not usable, in the gate's own words.
   *
   * ⚠️ NULL WHEN IT IS FINE. A panel that always has a sender sentence to print starts
   * printing reassurance, and reassurance is what hid this for weeks.
   */
  senderDetail: string | null
  killSwitchOff: boolean
  operatorRunEnabled: boolean
  /**
   * ⚑ MVP1 (C03) — the client's own words for what this should achieve, or null.
   *
   * ⚠️ NULL MEANS "THEY HAVE NOT SAID", and the copy module must treat it that way. It never
   * means "assume meetings": the outcome and the meeting target are different facts, agreed
   * at different times, and conflating them is how a target gets attributed to a client who
   * only ever described a result.
   */
  outcomeStated: string | null
}

/**
 * Everything the selected client's three columns need, from one call.
 *
 * ⚠️ IT NEVER THROWS. This drives a whole screen; an exception here would blank the console over
 * one unreadable count. Failures degrade to the safest fact and the derivation still answers.
 */
export async function lifecycleDetailFor(clientId: string): Promise<LifecycleDetail> {
  const { outreachDeliveryPermitted } = await import('./outreach-kill-switch')
  const { operatorSendEnabled } = await import('./figsy')
  const killSwitchOff = outreachDeliveryPermitted()
  const operatorRunEnabled = operatorSendEnabled()

  const { data: progRows } = await db.from('programmes')
    .select(PROGRAMME_COLUMNS).eq('client_id', clientId)
  const rows = (progRows ?? []) as unknown as ProgrammeRow[]
  const p = currentProgramme(rows)

  if (!p) {
    const [proofStarted, proofCalibrationFailed, proofCompleted, outcomeStated] = await Promise.all([
      proofStartedFor(clientId), proofCalibrationFailedFor(clientId), proofCompletedFor(clientId),
      // ⚑ MVP1 (C03) — read on BOTH branches. This one is the Brief/Proof client, and it is
      // the branch where an operator most needs the client's own sentence: there is no
      // meeting target yet, so it is the only statement of what they want that exists.
      outcomeStatedFor(clientId),
    ])
    return {
      verdict: deriveLifecycle({
        programme: null, proofStarted, proofCalibrationFailed, proofCompleted,
        preparationStopped: false, preparing: false,
        humanBlockers: [], readinessReady: false, sends: 0, repliesAwaitingDecision: 0,
        senderSendable: true, killSwitchOff, operatorRunEnabled,
        remainingEntitlement: 0, hasNewerProgramme: false, repeatDismissed: false,
      }),
      counts: { ...NO_COUNTS }, programme: null, replyAwaiting: null,
      humanBlockers: [], stoppedDetail: null, senderSendable: true, senderDetail: null,
      killSwitchOff, operatorRunEnabled, outcomeStated,
    }
  }

  const campaignId = await campaignIdFor(p.id)
  const [counts, sender] = await Promise.all([
    countsFor(p.id, clientId, campaignId).catch(() => ({ ...NO_COUNTS })),
    senderSendableFor(clientId),
  ])
  const senderSendable = sender.sendable

  // ── READINESS, AND WHICH OF ITS BLOCKERS A HUMAN OWNS ────────────────────────────────
  // 🛑 THE SPLIT IS `PREPARATION_CLEARS`, THE SAME LIST THE BUTTON IS GATED BY. A blocker
  // preparation clears by itself is not a task; one it cannot is. Re-deriving that split here
  // would be a second opinion about what the operator has to do.
  let humanBlockers: { code: string; detail: string }[] = []
  let readinessReady = false
  try {
    const { programmePreparationReadiness } = await import('./preparation-readiness')
    const r = await programmePreparationReadiness(p.id)
    readinessReady = r.ready === true
    humanBlockers = (r.blockers ?? []).filter(b => !PREPARATION_CLEARS.includes(b.code))
  } catch { /* readiness already fails closed; an unreadable answer adds no blockers here */ }

  let preparing = false
  let stoppedDetail: string | null = null
  let preparationStopped = false
  try {
    const { isAdvanceRunning, lastPreparationAttempt } = await import('./programme-advance')
    preparing = isAdvanceRunning(p.id)
    const last = await lastPreparationAttempt(p.id)
    if (!preparing && last && last.ok === false) {
      preparationStopped = true
      // The plain sentence readiness/preparation already wrote. Never a wall of lead ids: the
      // founder asked for that explicitly, and the ids stay in the audit row.
      stoppedDetail = last.blockers?.[0]?.detail ?? last.detail ?? null
    }
  } catch { /* no attempt recorded is not a failure */ }

  // ── 🛑 ⚑ 10 Sep (I1) — DID THE AUTOMATIC START ACTUALLY HAPPEN? ──────────────────────
  //
  // ⛓️ WHAT THIS FIXES. `programme_p1_auto_refused` has been written since 9 Sep and NOTHING
  // read it. A programme whose automatic start refused — no attached ICP, no entitlement, the
  // provider down — sits in `SOURCING_AUTHORISED` with no leads, so `stillToCheck` is 0, no
  // preparation has ever been attempted, and the rule below finds nothing. `deriveLifecycle`
  // then answers `sourcing` · **Working**, about a programme where nothing is working and
  // nothing ever will without a person. That is the "Working forever" the founder saw.
  //
  // ⚠️ IT IS ASKED BEFORE `preparing` IS FINALISED, because a continuation running in THIS
  // process is the same "a run is in flight" fact the advance runner contributes, and a
  // working programme must never read as an exception.
  try {
    const { isP1ContinuationRunning, p1ContinuationHealth } = await import('./programme-p1-continuation')
    if (isP1ContinuationRunning(p.id)) preparing = true
    const health = await p1ContinuationHealth(p.id)
    if (health.stopped) {
      preparationStopped = true
      // ⚠️ THE CONTINUATION'S SENTENCE WINS OVER A LATER PREPARATION MESSAGE ONLY WHEN THERE
      // IS NONE. A programme that got as far as preparation has a more specific story to tell.
      stoppedDetail = stoppedDetail ?? health.detail
    }
  } catch { /* an unreadable continuation history never invents a task */ }

  // A batch with prospects nobody has judged, and no run in flight, is stopped work.
  if (!preparing && counts.stillToCheck > 0 && (p.status === 'SOURCING' || p.status === 'SOURCING_AUTHORISED')) {
    preparationStopped = true
    stoppedDetail = stoppedDetail
      ?? `${counts.stillToCheck} prospect${counts.stillToCheck === 1 ? '' : 's'} still need checking. Nothing was settled and no entitlement was used.`
  }

  // ── ⚑ 11 Sep (DAY 3) — HAS THE PACKAGE MOVED UNDER A REVIEWING CLIENT? ───────────────
  //
  // 🛑 ASKED ONLY AT `READY_FOR_APPROVAL`, and that is the whole point. It is a several-table
  // read, and every other status either has no frozen package or has already consumed it —
  // running it everywhere would spend the cost on a question nobody is asking.
  //
  // ⚠️ AN UNREADABLE ANSWER IS `false`, NOT `true`. This decides whether to INTERRUPT an
  // operator, and being wrong in this direction costs one un-raised task that the client's own
  // refusal will surface anyway; being wrong the other way puts every healthy reviewing client
  // into Needs you, which is how a Needs-you list stops being read.
  let reviewPackageStale = false
  if (p.status === 'READY_FOR_APPROVAL') {
    try {
      const { reviewDrift } = await import('./preparation-snapshot')
      reviewPackageStale = (await reviewDrift(p.id)).state === 'changed'
    } catch { /* an unreadable drift check never invents a task */ }
  }

  const entitlementTotal = p.sourcing_ceiling ?? 0
  const entitlementUsed = p.sourced_used ?? 0
  const entitlementRemaining = Math.max(0, entitlementTotal - entitlementUsed - (p.sourced_reserved ?? 0))
  const hasNewerProgramme = rows.some(r =>
    r.id !== p.id && String(r.created_at ?? '') > String(p.created_at ?? ''))

  const verdict = deriveLifecycle({
    programme: programmeFacts(p),
    proofStarted: true,
    preparationStopped, preparing,
    humanBlockers: humanBlockers.map(b => b.code),
    readinessReady,
    sends: counts.sends,
    repliesAwaitingDecision: counts.repliesAwaitingDecision,
    senderSendable, killSwitchOff, operatorRunEnabled,
    remainingEntitlement: entitlementRemaining,
    hasNewerProgramme,
    reviewPackageStale,
    // ⚠️ NOT PERSISTED YET, SO ALWAYS FALSE. "Not yet" is a dismissal we have nowhere to store;
    // rather than pretend, the repeat question keeps asking and the panel says nothing was
    // started. Inventing a column for it is a product decision, not a UI one.
    repeatDismissed: false,
  })

  const replyAwaiting = verdict.state === 'review_reply' ? await replyAwaitingFor(p.id, clientId) : null
  // ⚑ MVP1 (C03) — the client's own words, on the programme branch too. An operator agreeing
  // a meeting target must be able to read what the client actually asked for, and the target
  // is not a substitute for it: one is a number we proposed, the other is their sentence.
  const outcomeStated = await outcomeStatedFor(clientId)

  return {
    verdict, counts, replyAwaiting, humanBlockers, stoppedDetail,
    senderSendable, senderDetail: sender.detail, killSwitchOff, operatorRunEnabled, outcomeStated,
    programme: {
      id: p.id, status: String(p.status), meetingTarget: p.meeting_target,
      entitlementUsed, entitlementTotal, entitlementRemaining,
    },
  }
}

export type LifecycleBoardRow = {
  client_id: string
  stage: string
  stage_label: string
  state: string
  needs_you: boolean
  needs_you_reason: string | null
}

/**
 * Stage and needs-you for EVERY client, for the list and its badge.
 *
 * ⚠️ IT IS THE SAME DERIVATION, ON THINNER FACTS. The list cannot afford the detail call per
 * client, but it must not answer differently — so the cheap reads below feed the SAME
 * `deriveLifecycle`, and where a fact is too expensive to gather in bulk it is supplied in the
 * direction that does not invent a task (no stopped preparation, sender sendable).
 *
 * ⚠️ WHICH MEANS THE BADGE UNDER-COUNTS RATHER THAN OVER-COUNTS, deliberately. A client whose
 * exception only the detail call can see appears the moment they are opened; a badge that
 * cried wolf would be worse than one that is occasionally quiet.
 */
export async function lifecycleBoard(clientIds: string[]): Promise<LifecycleBoardRow[]> {
  const ids = [...new Set(clientIds.filter(Boolean))]
  if (ids.length === 0) return []

  const { outreachDeliveryPermitted } = await import('./outreach-kill-switch')
  const { operatorSendEnabled } = await import('./figsy')
  const killSwitchOff = outreachDeliveryPermitted()
  const operatorRunEnabled = operatorSendEnabled()

  const { data: progRows } = await db.from('programmes').select(PROGRAMME_COLUMNS).in('client_id', ids)
  const byClient = new Map<string, ProgrammeRow[]>()
  for (const r of ((progRows ?? []) as unknown as ProgrammeRow[])) {
    if (!byClient.has(r.client_id)) byClient.set(r.client_id, [])
    byClient.get(r.client_id)!.push(r)
  }

  // Which clients have an ICP at all — the Proof signal, read once for everybody.
  const withIcp = new Set<string>()
  try {
    const { data } = await db.from('icps').select('client_id').in('client_id', ids)
    for (const r of ((data ?? []) as { client_id: string | null }[])) if (r.client_id) withIcp.add(r.client_id)
  } catch { /* no ICP read → every client without a programme reads as Signup */ }

  // ── 🛑 10 Sep — THE CLIENT-LEVEL PROOF FACTS, READ ONCE FOR THE WHOLE BOARD ──────────
  //
  // ⛓️ WHAT THIS FIXES (#1674's other half). The board is the source of the client LIST, the
  // stage word on every row and the Needs-you COUNT — and it passed only `proofStarted`. So
  // an escalated client (`proof_calibration_failed`, the one Proof-stage task) never appeared
  // in the filter or the badge: the reason existed on the server and only the OPENED detail
  // panel could see it. A task nobody is shown is not a task.
  //
  // `proof_completed_at` is read here for the same reason: a client who accepted their set
  // must read as Recommendation on the row, not Proof.
  //
  // ⚠️ ONE QUERY FOR EVERYBODY, matching the ICP and inbox reads above — a per-client read
  // here would issue one round trip per row on the operator's default screen.
  // ⚠️ FAILS SOFT TO "UNKNOWN", NOT TO "FINE". An unreadable answer leaves both sets empty,
  // which reads as `null` for the escalation (asserting nothing) and keeps the client at
  // Proof — never as a silent "this client needs nothing".
  const escalatedProof = new Set<string>()
  const completedProof = new Set<string>()
  let proofFactsRead = true
  try {
    const { data, error } = await db.from('clients')
      .select('id, proof_review_requested_at, proof_review_resolved_at, proof_completed_at')
      .in('id', ids)
    if (error) throw new Error(error.message)
    for (const r of ((data ?? []) as {
      id: string; proof_review_requested_at: string | null
      proof_review_resolved_at: string | null; proof_completed_at: string | null
    }[])) {
      if (r.proof_review_requested_at && !r.proof_review_resolved_at) escalatedProof.add(r.id)
      if (r.proof_completed_at) completedProof.add(r.id)
    }
  } catch (e) {
    proofFactsRead = false
    console.error('[lifecycle-board] the client-level Proof facts could not be read — escalations will not be flagged this render', e)
  }

  // Sender health, read once for everybody rather than once per client.
  const sendable = new Set<string>()
  const hasInbox = new Set<string>()
  try {
    const { data } = await db.from('client_inboxes').select('client_id, status').in('client_id', ids)
    for (const r of ((data ?? []) as { client_id: string | null; status: string | null }[])) {
      if (!r.client_id) continue
      hasInbox.add(r.client_id)
      if (SENDABLE_INBOX.has(String(r.status))) sendable.add(r.client_id)
    }
  } catch { for (const id of ids) { hasInbox.add(id); sendable.add(id) } }

  // ── 🛑 ⚑ 10 Sep (I1) — THE STRANDED AUTOMATIC STARTS, READ ONCE FOR THE WHOLE BOARD ──
  //
  // ⛓️ WHY THIS ONE BREAKS THE BOARD'S "UNDER-COUNT" RULE ON PURPOSE. Everything else the
  // board declines to gather (stopped preparation, human blockers) is an exception the DETAIL
  // call will find the moment the client is opened. This one is different in kind: a programme
  // whose automatic start refused shows `Sourcing · Working` on the row, so nothing tells the
  // operator to open it. An exception that hides the reason to look for it is not an
  // under-count, it is a client waiting forever — which is exactly what happened.
  //
  // ⚠️ TWO QUERIES FOR EVERYBODY, never one per row: the outcome trail and the batch
  // existence, both keyed on the current programme ids. The same shape as the Proof facts and
  // the inbox read above.
  // ⚠️ FAILS SOFT TO "NOTHING STOPPED". An unreadable trail asserts nothing, and the detail
  // call still finds the exception when the client is opened.
  const currentByClient = new Map<string, ProgrammeRow>()
  for (const clientId of ids) {
    const p = currentProgramme(byClient.get(clientId) ?? [])
    if (p) currentByClient.set(clientId, p)
  }
  const progIds = [...currentByClient.values()].map(p => p.id)
  const continuationStopped = new Map<string, string>()
  if (progIds.length > 0) {
    try {
      const { data } = await db.from('operator_audit_log')
        .select('subject_id, action, detail, created_at')
        .eq('subject_type', 'programme')
        .in('subject_id', progIds)
        .in('action', ['programme_p1_auto_started', 'programme_p1_auto_refused'])
        .order('created_at', { ascending: false }).limit(5000)
      // Newest first, so the FIRST row seen for a programme is its latest outcome and every
      // later row for that programme is history. A refusal that has since been superseded by a
      // successful start must not raise an exception.
      const seen = new Set<string>()
      for (const r of ((data ?? []) as {
        subject_id: string | null; action: string; detail: Record<string, unknown> | null
      }[])) {
        const sid = r.subject_id
        if (!sid || seen.has(sid)) continue
        seen.add(sid)
        if (r.action !== 'programme_p1_auto_refused') continue
        const d = r.detail ?? {}
        continuationStopped.set(sid, typeof d.detail === 'string' && d.detail
          ? d.detail
          : 'This programme did not start automatically, and no reason was recorded.')
      }
    } catch { /* an unreadable trail flags nothing here — the detail call still will */ }
  }

  const out: LifecycleBoardRow[] = []
  for (const clientId of ids) {
    const rows = byClient.get(clientId) ?? []
    const p = currentProgramme(rows)
    if (!p) {
      const v = deriveLifecycle({
        programme: null, proofStarted: withIcp.has(clientId) ? true : null,
        // ⚠️ `null` WHEN THE READ FAILED, so an unreadable answer asserts nothing rather than
        // asserting the client is fine — the same rule `proofCalibrationFailedFor` applies.
        proofCalibrationFailed: proofFactsRead ? escalatedProof.has(clientId) : null,
        proofCompleted: proofFactsRead ? completedProof.has(clientId) : null,
        preparationStopped: false, preparing: false, humanBlockers: [], readinessReady: false,
        sends: 0, repliesAwaitingDecision: 0, senderSendable: true,
        killSwitchOff, operatorRunEnabled, remainingEntitlement: 0,
        hasNewerProgramme: false, repeatDismissed: false,
      })
      out.push(row(clientId, v))
      continue
    }

    const campaignId = await campaignIdFor(p.id)
    const sends = campaignId
      ? await countRows('figsy_sent_emails', q => (q as unknown as { eq: (c: string, v: string) => unknown }).eq('campaign_id', campaignId))
      : 0

    // Replies awaiting a person, scoped through this programme's leads — the one per-client
    // read the badge genuinely cannot do without, because it is a whole Needs-you rule.
    let repliesAwaitingDecision = 0
    try {
      const { data: leadRows } = await db.from('leads')
        .select('id').eq('programme_id', p.id).eq('client_id', clientId).limit(20000)
      const leadIds = ((leadRows ?? []) as { id: string }[]).map(r => r.id)
      if (leadIds.length > 0) {
        const { data } = await db.from('figsy_replies')
          .select('classification').in('lead_id', leadIds).is('qualified_at', null)
        repliesAwaitingDecision = ((data ?? []) as { classification: string | null }[])
          .filter(r => !AUTO_HANDLED_REPLY.has(String(r.classification))).length
      }
    } catch { /* zero — the list never invents a reply */ }

    const entitlementRemaining = Math.max(0,
      (p.sourcing_ceiling ?? 0) - (p.sourced_used ?? 0) - (p.sourced_reserved ?? 0))

    const v = deriveLifecycle({
      programme: programmeFacts(p),
      proofStarted: true,
      // Not gathered in bulk — an exception the detail call finds appears when the client is
      // opened. Under-count, never over-count.
      // ⚑ 10 Sep (I1) — EXCEPT the stranded automatic start, which is read in bulk above
      // precisely because a row reading "Working" is what stops anybody opening it.
      preparationStopped: continuationStopped.has(p.id),
      preparing: false, humanBlockers: [],
      // ⚠️ READINESS IS NOT RUN PER CLIENT HERE either. `readinessReady` only decides whether an
      // APPROVED+P2 programme offers Make Live; supplying `true` means the badge shows it, and
      // the detail call is what refuses if a blocker is really in the way.
      readinessReady: true,
      sends, repliesAwaitingDecision,
      senderSendable: hasInbox.has(clientId) ? sendable.has(clientId) : false,
      killSwitchOff, operatorRunEnabled,
      remainingEntitlement: entitlementRemaining,
      hasNewerProgramme: rows.some(r => r.id !== p.id && String(r.created_at ?? '') > String(p.created_at ?? '')),
      repeatDismissed: false,
    })
    out.push(row(clientId, v))
  }
  return out
}

function row(clientId: string, v: LifecycleVerdict): LifecycleBoardRow {
  return {
    client_id: clientId, stage: v.stage, stage_label: v.stageLabel, state: v.state,
    needs_you: v.needsYou, needs_you_reason: v.needsYouReason,
  }
}
