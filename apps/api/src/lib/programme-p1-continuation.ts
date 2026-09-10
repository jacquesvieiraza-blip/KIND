// ═══════════════════════════════════════════════════════════════════════════════════════
// P1 IS COMMITTED — SO THE PROGRAMME STARTS. No operator "Source now", no GO.
//
// ── THE FOUNDER'S RULE, AND WHAT THE REPO ACTUALLY DID ──────────────────────────────────
//
//     Once VALID P1 authority exists for an exact programme:
//     P1 → source → enrich → qualify → account → prepare, automatically.
//
// `sourceProgramme` had exactly ONE caller and it was an operator route. So a client could pay,
// the ceiling could open, the programme could sit in `SOURCING_AUTHORISED` — and nothing would
// happen until a human noticed and pressed a button. That is not a slower version of the rule,
// it is a different product: the paid thing does not start on its own.
//
// ── AND THE OLD COMMENT THAT SAID THE OPPOSITE ──────────────────────────────────────────
//
// ⛓️ The rule "payment must never start sourcing" is SUPERSEDED for this programme flow by the
// founder's newer decision. It was never really about payment — it was about an UNCHECKED
// webhook spending money, and that concern is met by the shape below rather than by refusing to
// start at all:
//
//     payment (or internal P1) → canonical P1 authority COMMITTED → this orchestrator
//     → every fact re-proved from the row → `sourceProgramme`
//
// The webhook does not spend. It records the authority, and the authority is what starts the
// work — which is the same discipline every other gate in this package follows.
//
// ── WHAT THIS PROVES BEFORE ANYTHING IS BOUGHT ─────────────────────────────────────────
//
//   exact programme (a uuid, never a client or a name) · not terminal · not paused · P1
//   authority present on the ROW · exactly one attached ICP · that ICP belongs to the same
//   client · entitlement left to spend · no run already in flight
//
// `sourceProgramme` re-proves all of it and more (`authorityFor(NEXT_BATCH)`, the ceiling, the
// batch maths). Two checks of one fact: the cost of the redundant one is a function call, and
// the cost of missing it is a client's money.
//
// ── WHAT IT MAY NEVER DO ────────────────────────────────────────────────────────────────
//
//   • never grants P2, never approves, never makes live, never runs, never sends
//   • never sources a programme that already has work in flight
//   • never sources twice for one payment — a redelivered webhook is a no-op, because the
//     caller only reaches this when `recordFirstPayment` actually claimed the row
//
// The rest of the chain is already automatic: the sourcing run enriches, qualifies, settles,
// surfaces, and then `advanceAfterSettlement` prepares and moves the programme to
// READY_FOR_APPROVAL. This is the one missing link at the front of it.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { db } from '@kind/db'
import { TERMINAL_STATUSES, p1Authorised, SOURCING_AUTHORISED_STATUSES, type ProgrammeRow } from './programme'

/** What committed the P1 authority. Logs and audit only. */
export type P1Trigger = 'stripe_first_payment' | 'internal_first_authority' | 'operator_retry'

export interface P1StartResult {
  started: boolean
  already_running: boolean
  /** Founder-plain sentence. Safe to render, never a stack trace. */
  detail: string
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** In-flight sourcing runs, keyed by programme id. Process-local, like the advance runner. */
const inFlight = new Map<string, Promise<void>>()

/** Is a P1 continuation currently sourcing this programme in this process? */
export function isP1ContinuationRunning(programmeId: string): boolean {
  return inFlight.has(programmeId)
}

// ═══════════════════════════════════════════════════════════════════════════════════════
// ⚑ 10 Sep (I1) — RESUMING, AND TELLING THE TRUTH ABOUT A CONTINUATION THAT DID NOT FINISH
//
// ── THE TWO DEFECTS THIS SECTION CLOSES ─────────────────────────────────────────────────
//
// ① THE CLAIM WAS PROCESS-LOCAL AND NOTHING ELSE GUARDED THE SPEND. `inFlight` above is a
//    `Map` in one node process. Restart it, or run a second instance, and the map is empty —
//    so "this programme is already sourcing" stopped being true the moment the thing that
//    knew it went away. The map is kept (it is the cheap, immediate answer) but it is no
//    longer the only thing between one payment and two sourcing runs.
//
// ② A REFUSED CONTINUATION WAS AUDITED AND THEN NEVER READ. `programme_p1_auto_refused` has
//    been written since 9 Sep and `programme-lifecycle-facts.ts` did not look at it, so a
//    programme whose automatic start refused — no attached ICP, entitlement exhausted, the
//    provider down — sat in `SOURCING_AUTHORISED` with no leads and no preparation attempt,
//    which the derivation reads as `sourcing` · **Working**. Forever. The reason existed in
//    the database the whole time; nothing asked for it.
//
// ── 🛑 WHY THERE IS NO NEW COLUMN, AND WHY THAT IS THE SAFER ANSWER ─────────────────────
//
// The obvious fix is a durable claim column and a compare-and-set. It was not taken, because
// a claim answers "did somebody START this" and the question that actually protects a client's
// money is **"has this programme already SPENT?"** — and that fact is already stored, in
// `programme_batches`. A batch row is opened by `try_spend_sourcing` inside the run itself, so:
//
//   • a run that opened a batch → the spend happened → never start a second one
//   • a run that died BEFORE opening a batch → nothing was bought → a retry is correct
//
// Detecting the completed step beats locking against a repeat: a lock stranded by a crash
// blocks a start that would have been safe, and a lock lost to a restart permits one that
// is not. `programme_batches` cannot be wrong about either, and it needs no migration on the
// evening of a launch.
//
// ⚠️ THIS IS THE FIRST-START GUARD, NOT A ONE-BATCH-PER-PROGRAMME RULE. Later batches are
// opened deliberately by the advance/operator paths under `NEXT_BATCH` authority. What may
// never happen twice is the AUTOMATIC start that one P1 payment buys.
// ═══════════════════════════════════════════════════════════════════════════════════════

/** Outcome audit actions, newest-first, that say a continuation actually finished. */
const OUTCOME_ACTIONS = ['programme_p1_auto_started', 'programme_p1_auto_refused'] as const

/**
 * Has this programme already opened a batch — i.e. has the money already been spent once?
 *
 * ⚠️ AN UNREADABLE ANSWER IS `null`, AND THE CALLER TREATS IT AS "DO NOT START". Guessing
 * `false` here would let a transient read error authorise a second spend against one payment,
 * which is the exact failure the whole file is written against. Guessing `true` would strand a
 * paid programme; `null` says so out loud instead.
 */
async function alreadySpent(programmeId: string): Promise<boolean | null> {
  try {
    const { data, error } = await db.from('programme_batches')
      .select('id').eq('programme_id', programmeId).limit(1)
    if (error) return null
    return (data ?? []).length > 0
  } catch { return null }
}

export type P1ContinuationAttempt = {
  at: string
  ok: boolean
  /** The plain sentence already written into the audit row. Never a stack trace. */
  detail: string
}

/**
 * The last automatic start this programme attempted, read back out of the audit trail.
 *
 * ⚠️ THE AUDIT LOG IS THE STORE, DELIBERATELY. It has held both outcomes since 9 Sep, it is
 * already the home of "why did this programme start sourcing", and `lastPreparationAttempt`
 * reads its own two actions out of it in exactly this shape. A second home for the same fact
 * is a second answer waiting to disagree with the first.
 */
export async function lastP1ContinuationAttempt(programmeId: string): Promise<P1ContinuationAttempt | null> {
  try {
    const { data, error } = await db.from('operator_audit_log')
      .select('action, detail, created_at')
      .eq('subject_type', 'programme').eq('subject_id', programmeId)
      .in('action', OUTCOME_ACTIONS as unknown as string[])
      .order('created_at', { ascending: false }).limit(1)
    if (error) return null
    const row = ((data ?? []) as { action: string; detail: Record<string, unknown> | null; created_at: string }[])[0]
    if (!row) return null
    const ok = row.action === 'programme_p1_auto_started'
    const d = row.detail ?? {}
    return {
      at: row.created_at,
      ok,
      detail: typeof d.detail === 'string' && d.detail
        ? d.detail
        : (ok ? 'This programme started sourcing.' : 'This programme did not start, and no reason was recorded.'),
    }
  } catch { return null }
}

export type P1ContinuationHealth = {
  /** The automatic start did not finish, and nothing is going to move it without a person. */
  stopped: boolean
  /** Founder-plain sentence for the panel. Null when nothing is wrong. */
  detail: string | null
}

const HEALTHY: P1ContinuationHealth = { stopped: false, detail: null }

/**
 * 🛑 DID THE AUTOMATIC START ACTUALLY HAPPEN — the question Vida never asked.
 *
 * Four answers, and only one of them is an exception:
 *
 *   in flight here          → not stopped (the caller renders it as `preparing`)
 *   last outcome = started  → not stopped; the chain carries on by itself from there
 *   last outcome = refused  → STOPPED, and the refusal's own sentence is what the operator reads
 *   no outcome, but a batch → STOPPED: it spent and then died, which no retry may undo silently
 *
 * ⚠️ NO OUTCOME AND NO BATCH IS NOT AN EXCEPTION. That is a programme whose payment has only
 * just landed, or one this process has never been asked about. Calling it broken would put
 * every freshly paid client into Needs you for the seconds before their run starts.
 */
export async function p1ContinuationHealth(programmeId: string): Promise<P1ContinuationHealth> {
  const id = typeof programmeId === 'string' ? programmeId.trim() : ''
  if (!UUID.test(id)) return HEALTHY
  if (inFlight.has(id)) return HEALTHY

  const [attempt, spent] = await Promise.all([lastP1ContinuationAttempt(id), alreadySpent(id)])

  if (attempt && !attempt.ok) return { stopped: true, detail: attempt.detail }
  if (attempt && attempt.ok) return HEALTHY

  // ⚠️ A SPEND WITH NO RECORDED OUTCOME. The run reached the provider and the process went away
  // before it could say how it went — a redeploy mid-run is the ordinary cause. It is reported
  // rather than retried, because what it bought is unknown and buying it again is not free.
  if (spent === true) {
    return {
      stopped: true,
      detail: 'This programme started sourcing automatically and never recorded how it finished — '
        + 'most likely the service restarted mid-run. Its batch is open, so nothing will restart it by itself. '
        + 'Check what the batch actually contains before starting anything else.',
    }
  }
  return HEALTHY
}

/**
 * Everything that must be true before a programme may spend a client's entitlement.
 *
 * ⚠️ READ FROM THE ROW, NEVER FROM THE CALLER. The webhook knows a payment succeeded; it does
 * not know whether this programme is paused, terminal, or targeted at anything.
 */
export async function p1ContinuationVerdict(
  programmeId: string,
): Promise<{ ok: true; programme: ProgrammeRow } | { ok: false; reason: string; alreadyDone?: true }> {
  const id = typeof programmeId === 'string' ? programmeId.trim() : ''
  if (!UUID.test(id)) {
    return { ok: false, reason: 'A programme id is required, and it must be the exact uuid of the programme. Nothing was sourced.' }
  }

  const { data, error } = await db.from('programmes').select('*').eq('id', id).maybeSingle()
  if (error) return { ok: false, reason: `This programme's row could not be read (${error.message}). Nothing was sourced.` }
  if (!data) return { ok: false, reason: 'There is no programme with that id. Nothing was sourced.' }
  const p = data as unknown as ProgrammeRow

  if (TERMINAL_STATUSES.includes(p.status)) return { ok: false, reason: `This programme is ${p.status}, so there is nothing to start.` }
  if (p.paused_at) return { ok: false, reason: 'This programme is paused, so it was not started.' }
  // 🛑 A DISPUTED OR REFUNDED PROGRAMME IS PAUSED BY `recordDispute`, so the line above already
  // covers it. Stated here because the two facts are separately important and a future edit to
  // one must not silently remove the other.
  if (!p1Authorised(p)) return { ok: false, reason: 'This programme has no first-payment authority, so it has bought nothing to source.' }
  if (!SOURCING_AUTHORISED_STATUSES.includes(p.status)) {
    return { ok: false, reason: `This programme is ${p.status}, which carries no sourcing authority.` }
  }

  // ⚠️ ENTITLEMENT IS CHECKED HERE AS WELL AS INSIDE `sourceProgramme`. A programme with nothing
  // left to spend must not start a run that will immediately refuse — an operator reading the
  // audit log should see "there was nothing left", not a failed attempt.
  const left = (p.sourcing_ceiling ?? 0) - (p.sourced_used ?? 0) - (p.sourced_reserved ?? 0)
  if (left <= 0) {
    return { ok: false, reason: `This programme has no entitlement left to source (${p.sourced_used ?? 0} used of ${p.sourcing_ceiling ?? 0}).` }
  }

  // 🛑 EXACTLY ONE ATTACHED ICP, AND IT MUST BE THIS CLIENT'S. `sourceProgramme` refuses on both
  // too; proving it before starting a background run is what turns "it silently did nothing"
  // into a named answer the operator can act on.
  const { data: icps, error: icpErr } = await db.from('icps')
    .select('id, client_id').eq('programme_id', id)
  if (icpErr) return { ok: false, reason: `This programme's targeting could not be read (${icpErr.message}). Nothing was sourced.` }
  const attached = ((icps ?? []) as { id: string; client_id: string | null }[]).filter(r => r?.id)
  if (attached.length === 0) {
    return { ok: false, reason: 'No ICP is attached to this programme, so there is nothing it is authorised to source. Attach the targeting first.' }
  }
  if (attached.length > 1) {
    return { ok: false, reason: `This programme has ${attached.length} attached ICPs, so which audience this batch is for is a human decision. Nothing was sourced.` }
  }
  if (attached[0].client_id !== p.client_id) {
    return { ok: false, reason: 'The ICP attached to this programme belongs to a different client. Nothing was sourced.' }
  }

  // ── 🛑 ⚑ 10 Sep (I1) — HAS THIS PROGRAMME ALREADY SPENT? THE LAST QUESTION, AND THE ONE
  // THAT SURVIVES A RESTART ────────────────────────────────────────────────────────────────
  //
  // Asked LAST, after every cheap refusal, because it is the only check that costs a query
  // against a table this file otherwise never touches — and because the earlier refusals are
  // the ones an operator can act on.
  //
  // ⚠️ `alreadyDone` MARKS IT AS A NO-OP, NOT A FAILURE. A redelivered webhook, a double press
  // or a retry after an interruption all land here, and none of them is a fault worth auditing
  // as a refusal — auditing it would put a healthy programme into Needs you (see
  // `p1ContinuationHealth`, which reads a refusal as an exception). It answers, and stops.
  //
  // 🛑 AND AN UNREADABLE ANSWER REFUSES. `null` means we could not tell whether a client's
  // money has already been spent, and the only safe thing to do with that is nothing.
  const spent = await alreadySpent(id)
  if (spent === null) {
    return { ok: false, reason: 'This programme\'s existing batches could not be read, so whether it has already sourced is unknown. Nothing was sourced.' }
  }
  if (spent) {
    return {
      ok: false,
      alreadyDone: true,
      reason: 'This programme has already sourced a batch, so its automatic start is done. Nothing new was started.',
    }
  }

  return { ok: true, programme: p }
}

/**
 * Start a programme now that its P1 authority is committed.
 *
 * ⚠️ IT RETURNS AT ONCE AND SOURCES IN THE BACKGROUND. A sourcing run is minutes of provider
 * calls; holding a Stripe webhook open for it would time out the webhook, and Stripe would
 * redeliver — which is how one payment becomes two sourcing runs. The webhook records the
 * authority, answers, and the work continues.
 *
 * ⚠️ IT NEVER THROWS. It is called from a webhook that has already committed money-bearing
 * state; an exception escaping here would fail a delivery Stripe would then retry, against a
 * programme whose payment is already recorded.
 */
export async function startProgrammeAfterP1(
  programmeId: string, trigger: P1Trigger, actor: string,
): Promise<P1StartResult> {
  const id = typeof programmeId === 'string' ? programmeId.trim() : ''

  if (inFlight.has(id)) {
    return { started: false, already_running: true, detail: 'This programme is already sourcing. Nothing new was started.' }
  }

  const verdict = await p1ContinuationVerdict(id).catch(err => ({
    ok: false as const,
    // ⚠️ EXPLICITLY NOT `alreadyDone`. A verdict that threw tells us nothing about whether this
    // programme has already sourced, and the union must carry the key so the check below reads
    // it rather than narrowing this branch out of existence.
    alreadyDone: undefined,
    reason: `This programme could not be checked before sourcing (${err instanceof Error ? err.message : String(err)}). Nothing was sourced.`,
  }))
  if (!verdict.ok) {
    // ⚠️ ⚑ 10 Sep (I1) — "ALREADY DONE" IS NOT A REFUSAL, AND MUST NOT BE AUDITED AS ONE.
    // A redelivered webhook or a retry after an interruption reaches this line on a perfectly
    // healthy programme; writing `programme_p1_auto_refused` for it would make
    // `p1ContinuationHealth` read the newest outcome as an exception and put a working client
    // into Needs you. It is reported as already-running, which is what it is.
    if (verdict.alreadyDone) {
      return { started: false, already_running: true, detail: verdict.reason }
    }
    console.error(`[p1-continuation] ${trigger} → programme ${id} NOT started: ${verdict.reason}`)
    await audit(id, null, actor, false, trigger, verdict.reason)
    return { started: false, already_running: false, detail: verdict.reason }
  }

  const clientId = verdict.programme.client_id

  const run = (async () => {
    try {
      const { sourceProgramme } = await import('./programme-sourcing')
      const r = await sourceProgramme(id)
      // ⚠️ THE SOURCING RUN CARRIES THE REST OF THE CHAIN ITSELF — enrich, qualify, settle,
      // surface, and then `advanceAfterSettlement` prepares and moves the programme to
      // READY_FOR_APPROVAL. Nothing further is orchestrated here, because a second orchestrator
      // is a second definition of the order.
      if (r.ok) {
        const summary =
          `${r.inserted} prospect(s) obtained of ${r.requested} requested for ${r.icpName ?? 'the attached targeting'}` +
          `${r.skipped ? ` · ${r.skipped} skipped` : ''}.`
        console.log(`[p1-continuation] ${trigger} → programme ${id} sourced: ${summary}`)
        await audit(id, clientId, actor, true, trigger, summary)
      } else {
        console.error(`[p1-continuation] ${trigger} → programme ${id} sourcing refused: ${r.message}`)
        await audit(id, clientId, actor, false, trigger, r.message)
      }
    } catch (err) {
      const why = err instanceof Error ? err.message : String(err)
      console.error(`[p1-continuation] ${trigger} → programme ${id} threw while sourcing:`, why)
      await audit(id, clientId, actor, false, trigger,
        `Sourcing could not be completed (${why}). The programme's authority and entitlement are unchanged.`)
    }
  })()

  inFlight.set(id, run)
  void run.finally(() => { if (inFlight.get(id) === run) inFlight.delete(id) })
  return {
    started: true,
    already_running: false,
    detail: 'This programme is sourcing. It will qualify, account and prepare itself, then wait for the client to approve. Nothing is sent.',
  }
}

/**
 * The record of an automatic start.
 *
 * ⚠️ AUDITED ON BOTH BRANCHES. An automatic action nobody pressed is exactly the kind that must
 * leave a trail — "why did this client's programme start sourcing" has to be answerable without
 * reading code, and a refusal is as important as a start.
 */
async function audit(
  programmeId: string, clientId: string | null, actor: string,
  ok: boolean, trigger: P1Trigger, detail: string,
): Promise<void> {
  try {
    const { writeOperatorAudit } = await import('./operator-audit')
    await writeOperatorAudit({
      operatorEmail: actor,
      clientId,
      action: ok ? 'programme_p1_auto_started' : 'programme_p1_auto_refused',
      subjectType: 'programme',
      subjectId: programmeId,
      detail: { trigger, detail },
    })
  } catch (err) {
    console.error(`[p1-continuation] outcome for programme ${programmeId} could not be audited:`, err)
  }
}
