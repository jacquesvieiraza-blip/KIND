import { db } from '@kind/db'

// ⛓️ 24 Sep (R145 #47 · R137) — MOVED HERE, UNCHANGED, from `approve-lead.ts`. That file held
// the retired $4-per-approved-lead charge and is deleted; "Not a fit" is live (Milla's Proof
// desk and Vida's operator pass), so the one function both still call keeps its own home.

/**
 * Pass = client says "not a fit". No charge, no reveal; mark the lead so it leaves the queue.
 *
 * ── 🛑 10 Sep (A) — THE WRITE ERROR IS NO LONGER SWALLOWED ──────────────────────────────
 *
 * ⛓️ WHAT THIS FIXES. The old body destructured `{ data }` only and returned
 * `data ? 'passed' : 'not_found'`. So a REFUSED write — a constraint violation, a dropped
 * connection, a permission error — was indistinguishable from "that lead does not exist",
 * and the route answered **404 "Lead not found or already actioned"** to a client looking
 * straight at the card. They would see a confusing message on a row that stayed on screen,
 * the reason chip would never appear (it renders only after a successful pass), no
 * `lead_feedback` row would be written, and the two-attempt rule and Vida's evidence would
 * then see zero rejections.
 *
 * ⚠️ AND THERE IS A LIVE REASON TO EXPECT REFUSALS HERE. `leads.status` has three
 * inconsistent records in this repo: `schema.sql` allows pending · scored · consent_sent ·
 * consent_given · exported · rejected · opted_out; `20260525_fix_leads_status_and_figsy_memory`
 * re-adds the CHECK with `contacted` and still no `passed`; and
 * `20260723_operator_audit_log` states "PROD REALITY: leads.status is an ENUM (lead_status) …
 * that CHECK migration evidently never applied to prod" and adds `passed` to the enum by hand.
 * `'passed'` is therefore a value the SCHEMA OF RECORD does not permit, applied to production
 * by a migration outside the runner. Which one production actually carries cannot be read
 * from this repo — so this function reports the failure instead of hiding it, and the caller
 * keeps the client's feedback whatever the column decides.
 *
 * ⚠️ THE CONSTRAINT IS NOT WIDENED. Founder-locked: `20260910_lead_set_aside_reason` says
 * "do not widen that CHECK", and nothing here does. This is honesty about the write, not a
 * change to what the write is.
 */
export async function passLead(
  leadId: string, clientId: string,
): Promise<{ status: 'passed' | 'not_found' | 'failed'; detail?: string }> {
  const { data, error } = await db.from('leads')
    .update({ status: 'passed', passed_at: new Date().toISOString() })
    .eq('id', leadId).eq('client_id', clientId).is('revealed_at', null)
    .select('id').maybeSingle()
  // 🛑 A REFUSED WRITE IS NOT A MISSING LEAD. Reported as its own outcome so the route can
  // say something true rather than "already actioned".
  if (error) {
    console.error(`[pass] leads.status write REFUSED for lead ${leadId} (client ${clientId}) — ${error.message}`)
    return { status: 'failed', detail: error.message }
  }
  return { status: data ? 'passed' : 'not_found' }
}
