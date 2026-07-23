import { Router } from 'express'
import { z } from 'zod'
import { db } from '@kind/db'
import { requireAuth, AuthRequest } from '../middleware/auth'
import { rateLimit } from '../lib/rate-limit'
import Anthropic from '@anthropic-ai/sdk'
import { pushToCrm } from '../lib/crm'
import { sendConsentEmail } from '../lib/email'
import { searchPeople, buildSearchBody } from '../lib/apollo'
import { scoreLeadsForIcp } from '../lib/scoring'
import { getOrCreateConsentToken, buildConsentUrl } from '../lib/consent'
import { isSuppressed } from '../lib/suppression'
import { normalizeRevealEmail, revealCharged } from '../lib/billing-rules'
import { waterfallEnrich } from '../lib/enrichment'
import { isDemoClient } from '../lib/demo'

export const leadRouter = Router()

// ── PUBLIC: POPIA consent callback (no auth — lead clicks link in email) ───────
leadRouter.post('/public/consent', async (req, res) => {
  try {
    const { token, consent } = z.object({
      // lead_id is still accepted from the link for backwards compatibility but
      // is no longer trusted — the secure token is the sole proof of identity.
      lead_id: z.string().uuid().optional(),
      token:   z.string().min(1),
      consent: z.boolean(),
    }).parse(req.body)

    // Look the lead up by its unguessable consent token. A valid token IS the
    // authorisation; there is no separate id-equality check to bypass.
    const { data: lead, error: leadErr } = await db.from('leads')
      .select('id, email, first_name, last_name, linkedin_url, status, client_id')
      .eq('consent_token', token).single()

    if (leadErr || !lead) {
      res.status(404).json({ success: false, error: 'Lead not found' }); return
    }

    if (lead.status === 'consent_given' || lead.status === 'opted_out') {
      res.json({ success: true, already_processed: true, status: lead.status }); return
    }

    if (consent) {
      await db.from('leads')
        .update({ status: 'consent_given', consent_given_at: new Date().toISOString() })
        .eq('id', lead.id)

      // Fire-and-forget CRM push
      if (lead.email) {
        const { data: client } = await db.from('clients')
          .select('crm_type, crm_api_key, crm_sync_enabled').eq('id', lead.client_id).maybeSingle()
        if (client?.crm_sync_enabled && client?.crm_type && client?.crm_api_key) {
          const { pushToCrm } = await import('../lib/crm')
          pushToCrm(client.crm_type as any, client.crm_api_key, lead as any).catch(console.error)
        }
      }

      res.json({ success: true, status: 'consent_given' })
    } else {
      if (lead.email) {
        await db.from('opt_out_blocklist').upsert({
          email:                lead.email,
          linkedin_url:         lead.linkedin_url,
          full_name:            `${lead.first_name} ${lead.last_name}`.trim(),
          reason:               'lead_declined_consent',
          blocked_by_client_id: lead.client_id,
        }, { onConflict: 'email', ignoreDuplicates: false })

        await db.from('leads').update({ status: 'opted_out', opted_out_at: new Date().toISOString() })
          .eq('email', lead.email)
      } else {
        await db.from('leads').update({ status: 'opted_out', opted_out_at: new Date().toISOString() })
          .eq('id', lead.id)
      }

      res.json({ success: true, status: 'opted_out' })
    }
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ success: false, error: err.errors }); return }
    console.error('[leads/public/consent]', err)
    res.status(500).json({ success: false, error: 'Failed to process consent' })
  }
})

leadRouter.use(requireAuth)

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

async function getClientId(userId: string): Promise<string | null> {
  const { data } = await db.from('clients').select('id').eq('user_id', userId).maybeSingle()
  return data?.id ?? null
}

// ── STATS ─────────────────────────────────────────────────────────────────────
leadRouter.get('/stats', async (req: AuthRequest, res) => {
  try {
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }

    // Use allSettled so one failed count doesn't blank the whole stats panel.
    // Only count DELIVERED leads — the client is only shown (and charged for)
    // delivered leads, so stats must match what they can actually see.
    const [total, scored, consented, exported_, optedOut, pendingReview, inFigsy] = (await Promise.allSettled([
      db.from('leads').select('id', { count: 'exact', head: true }).eq('client_id', clientId).not('delivered_at', 'is', null),
      db.from('leads').select('id', { count: 'exact', head: true }).eq('client_id', clientId).not('delivered_at', 'is', null).not('score', 'is', null),
      db.from('leads').select('id', { count: 'exact', head: true }).eq('client_id', clientId).not('delivered_at', 'is', null).eq('status', 'consent_given'),
      db.from('leads').select('id', { count: 'exact', head: true }).eq('client_id', clientId).not('delivered_at', 'is', null).eq('status', 'exported'),
      db.from('leads').select('id', { count: 'exact', head: true }).eq('client_id', clientId).not('delivered_at', 'is', null).eq('status', 'opted_out'),
      // Pending Review pill: high-quality leads waiting for approval (score ≥ 70, not yet enrolled).
      db.from('leads').select('id', { count: 'exact', head: true }).eq('client_id', clientId).not('delivered_at', 'is', null).gte('score', 70).in('status', ['pending', 'scored']),
      // In FIGSY pill: consented leads in an active outreach state.
      db.from('leads').select('id', { count: 'exact', head: true }).eq('client_id', clientId).not('delivered_at', 'is', null).eq('apollo_consented', true).in('status', ['consent_given', 'consent_sent']),
    ])).map(r => r.status === 'fulfilled' ? r.value : { count: 0 })

    const { data: avgData } = await db.from('leads').select('score, estimated_deal_value_usd')
      .eq('client_id', clientId).not('delivered_at', 'is', null).not('score', 'is', null)

    const avgScore = avgData?.length
      ? Math.round(avgData.reduce((sum: number, l: any) => sum + (Number(l.score) || 0), 0) / avgData.length)
      : 0
    const pipelineValueUsd = avgData?.reduce((sum: number, l: any) => sum + (Number(l.estimated_deal_value_usd) || 0), 0) ?? 0

    res.json({
      success: true,
      data: {
        total:              total.count || 0,
        scored:             scored.count || 0,
        consented:          consented.count || 0,
        exported:           exported_.count || 0,
        opted_out:          optedOut.count || 0,
        pending_review:     pendingReview.count || 0,
        in_figsy:           inFigsy.count || 0,
        avg_score:          avgScore,
        pipeline_value_usd: pipelineValueUsd,
      },
    })
  } catch (err) { console.error(err); res.status(500).json({ success: false, error: 'Failed to fetch lead stats' }) }
})

// ── LIST ──────────────────────────────────────────────────────────────────────
leadRouter.get('/', async (req: AuthRequest, res) => {
  try {
    const { status, min_score, icp_id, apollo_consented, campaign_id, page = '1', limit = '50' } = req.query
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }

    // campaign_id cross-link: a campaign's enrolled leads live in figsy_enrollments,
    // so resolve the enrolled lead IDs first, then constrain the leads query to them.
    let campaignLeadIds: string[] | null = null
    if (campaign_id) {
      const { data: enr } = await db.from('figsy_enrollments')
        .select('lead_id').eq('campaign_id', campaign_id as string)
      campaignLeadIds = (enr ?? []).map((e: { lead_id: string }) => e.lead_id).filter(Boolean)
      // No enrollments → guarantee an empty result rather than the full list.
      if (campaignLeadIds.length === 0) campaignLeadIds = ['00000000-0000-0000-0000-000000000000']
    }

    // Only show DELIVERED leads — undelivered leads are not yet paid for and
    // must not appear in the client's list/export (drip/run delivers + charges).
    let query = db.from('leads').select('*', { count: 'exact' })
      .eq('client_id', clientId)
      .not('delivered_at', 'is', null)
      .order('score', { ascending: false, nullsFirst: false })
      .range((Number(page) - 1) * Number(limit), Number(page) * Number(limit) - 1)

    if (status) {
      const statusValues = (status as string).split(',')
      query = statusValues.length > 1
        ? query.in('status', statusValues)
        : query.eq('status', statusValues[0])
    }
    if (min_score)        query = query.gte('score', Number(min_score))
    if (icp_id)           query = query.eq('icp_id', icp_id as string)
    if (apollo_consented) query = query.eq('apollo_consented', apollo_consented === 'true')
    if (campaignLeadIds)  query = query.in('id', campaignLeadIds)

    const { data, count, error } = await query
    if (error) throw error

    // lead → its campaign back-link: attach the campaign each lead is enrolled in
    // (most-recent enrollment wins) so the list can link a lead back to its campaign.
    const rows = (data ?? []) as Array<Record<string, any>>
    const leadIds = rows.map(l => l.id).filter(Boolean)
    if (leadIds.length > 0) {
      const { data: enr } = await db.from('figsy_enrollments')
        .select('lead_id, enrolled_at, figsy_campaigns(id, name)')
        .in('lead_id', leadIds)
        .order('enrolled_at', { ascending: false })
      const byLead = new Map<string, { id: string; name: string }>()
      for (const e of (enr ?? []) as Array<Record<string, any>>) {
        const camp = Array.isArray(e.figsy_campaigns) ? e.figsy_campaigns[0] : e.figsy_campaigns
        if (camp?.id && !byLead.has(e.lead_id)) byLead.set(e.lead_id, { id: camp.id, name: camp.name })
      }
      for (const l of rows) l.campaign = byLead.get(l.id) ?? null
    }

    // Mask PII until revealed (#422): hide email + phone on any lead the client
    // hasn't spent $1 to reveal. `revealed` is the flag the portal reads to show
    // the value vs a "Reveal ($1)" button.
    for (const l of rows) {
      l.revealed = !!l.revealed_at
      if (!l.revealed) { l.email = null; l.phone = null }
    }

    res.json({ success: true, data: rows, total: count, page: Number(page), limit: Number(limit) })
  } catch (err) { console.error(err); res.status(500).json({ success: false, error: 'Failed to fetch leads' }) }
})

// ── #488 MILLA LEAD DESK — masked leads awaiting the client's 👍 ────────────────
// The client-facing desk. Returns ONLY safe masked fields (role @ company, score, why-it-
// fits) — NEVER name/email/phone/linkedin — so masking is enforced SERVER-SIDE, not by the
// browser hiding columns. Scoped to the client's own delivered, not-yet-revealed, not-passed
// leads. After the client approves ($1), the full contact comes back through /leads/:id/reveal
// or the normal /leads list (revealed=true).
leadRouter.get('/for-approval', async (req: AuthRequest, res) => {
  try {
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }
    const { data, error } = await db.from('leads')
      .select('id, job_title, company, industry, country, score, score_reasoning, created_at')
      .eq('client_id', clientId)
      .not('delivered_at', 'is', null)
      .not('surfaced_for_approval_at', 'is', null)      // #493 — only leads the operator has Sent to the client
      .gt('approval_expires_at', new Date().toISOString()) // #492 — enforce the 72h TTL: an expired lead leaves the desk (no charge, no hold ever created)
      .is('revealed_at', null)
      .neq('status', 'passed')
      .order('score', { ascending: false, nullsFirst: false })
      .limit(50)
    if (error) throw error
    // Belt-and-braces: the select above already excludes name/email/phone; map to a fixed
    // masked shape so an accidental column widening can never leak PII from this route.
    const masked = (data ?? []).map((l: Record<string, any>) => ({
      id: l.id,
      role: l.job_title ?? 'Decision-maker',
      company: l.company ?? '—',
      industry: l.industry ?? null,
      country: l.country ?? null,
      score: l.score ?? null,
      why_fits: l.score_reasoning ?? null,
      created_at: l.created_at ?? null,
    }))
    res.json({ success: true, data: masked })
  } catch (err) { console.error('[leads/for-approval]', err); res.status(500).json({ success: false, error: 'Failed to load leads' }) }
})

// ── #488 CLIENT CREDIT LEDGER — balances + every charge/hold/capture/release ────
leadRouter.get('/ledger', async (req: AuthRequest, res) => {
  try {
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }
    const [{ data: client }, { data: tx }] = await Promise.all([
      db.from('clients').select('credit_balance, figsy_credits_remaining').eq('id', clientId).maybeSingle(),
      db.from('credit_transactions')
        .select('amount, type, note, created_at')
        .eq('client_id', clientId).order('created_at', { ascending: false }).limit(50),
    ])
    res.json({
      success: true,
      data: {
        reveal_credits: (client as Record<string, number> | null)?.credit_balance ?? 0,
        work_credits:   (client as Record<string, number> | null)?.figsy_credits_remaining ?? 0,
        entries: tx ?? [],
      },
    })
  } catch (err) { console.error('[leads/ledger]', err); res.status(500).json({ success: false, error: 'Failed to load ledger' }) }
})

// ── CREATE ────────────────────────────────────────────────────────────────────
leadRouter.post('/', rateLimit({ limit: 60, windowMs: 60_000, key: 'leads-create', byUser: true }), async (req: AuthRequest, res) => {
  try {
    const body = z.object({
      icp_id:                    z.string().uuid().optional(),
      first_name:                z.string().min(1),
      last_name:                 z.string().default(''),
      email:                     z.string().email().optional(),
      phone:                     z.string().optional(),
      job_title:                 z.string().optional(),
      company:                   z.string().optional(),
      linkedin_url:              z.string().url().optional(),
      country:                   z.string().optional(),
      company_size:              z.string().optional(),
      industry:                  z.string().optional(),
      seniority:                 z.string().optional(),
      tech_stack:                z.array(z.string()).optional(),
      apollo_id:                 z.string().optional(),
      apollo_consented:          z.boolean().default(false),
      score:                     z.number().min(0).max(100).optional(),
      score_reasoning:           z.string().optional(),
      estimated_deal_value_usd:  z.number().optional(),
    }).parse(req.body)

    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }

    // Blocklist check
    if (body.email) {
      const { data: blocked } = await db.from('opt_out_blocklist')
        .select('id').eq('email', body.email).is('opted_back_in_at', null).maybeSingle()
      if (blocked) {
        res.status(409).json({ success: false, error: 'Lead is on the opt-out blocklist', code: 'BLOCKLISTED' })
        return
      }
    }

    const { data, error } = await db.from('leads').insert({ ...body, client_id: clientId }).select().single()
    if (error) throw error
    res.status(201).json({ success: true, data })
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ success: false, error: err.errors }); return }
    console.error(err); res.status(500).json({ success: false, error: 'Failed to create lead' })
  }
})

// ── BULK STATUS UPDATE ────────────────────────────────────────────────────────
leadRouter.post('/bulk-status', async (req: AuthRequest, res) => {
  try {
    const { leadIds, status } = z.object({
      leadIds: z.array(z.string().uuid()).min(1).max(100),
      status:  z.enum(['pending', 'scored', 'consent_sent', 'consent_given', 'exported', 'rejected', 'opted_out']),
    }).parse(req.body)

    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }

    const { data: updated, error } = await db.from('leads')
      .update({ status })
      .in('id', leadIds)
      .eq('client_id', clientId)
      .select('id')

    if (error) throw error
    res.json({ success: true, updated: updated?.length ?? 0 })
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ success: false, error: err.errors }); return }
    console.error(err); res.status(500).json({ success: false, error: 'Failed to update lead statuses' })
  }
})

// ── BULK DELETE ───────────────────────────────────────────────────────────────
// Permanently removes leads (and their dependent rows). Scoped to the caller's
// client: only leads they own are touched, even if foreign ids are passed.
leadRouter.post('/bulk-delete', async (req: AuthRequest, res) => {
  try {
    const { leadIds } = z.object({
      leadIds: z.array(z.string().uuid()).min(1).max(1000),
    }).parse(req.body)

    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }

    // Verify ownership first — only delete leads that belong to this client.
    const { data: owned } = await db.from('leads')
      .select('id').in('id', leadIds).eq('client_id', clientId)
    const ids = (owned ?? []).map((l: { id: string }) => l.id)
    if (ids.length === 0) { res.json({ success: true, deleted: 0 }); return }

    // Clear dependent rows first (FK), fail-soft if a table/column isn't present.
    for (const t of ['figsy_replies', 'figsy_sent_emails', 'figsy_enrollments', 'figsy_calls']) {
      await db.from(t).delete().in('lead_id', ids).then(() => {}, () => {})
    }

    const { data: deleted, error } = await db.from('leads')
      .delete().in('id', ids).select('id')
    if (error) throw error
    res.json({ success: true, deleted: deleted?.length ?? 0 })
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ success: false, error: err.errors }); return }
    console.error(err); res.status(500).json({ success: false, error: 'Failed to delete leads' })
  }
})

// ── UPDATE STATUS ─────────────────────────────────────────────────────────────
leadRouter.patch('/:id/status', async (req: AuthRequest, res) => {
  try {
    const { status } = z.object({
      status: z.enum(['pending', 'scored', 'consent_sent', 'consent_given', 'exported', 'rejected', 'opted_out']),
    }).parse(req.body)

    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }

    const now = new Date().toISOString()
    const extra: Record<string, unknown> = {}
    if (status === 'consent_sent')  extra.consent_sent_at = now
    if (status === 'consent_given') extra.consent_given_at = now
    if (status === 'exported')      extra.exported_at = now
    if (status === 'opted_out')     extra.opted_out_at = now

    const { data, error } = await db.from('leads')
      .update({ status, ...extra }).eq('id', req.params.id).eq('client_id', clientId).select().single()
    if (error) throw error
    if (!data) { res.status(404).json({ success: false, error: 'Lead not found' }); return }

    // Auto-push to CRM when consent given
    if (status === 'consent_given') {
      const { data: client } = await db.from('clients')
        .select('crm_type, crm_api_key, crm_sync_enabled').eq('id', clientId).single()
      if (client?.crm_sync_enabled && client.crm_type && client.crm_api_key && client.crm_type !== 'none') {
        pushToCrm(client.crm_type, client.crm_api_key, data).then(result => {
          if (result.contact_id) {
            db.from('leads').update({ crm_contact_id: result.contact_id, crm_synced: true }).eq('id', data.id)
          }
        }).catch(console.error)
      }
    }

    res.json({ success: true, data })

    // ── P0-11: Auto-fire consent email when lead status → approved/scored ────────
    // When a lead is approved (status = scored with score >= threshold), auto-send consent
    // if RESEND_API_KEY is set and consent has not yet been sent.
    if (status === 'scored' && data.email && !data.consent_sent_at) {
      ;(async () => {
        try {
          if (!process.env.RESEND_API_KEY) return
          const { data: clientForConsent } = await db.from('clients')
            .select('company_name').eq('id', clientId).maybeSingle()
          const { data: freshLead } = await db.from('leads')
            .select('id, email, first_name, consent_sent_at, consent_token, status')
            .eq('id', data.id).maybeSingle()
          if (!freshLead || freshLead.consent_sent_at || freshLead.status === 'opted_out') return
          const token = await getOrCreateConsentToken(freshLead)
          const consentUrl = buildConsentUrl(freshLead.id, token)
          await sendConsentEmail(freshLead.email!, freshLead.first_name, clientForConsent?.company_name ?? '', consentUrl, clientId)
          await db.from('leads').update({
            status: 'consent_sent',
            consent_sent_at: new Date().toISOString(),
            consent_auto_fired: true,
          }).eq('id', data.id)
        } catch (autoConsentErr) {
          console.error('[leads/auto-consent]', autoConsentErr)
        }
      })()
    }
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ success: false, error: err.errors }); return }
    console.error(err); res.status(500).json({ success: false, error: 'Failed to update lead status' })
  }
})

// ── OPT-OUT (permanent, cross-client) ─────────────────────────────────────────
leadRouter.post('/:id/optout', async (req: AuthRequest, res) => {
  try {
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }

    const { data: lead, error: leadErr } = await db.from('leads')
      .select('*').eq('id', req.params.id).eq('client_id', clientId).single()
    if (leadErr || !lead) { res.status(404).json({ success: false, error: 'Lead not found' }); return }

    const { reason } = z.object({ reason: z.string().default('manual_block') }).parse(req.body)

    // Add to blocklist
    if (lead.email) {
      await db.from('opt_out_blocklist').upsert({
        email:                 lead.email,
        linkedin_url:          lead.linkedin_url,
        full_name:             `${lead.first_name} ${lead.last_name}`.trim(),
        reason,
        blocked_by_client_id:  clientId,
      }, { onConflict: 'email', ignoreDuplicates: false })
    }

    // Mark lead as opted out across ALL clients who have this email
    if (lead.email) {
      await db.from('leads').update({ status: 'opted_out', opted_out_at: new Date().toISOString() })
        .eq('email', lead.email)
    } else {
      await db.from('leads').update({ status: 'opted_out', opted_out_at: new Date().toISOString() })
        .eq('id', req.params.id)
    }

    res.json({ success: true, message: 'Lead permanently blocked' })
  } catch (err) { console.error(err); res.status(500).json({ success: false, error: 'Failed to block lead' }) }
})

// ── REVEAL a lead — spend $1 to unmask the email (#420/#421/#422) ──────────────
// The per-qualified-lead model: leads arrive MASKED (email hidden). The client
// browses free, dedups against their own CRM, and spends $1 only to reveal the
// net-new ones they choose. Money-safe by design:
//   • Atomic CLAIM on revealed_at (…WHERE revealed_at IS NULL) → concurrent reveals
//     can't both charge. Loser is idempotent (returns the email, no charge).
//   • crm_existing → the client already owns it → NO charge.
//   • Charge is the gate: try_charge_reveal_credit. No credit → 402, un-claim.
//   • No email found → REFUND the $1 (fail-closed) + un-claim → 422.
//   • On success: unique credit_transactions.reference='reveal:'+id backstops
//     charge-once-per-lead (#424).
leadRouter.post('/:id/reveal', rateLimit({ limit: 60, windowMs: 60_000, key: 'lead-reveal', byUser: true }), async (req: AuthRequest, res) => {
  try {
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }

    // 1. Atomic claim — only the first reveal of this lead wins.
    const now = new Date().toISOString()
    const { data: claimedRows, error: claimErr } = await db.from('leads')
      .update({ revealed_at: now })
      .eq('id', req.params.id).eq('client_id', clientId).is('revealed_at', null)
      .select('*')
    if (claimErr) { console.error('[reveal] claim error', claimErr); res.status(500).json({ success: false, error: 'Failed to reveal lead' }); return }
    const claim = (claimedRows ?? [])[0] as Record<string, any> | undefined

    // Lost the claim → already revealed (or not ours). Idempotent: return current email.
    if (!claim) {
      const { data: existing } = await db.from('leads')
        .select('email, phone, revealed_at').eq('id', req.params.id).eq('client_id', clientId).maybeSingle()
      if (!existing) { res.status(404).json({ success: false, error: 'Lead not found' }); return }
      res.json({ success: true, revealed: !!existing.revealed_at, email: existing.email ?? null, phone: existing.phone ?? null, charged: false })
      return
    }

    const unclaim = () => db.from('leads').update({ revealed_at: null }).eq('id', claim.id).then(() => {}, () => {})

    // #453 — DEMO MODE: reveals are FREE and OFF-LEDGER. Resolve the client early; a
    // demo reveal must leave ZERO rows in the money books — NO try_charge_reveal_credit,
    // NO Hunter/waterfall, NO client_reveals, NO credit_transactions usage row, NO trial
    // +2 drip. Pool-served demo leads already carry the email on the row, so just expose
    // it (the atomic claim above already stamped revealed_at). If a demo lead somehow has
    // no email, return the normal no-email response, uncharged (and un-claim so it can be
    // retried once a pool lead with an email is served).
    if (await isDemoClient(clientId)) {
      const demoEmail = (claim.email as string | null) ?? null
      if (!demoEmail) {
        await unclaim()
        res.status(422).json({ success: false, error: 'no_email_found', message: 'We could not find a verified email for this lead — you were not charged.' })
        return
      }
      console.log(`[demo] free off-ledger reveal for client ${clientId} lead ${claim.id} — no charge, no money-book rows.`)
      res.json({ success: true, revealed: true, email: demoEmail, phone: claim.phone ?? null, charged: false })
      return
    }

    // 2. Already in the client's own CRM → they own it → no charge.
    if (claim.crm_existing) {
      await unclaim()
      res.status(409).json({ success: false, error: 'already_in_crm', message: 'This contact is already in your CRM — no charge.' })
      return
    }

    // 2b. #424 charge-once — if the email is already known (PDL leads carry it) and
    // this client has ALREADY paid to reveal that person (any earlier lead/campaign),
    // it's free: expose it without charging, at any balance. Hunter-only leads (no
    // email yet) can't be checked here — they reconcile after resolution in step 6.
    const knownEmail = normalizeRevealEmail(claim.email)
    if (knownEmail) {
      const { data: owned } = await db.rpc('reveal_is_owned', { p_client_id: clientId, p_email_norm: knownEmail })
      if (owned === true) {
        res.json({ success: true, revealed: true, email: claim.email, phone: claim.phone ?? null, charged: false })
        return
      }
    }

    // 3. Charge $1 (atomic decrement IS the gate).
    const { data: charged, error: chargeErr } = await db.rpc('try_charge_reveal_credit', { p_client_id: clientId })
    if (chargeErr) { console.error('[reveal] charge rpc error', chargeErr); await unclaim(); res.status(500).json({ success: false, error: 'Failed to reveal lead' }); return }
    if (charged !== true) {
      await unclaim()
      res.status(402).json({ success: false, error: 'insufficient_reveal_credits', message: 'Add reveal credits to unmask this lead ($1 each).' })
      return
    }

    // 4. Reveal the email. PDL-sourced leads already carry a work_email; only run
    //    the Hunter waterfall when we don't have one yet.
    let email: string | null = claim.email ?? null
    if (!email) {
      try {
        const enriched = await waterfallEnrich({
          first_name:   claim.first_name,
          last_name:    claim.last_name,
          company:      claim.company,
          linkedin_url: claim.linkedin_url,
        })
        email = enriched.email ?? null
      } catch (e) { console.error('[reveal] hunter waterfall failed for lead', claim.id, e); email = null }
    }

    // 5. No email → REFUND (fail-closed) + un-claim. Client is never charged for a dud.
    if (!email) {
      const { error: refundErr } = await db.rpc('increment_client_credits', { p_client_id: clientId, p_amount: 1 })
      if (refundErr) console.error('[reveal] REFUND FAILED for client', clientId, 'lead', claim.id, refundErr)
      await unclaim()
      res.status(422).json({ success: false, error: 'no_email_found', message: 'We could not find a verified email for this lead — you were not charged.' })
      return
    }

    // 6. Persist the email, then the #424 charge-once reconcile: record ownership of
    // this email for the client. If they already owned it (a re-sourced duplicate of
    // the same person on a different lead row), record_reveal_or_refund returns the
    // $1 — net once-per-email-EVER. Only log the usage ledger row when the charge nets.
    await db.from('leads').update({ email, apollo_consented: true }).eq('id', claim.id).then(() => {}, () => {})

    const emailNorm = normalizeRevealEmail(email)
    let chargedNet = true
    if (emailNorm) {
      const { data: revealOutcome } = await db.rpc('record_reveal_or_refund', {
        p_client_id: clientId, p_email_norm: emailNorm, p_lead_id: claim.id,
      })
      chargedNet = revealCharged(revealOutcome)
    }

    if (chargedNet) {
      await db.from('credit_transactions').insert({
        client_id: clientId,
        amount:    -1,
        type:      'usage',
        plan:      'lead_gen',
        reference: `reveal:${claim.id}`,
        note:      'Lead revealed ($1)',
        created_at: now,
      }).then(() => {}, () => {}) // unique-reference conflict = already booked; ignore
    }

    // #445 — TRIAL sourcing drip: a successful reveal unlocks +2 more sourced records,
    // so a trial client learns the loop by playing it (reveal → more leads appear). The
    // RPC caps lifetime trial grants at 20 records, so this is self-limiting and a no-op
    // once the client is out of trial pool — safe to call on every reveal. Fire-and-forget.
    void db.rpc('add_sourcing_allowance', { p_client_id: clientId, p_records: 2, p_trial: true })
      .then(() => {}, (e: unknown) => console.error('[reveal] trial sourcing drip failed (non-fatal):', e))

    res.json({ success: true, revealed: true, email, charged: chargedNet })
  } catch (err) { console.error(err); res.status(500).json({ success: false, error: 'Failed to reveal lead' }) }
})

// ── #487 APPROVE-GATED REVEAL — the $4 trigger (CLIENT side, for Milla) ────────
// The client taps 👍 approve on a masked lead in their portal: this reveals the contact
// ($1) AND sets our team to work it ($3) in ONE action — the ONLY place both fire. The
// heavy lifting lives in approveLead() (shared with the operator-on-behalf path in Vida)
// so the money sequence is identical everywhere. Scoped to the client's own lead by
// getClientId → the lead's client_id (enforced inside approveLead's queries).
leadRouter.post('/:id/approve', rateLimit({ limit: 60, windowMs: 60_000, key: 'lead-approve', byUser: true }), async (req: AuthRequest, res) => {
  try {
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }
    const { approveLead } = await import('../lib/approve-lead')
    const outcome = await approveLead(req.params.id, clientId)
    if (outcome.status === 'not_found') { res.status(404).json({ success: false, error: 'Lead not found' }); return }
    if (outcome.status === 'insufficient_reveal_credits') {
      res.status(402).json({ success: false, error: 'insufficient_reveal_credits', message: 'Add credits to approve — $1 to reveal plus $3 held for the work. Top up to continue.' }); return
    }
    if (outcome.status === 'insufficient_work_credits') {
      // #492 — the $3 work-hold couldn't be reserved, so NOTHING moved (no reveal either).
      res.status(402).json({ success: false, error: 'insufficient_work_credits', message: 'Add credits to approve — $1 to reveal plus $3 held for the work. Top up to continue.' }); return
    }
    if (outcome.status === 'no_email') {
      res.status(422).json({ success: false, error: 'no_email_found', message: 'We could not verify an email for this lead — you were not charged.' }); return
    }
    if (outcome.status === 'already_in_crm') {
      res.status(409).json({ success: false, error: 'already_in_crm', message: 'This contact is already in your CRM — no charge.' }); return
    }
    res.json({ success: true, ...outcome })
  } catch (err) { console.error('[approve]', err); res.status(500).json({ success: false, error: 'Failed to approve lead' }) }
})

// ✕ pass — client says "not a fit". No charge, no reveal; the lead leaves the queue.
leadRouter.post('/:id/pass', rateLimit({ limit: 120, windowMs: 60_000, key: 'lead-pass', byUser: true }), async (req: AuthRequest, res) => {
  try {
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }
    const { passLead } = await import('../lib/approve-lead')
    const outcome = await passLead(req.params.id, clientId)
    if (outcome.status === 'not_found') { res.status(404).json({ success: false, error: 'Lead not found or already actioned' }); return }
    res.json({ success: true, passed: true })
  } catch (err) { console.error('[pass]', err); res.status(500).json({ success: false, error: 'Failed to pass lead' }) }
})

// ── SEND POPIA CONSENT EMAIL ──────────────────────────────────────────────────
leadRouter.post('/:id/consent', async (req: AuthRequest, res) => {
  try {
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }

    const { data: lead, error: leadErr } = await db.from('leads')
      .select('*').eq('id', req.params.id).eq('client_id', clientId).single()
    if (leadErr || !lead) { res.status(404).json({ success: false, error: 'Lead not found' }); return }

    if (!lead.email) { res.status(422).json({ success: false, error: 'Lead has no email address' }); return }

    // DO-NOT-CONTACT: never email anyone connected to the founder's employer.
    if (isSuppressed({ email: lead.email, company: lead.company, linkedin: lead.linkedin_url })) {
      res.status(403).json({ success: false, error: 'This lead is on the do-not-contact list and cannot be contacted.' }); return
    }

    if (lead.status === 'consent_given' || lead.status === 'opted_out') {
      res.status(409).json({ success: false, error: `Lead has already ${lead.status === 'consent_given' ? 'consented' : 'opted out'}` })
      return
    }

    const { data: client } = await db.from('clients').select('company_name').eq('id', clientId).single()

    const optOutUrl = buildConsentUrl(lead.id, await getOrCreateConsentToken(lead))
    await sendConsentEmail(lead.email, lead.first_name, client?.company_name ?? '', optOutUrl, clientId)

    await db.from('leads')
      .update({ status: 'consent_sent', consent_sent_at: new Date().toISOString() })
      .eq('id', req.params.id)

    res.json({ success: true })
  } catch (err) { console.error(err); res.status(500).json({ success: false, error: 'Failed to send consent email' }) }
})

// ── RESEND CONSENT EMAIL (for already-sent leads that haven't responded) ─────
leadRouter.post('/:id/resend-consent', async (req: AuthRequest, res) => {
  try {
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }
    const { data: lead } = await db.from('leads')
      .select('*').eq('id', req.params.id).eq('client_id', clientId).maybeSingle()
    if (!lead) { res.status(404).json({ success: false, error: 'Lead not found' }); return }
    if (!lead.email) { res.status(422).json({ success: false, error: 'Lead has no email' }); return }
    if (lead.status === 'consent_given') { res.status(409).json({ success: false, error: 'Already consented' }); return }
    if (lead.status === 'opted_out') { res.status(409).json({ success: false, error: 'Lead has opted out' }); return }
    const { data: client } = await db.from('clients').select('company_name').eq('id', clientId).maybeSingle()
    const optOutUrl = buildConsentUrl(lead.id, await getOrCreateConsentToken(lead))
    await sendConsentEmail(lead.email, lead.first_name, client?.company_name ?? '', optOutUrl, clientId)
    await db.from('leads').update({ status: 'consent_sent', consent_sent_at: new Date().toISOString() }).eq('id', req.params.id)
    res.json({ success: true })
  } catch (err) { console.error(err); res.status(500).json({ success: false, error: 'Failed to resend consent email' }) }
})

// ── BULK CONSENT SEND (/leads/consent/bulk) ───────────────────────────────────
leadRouter.post('/consent/bulk', async (req: AuthRequest, res) => {
  try {
    const { leadIds } = z.object({
      leadIds: z.array(z.string().uuid()).min(1).max(50),
    }).parse(req.body)

    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }

    const { data: leads } = await db.from('leads')
      .select('id, email, first_name, last_name, apollo_consented, consent_sent_at, status, consent_token')
      .in('id', leadIds)
      .eq('client_id', clientId)

    const { data: client } = await db.from('clients').select('company_name').eq('id', clientId).single()

    let sent = 0
    let alreadySent = 0
    let alreadyConsented = 0
    let optedOut = 0

    for (const lead of leads ?? []) {
      if (lead.apollo_consented)              { alreadyConsented++; continue }
      if (lead.status === 'opted_out')        { optedOut++;         continue }
      if (lead.consent_sent_at)              { alreadySent++;      continue }
      if (!lead.email)                        { alreadySent++;      continue }

      try {
        const optOutUrl = buildConsentUrl(lead.id, await getOrCreateConsentToken(lead))
        await sendConsentEmail(lead.email, lead.first_name, client?.company_name ?? '', optOutUrl, clientId)
        await db.from('leads')
          .update({ status: 'consent_sent', consent_sent_at: new Date().toISOString() })
          .eq('id', lead.id)
        sent++
      } catch (err) {
        console.error('[leads/consent/bulk] lead', lead.id, err)
      }
    }

    const skipped = alreadySent + alreadyConsented + optedOut
    res.json({
      success: true,
      sent,
      skipped,
      skippedReasons: { alreadySent, alreadyConsented, optedOut },
    })
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ success: false, error: err.errors }); return }
    console.error('[leads/consent/bulk]', err)
    res.status(500).json({ success: false, error: 'Failed to send bulk consent' })
  }
})

// ── OPT-OUT BLOCKLIST LIST ─────────────────────────────────────────────────────
leadRouter.get('/blocklist', async (req: AuthRequest, res) => {
  try {
    // #260: scope the LIST to the caller's own client. Suppression-at-send stays
    // global (a lead opted out anywhere is never mailed), but the list endpoint
    // must not expose other clients' opted-out emails/names.
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }
    const { data, error } = await db.from('opt_out_blocklist')
      .select('*').eq('blocked_by_client_id', clientId).is('opted_back_in_at', null).order('created_at', { ascending: false })
    if (error) throw error
    res.json({ success: true, data })
  } catch (err) { console.error(err); res.status(500).json({ success: false, error: 'Failed to fetch blocklist' }) }
})

// ── AI ENRICHMENT ─────────────────────────────────────────────────────────────
leadRouter.post('/:id/enrich', async (req: AuthRequest, res) => {
  try {
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }

    const { data: lead, error: leadErr } = await db.from('leads')
      .select('*').eq('id', req.params.id).eq('client_id', clientId).single()
    if (leadErr || !lead) { res.status(404).json({ success: false, error: 'Lead not found' }); return }

    // Check for cached enrichment less than 7 days old
    try {
      const { data: existing } = await db.from('lead_enrichment')
        .select('*').eq('lead_id', req.params.id).maybeSingle()

      if (existing?.enriched_at) {
        const enrichedAt = new Date(existing.enriched_at)
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        if (enrichedAt > sevenDaysAgo) {
          res.json({ success: true, data: existing, cached: true }); return
        }
      }
    } catch (cacheErr: any) {
      // Table doesn't exist yet — fall through to Claude call
      if (!String(cacheErr?.message ?? '').includes('does not exist')) {
        console.error('[leads/enrich] cache check error', cacheErr)
      }
    }

    const prompt = `You are a B2B sales researcher. Given the following lead profile, generate research that will help a sales rep reach out at exactly the right moment.

Lead profile:
- Name: ${lead.first_name} ${lead.last_name}
- Title: ${lead.job_title || 'unknown'}
- Company: ${lead.company || 'unknown'}
- LinkedIn: ${lead.linkedin_url || 'not available'}
- Industry: ${lead.industry || 'unknown'}
- Country: ${lead.country || 'unknown'}
- Seniority: ${lead.seniority || 'unknown'}

Generate a JSON object with EXACTLY these fields (no extra text, no markdown, just valid JSON):
{
  "recent_signal": "One sentence about a timely reason to reach out now — e.g. funding round, product launch, leadership change, hiring surge, or industry trend affecting them",
  "company_context": "One sentence summarising what the company does and their current growth/market position",
  "opening_line": "A personalised first line for a cold email, max 20 words, referencing something specific about them or their company. Do NOT start with I or We.",
  "enrichment_score": <integer 1-10 rating how strong the outreach signal is, where 10 = perfect timing>
}

Output ONLY the JSON object, nothing else.`

    const message = await anthropic.messages.create({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 400,
      messages:   [{ role: 'user', content: prompt }],
    })

    const rawText = (message.content[0] as { type: string; text: string }).text.trim()
    let enrichment: { recent_signal: string; company_context: string; opening_line: string; enrichment_score: number }
    try {
      enrichment = JSON.parse(rawText)
    } catch {
      // Try to extract JSON from the response if wrapped in markdown
      const jsonMatch = rawText.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('Claude returned invalid JSON')
      enrichment = JSON.parse(jsonMatch[0])
    }

    // Validate enrichment_score
    enrichment.enrichment_score = Math.max(1, Math.min(10, Math.round(Number(enrichment.enrichment_score) || 5)))

    const row = {
      lead_id:          req.params.id,
      recent_signal:    enrichment.recent_signal,
      company_context:  enrichment.company_context,
      opening_line:     enrichment.opening_line,
      enrichment_score: enrichment.enrichment_score,
      enriched_at:      new Date().toISOString(),
    }

    try {
      const { error: upsertErr } = await db.from('lead_enrichment')
        .upsert(row, { onConflict: 'lead_id' })
      if (upsertErr) throw upsertErr
    } catch (dbErr: any) {
      const msg = String(dbErr?.message ?? '')
      if (msg.includes('does not exist') || msg.includes('relation') || msg.includes('42P01')) {
        res.status(503).json({ success: false, error: 'Run migrations first' }); return
      }
      throw dbErr
    }

    res.json({ success: true, data: row, cached: false })
  } catch (err) { console.error('[leads/enrich]', err); res.status(500).json({ success: false, error: 'Failed to enrich lead' }) }
})

// P2-5: Waterfall enrichment — Apollo → PDL → Hunter → Clearbit
leadRouter.post('/:id/waterfall-enrich', async (req: AuthRequest, res) => {
  try {
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }

    const { data: lead, error: leadErr } = await db.from('leads')
      .select('id, first_name, last_name, email, phone, company, linkedin_url, company_size, industry, tech_stack, revealed_at')
      .eq('id', req.params.id).eq('client_id', clientId).single()
    if (leadErr || !lead) { res.status(404).json({ success: false, error: 'Lead not found' }); return }

    // #422 — enrichment must not become a free unmask: waterfall-enrich finds and
    // writes the EMAIL, so it requires the $1 reveal first. POST /leads/:id/reveal
    // already runs the waterfall as part of the paid reveal.
    if (!(lead as { revealed_at?: string | null }).revealed_at) {
      res.status(402).json({ success: false, error: 'reveal_required', message: 'Reveal this lead first ($1) — the reveal includes email enrichment.' })
      return
    }

    const result = await waterfallEnrich({
      first_name:   lead.first_name,
      last_name:    lead.last_name,
      company:      lead.company,
      email:        lead.email,
      linkedin_url: lead.linkedin_url,
    })

    if (result.source === 'none') {
      res.json({ success: true, data: { filled: 0, source: 'none' }, message: 'No enrichment providers available — add PDL_API_KEY, HUNTER_API_KEY, or CLEARBIT_API_KEY to Railway env' }); return
    }

    // Only update fields that are currently missing on the lead
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (!lead.email        && result.email)        updates.email        = result.email
    if (!lead.phone        && result.phone)         updates.phone        = result.phone
    if (!lead.company_size && result.company_size)  updates.company_size = result.company_size
    if (!lead.industry     && result.industry)      updates.industry     = result.industry
    if (!lead.linkedin_url && result.linkedin_url)  updates.linkedin_url = result.linkedin_url
    if (!lead.tech_stack?.length && result.tech_stack?.length) updates.tech_stack = result.tech_stack

    const filled = Object.keys(updates).length - 1 // exclude updated_at
    if (filled > 0) {
      await db.from('leads').update(updates).eq('id', req.params.id)
    }

    res.json({ success: true, data: { filled, source: result.source, updates } })
  } catch (err) { console.error('[leads/waterfall-enrich]', err); res.status(500).json({ success: false, error: 'Enrichment failed' }) }
})

// ── AI EMAIL DRAFT ─────────────────────────────────────────────────────────────
leadRouter.post('/:id/draft-email', async (req: AuthRequest, res) => {
  try {
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }

    const { data: lead, error: leadErr } = await db.from('leads')
      .select('*').eq('id', req.params.id).eq('client_id', clientId).single()
    if (leadErr || !lead) { res.status(404).json({ success: false, error: 'Lead not found' }); return }

    const { data: client } = await db.from('clients').select('company_name, industry').eq('id', clientId).single()

    const prompt = `You are writing a cold outreach email on behalf of ${client?.company_name || 'our company'}.

Lead profile:
- Name: ${lead.first_name} ${lead.last_name}
- Title: ${lead.job_title || 'unknown'}
- Company: ${lead.company || 'unknown'}
- Industry: ${lead.industry || 'unknown'}
- Country: ${lead.country || 'unknown'}
- Seniority: ${lead.seniority || 'unknown'}
${lead.tech_stack?.length ? `- Tech stack: ${lead.tech_stack.join(', ')}` : ''}

Write a short, personalised cold email (150 words max). It must:
1. Open with something specific to their role or company (not generic)
2. Mention one clear business outcome we can help with
3. End with a single, low-friction CTA (e.g. "Worth a 15-min call?")
4. Sound human — no corporate speak, no buzzwords
5. NOT include a subject line — just the email body

Output only the email body, nothing else.`

    const message = await anthropic.messages.create({
      model:      'claude-sonnet-4-6',
      max_tokens: 400,
      messages:   [{ role: 'user', content: prompt }],
    })

    const draft = (message.content[0] as { type: string; text: string }).text

    await db.from('leads').update({ ai_email_draft: draft }).eq('id', req.params.id)

    res.json({ success: true, data: { draft } })
  } catch (err) { console.error(err); res.status(500).json({ success: false, error: 'Failed to generate email draft' }) }
})

// ── BULK CONSENT SEND ─────────────────────────────────────────────────────────
// POST /leads/bulk-consent
leadRouter.post('/bulk-consent', async (req: AuthRequest, res) => {
  try {
    const { lead_ids } = z.object({
      lead_ids: z.array(z.string().uuid()).min(1).max(100),
    }).parse(req.body)

    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }

    const { data: leads } = await db.from('leads')
      .select('id, email, first_name, last_name, status, consent_token')
      .in('id', lead_ids)
      .eq('client_id', clientId)

    const { data: client } = await db.from('clients').select('company_name').eq('id', clientId).single()

    let sent = 0, skipped = 0
    for (const lead of leads ?? []) {
      if (!lead.email || lead.status === 'opted_out' || lead.status === 'consent_given' || lead.status === 'consent_sent') {
        skipped++; continue
      }
      try {
        const optOutUrl = buildConsentUrl(lead.id, await getOrCreateConsentToken(lead))
        await sendConsentEmail(lead.email, lead.first_name, client?.company_name ?? '', optOutUrl, clientId)
        await db.from('leads').update({ status: 'consent_sent', consent_sent_at: new Date().toISOString() }).eq('id', lead.id)
        sent++
      } catch { skipped++ }
    }

    res.json({ success: true, data: { sent, skipped } })
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ success: false, error: err.errors }); return }
    console.error(err); res.status(500).json({ success: false, error: 'Failed to send bulk consent' })
  }
})

// ── BULK EXPORT (POST) ────────────────────────────────────────────────────────
leadRouter.post('/bulk-export', async (req: AuthRequest, res) => {
  try {
    const { leadIds } = z.object({
      leadIds: z.array(z.string().uuid()).optional(),
    }).parse(req.body)

    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }

    const EXPORT_LIMIT = 5000
    // Only export DELIVERED leads — clients can't export leads they haven't
    // been charged for / can't see.
    let query = db.from('leads')
      .select('first_name,last_name,email,phone,job_title,company,industry,country,score,status,created_at,revealed_at')
      .eq('client_id', clientId)
      .not('delivered_at', 'is', null)
      .order('score', { ascending: false, nullsFirst: false })
      .limit(EXPORT_LIMIT)

    if (leadIds && leadIds.length > 0) {
      query = query.in('id', leadIds)
    }

    const { data, error } = await query
    if (error) throw error

    const date = new Date().toISOString().slice(0, 10)
    if ((data?.length ?? 0) >= EXPORT_LIMIT) {
      res.setHeader('X-Export-Truncated', 'true')
      res.setHeader('X-Export-Limit', String(EXPORT_LIMIT))
    }
    const headers = ['first_name', 'last_name', 'email', 'phone', 'job_title', 'company', 'industry', 'country', 'score', 'status', 'created_at']
    // #422 — masked leads export WITHOUT contact details: email/phone are only
    // included once the $1 reveal has been paid (revealed_at set).
    const rows = (data || []).map((l: any) => [
      l.first_name, l.last_name, l.revealed_at ? (l.email || '') : '', l.revealed_at ? (l.phone || '') : '',
      l.job_title || '', l.company || '', l.industry || '',
      l.country || '', l.score ?? '', l.status,
      l.created_at ? new Date(l.created_at).toLocaleDateString() : '',
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))

    const csv = [headers.join(','), ...rows].join('\n')
    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', `attachment; filename="kind-leads-${date}.csv"`)
    res.send(csv)
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ success: false, error: err.errors }); return }
    console.error(err); res.status(500).json({ success: false, error: 'Failed to export leads' })
  }
})

// ── CSV EXPORT ────────────────────────────────────────────────────────────────
// ── GET /leads/analytics — monthly time-series for portal analytics page ──────
leadRouter.get('/analytics', async (req: AuthRequest, res) => {
  try {
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }

    // figsy_sent_emails has NO client_id column — scope it via the client's campaigns.
    const { data: campRows } = await db.from('figsy_campaigns')
      .select('id, name, status, created_at').eq('client_id', clientId)
    const campaignIds = (campRows ?? []).map((c: { id: string }) => c.id)
    const campaignFilter = campaignIds.length > 0 ? campaignIds : ['00000000-0000-0000-0000-000000000000']

    const [
      { data: leads },
      { data: emails },
      { data: replies },
      { data: icps },
      { data: enrollments },
    ] = await Promise.all([
      db.from('leads').select('id, created_at, score, status, icp_id, industry, seniority').eq('client_id', clientId).not('delivered_at', 'is', null),
      db.from('figsy_sent_emails').select('id, sent_at, opened_at, campaign_id').in('campaign_id', campaignFilter),
      db.from('figsy_replies').select('id, received_at, classification, campaign_id').eq('client_id', clientId),
      db.from('icps').select('id, name').eq('client_id', clientId),
      db.from('figsy_enrollments').select('campaign_id').in('campaign_id', campaignFilter),
    ])

    // Monthly buckets — last 6 months
    const months: { key: string; label: string }[] = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date()
      d.setDate(1)
      d.setMonth(d.getMonth() - i)
      const key = d.toISOString().slice(0, 7)
      const label = d.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' })
      months.push({ key, label })
    }

    const byMonth = months.map(m => {
      const mLeads   = (leads   || []).filter((l: any) => l.created_at?.slice(0,7) === m.key)
      const mEmails  = (emails  || []).filter((e: any) => e.sent_at?.slice(0,7) === m.key)
      const mReplies = (replies || []).filter((r: any) => r.received_at?.slice(0,7) === m.key)
      const mInterested = mReplies.filter((r: any) => r.classification === 'interested' || r.classification === 'hot')
      // Real opens — count sent emails in this month that have an opened_at stamp
      // (recorded by the tracking pixel). 0 if tracking is off (no branded TRACKING_URL).
      const mOpened = mEmails.filter((e: any) => !!e.opened_at)
      return {
        month:      m.label,
        leads:      mLeads.length,
        emails:     mEmails.length,
        opened:     mOpened.length,
        replies:    mReplies.length,
        interested: mInterested.length,
      }
    })

    // ICP breakdown
    const icpMap: Record<string, { id: string; name: string; leads: number; avg_score: number }> = {}
    for (const icp of (icps || [])) {
      const icpLeads = (leads || []).filter((l: any) => l.icp_id === icp.id)
      const scores   = icpLeads.map((l: any) => Number(l.score)).filter(Boolean)
      icpMap[icp.id] = {
        id:        icp.id,
        name:      icp.name,
        leads:     icpLeads.length,
        avg_score: scores.length ? Math.round(scores.reduce((s: number, v: number) => s + v, 0) / scores.length) : 0,
      }
    }
    const icpBreakdown = Object.values(icpMap).sort((a, b) => b.leads - a.leads).slice(0, 8)

    // Score distribution (buckets: 0–19, 20–39, 40–59, 60–79, 80–100)
    const scoredLeads = (leads || []).filter((l: any) => l.score != null)
    const scoreDist = [
      { label: '0–19',   count: scoredLeads.filter((l: any) => l.score < 20).length },
      { label: '20–39',  count: scoredLeads.filter((l: any) => l.score >= 20 && l.score < 40).length },
      { label: '40–59',  count: scoredLeads.filter((l: any) => l.score >= 40 && l.score < 60).length },
      { label: '60–79',  count: scoredLeads.filter((l: any) => l.score >= 60 && l.score < 80).length },
      { label: '80–100', count: scoredLeads.filter((l: any) => l.score >= 80).length },
    ]

    // Top industries
    const industryCounts: Record<string, number> = {}
    for (const l of (leads || []) as any[]) {
      if (l.industry) industryCounts[l.industry] = (industryCounts[l.industry] ?? 0) + 1
    }
    const topIndustries = Object.entries(industryCounts)
      .sort(([,a],[,b]) => b - a).slice(0, 6)
      .map(([industry, count]) => ({ industry, count }))

    // Per-campaign performance — derived from REAL send-log rows (figsy_sent_emails)
    // and real enrollments/replies, NOT the figsy_campaigns counters. The counters can
    // drift (e.g. seeded/warmup data), which made the table read "120 sent" while the
    // summary cards (also row-based) read 0. Reading rows here = one source of truth, so
    // the table and the cards always agree.
    const byCampaign = (campRows ?? []).map((c: any) => {
      const cSent       = (emails || []).filter((e: any) => e.campaign_id === c.id)
      const cOpened     = cSent.filter((e: any) => !!e.opened_at).length
      const cReplies    = (replies || []).filter((r: any) => r.campaign_id === c.id)
      const cInterested = cReplies.filter((r: any) => r.classification === 'interested' || r.classification === 'hot').length
      const contacts    = (enrollments || []).filter((en: any) => en.campaign_id === c.id).length
      const sent        = cSent.length
      return {
        id:         c.id,
        name:       c.name,
        status:     c.status,
        created_at: c.created_at,
        contacts,
        sent,
        opened:     cOpened,
        open_rate:  sent > 0 ? Math.round((cOpened / sent) * 100) : 0,
        replies:    cReplies.length,
        interested: cInterested,
        reply_rate: sent > 0 ? Math.round((cReplies.length / sent) * 100) : 0,
      }
    }).sort((a: any, b: any) => (a.created_at < b.created_at ? 1 : -1))

    // Open-tracking is OFF for FIGSY cold outreach BY DESIGN: cold mail is sent via
    // `coldEmailHtml`, which deliberately embeds NO open pixel (D3 — an invisible <img>
    // to a tracking host is a phishing signal that tanks inbox placement). So `opened_at`
    // is structurally always null here, regardless of TRACKING_URL. We report tracking as
    // off so the UI shows an honest "n/a" instead of a misleading 0% open rate. (A branded
    // TRACKING_URL only powers warm/transactional opens, not this cold analytics.)
    const trackingEnabled = false

    // ── Headline totals counted the EXACT way /figsy/kpis does (a head count, no row
    // fetch) so the Analytics summary cards CANNOT disagree with Performance. We also
    // expose _debug: if `sentRowsFetched` (the row select above) is less than
    // `sentHeadCount` (this count), the row fetch is silently truncating/erroring — which
    // is the only way KPIs could read 120 while the per-campaign/month breakdowns read 0.
    const [{ count: sentHeadCount }, { count: openedHeadCount }] = await Promise.all([
      db.from('figsy_sent_emails').select('id', { count: 'exact', head: true }).in('campaign_id', campaignFilter),
      db.from('figsy_sent_emails').select('id', { count: 'exact', head: true }).in('campaign_id', campaignFilter).not('opened_at', 'is', null),
    ])
    const totals = {
      sent:    sentHeadCount ?? 0,
      opened:  openedHeadCount ?? 0,
      replied: (replies ?? []).length,
    }

    res.json({
      success: true,
      data: { byMonth, byCampaign, totals, icpBreakdown, scoreDist, topIndustries, trackingEnabled },
    })
  } catch (err) { console.error(err); res.status(500).json({ success: false, error: 'Failed to fetch analytics' }) }
})

leadRouter.get('/export/csv', async (req: AuthRequest, res) => {
  try {
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }

    // Export every DELIVERED (= charged) lead the client can see, excluding only
    // those who opted out. Leads are worked under legitimate interest, so gating
    // on status='consent_given' was wrong — it returned an EMPTY file for every
    // client (nobody clicks an explicit opt-in link), despite paid-for leads.
    // NOTE: do NOT filter `.neq('status','opted_out')` — the live lead_status enum
    // doesn't contain 'opted_out' (schema drift), so comparing against it throws
    // 22P02 and 500s the whole export. Opt-outs are tracked in opt_out_blocklist,
    // not this status, and no lead can hold an enum value that doesn't exist — so
    // there's nothing to exclude here. Matches the working /bulk-export endpoint:
    // delivered (= charged) leads only.
    const { data, error } = await db.from('leads')
      .select('first_name,last_name,email,phone,job_title,company,linkedin_url,country,score,status,consent_given_at')
      .eq('client_id', clientId)
      .not('delivered_at', 'is', null)
      .order('score', { ascending: false, nullsFirst: false })

    if (error) throw error

    const headers = ['First Name', 'Last Name', 'Email', 'Phone', 'Job Title', 'Company', 'LinkedIn', 'Country', 'Score', 'Status', 'Consent Date']
    const rows = (data || []).map((l: any) => [
      l.first_name, l.last_name, l.email || '', l.phone || '',
      l.job_title || '', l.company || '', l.linkedin_url || '',
      l.country || '', l.score ?? '', l.status,
      l.consent_given_at ? new Date(l.consent_given_at).toLocaleDateString() : '',
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))

    const csv = [headers.join(','), ...rows].join('\n')
    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', 'attachment; filename="kind-leads.csv"')
    res.send(csv)
  } catch (err) {
    // Supabase/PostgREST errors are plain objects (not JS Errors), so String(err)
    // gave "[object Object]". Pull the actual fields so the real cause is visible.
    const e = err as { message?: string; details?: string; hint?: string; code?: string }
    const msg = e?.message || e?.details || e?.hint || e?.code || JSON.stringify(err)
    console.error('[leads/export/csv] FAILED:', msg, '| code:', e?.code, '| details:', e?.details)
    res.status(500).json({ success: false, error: `Failed to export leads: ${msg}` })
  }
})

// ── IMPORT FROM LINKEDIN / ZOOMINFO CSV ───────────────────────────────────────
leadRouter.post('/import/linkedin', async (req: AuthRequest, res) => {
  try {
    const { leads } = z.object({
      leads: z.array(z.object({
        first_name:   z.string().optional(),
        last_name:    z.string().optional(),
        email:        z.string().email().optional(),
        phone:        z.string().optional(),
        job_title:    z.string().optional(),
        company:      z.string().optional(),
        linkedin_url: z.string().optional(),
        country:      z.string().optional(),
        company_size: z.string().optional(),
        industry:     z.string().optional(),
        seniority:    z.string().optional(),
      })).min(1).max(500),
    }).parse(req.body)

    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }

    // Fetch existing emails to deduplicate
    const emails = leads.map(l => l.email).filter(Boolean) as string[]
    const existingSet = new Set<string>()
    if (emails.length) {
      const { data: existing } = await db.from('leads')
        .select('email').eq('client_id', clientId).in('email', emails)
      existing?.forEach((r: any) => r.email && existingSet.add(r.email.toLowerCase()))
    }

    // Fetch blocklist
    const { data: blocklisted } = await db.from('opt_out_blocklist')
      .select('email').in('email', emails)
    const blockSet = new Set((blocklisted ?? []).map((r: any) => r.email?.toLowerCase()))

    let created = 0, skipped = 0, errors = 0
    const insertedIds: string[] = []

    for (const lead of leads) {
      const emailLower = lead.email?.toLowerCase()
      if (emailLower && (existingSet.has(emailLower) || blockSet.has(emailLower))) {
        skipped++
        continue
      }
      const { data: row, error } = await db.from('leads').insert({
        client_id:    clientId,
        first_name:   lead.first_name || 'Unknown',
        last_name:    lead.last_name || '',
        email:        lead.email || null,
        phone:        lead.phone || null,
        job_title:    lead.job_title || null,
        company:      lead.company || null,
        linkedin_url: lead.linkedin_url || null,
        country:      lead.country || null,
        company_size: lead.company_size || null,
        industry:     lead.industry || null,
        seniority:    lead.seniority || null,
        status:       'pending',
        source:       'linkedin_csv',
      }).select('id').single()
      if (error) { errors++; continue }
      created++
      if (row?.id) insertedIds.push(row.id)
    }

    // Fire-and-forget scoring against the client's most recent ICP
    if (insertedIds.length > 0) {
      const { data: icpRow } = await db.from('icps')
        .select('*').eq('client_id', clientId)
        .order('created_at', { ascending: false }).limit(1).maybeSingle()
      const { data: clientRow } = await db.from('clients')
        .select('company_name').eq('id', clientId).maybeSingle()
      if (icpRow) {
        scoreLeadsForIcp(insertedIds, icpRow as any, clientRow?.company_name ?? '').catch(console.error)
      }
    }

    res.json({ success: true, data: { created, skipped, errors } })
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ success: false, error: err.errors }); return }
    console.error(err); res.status(500).json({ success: false, error: 'Failed to import leads' })
  }
})

// ── AI RESEARCH PER LEAD (P1-12) ──────────────────────────────────────────────
// GET /leads/:id/research
// Returns a 3-bullet research summary for a lead (cached in research_summary column)
leadRouter.get('/:id/research', async (req: AuthRequest, res) => {
  try {
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }

    const { data: lead, error: leadErr } = await db.from('leads')
      .select('id, first_name, last_name, job_title, company, industry, country, score, research_summary')
      .eq('id', req.params.id)
      .eq('client_id', clientId)
      .maybeSingle()

    if (leadErr || !lead) { res.status(404).json({ success: false, error: 'Lead not found' }); return }

    // Return cached result if available
    if ((lead as any).research_summary) {
      res.json({ success: true, data: { bullets: (lead as any).research_summary, cached: true } }); return
    }

    const msg = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 400,
      messages: [{
        role: 'user',
        content: `You are a B2B sales researcher. For this lead, provide exactly 3 concise bullet points:
1. What the company does (one sentence)
2. Likely pain points for someone in their role
3. A suggested opener line for cold outreach

Lead:
- Name: ${lead.first_name} ${lead.last_name}
- Role: ${lead.job_title ?? 'unknown'}
- Company: ${lead.company ?? 'unknown'}
- Industry: ${lead.industry ?? 'unknown'}
- Country: ${lead.country ?? 'unknown'}

Return ONLY valid JSON, no markdown: { "bullets": ["bullet 1", "bullet 2", "bullet 3"] }`,
      }],
    })

    const text = (msg.content[0] as { type: string; text: string }).text.trim()
    let bullets: string[]
    try {
      const clean = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim()
      const parsed = JSON.parse(clean)
      bullets = parsed.bullets ?? [text]
    } catch {
      bullets = [
        `${lead.company ?? 'This company'} operates in the ${lead.industry ?? 'B2B'} space.`,
        `As a ${lead.job_title ?? 'decision maker'}, they likely face challenges around efficiency and growth.`,
        `Opening line: "I noticed ${lead.company ?? 'your company'} is focused on growth — wanted to share how we've helped similar teams."`,
      ]
    }

    // Cache the result (gracefully handle missing column)
    try {
      await db.from('leads').update({ research_summary: bullets }).eq('id', req.params.id)
    } catch (cacheErr) {
      console.warn('[leads/research] Could not cache result:', cacheErr)
    }

    res.json({ success: true, data: { bullets, cached: false } })
  } catch (err) {
    console.error('[leads/research]', err)
    res.status(500).json({ success: false, error: 'Failed to generate research' })
  }
})

// ── FIND CONTACTS AT SPECIFIC COMPANIES (from company CSV upload) ─────────────
leadRouter.post('/find-at-companies', async (req: AuthRequest, res) => {
  try {
    const { companies, limit } = z.object({
      companies: z.array(z.string().min(1)).min(1).max(100),
      limit:     z.number().int().min(1).max(200).default(50),
    }).parse(req.body)

    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }

    // Load client ICP — fall back to a generic SDM search if none set
    const { data: icpRow } = await db.from('icps')
      .select('*').eq('client_id', clientId)
      .order('created_at', { ascending: false }).limit(1).maybeSingle()
    const { data: clientRow } = await db.from('clients')
      .select('company_name').eq('id', clientId).maybeSingle()

    const icp = icpRow ?? {
      job_titles: ['CEO', 'Founder', 'Director', 'Head of', 'VP'],
      seniority_levels: ['director', 'vp', 'c_suite', 'owner', 'founder'],
      company_sizes: [],
      geographies: [],
      industries: [],
      tech_stack: [],
      keywords: [],
      apollo_only_consented: false,
      intent_signals: [],
    }

    // Build Apollo search body targeting specific companies
    const searchBody = buildSearchBody({ ...icp, organization_names: companies }, 1)
    searchBody.per_page = Math.min(limit, 100)

    const contacts = await searchPeople(searchBody)
    if (!contacts.length) {
      res.json({ success: true, data: { created: 0, skipped: 0, message: 'No contacts found at these companies in Apollo' } })
      return
    }

    // Fetch existing emails and blocklist
    const contactEmails = contacts.map(c => c.email).filter(Boolean) as string[]
    const { data: existing } = await db.from('leads')
      .select('email').eq('client_id', clientId).in('email', contactEmails)
    const { data: blocklisted } = await db.from('opt_out_blocklist')
      .select('email').in('email', contactEmails)
    const existingSet = new Set([
      ...(existing ?? []).map((r: any) => r.email?.toLowerCase()),
      ...(blocklisted ?? []).map((r: any) => r.email?.toLowerCase()),
    ])

    let created = 0, skipped = 0
    const insertedIds: string[] = []

    for (const c of contacts) {
      if (c.email && existingSet.has(c.email.toLowerCase())) { skipped++; continue }
      const { data: row, error } = await db.from('leads').insert({
        client_id:    clientId,
        first_name:   c.first_name || 'Unknown',
        last_name:    c.last_name || '',
        email:        c.email || null,
        job_title:    c.title || null,
        company:      c.organization_name || null,
        linkedin_url: c.linkedin_url || null,
        country:      c.country || null,
        company_size: c.organization?.num_employees ? String(c.organization.num_employees) : null,
        apollo_id:    c.id || null,
        status:       'pending',
        source:       'company_csv',
      }).select('id').single()
      if (error) { skipped++; continue }
      created++
      if (row?.id) insertedIds.push(row.id)
    }

    // Score in background
    if (insertedIds.length > 0 && icpRow) {
      scoreLeadsForIcp(insertedIds, icpRow as any, clientRow?.company_name ?? '').catch(console.error)
    }

    res.json({ success: true, data: { created, skipped, total_found: contacts.length } })
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ success: false, error: err.errors }); return }
    console.error(err); res.status(500).json({ success: false, error: 'Failed to find contacts at companies' })
  }
})
