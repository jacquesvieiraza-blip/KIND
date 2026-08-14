// THE UNLOCK-DAY BACKFILL — the leads that were approved before the key existed.
//
// ⚠️ THIS FILE EXISTS BECAUSE OF A GAP THAT DEFEATS R25 (found 13 Aug, building A22).
//
// R25 says "day 1 a client needs to use the system. full stop." The month-one Smartlead push
// (`smartlead-send.ts`) is built and wired at `approve-lead.ts:443` — but when
// `SMARTLEAD_API_KEY` is absent it refuses with `no_api_key`, and that refusal is DELIBERATELY
// not alerted (`smartleadRefusalIsNews` → false), because alerting on every approval while the
// key is unbought would train the founder to ignore the alert.
//
// The consequence nobody had written down: those leads are **charged, revealed, enrolled — and
// never handed to Smartlead.** Nothing records that the push was skipped, and nothing replays
// it. So on unlock day the key goes live and every lead approved BEFORE that moment stays
// un-pushed forever: the client paid $4 each and their mailbox never sends for any of them.
// "Day 1 works" would be true only for leads approved after the purchase.
//
// This is the recovery, and it is deliberately QUERY-DRIVEN rather than a new queue table:
// the truth of "approved and paid for" already lives on `leads` (`revealed_at`), and a queue
// would be a second copy of that truth that can disagree with it — the drift class this repo
// keeps re-learning (#570's "mirrors exactly" comment that didn't).
//
// SAFETY: this calls the SAME `pushApprovedLeadToSmartlead` as the live path, so every gate
// re-runs per lead — demo, kill-switch, house client, missing inbox. It cannot send anything
// the ordinary path would refuse, and with `AUTO_OUTREACH_ENABLED` off it pushes nothing at
// all. It is operator-triggered from the unlock-day runbook, never automatic: a backfill that
// fires on its own is how a month of leads lands in a campaign nobody was watching.

import { db } from '@kind/db'

/** Never hand Smartlead an unbounded month of leads in one call. */
export const BACKFILL_DEFAULT_LIMIT = 200

export type BackfillOutcome = {
  clientId: string
  found: number
  pushed: number
  refused: number
  /** Per-lead detail, so the operator can read WHY rather than guess. */
  results: { leadId: string; pushed: boolean; detail: string }[]
  /** True when nothing was attempted because the whole client is ineligible. */
  haltedBefore?: string
}

/**
 * Approved, paid-for leads that could be in the client's Smartlead campaign.
 *
 * `revealed_at is not null` IS the "this lead was approved and charged" fact — the same
 * column `approve-lead.ts` stamps and `milla-summary` counts, so this can never disagree
 * with what the client was billed for.
 */
export async function findApprovedLeadsForBackfill(
  clientId: string,
  limit = BACKFILL_DEFAULT_LIMIT,
): Promise<{ id: string; email: string | null }[]> {
  const { data } = await db.from('leads')
    .select('id, email')
    .eq('client_id', clientId)
    .not('revealed_at', 'is', null)
    .neq('status', 'passed')
    .order('revealed_at', { ascending: true })
    .limit(limit)
  return ((data ?? []) as { id: string; email: string | null }[])
    // A lead with no address cannot be pushed and would only inflate the count.
    .filter(l => !!l.email && l.email.trim().length > 0)
}

/**
 * Re-offer every already-approved lead to Smartlead, one at a time, through the live path.
 *
 * Returns what happened per lead. **Never throws** — it is run by hand on the busiest day of
 * the client's onboarding, and an exception halfway through would leave the operator unable to
 * tell which leads made it.
 */
export async function backfillSmartleadForClient(
  clientId: string,
  limit = BACKFILL_DEFAULT_LIMIT,
): Promise<BackfillOutcome> {
  const out: BackfillOutcome = { clientId, found: 0, pushed: 0, refused: 0, results: [] }

  // One cheap pre-flight so a wholly-ineligible client reports ONE clear reason instead of the
  // same refusal repeated 200 times.
  const { smartleadConfigured } = await import('./smartlead')
  if (!smartleadConfigured()) {
    out.haltedBefore = 'SMARTLEAD_API_KEY is not set, so nothing can be pushed yet. This is the expected state until the founder buys the API-tier plan on unlock day (R25) — run this again after the key is in Railway.'
    return out
  }
  if (process.env.AUTO_OUTREACH_ENABLED !== 'true') {
    out.haltedBefore = 'AUTO_OUTREACH_ENABLED is off, so nothing is pushed to anyone. That is the safe default and it governs this backfill exactly as it governs every send path.'
    return out
  }

  const leads = await findApprovedLeadsForBackfill(clientId, limit)
  out.found = leads.length
  if (leads.length === 0) return out

  const { pushApprovedLeadToSmartlead } = await import('./smartlead-send')
  for (const lead of leads) {
    try {
      const r = await pushApprovedLeadToSmartlead(lead.id, clientId)
      if (r.pushed) {
        out.pushed++
        out.results.push({ leadId: lead.id, pushed: true, detail: `In campaign ${r.campaignId}.` })
      } else {
        out.refused++
        out.results.push({ leadId: lead.id, pushed: false, detail: r.detail })
      }
    } catch (e) {
      out.refused++
      out.results.push({ leadId: lead.id, pushed: false, detail: `Threw: ${e instanceof Error ? e.message : String(e)}` })
    }
  }
  return out
}

/**
 * The one-line summary the operator reads. Written so the FAILURE case is the loud one —
 * "0 of 40 pushed" must not look like success.
 */
export function backfillSummary(o: BackfillOutcome): string {
  if (o.haltedBefore) return `Nothing attempted — ${o.haltedBefore}`
  if (o.found === 0) return 'No approved leads found for this client, so there is nothing to backfill.'
  if (o.pushed === 0) return `⚠️ 0 of ${o.found} pushed — every one was refused. Read the per-lead reasons; this is NOT a successful backfill.`
  if (o.refused > 0) return `${o.pushed} of ${o.found} pushed, ${o.refused} refused — read the reasons for the refused ones.`
  return `All ${o.pushed} approved leads are now in the client's Smartlead campaign.`
}
