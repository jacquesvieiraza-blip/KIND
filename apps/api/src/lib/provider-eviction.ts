// ═══════════════════════════════════════════════════════════════════════════════════════
// PROVIDER-SIDE EVICTION — what happens to a person who was ALREADY inside a provider when
// they became suppressed.
//
// `lib/send-gate.ts` answers "may we send to this person?" and refuses every new K.I.N.D
// send. It can do nothing about a prospect already pushed into an engine that sends from its
// own copy of the lead — for them, our chokepoint never runs again. A pre-send gate is
// necessary and it is not sufficient, and treating it as sufficient is how a product comes
// to LOOK like it propagates opt-outs while a suppressed person keeps receiving mail.
//
// THE THREE CLASSIFICATIONS, per provider (founder's framing, 29 Aug):
//
//   NOT YET IN PROVIDER            the send gate alone is sufficient
//   ALREADY IN PROVIDER            provider-side eviction must exist and be proven
//   NO SAFE EVICTION MECHANISM     fail closed + an operator-visible blocker,
//                                  and do NOT pretend the risk is closed
//
//   SMARTLEAD   ⚠️ NO SAFE EVICTION MECHANISM. api.smartlead.ai returns 403 from this
//               environment, so no remove endpoint could ever be confirmed, and the founder
//               ruled 20 Aug — "yes alert not api" — that guessing at one is not acceptable
//               on a path that touches real people. Removal is MANUAL, in their dashboard.
//               → blocker raised, and it stays raised until a human confirms.
//
//   INSTANTLY   NOT YET IN PROVIDER today — dormant, INSTANTLY_API_KEY unset, no lead has
//               ever been pushed. The send gate in `instantly-push.ts` stops a suppressed
//               person entering. ⚠️ But a revival path must not be able to RETAIN one, so a
//               lead carrying an Instantly campaign id raises the same blocker.
//
//   WHATSAPP    NOT YET IN PROVIDER — there is no provider-side sequence. Meta sends exactly
//   LINKEDIN    what we hand it, one message at a time, and PhantomBuster acts per queued
//               step. Nothing continues on its own after suppression, because nothing was
//               ever handed over to continue. The send gate IS the whole answer here.
//
// ⚠️ THIS MODULE MAKES NO LEGAL OR COMPLIANCE CLAIM. It is an operational control: it makes a
// real, unclosed risk COUNTABLE and visible. It does not close it.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { db } from '@kind/db'
import { normalizeRevealEmail } from './billing-rules'

export type EvictionProvider = 'smartlead' | 'instantly'

export interface PendingEviction {
  leadId: string
  clientId: string | null
  email: string | null
  provider: EvictionProvider
  campaignId: string | null
  reason: string | null
  raisedAt: string
}

/**
 * Raise the blocker for every lead matching this address that is already inside a provider.
 *
 * Called at the moment of suppression, on every suppression door. Idempotent: re-raising an
 * open blocker leaves the original timestamp, because the age of the blocker is the operator's
 * signal for how long a suppressed person may have been receiving mail.
 *
 * Returns how many blockers are now open for this address, or null if the check itself failed
 * — ⚠️ null is NOT zero. "We could not tell whether this person is still in a campaign" is the
 * most dangerous possible answer to render as "they are not".
 */
export async function raiseProviderEviction(email: string, reason: string): Promise<number | null> {
  try {
    return await raiseProviderEvictionInner(email, reason)
  } catch (err) {
    // ⚠️ THE SUPPRESSION ITSELF HAS ALREADY HAPPENED, AND IT IS WHAT MATTERS. This runs after
    // the blocklist write on both doors, so a throw here must never unwind it — the same
    // reason `alertSmartleadStillSending` has always been wrapped. Losing the blocker means
    // an untracked risk; losing the blocklist write means we keep emailing someone who said
    // stop. Report loudly and return null (which is NOT zero — see below).
    console.error('[provider-eviction] blocker could not be raised —', email, err instanceof Error ? err.message : err)
    return null
  }
}

async function raiseProviderEvictionInner(email: string, reason: string): Promise<number | null> {
  const key = normalizeRevealEmail(email)
  if (!key) return 0

  // `leads.email` is stored raw (HC-1/F10), so match case-insensitively — an opt-out that
  // misses here is an opt-out nobody ever actions.
  const { data, error } = await db.from('leads')
    .select('id, smartlead_campaign_id, provider_eviction_required_at, provider_evicted_at')
    .not('smartlead_campaign_id', 'is', null)
    .ilike('email', key)

  if (error) {
    console.error('[provider-eviction] could not check provider membership —', key, error.message)
    return null
  }

  const rows = (data ?? []) as {
    id: string
    provider_eviction_required_at: string | null
    provider_evicted_at: string | null
  }[]
  if (rows.length === 0) return 0

  const now = new Date().toISOString()
  let open = 0
  for (const r of rows) {
    open++
    // Already raised and not yet cleared — leave the original timestamp standing. Refreshing
    // it would reset the clock on how long this person has been at risk, which is the one
    // thing the operator most needs to see.
    if (r.provider_eviction_required_at && !r.provider_evicted_at) continue

    const { error: upErr } = await db.from('leads').update({
      provider_eviction_required_at: now,
      provider_eviction_provider:    'smartlead',
      provider_eviction_reason:      reason,
      provider_evicted_at:           null,
      provider_evicted_by:           null,
    }).eq('id', r.id)

    if (upErr) {
      console.error('[provider-eviction] could not raise blocker for lead', r.id, upErr.message)
      return null
    }
  }
  return open
}

/**
 * The operator's queue — suppressed people who may still be receiving mail.
 *
 * ⚠️ THE WORDING MATTERS WHEREVER THIS IS RENDERED. A row here does not mean "handled". It
 * means delivery may still be happening and only a human can stop it, in the provider's own
 * dashboard. A surface that shows this list as a tidy task queue would imply the risk is
 * managed; it is recorded, which is not the same thing.
 */
export async function pendingProviderEvictions(limit = 200): Promise<PendingEviction[] | null> {
  const { data, error } = await db.from('leads')
    .select('id, client_id, email, smartlead_campaign_id, provider_eviction_provider, provider_eviction_reason, provider_eviction_required_at')
    .not('provider_eviction_required_at', 'is', null)
    .is('provider_evicted_at', null)
    .order('provider_eviction_required_at', { ascending: true })
    .limit(limit)

  if (error) {
    console.error('[provider-eviction] could not list pending evictions:', error.message)
    return null
  }

  return ((data ?? []) as Record<string, unknown>[]).map(r => ({
    leadId:     r.id as string,
    clientId:   (r.client_id as string | null) ?? null,
    email:      (r.email as string | null) ?? null,
    provider:   ((r.provider_eviction_provider as EvictionProvider | null) ?? 'smartlead'),
    campaignId: (r.smartlead_campaign_id as string | null) ?? null,
    reason:     (r.provider_eviction_reason as string | null) ?? null,
    raisedAt:   r.provider_eviction_required_at as string,
  }))
}

/**
 * Clear a blocker — ONLY after a human has actually removed the person in the provider.
 *
 * ⚠️ `confirmedBy` is required and is not defaulted. "The system cleared it" is not a
 * confirmation of anything, and a blocker that can be closed without a name is a blocker that
 * will be closed to tidy the list.
 */
export async function markProviderEvicted(leadId: string, confirmedBy: string): Promise<boolean> {
  if (!confirmedBy.trim()) {
    console.error('[provider-eviction] refusing to clear a blocker with no named confirmer — lead', leadId)
    return false
  }
  const { error } = await db.from('leads').update({
    provider_evicted_at: new Date().toISOString(),
    provider_evicted_by: confirmedBy,
  }).eq('id', leadId).not('provider_eviction_required_at', 'is', null)

  if (error) {
    console.error('[provider-eviction] could not clear blocker for lead', leadId, error.message)
    return false
  }
  return true
}
