// THE ENGINE (item 211) — admin-only diagnostic surface. PHASE 1: read-only.
//
// Mirrors the admin-key gate used by adminRouter (x-admin-key vs ADMIN_SECRET_KEY,
// constant-time). The only route today is a Smartlead connectivity check that performs
// NO sends and returns NO secrets — just derived booleans + counts. This is internal
// tooling (not a client-facing surface), so it ships behind the admin key rather than
// the §11 preview flow; the client-facing engine work (Phases 2-6) is previewed.

import { Router, Request, Response } from 'express'
import crypto from 'crypto'
import { db } from '@kind/db'
import { verifySmartlead, smartleadConfigured } from '../lib/smartlead'
import { pdlSearchPeople, pdlSearchDiagnostic } from '../lib/pdl-search'
import { waterfallEnrich, revealTrace } from '../lib/enrichment'
import { providerRetired } from '../lib/retired-providers'

export const engineRouter = Router()

function adminKeyValid(provided: unknown): boolean {
  const secret = process.env.ADMIN_SECRET_KEY
  if (!secret) return false
  const a = Buffer.from(String(provided ?? ''))
  const b = Buffer.from(secret)
  if (a.length !== b.length) return false
  return crypto.timingSafeEqual(a, b)
}

// Admin key via the `x-admin-key` HEADER only. (#309: the old code also accepted a
// `?key=` query param for browser convenience — but morgan logs the full URL, so the
// admin secret leaked into stdout/browser-history/Referer. Header-only closes that;
// use curl with `-H "x-admin-key: …"` for these diagnostics.)
engineRouter.use((req: Request, res: Response, next: () => void) => {
  const provided = req.headers['x-admin-key']
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

    // ⛓️ R143 (23 Sep) / FD-6 — a key does not make PDL a source. `pdl-search` refuses it
    // anyway; this keeps the report from claiming a source that was never asked.
    const pdlConfigured = !!process.env.PDL_API_KEY && !providerRetired('pdl')
    const hunterConfigured = !!process.env.HUNTER_API_KEY
    // Small sample (size 5) keeps the free-tier credit burn low — PDL bills 1 credit/record.
    const leads = pdlConfigured ? await pdlSearchPeople(icp, 5) : []
    const withEmail = leads.filter((l) => typeof l.email === 'string' && l.email.includes('@')).length
    // Surface the REAL PDL outcome (status + error) so a 0 isn't ambiguous (item 244).
    const pdlDiagnostic = await pdlSearchDiagnostic(icp)

    // Prove the multi-source enrichment + the per-lead source label on one record:
    // blank the email and let the waterfall (PDL/Hunter/Clearbit) recover it.
    let enrichmentWaterfall: { source: string; email?: string } | null = null
    let revealDebug: Record<string, unknown> | null = null
    if (leads[0]) {
      const leadProfile = {
        first_name:   leads[0].first_name,
        last_name:    leads[0].last_name,
        company:      leads[0].organization_name ?? leads[0].organization?.name ?? null,
        email:        null,
        linkedin_url: leads[0].linkedin_url,
        domain:       null,
      }
      const r = await waterfallEnrich(leadProfile)
      enrichmentWaterfall = { source: r.source, email: r.email }
      revealDebug = await revealTrace(leadProfile)   // surfaces WHY (domain resolved? Hunter status?)
    }

    res.status(200).json({
      success: true,
      icp,
      sources: { pdl: pdlConfigured, hunter: hunterConfigured },
      pdlDiagnostic,
      revealDebug,
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
        : 'PDL is RETIRED (FD-6 / R143) — PDL discovery is off in code and a key does not re-enable it.',
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'leads test failed'
    res.status(500).json({ success: false, error: msg })
  }
})

// GET /engine/env — prod env-readiness ("verify prod env keys", M1/M2 gate).
// Returns a derived boolean PER critical key — never the value — so a deploy can be
// verified at a glance (open in a browser with ?key=). Centralises the env checks
// that were scattered across routes (calendar/voice/whatsapp/integrations) into the
// one diagnostic surface. Read-only; admin-gated above; no secrets leave the box.
engineRouter.get('/env', async (_req: Request, res: Response) => {
  const has = (k: string) => !!(process.env[k] && String(process.env[k]).trim())
  const groups = {
    core: {
      SUPABASE_URL:              has('SUPABASE_URL'),
      SUPABASE_SERVICE_ROLE_KEY: has('SUPABASE_SERVICE_ROLE_KEY'),
      SUPABASE_ANON_KEY:         has('SUPABASE_ANON_KEY'),
      ADMIN_SECRET_KEY:          has('ADMIN_SECRET_KEY'),
      ANTHROPIC_API_KEY:         has('ANTHROPIC_API_KEY'),
    },
    sending: {                                   // M1 — send our own cold outreach
      RESEND_API_KEY:        has('RESEND_API_KEY'),
      RESEND_WEBHOOK_SECRET: has('RESEND_WEBHOOK_SECRET'),
      FIGSY_COLD_FROM:       has('FIGSY_COLD_FROM'),
      FIGSY_COLD_REPLY_TO:   has('FIGSY_COLD_REPLY_TO'),
      TRACKING_URL:          has('TRACKING_URL'),
      UNSUBSCRIBE_SECRET:    has('UNSUBSCRIBE_SECRET'),
    },
    billing: {                                   // M2 — charge a paying client
      STRIPE_SECRET_KEY:        has('STRIPE_SECRET_KEY'),
      STRIPE_WEBHOOK_SECRET:    has('STRIPE_WEBHOOK_SECRET'),
      // The price IDs checkout actually resolves — without these Stripe checkout
      // 500s even though the secret keys ARE set (the "false green" the 2 Jul audit
      // flagged: ready.billing could read true while a real charge failed). FIGSY-only
      // by design — lead_gen is being retired (#284), so its LEADGEN price IDs are
      // intentionally NOT required here.
      STRIPE_PRICE_FIGSY_20:    has('STRIPE_PRICE_FIGSY_20'),
      STRIPE_PRICE_FIGSY_40:    has('STRIPE_PRICE_FIGSY_40'),
      STRIPE_PRICE_FIGSY_100:   has('STRIPE_PRICE_FIGSY_100'),
      PAYSTACK_SECRET_KEY:      has('PAYSTACK_SECRET_KEY'),
      FLUTTERWAVE_SECRET_KEY:   has('FLUTTERWAVE_SECRET_KEY'),
      FLUTTERWAVE_WEBHOOK_HASH: has('FLUTTERWAVE_WEBHOOK_HASH'),
    },
    leads: {
      APOLLO_API_KEY:  has('APOLLO_API_KEY'),
      PDL_API_KEY:     has('PDL_API_KEY'),
      HUNTER_API_KEY:  has('HUNTER_API_KEY'),
      CLEARBIT_API_KEY: has('CLEARBIT_API_KEY'),
    },
    integrations: {
      GOOGLE_CLIENT_ID:      has('GOOGLE_CLIENT_ID'),
      GOOGLE_CLIENT_SECRET:  has('GOOGLE_CLIENT_SECRET'),
      HUBSPOT_API_KEY:       has('HUBSPOT_API_KEY'),
      VAPI_API_KEY:          has('VAPI_API_KEY'),
      WHATSAPP_TOKEN:        has('WHATSAPP_TOKEN'),
      SMARTLEAD_API_KEY:     has('SMARTLEAD_API_KEY'),
      PHANTOMBUSTER_API_KEY: has('PHANTOMBUSTER_API_KEY'),
      VAPID_PUBLIC_KEY:      has('VAPID_PUBLIC_KEY'),
      VAPID_PRIVATE_KEY:     has('VAPID_PRIVATE_KEY'),
    },
  }
  const allSet = (g: Record<string, boolean>) => Object.values(g).every(Boolean)
  const missing = Object.entries(groups).flatMap(([grp, keys]) =>
    Object.entries(keys).filter(([, v]) => !v).map(([k]) => `${grp}.${k}`))

  // P13 — the anti-#330 guard. Env keys being present says nothing about whether the
  // money RPCs are actually installed in the live DB. A missing function is invisible
  // until a real charge/grant silently 42883-fails. Probe both money RPCs against the
  // all-zeros UUID (a no-op: try_charge_figsy_credit finds no row → false; a 0-amount
  // increment changes nothing) so "is the live DB missing a money function" is
  // answerable with one curl, forever. A function-not-found error (Postgres 42883 /
  // PostgREST PGRST202) = MISSING; any other outcome (clean value, or a data error
  // like a bad-uuid) = the function EXISTS and was reached = installed.
  const probeRpc = async (fn: string, args: Record<string, unknown>): Promise<'installed' | 'MISSING'> => {
    try {
      const { error } = await db.rpc(fn, args)
      if (error && (error.code === '42883' || error.code === 'PGRST202')) return 'MISSING'
      return 'installed'
    } catch {
      return 'installed' // reached the DB and it threw for another reason → the fn exists
    }
  }
  const ZERO_UUID = '00000000-0000-0000-0000-000000000000'
  const [tryChargeStatus, incrementStatus] = await Promise.all([
    probeRpc('try_charge_figsy_credit', { p_client_id: ZERO_UUID }),
    probeRpc('increment_figsy_credits', { p_client_id: ZERO_UUID, p_amount: 0 }),
  ])
  const money_rpcs = {
    try_charge_figsy_credit: tryChargeStatus,
    increment_figsy_credits: incrementStatus,
  }

  res.json({
    success: true,
    ready: {
      core:    allSet(groups.core),
      sending: allSet(groups.sending),   // M1 send-ready
      billing: allSet(groups.billing),   // M2 charge-ready
    },
    missing,
    groups,
    money_rpcs,
    note: 'Booleans only — no secret values are returned. core+sending = M1 ready; +billing = M2 ready. money_rpcs probes the live DB for the FIGSY charge/grant functions (installed | MISSING).',
  })
})
