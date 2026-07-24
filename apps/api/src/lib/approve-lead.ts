import { db } from '@kind/db'
import { autoEnrollLead } from './figsy'
import { waterfallEnrich } from './enrichment'
import { normalizeRevealEmail } from './billing-rules'
import { isDemoClient } from './demo'
import { sendFounderAlert } from './alerts'

// ONE WALLET — the work model (founder-locked 24 Jul, supersedes #492).
// APPROVE is the ONLY money event: the client's 👍 (in Milla) or an operator
// approve-on-behalf (in Vida) charges a flat $4 from the single wallet, ONCE per
// lead, and that charge is FINAL — no $1/$3 split, no hold, no capture-on-booking,
// no release, no hand-backs. Booking a meeting is a REPORTED outcome, never money.
//
// The atomic `revealed_at` claim is the once-per-lead gate: only the first approve
// of a lead wins the claim and charges the $4; a re-approve is a no-op. If the reveal
// returns no usable email we REVERSE the $4 in the same flow — a dead email is never
// billed. Enrolment then starts the outreach on the already-paid lead (charges nothing).

export const PRICE_PER_LEAD_USD = 4

export type ApproveOutcome =
  | { status: 'approved'; revealed: true; email: string; charged: boolean }
  | { status: 'no_email'; revealed: false }        // dead email — $4 not charged / reversed
  | { status: 'already_in_crm'; revealed: false }  // client owns it — no charge
  | { status: 'insufficient_funds'; revealed: false } // wallet < $4 — nothing moved (402)
  | { status: 'no_campaign'; revealed: false }     // no active campaign → can't work it → NOT charged
  | { status: 'not_found'; revealed: false }

export async function approveLead(leadId: string, clientId: string): Promise<ApproveOutcome> {
  const now = new Date().toISOString()

  // 1. Atomic claim — only the FIRST approve of this lead wins. This is the
  //    once-per-lead gate for the $4 charge.
  const { data: claimedRows, error: claimErr } = await db.from('leads')
    .update({ revealed_at: now })
    .eq('id', leadId).eq('client_id', clientId).is('revealed_at', null)
    .select('*')
  if (claimErr) throw claimErr
  const claim = (claimedRows ?? [])[0] as Record<string, any> | undefined

  // Lost the claim → already approved (idempotent). Return the existing state; never
  // a second charge.
  if (!claim) {
    const { data: existing } = await db.from('leads')
      .select('email, revealed_at, crm_existing').eq('id', leadId).eq('client_id', clientId).maybeSingle()
    if (!existing) return { status: 'not_found', revealed: false }
    if (existing.email) return { status: 'approved', revealed: true, email: existing.email as string, charged: true }
    return { status: 'no_email', revealed: false }
  }

  const unclaim = () => db.from('leads').update({ revealed_at: null }).eq('id', claim.id).then(() => {}, () => {})

  // 2. Demo mode: free, off-ledger.
  if (await isDemoClient(clientId)) {
    const demoEmail = (claim.email as string | null) ?? null
    if (!demoEmail) { await unclaim(); return { status: 'no_email', revealed: false } }
    await autoEnrollLead(leadId, clientId, { force: true, prepaid: true }).catch(() => {})
    return { status: 'approved', revealed: true, email: demoEmail, charged: false }
  }

  // 3. Already in the client's own CRM → they own it → no charge.
  if (claim.crm_existing) { await unclaim(); return { status: 'already_in_crm', revealed: false } }

  // 3b. #424 charge-once — this client already paid for this contact → free re-approve.
  const knownEmail = normalizeRevealEmail(claim.email)
  if (knownEmail) {
    const { data: owned } = await db.rpc('reveal_is_owned', { p_client_id: clientId, p_email_norm: knownEmail })
    if (owned === true) {
      await autoEnrollLead(leadId, clientId, { force: true, prepaid: true }).catch(() => {})
      return { status: 'approved', revealed: true, email: claim.email as string, charged: false }
    }
  }

  // 3c. NO ACTIVE CAMPAIGN → we cannot do the work, so we must not take the money.
  //     The $4 buys WORK (we enrol the lead and run the outreach). autoEnrollLead below
  //     bails silently when the client has no ACTIVE campaign — so without this guard the
  //     wallet is debited, no enrolment row is ever written, and nothing is ever sent:
  //     the client pays $4 for nothing, with no error and no refund. Fail closed instead,
  //     exactly like the insufficient-funds gate, and alert us so an operator starts the
  //     campaign in Vida. (Deliberately placed AFTER the free paths — demo / already-in-CRM
  //     / already-owned never charge, so they are unaffected.)
  const { data: activeCampaign } = await db.from('figsy_campaigns')
    .select('id').eq('client_id', clientId).eq('status', 'active').limit(1).maybeSingle()
  if (!activeCampaign) {
    await unclaim()
    void sendFounderAlert('sends_stalled', 'Approve blocked — no active campaign', [
      `A client tried to approve a lead but has NO active campaign, so no outreach could run.`,
      `Client: ${clientId} · Lead: ${leadId}`,
      `They were NOT charged. Start their campaign in Vida (client → Start campaign) to unblock.`,
    ]).catch(() => {})
    return { status: 'no_campaign', revealed: false }
  }

  // 4. Charge the flat $4 (the atomic decrement IS the gate).
  const { data: charged, error: chargeErr } = await db.rpc('try_charge_wallet', { p_client_id: clientId, p_amount: PRICE_PER_LEAD_USD })
  if (chargeErr) { await unclaim(); throw chargeErr }
  if (charged !== true) { await unclaim(); return { status: 'insufficient_funds', revealed: false } }

  // 5. Reveal the email (Hunter waterfall only when we don't already have one).
  let email: string | null = claim.email ?? null
  if (!email) {
    try {
      const enriched = await waterfallEnrich({
        first_name: claim.first_name, last_name: claim.last_name,
        company: claim.company, linkedin_url: claim.linkedin_url,
      })
      email = enriched.email ?? null
    } catch { email = null }
  }

  // 6. No usable email → REVERSE the $4 (never bill a dud) + un-claim.
  if (!email) {
    const { error: revErr } = await db.rpc('increment_wallet', { p_client_id: clientId, p_amount: PRICE_PER_LEAD_USD })
    if (revErr) console.error('[approve] $4 REVERSAL FAILED for client', clientId, 'lead', claim.id, revErr)
    await unclaim()
    return { status: 'no_email', revealed: false }
  }

  // 7. Persist the email + write the single $4 ledger row (once per lead).
  await db.from('leads').update({ email, apollo_consented: true }).eq('id', claim.id).then(() => {}, () => {})
  const emailNorm = normalizeRevealEmail(email)
  if (emailNorm) {
    // Keep the #424 once-per-email reveal record for cross-client dedup bookkeeping.
    await db.rpc('record_reveal_or_refund', { p_client_id: clientId, p_email_norm: emailNorm, p_lead_id: claim.id }).then(() => {}, () => {})
  }
  await db.from('credit_transactions').insert({
    client_id: clientId, amount: -PRICE_PER_LEAD_USD, type: 'wallet_charge', plan: 'work_model',
    reference: `lead:${claim.id}`, note: 'Approved lead worked ($4)', created_at: now,
  }).then(() => {}, () => {})

  // W5 — TRIAL sourcing drip: a real reveal unlocks +2 more sourced records (our PDL
  // budget), so a trial client learns the loop by playing it. The RPC caps lifetime
  // trial grants at 20 records, so this is self-limiting and a no-op once out of trial.
  void db.rpc('add_sourcing_allowance', { p_client_id: clientId, p_records: 2, p_trial: true })
    .then(() => {}, (e: unknown) => console.error('[approve] trial sourcing drip failed (non-fatal):', e))

  // 8. Start the outreach on the already-paid lead — charges nothing (prepaid).
  await autoEnrollLead(leadId, clientId, { force: true, prepaid: true }).catch(() => {})

  return { status: 'approved', revealed: true, email, charged: true }
}

// Pass = client says "not a fit". No charge, no reveal; mark the lead so it leaves the queue.
export async function passLead(leadId: string, clientId: string): Promise<{ status: 'passed' | 'not_found' }> {
  const { data } = await db.from('leads')
    .update({ status: 'passed', passed_at: new Date().toISOString() })
    .eq('id', leadId).eq('client_id', clientId).is('revealed_at', null)
    .select('id').maybeSingle()
  return { status: data ? 'passed' : 'not_found' }
}
