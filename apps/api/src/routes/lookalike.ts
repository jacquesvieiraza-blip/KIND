import { Router, Request, Response } from 'express'
import { db } from '@kind/db'
import { adminKeyValid } from './admin'
import { searchPeople, buildSearchBody } from '../lib/apollo'
import { audienceForClient } from '../lib/provider-boundary'
// ⛓️ 17 Sep (FD-6) — `PDL_RATE_USD` is no longer imported here: this route books no PDL cost
// and credits no PDL allowance, so the rate has nothing to multiply. The constant itself
// stays in `sourcing-fences.ts` for the historic ledger it still describes.
import { normalizeRevealEmail } from '../lib/billing-rules'
import { selectPoolCandidates, logPoolCounters, filterProviderContacts, type PoolCandidate } from '../lib/pool-candidates'
import { splitPoolAndRemainder, splitPoolEligible, poolRefusalLine, canonicalPoolCountry } from '../lib/pool-sourcing'

const router = Router()

// #345 (AR-08) — lookalike is an ADMIN-ONLY growth tool (the admin "Clone my best
// client" button): /best-client ranks ALL clients and returns the top one's contact
// name/email, and /generate seeds leads into an ARBITRARY client_id's pipeline. It was
// gated only by requireAuth (any signed-in CLIENT), so a client's own JWT could read a
// rival client's PII and write into any pipeline — a cross-tenant IDOR. Gate on the
// admin key instead (the admin app's proxy already injects x-admin-key on every call).
router.use((req: Request, res: Response, next: () => void) => {
  if (!adminKeyValid(req.headers['x-admin-key'])) {
    res.status(403).json({ error: 'Forbidden — admin only' })
    return
  }
  next()
})

// GET /lookalike/best-client — find the client with the highest score (meetings * 3 + reply_rate * 100)
router.get('/best-client', async (_req: Request, res: Response) => {
  try {
    const { data: clients, error } = await db
      .from('clients')
      .select('id, company_name, contact_name, contact_email')
      .limit(100)

    if (error) throw error
    if (!clients?.length) return res.json({ best_client: null })

    // Get campaign stats per client using figsy_campaigns
    const stats = await Promise.all(
      clients.map(async (c: any) => {
        const { data: campaigns } = await db
          .from('figsy_campaigns')
          .select('meetings_booked, replies_total, emails_sent')
          .eq('client_id', c.id)

        const meetings    = campaigns?.reduce((s: number, x: any) => s + (x.meetings_booked ?? 0), 0) ?? 0
        const replied     = campaigns?.reduce((s: number, x: any) => s + (x.replies_total    ?? 0), 0) ?? 0
        const sent        = campaigns?.reduce((s: number, x: any) => s + (x.emails_sent       ?? 0), 0) ?? 0
        const reply_rate  = sent > 0 ? replied / sent : 0
        const score       = meetings * 3 + reply_rate * 100
        return { ...c, meetings, replied, sent, reply_rate, score }
      })
    )

    const best = stats.sort((a, b) => b.score - a.score)[0]
    return res.json({ best_client: best })
  } catch (err: any) {
    console.error('[lookalike/best-client]', err)
    return res.status(500).json({ error: err.message })
  }
})

// POST /lookalike/generate — given a client_id, find their ICP and search Apollo for 50 lookalikes
router.post('/generate', async (req: Request, res: Response) => {
  try {
    const { client_id } = req.body
    if (!client_id) return res.status(400).json({ error: 'client_id required' })

    // Get client's most recent ICP
    const { data: icp, error: icpErr } = await db
      .from('icps')
      .select('*')
      .eq('client_id', client_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (icpErr) throw icpErr
    if (!icp) return res.status(404).json({ error: 'No ICP found for this client' })

    // ── AR5 BOUNDARY (21 Aug) ────────────────────────────────────────────────────
    // This is an OPERATOR tool, but the leads it writes land in a CLIENT's account —
    // so the audience is the TARGET CLIENT, not the operator running it. A normal
    // client's lookalikes are sourced from PDL (their stack); the house account's from
    // Apollo (ours). Nothing here decides on `APOLLO_API_KEY` being present any more.
    const audience = await audienceForClient(String(client_id))

    if (audience === 'house' && !process.env.APOLLO_API_KEY) {
      return res.status(500).json({ error: 'Apollo not configured' })
    }

    // The route's existing requested record count — unchanged, just named so the AR8
    // fence and the PDL request can both refer to the same number.
    const LOOKALIKE_TARGET = 50

    // ── AR8 — A CLIENT'S PDL SPEND IS PRE-FUNDED, HERE TOO (22 Aug) ──────────────
    //
    // Found by independent review (GPT-5.6). Closing the AR5 boundary re-pointed a
    // normal client's lookalikes from Apollo (free search) to PDL (billed per record
    // RETURNED, $0.28 — `sourcing-fences.ts:6`, verified 10 Jul) — but it did not carry
    // AR8 across. This route had NO fence at all: no `try_spend_sourcing`, no ledger row,
    // no allowance touch. 50 records ≈ $14 of unfenced spend per click.
    //
    // Founder-ruled 22 Aug: the leads land in the CLIENT'S pipeline, so the spend belongs
    // to THAT CLIENT'S existing pre-funded allowance. Same mechanism as `routes/icps.ts`
    // — same RPC, same arguments, same daily/monthly limits, same ledger semantics. No
    // K.I.N.D growth budget, no new money system.
    //
    // ⚠️ HOUSE IS NOT FENCED BY IT. Client Zero's lookalikes come from Apollo — ours,
    // already prepaid — so there is no PDL record to pre-fund (AR5/AR16).
    // ⚑ 12 Sep — defaults to the REMAINDER (House takes no client grant), never the target.
    let grantedSize = 0

    // ── ⚑ POSITIVE ATTRIBUTION APPLIES TO HOUSE TOO ──────────────────────────────────────
    //
    // 🛑 THE `audience !== 'house'` EXEMPTION BELOW IS ABOUT CASH, NOT ATTRIBUTION, and until
    // now it silently covered both. House's lookalikes come from Apollo, already prepaid, so
    // there is no PDL spend to fence (AR5/AR16) — correct. But skipping the RPC also skipped
    // the programme check inside it, and House is Client Zero: the one client the programme
    // was built for was the one client no attribution gate covered.
    //
    // This route holds no ICP, so a lead it creates can never be positively attributed. For a
    // client with an open programme that means it can only manufacture work the send gates
    // will refuse — so it is refused here instead, before any provider call or lead insert.
    // A client with no open programme is untouched: genuine legacy behaviour, unchanged.
    // ⛓️ 3 Sep (C2) — ~~`const openProgramme = await openProgrammeForClient(client_id)`, refusing
    // only `if (openProgramme)`.~~ THAT LEFT THIS ROUTE OPEN TO EXACTLY THE CLIENTS IT WAS
    // WRITTEN FOR.
    //
    // 🛑 House and MBF are DECLARED programme clients with no programme open, so
    // `openProgrammeForClient` returned null and this refusal never fired. Both then fell
    // through: House skips `try_spend_sourcing` entirely (Apollo is prepaid — AR5/AR16), so it
    // reached the provider and inserted 50 unattributed leads with no gate at all; a
    // programme-model CLIENT reached the RPC with `p_programme_id: null`, which grants for a
    // client with no open programme, and spent ~$14 of PDL on leads no programme can ever
    // authorise anyone to contact. This route holds no ICP, so nothing it creates can EVER be
    // positively attributed — which is precisely why the question must be the commercial model
    // and not "is a programme open right now".
    //
    // ⚠️ AND IT IS THE SAME RESOLVER THE REST OF C2 USES, not a second copy of the rule.
    // `mayUseLegacyCommercialPath` is false for a declared programme client (with or without a
    // programme), for an unclassified client who has one open, and for an unreadable model
    // — including the declared-legacy-with-an-open-programme conflict.
    //
    // ⚠️ GENUINE LEGACY IS UNTOUCHED. A client declared `legacy`, and every UNCLASSIFIED client
    // with no open programme — the whole live book — resolves to legacy and proceeds exactly as
    // before, into the AR8 fence below.
    const { clientCommercialModel, mayUseLegacyCommercialPath } = await import('../lib/commercial-model')
    const model = await clientCommercialModel(String(client_id))
    if (!mayUseLegacyCommercialPath(model)) {
      const why = model.model === 'unreadable'
        ? `commercial model unresolved — ${model.reason}`
        : model.openProgramme
          ? `on programme ${model.openProgramme.id.slice(0, 8)}`
          : 'declared programme model with no active programme'
      console.log(`[lookalike] refused for client ${client_id} — ${why}; this route cannot attribute leads to a programme. No sourcing, no provider call, no spend.`)
      return res.json({
        found: 0, inserted: 0, refused: 'programme_attribution',
        message: model.model === 'unreadable'
          ? 'This client’s commercial model could not be resolved, so nothing was sourced and nothing was spent. An operator needs to set it in Vida.'
          : 'This client is on the programme model. Lookalikes cannot be attributed to a programme, so nothing was sourced — source from an ICP attached to the programme instead.',
        icp_used: { industries: icp.industries, titles: icp.job_titles, locations: icp.geographies },
      })
    }

    // ── 🛑 ⚑ 12 Sep — POOL FIRST. THIS ROUTE USED TO BUY WHAT WE ALREADY OWNED ─────────────
    //
    // 🛑 WHAT WAS BROKEN (founder gate, 12 Sep). This route asked Apollo/PDL for fifty records
    // and never once looked at `lead_pool`. Every other sourcing path in the product serves
    // owned inventory first and buys only the shortfall; this one paid full price for
    // identities we already held, and then wrote nothing back, so the next run could buy the
    // same people a third time. Pool First was a convention held inside `runIcpJob`, and a
    // convention only protects the paths somebody remembered to apply it to.
    //
    // ⚠️ SAME CODE, NOT A SECOND ANSWER. `selectPoolCandidates` IS the selection
    // `servePoolLeads` runs — R73 source rights, geography, the client's own held leads, the
    // opt-out blocklist (which is also the hard-bounce fence), the do-not-contact floor,
    // placeholder addresses and the hard ICP fit. Nothing here re-decides any of it.
    //
    // ⚠️ AND IT IS FREE, SO IT IS NOT FUNDED. The `try_spend_sourcing` grant below is now taken
    // for the REMAINDER ONLY. Routing pool rows through it would book $0.28 a head of provider
    // money nobody spent — the exact conflation the sourcing arc removed.
    const pool = await selectPoolCandidates(icp, { cap: LOOKALIKE_TARGET, clientId: String(client_id) })
    logPoolCounters(`lookalike client=${client_id}`, pool.counters, pool.eligible.length)
    const poolServed = pool.eligible.length
    const { pdlRemainder: remainder } = splitPoolAndRemainder(LOOKALIKE_TARGET, poolServed)
    console.log(`[lookalike] pool-first: ${poolServed} of ${LOOKALIKE_TARGET} served from owned inventory at $0; remainder to buy = ${remainder}.`)
    grantedSize = remainder

    // 🛑 A FULL POOL BUYS NOTHING. Not a smaller request — NO provider call at all, no grant,
    // no ledger row. This is clause 7 of the founder's rule made structural: if owned inventory
    // covers the target, no external provider is contacted.
    if (remainder <= 0) {
      const insertedFromPool = await insertLookalikeLeads(String(client_id), icp.id, poolLeadRows(pool.eligible, String(client_id), icp.id))
      return res.json({
        found: poolServed,
        inserted: insertedFromPool,
        from_pool: poolServed,
        from_provider: 0,
        icp_used: { industries: icp.industries, titles: icp.job_titles, locations: icp.geographies },
      })
    }

    if (audience !== 'house') {
      // ── ⛓️ 17 Sep (XC-13 / FD-6) — THE PDL CASH FENCE IS GONE, AND NOTHING REPLACES IT ──
      //
      // ⛓️ WAS: `db.rpc('try_spend_sourcing', { p_client_id, p_requested, p_programme_id: null })`.
      //
      // That reserved PDL records out of `clients.sourcing_allowance` against a monthly PDL
      // DOLLAR ceiling, and wrote a `sourcing_ledger` row at $0.28 a record. Under FD-6 —
      // *"PDL IS NOT A PAID/ACTIVE PROVIDER FOR MVP1. We are not paying for PDL."* — all
      // three are fictions: the records come from K.I.N.D's prepaid Apollo credits, the
      // allowance is denominated in a currency we no longer buy, and the ledger cost is
      // money nobody spends. Keeping it would let a fabricated budget refuse real work.
      //
      // ⚠️ I FIRST REPLACED IT WITH A PROGRAMME RESERVATION, AND THAT WAS DEAD CODE.
      // `mayUseLegacyCommercialPath` above already refuses a PROGRAMME client outright
      // (*"Lookalikes cannot be attributed to a programme"*), so the only client who reaches
      // this line is legacy or unclassified — and has no programme to reserve against. A
      // reservation here could never fire, and dead policy code reads as policy.
      //
      // So this route grants the remainder, mirroring the House path: bounded per run by
      // `LOOKALIKE_TARGET` minus what the pool already served.
      //
      // 🛑 WHAT IS MISSING IS A LIFETIME CEILING, AND IT IS REPORTED, NOT INVENTED. Before
      // FD-6 this client was fenced by their allowance and the monthly dollar cap. Neither
      // bounds anything now. Whether a legacy client may draw on K.I.N.D's Apollo credits
      // with no lifetime limit is a commercial decision, and Batch 1 does not make it.
      console.log(`[lookalike] client ${client_id} (legacy/unclassified) — granting the remainder ${remainder} on Apollo, unreserved: there is no programme to reserve against, mirroring the House path. ⚠️ NO LIFETIME CEILING APPLIES under FD-6 — the PDL allowance and monthly dollar cap that used to fence this client bound nothing.`)
      grantedSize = remainder
    }

    // Use the existing buildSearchBody helper which maps ICP fields correctly.
    const searchBody = buildSearchBody({
      job_titles:            icp.job_titles            ?? [],
      seniority_levels:      icp.seniority_levels      ?? [],
      company_sizes:         icp.company_sizes          ?? [],
      geographies:           icp.geographies            ?? [],
      industries:            icp.industries             ?? [],
      tech_stack:            icp.tech_stack             ?? [],
      keywords:              icp.keywords               ?? [],
      apollo_only_consented: icp.apollo_only_consented ?? false,
      intent_signals:        icp.intent_signals         ?? [],
    }, 1)

    // ── ⛓️ 17 Sep (FD-6) — ONE PROVIDER, SO NO BRANCH ────────────────────────────────
    //
    // WAS: `audience === 'house' ? searchPeople(body) : pdlSearchPeople(fiveTraits, grant)`.
    // That was AR5 exactly, and it carried a disclosed cost: PDL can target only five of the
    // ICP's traits, so `tech_stack`, `keywords` and the consent proxy were dropped for a
    // client and the comment said so — *"result QUALITY may differ between providers; the
    // FEATURE does not"*.
    //
    // FD-6 removes the branch: *"PDL IS NOT A PAID/ACTIVE PROVIDER FOR MVP1."* Both audiences
    // now go through the SAME Apollo body that was already built above, which means the
    // disclosed quality gap is gone too — a client's lookalike is targeted on every trait
    // their ICP states, not on the five one vendor could map.
    //
    // ⚠️ THIS WAS THE LAST `pdlSearchPeople` CALL IN THE PRODUCT. `pdl-search.ts` stays on
    // disk (CORE-MAP rule 3: nothing gets deleted) and is now reachable from nothing, which
    // `one-provider-apollo.test.ts` proves behaviourally with both keys set.
    //
    // ⚠️ AND IT ASKS FOR EXACTLY WHAT WAS GRANTED. `searchBody.per_page = remainder` above
    // sizes the request to what the pool did not already cover; `grantedSize` is what the
    // authority allowed. The smaller of the two is what may be kept, so it is what is asked
    // for — never the target.
    searchBody.per_page = Math.max(1, Math.min(remainder, grantedSize))
    const people = await searchPeople(searchBody)

    // ── 🪦 RECONCILE — REMOVED 17 Sep BY FD-6 (Fable F1's rule had nothing left to correct) ──
    //
    // WAS: refund the unused grant with `add_sourcing_allowance` and book a negative
    // `sourcing_ledger` row at `-(unused * PDL_RATE_USD)`.
    //
    // The rule it implemented is still right — *a thin or empty search must not drain a
    // client's allowance or book ledger cost for money never spent* — and under FD-6 it is
    // satisfied by there being nothing to drain: no allowance is decremented and no ledger
    // row is written, because no PDL record is bought. Crediting the allowance now would be
    // the mirror-image defect: moving a REAL counter to correct an imaginary one, handing a
    // client spendable PDL records for a search that cost K.I.N.D Apollo credits.
    //
    // ⚠️ THE PROGRAMME PATH IS WHERE RECONCILIATION LIVES NOW, and this route never reaches
    // it: `mayUseLegacyCommercialPath` refuses a programme client before any of this. For an
    // ICP-driven run the reservation is released by `settleBatch`, which converts reserved →
    // used from what actually qualified — see `icps.ts`.

    // ── 🛑 ⚑ 12 Sep — THE PROVIDER HALF GOES BEHIND THE SAME PROTECTIONS (founder amendment) ─
    //
    // 🛑 WHY THIS IS NOT OPTIONAL. Pool First alone would have given this route opt-out and
    // do-not-contact protection on its POOLED half and left its PROVIDER half exactly as it
    // was: fifty records inserted straight into a client's pipeline with no blocklist probe,
    // no DNC floor and no placeholder check. Half a guard on a route that writes into a live
    // pipeline is worse than none, because the log then reads as protected.
    //
    // ⚠️ REUSED, NOT REIMPLEMENTED. `filterProviderContacts` asks the same three questions
    // `runIcpJob` asks of its own provider results, in the same order, with the same
    // normalisation (HC-1 — probe with the NORMALISED address, never the provider's raw one).
    const { accepted: safePeople, refused: providerRefused } = await filterProviderContacts(people as any[])
    if (providerRefused.unusable + providerRefused.suppressed + providerRefused.blocked > 0) {
      console.log(`[lookalike] stage=provider_suppression client=${client_id} — refused ${providerRefused.unusable} unmailable · ${providerRefused.suppressed} do-not-contact · ${providerRefused.blocked} opted-out of ${people.length} provider contact(s). They are NOT inserted and NOT pooled.`)
    }

    if (!safePeople.length && poolServed === 0) {
      return res.json({
        found: 0,
        inserted: 0,
        from_pool: 0,
        from_provider: 0,
        icp_used: { industries: icp.industries, titles: icp.job_titles, locations: icp.geographies },
      })
    }

    // Build lead rows — the pool half first, then the bought half.
    const providerLeads = safePeople.map((p: any) => ({
      client_id,
      icp_id:       icp.id,
      first_name:   p.first_name       || 'Unknown',
      last_name:    p.last_name        || '',
      email:        p.email            || null,
      company:      p.organization_name || p.organization?.name || null,
      job_title:    p.title            || null,
      linkedin_url: p.linkedin_url     || null,
      country:      p.country          || null,
      company_size: p.organization?.num_employees ? String(p.organization.num_employees) : null,
      industry:     p.organization?.industry       || null,
      apollo_id:    p.id               || null,
      score:        85, // lookalike = high confidence
      source:       'lookalike',
      status:       'pending',
    }))
    const allLeads = [...poolLeadRows(pool.eligible, String(client_id), icp.id), ...providerLeads]
    const insertedCount = await insertLookalikeLeads(String(client_id), icp.id, allLeads)

    // ── ⚑ 12 Sep — WRITE THE BOUGHT RECORDS BACK, SO WE NEVER BUY THEM TWICE (clause 6) ────
    //
    // 🛑 THIS ROUTE RETAINED NOTHING. Every lookalike record was paid for, inserted for one
    // client, and forgotten — so the same identity could be bought again tomorrow for the next
    // client. That is clause 7 broken by omission rather than by a wrong call.
    //
    // ⚠️ `splitPoolEligible` IS THE TRIPWIRE, NOT A FORMALITY. `lead_pool` is CROSS-CLIENT:
    // whether a record may be reused is provider-specific (F13/F15). Records are tagged with
    // the provider that ACTUALLY ran — Apollo for House, PDL for a client — and anything else
    // is refused rather than quietly pooled.
    //
    // ⚠️ ON CONFLICT DO NOTHING, exactly as the ICP path does it: a record bought once is
    // reused and its cost is never rewritten, and a later weaker row can never clobber a
    // stronger one. The refusal skips the POOL write ONLY — the client keeps every lead.
    const poolSource = audience === 'house' ? 'apollo' : 'pdl'
    const poolUpserts = safePeople
      .map((p: any) => ({
        email_norm:   normalizeRevealEmail(p.email),
        first_name:   p.first_name || null,
        last_name:    p.last_name  || null,
        title:        p.title      || null,
        seniority:    p.seniority  || null,
        company:      p.organization_name || p.organization?.name || null,
        industry:     p.organization?.industry || null,
        company_size: p.organization?.num_employees ? String(p.organization.num_employees) : null,
        country:      canonicalPoolCountry(p.country) || null,
        linkedin_url: p.linkedin_url || null,
        source:       poolSource,
      }))
      .filter(r => Boolean(r.email_norm))
    const { eligible: poolWritable, refused: poolRefusedRows } = splitPoolEligible(poolUpserts)
    if (poolRefusedRows.length > 0) console.error(poolRefusalLine(poolRefusedRows))
    if (poolWritable.length > 0) {
      const { error: poolErr } = await db.from('lead_pool')
        .upsert(poolWritable, { onConflict: 'email_norm', ignoreDuplicates: true })
      if (poolErr) console.error('[lookalike] lead_pool upsert failed (non-fatal — the client keeps every lead):', poolErr)
      else console.log(`[lookalike] stage=pool_write — ${poolWritable.length} record(s) from ${poolSource} retained as reusable inventory.`)
    }

    return res.json({
      found:    poolServed + safePeople.length,
      inserted: insertedCount,
      from_pool: poolServed,
      from_provider: safePeople.length,
      icp_used: {
        industries: icp.industries,
        titles:     icp.job_titles,
        locations:  icp.geographies,
      },
    })
  } catch (err: any) {
    console.error('[lookalike/generate]', err)
    return res.status(500).json({ error: err.message })
  }
})

// ── HELPERS ────────────────────────────────────────────────────────────────────────────
//
// ⚠️ DELIBERATELY BELOW THE ROUTE, NOT ABOVE IT. `commercial-model.test.ts` and
// `house-authority.test.ts` assert that the refusals come BEFORE any provider call and before
// any lead is written, and they read that ordering off the file. Declaring an inserter above
// the handler puts `db.from('leads').insert` at a lower offset than the refusal it must never
// run before — a false red, and one that would be indistinguishable from a real regression.
// Function declarations hoist, so execution is identical.
/**
 * ⚑ 12 Sep — the pool half of a lookalike run, as client leads.
 *
 * Same lead shape the provider half writes, so delivery, scoring and reveal are unchanged.
 * `apollo_id` is null because nobody bought this row on this run — it is inventory we already
 * owned — and `source` stays `'lookalike'` because that is what this route produced. That tag
 * is a LEAD tag, never a pool tag: these rows are already in `lead_pool` and are not written
 * back, so it cannot affect pool eligibility.
 */
function poolLeadRows(rows: PoolCandidate[], clientId: string, icpId: string) {
  return rows.map(c => ({
    client_id:    clientId,
    icp_id:       icpId,
    first_name:   c.first_name || 'Unknown',
    last_name:    c.last_name  || '',
    email:        normalizeRevealEmail(c.email_norm) || null,
    company:      c.company      || null,
    job_title:    c.title        || null,
    linkedin_url: c.linkedin_url || null,
    country:      c.country      || null,
    company_size: c.company_size || null,
    industry:     c.industry     || null,
    apollo_id:    null as string | null,
    score:        85,
    source:       'lookalike',
    status:       'pending',
  }))
}

/**
 * Insert lead rows, skipping any address this client already holds.
 *
 * ⚠️ THE DEDUPE IS UNCHANGED IN KIND AND NARROWED IN NOTHING. It was already here; it is a
 * function now because the pool half and the provider half must both pass through it, and two
 * copies of a dedupe is how one of them silently stops matching.
 */
async function insertLookalikeLeads(clientId: string, _icpId: string, leads: { email: string | null }[]): Promise<number> {
  if (leads.length === 0) return 0
  const emails = leads.map(l => l.email).filter(Boolean) as string[]
  const existing = new Set<string>()
  if (emails.length) {
    const { data } = await db.from('leads').select('email').eq('client_id', clientId).in('email', emails)
    ;(data ?? []).forEach((r: { email?: string | null }) => r.email && existing.add(r.email.toLowerCase()))
  }
  const toInsert = leads.filter(l => !l.email || !existing.has(l.email.toLowerCase()))
  if (toInsert.length === 0) return 0
  const { error } = await db.from('leads').insert(toInsert)
  if (error) throw error
  return toInsert.length
}

export default router
