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
  | 'reveal_lead'           // stand-alone reveal
  | 'enroll_lead'           // stand-alone enroll into a campaign
  | 'send_now'              // forced a due send
  | 'pause_campaign'        // paused/resumed a campaign
  | 'suppression_change'    // added/removed a suppression/opt-out

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
