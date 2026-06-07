import { db } from '@kind/db'
import { bulkMatchEmails } from './apollo'

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

  // 1. Reveal emails for candidates that don't already have one.
  const { data: rows } = await db.from('leads')
    .select('id, email, first_name, last_name, company, linkedin_url')
    .in('id', candidateIds)
    .is('delivered_at', null)

  const needEmail = (rows ?? []).filter(r => !r.email)
  if (needEmail.length > 0) {
    const revealed = await bulkMatchEmails(needEmail.map(r => ({
      id:                r.id,
      first_name:        r.first_name,
      last_name:         r.last_name,
      organization_name: r.company,
      linkedin_url:      r.linkedin_url,
    })))
    for (const [leadId, email] of revealed) {
      // apollo_consented: this lead came through Apollo's verified-email filter and
      // we now hold a real work email — mark it as Apollo-sourced contactable.
      await db.from('leads').update({ email, apollo_consented: true }).eq('id', leadId)
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
    const { error: rpcErr } = await db.rpc('increment_client_credits', { p_client_id: clientId, p_amount: -n })
    if (rpcErr) {
      console.error(`[lead-delivery] credit deduction FAILED for client ${clientId} after delivering ${n} leads:`, rpcErr)
    } else {
      await db.from('credit_transactions').insert({
        client_id: clientId,
        amount:    -n,
        type:      'usage',
        note:      `${n} lead${n === 1 ? '' : 's'} delivered`,
        created_at: now,
      }).then(() => {}, () => {})
    }
  }
  return n
}
