import { db } from '@kind/db'
import { bulkMatchEmails } from './apollo'
import { finalVerdict, type IcpCriteria } from './icp-qualification'
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
  /**
   * ⚑ 7 Sep — WHETHER THE HUNTER FALLBACK MAY RUN AT ALL, stated by the caller.
   *
   * Defaults to TRUE, so every existing caller behaves exactly as it does today: the block
   * below is still gated on `HUNTER_API_KEY` and is still a strict no-op without it. What
   * this adds is a caller that can say NO for a reason of its own — the House MVP path, where
   * Hunter is off by founder decision rather than by a Railway variable happening to be unset.
   */
  /**
   * ⚑ 7 Sep — AND THE ICP THE CUSTOMER ACTUALLY DESCRIBED, so the FULL criteria can be
   * enforced HERE, where the revealed facts first exist. The caller holds the saved ICP; a
   * second lookup could disagree with the one the run is using.
   */
  opts?: { hunterAllowed?: boolean; qualifyAgainst?: IcpCriteria },
): Promise<number> {
  const hunterAllowed = opts?.hunterAllowed !== false
  const qualifyAgainst = opts?.qualifyAgainst ?? null
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
    const revealed = await bulkMatchEmails(needEmail.map(r => r.apollo_id as string), 'lead_delivery')

    // ── ⚑ 7 Sep — THE FINAL QUALIFICATION GATE, WHERE THE FACTS FIRST EXIST ─────────────
    //
    // 🛑 THE 250 → 0 RUN IS THE REASON THIS IS HERE AND NOT EARLIER. Apollo's People Search
    // returns neither `email_status` nor `country`, so judging a candidate on them at search
    // time judged `undefined` and rejected everybody. The provider reveal above is the step
    // that turns those unknowns into facts — it is ONE provider action inside M&V's
    // enrichment flow, not the flow itself — and this is the first moment the customer's ICP
    // can actually be tested.
    //
    // ⚠️ UNKNOWN FAILS HERE. We have now asked; a fact still missing is not a fact, and an
    // unproved candidate must never become a usable lead. `finalVerdict` owns that inversion.
    let qualified = 0
    const refusals: Record<string, number> = {}

    for (const r of needEmail) {
      const person = revealed.get(r.apollo_id as string)
      if (!person) continue   // the provider had nothing; the Hunter waterfall below may still

      if (qualifyAgainst) {
        const verdict = finalVerdict(
          { email: person.email, emailStatus: person.email_status, country: person.country },
          qualifyAgainst,
        )
        if (!verdict.ok) {
          // ⚠️ NOT DELIVERED, NOT APPROVED, NOT SENT — and the address is deliberately NOT
          // written. A lead row with no email cannot be delivered by the drip, cannot be
          // approved, and cannot be sent to. The refusal is counted rather than silent,
          // because a silent drop is exactly how 250 became 0 without anybody noticing.
          refusals[verdict.reason] = (refusals[verdict.reason] ?? 0) + 1
          continue
        }
      }

      // apollo_consented: came through Apollo's verified-email filter and we now
      // hold a real work email — mark it as Apollo-sourced contactable.
      // ⚠️ CONTACTABLE, NOT CONSENTED. The flag is a provider-VERIFIED email, treated as a
      // legitimate-interest contact. It is NOT a consent record — naming predates the pivot.
      // Do not build consent logic on it. See @kind/shared `Lead` for the full note.
      //
      // ⚑ The revealed surname is written too: the SEARCH stage returns `last_name_obfuscated`
      // ("La***n"), so this is the first point a real one exists.
      // ⚑ 9 Sep — THE STATUS WE PAID FOR IS STORED. `finalVerdict` needs it and `leads` had
      // nowhere to keep it, so every later pass had to buy the same fact again.
      const patch: Record<string, unknown> = { email: person.email, email_status: person.email_status, apollo_consented: true }
      // ⚠️ IT REPLACES, RATHER THAN FILLING A BLANK. The search stage already wrote a surname
      // — Apollo's OBFUSCATED one ("La***n") — so a `!r.last_name` guard would never fire and
      // the masked value would live on in the lead for ever. The revealed name is the real one.
      if (person.last_name) patch.last_name = person.last_name
      if (person.country) patch.country = person.country
      await db.from('leads').update(patch).eq('id', r.id)
      qualified++
    }

    const refused = Object.entries(refusals).map(([k, v]) => `${k}=${v}`).join(' ')
    console.log(`[lead-delivery] stage=qualification — ${qualified} of ${needEmail.length} revealed candidate(s) passed the full ICP${refused ? ` · refused: ${refused}` : ''}.`)
  }

  // 1b. AUTO HUNTER WATERFALL (item 140): Apollo bulk_match can't reveal an email for
  //     every lead (no apollo_id — e.g. PDL-sourced — or unmatched). Rather than drop
  //     those leads as unemailable, run the existing enrichment waterfall (Hunter et al)
  //     to find a missing email automatically — previously only the manual
  //     POST /leads/:id/waterfall-enrich endpoint ever did this. Gated ENTIRELY on the
  //     Hunter key: with HUNTER_API_KEY unset this is a strict no-op (no calls, no cost,
  //     identical behaviour to before). We re-read the rows so leads filled by the Apollo
  //     reveal above are excluded.
  // ⚠️ NESTED, NOT `&&`-ED, AND DELIBERATELY. `free-proof-route.test.ts` asserts the literal
  // `if (process.env.HUNTER_API_KEY) {` as its proof that the paid path's machinery is
  // untouched. Folding the new condition into that line would have broken a guard that is
  // still telling the truth — the key gate IS unchanged; what is new is a caller able to
  // decline before it. Changing my line was cheaper than retargeting theirs.
  if (hunterAllowed) {
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
