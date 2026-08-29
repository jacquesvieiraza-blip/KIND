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
//   SMARTLEAD   ⛓️ CORRECTED 29 Aug. This module first said "NO SAFE EVICTION MECHANISM".
//               That was true of THIS REPO and I stated it as though it were true of
//               SMARTLEAD. It is not: their API supports pausing a lead, unsubscribing it
//               from a campaign, unsubscribing it globally, and adding an EMAIL to the
//               workspace GLOBAL BLOCK LIST. The 403 that blocked reading their docs from
//               here became, in my write-up, a claim about the provider's capability.
//               → K.I.N.D suppression is written FIRST and stays authoritative, then
//                 `addToGlobalBlockList` is called. Success resolves the blocker with the
//                 evidence retained; FAILURE leaves it standing for a named human.
//               ⚠️ CODE VERIFIED against the documented contract; RUNTIME UNVERIFIED until a
//                 live workspace walk. Mocked tests prove OUR half, never Smartlead's.
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

/**
 * What happened when K.I.N.D suppression was propagated to the providers.
 *
 * `openBlockers === null` means we could not even establish the position — ⚠️ NOT zero. "We
 * could not tell whether this person is still in a campaign" is the most dangerous possible
 * answer to render as "they are not".
 */
export interface ProviderSuppressionOutcome {
  /** Was a provider actually called? False when the person is in no provider at all. */
  attempted: boolean
  /** Did the provider accept the suppression? */
  providerOk: boolean
  /** Blockers left open for a human. null = unknown. */
  openBlockers: number | null
  detail?: string
}

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
export async function propagateSuppressionToProviders(email: string, reason: string): Promise<ProviderSuppressionOutcome> {
  try {
    return await propagateInner(email, reason)
  } catch (err) {
    // ⚠️ THE K.I.N.D SUPPRESSION HAS ALREADY BEEN WRITTEN, AND IT IS AUTHORITATIVE. This runs
    // after the blocklist write on every door, so a throw here must never unwind it. Losing
    // the provider call means an untracked risk we can retry; losing the blocklist write
    // means we keep emailing someone who said stop. The two are not close.
    console.error('[provider-eviction] provider suppression threw —', email, err instanceof Error ? err.message : err)
    return { attempted: false, providerOk: false, openBlockers: null, detail: err instanceof Error ? err.message : String(err) }
  }
}

async function propagateInner(email: string, reason: string): Promise<ProviderSuppressionOutcome> {
  const key = normalizeRevealEmail(email)
  if (!key) return { attempted: false, providerOk: false, openBlockers: 0 }

  // `leads.email` is stored raw (HC-1/F10), so match case-insensitively — an opt-out that
  // misses here is an opt-out nobody ever actions.
  const { data, error } = await db.from('leads')
    .select('id, smartlead_campaign_id, provider_eviction_required_at, provider_evicted_at')
    .not('smartlead_campaign_id', 'is', null)
    .ilike('email', key)

  if (error) {
    console.error('[provider-eviction] could not check provider membership —', key, error.message)
    return { attempted: false, providerOk: false, openBlockers: null, detail: error.message }
  }

  const rows = (data ?? []) as {
    id: string
    provider_eviction_required_at: string | null
    provider_evicted_at: string | null
  }[]

  // NOT YET IN PROVIDER. The send gate is the whole answer for this person — there is nothing
  // on Smartlead's side to stop, and calling the API would be noise.
  if (rows.length === 0) return { attempted: false, providerOk: false, openBlockers: 0 }

  // ⚠️ IDEMPOTENT. Every row already resolved means this address is already on Smartlead's
  // global block list; a repeated STOP must not call again, must not reset any clock, and
  // must never look like a new incident.
  const unresolved = rows.filter(r => !r.provider_evicted_at)
  if (unresolved.length === 0) return { attempted: false, providerOk: true, openBlockers: 0 }

  const now = new Date().toISOString()

  // ── STEP 1 · RAISE FIRST, CALL SECOND ────────────────────────────────────────────────
  // The blocker is written BEFORE the provider call, not after. If the process dies mid-call
  // the risk is recorded; raising it afterwards would mean a crash leaves a suppressed person
  // in a live campaign with nothing anywhere saying so.
  // ⚠️ An already-raised blocker keeps its ORIGINAL timestamp — its age is how long this
  // person may have been receiving mail, and refreshing it on every retry erases exactly the
  // number an operator needs.
  for (const r of unresolved) {
    if (r.provider_eviction_required_at) continue
    const { error: upErr } = await db.from('leads').update({
      provider_eviction_required_at: now,
      provider_eviction_provider:    'smartlead',
      provider_eviction_reason:      reason,
      provider_evicted_at:           null,
      provider_evicted_by:           null,
    }).eq('id', r.id)
    if (upErr) {
      console.error('[provider-eviction] could not raise blocker for lead', r.id, upErr.message)
      return { attempted: false, providerOk: false, openBlockers: null, detail: upErr.message }
    }
  }

  // ── STEP 2 · TELL SMARTLEAD ──────────────────────────────────────────────────────────
  const { addToGlobalBlockList } = await import('./smartlead')
  const res = await addToGlobalBlockList([key])

  if (!res.ok) {
    // ⚠️ K.I.N.D SUPPRESSION IS NOT ROLLED BACK. It never depended on this call succeeding.
    // The blocker stays open, the founder is paged, and the person remains suppressed on
    // every K.I.N.D path — what is unresolved is only the provider's own copy.
    console.error('[provider-eviction] Smartlead global block list FAILED —', key, res.error)
    try {
      const { sendFounderAlert } = await import('./alerts')
      await sendFounderAlert('support_escalation',
        `🛑 SMARTLEAD SUPPRESSION FAILED — ${key}`, [
          `${key} opted out (${reason}) and is in ${unresolved.length === 1 ? 'a live Smartlead campaign' : `${unresolved.length} live Smartlead campaigns`}.`,
          'K.I.N.D suppression HELD — we will not email them. Smartlead was NOT told and sends from its own copy.',
          `The API call failed: ${res.error}`,
          '',
          'Add them to the Smartlead global block list by hand, then clear the blocker.',
        ])
    } catch (alertErr) {
      console.error('[provider-eviction] alert failed too —', alertErr instanceof Error ? alertErr.message : alertErr)
    }
    return { attempted: true, providerOk: false, openBlockers: unresolved.length, detail: res.error }
  }

  // ── STEP 3 · RESOLVE, KEEPING THE EVIDENCE ───────────────────────────────────────────
  // The rows are NOT cleared to null: `provider_eviction_required_at` stays, so the record
  // still says this person was in a campaign when they opted out and how long the gap was.
  // Resolution is a stamp on top of history, never an erasure of it.
  for (const r of unresolved) {
    const { error: doneErr } = await db.from('leads').update({
      provider_evicted_at: now,
      provider_evicted_by: 'smartlead-api:global_block_list',
    }).eq('id', r.id)
    if (doneErr) {
      // The provider DID accept it; we simply failed to record that. Leaving the blocker open
      // is the safe direction — a human re-checking a person already blocked costs a minute.
      console.error('[provider-eviction] Smartlead accepted but the blocker could not be cleared —', r.id, doneErr.message)
      return { attempted: true, providerOk: true, openBlockers: unresolved.length, detail: doneErr.message }
    }
  }

  return { attempted: true, providerOk: true, openBlockers: 0 }
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
