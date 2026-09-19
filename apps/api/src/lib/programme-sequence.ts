// ═══════════════════════════════════════════════════════════════════════════════════════
// A PROGRAMME'S CANONICAL SEQUENCE AND SCHEDULE — for EVERY programme, not just House.
//
// ── WHAT WAS BROKEN, AND IT WOULD HAVE STOPPED THE FIRST PAYING CLIENT DEAD ─────────────
//
// `resolveProgrammeChain` walks programme → ICP → campaign → `figsy_sequences.campaign_id`,
// and a NULL `campaign_id` correctly means *this sequence is not this programme's work*. That
// rule is right and is not touched here.
//
// The defect is that **nothing generic ever wrote that link.** Exactly one writer existed —
// `applyHouseProgrammeSequence` — and it is bound to one configured programme id. Every other
// route that puts words on a campaign writes `figsy_campaigns.settings.sequence` and
// `settings.applied_sequence_id`, and leaves the canonical row's `campaign_id` NULL. So:
//
//   • the client's own sequence library is a set of TEMPLATES (`campaign_id` NULL) — correct;
//   • applying one to a campaign updated the SENDING store and not the CANONICAL store;
//   • `resolveProgrammeChain` therefore found no sequence for any non-House programme;
//   • preparation refused, readiness refused, and `READY_FOR_APPROVAL` was unreachable.
//
// House worked only because House-specific code did the linking. That is the definition of a
// path that has never been walked by a customer.
//
// ── THE FIX: ONE GENERIC WRITER, THE SAME ONE HOUSE NOW USES ────────────────────────────
//
// `applyProgrammeSequence` is the only place a programme's canonical sequence is written. It
// resolves the programme's own campaign, and upserts EXACTLY ONE `figsy_sequences` row bound
// to it. `applyHouseProgrammeSequence` delegates to it, so there is no second implementation
// to drift — House keeps only its own five approved messages and its own schedule constant.
//
// ⚠️ THE TEMPLATE IS COPIED, NEVER MOVED. A client's library sequence may be applied to more
// than one campaign, and `campaign_id` can only name one. Re-pointing the library row would
// silently steal the words from whatever campaign held it before. The canonical row is a
// per-campaign COPY; the library row stays a template with `campaign_id` NULL.
//
// ⚠️ EXACTLY ONE, AND THAT IS ENFORCED RATHER THAN HOPED FOR. `resolveProgrammeChain` refuses
// a campaign carrying two sequences — "which words the customer would approve is ambiguous" —
// so a second canonical row is not a duplicate, it is a broken programme. This updates the row
// that exists instead of adding a rival, and refuses outright if it ever finds two.
//
// ── AND THE SCHEDULE, WHICH HAD THE SAME SHAPE OF HOLE ──────────────────────────────────
//
// `programmes.send_schedule` had exactly one writer too, and it was House's. NULL correctly
// means REFUSE — that safety rule is preserved exactly. What changes is that a schedule now
// EXISTS to be refused or honoured: every programme is created with the canonical default
// below, and an operator can change it before P1. Nothing is defaulted at send time, where a
// guess would decide when a real stranger's morning is interrupted.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { db } from '@kind/db'
import { isSendSchedule, type SendSchedule } from './send-schedule'

/**
 * The schedule every programme is created with.
 *
 * 🛑 THIS IS A CREATION-TIME DEFAULT, NOT A SEND-TIME ONE, and the difference is the whole
 * safety argument. At creation it is a visible, editable, operator-owned setting that exists
 * long before anything can send. At send time it would be a guess standing in for a decision
 * nobody made — which is what `isSendSchedule`'s NULL refusal exists to prevent, and that
 * refusal is untouched.
 *
 * ⚠️ IT IS DELIBERATELY THE MOST CONSERVATIVE THING THAT CAN SEND AT ALL: weekdays only, inside
 * ordinary business hours. Widening it is an operator decision per programme, never a default.
 */
export const DEFAULT_PROGRAMME_SEND_SCHEDULE: SendSchedule = {
  days: [1, 2, 3, 4, 5],
  start: '08:30',
  end: '17:00',
  default_tz: 'Europe/London',
}

/**
 * One message step, as `figsy_sequences.steps` stores it.
 *
 * ⚠️ `step` IS OPTIONAL ON THE WAY IN AND ALWAYS WRITTEN ON THE WAY OUT — it is the position,
 * so it is derived from the order rather than trusted from the caller. Any other field a caller
 * carries (House's `channel`, for one) is preserved untouched: this function decides ordering,
 * not what a message is made of.
 */
export interface ProgrammeSequenceStep {
  step?: number
  subject: string
  body: string
  wait_days: number
  [k: string]: unknown
}

export type ApplySequenceResult =
  | { ok: true; sequenceId: string; campaignId: string; created: boolean; steps: number }
  | { ok: false; reason: string }

/**
 * Write a programme's canonical sequence — the one the customer reviews, approves and receives.
 *
 * ⚠️ IT REFUSES RATHER THAN CREATING A CAMPAIGN. Campaigns are created by preparation, under
 * the programme's own authority and as a DRAFT. A second door to that object would undo the
 * positive-linkage argument the whole chain rests on.
 *
 * ⚠️ IDEMPOTENT. Called twice with the same steps it updates the same row twice and changes
 * nothing else.
 */
export async function applyProgrammeSequence(
  programmeId: string,
  steps: ProgrammeSequenceStep[],
  name = 'Programme sequence',
): Promise<ApplySequenceResult> {
  if (!Array.isArray(steps) || steps.length === 0) {
    return { ok: false, reason: 'A sequence needs at least one message step. Nothing was changed.' }
  }

  const { resolveProgrammeChain } = await import('./programme-chain')
  const chainRes = await resolveProgrammeChain(programmeId)
  if (!chainRes.ok) return { ok: false, reason: chainRes.degraded }
  const { clientId, campaignId } = chainRes.chain

  if (!campaignId) {
    return {
      ok: false,
      reason: 'This programme has no campaign yet (programme → ICP → campaign), so there is nothing to attach the sequence to. Prepare the programme first — preparation creates the campaign as a draft under the programme\'s own authority.',
    }
  }

  // 🛑 EXACTLY ONE CANONICAL ROW PER CAMPAIGN. Two is not a duplicate, it is a programme
  // `resolveProgrammeChain` will refuse to resolve — so finding two is reported, never
  // silently resolved by picking one.
  const { data: existingRows, error: readErr } = await db.from('figsy_sequences')
    .select('id').eq('campaign_id', campaignId)
  if (readErr) {
    return { ok: false, reason: `This programme's canonical sequence could not be read (${readErr.message}). Nothing was changed.` }
  }
  const rows = (existingRows ?? []) as { id: string }[]
  if (rows.length > 1) {
    return {
      ok: false,
      reason: `This programme's campaign already carries ${rows.length} canonical sequences, so which words the customer would approve is ambiguous. Nothing was changed — remove the duplicates first.`,
    }
  }

  const now = new Date().toISOString()
  const ordered = steps.map((s, i) => ({
    ...s,
    step: i + 1,
    subject: String(s.subject ?? ''),
    body: String(s.body ?? ''),
    wait_days: Number.isFinite(s.wait_days) ? Number(s.wait_days) : 0,
  }))

  if (rows[0]) {
    const { error } = await db.from('figsy_sequences')
      .update({ name, steps: ordered, campaign_id: campaignId, updated_at: now })
      .eq('id', rows[0].id)
    if (error) return { ok: false, reason: `The canonical sequence could not be updated (${error.message}). Nothing was changed.` }
    return { ok: true, sequenceId: rows[0].id, campaignId, created: false, steps: ordered.length }
  }

  const { data, error } = await db.from('figsy_sequences')
    .insert({ client_id: clientId, campaign_id: campaignId, name, steps: ordered })
    .select('id').single()
  if (error || !data) {
    // ── 🛑 ⚑ 19 Sep (J13) — THE LOSER OF A RACE COMPLETES AGAINST THE WINNER ──────────
    //
    // 🛑 WHAT THIS REPLACED, AND IT WAS MEASURED, NOT IMAGINED. The read fifteen lines above
    // and this insert are a check-then-insert with nothing behind them. A sourcing run that
    // settles calls `advanceAfterSettlement`, which prepares in the background; an operator
    // pressing `prepare-for-review` in the same moment calls the same code. Both read zero
    // rows. Both inserted. The campaign then carried TWO canonical sequences and
    // `resolveProgrammeChain` refused it for ever — *"the words the customer would approve
    // are ambiguous"* — closing preparation, freeze, approval, Make Live and Run behind it,
    // on a programme the client had paid for.
    //
    // `figsy_sequences_one_per_campaign` (20260919) is now what refuses the second row, and a
    // collision is not a failure: it is the winner telling us the work is already done.
    //
    // ⚠️ IT RE-READS RATHER THAN TRUSTING THE ERROR CODE, for the same reason the onboard race
    // does: `23505` is the expected signal, but the only thing that settles the question is
    // whether exactly one row is there now. An insert that failed for any other reason, and
    // left nothing behind, must still be reported — which is what the refusal below does.
    //
    // ⚠️ AND IT TAKES THE WINNER'S ROW AS IT STANDS. Re-applying these steps over it would be
    // this call overruling one that has already completed, with the same words either way.
    const { data: winners, error: winnerErr } = await db.from('figsy_sequences')
      .select('id').eq('campaign_id', campaignId)
    const won = ((winners ?? []) as { id: string }[])
    if (!winnerErr && won.length === 1) {
      return { ok: true, sequenceId: String(won[0].id), campaignId, created: false, steps: ordered.length }
    }
    return {
      ok: false,
      reason: `The canonical sequence could not be created (${error?.message ?? 'no row returned'})`
        + (winnerErr ? ` — and the winning-row check also failed (${winnerErr.message})` : '')
        + (won.length > 1 ? ` — and the campaign now carries ${won.length} sequences, which must be resolved in Vida` : '')
        + '. Nothing was changed.',
    }
  }
  return { ok: true, sequenceId: String(data.id), campaignId, created: true, steps: ordered.length }
}

export type ScheduleResult = { ok: true; schedule: SendSchedule } | { ok: false; reason: string }

/**
 * Set a programme's send schedule.
 *
 * ⚠️ VALIDATED BY THE SAME PREDICATE THE GATE USES. `isSendSchedule` is what readiness and the
 * send path consult; validating with anything else here would let a shape through that the
 * gate then refuses, and the operator would have configured something that cannot work.
 */
export async function setProgrammeSendSchedule(
  programmeId: string, schedule: unknown,
): Promise<ScheduleResult> {
  if (!isSendSchedule(schedule)) {
    return {
      ok: false,
      reason: 'That is not a usable sending schedule. It needs at least one weekday (1–7), a start and end time as HH:MM, and a timezone. Nothing was changed.',
    }
  }
  const { error } = await db.from('programmes')
    .update({ send_schedule: schedule, updated_at: new Date().toISOString() })
    .eq('id', programmeId)
  if (error) return { ok: false, reason: `The send schedule could not be saved (${error.message}). Nothing was changed.` }
  return { ok: true, schedule }
}

/**
 * Give a programme the canonical default schedule if it has none.
 *
 * ⚠️ IT NEVER OVERWRITES ONE. An operator who narrowed a programme's window must not have it
 * widened again by a later call — this fills an absence, it is not a reset.
 */
export async function ensureProgrammeSendSchedule(programmeId: string): Promise<ScheduleResult> {
  const { data, error } = await db.from('programmes')
    .select('send_schedule').eq('id', programmeId).maybeSingle()
  if (error) return { ok: false, reason: `This programme's send schedule could not be read (${error.message}).` }
  const current = (data as { send_schedule?: unknown } | null)?.send_schedule
  if (isSendSchedule(current)) return { ok: true, schedule: current }
  return await setProgrammeSendSchedule(programmeId, DEFAULT_PROGRAMME_SEND_SCHEDULE)
}
