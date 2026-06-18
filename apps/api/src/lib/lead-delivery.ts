import { db } from '@kind/db'
import { bulkMatchEmails } from './apollo'
import { deliveryCharge, normalizePlan } from './billing-rules'

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
    .select('id, email, apollo_id')
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

  // 2. Only leads that now have an email are deliverable — never charge for an
  //    unemailable lead.
  const { data: deliverable } = await db.from('leads')
    .select('id')
    .in('id', candidateIds)
    .is('delivered_at', null)
    .not('email', 'is', null)
  const deliverIds = (deliverable ?? []).map((r: { id: string }) => r.id)
  if (deliverIds.length === 0) return 0

  // 3. Claim atomically, then charge 1 credit per delivered lead.
  const now = new Date().toISOString()
  const { data: claimed } = await db.from('leads')
    .update({ delivered_at: now })
    .in('id', deliverIds)
    .is('delivered_at', null)
    .select('id')

  const n = claimed?.length ?? 0
  if (n > 0) {
    // Charge the wallet that matches the client's plan — one lead = one charge =
    // one wallet (item 166). FIGSY-plan clients are NOT charged here: their single
    // FIGSY credit is taken at enrollment (figsy.ts), so delivery only makes the
    // lead visible. Lead-gen-plan clients are charged $1/lead from the lead-gen pool.
    const { data: planRow } = await db.from('clients').select('plan').eq('id', clientId).single()

    if (deliveryCharge(normalizePlan(planRow?.plan)).charge) {
      const { error: rpcErr } = await db.rpc('increment_client_credits', { p_client_id: clientId, p_amount: -n })
      if (rpcErr) {
        console.error(`[lead-delivery] credit deduction FAILED for client ${clientId} after delivering ${n} leads:`, rpcErr)
      } else {
        await db.from('credit_transactions').insert({
          client_id: clientId,
          amount:    -n,
          type:      'usage',
          plan:      'lead_gen',
          note:      `${n} lead${n === 1 ? '' : 's'} delivered`,
          created_at: now,
        }).then(() => {}, () => {})
      }
    }
    // plan === 'figsy': no charge at delivery — the single FIGSY credit is taken at enrollment.
  }
  return n
}
