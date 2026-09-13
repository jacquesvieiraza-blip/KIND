// ═══════════════════════════════════════════════════════════════════════════════════════
// THE CALIBRATION HAND-OFF'S DB GLUE. The decision is `proof-calibration.ts` and is PURE.
//
// ── WHERE THE STATE COMES FROM ──────────────────────────────────────────────────────────
//
// Nothing here invents a store. Every fact already has one canonical home:
//
//   passes used        → `clients.proof_passes_done` (the column the claim RPC increments)
//   escalated          → `clients.proof_review_requested_at` open, `_resolved_at` null
//   what was surfaced  → `leads.proof_pass` (stamped by the run, since 20260903)
//   what the client said → `lead_feedback` (action + reason_code + free_text, per lead)
//
// ⚠️ THE ATTEMPT SUMMARIES ARE DERIVED, NEVER STORED. Storing them would be a second answer
// to "what did the client actually say", and the two would disagree the first time somebody
// changed their mind about a card.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { db } from '@kind/db'
import {
  calibrationVerdict, spendDoors, PROOF_REASON_CODES,
  type AttemptSummary, type CalibrationState, type ClientSignal, type ProofBatchKind,
  type EscalationTrigger, type ProofReasonCode, type SpendDoors,
} from './proof-calibration'

export const CALIBRATION_MIGRATION = '20260910_proof_calibration_handoff'

/** The client columns this hand-off reads. */
const CLIENT_COLUMNS =
  // ⚑ 11 Sep — `contact_name` joins the read because the human calibration path needs a NAME
  // as well as a number: an operator with a phone and no name opens the call with "hello, is
  // that… the company?" Milla asks only for what we do not already hold.
  'id, phone, contact_name, proof_passes_done, proof_review_requested_at, proof_review_resolved_at, ' +
  'proof_escalation_trigger, proof_phone_confirmed_at, proof_calibration_note, proof_calibrated_restart_at, ' +
  // ⚑ 11 Sep (C39/C23) — the restart's SECOND fact, who resolved it, and the refinement gate.
  // Unselected they read `undefined`, which `calibratedRestart` treats as "never granted" and
  // `mayRequestStrongerSet` treats as "no refinement in flight" — i.e. exactly today's
  // behaviour on a database where 20260911_proof_restart_and_refinement has not run.
  'proof_calibrated_restart_used_at, proof_calibration_resolved_by, ' +
  'proof_refinement_text, proof_refinement_proposed_at, proof_refinement_confirmed_at, ' +
  // ⚑ 10 Sep (A) — the client's own acceptance. Unselected it reads `undefined`, which the
  // rule treats as "not accepted", so the controls would never retire.
  'proof_completed_at'

export interface CalibrationRecord extends CalibrationState {
  clientId: string
  phone: string | null
  /** Who to ask for on the calibration call. Never invented; asked for when absent. */
  contactName: string | null
  phoneConfirmedAt: string | null
  escalatedAt: string | null
  resolvedAt: string | null
  trigger: EscalationTrigger | null
  operatorNote: string | null
  restartAt: string | null
  /** ⚑ 11 Sep — when the granted restart was SPENT. Null while it is still available. */
  restartUsedAt: string | null
  /** Who recorded the human calibration resolution. */
  resolvedBy: string | null
  doors: SpendDoors
}

/**
 * Read one client's calibration state.
 *
 * ⚠️ IT THROWS ON AN UNREADABLE CLIENT rather than returning a calm zero. `passesDone: 0`
 * reads as "they have spent nothing", which would re-open every spend door on a client who
 * has used both passes — the most expensive possible way to be wrong here.
 */
export async function readCalibration(clientId: string): Promise<CalibrationRecord> {
  const { data, error } = await db.from('clients').select(CLIENT_COLUMNS).eq('id', clientId).maybeSingle()
  if (error) throw new Error(`calibration state for client ${clientId} could not be read — ${error.message}`)
  if (!data) throw new Error(`calibration state for client ${clientId} could not be read — no such client`)
  const c = data as unknown as Record<string, unknown>

  const attempts = await readAttempts(clientId)
  const state: CalibrationState = {
    passesDone: Number(c.proof_passes_done ?? 0) || 0,
    escalated: !!c.proof_review_requested_at && !c.proof_review_resolved_at,
    completedAt: (c.proof_completed_at as string | null) ?? null,
    attempts,
    restartGrantedAt: (c.proof_calibrated_restart_at as string | null) ?? null,
    restartUsedAt: (c.proof_calibrated_restart_used_at as string | null) ?? null,
    // ⚠️ A ROW WITH NO REFINEMENT IS `null`, NOT AN EMPTY ONE. An empty object would read as
    // "a refinement exists and is unconfirmed", which CLOSES the improved-set door — turning
    // an un-migrated database into a client who can never reach Attempt 2.
    refinement: (c.proof_refinement_text ?? c.proof_refinement_proposed_at ?? c.proof_refinement_confirmed_at)
      ? {
          clientWords: (c.proof_refinement_text as string | null) ?? '',
          proposedAt: (c.proof_refinement_proposed_at as string | null) ?? null,
          confirmedAt: (c.proof_refinement_confirmed_at as string | null) ?? null,
        }
      : null,
  }
  return {
    ...state,
    clientId,
    phone: (c.phone as string | null) ?? null,
    contactName: (c.contact_name as string | null) ?? null,
    phoneConfirmedAt: (c.proof_phone_confirmed_at as string | null) ?? null,
    escalatedAt: (c.proof_review_requested_at as string | null) ?? null,
    resolvedAt: (c.proof_review_resolved_at as string | null) ?? null,
    trigger: (c.proof_escalation_trigger as EscalationTrigger | null) ?? null,
    operatorNote: (c.proof_calibration_note as string | null) ?? null,
    restartAt: (c.proof_calibrated_restart_at as string | null) ?? null,
    restartUsedAt: (c.proof_calibrated_restart_used_at as string | null) ?? null,
    resolvedBy: (c.proof_calibration_resolved_by as string | null) ?? null,
    doors: spendDoors(state),
  }
}

const isReason = (v: unknown): v is ProofReasonCode =>
  (PROOF_REASON_CODES as readonly string[]).includes(String(v))

/**
 * One summary per pass, from the two canonical stores.
 *
 * ⚠️ `bad_timing` IS READ AND NOT COUNTED BY NAME. It is a legacy reason code that predates
 * the founder's six and may sit on historical rows; it is folded into `other` rather than
 * dropped, because a rejection nobody counts is a rejection that reads as approval.
 */
export async function readAttempts(clientId: string): Promise<AttemptSummary[]> {
  // ⚑ 11 Sep — `proof_batch_kind` JOINS THE SELECT, and it is what tells the one
  // human-authorised calibrated restart from the two automatic attempts. NULL reads as
  // 'automatic', which is the honest answer for every row written before the column existed.
  //
  // ── 🛑 DAY-2 — AND IT DEGRADES RATHER THAN TAKING THE WHOLE PROOF SURFACE DOWN ────────
  //
  // ⚠️ THIS WAS A REAL EXPAND/CONTRACT HAZARD, found by a test asserting the wrong reason
  // code. Selecting a column that does not exist yet makes Postgres answer 42703 for the WHOLE
  // query — so between this deploy and `20260911_lead_proof_batch_kind` being applied, EVERY
  // calibration read would have failed: the client's own Proof screen, Vida's evidence panel
  // and the escalation path, for every escalated client, not just for a restart.
  //
  // ⚠️ SO A MISSING COLUMN FALLS BACK TO THE PRE-MIGRATION SHAPE, which is exactly truthful:
  // if the column does not exist, no calibrated restart can ever have been written, so every
  // attributed row IS an automatic attempt. Nothing is guessed and nothing is hidden.
  //
  // ⚠️ AND IT IS NOT A LICENCE TO SPEND. The restart claim probes the same capability
  // separately (`proofProvenanceAvailable`) and REFUSES — reading history without provenance
  // is safe; consuming a one-use authority without it is not.
  type ProofLeadRow = { id: string; proof_pass: number | null; proof_batch_kind?: string | null }
  let leadRows: ProofLeadRow[] = []
  {
    const withKind = await db.from('leads')
      .select('id, proof_pass, proof_batch_kind').eq('client_id', clientId).not('proof_pass', 'is', null)
    if (!withKind.error) {
      leadRows = (withKind.data ?? []) as unknown as ProofLeadRow[]
    } else if (/proof_batch_kind/.test(withKind.error.message ?? '')) {
      const legacy = await db.from('leads')
        .select('id, proof_pass').eq('client_id', clientId).not('proof_pass', 'is', null)
      if (legacy.error) throw new Error(`the Proof attempts for client ${clientId} could not be read — ${legacy.error.message}`)
      leadRows = (legacy.data ?? []) as unknown as ProofLeadRow[]
    } else {
      throw new Error(`the Proof attempts for client ${clientId} could not be read — ${withKind.error.message}`)
    }
  }

  /** A set of rows is identified by WHAT PRODUCED IT, never by its number alone. */
  type Origin = { pass: number; kind: ProofBatchKind }
  const keyOf = (o: Origin) => `${o.kind}:${o.pass}`
  const originOf = new Map<string, Origin>()
  for (const r of leadRows) {
    if (r.proof_pass == null) continue
    const kind: ProofBatchKind = r.proof_batch_kind === 'calibrated_restart' ? 'calibrated_restart' : 'automatic'
    originOf.set(r.id, { pass: Number(r.proof_pass), kind })
  }
  if (originOf.size === 0) return []

  const { data: fbRows, error: fbErr } = await db.from('lead_feedback')
    .select('lead_id, action, reason_code, free_text').eq('client_id', clientId)
  if (fbErr) throw new Error(`the Proof feedback for client ${clientId} could not be read — ${fbErr.message}`)

  const bySet = new Map<string, AttemptSummary>()
  const ensure = (o: Origin): AttemptSummary => {
    let a = bySet.get(keyOf(o))
    if (!a) { a = { pass: o.pass, kind: o.kind, surfaced: 0, looksRight: 0, notAFit: 0, reasons: {}, notes: [] }; bySet.set(keyOf(o), a) }
    return a
  }
  for (const o of originOf.values()) ensure(o).surfaced++

  for (const f of (fbRows ?? []) as { lead_id: string; action: string | null; reason_code: unknown; free_text: unknown }[]) {
    const o = originOf.get(f.lead_id)
    if (o == null) continue             // feedback on a non-Proof lead is not this summary's business
    const a = ensure(o)
    if (f.action === 'approve') { a.looksRight++; continue }
    a.notAFit++
    const code: ProofReasonCode = isReason(f.reason_code) ? f.reason_code : 'other'
    a.reasons[code] = (a.reasons[code] ?? 0) + 1
    const note = typeof f.free_text === 'string' ? f.free_text.trim() : ''
    if (note) a.notes.push(note)
  }

  // ⚠️ AUTOMATIC ATTEMPTS FIRST, THE RESTART LAST — chronological, and it is what the
  // operator and the client both read as the history. The restart shares pass 2's number and
  // must never sort into the middle of the automatic attempts.
  const rank = (a: AttemptSummary) => (a.kind === 'calibrated_restart' ? 100 : 0) + a.pass
  return [...bySet.values()].sort((x, y) => rank(x) - rank(y))
}

export type CloseOutcome =
  | { closed: true; trigger: EscalationTrigger }
  | { closed: false; reason: 'not_yet' | 'already' | 'migration_required' | 'unreadable'; detail?: string }

/**
 * 🛑 CLOSE THE AUTOMATIC LOOP — ONCE, AND ONLY WHEN THE RULE SAYS SO.
 *
 * ⚠️ THE WRITE IS CONDITIONAL, so two signals arriving together cannot both escalate. The
 * `.is('proof_review_requested_at', null)` guard is the lock: the second one matches no row
 * and reports `already`, rather than overwriting the first trigger and re-asking a client for
 * a phone number they have already given.
 *
 * ⚠️ IT NEVER SOURCES, NEVER CLAIMS A PASS, NEVER SENDS. Closing a loop is a refusal.
 */
export async function closeCalibrationLoop(
  clientId: string, signal: ClientSignal, icpId?: string | null,
): Promise<CloseOutcome> {
  let record: CalibrationRecord
  try {
    record = await readCalibration(clientId)
  } catch (err) {
    return { closed: false, reason: 'unreadable', detail: err instanceof Error ? err.message : String(err) }
  }

  const verdict = calibrationVerdict(record, signal)
  if (!verdict.close) return { closed: false, reason: record.escalated ? 'already' : 'not_yet' }

  const nowIso = new Date().toISOString()
  const { data, error } = await db.from('clients')
    .update({
      proof_review_requested_at: nowIso,
      proof_escalation_trigger: verdict.trigger,
      ...(icpId ? { proof_review_icp_id: icpId } : {}),
    })
    .eq('id', clientId)
    // The lock: one escalation per open cycle.
    .or('proof_review_requested_at.is.null,proof_review_resolved_at.not.is.null')
    .is('proof_review_requested_at', null)
    .select('id')

  if (error) {
    // 🛑 FAIL CLOSED AND SAY WHICH MIGRATION. Without `proof_escalation_trigger` the write
    // fails, and a client whose loop we decided to close but could not record would keep
    // every spend door open — the exact exposure C07 exists to remove.
    const missing = /column .* does not exist|could not find the '.*' column|42703|PGRST204/i
      .test(`${error.code ?? ''} ${error.message ?? ''}`)
    return {
      closed: false,
      reason: missing ? 'migration_required' : 'unreadable',
      detail: missing
        ? `The Proof calibration hand-off could not be recorded because \`clients.proof_escalation_trigger\` does not exist yet. Run the ${CALIBRATION_MIGRATION} migration (Vida → Command Centre → System → migrations). No further automatic Proof pass will be attempted in the meantime.`
        : `The Proof calibration hand-off could not be recorded (${error.message}). Nothing was sourced.`,
    }
  }
  if ((data ?? []).length === 0) return { closed: false, reason: 'already' }
  return { closed: true, trigger: verdict.trigger }
}

/** Record that the client confirmed (or supplied) the number to reach them on. */
export async function confirmCalibrationPhone(
  clientId: string, phone: string | null,
): Promise<{ ok: true; phone: string } | { ok: false; detail: string }> {
  const trimmed = (phone ?? '').trim()
  // ⚠️ DELIBERATELY PERMISSIVE, AND NOT EMPTY. This is a number a person will dial, not a
  // field to validate into submission — international shapes, extensions and spaces are all
  // legitimate. What must never be stored is nothing at all dressed as a confirmation.
  if (trimmed.length < 6) {
    return { ok: false, detail: 'That does not look like a number we could reach you on — could you check it?' }
  }
  const { error } = await db.from('clients')
    .update({ phone: trimmed, proof_phone_confirmed_at: new Date().toISOString() })
    .eq('id', clientId)
  if (error) return { ok: false, detail: `The number could not be saved (${error.message}).` }
  return { ok: true, phone: trimmed }
}

/**
 * 🛑 THE CLIENT SAID THE EXAMPLES ARE RIGHT — PROOF IS FINISHED (A, 10 Sep).
 *
 * ── WHAT THIS REPLACES ────────────────────────────────────────────────────────────────
 *
 * Nothing. The accept control was `onAccept={() => { void loadCalibration() }}` — a GET. No
 * column, stage or alert anywhere recorded that a client had accepted their set, so the
 * happy path ended in silence and only resumed if an operator noticed by other means.
 *
 * ⚠️ IT SOURCES NOTHING, CLAIMS NO PASS AND SPENDS NOTHING. One conditional UPDATE. There is
 * no provider call, no `try_claim_proof_pass`, no run — accepting is the client saying "stop
 * looking", and a completion that searched again would be the opposite of what they said.
 *
 * ⚠️ IDEMPOTENT, AND THE FIRST ACCEPTANCE IS THE ONE RECORDED. `.is('proof_completed_at',
 * null)` means a second press writes nothing and still answers success, so a double tap or a
 * retried request cannot move the timestamp.
 *
 * ⚠️ REFUSED WHILE AN ESCALATION IS OPEN. A client whose loop was handed to a person has been
 * told "I've paused finding people until we've spoken"; letting the same screen close Proof
 * would step over the human who is about to call them.
 */
export async function completeProof(clientId: string): Promise<
  | { ok: true; completedAt: string; alreadyComplete: boolean }
  | { ok: false; reason: 'escalated' | 'unreadable' | 'migration_required'; detail: string }
> {
  const r = await readCalibration(clientId).catch((e: unknown) => e as Error)
  if (r instanceof Error) {
    return { ok: false, reason: 'unreadable', detail: `Your Proof state could not be read (${r.message}), so nothing was recorded.` }
  }
  if (r.completedAt) return { ok: true, completedAt: r.completedAt, alreadyComplete: true }
  if (r.escalated) {
    return {
      ok: false, reason: 'escalated',
      detail: 'A member of the team is already picking this up with you, so Proof is not closed from here.',
    }
  }

  const at = new Date().toISOString()
  const { data, error } = await db.from('clients')
    .update({ proof_completed_at: at })
    .eq('id', clientId).is('proof_completed_at', null)
    .select('proof_completed_at')
  if (error) {
    // ⚠️ THE MISSING COLUMN IS NAMED, not reported as a generic failure. Before
    // `20260910_proof_completion` runs, this write is the only thing in the Proof path that
    // needs it, and an operator reading the log should be told which migration is outstanding.
    const migration = /proof_completed_at/.test(error.message)
    return {
      ok: false,
      reason: migration ? 'migration_required' : 'unreadable',
      detail: migration
        ? `Proof completion could not be recorded because migration ${PROOF_COMPLETION_MIGRATION} has not been run. Nothing was changed.`
        : `Proof completion could not be recorded (${error.message}). Nothing was changed.`,
    }
  }
  // Zero rows means a concurrent press won the compare-and-set. That is success, and the
  // stamp on the row is theirs.
  if (!data || data.length === 0) {
    const again = await readCalibration(clientId).catch(() => null)
    return { ok: true, completedAt: again?.completedAt ?? at, alreadyComplete: true }
  }
  return { ok: true, completedAt: at, alreadyComplete: false }
}

/** Named so a refusal can point at the outstanding migration rather than a generic error. */
export const PROOF_COMPLETION_MIGRATION = '20260910_proof_completion'

/**
 * 🛑 MAY AN OPERATOR GRANT THE ONE CALIBRATED RESTART?
 *
 * Three conditions, and each is the founder's:
 *   ① the calibration was RESOLVED (`proof_review_resolved_at` set)
 *   ② a resolution NOTE exists — a restart pressed on an unexamined client spends a pass on
 *     the same targeting that already failed twice
 *   ③ the resolution is NEWER than the last restart — so one resolution buys exactly ONE
 *     pass, and pressing again does nothing until somebody looks again
 *
 * ⚠️ IT DOES NOT RESET THE TWO AUTOMATIC ATTEMPTS. `proof_passes_done` is untouched and
 * `try_claim_proof_pass` still refuses a third automatic claim forever. This is a separate
 * door, not a wider one.
 */
export function mayRestartCalibrated(r: CalibrationRecord): { allowed: boolean; why?: string } {
  // ── ⚑ 11 Sep — TWO CONDITIONS THE FOUNDER NAMED THAT WERE NOT ASKED ────────────────
  //
  // 🛑 ① BOTH AUTOMATIC ATTEMPTS MUST ALREADY BE SPENT. The restart exists because the two
  // automatic attempts failed and a person had to step in. Granting one to a client who has
  // an automatic attempt still in hand does not help them — it spends a human's afternoon on
  // a client the ordinary loop had not finished with, and it makes the restart the easy path.
  if (r.passesDone < 2) {
    return { allowed: false, why: `This client has used ${r.passesDone} of their two automatic attempts. The calibrated restart is for a client both attempts have already failed.` }
  }
  // 🛑 ② THE CLIENT MUST ACTUALLY HAVE ESCALATED. A resolution recorded against somebody who
  // never said "Still not right" is a resolution of nothing, and it would mint a paid set for
  // a client who never asked for one.
  if (!r.escalatedAt) {
    return { allowed: false, why: 'This client never escalated, so there is nothing to resolve and nothing to restart.' }
  }
  if (!r.resolvedAt) {
    return { allowed: false, why: 'This calibration has not been resolved yet. Contact the client, correct the targeting and record what you agreed first.' }
  }
  if (!(r.operatorNote ?? '').trim()) {
    return { allowed: false, why: 'There is no resolution note. A restart without one would spend a pass on the targeting that already failed twice.' }
  }
  // ── 🛑 ⛓️ 12 Sep (R119) — ONE GRANT, PER CLIENT, FOR EVER ──────────────────────────
  //
  // ⛓️ THE STRUCK TEST: ~~`if (r.restartAt && r.restartAt >= r.resolvedAt)`~~ — refuse only
  // while the grant is NEWER than the resolution. That is a per-resolution allowance: a
  // re-opened review plus a second resolution moved `resolvedAt` past the grant and the
  // clause stopped refusing, so grant #2 was permitted. R119: "A SECOND CALIBRATED RESTART
  // IS REFUSED, whatever happens later."
  //
  // ⚠️ THE EXISTENCE OF A GRANT IS NOW THE WHOLE TEST — no timestamp comparison, so nothing
  // that happens later can make it pass. A client whose one restart was BURNED by
  // infrastructure does not need a second grant: the original grant is still on the row and
  // the durable claim ledger reissues the authority against it.
  if (r.restartAt) {
    return { allowed: false, why: 'This client has already had their one calibrated restart. There is no second restart — the ladder is two automatic attempts and one human-authorised set.' }
  }
  // A consumption with no grant is impossible under current code. If the data ever says
  // otherwise, refuse: an unexplained consumption is not a reason to hand out a new grant.
  if (r.restartUsedAt) {
    return { allowed: false, why: 'This client\'s record shows a calibrated restart was already consumed. Nothing further is granted from here.' }
  }
  return { allowed: true }
}

/**
 * 🛑 SPEND THE ONE GRANTED RESTART — the claim `try_claim_proof_pass` cannot make (C39).
 *
 * ── WHAT WAS BROKEN, AND IT WAS LIVE ──────────────────────────────────────────────────
 *
 * `POST /operator/proof-review/:id/restart` recorded a grant and told the operator "the
 * ordinary Proof path becomes available once more for exactly one pass". It was not:
 * `spendDoors` answered `proof_passes_done < 2` — false at 2, for ever — and the claim RPC
 * refuses at 2, for ever. So the operator pressed a real button, an audit row was written,
 * and the client could not get a set. A button with no authority behind it.
 *
 * ⚠️ IT DOES NOT TOUCH `proof_passes_done`, AND IT IS NOT THE RPC. The two automatic attempts
 * stay spent; `try_claim_proof_pass` is unchanged and still refuses a third AUTOMATIC claim
 * for ever. This is the separate, human-authorised door — narrow, audited, and self-closing.
 *
 * ⚠️ THE COMPARE-AND-SET IS THE WHOLE IDEMPOTENCY. Two tabs, a double click and a retry after
 * an ambiguous response all land here; the conditional UPDATE means exactly one matches a row
 * and the rest are told the restart is already spent. The database is the authority, never
 * the screen.
 *
 * ⚠️ AND IT FAILS CLOSED (C43). An unreadable calibration state answers `unreadable` and
 * grants nothing — a read that failed must never be read as "no restriction".
 */
export type RestartClaim =
  | { ok: true; usedAt: string }
  | { ok: false; reason: 'not_available' | 'already_used' | 'unreadable' | 'provenance_unavailable'; detail: string }

/**
 * 🛑 CAN A CALIBRATED RESTART'S PROVENANCE ACTUALLY BE WRITTEN DOWN? (Day-2 safety patch.)
 *
 * ── THE PARTIAL-DEPLOYMENT SEQUENCE THIS EXISTS TO MAKE IMPOSSIBLE ───────────────────
 *
 * A calibrated restart needs BOTH migrations: `20260911_proof_restart_and_refinement` for the
 * one-use authority, and `20260911_lead_proof_batch_kind` for the provenance its rows carry.
 * They are separate entries in the runner and an operator applies pending migrations as one
 * action — but nothing GUARANTEES both land, and the deploy that carries the code can reach
 * production before either does. So this order was reachable:
 *
 *     the authority columns exist  →  the restart is claimed and CONSUMED
 *     →  `leads.proof_batch_kind` is missing  →  the batch cannot record what produced it
 *     →  the client's one restart is spent on rows that read as an automatic attempt,
 *        or on an insert that fails outright, and the restart cannot be given back.
 *
 * ⚠️ A ONE-USE AUTHORITY MUST NOT BE SPENT ON A WRITE THAT CANNOT COMPLETE. Documented
 * migration ordering is a note to a human; this is the check. The founder's rule for this
 * shape is the same one C43 answers: an unknown or unavailable capability means DO NOT SPEND.
 *
 * ⚠️ IT IS A READ, AND IT COSTS NOTHING. One bounded select against the column itself —
 * `limit(0)` returns no rows at all, so it cannot depend on a client having any leads, and an
 * empty table answers "available" rather than "unknown".
 *
 * ⚠️ AND IT FAILS CLOSED ON ANY DOUBT. A missing column, a permission refusal or a throw all
 * answer `false`: we could not prove the provenance can be persisted, so the restart stays
 * unused and the operator sees a configuration error they can act on.
 */
export async function proofProvenanceAvailable(): Promise<boolean> {
  try {
    const { error } = await db.from('leads').select('proof_batch_kind').limit(0)
    return !error
  } catch { return false }
}

/**
 * ═══════════════════════════════════════════════════════════════════════════════════════
 * 🛑 ⛓️ 12 Sep — SUPERSEDED. ROLLBACK COMPATIBILITY ONLY. DO NOT CALL THIS.
 *
 * The one calibrated restart is claimed by the DURABLE AUTHORITY LEDGER now —
 * `claim_proof_authority` in `20260912_proof_pass_claims`, reached through
 * `lib/proof-claim.ts`. This function writes `clients.proof_calibrated_restart_used_at`
 * DIRECTLY, and as of that migration that column is a COMPATIBILITY MIRROR of the ledger
 * rather than the authority. Calling this would set the mirror without a claim row, which
 * makes the two disagree — and the disagreeing one is the one the operator reads.
 *
 * ⚠️ IT SURVIVES ONLY BECAUSE NOTHING LIVE REACHES IT. The founder's condition, verbatim:
 * "Old RPC/function may remain for rollback compatibility only if ZERO live caller can
 * reach it." `proof-authority-bypass.test.ts` asserts exactly that, and it is what stops a
 * future edit from quietly making this reachable again.
 *
 * ⚠️ AND IT IS NOT DELETED, DELIBERATELY. `try_claim_proof_pass` is likewise left in place
 * unchanged, so a rollback of this build degrades to the previous behaviour rather than to
 * no behaviour at all.
 * ═══════════════════════════════════════════════════════════════════════════════════════
 */
export async function claimCalibratedRestart(clientId: string): Promise<RestartClaim> {
  let r: CalibrationRecord
  try {
    r = await readCalibration(clientId)
  } catch (err) {
    return {
      ok: false, reason: 'unreadable',
      detail: `Your Proof state could not be read (${err instanceof Error ? err.message : String(err)}), so nothing was started and nothing was spent.`,
    }
  }

  const { calibratedRestart } = await import('./proof-calibration')
  const stand = calibratedRestart(r)
  if (stand === 'none') {
    return { ok: false, reason: 'not_available', detail: 'No calibrated restart has been granted for this client.' }
  }
  if (stand === 'used') {
    return { ok: false, reason: 'already_used', detail: 'The calibrated restart has already been used.' }
  }

  // ── 🛑 DAY-2 SAFETY PATCH — PROVE THE PROVENANCE CAN BE WRITTEN BEFORE SPENDING THE ONE
  //     THING THAT CANNOT BE GIVEN BACK ───────────────────────────────────────────────────
  //
  // ⚠️ THIS CHECK SITS ABOVE THE COMPARE-AND-SET, AND THAT POSITION IS THE WHOLE PATCH. Below
  // it the restart is consumed; a batch that then cannot record `proof_batch_kind` would leave
  // the client's one human-authorised set spent on rows indistinguishable from an automatic
  // attempt — or on an insert that fails — with no way to return it.
  //
  // ⚠️ IT REFUSES RETRYABLY AND SPENDS NOTHING. No claim, no sourcing, no provider call. The
  // moment the outstanding migration is applied the same press succeeds.
  if (!(await proofProvenanceAvailable())) {
    return {
      ok: false, reason: 'provenance_unavailable',
      detail: `The calibrated restart cannot be started until migration ${PROVENANCE_MIGRATION} has been run — without it this set could not be told apart from an automatic attempt. Nothing was started, nothing was spent, and the restart is still available.`,
    }
  }

  const at = new Date().toISOString()
  const { data, error } = await db.from('clients')
    .update({ proof_calibrated_restart_used_at: at })
    .eq('id', clientId)
    // The lock: only while the grant we judged is still the newest, and still unspent.
    .not('proof_calibrated_restart_at', 'is', null)
    .or(`proof_calibrated_restart_used_at.is.null,proof_calibrated_restart_used_at.lt.${r.restartAt}`)
    .select('id')
  if (error) {
    const missing = /proof_calibrated_restart_used_at/.test(error.message)
    return {
      ok: false, reason: 'unreadable',
      detail: missing
        ? `The calibrated restart could not be claimed because migration ${RESTART_MIGRATION} has not been run. Nothing was started and nothing was spent.`
        : `The calibrated restart could not be claimed (${error.message}). Nothing was started and nothing was spent.`,
    }
  }
  // Zero rows means a concurrent claim won. That is not an error, and it is not a second set.
  if ((data ?? []).length === 0) {
    return { ok: false, reason: 'already_used', detail: 'The calibrated restart has already been used.' }
  }
  return { ok: true, usedAt: at }
}

/** Named so a refusal can point at the outstanding migration rather than a generic error. */
export const RESTART_MIGRATION = '20260911_proof_restart_and_refinement'

/**
 * The OTHER half a calibrated restart needs. A restart is not safe to consume without it — see
 * `proofProvenanceAvailable` for the partial-deployment sequence that makes them a pair.
 */
export const PROVENANCE_MIGRATION = '20260911_lead_proof_batch_kind'
