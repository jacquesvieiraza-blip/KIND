import { Router } from 'express'
import { z } from 'zod'
import Anthropic from '@anthropic-ai/sdk'
import { db } from '@kind/db'
import { requireAuth, AuthRequest } from '../middleware/auth'
import { rateLimit } from '../lib/rate-limit'
import { searchPeopleWithFallback, ApolloCreditsExhaustedError, ApolloRateLimitError } from '../lib/apollo'
import { scoreLeadsForIcp } from '../lib/scoring'
import { sendFirstLeadsReadyEmail, sendConsentEmail } from '../lib/email'
import { suggestIcpFromWebsite } from '../lib/scrape'
import { autoEnrollLead, sendDay1OutreachBatch } from '../lib/figsy'
import { getOrCreateConsentToken, buildConsentUrl } from '../lib/consent'
import { enrichAndDeliverLeads } from '../lib/lead-delivery'
import { deliveryCapBalance, normalizePlan, normalizeRevealEmail } from '../lib/billing-rules'
import { isSuppressed } from '../lib/suppression'
import { sendFounderAlert } from '../lib/alerts'
import { PDL_RATE_USD } from '../lib/sourcing-fences'
import { splitPoolAndRemainder } from '../lib/pool-sourcing'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// #446 — ICP preview cache. /preview-count runs PDL calls (count + samples) that bill
// per record; a client tweaking filters fires one per keystroke-pause. Cache the result
// by a stable hash of the ICP shape for 60 min so repeated identical previews cost $0.
// Bounded map (drop oldest past 500 entries) — a form-fiddling session cannot grow it.
type PreviewResult = { count: number; samples: unknown[]; error: string | null; debug: unknown }
const previewCache = new Map<string, { at: number; result: PreviewResult }>()
const PREVIEW_TTL_MS = 60 * 60 * 1000
function previewCacheGet(key: string): PreviewResult | null {
  const hit = previewCache.get(key)
  if (!hit) return null
  if (Date.now() - hit.at > PREVIEW_TTL_MS) { previewCache.delete(key); return null }
  return hit.result
}
function previewCacheSet(key: string, result: PreviewResult): void {
  if (previewCache.size >= 500) { const oldest = previewCache.keys().next().value; if (oldest) previewCache.delete(oldest) }
  previewCache.set(key, { at: Date.now(), result })
}

export const icpRouter = Router()
icpRouter.use(requireAuth)

// After scoring completes, auto-send consent to leads scored >= 60 that have email + haven't been contacted
async function autoConsentScoredLeads(leadIds: string[], companyName: string, clientId?: string): Promise<void> {
  try {
    const { data: leads } = await db.from('leads')
      .select('id, first_name, email, status, score, consent_token')
      .in('id', leadIds)
      .gte('score', 60)
      .eq('status', 'scored')
      .not('email', 'is', null)

    if (!leads?.length) return

    await Promise.allSettled(
      leads.map(async (lead) => {
        const optOutUrl = buildConsentUrl(lead.id, await getOrCreateConsentToken(lead))
        // #453 — clientId lets sendConsentEmail suppress the send for a demo client.
        await sendConsentEmail(lead.email!, lead.first_name, companyName, optOutUrl, clientId)
        await db.from('leads').update({
          status: 'consent_sent',
          consent_sent_at: new Date().toISOString(),
        }).eq('id', lead.id)
      })
    )
    console.log(`[auto-consent] sent to ${leads.length} scored leads`)
  } catch (err) {
    console.error('[auto-consent] failed:', err)
  }
}

const icpSchema = z.object({
  name:                  z.string().min(1),
  industries:            z.array(z.string()).default([]),
  job_titles:            z.array(z.string()).default([]),
  seniority_levels:      z.array(z.string()).default([]),
  company_sizes:         z.array(z.string()).default([]),
  geographies:           z.array(z.string()).default([]),
  tech_stack:            z.array(z.string()).default([]),
  keywords:              z.array(z.string()).default([]),
  apollo_only_consented: z.boolean().default(true),
})

async function getClientId(userId: string): Promise<string | null> {
  const { data } = await db.from('clients').select('id').eq('user_id', userId).maybeSingle()
  return data?.id ?? null
}

// #445 — global PDL-budget alarm. Reads this month's sourcing spend vs the (admin-
// editable) monthly cap; alerts the founder ONCE per day when spend crosses 80%, and
// again at 100%. Throttled at module level (same pattern as alertSourceDown in
// lib/apollo.ts) so a busy hour can't send a flood. Best-effort; never throws.
let lastBudgetAlertDay = ''
async function maybeAlertPdlBudget(): Promise<void> {
  try {
    const { data: settings } = await db.from('money_settings').select('pdl_monthly_cap_usd').eq('id', 1).maybeSingle()
    const cap = Number(settings?.pdl_monthly_cap_usd ?? 300)
    if (!(cap > 0)) return
    const monthStart = new Date(); monthStart.setUTCDate(1); monthStart.setUTCHours(0, 0, 0, 0)
    const { data: rows } = await db.from('sourcing_ledger')
      .select('cost_usd').gte('created_at', monthStart.toISOString())
    const spent = (rows ?? []).reduce((s, r: { cost_usd?: number | string }) => s + Number(r.cost_usd ?? 0), 0)
    const pct = spent / cap
    if (pct < 0.8) return
    const today = new Date().toISOString().slice(0, 10)
    if (today === lastBudgetAlertDay) return   // one alert/day max
    lastBudgetAlertDay = today
    const atCap = pct >= 1
    void sendFounderAlert('source_down',
      atCap ? 'PDL monthly budget REACHED — sourcing paused platform-wide'
            : 'PDL monthly budget at 80% — sourcing will pause soon', [
      `This month's PDL sourcing spend is $${spent.toFixed(2)} of the $${cap.toFixed(0)} cap (${Math.round(pct * 100)}%).`,
      atCap ? 'Every client ICP run now sources ZERO until the cap is raised or the month resets.'
            : 'At 100% all sourcing pauses until you raise the cap (admin → Money Path) or the month resets.',
      `Rate: $${PDL_RATE_USD}/record. Raise the cap in the admin Money Path page if this is expected volume.`,
    ])
  } catch (err) {
    console.error('[icp] maybeAlertPdlBudget failed (non-fatal):', err)
  }
}

// ── #449p3 — POOL-FIRST SERVE (cross-client reuse) ────────────────────────────
// Before spending a fresh PDL dollar, serve matching records we ALREADY OWN in
// `lead_pool` at $0 marginal cost. Returns the leads it inserted for this client
// (delivered + scored downstream exactly like PDL leads). Fail-SAFE: on any error
// (incl. the lead_pool table not existing yet — PR #448 owns it) it returns 0, so
// the run falls straight through to the existing fenced PDL path unchanged.
//
// It NEVER spends try_spend_sourcing and NEVER books positive sourcing_ledger cost.
// It optionally books a `records: N, cost_usd: 0` ledger row so the daily-volume
// fence (which sums sourcing_ledger.records) counts pool serves too — that means a
// pool serve is subtracted from the PDL remainder's daily room, never adds to spend.
type PoolServeIcp = {
  id:                string
  job_titles?:       string[] | null
  industries?:       string[] | null
  geographies?:      string[] | null
  seniority_levels?: string[] | null
}
async function servePoolLeads(
  icp: PoolServeIcp, clientId: string, cap: number,
): Promise<{ insertedIds: string[]; served: number }> {
  if (cap <= 0) return { insertedIds: [], served: 0 }
  try {
    // PostgREST .or() splits on commas and treats *,(,) specially — strip them so a
    // value can't break the filter (OR-generous, so a coarser term is harmless).
    const clean = (v: string) => v.replace(/[,()*%]/g, ' ').trim()
    const geos   = (icp.geographies      ?? []).map(clean).filter(Boolean)
    const titles = (icp.job_titles       ?? []).map(clean).filter(Boolean)
    const inds   = (icp.industries       ?? []).map(clean).filter(Boolean)
    const sens   = (icp.seniority_levels ?? []).map(clean).filter(Boolean)

    // Structured, OR-generous candidate query (mirrors poolRecordMatchesIcp):
    //   (country ILIKE any geo) AND (title ILIKE any | industry ILIKE any | seniority ILIKE any)
    // Chained .or() calls are ANDed; terms inside one .or() are ORed. `*` is the
    // PostgREST ILIKE wildcard (→ SQL %). Empty filters are simply not applied.
    let q = db.from('lead_pool').select('*')
    if (geos.length) q = q.or(geos.map(g => `country.ilike.*${g}*`).join(','))
    const roleOr = [
      ...titles.map(t => `title.ilike.*${t}*`),
      ...inds.map(i => `industry.ilike.*${i}*`),
      ...sens.map(s => `seniority.ilike.*${s}*`),
    ]
    if (roleOr.length) q = q.or(roleOr.join(','))

    // Pull a candidate buffer (we still dedup / blocklist / suppress below), then
    // cap the actual serve at `cap`. Empty pool → [] → served 0 → identical to today.
    const { data: candidates, error } = await q.limit(Math.max(cap * 5, 50))
    if (error) { console.error('[icp] lead_pool query failed (non-fatal, falling through to PDL):', error); return { insertedIds: [], served: 0 } }
    if (!candidates || candidates.length === 0) return { insertedIds: [], served: 0 }

    const norm = (e: string | null | undefined) => normalizeRevealEmail(e)
    const candEmails = candidates
      .map((c: { email_norm?: string | null }) => c.email_norm)
      .filter((e): e is string => !!e)
    if (candEmails.length === 0) return { insertedIds: [], served: 0 }

    // Anti-dup — exclude any email this client already has in leads (normalise both
    // sides; leads.email is stored raw). Bounded: only this client's leads.
    const { data: ownedRows } = await db.from('leads')
      .select('email').eq('client_id', clientId).not('email', 'is', null)
    const owned = new Set((ownedRows ?? []).map(r => norm(r.email)).filter(Boolean) as string[])

    // Blocklist — never serve an opted-out email (unless they opted back in).
    const { data: blockedRows } = await db.from('opt_out_blocklist')
      .select('email').is('opted_back_in_at', null).in('email', candEmails)
    const blocked = new Set((blockedRows ?? []).map(r => norm(r.email)).filter(Boolean) as string[])

    type Cand = {
      email_norm: string; first_name?: string | null; last_name?: string | null
      title?: string | null; seniority?: string | null; company?: string | null
      industry?: string | null; company_size?: string | null; country?: string | null
      linkedin_url?: string | null
    }
    const eligible = (candidates as Cand[]).filter(c => {
      const e = norm(c.email_norm)
      if (!e) return false
      if (owned.has(e)) return false
      if (blocked.has(e)) return false
      // DO-NOT-CONTACT floor (founder's employer) — same guard as the PDL path.
      if (isSuppressed({ email: e, company: c.company, linkedin: c.linkedin_url })) return false
      return true
    }).slice(0, cap)

    if (eligible.length === 0) return { insertedIds: [], served: 0 }

    // Insert the pool matches as THIS client's leads — same shape the PDL path sets,
    // so delivery/reveal/scoring is unchanged. $0 marginal: no allowance, no positive
    // ledger cost. Pool emails are PDL-verified-equivalent → apollo_consented true.
    const rows = eligible.map(c => ({
      client_id:        clientId,
      icp_id:           icp.id,
      first_name:       c.first_name || '',
      last_name:        c.last_name  || '',
      email:            norm(c.email_norm),
      job_title:        c.title        || null,
      company:          c.company      || null,
      linkedin_url:     c.linkedin_url || null,
      country:          c.country      || null,
      industry:         c.industry     || null,
      company_size:     c.company_size || null,
      seniority:        c.seniority    || null,
      tech_stack:       [] as string[],
      apollo_id:        null,
      apollo_consented: true,
      status:           'pending',
      delivered_at:     null,
    }))
    const { data: insertedRows, error: insErr } = await db.from('leads').insert(rows).select('id')
    if (insErr || !insertedRows) { console.error('[icp] pool-serve insert failed (non-fatal):', insErr); return { insertedIds: [], served: 0 } }

    const insertedIds = insertedRows.map(r => r.id)
    // Book a ZERO-COST ledger row so the daily-volume fence sees these records too
    // (records counted, cost_usd 0 → no monthly-budget or allowance impact).
    if (insertedIds.length > 0) {
      const { error: ledgerErr } = await db.from('sourcing_ledger').insert({
        client_id: clientId, records: insertedIds.length, cost_usd: 0,
      })
      if (ledgerErr) console.error('[icp] pool-serve ledger row failed (non-fatal):', ledgerErr)
    }
    console.log(`[icp] pool-first serve: ${insertedIds.length} leads served at $0 for client ${clientId} (cap ${cap})`)
    return { insertedIds, served: insertedIds.length }
  } catch (err) {
    console.error('[icp] servePoolLeads failed (non-fatal, falling through to PDL):', err)
    return { insertedIds: [], served: 0 }
  }
}

export async function runIcpJob(
  icpId: string,
  clientId: string,
  userId: string,
  maxLeads?: number,
): Promise<{ inserted: number; skipped: number; relaxed: string | null }> {
  const { data: icp, error: icpErr } = await db
    .from('icps').select('*').eq('id', icpId).eq('client_id', clientId).single()
  if (icpErr || !icp) throw new Error('ICP not found')

  // Respect client's leads_per_run setting — cap at whichever is lower: credit balance or per-run limit
  const { data: clientSettings } = await db.from('clients')
    .select('leads_per_run, is_demo').eq('id', clientId).single()
  const leadsPerRun = clientSettings?.leads_per_run ?? 20
  const effectiveCap = maxLeads !== undefined ? Math.min(maxLeads, leadsPerRun) : leadsPerRun
  // #453 — DEMO MODE: sourcing is POOL-ONLY at $0. servePoolLeads runs as normal, but
  // the entire PDL remainder (spend, search, ledger, allowance) is skipped for demo.
  const isDemo = clientSettings?.is_demo === true

  let inserted = 0
  let skipped  = 0
  let relaxed: string | null = null
  const insertedIds: string[] = []

  // ── #449p3 PIECE 2 — POOL-FIRST SERVE. Serve matching records we already own at
  // $0 BEFORE spending any PDL budget. Empty pool (fresh DB) → served 0 → every line
  // below runs exactly as it did pre-pool. Pool leads are inserted here and flow into
  // the same delivery/scoring/consent as PDL leads.
  const pool = await servePoolLeads(icp, clientId, effectiveCap)
  inserted += pool.served
  insertedIds.push(...pool.insertedIds)

  // Only the REMAINDER (target − pool-served) goes to the fenced PDL path. When the
  // pool served nothing, pdlRemainder === effectiveCap — byte-identical to today.
  const { pdlRemainder } = splitPoolAndRemainder(effectiveCap, pool.served)

  if (isDemo) {
    // #453 — DEMO: pool-only. Skip the ENTIRE PDL remainder — no try_spend_sourcing, no
    // searchPeopleWithFallback, no ledger rows beyond the pool's $0 row, no allowance
    // touch. A demo run costs us exactly $0.
    relaxed = 'Demo run — leads served from the shared pool at no cost.'
    console.log(`[icp] demo run for client ${clientId} — ${pool.served} pool leads served at $0, PDL skipped.`)
  } else if (pdlRemainder > 0) {
    // #445 — THE SOURCING FENCE. PDL is spent HERE, before any client charge, so we
    // must not pull a single record we haven't pre-funded. try_spend_sourcing atomically
    // decrements the client's sourcing allowance (2×collected, or trial pool) against
    // the global monthly ceiling and the daily cap, returning the GRANTED batch size.
    // We then ask PDL for EXACTLY that many (kills the old buy-50-keep-20 waste). granted
    // 0 = the client is out of pre-funded budget → source nothing, log honestly, no PDL spend.
    const { data: granted } = await db.rpc('try_spend_sourcing', {
      p_client_id: clientId, p_requested: pdlRemainder,
    })
    const grantedSize = typeof granted === 'number' ? granted : 0
    if (grantedSize <= 0) {
      // (Fable F3) the alarm must also run on the REFUSED path — at 100% of the global
      // cap every grant is 0, so this is the only path that can raise "budget REACHED".
      void maybeAlertPdlBudget()
      if (pool.served === 0) {
        // Nothing from the pool AND no PDL budget → identical to the pre-pool refusal.
        console.log(`[icp] sourcing refused for client ${clientId} — no pre-funded budget (allowance/ceiling/daily). No PDL spend.`)
        await db.from('icps').update({ last_run_at: new Date().toISOString() }).eq('id', icp.id)
        return { inserted: 0, skipped: 0, relaxed: 'Sourcing paused — add reveal credits (or the monthly data budget has been reached).' }
      }
      // Pool already served leads — deliver those; just skip the PDL top-up.
      console.log(`[icp] PDL top-up refused for client ${clientId} (no budget) — delivering ${pool.served} pool-served leads only.`)
    } else {
      void maybeAlertPdlBudget()

      const { contacts, relaxed: pdlRelaxed } = await searchPeopleWithFallback(icp, 1, grantedSize)
      relaxed = pdlRelaxed

      // (Fable F1) RECONCILE — PDL bills per record RETURNED, not per record granted. A
      // thin/empty search (404, narrow ICP) must not drain the client's allowance or book
      // ledger cost for money never spent — a trial with a too-narrow ICP would otherwise
      // burn its whole 20-record lifetime pool on zero leads, permanently. Refund the
      // unused grant (p_trial=false: it goes back to spendable allowance WITHOUT touching
      // the trial-granted counter, so retries stay possible) and book a negative ledger
      // correction so the monthly/daily sums reflect real spend.
      const returnedCount = Math.min(contacts.length, grantedSize)
      const unusedGrant = grantedSize - returnedCount
      if (unusedGrant > 0) {
        const { error: refundErr } = await db.rpc('add_sourcing_allowance', {
          p_client_id: clientId, p_records: unusedGrant, p_trial: false,
        })
        if (refundErr) {
          console.error(`[icp] sourcing-grant refund FAILED for client ${clientId} (${unusedGrant} records) —`, refundErr)
        } else {
          const { error: ledgerErr } = await db.from('sourcing_ledger').insert({
            client_id: clientId, records: -unusedGrant, cost_usd: -(unusedGrant * PDL_RATE_USD),
          })
          if (ledgerErr) console.error('[icp] sourcing-ledger correction failed (allowance already refunded):', ledgerErr)
        }
      }

      // #449p3 PIECE 1 — every fresh PDL record we keep also becomes reusable pool
      // inventory (upsert keyed by normalised email, ON CONFLICT DO NOTHING so the
      // earliest acquisition wins and we never overwrite acquisition_cost).
      const poolUpserts: Array<Record<string, unknown>> = []
      let pdlKept = 0

      for (const contact of contacts) {
        // Cap PDL insertions at the GRANTED budget (#445) — never keep more than we
        // pre-funded. grantedSize ≤ pdlRemainder ≤ effectiveCap, so this binds. (Counts
        // only PDL keeps, NOT pool serves, so the pool never eats the PDL budget.)
        if (pdlKept >= grantedSize) {
          skipped++
          continue
        }

        // DO-NOT-CONTACT: never even source anyone connected to the founder's employer.
        if (isSuppressed({ email: contact.email, company: contact.organization?.name ?? contact.organization_name, linkedin: contact.linkedin_url })) {
          skipped++; continue
        }

        if (contact.email) {
          const { data: blocked } = await db.from('opt_out_blocklist')
            .select('id').eq('email', contact.email).is('opted_back_in_at', null).maybeSingle()
          if (blocked) { skipped++; continue }
        }

        if (contact.id) {
          const { data: existing } = await db.from('leads')
            .select('id').eq('client_id', clientId).eq('apollo_id', contact.id).maybeSingle()
          if (existing) { skipped++; continue }
        }

        const { data: newLead, error: insertErr } = await db.from('leads').insert({
          client_id:        clientId,
          icp_id:           icp.id,
          first_name:       contact.first_name || '',
          last_name:        contact.last_name  || '',
          email:            contact.email      || null,
          job_title:        contact.title      || null,
          company:          contact.organization?.name ?? contact.organization_name ?? null,
          linkedin_url:     contact.linkedin_url || null,
          country:          contact.country    || null,
          industry:         contact.organization?.industry || null,
          company_size:     contact.organization?.num_employees
                              ? String(contact.organization.num_employees) : null,
          seniority:        contact.seniority  || null,
          tech_stack:       contact.organization?.technology_names ?? [],
          apollo_id:        contact.id,
          apollo_consented: contact.email_status === 'verified' ||
                            contact.email_status === 'likely_to_engage',
          status:           'pending',
          delivered_at:     null,   // drip gate — daily cron delivers up to daily_drip_rate per day
        }).select('id').single()

        if (insertErr || !newLead) {
          skipped++
        } else {
          pdlKept++
          inserted++
          insertedIds.push(newLead.id)
          const en = normalizeRevealEmail(contact.email)
          if (en) poolUpserts.push({
            email_norm:       en,
            first_name:       contact.first_name || null,
            last_name:        contact.last_name  || null,
            title:            contact.title      || null,
            seniority:        contact.seniority  || null,
            company:          contact.organization?.name ?? contact.organization_name ?? null,
            industry:         contact.organization?.industry ?? null,
            company_size:     contact.organization?.num_employees
                                ? String(contact.organization.num_employees) : null,
            country:          contact.country    || null,
            linkedin_url:     contact.linkedin_url || null,
            source:           'pdl',
            acquisition_cost: PDL_RATE_USD,
            sourced_at:       new Date().toISOString(),
          })
        }
      }

      // Batch the pool upserts (one statement). ignoreDuplicates → ON CONFLICT DO
      // NOTHING: a record bought once for any client is reused, cost never rewritten.
      if (poolUpserts.length > 0) {
        const { error: poolErr } = await db.from('lead_pool')
          .upsert(poolUpserts, { onConflict: 'email_norm', ignoreDuplicates: true })
        if (poolErr) console.error('[icp] lead_pool upsert failed (non-fatal):', poolErr)
      }
    }
  }

  await db.from('icps').update({ last_run_at: new Date().toISOString() }).eq('id', icp.id)

  // Deliver freshly-inserted leads IMMEDIATELY so the client sees them the moment
  // the run finishes — never an empty dashboard (client-facing views gate on
  // delivered_at). enrichAndDeliverLeads reveals each lead's email (Apollo search
  // returns none), then delivers + charges only the emailable ones, capped at the
  // current balance. Any remainder stays undelivered for the daily drip. The
  // atomic `.is('delivered_at', null)` claim inside keeps it idempotent (no
  // double-charge with the drip).
  if (insertedIds.length > 0) {
    // Cap delivery by the wallet that matches the client's plan (item 167) — a
    // FIGSY-plan client delivers against the FIGSY pool, not the lead-gen balance,
    // so a FIGSY-only client (0 lead-gen credits) can still receive leads.
    const { data: balRow } = await db.from('clients')
      .select('plan, credit_balance, figsy_credits_remaining').eq('id', clientId).single()
    const cap = deliveryCapBalance(normalizePlan(balRow?.plan), balRow?.credit_balance, balRow?.figsy_credits_remaining)
    const deliverNow = insertedIds.slice(0, cap)
    await enrichAndDeliverLeads(clientId, deliverNow)
  }

  if (inserted > 0) {
    const { data: clientRow } = await db.from('clients')
      .select('id, company_name, referred_by, first_icp_run_at, credit_balance')
      .eq('id', clientId).single()

    // #356 (AR-18) — consent emails are OUTBOUND cold contact to real prospects, so they
    // must obey the same kill-switch as outreach. Previously they sent unconditionally
    // (outside the AUTO_OUTREACH_ENABLED gate below), so a "safe test" ICP run still
    // cold-emailed real execs a consent request. Gate the consent send on the switch.
    scoreLeadsForIcp(insertedIds, icp, clientRow?.company_name ?? '')
      .then(() => {
        if (process.env.AUTO_OUTREACH_ENABLED === 'true') {
          return autoConsentScoredLeads(insertedIds, clientRow?.company_name ?? '', clientId)
        }
        console.log(`[icp] auto-consent SKIPPED (AUTO_OUTREACH_ENABLED != true) — ${insertedIds.length} leads scored, no consent emails sent`)
        return undefined
      })
      .catch(console.error)

    // S5 — FIGSY auto-start: enroll all scored leads (POPIA legitimate interest — no consent gate needed)
    // If client has no active FIGSY campaign, send Lead Gen Pro Day 1 outreach instead.
    // GATED: auto-outreach sends REAL emails to sourced prospects on every run. It only
    // fires when AUTO_OUTREACH_ENABLED=true, so test runs source + score + enrich leads
    // without emailing real people. Set AUTO_OUTREACH_ENABLED=true on the API service to
    // turn it on for launch.
    if (process.env.AUTO_OUTREACH_ENABLED === 'true') {
      const { data: figsyCampaign } = await db.from('figsy_campaigns')
        .select('id').eq('client_id', clientId).eq('status', 'active').maybeSingle()

      if (figsyCampaign) {
        for (const leadId of insertedIds) {
          autoEnrollLead(leadId, clientId).catch(console.error)
        }
      } else {
        sendDay1OutreachBatch(insertedIds, clientId, clientRow?.company_name ?? '').catch(console.error)
      }
    } else {
      console.log(`[icp] auto-outreach OFF (AUTO_OUTREACH_ENABLED != true) — ${insertedIds.length} leads sourced + enriched, no emails sent`)
    }

    if (clientRow && !clientRow.first_icp_run_at) {
      const now = new Date().toISOString()
      // #371 (AR-34) — atomic conditional grant: claims first_icp_run_at + adds 100 in
      // ONE statement (no double-grant on concurrent runs, no clobber of a concurrent
      // purchase). Write the ledger row only when THIS call actually granted.
      const { data: granted } = await db.rpc('grant_first_run_credits', {
        p_client_id: clientId, p_amount: 100, p_max_balance: 2147483647, p_claim_first_run: true,
      })
      if (granted) await db.from('credit_transactions').insert({
        client_id: clientId,
        amount: 100,
        type: 'referral_bonus',
        note: 'Welcome bonus — first ICP run',
        created_at: now,
      })

      // NOTE (#336): the REFERRER bonus used to fire here on the referred
      // client's first ICP run — but a first run is FREE, so a referrer could
      // farm +100 per fake signup, and the grant landed in the retired
      // credit_balance wallet. It now fires on the referred client's first
      // PURCHASE (see stripe.ts webhook), paid in spendable FIGSY credits.

      try {
        const { data: { user } } = await db.auth.admin.getUserById(userId)
        const userEmail = user?.email ?? ''
        if (userEmail) {
          // D4 — include top 5 scored leads inline in the email
          const { data: topLeads } = await db.from('leads')
            .select('id, first_name, last_name, job_title, company, score, linkedin_url')
            .in('id', insertedIds)
            .not('score', 'is', null)
            .order('score', { ascending: false })
            .limit(5)
          await sendFirstLeadsReadyEmail(userEmail, clientRow.company_name ?? '', inserted, topLeads ?? [])
        }
      } catch (emailErr) {
        console.error('[icps] first-leads email failed:', emailErr)
      }
    }
  }

  return { inserted, skipped, relaxed }
}

// Preview count — returns total matching leads + 3 sample contacts for an ICP config without saving
icpRouter.post('/preview-count', async (req: AuthRequest, res) => {
  try {
    const { previewCount, buildSearchBody, searchPeople } = await import('../lib/apollo')
    const body = req.body as {
      job_titles?: string[]
      seniority_levels?: string[]
      company_sizes?: string[]
      geographies?: string[]
      industries?: string[]
      tech_stack?: string[]
      keywords?: string[]
      apollo_only_consented?: boolean
      intent_signals?: string[]
      organization_names?: string[]
    }
    const icpArg = {
      job_titles:            body.job_titles ?? [],
      seniority_levels:      body.seniority_levels ?? [],
      company_sizes:         body.company_sizes ?? [],
      geographies:           body.geographies ?? [],
      industries:            body.industries ?? [],
      tech_stack:            body.tech_stack ?? [],
      keywords:              body.keywords ?? [],
      apollo_only_consented: body.apollo_only_consented ?? true,
      intent_signals:        body.intent_signals ?? [],
      organization_names:    body.organization_names ?? [],
    }

    // #446 — serve an identical recent preview from cache (no paid PDL call).
    const cacheKey = JSON.stringify(icpArg)
    const cached = previewCacheGet(cacheKey)
    if (cached) { res.json({ success: true, data: cached }); return }

    // Run count + sample contacts in parallel (per_page:1 for count, per_page:3 for samples)
    const [countResult, sampleResult] = await Promise.all([
      previewCount(icpArg),
      (async (): Promise<{ samples: unknown[]; sampleError: string | null }> => {
        try {
          const searchBody = buildSearchBody(icpArg, 1)
          searchBody.per_page = 3
          let contacts = await searchPeople(searchBody).catch(() => [])
          if (contacts.length === 0) {
            // #243: fall back to PDL so preview samples work Apollo-free (PDL_API_KEY set)
            const { pdlSearchPeople } = await import('../lib/pdl-search')
            contacts = await pdlSearchPeople(icpArg, 1, 3)
          }
          return {
            samples: contacts.slice(0, 3).map(c => ({
              first_name:   c.first_name,
              last_name:    c.last_name,
              title:        c.title,
              company:      c.organization_name ?? c.organization?.name ?? null,
              linkedin_url: c.linkedin_url,
            })),
            sampleError: null,
          }
        } catch (e) {
          return { samples: [], sampleError: e instanceof Error ? e.message : 'sample fetch failed' }
        }
      })(),
    ])

    const result: PreviewResult = {
      count:   countResult.count,
      samples: sampleResult.samples,
      // Diagnostics — surfaced so a silent 0 (bad key, 401, throttle, response-shape
      // drift) is visible instead of masquerading as "no matches".
      error:   countResult.error ?? sampleResult.sampleError ?? null,
      debug:   countResult.debug,
    }
    // Only cache clean results — never cache an errored preview (would pin a transient
    // 401/throttle for an hour).
    if (!result.error) previewCacheSet(cacheKey, result)
    res.json({ success: true, data: result })
  } catch (err) {
    res.json({ success: true, data: { count: 0, samples: [], error: err instanceof Error ? err.message : 'preview failed', debug: null } })
  }
})

icpRouter.get('/', async (req: AuthRequest, res) => {
  try {
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }
    const { data, error } = await db.from('icps').select('*').eq('client_id', clientId).order('created_at', { ascending: false })
    if (error) throw error
    res.json({ success: true, data })
  } catch (err) { console.error(err); res.status(500).json({ success: false, error: 'Failed to fetch ICPs' }) }
})

icpRouter.post('/prefill', async (req: AuthRequest, res) => {
  try {
    const { website_url } = z.object({ website_url: z.string().url() }).parse(req.body)
    const suggestions = await suggestIcpFromWebsite(website_url)
    res.json({ success: true, data: suggestions })
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ success: false, error: err.errors }); return }
    console.error('[icps/prefill]', err)
    res.status(422).json({ success: false, error: err instanceof Error ? err.message : 'Failed to analyse website' })
  }
})

// ── CHAT BUILD — conversational ICP builder (must be before /:id routes) ─────
icpRouter.post('/chat-build', async (req: AuthRequest, res) => {
  try {
    const { message, history = [] } = z.object({
      message: z.string().min(1).max(1000),
      history: z.array(z.object({ role: z.enum(['user','assistant']), content: z.string() })).max(20).default([]),
    }).parse(req.body)

    const system = `You are an ICP (Ideal Customer Profile) builder assistant for K.I.N.D, a B2B lead generation platform.
Your job is to have a short conversation with the user to understand who they want to target, then extract structured ICP data.

Based on the conversation, return a JSON object with:
- "message": your conversational reply (plain text, friendly, max 2 sentences)
- "name": suggested ICP name (e.g. "SA SaaS CTOs") — only if confident
- "industries": array of industries from: Fintech, Healthtech, E-commerce, SaaS, Logistics, Agriculture, Education, Manufacturing, Real Estate, Media, Consulting, Retail, Banking, Insurance, Telecoms, Energy
- "job_titles": array of job titles (e.g. ["CTO", "Head of Sales"])
- "seniority_levels": array from: C-Suite, VP / Director, Head of, Manager, Senior, Individual Contributor
- "company_sizes": array from: 1–10, 11–50, 51–200, 201–500, 501–1,000, 1,000+
- "geographies": array of countries or regions
- "tech_stack": array of tools they likely use
- "keywords": array of intent signals (e.g. "hiring", "Series A", "expansion")

Only include fields you're confident about. Leave arrays empty [] if not enough info yet.
Always respond with valid JSON only — no markdown, no explanation outside the JSON.`

    const messages = [
      ...history,
      { role: 'user' as const, content: message },
    ]

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 600,
      system,
      messages,
    })

    const raw = (response.content[0] as { type: string; text: string }).text.trim()
    let parsed: Record<string, unknown>
    try {
      parsed = JSON.parse(raw.replace(/^```json\n?/, '').replace(/\n?```$/, ''))
    } catch {
      parsed = { message: "Tell me more about who you want to target — industry, job title, company size, location?" }
    }

    res.json({ success: true, data: parsed })
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ success: false, error: err.errors }); return }
    console.error('[icps/chat-build]', err)
    res.status(500).json({ success: false, error: 'Failed to process message' })
  }
})

// ── BUILDER CHAT — conversational ICP builder for the /leads/icp/builder page ──
// Contract: { messages:[{role,content}] } -> { type:'question'|'complete', content?, icp?, summary? }
// (The builder page previously POSTed to a non-existent route and 404'd on every turn.)
icpRouter.post('/builder/chat', async (req: AuthRequest, res) => {
  try {
    const { messages } = z.object({
      messages: z.array(z.object({ role: z.enum(['user', 'assistant']), content: z.string() })).min(1).max(40),
    }).parse(req.body)

    const system = `You are Milla, an ICP (Ideal Customer Profile) builder for K.I.N.D, a B2B lead-gen platform.
Have a short, friendly conversation to learn who the user wants to target, then produce a structured ICP.

Respond with ONLY valid JSON (no markdown):
- If you still need more info: {"type":"question","content":"<your friendly reply, max 2 sentences>"}
- Once you have enough (at minimum industries OR job titles, plus a rough sense of who): {"type":"complete","summary":"<one-sentence summary>","icp":{
    "name": "<short ICP name>",
    "industries": [from: Fintech, Healthtech, E-commerce, SaaS, Logistics, Agriculture, Education, Manufacturing, Real Estate, Media, Consulting, Retail, Banking, Insurance, Telecoms, Energy],
    "job_titles": ["CTO", ...],
    "seniority_levels": [from: C-Suite, VP / Director, Head of, Manager, Senior, Individual Contributor],
    "company_sizes": [from: 1–10, 11–50, 51–200, 201–500, 501–1,000, 1,000+],
    "geographies": ["South Africa", ...],
    "tech_stack": [...],
    "keywords": ["hiring","Series A", ...],
    "apollo_only_consented": true
  }}
Only fill fields you're confident about; use [] otherwise. Ask at most 2-3 questions before completing.`

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 700,
      system,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
    })

    const textBlock = response.content.find(b => b.type === 'text') as { type: 'text'; text: string } | undefined
    const raw = (textBlock?.text ?? '').trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '')
    let parsed: { type?: string; content?: string; summary?: string; icp?: Record<string, unknown> }
    try {
      parsed = JSON.parse(raw)
    } catch {
      parsed = { type: 'question', content: 'Tell me more — what industry, job titles, company size, and region are you targeting?' }
    }

    if (parsed.type === 'complete' && parsed.icp) {
      const icp = parsed.icp as Record<string, unknown>
      const draft = {
        name:                  typeof icp.name === 'string' ? icp.name : 'My ICP',
        industries:            Array.isArray(icp.industries) ? icp.industries : [],
        job_titles:            Array.isArray(icp.job_titles) ? icp.job_titles : [],
        seniority_levels:      Array.isArray(icp.seniority_levels) ? icp.seniority_levels : [],
        company_sizes:         Array.isArray(icp.company_sizes) ? icp.company_sizes : [],
        geographies:           Array.isArray(icp.geographies) ? icp.geographies : [],
        tech_stack:            Array.isArray(icp.tech_stack) ? icp.tech_stack : [],
        keywords:              Array.isArray(icp.keywords) ? icp.keywords : [],
        apollo_only_consented: icp.apollo_only_consented !== false,
      }
      res.json({ success: true, data: { type: 'complete', icp: draft, summary: parsed.summary ?? null } })
      return
    }

    res.json({ success: true, data: { type: 'question', content: parsed.content ?? 'Tell me a bit more about who you want to reach.' } })
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ success: false, error: err.errors }); return }
    console.error('[icps/builder/chat]', err)
    res.status(500).json({ success: false, error: 'Failed to process message' })
  }
})

icpRouter.post('/', async (req: AuthRequest, res) => {
  try {
    const body = icpSchema.parse(req.body)
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }
    const { data, error } = await db.from('icps').insert({ ...body, client_id: clientId }).select().single()
    if (error) throw error
    // Auto-run on creation — only if client has credits
    ;(async () => {
      try {
        const { data: bal } = await db.from('clients').select('credit_balance').eq('id', clientId).single()
        const autoRunCap = bal?.credit_balance ?? 0
        if (autoRunCap > 0) {
          await runIcpJob(data.id, clientId, req.userId!, autoRunCap)
        }
      } catch (autoErr) { console.error('[icp auto-run]', autoErr) }
    })()
    res.status(201).json({ success: true, data })
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ success: false, error: err.errors }); return }
    console.error('[icps/create]', err)
    const msg = err instanceof Error ? err.message : String(err)
    res.status(500).json({ success: false, error: msg })
  }
})

icpRouter.patch('/:id', async (req: AuthRequest, res) => {
  try {
    const body = icpSchema.partial().parse(req.body)
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }
    const { data, error } = await db.from('icps')
      .update(body).eq('id', req.params.id).eq('client_id', clientId).select().single()
    if (error) throw error
    if (!data) { res.status(404).json({ success: false, error: 'ICP not found' }); return }
    res.json({ success: true, data })
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ success: false, error: err.errors }); return }
    console.error(err); res.status(500).json({ success: false, error: 'Failed to update ICP' })
  }
})

icpRouter.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }
    const { error } = await db.from('icps').delete().eq('id', req.params.id).eq('client_id', clientId)
    if (error) throw error
    res.json({ success: true })
  } catch (err) { console.error(err); res.status(500).json({ success: false, error: 'Failed to delete ICP' }) }
})

// ── RUN ICP — search Apollo and insert matched leads ──────────────────────────
icpRouter.post('/:id/run', rateLimit({ limit: 10, windowMs: 60_000, key: 'icp-run', byUser: true }), async (req: AuthRequest, res) => {
  try {
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }

    // #420/#422 — browsing is FREE: a run sources MASKED leads (no email exposed,
    // nothing charged), so a $0 client may run. The wallet gates the REVEAL ($1),
    // not the sourcing. What bounds our PDL spend instead is the #423 daily
    // sourcing cap below (PDL is paid at SOURCING, ~$0.28/record).
    const { data: clientCheck } = await db.from('clients')
      .select('credit_balance, first_icp_run_at').eq('id', clientId).single()

    const isFirstRun = !clientCheck?.first_icp_run_at
    const currentBalance = clientCheck?.credit_balance ?? 0

    // Legacy fallback: pre-mix clients with an empty reveal wallet still get the
    // welcome reveal credits on first run (post-#425 signups already have them).
    if (isFirstRun && currentBalance < 1) {
      // #371 (AR-34) — atomic + conditional: grant 20 only when still first-run AND still
      // empty (checked inside the UPDATE), additively so a purchase landing mid-run isn't
      // clobbered by an absolute `= 20`. Does NOT claim first_icp_run_at (site 1 owns that,
      // preserving prior behaviour). Ledger only when THIS call granted.
      const { data: granted } = await db.rpc('grant_first_run_credits', {
        p_client_id: clientId, p_amount: 20, p_max_balance: 1, p_claim_first_run: false,
      })
      if (granted) await db.from('credit_transactions').insert({
        client_id: clientId,
        amount: 20,
        type: 'trial_bonus',
        plan: 'lead_gen',
        note: 'Welcome credits — 20 reveals ($1 each)',
        created_at: new Date().toISOString(),
      })
    }

    // #423 — daily sourcing cap: PDL Full is spent when we SOURCE (~50 recs/run),
    // before any client charge, so cap rows sourced per client per day. 100/day
    // ≈ 2 runs ≈ ~$28 max COGS exposure per client/day.
    const SOURCING_DAILY_CAP = 100
    const dayStart = new Date(); dayStart.setUTCHours(0, 0, 0, 0)
    const { count: sourcedToday } = await db.from('leads')
      .select('id', { count: 'exact', head: true })
      .eq('client_id', clientId)
      .gte('created_at', dayStart.toISOString())
    if ((sourcedToday ?? 0) >= SOURCING_DAILY_CAP) {
      res.status(429).json({ success: false, error: `Daily sourcing limit reached (${SOURCING_DAILY_CAP} leads/day) — runs again tomorrow.` })
      return
    }

    // #445 — global ceiling pre-check: if the platform-wide monthly PDL budget is
    // spent, tell the client honestly instead of firing a job that would source zero.
    // (The try_spend_sourcing RPC is the hard atomic gate inside the job; this is just
    // the synchronous, human-readable banner.)
    const { data: money } = await db.from('money_settings').select('pdl_monthly_cap_usd').eq('id', 1).maybeSingle()
    const monthlyCap = Number(money?.pdl_monthly_cap_usd ?? 300)
    const monthStart = new Date(); monthStart.setUTCDate(1); monthStart.setUTCHours(0, 0, 0, 0)
    const { data: monthRows } = await db.from('sourcing_ledger')
      .select('cost_usd').gte('created_at', monthStart.toISOString())
    const monthSpent = (monthRows ?? []).reduce((s, r: { cost_usd?: number | string }) => s + Number(r.cost_usd ?? 0), 0)
    if (monthlyCap > 0 && monthSpent >= monthlyCap) {
      res.status(429).json({ success: false, error: 'Sourcing paused — the monthly data budget has been reached. It resumes when the budget resets.' })
      return
    }

    // (Fable F2) #445 — synchronous allowance check so an out-of-budget client gets an
    // honest banner instead of a silent empty run. Read-only; the atomic spend happens
    // inside the job (try_spend_sourcing) — this is UX, not the gate.
    const { data: allowRow } = await db.from('clients')
      .select('sourcing_allowance').eq('id', clientId).maybeSingle()
    if ((allowRow?.sourcing_allowance ?? 0) <= 0) {
      res.status(402).json({ success: false, error: 'You’re out of sourcing allowance — add reveal credits to source more leads ($1 each unlocks 2 more).' })
      return
    }

    // Fetch the balance AFTER any trial grant — this is the hard cap for this run
    const { data: afterGrant } = await db.from('clients').select('credit_balance').eq('id', clientId).single()
    const effectiveBalance = afterGrant?.credit_balance ?? 0

    // The full job (Apollo search + inserts + scoring + email enrichment + delivery)
    // takes far longer than the client's 15s request timeout, so run it in the
    // BACKGROUND and respond immediately. The client polls /leads to see results
    // appear. Mirrors the fire-and-forget pattern in /activate. Apollo/credit errors
    // surface in the logs (and as "no new leads"), not as a request error.
    // Credits are deducted at DELIVERY inside the job, not at insertion.
    runIcpJob(req.params.id, clientId, req.userId!, effectiveBalance)
      .catch((err) => {
        if (err instanceof ApolloCreditsExhaustedError) console.error('[icps/run] Apollo search credits exhausted')
        else if (err instanceof ApolloRateLimitError)   console.error('[icps/run] Apollo rate limit hit')
        else console.error('[icps/run] background job failed:', err)
      })

    res.json({ success: true, data: { started: true } })
  } catch (err) {
    console.error(err)
    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : 'Failed to start ICP run',
    })
  }
})

// ── P2-10: ICP AUTO-REFINEMENT ────────────────────────────────────────────────
// AI analyses reply data for this ICP → suggests improvements → stored in ICP settings
icpRouter.post('/:id/refine', async (req: AuthRequest, res) => {
  try {
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }

    const { data: icp } = await db.from('icps')
      .select('id, name, industries, job_titles, seniority_levels, geographies, company_sizes')
      .eq('id', req.params.id).eq('client_id', clientId).maybeSingle()
    if (!icp) { res.status(404).json({ success: false, error: 'ICP not found' }); return }

    // Get leads from this ICP — need 50+ to make suggestions meaningful
    const { data: leads } = await db.from('leads')
      .select('id, job_title, company, industry, seniority, country, score')
      .eq('client_id', clientId).eq('icp_id', req.params.id)
      .not('score', 'is', null).limit(200)

    const { count: replyCount } = await db.from('figsy_replies')
      .select('id', { count: 'exact', head: true }).eq('client_id', clientId)

    const { data: hotReplies } = await db.from('figsy_replies')
      .select('lead_id, classification').eq('client_id', clientId)
      .eq('classification', 'hot').limit(50)

    const hotLeadIds = new Set((hotReplies ?? []).map(r => r.lead_id))
    const hotLeads = (leads ?? []).filter(l => hotLeadIds.has(l.id))

    if ((leads?.length ?? 0) < 20) {
      res.json({ success: true, data: { suggestions: null, reason: 'Need at least 20 scored leads to generate refinement suggestions.' } })
      return
    }

    const industryBreakdown = hotLeads.reduce<Record<string, number>>((acc, l) => {
      if (l.industry) acc[l.industry] = (acc[l.industry] ?? 0) + 1
      return acc
    }, {})
    const topIndustries = Object.entries(industryBreakdown).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k]) => k)

    const seniorityBreakdown = hotLeads.reduce<Record<string, number>>((acc, l) => {
      if (l.seniority) acc[l.seniority] = (acc[l.seniority] ?? 0) + 1
      return acc
    }, {})
    const topSeniority = Object.entries(seniorityBreakdown).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k]) => k)

    const prompt = `You are an expert B2B targeting analyst. A client is running outreach using this ICP:
- Name: ${icp.name}
- Industries: ${(icp.industries ?? []).join(', ') || 'not set'}
- Job titles: ${(icp.job_titles ?? []).join(', ') || 'not set'}
- Seniority: ${(icp.seniority_levels ?? []).join(', ') || 'not set'}
- Geographies: ${(icp.geographies ?? []).join(', ') || 'not set'}
- Company sizes: ${(icp.company_sizes ?? []).join(', ') || 'not set'}

From ${leads?.length ?? 0} leads, ${hotLeads.length} replied with warm interest (${replyCount ?? 0} total replies).

The warm leads skew towards:
- Industries: ${topIndustries.join(', ') || 'mixed'}
- Seniority: ${topSeniority.join(', ') || 'mixed'}

Based on this data, suggest 3 specific ICP improvements that would increase reply rate. Return ONLY valid JSON:
{
  "suggestions": [
    { "type": "industries"|"job_titles"|"seniority_levels"|"geographies"|"company_sizes", "action": "add"|"remove"|"focus", "value": "string", "reason": "string" }
  ],
  "summary": "one sentence summary of what's working"
}`

    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 600,
      messages: [{ role: 'user', content: prompt }],
    })

    const raw = (message.content[0] as any).text ?? ''
    let parsed: { suggestions: Array<{ type: string; action: string; value: string; reason: string }>; summary: string }
    try {
      parsed = JSON.parse(raw.replace(/```json\n?|\n?```/g, '').trim())
    } catch {
      res.json({ success: true, data: { suggestions: null, reason: 'Could not parse AI response. Try again.' } })
      return
    }

    // Store suggestions in ICP settings
    await db.from('icps').update({
      settings: { refinement_suggestions: parsed.suggestions, refinement_summary: parsed.summary, refined_at: new Date().toISOString() }
    }).eq('id', req.params.id).eq('client_id', clientId)

    res.json({ success: true, data: { suggestions: parsed.suggestions, summary: parsed.summary } })
  } catch (err) {
    console.error('[icps/refine]', err)
    res.status(500).json({ success: false, error: 'ICP refinement failed' })
  }
})

icpRouter.patch('/:id/activate', async (req: AuthRequest, res) => {
  try {
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }
    await db.from('icps').update({ is_active: false }).eq('client_id', clientId)
    const { data, error } = await db.from('icps')
      .update({ is_active: true }).eq('id', req.params.id).eq('client_id', clientId).select().single()
    if (error) throw error

    // If this ICP has never sourced leads, activating it should actually FIND
    // leads — otherwise "set active" silently does nothing and the client waits
    // forever. Only auto-run a never-run ICP with credits available; an already-
    // run ICP is left alone (no surprise re-spend). Fire-and-forget so the
    // response is fast; runIcpJob delivers + charges, capped at balance.
    let started = false
    if (data && !data.last_run_at) {
      const { data: bal } = await db.from('clients').select('credit_balance, first_icp_run_at').eq('id', clientId).single()
      const credits = bal?.credit_balance ?? 0
      if (credits > 0 || !bal?.first_icp_run_at) {
        started = true
        runIcpJob(req.params.id, clientId, req.userId!, credits > 0 ? credits : 20)
          .catch(e => console.error('[icps/activate] auto-run failed:', e))
      }
    }
    res.json({ success: true, data, sourcing: started })
  } catch (err) { console.error(err); res.status(500).json({ success: false, error: 'Failed to activate ICP' }) }
})
