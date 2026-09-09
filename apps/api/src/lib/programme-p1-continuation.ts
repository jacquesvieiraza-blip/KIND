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

/**
 * Everything that must be true before a programme may spend a client's entitlement.
 *
 * ⚠️ READ FROM THE ROW, NEVER FROM THE CALLER. The webhook knows a payment succeeded; it does
 * not know whether this programme is paused, terminal, or targeted at anything.
 */
export async function p1ContinuationVerdict(
  programmeId: string,
): Promise<{ ok: true; programme: ProgrammeRow } | { ok: false; reason: string }> {
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
    reason: `This programme could not be checked before sourcing (${err instanceof Error ? err.message : String(err)}). Nothing was sourced.`,
  }))
  if (!verdict.ok) {
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
