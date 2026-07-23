import { db } from '@kind/db'
import { autoEnrollLead } from './figsy'
import { waterfallEnrich } from './enrichment'
import { normalizeRevealEmail, revealCharged } from './billing-rules'
import { isDemoClient } from './demo'
import { holdFigsyCredit, releaseFigsyHold } from './credit-holds'

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
  | { status: 'approved'; revealed: true; email: string; workHeld: boolean; workReason?: string }
  | { status: 'no_email'; revealed: false }        // dead email — $1 auto-refunded, nothing charged
  | { status: 'already_in_crm'; revealed: false }  // client owns it — no charge
  | { status: 'insufficient_reveal_credits'; revealed: false }
  | { status: 'insufficient_work_credits'; revealed: false } // #492 — no $3 to hold; nothing moved
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
    if (existing.email) return { status: 'approved', revealed: true, email: existing.email as string, workHeld: false, leadRow: existing }
    return { status: 'no_email', revealed: false }
  }

  const unclaim = () => db.from('leads').update({ revealed_at: null }).eq('id', claim.id).then(() => {}, () => {})

  // Demo mode: free, off-ledger reveal (identical to the live route's demo branch).
  if (await isDemoClient(clientId)) {
    const demoEmail = (claim.email as string | null) ?? null
    if (!demoEmail) { await unclaim(); return { status: 'no_email', revealed: false } }
    return { status: 'approved', revealed: true, email: demoEmail, workHeld: false, leadRow: claim }
  }

  // 2. Already in the client's own CRM → they own it → no charge.
  if (claim.crm_existing) { await unclaim(); return { status: 'already_in_crm', revealed: false } }

  // 2b. #424 charge-once — email already known + already paid-for by this client → free.
  const knownEmail = normalizeRevealEmail(claim.email)
  if (knownEmail) {
    const { data: owned } = await db.rpc('reveal_is_owned', { p_client_id: clientId, p_email_norm: knownEmail })
    if (owned === true) return { status: 'approved', revealed: true, email: claim.email as string, workHeld: false, leadRow: claim }
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

  return { status: 'approved', revealed: true, email, workHeld: false, leadRow: { ...claim, email } }
}

// #492 — MONEY RE-TIME. The full approve = reveal ($1, spent now) + WORK ($3, HELD now,
// captured only on a confirmed booking). All-or-nothing at the top: we HOLD the $3 FIRST,
// so a client with no work credit can't even reveal — nothing moves (insufficient_work_credits).
// Then reveal ($1); if the reveal can't complete (dead email, already owned, insufficient
// reveal credit) the held $3 is RELEASED so nothing is stranded. Enrolment then starts the
// work on the hold (charges nothing). If no work can start (no active campaign / dedup skip)
// the hold is RELEASED — we never hold money for work that isn't running; the client keeps the
// revealed contact (real value, #424) at workHeld:false. The held $3 is later CAPTURED at
// booking (calendar.performBooking) or RELEASED at a terminal non-booked state (figsy.ts).
export async function approveLead(leadId: string, clientId: string): Promise<ApproveOutcome> {
  const { data: pre } = await db.from('leads')
    .select('revealed_at, email, first_name, last_name, company').eq('id', leadId).eq('client_id', clientId).maybeSingle()
  if (!pre) return { status: 'not_found', revealed: false }

  // #492/F3 — IDEMPOTENT RE-APPROVE. A lead already revealed was already approved: the $3
  // was held then (still held, or captured at booking). Taking a SECOND hold here would
  // strand a credit with no future capture/release. So short-circuit — return the existing
  // state, never a fresh hold.
  if (pre.revealed_at && pre.email) {
    const { count: enrolled } = await db.from('figsy_enrollments')
      .select('id', { count: 'exact', head: true }).eq('client_id', clientId).eq('lead_id', leadId)
    return { status: 'approved', revealed: true, email: pre.email as string, workHeld: (enrolled ?? 0) > 0 }
  }

  // HOLD the $3 before anything spends — gates the whole approve on work-credit availability.
  const hold = await holdFigsyCredit(clientId, leadId, (pre as Record<string, string | null>) ?? undefined)
  if (!hold.ok) return { status: 'insufficient_work_credits', revealed: false }

  const reveal = await revealForApprove(clientId, leadId)
  if (reveal.status !== 'approved') {
    // Reveal didn't complete → return the held $3 so nothing is stranded.
    await releaseFigsyHold(clientId, leadId, `reveal_${reveal.status}`)
    const { leadRow, ...outcome } = reveal as ApproveOutcome & { leadRow?: unknown }
    return outcome
  }

  // Enrol on the hold (figsyHeld skips the $3 charge — already held). Then decide whether
  // the $3 stays held by whether an ACTIVE ENROLMENT EXISTS for this lead — NOT by whether
  // the count grew this call. A second/idempotent approve of an already-enrolled lead adds
  // no row, but its work IS active, so the hold must STAY (releasing it would leak the $3
  // while the lead is still being worked). We only release when there is NO enrolment at all
  // (no active campaign / dedup skip) — genuinely no work to hold money against.
  await autoEnrollLead(leadId, clientId, { force: true, figsyHeld: true })

  const { count: enrolled } = await db.from('figsy_enrollments')
    .select('id', { count: 'exact', head: true }).eq('client_id', clientId).eq('lead_id', leadId)

  const workHeld = (enrolled ?? 0) > 0
  if (!workHeld) {
    // No enrolment exists → no work to hold money against → return the $3.
    await releaseFigsyHold(clientId, leadId, 'no_work_started')
  }
  return {
    status: 'approved', revealed: true, email: reveal.email, workHeld,
    ...(workHeld ? {} : { workReason: 'no_active_campaign_or_dedup_skip' }),
  }
}

// Pass = client says "not a fit". No charge, no reveal; mark the lead so it leaves the queue.
// If the lead somehow carried a held $3 (approved then passed), release it (idempotent).
export async function passLead(leadId: string, clientId: string): Promise<{ status: 'passed' | 'not_found' }> {
  const { data } = await db.from('leads')
    .update({ status: 'passed', passed_at: new Date().toISOString() })
    .eq('id', leadId).eq('client_id', clientId).is('revealed_at', null)
    .select('id').maybeSingle()
  await releaseFigsyHold(clientId, leadId, 'passed')
  return { status: data ? 'passed' : 'not_found' }
}
