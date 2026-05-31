import { Router } from 'express'
import { db } from '@kind/db'
import { requireAuth, AuthRequest } from '../middleware/auth'
import { searchPeople, buildSearchBody } from '../lib/apollo'

const router = Router()
router.use(requireAuth)

// GET /lookalike/best-client — find the client with the highest score (meetings * 3 + reply_rate * 100)
router.get('/best-client', async (_req: AuthRequest, res) => {
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
router.post('/generate', async (req: AuthRequest, res) => {
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

    if (!process.env.APOLLO_API_KEY) {
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

    const people = await searchPeople(searchBody)

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
