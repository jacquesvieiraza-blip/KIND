import { db } from '@kind/db'
import { sendFounderAlert } from './alerts'

// #486 — the one place an operator action gets written to operator_audit_log.
// Best-effort by design: an audit-write failure must NEVER block or reverse the
// underlying money/state action (which has already succeeded or failed on its own
// merits) — founder-reaffirmed 20 Aug, and unchanged.
//
// ⛓️ CORRECTED 20 Aug. This line used to end: *"— but it IS logged loudly so a persistent audit
// outage is visible."* **It was not visible.** The only trace was a `console.error`, and nobody
// reads the logs; a persistent audit outage would have looked exactly like a working system.
// The comment described an intention as though it were a mechanism — the third such line found
// today (`pecr.ts`'s unknown_country count, and `startup-check.ts` claiming the deploy SHA was
// "used in health/diagnostics" when only the boot log touched it). It is true now: a dropped
// row raises a founder alert, throttled per action.
//
// operator_email is passed in by the caller, which reads it SERVER-SIDE from the
// admin Supabase session (see resolveOperatorEmail) — it is never taken from a
// request body or a client-supplied header we don't control.

export type OperatorAction =
  | 'approve_lead'          // approve-on-behalf: charged $1 reveal + $3 work
  | 'pass_lead'             // marked a lead not-a-fit (no charge)
  | 'approve_draft'         // released a FIGSY-written draft (real send) — no new charge
  | 'reject_draft'          // closed a FIGSY-written draft (no send)
  | 'surface_lead'          // #493 — sent a masked lead to the client for their 👍 (no spend)
  | 'reveal_lead'           // stand-alone reveal
  | 'enroll_lead'           // stand-alone enroll into a campaign
  | 'set_pdl_cap'            // #626 — the founder set the monthly sourcing ceiling from Vida
  | 'enrol_skips'           // #620 — an enrol run REFUSED somebody. Written only when the run
                            // skipped at least one lead, and it carries the named reasons. The
                            // response already returned them and no screen rendered them, so a
                            // systematic refusal (every draft rejected, every UK lead a sole
                            // trader) read on the board as "nothing happening" — the one
                            // reading that sends somebody hunting a bug in the wrong place.
  | 'client_partner_seat_created'  // R40 — a Client Partner seat was created from Vida.
  | 'client_partner_countersigned' // R42 — the founder counter-signed; THIS is what makes a seat live and its referral code resolve.
  | 'client_partner_archived'     // R42 — a seat was archived (never deleted: commission history has to survive).
  | 'client_partner_invite_resent' // 16 Aug — the invitation was re-sent (or re-linked) after an email that never arrived.
                            // Audited because it mints a login that can read commission
                            // money, and because the seat carries its own pay rate.
  | 'booking_link_issued'    // P47 follow-on — an operator minted a prospect booking link for a
                             // lead, to walk the real calendar flow. Audited because the token
                             // it hands out IS the authorization on a public page: anyone
                             // holding it can book into that client's calendar until it expires.
  | 'governed_document_created'      // R46 — a NEW governed document (version 1) was written.
  | 'governed_document_version_added' // R46 — a new VERSION was chained onto an existing one.
                            // Audited because this table is the sole source of truth for
                            // documents the business is governed by, and the only defence
                            // against a quiet rewrite is knowing who wrote what, when. There
                            // is deliberately no 'governed_document_deleted': nothing deletes.
  | 'send_now'              // forced a due send
  | 'pause_campaign'        // paused a campaign
  | 'resume_campaign'       // #564 — pressed RUN on an existing campaign. It used to record
                            // `pause_campaign`, so the log said the opposite of what happened.
  | 'edit_campaign'         // #564 — changed a name/cap/window WITHOUT starting or stopping
                            // anything. Every such save also recorded `pause_campaign`.
  | 'start_campaign'        // created + activated a client's campaign (managed model, no spend)
  | 'send_reply'            // answered a prospect on the client's behalf from Vida's Inbox
  | 'assign_inbox'          // V9 #270/#271 — pooled/branded sending inbox lifecycle
  | 'operator_send_run'     // ⚑ 2 Sep — the founder pressed Run-once: ONE client, an explicit
                            // max_sends ceiling, real campaign sends under the operator send
                            // authority while AUTO_OUTREACH_ENABLED stays off. Audited because
                            // it is the one way real prospect mail can leave with the global
                            // switch down, and the row records who, which client, the ceiling
                            // asked for and what actually went.
  | 'mailbox_test_send'     // #553 ladder — sent ONE diagnostic email through ONE named
                            // mailbox's own SMTP, to prove that mailbox delivers. Its own
                            // action rather than `assign_inbox` because a real message left
                            // the building: #564's lesson is that a log which reuses a
                            // neighbouring label ends up describing something that did not
                            // happen. No campaign, no enrolment, no lead, no spend.
  // ── PR A2 · the House / Client Zero programme lifecycle ────────────────────────────────
  //
  // ⚠️ THESE ARE MATERIAL AND THEY MOVE NO MONEY, which is exactly why they must be audited.
  // A payment leaves a Stripe object and a ledger row behind it; internal authority leaves
  // one timestamp. Without an audit row there would be no record of WHO authorised a
  // programme to source, or when, or why — and "the row says authorised" is not an answer to
  // either question.
  | 'programme_lifecycle'    // DRAFT → RECOMMENDED → AWAITING_FIRST_PAYMENT → READY_FOR_APPROVAL
  | 'programme_internal_authority'  // internal P1 / P2 — authority WITHOUT a payment
  // ⚑ 10 Sep (C07) — the ONE human-authorised extra Proof pass, after a failed calibration
  // was contacted and resolved. Audited because it is the only door that can put a prospect
  // back in front of a paid provider after both automatic attempts are gone, and "who
  // granted this, and on what note" has to be answerable without reading code.
  | 'proof_calibrated_restart_granted'
  // ⚑ 11 Sep — the two halves the restart grant sits between, so the audit trail can prove
  // the whole founder-locked sequence without inferring any of it from UI state:
  //   escalation happened → a human resolved it → the restart became available →
  //   the restart was CLAIMED → no second restart remains.
  // The grant alone could not answer "did a person actually speak to them" or "was the set
  // ever taken", and both are questions somebody will ask about a paid batch.
  | 'proof_calibration_resolved'
  | 'proof_calibrated_restart_claimed'
  // ⚑ 12 Sep — THE DURABLE AUTHORITY LEDGER'S HUMAN ACTS. The migration classifies nobody
  // and releases nothing on a timer, both deliberately, so every one of these is a person
  // recording a judgement about a client's Proof entitlement — which is exactly the class of
  // decision that must never be answerable only by reading code.
  //
  // ⚠️ NONE OF THEM GRANTS AUTHORITY. Classification records what ALREADY happened before the
  // ledger existed; reconciliation settles a claim whose run is over. The three unique
  // indexes remain the only thing that decides whether a pass can be claimed.
  | 'proof_legacy_passes_classified'      // how many automatic passes a pre-ledger client consumed (0/1/2)
  | 'proof_legacy_passes_reclassified'    // the same, DELIBERATELY overwritten — a separate decision, never a retry
  | 'proof_legacy_restart_classified'     // a pre-ledger calibrated restart: completed, or burned and returned
  | 'proof_claim_reconciled'              // an OPEN claim with no trustworthy terminal outcome, settled by a person
  | 'programme_go_live'      // the explicit, separate Go Live. Never a side effect of P2.
  // ⚑ 10 Sep (H) — RUN, and it is a DIFFERENT act from Go Live. Go Live arms and sends zero;
  // this is the grant that lets any send path consider the programme at all. Two acts, two
  // audit actions, so "who armed it" and "who started it" are separately answerable.
  | 'programme_run'
  | 'programme_icp_attached' // the ONLY writer of icps.programme_id — what future sourcing feeds
  | 'client_commercial_model_set'  // ⚑ 3 Sep (C2) — an operator DECLARED which commercial model
                            // governs a client: programme, legacy, or back to unclassified. Its
                            // own action because this single field decides whether the wallet
                            // gate, the per-lead approve/reveal routes and the low-credit emails
                            // apply to that account at all — it is the closest thing the product
                            // has to a switch between two ways of charging, and "who changed it,
                            // when, from what to what" must be answerable without reading code.
                            // The detail blob carries `from` and `to` for exactly that reason.
  | 'run_migration'         // ran the committed pending migrations from Vida (no SQL editor access)
  | 'backup_manifest'       // #298 — took a table/row-count snapshot. Recorded because the
                            // WHEN is half the value: a restore is compared against the last
                            // manifest, so knowing when one was last taken is the difference
                            // between a usable reference and a stale one.
  | 'edit_icp'              // V4d — operator authored/edited the client's ICP
  | 'edit_sequence'         // V4d — operator authored/edited the client's sequence
  | 'suppression_change'    // added/removed a suppression/opt-out
  | 'vida_command'          // #498 — issued a Vida command-bar instruction (no spend)
  | 'qualify_reply'         // #494 — operator marked a reply as a qualified conversation (no spend)
  | 'booking_no_show'       // #499 — operator marked a booking a no-show (state only; $3 stays kept)
  | 'booking_rebook'        // #499m — operator gave the client a goodwill rebook (no new charge; max 2)
  | 'source_run'            // #498b — operator kicked a pool-first sourcing run (spends OUR PDL budget, fenced)
  | 'programme_source_run'     // ⚑ 7 Sep — a PROGRAMME-NATIVE sourcing run: the operator named a
                               // programme, and the ICP came from `icps.programme_id` rather than
                               // from whichever ICP happened to be `is_active`. Recorded separately
                               // from `source_run` because the two answer different questions and a
                               // shared action would make "which door ran this?" unanswerable.
  | 'programme_source_refused' // …and the REFUSALS, which are the more interesting half. A run
                               // stopped by authority, an unattached ICP or an exhausted ceiling
                               // leaves no leads and no batch, so without this row it leaves no
                               // trace at all — and "nothing happened" is exactly what a silently
                               // refused run looks like on every board.
  | 'programme_sourcing_reconciled' // ⚑ 8 Sep (HOUSE-009) — the operator accounted for prospects
                               // a programme had ALREADY been delivered while the House path
                               // bypassed the accounting: one settled batch created, those leads
                               // stamped with it, the volume converted to `sourced_used`. It
                               // moves money-adjacent counters and (from SOURCING_AUTHORISED) the
                               // programme's status, so who ran it against which programme has to
                               // survive the session. It sources nothing and sends nothing.
  | 'programme_sourcing_reconcile_refused' // …and the refusals, for the same reason the sourcing
                               // pair above has one: the RPC RAISES rather than half-counting —
                               // a foreign-client lead, or orphans that would not fit under the
                               // ceiling — and a refusal that writes no row looks on every board
                               // exactly like a reconciliation nobody ever attempted.
  | 'programme_p1_auto_started'  // ⚑ 9 Sep — P1 authority was committed and the programme
                               // STARTED SOURCING BY ITSELF, with no operator press. An
                               // automatic action nobody pressed is exactly the kind that must
                               // leave a trail: "why did this client's programme start" has to
                               // be answerable without reading code. It spends provider money.
  | 'programme_p1_auto_refused' // …and the refusals, which matter as much: no targeting, an
                               // ambiguous ICP, a paused or disputed programme, nothing left to
                               // spend. A refusal that writes no row looks like a start nobody
                               // attempted.
  | 'programme_sequence_set'   // ⚑ 9 Sep — the operator wrote the programme's canonical words.
                               // The customer reviews and approves exactly these, so who set
                               // them and when has to survive the session. It sends nothing.
  | 'programme_send_schedule_set' // …and when those words may go out. Same reasoning.
  | 'programme_prepared_for_review' // ⚑ 9 Sep — a settled programme was carried through the
                               // pre-approval chain (campaign · sequence · schedule · cadence ·
                               // enrolments) and handed to the client to approve. It creates
                               // the work the customer's consent will be collected against, so
                               // who ran it and what it prepared has to survive the session.
                               // It sources nobody, spends nothing and sends nothing.
  | 'programme_prepare_for_review_refused' // …and its refusals, which are the half an operator
                               // acts on: a missing mailbox, an unqualified desk, preparation
                               // that did not finish. A refusal that writes no row looks
                               // exactly like an attempt nobody made.
  | 'programme_batch_qualified' // ⚑ 9 Sep (HOUSE-009) — M&V judged a programme's candidates
                               // against the customer's ICP and settled the attempt. It moves
                               // `sourced_used`, may spend Apollo reveal credits, and its
                               // verdicts are permanent, so who ran it against which programme
                               // has to survive the session. It sources nobody and sends
                               // nothing.
  | 'programme_batch_qualify_refused' // …and the refusals, which are the more interesting half:
                               // a provider failure, an unjudged remainder or a settle that the
                               // RPC would not accept all leave no batch and no counter change,
                               // so without a row they leave no trace at all.
  | 'nexus_autotune_toggle' // #511g3 — enabled/disabled a client's Nexus auto-tune kill-switch
  | 'demo_reset'            // MBF — rebuilt the demo account to its fixed state (invented data, no money, no sends)
  | 'house_client_setup'    // #549/#593 — opened (or adopted) Client Zero, the house account.
                            // Its own action rather than a generic edit, because "who turned
                            // our own outreach account on, and when" is a question the audit
                            // log should answer without reading a detail blob.
  | 'enrol_stranded'        // #631 — operator rescued a PAID lead that entered no sequence. NO
                            // money moves: the client already paid at approve, so this passes
                            // `prepaid` and charges nothing. It has its own action because
                            // "who repaired a charged-but-unworked lead, and when" is a money
                            // question the log must answer without reading a detail blob.
  | 'import_leads'          // #549 — operator loaded a CSV of prospects onto a client. NO money:
                            // imported leads land 'pending' exactly as sourced ones do, and the
                            // charge still happens only at approve.
  | 'house_wallet_zeroed'   // #611 — set the house wallet to 0 after the audit found $3,999,038
                            // of inherited test grants. NO ledger row is written: the balance is
                            // corrected, the history is not rewritten, and this log line is the
                            // only record that the correction happened.
  | 'house_wallet_granted'  // #611 — comped the house account its hunting budget via manual_grant.
                            // Separate from the zero because "we emptied it" and "we funded it"
                            // are different events, and a log that blurs them is the one that
                            // stops you looking (#564).
  | 'seed_client_wiped'     // #611/#329 — DELETED a test client and every row it owned. The first
                            // delete of a non-demo client row in the product. Its own action, and
                            // deliberately past tense: by the time this is written it is done.
  | 'import_leads_failed'   // the same action when the write stopped partway. Recorded as its OWN
                            // action rather than a flag on the success row, because "we imported"
                            // and "we imported 340 of 900 and stopped" are different events, and
                            // the log that blurs them is the one that stops you looking (#564).

export interface OperatorAuditEntry {
  operatorEmail: string
  clientId?:     string | null
  action:        OperatorAction
  subjectType?:  string | null   // e.g. 'lead' | 'campaign' | 'email'
  subjectId?:    string | null
  detail?:       Record<string, unknown>
}

// ── A DROPPED AUDIT ROW IS NEVER SILENT ────────────────────────────────────────────────────
//
// This function used to `console.error` a failed insert and return. The audit log is the only
// record of who did what to a client's account, so a failed insert meant an operator action
// happened and **nothing anywhere says it did** — and the only trace was a log line nobody
// reads. That is the same shape as #620 (a count nobody renders) and as the swallowed ledger
// insert in `approve-lead.ts`, which was a double-charge waiting to be triggered.
//
// ⚠️ DELIBERATELY NOT FAIL-CLOSED, founder-ruled 20 Aug: *"a human operator's action should not
// be blocked by a logging hiccup — that decision waits for Level-3."* So the action still
// proceeds. What changes is that the failure becomes LOUD instead of invisible.
//
// ⚠️ AND IT IS THROTTLED, which is the half that makes it usable. Without a throttle, a database
// outage turns every operator click into an email and a Slack message: working a queue of fifty
// leads would send fifty alerts at the exact moment things are broken, burying the signal the
// alert exists to raise. Same reasoning `cron-health.ts` records — *"a throttle that cannot be
// tested without a database is a throttle nobody proves until it floods the founder's inbox."*

const AUDIT_ALERT_THROTTLE_MS = 15 * 60 * 1000

/** Last time we alerted about a dropped row, per action. Module-level and in-memory on purpose. */
const lastAuditAlertAt = new Map<string, number>()

/**
 * May we alert about this action now? CLAIMS the slot when it says yes.
 *
 * ⚠️ IN-MEMORY IS THE HONEST CHOICE HERE, and the failure direction is why. A restart or a
 * second replica re-arms the throttle, so the worst case is **one more alert than strictly
 * needed** — never a suppressed one. A durable throttle would have to write to the same
 * database that is, in this exact scenario, the thing that is broken.
 *
 * Pure enough to test: pass an explicit clock and store, as `auditAlertDue('x', 0, new Map())`.
 */
export function auditAlertDue(
  action: string,
  now: number = Date.now(),
  store: Map<string, number> = lastAuditAlertAt,
): boolean {
  const previous = store.get(action)
  if (previous !== undefined && now - previous < AUDIT_ALERT_THROTTLE_MS) return false
  store.set(action, now)
  return true
}

/** The alert itself — fire-and-forget, so raising it can never block or fail the caller. */
function reportDroppedAudit(e: OperatorAuditEntry, reason: string): void {
  if (!auditAlertDue(e.action)) return
  void sendFounderAlert('audit_dropped', 'An operator action was NOT recorded', [
    `Action: ${e.action}`,
    `Operator: ${e.operatorEmail}`,
    `Subject: ${e.subjectType ?? 'n/a'} ${e.subjectId ?? ''}`.trim(),
    e.clientId ? `Client: ${e.clientId}` : '',
    `Why the row was not written: ${reason}`,
    '',
    'THE ACTION ITSELF WENT THROUGH — this is the audit row, not the work. The audit log is the',
    'only record of who did what to a client account, so this one is now missing from it.',
    `Further alerts for "${e.action}" are held for 15 minutes so an outage cannot flood this inbox.`,
  ]).catch(() => {})
}

export async function writeOperatorAudit(e: OperatorAuditEntry): Promise<void> {
  try {
    const { error } = await db.from('operator_audit_log').insert({
      operator_email: e.operatorEmail,
      client_id:      e.clientId ?? null,
      action:         e.action,
      subject_type:   e.subjectType ?? null,
      subject_id:     e.subjectId ?? null,
      detail:         e.detail ?? {},
    })
    if (error) {
      console.error('[operator-audit] insert failed:', error.message, e.action, e.subjectId)
      reportDroppedAudit(e, error.message)
    }
  } catch (err) {
    // ⚠️ BOTH PATHS ALERT. supabase-js RETURNS its errors, but a connection failure THROWS —
    // and a thrown insert drops the row just as completely as a returned one. Alerting on only
    // the returned case would leave the outage scenario, the one that matters most, silent.
    const message = err instanceof Error ? err.message : String(err)
    console.error('[operator-audit] insert threw:', message)
    reportDroppedAudit(e, message)
  }
}

/**
 * WHICH ACTION DID THE OPERATOR ACTUALLY TAKE? (#564)
 *
 * The audit log is the only record of who did what to a client's account. It was recording
 * **`pause_campaign` for everything** on the campaign routes — so pressing **Run it** wrote
 * *"paused the campaign"*, and renaming one wrote it too. The log did not merely lack detail;
 * on the most consequential action it said **the opposite of what happened**.
 *
 * That is worse than no log. An empty log makes you go and look; a confidently wrong one
 * makes you stop looking — the same failure shape as a check that passes without running
 * (#581) and a screen that greens what nobody probed (#576).
 *
 * Pure so the mapping is provable without a database, because this is judgement — exactly
 * the kind that was inlined in a route and therefore untestable.
 */
export function campaignAuditAction(a: {
  /** true when the row is being created, not updated. */
  isNew: boolean
  /** The status being written, if the caller is setting one. */
  nextStatus?: 'draft' | 'active' | 'paused' | null
}): OperatorAction {
  if (a.isNew) return 'start_campaign'
  if (a.nextStatus === 'active') return 'resume_campaign'
  if (a.nextStatus === 'paused') return 'pause_campaign'
  // No status in the patch — the operator changed a name, a cap or a window. Recording a
  // start or a stop here is what made the log untrustworthy.
  return 'edit_campaign'
}

import { enrolSkipSummary } from './enrol-skips'
export { enrolSkipSummary }

// ── #620 — A REFUSED LEAD MUST NEVER LOOK LIKE SILENCE ────────────────────────────────────
//
// The enrol paths NAME every refusal — `copy_rejected:…` (#612), `pecr_individual_risk:…`
// (#617) — and return them as `skip_reasons`. **No screen rendered them: zero hits across the
// portal and the admin console.** So on send-day "every draft was refused" and "nothing
// happened" are the same picture, and the operator goes hunting a bug in the wrong place.
//
// ⚠️ NO MIGRATION. The schema is frozen, so this reuses `operator_audit_log` — a table that
// already exists, already has a JSON `detail` column, and is already the place we record what
// an operator run did. A response-only surface would go blank on refresh and would never have
// existed at all for a cron-triggered enrol.
//
// WRITTEN ONLY WHEN SOMEBODY WAS SKIPPED. A line for a clean run would bury the one that
// matters — silence about nothing is correct.

/**
 * Record an enrol run that refused somebody.
 *
 * No-ops when nothing was skipped, so the trail stays readable. Never throws — `writeOperatorAudit`
 * already swallows its own failures, because losing an audit line must not fail an enrol.
 */
export async function recordEnrolSkips(a: {
  operatorEmail: string
  clientId: string | null
  campaignId: string | null
  enrolled: number
  skipped: number
  reasons: Record<string, number>
}): Promise<void> {
  if (a.skipped <= 0) return
  await writeOperatorAudit({
    operatorEmail: a.operatorEmail,
    clientId:      a.clientId,
    action:        'enrol_skips',
    subjectType:   'campaign',
    subjectId:     a.campaignId,
    detail: {
      enrolled: a.enrolled,
      skipped:  a.skipped,
      reasons:  a.reasons,
      summary:  enrolSkipSummary(a.reasons),
    },
  })
}
