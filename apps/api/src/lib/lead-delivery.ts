import { db } from '@kind/db'
import { bulkMatchEmails } from './apollo'
import { waterfallEnrich } from './enrichment'
import { deliveryCharge, normalizePlan } from './billing-rules'
import { sendFounderAlert } from './alerts'

// Enrich + deliver + charge — the single delivery path for BOTH the on-run
// immediate delivery (icps.ts) and the daily drip (internal.ts).
//
// Apollo's people search returns NO emails, so leads arrive email-less. Before a
// lead is delivered (made visible to the client) and charged, we reveal its email
// via Apollo Bulk Match. A lead we can't get an email for is worthless to the
// client, so it is NOT delivered and NOT charged — it stays pending and can be
// retried on the next run/drip. This keeps Apollo enrichment spend capped to the
// leads actually delivered, and guarantees every delivered lead is contactable.
//
// Delivery is claimed atomically via `.is('delivered_at', null)` on the UPDATE,
// so a concurrent or retried call can never double-deliver or double-charge.
// Returns the number of leads actually delivered + charged.
export async function enrichAndDeliverLeads(
  clientId: string,
  candidateIds: string[],
): Promise<number> {
  if (candidateIds.length === 0) return 0

  // 1. Reveal emails for candidates that don't already have one, by enriching on
  //    the Apollo person id (the search masks names + hides emails, so id is the
  //    only reliable match key). revealed maps apollo_id → email.
  const { data: rows } = await db.from('leads')
    .select('id, email, apollo_id, first_name, last_name, company, linkedin_url')
    .in('id', candidateIds)
    .is('delivered_at', null)

  const needEmail = (rows ?? []).filter(r => !r.email && r.apollo_id)
  if (needEmail.length > 0) {
    const revealed = await bulkMatchEmails(needEmail.map(r => r.apollo_id as string))
    for (const r of needEmail) {
      const email = revealed.get(r.apollo_id as string)
      if (email) {
        // apollo_consented: came through Apollo's verified-email filter and we now
        // hold a real work email — mark it as Apollo-sourced contactable.
        await db.from('leads').update({ email, apollo_consented: true }).eq('id', r.id)
      }
    }
  }

  // 1b. AUTO HUNTER WATERFALL (item 140): Apollo bulk_match can't reveal an email for
  //     every lead (no apollo_id — e.g. PDL-sourced — or unmatched). Rather than drop
  //     those leads as unemailable, run the existing enrichment waterfall (Hunter et al)
  //     to find a missing email automatically — previously only the manual
  //     POST /leads/:id/waterfall-enrich endpoint ever did this. Gated ENTIRELY on the
  //     Hunter key: with HUNTER_API_KEY unset this is a strict no-op (no calls, no cost,
  //     identical behaviour to before). We re-read the rows so leads filled by the Apollo
  //     reveal above are excluded.
  if (process.env.HUNTER_API_KEY) {
    const { data: stillMissing } = await db.from('leads')
      .select('id, email, first_name, last_name, company, linkedin_url')
      .in('id', candidateIds)
      .is('delivered_at', null)
      .is('email', null)
    for (const r of (stillMissing ?? [])) {
      try {
        const enriched = await waterfallEnrich({
          first_name:   r.first_name,
          last_name:    r.last_name,
          company:      r.company,
          linkedin_url: r.linkedin_url,
        })
        if (enriched.email) {
          await db.from('leads').update({ email: enriched.email }).eq('id', r.id)
        }
      } catch (err) {
        console.error('[lead-delivery] hunter waterfall failed for lead', r.id, err)
      }
    }
  }

  // 2. Only leads that now have an email are deliverable — never charge for an
  //    unemailable lead.
  const { data: deliverable } = await db.from('leads')
    .select('id')
    .in('id', candidateIds)
    .is('delivered_at', null)
    .not('email', 'is', null)
  const deliverIds = (deliverable ?? []).map((r: { id: string }) => r.id)
  if (deliverIds.length === 0) {
    // #367 (AR-30) — we HAD candidates but none became deliverable: every email reveal
    // failed (Apollo bulk_match + the Hunter waterfall both dry — quota, key, or outage).
    // Silently returning 0 makes "your first leads in 24h" quietly false. Alert so the
    // founder sees the reveal pipeline is down instead of a mystery zero-delivery.
    const neededEmail = needEmail.length
    if (neededEmail > 0) {
      void sendFounderAlert('source_down', 'Lead reveal is down — candidates found but 0 delivered', [
        `Client: ${clientId}`,
        `${candidateIds.length} candidate lead(s), ${neededEmail} needed an email reveal — but NONE could be emailed.`,
        `Likely Apollo bulk_match + Hunter waterfall both failed (quota / key / outage). No leads delivered, none charged.`,
        `Check HUNTER_API_KEY / Apollo credits.`,
      ])
    }
    return 0
  }

  // 3. Claim atomically, then charge 1 credit per delivered lead.
  const now = new Date().toISOString()
  const { data: claimed } = await db.from('leads')
    .update({ delivered_at: now })
    .in('id', deliverIds)
    .eq('client_id', clientId)
    .is('delivered_at', null)
    .select('id')

  const n = claimed?.length ?? 0
  // Per-qualified-lead model (#420): delivery is FREE and does NOT charge. The
  // lead lands MASKED (revealed_at stays NULL — its email/phone are hidden in the
  // API until the client spends $1 to reveal it, POST /leads/:id/reveal). This
  // lets the client dedup against their own CRM before paying for anything.
  // deliveryCharge() is now always {charge:false}; the guard below documents the
  // invariant and will never fire — kept so a regression to charge-at-delivery
  // shows up loudly here.
  if (n > 0 && deliveryCharge(normalizePlan(null)).charge) {
    throw new Error('[lead-delivery] INVARIANT VIOLATED: delivery must not charge in the per-qualified-lead model (#420)')
  }
  return n
}
