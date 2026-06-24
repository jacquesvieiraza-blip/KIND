// THE ENGINE (item 211) — admin-only diagnostic surface. PHASE 1: read-only.
//
// Mirrors the admin-key gate used by adminRouter (x-admin-key vs ADMIN_SECRET_KEY,
// constant-time). The only route today is a Smartlead connectivity check that performs
// NO sends and returns NO secrets — just derived booleans + counts. This is internal
// tooling (not a client-facing surface), so it ships behind the admin key rather than
// the §11 preview flow; the client-facing engine work (Phases 2-6) is previewed.

import { Router, Request, Response } from 'express'
import crypto from 'crypto'
import { verifySmartlead, smartleadConfigured } from '../lib/smartlead'
import { pdlSearchPeople } from '../lib/pdl-search'
import { waterfallEnrich } from '../lib/enrichment'

export const engineRouter = Router()

function adminKeyValid(provided: unknown): boolean {
  const secret = process.env.ADMIN_SECRET_KEY
  if (!secret) return false
  const a = Buffer.from(String(provided ?? ''))
  const b = Buffer.from(secret)
  if (a.length !== b.length) return false
  return crypto.timingSafeEqual(a, b)
}

// Accept the admin key from the header (curl/programmatic) OR a ?key= query param
// (so it can be opened directly in a browser for a one-off founder check). The query
// form is a convenience for these read-only diagnostics only — no secrets are returned.
engineRouter.use((req: Request, res: Response, next: () => void) => {
  const provided = req.headers['x-admin-key'] ?? req.query.key
  if (!adminKeyValid(provided)) {
    res.status(401).json({ success: false, error: 'Unauthorized' })
    return
  }
  next()
})

// GET /engine/smartlead/verify — Phase-1 proof: key authenticates + API reachable.
engineRouter.get('/smartlead/verify', async (_req: Request, res: Response) => {
  try {
    const result = await verifySmartlead()
    res.status(result.ok ? 200 : 502).json({ success: result.ok, ...result })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'verify failed'
    res.status(500).json({ success: false, configured: smartleadConfigured(), error: msg })
  }
})

// GET /engine/leads/test — READ-ONLY: can we source leads WITHOUT Apollo? (item 243)
// Runs PDL discovery (the only non-Apollo discovery source) for a sample ICP + the
// Hunter/Clearbit enrichment waterfall on one lead, returning the leads and the SOURCE
// LABEL per result. No Apollo touched, no sends, no client exposure. Answers the founder
// question: "are PDL/Hunter leads good enough to run the product without the Apollo
// reseller fee?" Defaults to an African-SMB ICP; override via ?titles=&geo=&size=&industry=.
engineRouter.get('/leads/test', async (req: Request, res: Response) => {
  try {
    const csv = (v: unknown, d: string[]) =>
      typeof v === 'string' && v.trim() ? v.split(',').map((s) => s.trim()).filter(Boolean) : d
    const icp = {
      job_titles:       csv(req.query.titles,    ['Founder', 'CEO', 'Managing Director', 'Owner']),
      seniority_levels: csv(req.query.seniority,  ['C-Suite']),
      company_sizes:    csv(req.query.size,       ['11–50']),
      geographies:      csv(req.query.geo,        ['South Africa']),
      industries:       csv(req.query.industry,   []),
    }

    const pdlConfigured = !!process.env.PDL_API_KEY
    const hunterConfigured = !!process.env.HUNTER_API_KEY
    const leads = pdlConfigured ? await pdlSearchPeople(icp, 1) : []
    const withEmail = leads.filter((l) => l.email && l.email.includes('@')).length

    // Prove the multi-source enrichment + the per-lead source label on one record:
    // blank the email and let the waterfall (PDL/Hunter/Clearbit) recover it.
    let enrichmentWaterfall: { source: string; email?: string } | null = null
    if (leads[0]) {
      const r = await waterfallEnrich({
        first_name:   leads[0].first_name,
        last_name:    leads[0].last_name,
        company:      leads[0].organization_name ?? leads[0].organization?.name ?? null,
        email:        null,
        linkedin_url: leads[0].linkedin_url,
        domain:       null,
      })
      enrichmentWaterfall = { source: r.source, email: r.email }
    }

    res.status(200).json({
      success: true,
      icp,
      sources: { pdl: pdlConfigured, hunter: hunterConfigured },
      pdl: {
        count: leads.length,
        withWorkEmail: withEmail,
        sample: leads.slice(0, 10).map((l) => ({
          name:         `${l.first_name} ${l.last_name}`.trim(),
          title:        l.title,
          company:      l.organization_name ?? l.organization?.name ?? null,
          country:      l.country,
          email:        l.email,
          email_status: l.email_status,
          source:       'pdl',
        })),
      },
      enrichmentWaterfall,
      note: pdlConfigured
        ? 'PDL discovery + Hunter/Clearbit enrichment — Apollo NOT used. Source label shown per lead.'
        : 'PDL_API_KEY not set on this service — PDL discovery is dormant; set the key to test.',
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'leads test failed'
    res.status(500).json({ success: false, error: msg })
  }
})
