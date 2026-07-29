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
 * #571 — SPLIT THE SOURCING TARGET ACROSS EVERY ACTIVE ICP.
 *
 * Sourcing used to read `.order('created_at', desc).limit(1).maybeSingle()` — the single
 * NEWEST active ICP. A client with two live ICPs therefore had one of them silently ignored
 * forever: no error, no log, no empty run to notice. They approved it, it says "never
 * sourced", and nothing in the product ever explains why.
 *
 * THE SPLIT RULE, stated once so it is not re-derived from the code later:
 *
 *   • The target is divided EVENLY, because we have no basis for ranking one approved ICP
 *     above another. They are all the client's stated intent; weighting by ICP age or by how
 *     many leads each has already produced would quietly turn a preference into a policy.
 *   • The REMAINDER goes to the newest ICPs first (the list arrives newest-first). If a
 *     client adds an ICP today, the odd lead lands on the one they were most recently
 *     thinking about.
 *   • When there are more ICPs than leads to fetch, the first `want` ICPs get one each and
 *     the rest get zero — a zero share is skipped entirely rather than issuing an empty run,
 *     because an empty run still costs an API call and writes a confusing outcome row.
 *
 * Pure, so the arithmetic is provable without a database or a sourcing provider.
 */
export function splitSourceTarget(want: number, icpCount: number): number[] {
  if (icpCount <= 0 || want <= 0) return new Array(Math.max(0, icpCount)).fill(0)
  const base = Math.floor(want / icpCount)
  const remainder = want % icpCount
  return Array.from({ length: icpCount }, (_, i) => base + (i < remainder ? 1 : 0))
}

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

    // #571 — EVERY active ICP, not just the newest. This was `.limit(1).maybeSingle()`, so a
    // client with two live ICPs had one silently ignored forever — no error, no empty run,
    // nothing to notice. Newest first, because that is the order the remainder is handed out
    // in (see splitSourceTarget).
    const { data: icpRows } = await db.from('icps')
      .select('id').eq('client_id', clientId).eq('is_active', true)
      .order('created_at', { ascending: false })
    const icps = ((icpRows ?? []) as { id: string }[]).filter(i => i?.id)
    if (icps.length === 0) return { ...empty, reason: 'no_icp' }

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
      const shares = splitSourceTarget(want, icps.length)
      const failures: string[] = []

      // SEQUENTIAL, NOT `Promise.all`. Every run spends the same pre-funded allowance through
      // `try_spend_sourcing`, and firing them together would race that check — two runs each
      // reading "enough left" and both spending it. Sourcing is a background job off a
      // webhook; there is nothing to gain by making it concurrent and a budget to lose.
      for (let i = 0; i < icps.length; i++) {
        const share = shares[i]
        if (share <= 0) continue      // more ICPs than leads to fetch — an empty run helps nobody
        const run = await runIcpJob(icps[i].id, clientId, client.user_id as string, share)
          .catch(e => {
            const why = e instanceof Error ? e.message : String(e)
            failures.push(`${icps[i].id}: ${why}`)
            console.error('[start-work] sourcing failed for', clientId, 'icp', icps[i].id, e)
            return null
          })
        sourced += run?.inserted ?? 0
      }

      // ONE ICP FAILING IS STILL A FAILURE WORTH REPORTING, even when another succeeded —
      // that ICP's audience is simply not being sourced, and a partial result is exactly the
      // shape that reads as success on every board.
      if (failures.length > 0) {
        sourcingFailed = failures.join(' · ')
        const { sendFounderAlert } = await import('./alerts')
        void sendFounderAlert('source_down', 'A paying client asked for people and sourcing FAILED', [
          `Client ${clientId} has paid, and ${failures.length} of ${icps.length} ICP run(s) for ${want} record(s) failed.`,
          `Reason: ${sourcingFailed}`,
          sourced > 0
            ? `${sourced} record(s) DID land from the other ICP(s) — so this will look like a normal, slightly small delivery unless you read this.`
            : 'Their desk is not being filled.',
          'This does NOT look like an error anywhere else — it reads as "nothing to do" on every board until it is fixed.',
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
  // #571 — THE SECOND SILENT CAP. This read was `.limit(1000)` inside a function whose whole
  // contract is "everyone". A client past a thousand undecided leads had the rest left
  // invisible — not surfaced, not delivered, no error — and the caller reported the truncated
  // figure to the founder as "sent N to them". Exactly the failure the `delivered_at` comment
  // below already describes, arriving through a different door.
  //
  // Paged with the shared pager (same one the Vida worklist uses) rather than a bigger limit,
  // because a bigger limit is the same bug with a later trigger.
  //
  // ORDERED BY `id`, NOT BY SCORE, and that is a fix rather than a regression: paging needs a
  // stable, unique key or pages can skip and repeat rows, and `score` is neither (nullable,
  // and ties are common). The score ordering here never mattered — it only decided WHICH
  // thousand survived the truncation, and there is no truncation now. "Recommended" is
  // derived from score at read time in `/leads/for-approval`, which is where it belongs.
  const { pageRows } = await import('./page-rows')
  let fresh: { id: string }[]
  let complete: boolean
  try {
    const read = await pageRows<{ id: string }>('leads',
      q => {
        // The builder is chainable; describe it as such so each link stays typed rather
        // than collapsing to `unknown` (or being waved through with `any`).
        type Chain = {
          select: (c: string) => Chain
          eq: (c: string, v: unknown) => Chain
          is: (c: string, v: unknown) => Chain
          neq: (c: string, v: unknown) => Chain
        }
        return (q as unknown as Chain)
          .select('id')
          .eq('client_id', clientId)
          .is('surfaced_for_approval_at', null)
          .is('revealed_at', null)
          .neq('status', 'passed')
      },
      { orderBy: 'id', label: `surfaceEverything:${clientId}` })
    fresh = read.rows
    complete = read.complete
  } catch (err) {
    // `pageRows` THROWS on a read error, where the old `.limit()` read swallowed it into an
    // undefined and returned a calm zero. A read failure is not "nothing to surface".
    const why = err instanceof Error ? err.message : String(err)
    console.error('[start-work] could not read leads to surface for client', clientId, why)
    const { sendFounderAlert } = await import('./alerts')
    void sendFounderAlert('sends_stalled', 'Could not read a client\'s leads to put on their desk', [
      `Client ${clientId}: the query that finds un-surfaced leads failed.`,
      `Reason: ${why}`,
      'This reports ZERO surfaced, which is indistinguishable from a client who is already stocked — hence this alert.',
      'Nothing is lost: re-running start-work will retry.',
    ]).catch(() => {})
    return { surfaced: 0, recommended: 0 }
  }

  const ids = fresh.map(l => l.id)
  if (ids.length === 0) return { surfaced: 0, recommended: 0 }
  if (!complete) {
    // The pager hit its ceiling. Say so rather than let a partial answer be reported as the
    // whole desk — the same honesty the pager itself logs, escalated because this one is a
    // paying client's delivery.
    console.warn(`[start-work] surfacing for ${clientId} is PARTIAL — the pager ceiling was reached at ${ids.length} leads.`)
  }

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
