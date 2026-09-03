import { Router, Request, Response } from 'express'
import { db } from '@kind/db'
import { adminKeyValid } from './admin'
import { searchPeople, buildSearchBody } from '../lib/apollo'
import { audienceForClient } from '../lib/provider-boundary'
import { PDL_RATE_USD } from '../lib/sourcing-fences'

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
    let grantedSize = LOOKALIKE_TARGET

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

    if (audience !== 'house') {
      // ── PROGRAMME AUTHORITY (BUILD-002) ─────────────────────────────────────────
      // This route has no ICP in hand, so there is no programme id to pass — and that is
      // exactly why the gate must decide from the database. If this client has an open
      // programme, the RPC returns 0 for a NULL id, so a programme client's lookalike run
      // is REFUSED rather than silently spending outside programme authority. A legacy
      // client is unaffected: no programme, NULL id, legacy behaviour unchanged.
      //
      // ⚠️ THIS IS THE BYPASS THE GATE EXISTS FOR. AR8's history is this very route
      // spending PDL with no fence at all (~$14/click). Trusting each caller to remember a
      // parameter is how that happens again; the database refusing is how it does not.
      const { data: granted } = await db.rpc('try_spend_sourcing', {
        p_client_id: client_id, p_requested: LOOKALIKE_TARGET, p_programme_id: null,
      })
      grantedSize = typeof granted === 'number' ? granted : 0
      if (grantedSize <= 0) {
        // Honest controlled refusal, in the shape this route already returns. Nothing is
        // sourced and nothing is spent — the operator is told why rather than shown an
        // empty result that reads as "this client has no lookalikes".
        console.log(`[lookalike] refused for client ${client_id} — no pre-funded sourcing budget (allowance/ceiling/daily). No PDL spend.`)
        return res.json({
          found: 0, inserted: 0, refused: 'sourcing_allowance',
          message: 'Sourcing paused — add reveal credits (or the monthly data budget has been reached).',
          icp_used: { industries: icp.industries, titles: icp.job_titles, locations: icp.geographies },
        })
      }
    }

    // Use the existing buildSearchBody helper which maps ICP fields correctly
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
    searchBody.per_page = LOOKALIKE_TARGET

    // Provider by audience — never by key presence. For a client this is PDL, using the
    // same ICP traits the Apollo body was built from (industries · sizes · titles ·
    // seniority · geographies), which PDL's own query builder maps natively.
    // ⚠️ Result QUALITY may differ between providers; the FEATURE does not. That is the
    // price of AR5, and it is disclosed rather than hidden.
    const people = audience === 'house'
      ? await searchPeople(searchBody)
      : await (async () => {
          const { pdlSearchPeople } = await import('../lib/pdl-search')
          // PDL's query shape is the five ICP traits it can actually target. `tech_stack`,
          // `keywords` and `apollo_only_consented` are Apollo-only concepts and are not
          // silently pretended at — see the quality note above.
          // Ask for EXACTLY what was granted — never more than we pre-funded.
          return pdlSearchPeople({
            job_titles:       icp.job_titles       ?? [],
            seniority_levels: icp.seniority_levels ?? [],
            company_sizes:    icp.company_sizes    ?? [],
            geographies:      icp.geographies      ?? [],
            industries:       icp.industries       ?? [],
          }, grantedSize)
        })()

    // ── RECONCILE (Fable F1's rule, applied here too) ───────────────────────────
    // PDL bills per record RETURNED, not per record granted. A thin or empty search must
    // not drain the client's allowance or book ledger cost for money never spent. Refund
    // the unused grant (`p_trial: false` — back to spendable allowance without touching
    // the trial counter, so retries stay possible) and book a negative ledger correction.
    //
    // ⚠️ THIS RUNS BEFORE THE EMPTY-RESULT RETURN BELOW, DELIBERATELY. A zero-result run
    // is exactly the case that must refund; reconciling after the early return would
    // silently keep the whole grant for a search that returned nobody.
    if (audience !== 'house') {
      const returnedCount = Math.min(people.length, grantedSize)
      const unusedGrant   = grantedSize - returnedCount
      if (unusedGrant > 0) {
        const { error: refundErr } = await db.rpc('add_sourcing_allowance', {
          p_client_id: client_id, p_records: unusedGrant, p_trial: false,
        })
        if (refundErr) {
          console.error(`[lookalike] sourcing-grant refund FAILED for client ${client_id} (${unusedGrant} records) —`, refundErr)
        } else {
          const { error: ledgerErr } = await db.from('sourcing_ledger').insert({
            client_id, records: -unusedGrant, cost_usd: -(unusedGrant * PDL_RATE_USD),
          })
          if (ledgerErr) console.error('[lookalike] sourcing-ledger correction failed (allowance already refunded):', ledgerErr)
        }
      }
    }

    if (!people.length) {
      return res.json({
        found: 0,
        inserted: 0,
        icp_used: { industries: icp.industries, titles: icp.job_titles, locations: icp.geographies },
      })
    }

    // Build lead rows
    const leads = people.map((p: any) => ({
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

    // Deduplicate against existing leads for this client
    const emails = leads.map((l: any) => l.email).filter(Boolean) as string[]
    let existingSet = new Set<string>()
    if (emails.length) {
      const { data: existing } = await db
        .from('leads')
        .select('email')
        .eq('client_id', client_id)
        .in('email', emails)
      ;(existing ?? []).forEach((r: any) => r.email && existingSet.add(r.email.toLowerCase()))
    }

    const toInsert = leads.filter((l: any) => !l.email || !existingSet.has(l.email.toLowerCase()))

    if (toInsert.length > 0) {
      const { error: insertErr } = await db.from('leads').insert(toInsert)
      if (insertErr) throw insertErr
    }

    return res.json({
      found:    people.length,
      inserted: toInsert.length,
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

export default router
