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
