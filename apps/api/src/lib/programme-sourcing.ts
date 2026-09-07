// ═══════════════════════════════════════════════════════════════════════════════════════
// PROGRAMME-NATIVE SOURCING — start from the PROGRAMME, and let it name its own targeting.
//
// ── THE BLOCKER THIS EXISTS TO CLOSE (founder-locked 7 Sep) ──────────────────────────────
// Two sourcing doors existed, and neither could safely start the House programme:
//
//   ① `POST /operator/source` picks ICPs with `.eq('is_active', true)`. House's v4
//      "Founder-Led B2B Agencies UK/US" is ATTACHED to the programme but deliberately NOT
//      client-facing active, while the old African Retail-Tech audience still is. So that
//      door cannot reach v4 — and reaches for the wrong audience instead.
//
//      🛑 THE CATEGORY ERROR, NAMED. `is_active` answers *"what does the client see on their
//      screen?"*. It was being used to answer *"what work is this programme authorised to
//      do?"* — a different question, whose real answer has lived in `icps.programme_id`
//      since 29 Aug. Two questions, one column, and the column belonged to the other one.
//
//   ② `POST /icps/:id/run` CAN address an ICP by id, but it is the CLIENT WALLET path: on a
//      first run with an empty balance it grants 20 credits and writes a `trial_bonus` ledger
//      row. Minting credit on the House account to make a run start is manufactured money,
//      which the founder's House lock forbids outright. Its volume also comes from the reveal
//      wallet rather than from programme authority — the wrong bound as well as the wrong gate.
//
// ── WHY THIS FILE IS SO SHORT, AND MUST STAY SO ─────────────────────────────────────────
// It is a DOOR, not an architecture. `runIcpJob` already:
//   · resolves the programme from `icp.programme_id` and fails closed on a broken link
//   · applies `authorityFor(…, 'NEXT_BATCH')` — status, P1, review hold, remaining ceiling
//   · spends atomically through `try_spend_sourcing`, opens the batch, settles it after
//   · resolves the audience with `audienceForClientStrict` and enforces the AR5 boundary:
//     House → Apollo, verified-only, never PDL, never Hunter
//
// None of that is re-implemented here, and none of it may be. What was missing was a way in
// that starts from the programme and finds its ICP. That is the whole change.
//
// ⚠️ IT WRITES NOTHING. Every statement below is a read or a delegation. No ledger row, no
// wallet, no payment, no status transition, no P2, no Go-Live, no send. If this file ever
// needs to write something, that is a sign the change belongs somewhere else.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { db } from '@kind/db'
import { getProgramme, nextBatchSize, type ProgrammeRow } from './programme'
import { authorityFor, type AuthorityRefusal } from './programme-authority'

export type ProgrammeSourcingRefusal =
  | AuthorityRefusal
  | 'programme_not_found'
  | 'targeting_unreadable'
  | 'no_attached_icp'
  | 'ambiguous_attached_icp'
  | 'icp_belongs_to_another_client'
  | 'run_failed'

export type ProgrammeSourcingResult =
  | {
      ok: true
      programmeId: string
      clientId: string
      icpId: string
      icpName: string | null
      requested: number
      inserted: number
      skipped: number
      relaxed: string | null
    }
  | { ok: false; reason: ProgrammeSourcingRefusal; message: string }

const refuse = (reason: ProgrammeSourcingRefusal, message: string): ProgrammeSourcingResult =>
  ({ ok: false, reason, message })

interface AttachedIcp {
  id: string
  name: string | null
  client_id: string
  programme_id: string | null
}

/**
 * Source one batch for ONE named programme, through its own attached targeting.
 *
 * Returns a refusal rather than throwing, because every caller here is an operator watching a
 * button: a reason they can read beats a stack trace. The one thing it never does is answer
 * "0 leads" for a refusal — a refused run and an empty audience are different facts, and
 * conflating them is the failure this repo has already fixed twice.
 */
export async function sourceProgramme(programmeId: string): Promise<ProgrammeSourcingResult> {
  // ① THE PROGRAMME. Named explicitly by the caller — never inferred from a client, because
  // "the client's open programme" is a second lookup that can disagree with the first.
  let programme: ProgrammeRow | null
  try {
    programme = await getProgramme(programmeId)
  } catch (err) {
    return refuse('programme_unresolvable',
      `Programme ${programmeId} could not be read (${err instanceof Error ? err.message : String(err)}). Nothing was sourced.`)
  }
  if (!programme) return refuse('programme_not_found', `There is no programme ${programmeId}. Nothing was sourced.`)

  // ② AUTHORITY, BEFORE TARGETING. NEXT_BATCH is the right question: a run IS the opening of a
  // new batch, so status, the P1 floor, the review hold and the remaining ceiling all apply.
  // Payment 2 deliberately does not — P1 authorises sourcing and preparation, and demanding P2
  // here would make it impossible to build the thing the client is being asked to approve.
  const verdict = authorityFor(programme, 'NEXT_BATCH')
  if (!verdict.allowed) return refuse(verdict.reason, verdict.message)

  // ③ THE TARGETING — BY ATTACHMENT, NEVER BY `is_active`. This is the fix.
  const { data: icpRows, error: icpErr } = await db
    .from('icps')
    .select('id, name, client_id, programme_id')
    .eq('programme_id', programmeId)

  if (icpErr) {
    return refuse('targeting_unreadable',
      `The targeting attached to programme ${programmeId.slice(0, 8)} could not be read (${icpErr.message}). ` +
      'Nothing was sourced — an unreadable attachment must never fall back to whichever ICP happens to be active.')
  }

  const attached = ((icpRows ?? []) as AttachedIcp[]).filter(r => r?.id)

  if (attached.length === 0) {
    return refuse('no_attached_icp',
      `No ICP is attached to programme ${programmeId.slice(0, 8)}, so there is nothing it is authorised to source. ` +
      'Attach the targeting to the programme first. (An ICP being "active" for the client is a different fact and ' +
      'is deliberately not used here.) Nothing was sourced.')
  }

  // ⚠️ AMBIGUITY IS NOT A CHOICE TO MAKE ON THE FOUNDER'S BEHALF. Picking "the newest" would be
  // a decision about which audience a programme is for, invented in a query's ORDER BY.
  if (attached.length > 1) {
    return refuse('ambiguous_attached_icp',
      `Programme ${programmeId.slice(0, 8)} has ${attached.length} attached ICPs ` +
      `(${attached.map(i => i.name ?? i.id).join(', ')}). Which audience this batch is for is a human decision, ` +
      'so nothing was sourced.')
  }

  const icp = attached[0]
  if (icp.client_id !== programme.client_id) {
    return refuse('icp_belongs_to_another_client',
      `ICP ${icp.id} is attached to this programme but belongs to a different client. Nothing was sourced.`)
  }

  // ④ THE SIZE — THE PROGRAMME'S OWN MECHANISM, NOT A NUMBER CHOSEN HERE. `nextBatchSize` is
  // ~250 (founder lock 4) shrunk to whatever authority remains, so a batch can never be the
  // thing that overruns a ceiling. No new quantity is introduced by this file.
  const requested = nextBatchSize(programme)
  if (requested <= 0) {
    return refuse('sourcing_ceiling_reached',
      'This programme has no authorised sourcing volume remaining. Unused value never expires; opening more is a human decision.')
  }

  // ⑤ ATTRIBUTION. `runIcpJob` wants a userId for the run's provenance; the programme's own
  // client owns it. `'operator'` only where a seat row genuinely has no auth user.
  const { data: owner } = await db.from('clients').select('user_id').eq('id', programme.client_id).maybeSingle()
  const userId = ((owner?.user_id as string | null) || 'operator')

  // ⑥ THE CANONICAL JOB. Imported lazily so this module stays cheap to load and testable
  // without pulling the whole route tree — the same pattern `operator.ts` already uses.
  //
  // ⚠️ NO `opts`. Passing a proof pass here would spend one of a prospect's two free passes on
  // programme delivery; a programme run is never a proof run.
  const { runIcpJob } = await import('../routes/icps')
  try {
    const r = await runIcpJob(icp.id, programme.client_id, userId, requested)
    return {
      ok: true,
      programmeId,
      clientId: programme.client_id,
      icpId: icp.id,
      icpName: icp.name ?? null,
      requested,
      inserted: r.inserted,
      skipped: r.skipped,
      relaxed: r.relaxed,
    }
  } catch (err) {
    // The job throws its refusals (ProgrammeAuthorityError, provider guards, the strict
    // audience resolver) precisely so they reach a human instead of reading as "0 leads".
    // Carrying the message through keeps that true one layer up.
    return refuse('run_failed', err instanceof Error ? err.message : String(err))
  }
}
