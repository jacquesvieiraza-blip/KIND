import { db } from '@kind/db'
import { autoEnrollLead } from './figsy'
import { waterfallEnrich } from './enrichment'
import { normalizeRevealEmail, revealCharged } from './billing-rules'
import { isDemoClient } from './demo'

// #487 — APPROVE-GATED REVEAL: the $4 trigger.
// This is the ONE place both charges fire, and only on an explicit approval (client 👍
// in Milla, or operator approve-on-behalf in Vida). It reuses the EXISTING money rails
// verbatim — the same RPCs, in the same order, as the live POST /leads/:id/reveal route
// (try_charge_reveal_credit → waterfall → record_reveal_or_refund for #424 charge-once)
// and autoEnrollLead for the $3 work charge. It does NOT refactor the live reveal route
// (zero regression risk on the current portal) — it mirrors its money sequence.
//
// Dormant-safe: autoEnrollLead is called with { force: true } so the $3 charge + enrol
// happen on approval even while AUTO_OUTREACH_ENABLED is off, but the send still defers
// (sendSequenceEmail's own kill-switch). Nothing leaves until the switch is on.
//
// Idempotent: a second approve of the same lead re-charges nothing — the $1 is guarded
// by record_reveal_or_refund (once-per-email-ever) + the revealed_at claim, and the $3
// by autoEnrollLead's per-(campaign,lead) enrolment guard.

export type ApproveOutcome =
  | { status: 'approved'; revealed: true; email: string; workCharged: boolean; workReason?: string }
  | { status: 'no_email'; revealed: false }        // dead email — $1 auto-refunded, nothing charged
  | { status: 'already_in_crm'; revealed: false }  // client owns it — no charge
  | { status: 'insufficient_reveal_credits'; revealed: false }
  | { status: 'not_found'; revealed: false }

// Faithful re-use of the reveal money sequence (mirrors leads.ts POST /:id/reveal).
async function revealForApprove(clientId: string, leadId: string): Promise<ApproveOutcome & { leadRow?: Record<string, unknown> }> {
  const now = new Date().toISOString()

  // 1. Atomic claim — only the first reveal of this lead wins.
  const { data: claimedRows, error: claimErr } = await db.from('leads')
    .update({ revealed_at: now })
    .eq('id', leadId).eq('client_id', clientId).is('revealed_at', null)
    .select('*')
  if (claimErr) throw claimErr
  const claim = (claimedRows ?? [])[0] as Record<string, any> | undefined

  // Lost the claim → already revealed (or not ours). Idempotent: treat as approved if it
  // has an email (already-owned), else fetch to decide.
  if (!claim) {
    const { data: existing } = await db.from('leads')
      .select('email, phone, revealed_at, crm_existing').eq('id', leadId).eq('client_id', clientId).maybeSingle()
    if (!existing) return { status: 'not_found', revealed: false }
    if (existing.email) return { status: 'approved', revealed: true, email: existing.email as string, workCharged: false, leadRow: existing }
    return { status: 'no_email', revealed: false }
  }

  const unclaim = () => db.from('leads').update({ revealed_at: null }).eq('id', claim.id).then(() => {}, () => {})

  // Demo mode: free, off-ledger reveal (identical to the live route's demo branch).
  if (await isDemoClient(clientId)) {
    const demoEmail = (claim.email as string | null) ?? null
    if (!demoEmail) { await unclaim(); return { status: 'no_email', revealed: false } }
    return { status: 'approved', revealed: true, email: demoEmail, workCharged: false, leadRow: claim }
  }

  // 2. Already in the client's own CRM → they own it → no charge.
  if (claim.crm_existing) { await unclaim(); return { status: 'already_in_crm', revealed: false } }

  // 2b. #424 charge-once — email already known + already paid-for by this client → free.
  const knownEmail = normalizeRevealEmail(claim.email)
  if (knownEmail) {
    const { data: owned } = await db.rpc('reveal_is_owned', { p_client_id: clientId, p_email_norm: knownEmail })
    if (owned === true) return { status: 'approved', revealed: true, email: claim.email as string, workCharged: false, leadRow: claim }
  }

  // 3. Charge $1 (atomic decrement IS the gate).
  const { data: charged, error: chargeErr } = await db.rpc('try_charge_reveal_credit', { p_client_id: clientId })
  if (chargeErr) { await unclaim(); throw chargeErr }
  if (charged !== true) { await unclaim(); return { status: 'insufficient_reveal_credits', revealed: false } }

  // 4. Reveal the email (Hunter waterfall only when we don't already have one).
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

  // 5. No email → REFUND the $1 (fail-closed) + un-claim. Never charged for a dud.
  if (!email) {
    const { error: refundErr } = await db.rpc('increment_client_credits', { p_client_id: clientId, p_amount: 1 })
    if (refundErr) console.error('[approve] REFUND FAILED for client', clientId, 'lead', claim.id, refundErr)
    await unclaim()
    return { status: 'no_email', revealed: false }
  }

  // 6. Persist + #424 charge-once reconcile.
  await db.from('leads').update({ email, apollo_consented: true }).eq('id', claim.id).then(() => {}, () => {})
  const emailNorm = normalizeRevealEmail(email)
  let chargedNet = true
  if (emailNorm) {
    const { data: revealOutcome } = await db.rpc('record_reveal_or_refund', {
      p_client_id: clientId, p_email_norm: emailNorm, p_lead_id: claim.id,
    })
    chargedNet = revealCharged(revealOutcome)
  }
  if (chargedNet) {
    await db.from('credit_transactions').insert({
      client_id: clientId, amount: -1, type: 'usage', plan: 'lead_gen',
      reference: `reveal:${claim.id}`, note: 'Lead revealed on approve ($1)', created_at: now,
    }).then(() => {}, () => {})
  }

  return { status: 'approved', revealed: true, email, workCharged: false, leadRow: { ...claim, email } }
}

// The full approve = reveal ($1) THEN work ($3, via autoEnrollLead force). Partial-failure
// behaviour (documented): if the reveal succeeds but the $3 work can't run (no work credit,
// no active campaign, dedup skip), the client KEEPS the revealed contact (real value, owned
// forever per #424) and is NOT charged $3 — workCharged:false + a reason. They can add work
// credits / an active campaign and the same approval completes the work later.
export async function approveLead(leadId: string, clientId: string): Promise<ApproveOutcome> {
  const reveal = await revealForApprove(clientId, leadId)
  if (reveal.status !== 'approved') {
    const { leadRow, ...outcome } = reveal as ApproveOutcome & { leadRow?: unknown }
    return outcome
  }

  // Snapshot enrolment BEFORE the work charge so we can tell if it actually happened
  // (autoEnrollLead is void; an enrolment row appearing ⟺ the $3 charged, since the charge
  // is fail-closed before the insert and refunded on any post-charge failure).
  const { count: before } = await db.from('figsy_enrollments')
    .select('id', { count: 'exact', head: true }).eq('client_id', clientId).eq('lead_id', leadId)

  await autoEnrollLead(leadId, clientId, { force: true })

  const { count: after } = await db.from('figsy_enrollments')
    .select('id', { count: 'exact', head: true }).eq('client_id', clientId).eq('lead_id', leadId)

  const workCharged = (after ?? 0) > (before ?? 0)
  return {
    status: 'approved', revealed: true, email: reveal.email, workCharged,
    ...(workCharged ? {} : { workReason: 'no_work_credit_or_active_campaign' }),
  }
}

// Pass = client says "not a fit". No charge, no reveal; mark the lead so it leaves the queue.
export async function passLead(leadId: string, clientId: string): Promise<{ status: 'passed' | 'not_found' }> {
  const { data } = await db.from('leads')
    .update({ status: 'passed', passed_at: new Date().toISOString() })
    .eq('id', leadId).eq('client_id', clientId).is('revealed_at', null)
    .select('id').maybeSingle()
  return { status: data ? 'passed' : 'not_found' }
}
