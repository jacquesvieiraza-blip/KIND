import { db } from '@kind/db'

// #486 — the one place an operator action gets written to operator_audit_log.
// Best-effort by design: an audit-write failure must NEVER block or reverse the
// underlying money/state action (which has already succeeded or failed on its own
// merits) — but it IS logged loudly so a persistent audit outage is visible.
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
  | 'enrol_skips'           // #620 — an enrol run REFUSED somebody. Written only when the run
                            // skipped at least one lead, and it carries the named reasons. The
                            // response already returned them and no screen rendered them, so a
                            // systematic refusal (every draft rejected, every UK lead a sole
                            // trader) read on the board as "nothing happening" — the one
                            // reading that sends somebody hunting a bug in the wrong place.
  | 'send_now'              // forced a due send
  | 'pause_campaign'        // paused a campaign
  | 'resume_campaign'       // #564 — pressed RUN on an existing campaign. It used to record
                            // `pause_campaign`, so the log said the opposite of what happened.
  | 'edit_campaign'         // #564 — changed a name/cap/window WITHOUT starting or stopping
                            // anything. Every such save also recorded `pause_campaign`.
  | 'start_campaign'        // created + activated a client's campaign (managed model, no spend)
  | 'send_reply'            // answered a prospect on the client's behalf from Vida's Inbox
  | 'assign_inbox'          // V9 #270/#271 — pooled/branded sending inbox lifecycle
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
  | 'nexus_autotune_toggle' // #511g3 — enabled/disabled a client's Nexus auto-tune kill-switch
  | 'demo_reset'            // MBF — rebuilt the demo account to its fixed state (invented data, no money, no sends)
  | 'house_client_setup'    // #549/#593 — opened (or adopted) Client Zero, the house account.
                            // Its own action rather than a generic edit, because "who turned
                            // our own outreach account on, and when" is a question the audit
                            // log should answer without reading a detail blob.
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
    if (error) console.error('[operator-audit] insert failed:', error.message, e.action, e.subjectId)
  } catch (err) {
    console.error('[operator-audit] insert threw:', err instanceof Error ? err.message : err)
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
