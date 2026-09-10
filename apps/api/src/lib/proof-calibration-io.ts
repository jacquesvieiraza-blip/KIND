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
  type AttemptSummary, type CalibrationState, type ClientSignal,
  type EscalationTrigger, type ProofReasonCode, type SpendDoors,
} from './proof-calibration'

export const CALIBRATION_MIGRATION = '20260910_proof_calibration_handoff'

/** The client columns this hand-off reads. */
const CLIENT_COLUMNS =
  'id, phone, proof_passes_done, proof_review_requested_at, proof_review_resolved_at, ' +
  'proof_escalation_trigger, proof_phone_confirmed_at, proof_calibration_note, proof_calibrated_restart_at'

export interface CalibrationRecord extends CalibrationState {
  clientId: string
  phone: string | null
  phoneConfirmedAt: string | null
  escalatedAt: string | null
  resolvedAt: string | null
  trigger: EscalationTrigger | null
  operatorNote: string | null
  restartAt: string | null
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
    attempts,
  }
  return {
    ...state,
    clientId,
    phone: (c.phone as string | null) ?? null,
    phoneConfirmedAt: (c.proof_phone_confirmed_at as string | null) ?? null,
    escalatedAt: (c.proof_review_requested_at as string | null) ?? null,
    resolvedAt: (c.proof_review_resolved_at as string | null) ?? null,
    trigger: (c.proof_escalation_trigger as EscalationTrigger | null) ?? null,
    operatorNote: (c.proof_calibration_note as string | null) ?? null,
    restartAt: (c.proof_calibrated_restart_at as string | null) ?? null,
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
  const { data: leadRows, error: leadErr } = await db.from('leads')
    .select('id, proof_pass').eq('client_id', clientId).not('proof_pass', 'is', null)
  if (leadErr) throw new Error(`the Proof attempts for client ${clientId} could not be read — ${leadErr.message}`)

  const passOf = new Map<string, number>()
  for (const r of (leadRows ?? []) as { id: string; proof_pass: number | null }[]) {
    if (r.proof_pass != null) passOf.set(r.id, Number(r.proof_pass))
  }
  if (passOf.size === 0) return []

  const { data: fbRows, error: fbErr } = await db.from('lead_feedback')
    .select('lead_id, action, reason_code, free_text').eq('client_id', clientId)
  if (fbErr) throw new Error(`the Proof feedback for client ${clientId} could not be read — ${fbErr.message}`)

  const byPass = new Map<number, AttemptSummary>()
  const ensure = (pass: number): AttemptSummary => {
    let a = byPass.get(pass)
    if (!a) { a = { pass, surfaced: 0, looksRight: 0, notAFit: 0, reasons: {}, notes: [] }; byPass.set(pass, a) }
    return a
  }
  for (const pass of passOf.values()) ensure(pass).surfaced++

  for (const f of (fbRows ?? []) as { lead_id: string; action: string | null; reason_code: unknown; free_text: unknown }[]) {
    const pass = passOf.get(f.lead_id)
    if (pass == null) continue          // feedback on a non-Proof lead is not this summary's business
    const a = ensure(pass)
    if (f.action === 'approve') { a.looksRight++; continue }
    a.notAFit++
    const code: ProofReasonCode = isReason(f.reason_code) ? f.reason_code : 'other'
    a.reasons[code] = (a.reasons[code] ?? 0) + 1
    const note = typeof f.free_text === 'string' ? f.free_text.trim() : ''
    if (note) a.notes.push(note)
  }

  return [...byPass.values()].sort((x, y) => x.pass - y.pass)
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
  if (!r.resolvedAt) {
    return { allowed: false, why: 'This calibration has not been resolved yet. Contact the client, correct the targeting and record what you agreed first.' }
  }
  if (!(r.operatorNote ?? '').trim()) {
    return { allowed: false, why: 'There is no resolution note. A restart without one would spend a pass on the targeting that already failed twice.' }
  }
  if (r.restartAt && r.restartAt >= r.resolvedAt) {
    return { allowed: false, why: 'The calibrated restart for this resolution has already been used. Resolve the calibration again before granting another pass.' }
  }
  return { allowed: true }
}
