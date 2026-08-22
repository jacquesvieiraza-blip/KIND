import { Router, Request, Response } from 'express'
import { db } from '@kind/db'
import { adminKeyValid } from './admin'
import { searchPeople, buildSearchBody } from '../lib/apollo'
import { audienceForClient } from '../lib/provider-boundary'

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
    searchBody.per_page = 50

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
          return pdlSearchPeople({
            job_titles:       icp.job_titles       ?? [],
            seniority_levels: icp.seniority_levels ?? [],
            company_sizes:    icp.company_sizes    ?? [],
            geographies:      icp.geographies      ?? [],
            industries:       icp.industries       ?? [],
          }, 50)
        })()

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
