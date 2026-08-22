import { Router } from 'express'
import { z } from 'zod'
import Anthropic from '@anthropic-ai/sdk'
import { db } from '@kind/db'
import { requireAuth, AuthRequest } from '../middleware/auth'
import { rateLimit } from '../lib/rate-limit'
import { searchPeopleWithFallback, ApolloCreditsExhaustedError, ApolloRateLimitError } from '../lib/apollo'
import { audienceForClient, audienceForUser } from '../lib/provider-boundary'
import { scoreLeadsForIcp } from '../lib/scoring'
import { sendFirstLeadsReadyEmail, sendConsentEmail } from '../lib/email'
import { suggestIcpFromWebsite } from '../lib/scrape'
import { autoEnrollLead, sendDay1OutreachBatch } from '../lib/figsy'
import { getOrCreateConsentToken, buildConsentUrl } from '../lib/consent'
import { enrichAndDeliverLeads } from '../lib/lead-delivery'
import { deliveryCapBalance, normalizePlan, normalizeRevealEmail, normalizeRevealEmails } from '../lib/billing-rules'
import { isSuppressed } from '../lib/suppression'
import { sendFounderAlert } from '../lib/alerts'
import { PDL_RATE_USD } from '../lib/sourcing-fences'
import { isLaunchSendCountry, launchTargetRefusal } from '@kind/shared'
import { splitPoolAndRemainder, poolWriteAllowed, splitPoolEligible, poolRefusalLine } from '../lib/pool-sourcing'
import { deriveRunStatus, runOutcomeMessage, type RunStatus } from '../lib/run-outcome'
import {
  decideCursor, nextCursorState, exhaustedMessage, exhaustedAlertLines,
  type CursorQuery, type StoredCursor,
} from '../lib/pdl-cursor'
import { narrowSizeBands } from '../lib/lead-feedback'

// PR-A — record ONE honest outcome row per ICP run so the client learns WHY a run
// produced no leads (quota outage vs narrow ICP). Best-effort: a write failure here
// must never break the run itself, so it swallows errors (the run already happened).
async function recordRunOutcome(
  icpId: string,
  clientId: string,
  status: RunStatus,
  recordsRequested: number,
  poolServed: number,
  totalInserted: number,
  alreadyHeld = 0,
): Promise<void> {
  try {
    // supabase-js RETURNS `{ error }` — it does not throw. The try/catch alone therefore
    // caught nothing that actually happens here: a CHECK-constraint rejection (exactly what
    // a new `status` value risks) returned quietly and the outcome row simply never existed,
    // leaving the portal to render the previous run's message forever. #342's lesson,
    // applied at the moment the new value is introduced rather than after it bites.
    const { error } = await db.from('icp_run_outcomes').insert({
      icp_id: icpId,
      client_id: clientId,
      status,
      records_requested: Math.max(0, Math.round(recordsRequested)),
      pool_served: Math.max(0, Math.round(poolServed)),
      total_inserted: Math.max(0, Math.round(totalInserted)),
      message: runOutcomeMessage(status, totalInserted, alreadyHeld),
    })
    if (error) {
      console.error(`[icp] recordRunOutcome REJECTED status "${status}" for icp ${icpId}:`, error.message)
      // A rejected status means the client is about to be shown a stale outcome. If the
      // column will not take the value, the migration has not been run — say so loudly.
      if (/check constraint|violates/i.test(error.message)) {
        void sendFounderAlert('source_down', `icp_run_outcomes will not accept status "${status}"`, [
          `The database rejected an ICP run outcome with status "${status}" for ICP ${icpId}.`,
          'The status CHECK constraint has not been widened — run the pending migrations from Vida → Engine.',
          'Until then this run outcome is LOST and the client sees the previous run\'s message.',
        ])
      }
    }
  } catch (err) {
    console.error('[icp] recordRunOutcome failed (non-fatal):', err)
  }
}

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

    // HC-4 — THE COUNT NOW REFLECTS WHAT ACTUALLY WENT OUT.
    //
    // This used to log `sent to ${leads.length}` — the number of rows SELECTED, not the number
    // emailed — and flip every one of them to `status: 'consent_sent'` regardless. So a
    // suppressed person was recorded as having been asked for consent, which is a false entry
    // in the one record that proves we asked, and the log said we had asked N people when we
    // had asked fewer.
    //
    // The gates themselves live inside `sendConsentEmail` (all six callers funnel through it —
    // gating here would have covered this door and left five open). This just reads the verdict
    // and refuses to write a status the send did not earn. Refusals are NAMED, never a bare
    // count: "3 skipped" with no cause sends somebody hunting a bug in the wrong place.
    const skipReasons = new Map<string, number>()
    let sent = 0
    await Promise.allSettled(
      leads.map(async (lead) => {
        const optOutUrl = buildConsentUrl(lead.id, await getOrCreateConsentToken(lead))
        // #453 — clientId lets sendConsentEmail suppress the send for a demo client.
        const res = await sendConsentEmail(lead.email!, lead.first_name, companyName, optOutUrl, clientId)
        if (!res.sent) {
          skipReasons.set(res.reason, (skipReasons.get(res.reason) ?? 0) + 1)
          return   // ← the status stays 'scored'; nothing claims we asked
        }
        sent++
        await db.from('leads').update({
          status: 'consent_sent',
          consent_sent_at: new Date().toISOString(),
        }).eq('id', lead.id)
      })
    )
    const skipped = [...skipReasons.entries()].map(([r, n]) => `${r}: ${n}`).join(' · ')
    console.log(`[auto-consent] sent to ${sent} of ${leads.length} scored leads${skipped ? ` — skipped ${skipped}` : ''}`)
  } catch (err) {
    console.error('[auto-consent] failed:', err)
  }
}

// ── LAUNCH COUNTRY FENCE — REFUSE THE TARGET LIST, NOT JUST THE SEND ──────────────────────
//
// ⚠️ WITHOUT THIS, THE LAUNCH ALLOWLIST COSTS REAL MONEY TO ENFORCE.
//
// The five send-side launch gates hold a lead we cannot email. They fire at the END of the
// pipeline — long after we have PAID for the lead. `pdl-search.ts` pushes `geographies`
// straight into the PDL query as `location_country`, so a client targeting Nigeria means: we
// spend PDL budget sourcing Nigerian leads, insert them, score them, and then hold every single
// one at the send gate. Money out, nothing sendable, and no error anywhere — the system looks
// like it is working.
//
// So the refusal moves to the front door. A country we cannot send to is a country we do not
// buy leads in.
//
// ⚠️ ON THE SCHEMA, NOT IN THE THREE ROUTES. There are three doors that save an ICP — POST `/`,
// POST `/revise` and PATCH `/:id` — and `.partial()` on the PATCH door keeps this refinement,
// so all three are covered by one definition and a FOURTH door added later inherits it for
// free. A gate copied into three handlers is a gate that will be missed on the fourth: that is
// exactly how the min-20 gate ended up bypassable on a route its 18 unit tests never saw.
//
// This does NOT restrict where a CLIENT is based — only who they may target. A South African
// client selling into the US and the UK is the normal case and is completely unaffected.
const geographiesSchema = z.array(z.string()).default([]).superRefine((geos, ctx) => {
  for (const g of geos) {
    // Blank entries are the UI's problem, not this gate's — an empty tag matches nothing in
    // the PDL query and buys no leads, so refusing it here would be a confusing wall for a
    // typo. Only a REAL country we cannot send to is refused.
    if (!String(g ?? '').trim()) continue
    if (!isLaunchSendCountry(g)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: launchTargetRefusal(g) })
    }
  }
})

const icpSchema = z.object({
  name:                  z.string().min(1),
  industries:            z.array(z.string()).default([]),
  job_titles:            z.array(z.string()).default([]),
  seniority_levels:      z.array(z.string()).default([]),
  company_sizes:         z.array(z.string()).default([]),
  geographies:           geographiesSchema,
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
    // HC-1 — these come from `lead_pool.email_norm`, which is written normalised, so this
    // wrap changes no value today. It is here so that EVERY blocklist probe in the codebase
    // passes through the one normaliser with no exceptions: the guard test can then assert
    // that flatly, and the day something writes an un-normalised `email_norm` this still holds.
    const candEmails = normalizeRevealEmails(
      candidates.map((c: { email_norm?: string | null }) => c.email_norm),
    )
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
    // ⚠️ VERIFIED-EQUIVALENT, NOT CONSENTED. apollo_consented = a provider-VERIFIED email,
    // treated as a legitimate-interest contact. It is NOT a consent record; naming predates
    // the pivot. Do not build consent logic on it. See @kind/shared `Lead`.
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

  // `leads_per_run` is the client's own per-run preference for a SELF-SERVE run — the
  // default when nobody has said how many to fetch. It is NOT a ceiling on an explicit
  // request.
  //
  // It used to be: `Math.min(maxLeads, leadsPerRun ?? 20)`. That silently capped every
  // managed run at 20 — so the $99, which asks for 200 so the client can pass on half and
  // still approve 100, delivered 20. The client could then only approve twenty, with no
  // choice at all, against a pack promising a hundred. Nothing surfaced it because 20 is a
  // perfectly plausible number to see on a desk, and `leads_per_run` has no UI anywhere in
  // Vida — it was frozen at its default with no way to raise it.
  //
  // An explicit `maxLeads` is a decision the caller already made against budget, allowance
  // or the pack target, so it is honoured. Real spend stays fenced exactly as before:
  // try_spend_sourcing still enforces the client's pre-funded allowance, the per-client
  // daily record cap and the global monthly ceiling. This changes what we ASK for, never
  // what we are allowed to spend.
  const { data: clientSettings } = await db.from('clients')
    .select('leads_per_run, is_demo').eq('id', clientId).single()
  const { sourcingTarget } = await import('../lib/onboarding-pack')
  const effectiveCap = sourcingTarget(maxLeads, clientSettings?.leads_per_run as number | null)
  // #453 — DEMO MODE: sourcing is POOL-ONLY at $0. servePoolLeads runs as normal, but
  // the entire PDL remainder (spend, search, ledger, allowance) is skipped for demo.
  const isDemo = clientSettings?.is_demo === true

  let inserted = 0
  let skipped  = 0
  let relaxed: string | null = null
  const insertedIds: string[] = []

  // ── #366 PDL PAGING — WHERE WE GOT TO LAST RUN.
  //
  // `pdlSearchPeople(icp, _page = 1, size)` ignored its page argument, so every run asked
  // PDL for the SAME first page. Run two got the identical people back, deduped every one
  // of them against the leads already on the desk, and inserted nothing — reported to the
  // client as "no leads matched this ICP", which is a sentence about their targeting when
  // it was really a sentence about our paging. A client's second month is the business.
  //
  // The cursor lives on the ICP row and is fingerprinted against the query that produced
  // it, so editing the ICP throws it away rather than replaying a cursor into an audience
  // the client no longer targets.
  const cursor = decideCursor(icp as StoredCursor, icp as CursorQuery)
  if (cursor.reset) console.log(`[icp] PDL cursor reset for icp ${icpId} — the ICP changed since it was stored`)
  let cursorUpdate: StoredCursor | null = null
  let audienceExhausted = cursor.exhausted

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
  } else if (cursor.exhausted) {
    // #366 — PDL already told us, on a previous run, that this exact query has nobody left.
    // Re-asking cannot produce a different answer, so we do not spend the grant on it. The
    // pool serve above still ran (it draws on records we already own), and the outcome
    // recorded at the end says the audience is finished rather than showing another zero.
    console.log(`[icp] icp ${icpId} audience already exhausted — PDL skipped, no grant spent.`)
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
        await recordRunOutcome(icpId, clientId, 'quota_exhausted', effectiveCap, 0, 0)
        return { inserted: 0, skipped: 0, relaxed: 'Sourcing paused — add reveal credits (or the monthly data budget has been reached).' }
      }
      // Pool already served leads — deliver those; just skip the PDL top-up.
      console.log(`[icp] PDL top-up refused for client ${clientId} (no budget) — delivering ${pool.served} pool-served leads only.`)
    } else {
      void maybeAlertPdlBudget()

      // #366 — resume from where the last run stopped. `cursor.token` is null on a first
      // run (or after an ICP edit), which is the old behaviour exactly.
      // ── CALIBRATION v1 (P32) — THIS CLIENT'S OWN PASSES NARROW THIS RUN ──────────────
      //
      // Founder-ruled 21 Aug: *"a client who passed 'too big' on 3+ leads of a size band gets
      // that band excluded from THEIR next sourcing run"* — that band AND everything above it.
      //
      // ⚠️ NARROWED HERE, NOT INSIDE THE QUERY BUILDERS. `searchPeopleWithFallback` fans out to
      // BOTH Apollo (`buildSearchBody`) and PDL (`buildPdlBody`); filtering inside either one
      // would leave the other still sourcing exactly what this client just rejected. One
      // narrowing, before the fan-out, covers both by construction.
      //
      // ⚠️ CLIENT-SCOPED AND BEST-EFFORT. The read is `.eq('client_id', clientId)` and nothing
      // else, and any failure leaves the run EXACTLY as it is today. A calibration nicety must
      // never be able to stop a client's sourcing.
      let icpForSearch = icp
      try {
        const { data: fb } = await db.from('lead_feedback')
          .select('reason_code, leads!inner(company_size)')
          .eq('client_id', clientId)
          .eq('action', 'pass')
          .order('created_at', { ascending: false })
          .limit(200)
        const rows = (fb ?? []).map((r: Record<string, unknown>) => ({
          reason_code: r.reason_code as never,
          company_size: (r.leads as { company_size?: string | null } | null)?.company_size ?? null,
        }))
        const narrowed = narrowSizeBands((icp as { company_sizes?: string[] }).company_sizes ?? [], rows)
        if (narrowed.excluded.length) {
          icpForSearch = { ...icp, company_sizes: narrowed.sizes }
          console.log(`[icp] calibration — client ${clientId} excluded ${narrowed.excluded.join(', ')} (${narrowed.reason})`)
        }
      } catch (err) {
        console.error('[icp] calibration read failed — sourcing continues unnarrowed:', err)
      }

      // ── AR5 BOUNDARY (21 Aug) ──────────────────────────────────────────────────
      // Whose sourcing is this? House → Apollo (our hunting, our prepaid credits);
      // client → PDL under the AR8 fence spent just above. Derived from the client's
      // AUTH USER (#593), never from which global API keys happen to be set — that
      // key-driven mixing is the defect this closes. `audienceForClient` fails closed
      // to 'client', so an unknown account can never reach K.I.N.D's Apollo.
      const audience = await audienceForClient(clientId)
      const { contacts, relaxed: pdlRelaxed, pdlPage } = await searchPeopleWithFallback(icpForSearch, 1, grantedSize, cursor.token, audience)
      relaxed = pdlRelaxed

      // Remember where PDL got to, so NEXT month starts after these people instead of on
      // top of them. Only written when PDL actually answered — a failed request leaves the
      // stored cursor untouched, so the unserved page is retried rather than skipped.
      if (pdlPage) {
        cursorUpdate = nextCursorState(icp as CursorQuery, pdlPage, new Date().toISOString())
        if (pdlPage.exhausted) audienceExhausted = true
      }

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
          // HC-1 — probe with the NORMALISED address. (The pool probe above already sends
          // normalised values because they come from `lead_pool.email_norm`; this PDL path
          // sent the provider's raw address straight through.)
          const { data: blocked } = await db.from('opt_out_blocklist')
            .select('id').eq('email', normalizeRevealEmail(contact.email)).is('opted_back_in_at', null).maybeSingle()
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
          // ⚠️ NOT CONSENT — a provider-VERIFIED email, treated as a legitimate-interest
          // contact. Naming predates the pivot; do not build consent logic on it.
          // ⚠️ AND NOT EVEN UNIFORMLY "VERIFIED": `likely_to_engage` is Apollo's PREDICTION
          // that an address will engage, not a verification that it exists. This is the one
          // write that sets the flag on a guess. See @kind/shared `Lead`.
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
      // Belt over the structural guard (this block only runs in the non-demo branch):
      // the pool holds ONLY bought records — a demo run must never write to it.
      //
      // ⚠️ PROVENANCE TRIPWIRE (F13/F15). `lead_pool` is CROSS-CLIENT: a record bought for this
      // client is served to the next one, and whether we may do that is provider-specific. This
      // path tags `source: 'pdl'` two dozen lines up, so it refuses nothing today — the guard is
      // for the second sourcing path, written by somebody who does not know the pool is shared,
      // that tags its records `apollo` or forgets to tag them at all.
      //
      // The refusal skips the POOL write ONLY. Every lead this run bought is already inserted,
      // delivered and charged above; a licensing precaution must never become an outage.
      const { eligible: poolEligible, refused: poolRefused } = splitPoolEligible(poolUpserts)
      if (poolRefused.length > 0) console.error(poolRefusalLine(poolRefused))
      if (poolWriteAllowed(isDemo, poolEligible.length)) {
        const { error: poolErr } = await db.from('lead_pool')
          .upsert(poolEligible, { onConflict: 'email_norm', ignoreDuplicates: true })
        if (poolErr) console.error('[icp] lead_pool upsert failed (non-fatal):', poolErr)
      }
    }
  }

  // #366 — the cursor is written in the SAME statement as last_run_at, so a run can never
  // be recorded as having happened while the paging quietly stayed put.
  const { error: icpUpdateErr } = await db.from('icps')
    .update({ last_run_at: new Date().toISOString(), ...(cursorUpdate ?? {}) })
    .eq('id', icp.id)
  if (icpUpdateErr) {
    console.error(`[icp] icps update failed for ${icpId}:`, icpUpdateErr.message)
    // A MISSING COLUMN HERE IS THE BUG COMING BACK. If pdl_scroll_token cannot be written,
    // every future run resumes from nothing, re-serves page 1 and inserts zero — the exact
    // silent failure this item exists to kill. It must never be a swallowed console line.
    if (cursorUpdate && /column|schema cache/i.test(icpUpdateErr.message)) {
      void sendFounderAlert('source_down', 'PDL paging cannot be saved — clients will stop finding new people', [
        `Writing the PDL cursor to icps failed: ${icpUpdateErr.message}`,
        'The pdl_scroll_token / pdl_scroll_query / pdl_exhausted_at columns are missing in production.',
        'Fix: Vida → Engine → run the pending migrations (20260727_pdl_cursor).',
        'Until then every ICP run re-reads page 1 and every repeat client sources ZERO new leads.',
      ])
    }
  }

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
    scoreLeadsForIcp(insertedIds, icp, clientRow?.company_name ?? '', clientId)
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
      // #349 — the grant already moved (the RPC is the atomic claim). If the ledger row that
      // records it fails and we swallow it, the client's balance and their statement disagree
      // permanently, and no reconciliation can tell whether the 100 was granted or invented.
      if (granted) {
        const { error: bonusErr } = await db.from('credit_transactions').insert({
          client_id: clientId,
          amount: 100,
          type: 'referral_bonus',
          note: 'Welcome bonus — first ICP run',
          created_at: now,
        })
        if (bonusErr) {
          console.error('[icp] WELCOME BONUS LEDGER ROW FAILED after granting 100 —', clientId, bonusErr.message)
          void sendFounderAlert('charge_failed', 'Granted the 100 welcome bonus but the ledger row failed', [
            `Client ${clientId}.`,
            'The credits were added to their balance; the record of it was not written.',
            `Reason: ${bonusErr.message}`,
            'Their balance and their statement now disagree. Check credit_transactions_type_check allows referral_bonus.',
          ]).catch(() => {})
        }
      }

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

  // #366 — AN EXHAUSTED ICP SAYS SO OUT LOUD.
  //
  // A finished audience and a broken run both arrive as `inserted: 0`. Told the wrong one,
  // a client either widens an ICP that was working perfectly or abandons one that simply
  // ran to its end. So when PDL has nobody left, the run is recorded as `audience_exhausted`
  // and carries the end-of-audience sentence — never "no leads matched this ICP".
  const status = deriveRunStatus(!!clientSettings?.is_demo, inserted, false, audienceExhausted)
  let heldFromIcp = 0
  if (status === 'audience_exhausted') {
    const { count } = await db.from('leads')
      .select('id', { count: 'exact', head: true }).eq('icp_id', icpId).eq('client_id', clientId)
    heldFromIcp = count ?? 0
    relaxed = exhaustedMessage(heldFromIcp)
    // Alert only on the run that DISCOVERS it — `cursor.exhausted` means we already knew and
    // already told them, and a weekly cron must not mail the founder the same news forever.
    if (!cursor.exhausted) {
      const { data: c } = await db.from('clients').select('company_name').eq('id', clientId).single()
      void sendFounderAlert(
        'source_down',
        `${c?.company_name ?? 'A client'} has run out of audience on an ICP`,
        exhaustedAlertLines(c?.company_name ?? '', (icp as { name?: string }).name ?? '', heldFromIcp),
      )
    }
  }

  await recordRunOutcome(icpId, clientId, status, effectiveCap, pool.served, inserted, heldFromIcp)
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

    // AR5 (21 Aug) — resolved ONCE for both halves of the preview. This route is stateless
    // and holds no client row, so the audience comes from the AUTH USER (#593 identity rule);
    // `audienceForUser` fails closed to 'client'.
    const previewAudience = await audienceForUser(req.userId)

    // Run count + sample contacts in parallel (per_page:1 for count, per_page:3 for samples)
    const [countResult, sampleResult] = await Promise.all([
      previewCount(icpArg, previewAudience),
      (async (): Promise<{ samples: unknown[]; sampleError: string | null }> => {
        try {
          // ── AR5 BOUNDARY (21 Aug) — provider by audience, here too ────────────────
          // This route spends no Apollo CREDITS (People Search is free; the credit is the
          // reveal) and writes no leads — but it still ran a client's preview on K.I.N.D's
          // Apollo key. Correctness, not cost: client → PDL, house → Apollo. #243's PDL
          // path already existed as a fallback; for a client it simply becomes the primary.
          //
          // ⚠️ PREVIEW SEMANTICS ARE UNCHANGED (founder-ruled 21 Aug: EXTERNAL ONLY).
          // This still reports what an external provider can see. The owned pool is NOT
          // added — a preview that counted leads we already hold would answer a different
          // question than the one the client is asking.
          let contacts: Awaited<ReturnType<typeof searchPeople>> = []
          if (previewAudience === 'house') {
            const searchBody = buildSearchBody(icpArg, 1)
            searchBody.per_page = 3
            contacts = await searchPeople(searchBody).catch(() => [])
          }
          if (contacts.length === 0) {
            // #243: PDL keeps preview samples working Apollo-free — and is now the ONLY
            // source a normal client's preview ever touches.
            const { pdlSearchPeople } = await import('../lib/pdl-search')
            contacts = await pdlSearchPeople(icpArg, 3)
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

// ── M4 — THE CLIENT REVISES THEIR OWN TARGETING, BY CONVERSATION ──────────────
// Founder-locked in the flow walk: a client revision GOES LIVE (no approval gate holding
// their own change hostage) and NOTIFIES US, because the people already in a live campaign
// were picked against the OLD profile and may now be the wrong people.
//
// Deliberately separate from POST /icps: that one creates an inactive draft and auto-runs
// on credits. This one supersedes the current version atomically-in-order (deactivate all,
// then insert active) so the client is never left with zero active ICPs, and it does NOT
// auto-source — Vida re-picks who goes into the campaign, which is the whole point of the
// notification. Same shape the conversational builder returns (POST /icps/chat-build).
icpRouter.post('/revise', async (req: AuthRequest, res) => {
  try {
    const body = icpSchema.parse(req.body)
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }

    const { data: previous } = await db.from('icps')
      .select('id, name').eq('client_id', clientId).eq('is_active', true)
      .order('created_at', { ascending: false }).limit(1).maybeSingle()

    await db.from('icps').update({ is_active: false }).eq('client_id', clientId)
    const { data, error } = await db.from('icps')
      .insert({ ...body, client_id: clientId, is_active: true }).select().single()
    if (error) throw error

    // Notify us. Vida's bell already derives "ICP revised since the campaign was built"
    // from the rows, so this alert is the push half of the same fact — never the only half.
    // One ICP = one campaign — born together, never assigned.
    const { ensureCampaignForIcp } = await import('../lib/start-work')
    void ensureCampaignForIcp(clientId, data.id, data.name).catch(() => {})

    const { data: client } = await db.from('clients').select('company_name').eq('id', clientId).maybeSingle()
    void sendFounderAlert('new_signup', `ICP revised — ${client?.company_name ?? 'a client'}`, [
      `${client?.company_name ?? 'A client'} changed their targeting in Milla.`,
      previous?.name ? `Was: ${previous.name}` : 'They had no active ICP before this.',
      `Now: ${data.name ?? 'unnamed ICP'}`,
      'It is LIVE. Anyone already enrolled was picked against the old profile — re-check who is in the campaign in Vida.',
    ]).catch(() => {})

    res.status(201).json({ success: true, data })
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ success: false, error: err.errors }); return }
    console.error('[icps/revise]', err)
    res.status(500).json({ success: false, error: 'Failed to save your targeting' })
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
      // #349 — same shape as the 100 grant above: the credits have already moved, so a
      // swallowed ledger failure leaves the balance and the statement permanently disagreeing.
      if (granted) {
        const { error: trialErr } = await db.from('credit_transactions').insert({
          client_id: clientId,
          amount: 20,
          type: 'trial_bonus',
          plan: 'lead_gen',
          note: 'Welcome credits — 20 reveals ($1 each)',
          created_at: new Date().toISOString(),
        })
        if (trialErr) {
          console.error('[icp] TRIAL BONUS LEDGER ROW FAILED after granting 20 —', clientId, trialErr.message)
          void sendFounderAlert('charge_failed', 'Granted the 20 trial credits but the ledger row failed', [
            `Client ${clientId}.`,
            'The credits were added to their balance; the record of it was not written.',
            `Reason: ${trialErr.message}`,
            'Their balance and their statement now disagree. Check credit_transactions_type_check allows trial_bonus.',
          ]).catch(() => {})
        }
      }
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

// ── PR-A: LAST-RUN OUTCOME ─────────────────────────────────────────────────────
// The client polls this after a run so an empty leads list can show WHY — a temporary
// sourcing-quota outage (credits untouched) vs a genuinely narrow ICP (widen it) — instead
// of an indistinguishable spinner-then-nothing. Returns null if the ICP never ran.
icpRouter.get('/:id/last-run', async (req: AuthRequest, res) => {
  try {
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }
    const { data } = await db.from('icp_run_outcomes')
      .select('status, records_requested, pool_served, total_inserted, message, created_at')
      .eq('icp_id', req.params.id).eq('client_id', clientId)
      .order('created_at', { ascending: false }).limit(1).maybeSingle()
    res.json({ success: true, data: data ?? null })
  } catch (err) {
    console.error('[icps/last-run]', err)
    res.status(500).json({ success: false, error: 'Failed to load run outcome' })
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
    // One ICP = one campaign — born together, never assigned.
    if (data) {
      const { ensureCampaignForIcp } = await import('../lib/start-work')
      void ensureCampaignForIcp(clientId, data.id, data.name).catch(() => {})
    }

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
