/**
 * Internal Briefs Router
 * GET /internal/briefs/:agent
 *
 * Generates a daily brief for each AI exec agent using Claude Haiku.
 * Protected by the ADMIN_SECRET_KEY header (x-admin-key). Fails CLOSED — if the
 * key is unset the router rejects everything (#324).
 */

import { Router, Request, Response } from 'express'
import crypto from 'crypto'
import Anthropic from '@anthropic-ai/sdk'
import { db } from '@kind/db'
import { fetchDeniseData, deniseSystemPrompt } from '../lib/denise'
import { getClientExclusions } from '../lib/real-clients'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export const internalBriefsRouter = Router()

// ── Admin key middleware ──────────────────────────────────────────────────────
// #324 — fail CLOSED (no key set → reject, never "dev mode" open) and read the key
// ONLY from the x-admin-key header, never from the URL (a ?admin_key= query param
// lands in access logs / Referer — the leak #309 removed elsewhere). Constant-time
// compare, mirroring the internal.ts guard.
function adminKeyValid(provided: unknown): boolean {
  const secret = process.env.ADMIN_SECRET_KEY
  if (!secret) return false
  const a = Buffer.from(String(provided ?? ''))
  const b = Buffer.from(secret)
  if (a.length !== b.length) return false
  return crypto.timingSafeEqual(a, b)
}

function requireAdminKey(req: Request, res: Response, next: () => void) {
  if (!adminKeyValid(req.headers['x-admin-key'])) {
    res.status(401).json({ success: false, error: 'Unauthorized' })
    return
  }
  next()
}

internalBriefsRouter.use(requireAdminKey)

// ── Agent definitions ─────────────────────────────────────────────────────────
type AgentId = 'otto' | 'lena' | 'denise' | 'cmo' | 'cto' | 'cfo'

const AGENT_META: Record<AgentId, { name: string; title: string }> = {
  otto:   { name: 'OTTO',   title: 'Chief Revenue Officer' },
  lena:   { name: 'LENA',   title: 'Chief Customer Success' },
  denise: { name: 'DENISE', title: 'The Closer · Account Executive' },
  cmo:    { name: 'CMO',    title: 'Chief Marketing Officer' },
  cto:   { name: 'CTO',   title: 'Chief Technology Officer' },
  cfo:   { name: 'CFO',   title: 'Chief Financial Officer' },
}

// ── Data fetchers per agent ───────────────────────────────────────────────────

async function fetchOttoData() {
  const now = new Date()
  const weekAgo = new Date(now.getTime() - 7 * 86400000).toISOString()

  const [exclusions, { data: clients }, { data: subs }, { data: newClients }, { data: figsyCampaigns }] = await Promise.all([
    getClientExclusions(),
    db.from('clients').select('id, company_name, created_at'),
    db.from('subscriptions').select('client_id, status, amount_zar, product'),
    db.from('clients').select('id, company_name').gte('created_at', weekAgo),
    db.from('figsy_campaigns').select('client_id, status, reply_count, enrolled_count'),
  ])

  // Revenue-honesty: exclude demo + house (founder testing) from MRR + client counts.
  const isReal = (id: string) => !exclusions.excludedClientIds.has(id)
  const activeSubs = (subs || []).filter(s => s.status === 'active' && isReal(s.client_id))
  const pastDueSubs = (subs || []).filter(s => s.status === 'past_due' && isReal(s.client_id))
  const mrr = activeSubs.reduce((sum, s) => sum + (Number(s.amount_zar) || 0), 0)

  const totalEnrolled = (figsyCampaigns || []).reduce((s, c) => s + (Number(c.enrolled_count) || 0), 0)
  const totalReplies  = (figsyCampaigns || []).reduce((s, c) => s + (Number(c.reply_count) || 0), 0)
  const replyRate = totalEnrolled > 0 ? ((totalReplies / totalEnrolled) * 100).toFixed(1) : '0'

  return {
    total_clients: (clients || []).filter(c => isReal(c.id)).length,
    mrr_usd: mrr,
    new_clients_this_week: (newClients || []).filter(c => isReal(c.id)).length,
    active_subscriptions: activeSubs.length,
    past_due_subscriptions: pastDueSubs.length,
    figsy_reply_rate_pct: replyRate,
    past_due_companies: pastDueSubs.map(s => s.client_id).slice(0, 5),
  }
}

async function fetchLenaData() {
  const now = new Date()
  const ago14 = new Date(now.getTime() - 14 * 86400000).toISOString()

  const [{ data: clients }, { data: recentLeads }, { data: lowBalance }, { data: pausedCampaigns }] = await Promise.all([
    db.from('clients').select('id, company_name, credit_balance, created_at'),
    db.from('leads').select('client_id, created_at').gte('created_at', ago14),
    db.from('clients').select('id, company_name, credit_balance').lt('credit_balance', 20),
    db.from('figsy_campaigns').select('client_id, name, status').eq('status', 'paused'),
  ])

  const clientList = (clients || [])
  const leadsPerClient = new Map<string, number>()
  for (const l of (recentLeads || [])) {
    leadsPerClient.set(l.client_id, (leadsPerClient.get(l.client_id) || 0) + 1)
  }

  const noLeads14d = clientList
    .filter(c => {
      const daysSinceJoined = (now.getTime() - new Date(c.created_at).getTime()) / 86400000
      return daysSinceJoined >= 14 && !leadsPerClient.has(c.id)
    })
    .map(c => c.company_name)
    .slice(0, 10)

  return {
    clients_no_leads_14d: noLeads14d,
    clients_no_leads_14d_count: noLeads14d.length,
    low_credit_clients: (lowBalance || []).map(c => ({ name: c.company_name, balance: c.credit_balance })).slice(0, 10),
    low_credit_count: (lowBalance || []).length,
    auto_paused_campaigns: (pausedCampaigns || []).length,
    paused_campaign_names: (pausedCampaigns || []).map(c => c.name).slice(0, 5),
  }
}

async function fetchCmoData() {
  const now = new Date()
  const weekAgo = new Date(now.getTime() - 7 * 86400000).toISOString()

  const [exclusions, { data: newSignups }, { data: creditPurchases }, { data: icps }] = await Promise.all([
    getClientExclusions(),
    db.from('clients').select('id, company_name, industry, country, created_at').gte('created_at', weekAgo),
    db.from('credit_transactions').select('client_id, amount, created_at').eq('type', 'purchase').gte('created_at', weekAgo),
    db.from('icps').select('client_id, job_titles, industries, locations, created_at'),
  ])

  // Revenue-honesty: purchase count excludes demo + house (founder testing) accounts.
  const realPurchases = (creditPurchases || []).filter(p => !exclusions.excludedClientIds.has(p.client_id))

  // Group industries
  const industryCount: Record<string, number> = {}
  for (const c of (newSignups || [])) {
    if (c.industry) industryCount[c.industry] = (industryCount[c.industry] || 0) + 1
  }
  const topIndustries = Object.entries(industryCount).sort((a, b) => b[1] - a[1]).slice(0, 5)

  // ICP targeting patterns
  const locationCount: Record<string, number> = {}
  for (const icp of (icps || [])) {
    const locs: string[] = Array.isArray(icp.locations) ? icp.locations : []
    for (const loc of locs) locationCount[loc] = (locationCount[loc] || 0) + 1
  }
  const topLocations = Object.entries(locationCount).sort((a, b) => b[1] - a[1]).slice(0, 5)

  return {
    new_signups_this_week: (newSignups || []).length,
    credit_purchases_this_week: realPurchases.length,
    top_industries: topIndustries.map(([name, count]) => ({ name, count })),
    top_icp_locations: topLocations.map(([loc, count]) => ({ loc, count })),
    total_icps: (icps || []).length,
  }
}

async function fetchCtoData() {
  const [{ data: recentLeads }, { data: figsyCampaigns }] = await Promise.all([
    db.from('leads').select('id, created_at').order('created_at', { ascending: false }).limit(100),
    db.from('figsy_campaigns').select('id, status, enrolled_count, reply_count'),
  ])

  const errorsInLast24h = (recentLeads || []).filter(l => {
    return (Date.now() - new Date(l.created_at).getTime()) < 86400000
  }).length

  const activeCampaigns = (figsyCampaigns || []).filter(c => c.status === 'active').length
  const pausedCampaigns = (figsyCampaigns || []).filter(c => c.status === 'paused').length

  return {
    leads_last_24h: errorsInLast24h,
    total_figsy_campaigns: (figsyCampaigns || []).length,
    active_campaigns: activeCampaigns,
    paused_campaigns: pausedCampaigns,
    system_status: 'nominal',
    last_checked: new Date().toISOString(),
  }
}

async function fetchCfoData() {
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  const [exclusions, { data: subs }, { data: creditTxMonth }, { data: leads30d }] = await Promise.all([
    getClientExclusions(),
    db.from('subscriptions').select('client_id, status, amount_zar, product'),
    db.from('credit_transactions').select('client_id, amount, type, created_at').gte('created_at', monthStart),
    db.from('leads').select('id').gte('created_at', new Date(now.getTime() - 30 * 86400000).toISOString()),
  ])

  // Revenue-honesty: exclude demo + house (founder testing) from MRR + credit revenue.
  const isReal = (id: string) => !exclusions.excludedClientIds.has(id)
  const activeSubs = (subs || []).filter(s => s.status === 'active' && isReal(s.client_id))
  const mrr = activeSubs.reduce((sum, s) => sum + (Number(s.amount_zar) || 0), 0)
  const creditRevenue = (creditTxMonth || [])
    .filter(tx => tx.type === 'purchase' && isReal(tx.client_id))
    .reduce((s, tx) => s + (Number(tx.amount) || 0), 0)

  const leadCount = (leads30d || []).length
  const apolloCost = (leadCount * 0.008).toFixed(2)
  // #352 — this was `paystack_fee_estimate_usd`. The ARITHMETIC was fine; the NAME was a
  // lie on a money report. Stripe is the processor, and Stripe's own rate is 2.9% + $0.30,
  // so the fixed leg is now included rather than quietly dropped.
  const processorFees = (mrr * 0.029 + activeSubs.length * 0.30).toFixed(2)

  return {
    mrr_usd: mrr,
    active_subscriptions: activeSubs.length,
    credit_purchases_this_month: creditRevenue,
    leads_last_30d: leadCount,
    apollo_cost_estimate_usd: apolloCost,
    stripe_fee_estimate_usd: processorFees,
    estimated_net_margin_usd: (mrr - Number(apolloCost) - Number(processorFees)).toFixed(2),
  }
}

const DATA_FETCHERS: Record<AgentId, () => Promise<Record<string, unknown>>> = {
  otto:   fetchOttoData,
  lena:   fetchLenaData,
  denise: fetchDeniseData,
  cmo:    fetchCmoData,
  cto:    fetchCtoData,
  cfo:    fetchCfoData,
}

// ── Route ──────────────────────────────────────────────────────────────────────
internalBriefsRouter.get('/:agent', async (req: Request, res: Response) => {
  const agentId = req.params.agent as AgentId
  const agentMeta = AGENT_META[agentId]

  if (!agentMeta) {
    res.status(404).json({ success: false, error: `Unknown agent: ${agentId}` })
    return
  }

  try {
    const dataFetcher = DATA_FETCHERS[agentId]
    const snapshot = await dataFetcher()

    const briefRules = `\nWrite a concise daily brief for the Founder. 3-5 bullet points. Each bullet starts with an emoji.
Plain language. Specific numbers where available. One clear recommended action at the end.
Format: bullet points only, no headers, no markdown beyond bullets.`

    const systemPrompt = agentId === 'denise'
      ? deniseSystemPrompt() + briefRules
      : `You are ${agentMeta.name}, the ${agentMeta.title} for K.I.N.D, an AI-powered B2B lead generation platform serving African SMEs.` + briefRules

    const userPrompt = `Here is today's data:\n${JSON.stringify(snapshot, null, 2)}\n\nWrite the brief.`

    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 512,
      messages: [{ role: 'user', content: userPrompt }],
      system: systemPrompt,
    })

    const brief = message.content
      .filter(b => b.type === 'text')
      .map(b => (b as { type: 'text'; text: string }).text)
      .join('\n')

    res.json({
      success: true,
      data: {
        agent: agentId,
        brief,
        generated_at: new Date().toISOString(),
        data_snapshot: snapshot,
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    res.status(500).json({ success: false, error: message })
  }
})
