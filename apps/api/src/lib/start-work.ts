// PAYMENT STARTS THE WORK — the step-3 collapse from flow v2 (founder-locked 25 Jul).
//
// Before this, the chain had no automatic links: the client paid, and then an operator had to
// remember to type "source 20 leads" into a chat box. The ICP the client approved on day one
// sat there saying "never sourced". This is the link.
//
// The founder's rule, in order:
//   • Money gates the spend. Nothing sources until the $99 lands — sourcing costs us and
//     without a sender there is nothing to send from.
//   • Source 200 so they can approve 100. They pass on roughly half, and a client who can
//     only approve everyone we found has no choice at all.
//   • Every sourced person goes to the client, scored, with our top 20 marked. We don't
//     filter first — that adds work and delays the money.
//
// Buying the INBOX stays manual on purpose (founder-locked): it spends real money, so it
// surfaces as the operator's next action rather than happening behind their back.
//
// Safe to call twice: sourcing tops up to the target rather than adding a fresh batch, and
// surfacing only touches leads that aren't already with the client.

import { db } from '@kind/db'
import { sourceTarget, PAID_TX_TYPES } from './onboarding-pack'

/**
 * ONE ICP = ONE CAMPAIGN (flow v2). The campaign is the vehicle for an ICP, not a separate
 * thing you create and then assign people into — so it is born with the ICP and a lead's
 * campaign is decided by the ICP that found them. `figsy_campaigns.icp_id` has existed all
 * along and nothing read it.
 *
 * Idempotent: returns the existing campaign for that ICP if there is one.
 */
export async function ensureCampaignForIcp(
  clientId: string,
  icpId: string,
  icpName?: string | null,
): Promise<{ id: string } | null> {
  try {
    const { data: existing } = await db.from('figsy_campaigns')
      .select('id').eq('client_id', clientId).eq('icp_id', icpId).limit(1).maybeSingle()
    if (existing?.id) return { id: existing.id as string }

    // Created ACTIVE: the table default is 'draft', and a draft would leave the client just
    // as blocked as no campaign at all (approve fail-closes without a live one). Nothing
    // sends regardless until the sequence is approved and the operator hits Run.
    const { data: made, error } = await db.from('figsy_campaigns')
      .insert({
        client_id: clientId, icp_id: icpId, status: 'active',
        name: icpName?.trim() ? icpName.trim().slice(0, 120) : 'Outbound campaign',
        settings: { review_required: true },   // Co-Pilot by default — a human sees each email
        copilot_mode: true, approve_before_send: true,
      })
      .select('id').single()
    if (error) throw error
    return { id: made.id as string }
  } catch (err) {
    console.error('[start-work] ensureCampaignForIcp failed', clientId, icpId, err)
    return null
  }
}

export type StartWorkResult = {
  started: boolean
  reason?: 'not_paid' | 'no_icp' | 'no_user' | 'already_stocked'
  sourced: number
  surfaced: number
  recommended: number
  /** Set when the sourcing run THREW. `sourced: 0` alone cannot be trusted without it. */
  sourcingError?: string
}

/** How many of the surfaced people we mark as "we'd start with these". */
export const RECOMMEND_TOP = 20

/**
 * Source against the client's live ICP and put everyone in front of them.
 *
 * Never throws — this runs off a Stripe webhook and a payment must never fail because
 * sourcing had a bad day. Returns what actually happened so the caller can log it.
 */
export async function startWorkForClient(clientId: string): Promise<StartWorkResult> {
  const empty: StartWorkResult = { started: false, sourced: 0, surfaced: 0, recommended: 0 }
  try {
    // ── Money gate. No purchase, no spend. ──────────────────────────────────
    const { count: purchases } = await db.from('credit_transactions')
      .select('id', { count: 'exact', head: true })
      .eq('client_id', clientId).in('type', PAID_TX_TYPES)
    if ((purchases ?? 0) === 0) return { ...empty, reason: 'not_paid' }

    const { data: icp } = await db.from('icps')
      .select('id').eq('client_id', clientId).eq('is_active', true)
      .order('created_at', { ascending: false }).limit(1).maybeSingle()
    if (!icp?.id) return { ...empty, reason: 'no_icp' }

    // runIcpJob bills and attributes against the owning user.
    const { data: client } = await db.from('clients').select('user_id').eq('id', clientId).maybeSingle()
    if (!client?.user_id) return { ...empty, reason: 'no_user' }

    // ── Source, topping the DESK up to the target ──────────────────────────
    //
    // This counted every lead the client had ever held, which made 200 a LIFETIME cap. The
    // model is $99 once for 100 included, then top-ups in bundles at $4 a lead — so a client
    // who worked through their desk and topped up $200 to approve fifty more got `want = 0`
    // and **nobody new to approve**. They had paid and there was nothing to spend it on.
    //
    // Count only what is still AWAITING A DECISION: not yet approved (`revealed_at` null) and
    // not passed. Approved and passed leads are finished business and must not hold slots
    // open against the client forever.
    //
    // Safe against over-sourcing because that is not this function's job: `try_spend_sourcing`
    // holds the client's pre-funded allowance, the per-client daily cap and the global monthly
    // ceiling. Asking for people we cannot afford is refused there.
    const { count: awaiting } = await db.from('leads')
      .select('id', { count: 'exact', head: true })
      .eq('client_id', clientId).is('revealed_at', null).neq('status', 'passed')
    const want = sourceTarget(awaiting ?? 0)

    // A SOURCING FAILURE MUST NOT READ AS "NOTHING TO DO".
    //
    // This `.catch` returned null, the function carried on, and the caller got
    // `{ started: true, sourced: 0 }` — indistinguishable from a client who was already
    // stocked. The client had just PAID. Nobody was told, because it only reached
    // `console.error`. (Audit 27 Jul.)
    let sourced = 0
    let sourcingFailed: string | null = null
    if (want > 0) {
      const { runIcpJob } = await import('../routes/icps')
      const run = await runIcpJob(icp.id, clientId, client.user_id as string, want)
        .catch(e => {
          sourcingFailed = e instanceof Error ? e.message : String(e)
          console.error('[start-work] sourcing failed for', clientId, e)
          return null
        })
      sourced = run?.inserted ?? 0
      if (sourcingFailed) {
        const { sendFounderAlert } = await import('./alerts')
        void sendFounderAlert('source_down', 'A paying client asked for people and sourcing FAILED', [
          `Client ${clientId} has paid, and the run for ${want} record(s) failed.`,
          `Reason: ${sourcingFailed}`,
          'Their desk is not being filled. This does NOT look like an error anywhere else — it reads as "nothing to do" on every board until it is fixed.',
          'Re-run start-work for them once the cause is cleared.',
        ]).catch(() => {})
      }
    }

    // ── Everyone goes to the client, top 20 marked ─────────────────────────
    const { surfaced, recommended } = await surfaceEverything(clientId)
    if (want === 0 && surfaced === 0) return { ...empty, started: true, reason: 'already_stocked' }

    return { started: true, sourced, surfaced, recommended, ...(sourcingFailed ? { sourcingError: sourcingFailed } : {}) }
  } catch (err) {
    console.error('[start-work] failed for client', clientId, err)
    return empty
  }
}

/**
 * Put every un-surfaced lead in front of the client and mark the top 20 by score.
 *
 * No TTL: paid leads have no time limit (founder-locked). The old 72h clock never expired
 * anything — it just made leads vanish off the desk — so nothing is stamped here beyond the
 * surfaced marker itself.
 */
export async function surfaceEverything(clientId: string): Promise<{ surfaced: number; recommended: number }> {
  const { data: fresh } = await db.from('leads')
    .select('id, score')
    .eq('client_id', clientId)
    .is('surfaced_for_approval_at', null)
    .is('revealed_at', null)
    .neq('status', 'passed')
    .order('score', { ascending: false, nullsFirst: false })
    .limit(1000)

  const ids = (fresh ?? []).map((l: { id: string }) => l.id)
  if (ids.length === 0) return { surfaced: 0, recommended: 0 }

  const now = new Date().toISOString()
  // SURFACING **IS** DELIVERY IN THE MANAGED MODEL — the second silent cap.
  //
  // `/leads/for-approval` requires `delivered_at`, and leads are inserted with it null on
  // purpose: the old self-serve product had a nightly drip release `daily_drip_rate ?? 5`
  // a day so a trial user couldn't hoover up a database. In the managed model WE decide
  // what is on a client's desk, and this function is that decision — so a lead we have
  // just put in front of them but left "undelivered" was invisible to them, and would have
  // trickled onto the desk five a day. On a 200-lead pack that is forty days.
  //
  // Set together, so surfaced and visible can never disagree. Untouched if already set.
  //
  // BOTH WRITES ARE CHECKED NOW. They were bare `await`s with no `.error` read, and the
  // function then returned `surfaced: ids.length` regardless — so a failed `delivered_at`
  // write left the leads invisible to the client (`/for-approval` requires it) while the
  // operator's alert read "sent 200 to them". Reporting a delivery that did not happen is
  // the exact invisibility the comment above exists to fix.
  const { error: surfErr } = await db.from('leads').update({ surfaced_for_approval_at: now }).in('id', ids)
  const { error: delErr } = await db.from('leads').update({ delivered_at: now }).in('id', ids).is('delivered_at', null)
  if (surfErr || delErr) {
    const why = surfErr?.message ?? delErr?.message ?? 'unknown'
    console.error('[start-work] surfacing FAILED for client', clientId, why)
    const { sendFounderAlert } = await import('./alerts')
    void sendFounderAlert('sends_stalled', 'Leads were sourced but NOT put on the client\'s desk', [
      `Client ${clientId}: ${ids.length} lead(s) could not be surfaced.`,
      `Reason: ${why}`,
      surfErr && !delErr ? 'They are not marked as surfaced.' : '',
      delErr ? 'They are marked surfaced but NOT delivered — which means the client cannot see them at all.' : '',
      'Nothing is lost: re-running start-work will retry. But their desk is empty until it does.',
    ].filter(Boolean)).catch(() => {})
    // Report ZERO rather than a number nobody delivered — the caller logs this figure to the
    // founder as "sent N to them".
    return { surfaced: 0, recommended: 0 }
  }

  // "Recommended" is derived from score at read time (see /leads/for-approval) rather than
  // stored, so it needs no column and can never go stale against a re-score.
  return { surfaced: ids.length, recommended: Math.min(RECOMMEND_TOP, ids.length) }
}
