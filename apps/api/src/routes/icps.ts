import { Router } from 'express'
import { z } from 'zod'
import Anthropic from '@anthropic-ai/sdk'
import { db } from '@kind/db'
import { requireAuth, AuthRequest } from '../middleware/auth'
import { searchPeopleWithFallback, ApolloCreditsExhaustedError, ApolloRateLimitError } from '../lib/apollo'
import { scoreLeadsForIcp } from '../lib/scoring'
import { sendFirstLeadsReadyEmail, sendConsentEmail } from '../lib/email'
import { suggestIcpFromWebsite } from '../lib/scrape'
import { autoEnrollLead, sendDay1OutreachBatch } from '../lib/figsy'
import { getOrCreateConsentToken, buildConsentUrl } from '../lib/consent'
import { enrichAndDeliverLeads } from '../lib/lead-delivery'
import { deliveryCapBalance, normalizePlan } from '../lib/billing-rules'
import { isSuppressed } from '../lib/suppression'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export const icpRouter = Router()
icpRouter.use(requireAuth)

// After scoring completes, auto-send consent to leads scored >= 60 that have email + haven't been contacted
async function autoConsentScoredLeads(leadIds: string[], companyName: string): Promise<void> {
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
        await sendConsentEmail(lead.email!, lead.first_name, companyName, optOutUrl)
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
    .select('leads_per_run').eq('id', clientId).single()
  const leadsPerRun = clientSettings?.leads_per_run ?? 20
  const effectiveCap = maxLeads !== undefined ? Math.min(maxLeads, leadsPerRun) : leadsPerRun

  const { contacts, relaxed } = await searchPeopleWithFallback(icp)

  let inserted = 0
  let skipped  = 0
  const insertedIds: string[] = []

  for (const contact of contacts) {
    // Cap insertions at effectiveCap (lower of credit balance and leads_per_run setting)
    if (inserted >= effectiveCap) {
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
      inserted++
      insertedIds.push(newLead.id)
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

    scoreLeadsForIcp(insertedIds, icp, clientRow?.company_name ?? '')
      .then(() => autoConsentScoredLeads(insertedIds, clientRow?.company_name ?? ''))
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
      await db.from('clients')
        .update({ first_icp_run_at: now, credit_balance: (clientRow.credit_balance ?? 0) + 100 })
        .eq('id', clientId)
      await db.from('credit_transactions').insert({
        client_id: clientId,
        amount: 100,
        type: 'referral_bonus',
        note: 'Welcome bonus — first ICP run',
        created_at: now,
      })

      if (clientRow.referred_by) {
        const { data: referrer } = await db.from('clients')
          .select('id, credit_balance').eq('id', clientRow.referred_by).maybeSingle()
        if (referrer) {
          await db.from('clients')
            .update({ credit_balance: (referrer.credit_balance ?? 0) + 100 })
            .eq('id', referrer.id)
          await db.from('credit_transactions').insert({
            client_id: referrer.id,
            amount: 100,
            type: 'referral_bonus',
            note: `Referral bonus — ${clientRow.company_name ?? 'a new client'} joined`,
            created_at: now,
          })
        }
      }

      try {
        const { data: { user } } = await db.auth.admin.getUserById(userId)
        const userEmail = user?.email ?? ''
        if (userEmail) {
          // D4 — include top 5 scored leads inline in the email
          const { data: topLeads } = await db.from('leads')
            .select('first_name, last_name, job_title, company, score, linkedin_url')
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

    // Run count + sample contacts in parallel (per_page:1 for count, per_page:3 for samples)
    const [countResult, sampleResult] = await Promise.all([
      previewCount(icpArg),
      (async (): Promise<{ samples: unknown[]; sampleError: string | null }> => {
        try {
          const searchBody = buildSearchBody(icpArg, 1)
          searchBody.per_page = 3
          const contacts = await searchPeople(searchBody)
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

    res.json({
      success: true,
      data: {
        count:   countResult.count,
        samples: sampleResult.samples,
        // Diagnostics — surfaced so a silent 0 (bad key, 401, throttle, response-shape
        // drift) is visible instead of masquerading as "no matches".
        error:   countResult.error ?? sampleResult.sampleError ?? null,
        debug:   countResult.debug,
      },
    })
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
icpRouter.post('/:id/run', async (req: AuthRequest, res) => {
  try {
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }

    // Check credit balance before running — must have at least 1 credit
    const { data: clientCheck } = await db.from('clients')
      .select('credit_balance, first_icp_run_at').eq('id', clientId).single()

    const isFirstRun = !clientCheck?.first_icp_run_at
    const currentBalance = clientCheck?.credit_balance ?? 0

    // First-time users: pre-grant 20 trial credits so they can see the platform work
    if (isFirstRun && currentBalance < 1) {
      await db.from('clients').update({ credit_balance: 20 }).eq('id', clientId)
      await db.from('credit_transactions').insert({
        client_id: clientId,
        amount: 20,
        type: 'trial_bonus',
        note: 'Free trial — 20 starter credits',
        created_at: new Date().toISOString(),
      })
    } else if (!isFirstRun && currentBalance < 1) {
      res.status(402).json({ success: false, error: 'Insufficient credits. Top up at app.get-kind.com/dashboard/billing to continue.' })
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
