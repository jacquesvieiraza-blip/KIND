import { db } from '@kind/db'
import { isDemoClient } from './demo'

// #492 — MONEY RE-TIME: the $3 (one FIGSY credit) is HELD at client approval and only
// CAPTURED on a confirmed booking; RELEASED if the lead never books. Only the client's
// approval creates a hold, so nothing spends without approval.
//
// Reconciliation model (why there's no double-count):
//   • HOLD    → decrement figsy_credits_remaining by 1 (via the existing atomic
//               try_charge_figsy_credit) + insert a credit_holds row (status='held') +
//               write ONE ledger row (amount -1, "held on approve"). That -1 IS the spend
//               record; the balance dropped once.
//   • CAPTURE → flip the hold to 'captured'. NO balance change, NO second -1 (the credit
//               already left at hold). Best-effort re-notes the ledger row "captured".
//   • RELEASE → increment figsy_credits_remaining by 1 + flip the hold to 'released' +
//               write a +1 ledger row. hold(-1) + release(+1) == 0, balance restored.
// So sum(credit_transactions.amount) always equals the real figsy_credits movement.
//
// Demo clients: free + off-ledger (mirrors chargeFigsyEnroll) — no credit touched, no row.

export type HoldOutcome =
  | { ok: true; demo?: boolean }
  | { ok: false; reason: 'insufficient_work_credits' | 'error' }

function leadLabel(lead?: { first_name?: string | null; last_name?: string | null; company?: string | null }): string {
  if (!lead) return '(lead)'
  return `${lead.first_name ?? ''} ${lead.last_name ?? ''}`.trim() || '(lead)'
}

// HOLD the $3 at approval. Atomic + fail-closed: only a hard `true` from
// try_charge_figsy_credit counts, and only then is the hold row written.
export async function holdFigsyCredit(
  clientId: string,
  leadId: string,
  lead?: { first_name?: string | null; last_name?: string | null; company?: string | null },
): Promise<HoldOutcome> {
  if (await isDemoClient(clientId)) return { ok: true, demo: true }

  // Idempotent: a lead already carrying an active hold is not double-held.
  const { data: existing } = await db.from('credit_holds')
    .select('id').eq('client_id', clientId).eq('lead_id', leadId).eq('status', 'held').maybeSingle()
  if (existing) return { ok: true }

  const { data: charged, error } = await db.rpc('try_charge_figsy_credit', { p_client_id: clientId })
  if (error || charged !== true) {
    return { ok: false, reason: error ? 'error' : 'insufficient_work_credits' }
  }

  const { error: insErr } = await db.from('credit_holds')
    .insert({ client_id: clientId, lead_id: leadId, amount: 1, status: 'held', created_at: new Date().toISOString() })
  if (insErr) {
    // The credit left but the hold row didn't land — return the credit so we never
    // silently swallow it, and report failure (caller refunds the $1 + aborts).
    await db.rpc('increment_figsy_credits', { p_client_id: clientId, p_amount: 1 }).then(() => {}, () => {})
    console.error('[credit-holds] hold insert failed after charge — credit returned, lead', leadId, insErr.message)
    return { ok: false, reason: 'error' }
  }

  await db.from('credit_transactions').insert({
    client_id: clientId, amount: -1, type: 'hold', plan: 'figsy',
    reference: `hold:${leadId}`, note: `$3 work held on approve: ${leadLabel(lead)}`,
    created_at: new Date().toISOString(),
  }).then(() => {}, () => {})
  return { ok: true }
}

// CAPTURE the held $3 on a confirmed booking. Idempotent (only acts on a 'held' row);
// a missing hold is logged loudly and NEVER charges — booking must not invent a debit.
export async function captureFigsyHold(clientId: string, leadId: string): Promise<void> {
  if (await isDemoClient(clientId)) return // demo never holds → nothing to capture, no alarm
  const { data: hold } = await db.from('credit_holds')
    .select('id, status').eq('client_id', clientId).eq('lead_id', leadId).eq('status', 'held')
    .order('created_at', { ascending: false }).limit(1).maybeSingle()

  if (!hold) {
    // Already captured (idempotent re-book) is fine and silent; a truly absent hold on a
    // booking is an anomaly under the model — shout, but do not fabricate a charge.
    const { data: already } = await db.from('credit_holds')
      .select('id').eq('client_id', clientId).eq('lead_id', leadId).eq('status', 'captured').limit(1).maybeSingle()
    if (!already) console.error('[credit-holds] CAPTURE with NO held $3 for booked lead', leadId, 'client', clientId, '— no charge made (model expects a hold from approval).')
    return
  }

  await db.from('credit_holds').update({ status: 'captured', captured_at: new Date().toISOString() }).eq('id', hold.id)
  // Re-note the original hold ledger row so the founder sees "captured — booking" (the
  // -1 stays; no second debit). Best-effort.
  await db.from('credit_transactions').update({ note: `$3 work captured — booking confirmed (lead ${leadId})` })
    .eq('client_id', clientId).eq('reference', `hold:${leadId}`).eq('type', 'hold').then(() => {}, () => {})
}

// Convenience: release by ENROLLMENT id (the terminal transitions in the send loop carry
// the enrollment, not client+lead). Resolves the enrollment then releases. Idempotent.
export async function releaseHoldForEnrollment(enrollmentId: string, reason: string): Promise<void> {
  const { data: enr } = await db.from('figsy_enrollments')
    .select('client_id, lead_id').eq('id', enrollmentId).maybeSingle()
  if (enr?.client_id && enr?.lead_id) await releaseFigsyHold(enr.client_id as string, enr.lead_id as string, reason)
}

// RELEASE the held $3 when a lead reaches a terminal, never-booked state. Idempotent
// (only acts on a 'held' row) — safe to call from every terminal transition.
export async function releaseFigsyHold(clientId: string, leadId: string, reason: string): Promise<void> {
  if (await isDemoClient(clientId)) return // demo never holds → nothing to release
  const { data: hold } = await db.from('credit_holds')
    .select('id').eq('client_id', clientId).eq('lead_id', leadId).eq('status', 'held')
    .order('created_at', { ascending: false }).limit(1).maybeSingle()
  if (!hold) return // nothing held (never approved, or already captured/released)

  const { error } = await db.rpc('increment_figsy_credits', { p_client_id: clientId, p_amount: 1 })
  if (error) { console.error('[credit-holds] release increment failed for lead', leadId, error.message); return }

  await db.from('credit_holds').update({ status: 'released', released_at: new Date().toISOString() }).eq('id', hold.id)
  await db.from('credit_transactions').insert({
    client_id: clientId, amount: 1, type: 'release', plan: 'figsy',
    reference: `release:${leadId}`, note: `$3 work released — ${reason} (lead ${leadId})`,
    created_at: new Date().toISOString(),
  }).then(() => {}, () => {})
}
