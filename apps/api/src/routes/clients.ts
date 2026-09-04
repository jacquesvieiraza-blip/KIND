import { Router } from 'express'
import { z } from 'zod'
import Anthropic from '@anthropic-ai/sdk'
import { db } from '@kind/db'
import { requireAuth, AuthRequest } from '../middleware/auth'
import { testCrmConnection } from '../lib/crm'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export const clientRouter = Router()
clientRouter.use(requireAuth)

// Lightweight profile check — used by onboard page to skip if already onboarded
clientRouter.get('/me/profile', async (req: AuthRequest, res) => {
  try {
    const { data } = await db.from('clients').select('id, company_name').eq('user_id', req.userId!).maybeSingle()
    res.json({ success: true, data: data ?? null })
  } catch { res.json({ success: true, data: null }) }
})

clientRouter.get('/me', async (req: AuthRequest, res) => {
  try {
    const { data: client, error } = await db.from('clients').select('*, subscriptions(*), usage_metrics(*), auto_topup_enabled, auto_topup_threshold, auto_topup_plan, auto_topup_bundle_size').eq('user_id', req.userId!).single()
    if (error || !client) { res.status(404).json({ success: false, error: 'Client not found' }); return }
    res.json({ success: true, data: client })
  } catch (err) { console.error(err); res.status(500).json({ success: false, error: 'Failed to fetch client' }) }
})

clientRouter.get('/me/usage', async (req: AuthRequest, res) => {
  try {
    const { data: client, error: clientErr } = await db
      .from('clients')
      .select('id, subscriptions(current_period_start, current_period_end)')
      .eq('user_id', req.userId!)
      .single()
    if (clientErr || !client) { res.status(404).json({ success: false, error: 'Client not found' }); return }

    const clientId = client.id
    const sub = Array.isArray(client.subscriptions)
      ? client.subscriptions[0]
      : client.subscriptions

    const now = new Date()
    let periodStart: string
    let periodEnd: string

    if (sub?.current_period_start) {
      periodStart = sub.current_period_start
      periodEnd = sub.current_period_end ?? new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString()
    } else {
      periodStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
      periodEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString()
    }

    // Guard: a subscription whose current_period_start is in the FUTURE (renewed
    // sub, or Stripe set it ahead) would make every past delivery fall outside the
    // window → "Leads used: 0" while credits show spend. Clamp to month-start.
    if (new Date(periodStart) > now) {
      periodStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    }

    // Count by delivered_at, not created_at: a client is charged a credit the
    // moment a lead is *delivered*, so "leads used this period" must mirror that
    // to reconcile with credits-used. Counting created_at undercounts Revival
    // leads (recycled from a prior run, old created_at) that are re-delivered
    // and re-charged this period — they'd show "0 used" after paying for them.
    // Count every lead DELIVERED (and therefore charged) this period — including
    // ones later opted out: the client still paid for them, so excluding them made
    // "leads used" drop below "credits used".
    const { count } = await db.from('leads')
      .select('id', { count: 'exact', head: true })
      .eq('client_id', clientId)
      .not('delivered_at', 'is', null)
      .gte('delivered_at', periodStart)

    const INCLUDED = 100
    const leadsThisPeriod = count ?? 0
    const overageLeads    = Math.max(0, leadsThisPeriod - INCLUDED)

    // #385 — real month-to-date per-lead spend by wallet, from the FULL ledger (the
    // portal previously summed the /credits 50-row slice, which under-reports any client
    // with >50 rows this month). Each reveal/FIGSY charge is one -1 usage row, so the
    // row count = credits spent. reveal → plan 'lead_gen' ($1) · FIGSY → plan 'figsy' ($3).
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const [{ count: revealCount }, { count: figsyCount }] = await Promise.all([
      db.from('credit_transactions').select('id', { count: 'exact', head: true })
        .eq('client_id', clientId).eq('plan', 'lead_gen').eq('type', 'usage').lt('amount', 0).gte('created_at', monthStart),
      db.from('credit_transactions').select('id', { count: 'exact', head: true })
        .eq('client_id', clientId).eq('plan', 'figsy').eq('type', 'usage').lt('amount', 0).gte('created_at', monthStart),
    ])

    res.json({
      success: true,
      data: {
        leads_this_period: leadsThisPeriod,
        period_start:      periodStart,
        period_end:        periodEnd,
        included_leads:    INCLUDED,
        overage_leads:     overageLeads,
        reveals_this_month: revealCount ?? 0,
        figsy_this_month:   figsyCount ?? 0,
      },
    })
  } catch (err) { console.error(err); res.status(500).json({ success: false, error: 'Failed to fetch usage' }) }
})

// ── #615 — THE COMPANY DETAILS STEP (VAT evidence) ───────────────────────────────────────
//
// Founder-ruled 4 Aug: *"as part of onboarding we capture their company information… all
// clients."* We are a UK Ltd; for a BUSINESS customer the place of supply is where the customer
// belongs, so an overseas business is outside UK VAT — **but only if we hold proof they are a
// business.** No proof means consumer treatment, which means 20%.
//
// ⚠️ THIS GATES ONBOARDING COMPLETION AND NOTHING ELSE. It must never gate an approval, a
// payment or a send: every client who signed up before this existed has empty fields, and
// locking them out of the product they pay for over a form would be a far worse bug than the
// one it fixes. Where enforcement goes beyond onboarding is a founder decision, deliberately
// not taken in code.
clientRouter.post('/company-details', async (req: AuthRequest, res) => {
  try {
    const { parseCompanyDetails } = await import('@kind/shared')
    const parsed = parseCompanyDetails(req.body ?? {})
    if (!parsed.ok) { res.status(400).json({ success: false, errors: parsed.errors }); return }

    const { data: client } = await db.from('clients').select('id').eq('user_id', req.userId!).maybeSingle()
    if (!client) { res.status(404).json({ success: false, error: 'Client not found' }); return }

    // CHECKED, not swallowed (#349) — an unchecked update here would report details saved that
    // were never written, and the next invoice would be wrong for a reason nobody could see.
    const { error } = await db.from('clients').update({
      company_name:         parsed.value.company_name,
      company_registration: parsed.value.company_registration,
      vat_number:           parsed.value.vat_number,
    }).eq('id', client.id)
    if (error) { res.status(500).json({ success: false, error: `Your company details were NOT saved: ${error.message}` }); return }

    res.json({ success: true, data: parsed.value })
  } catch (err) {
    console.error('[clients/company-details]', err)
    res.status(500).json({ success: false, error: 'Could not save your company details' })
  }
})

clientRouter.patch('/me', async (req: AuthRequest, res) => {
  try {
    const body = z.object({
      company_name:      z.string().min(2).optional(),
      industry:          z.string().optional(),
      country:           z.string().optional(),
      website:           z.string().url().optional().or(z.literal('')),
      phone:             z.string().optional(),
      // #615 — kept OPTIONAL on this general-purpose PATCH on purpose. The required-ness
      // belongs to the ONBOARDING step (POST /clients/company-details), not to every partial
      // settings save: making them mandatory here would break every existing client the first
      // time they changed their phone number.
      company_registration: z.string().optional(),
      vat_number:           z.string().optional(),
      crm_type:          z.enum(['hubspot', 'pipedrive', 'none']).optional(),
      crm_api_key:       z.string().optional(),
      crm_sync_enabled:  z.boolean().optional(),
      crm_dedup_enabled: z.boolean().optional(), // never cold-email existing CRM contacts

      leads_per_run:     z.number().int().min(1).optional(),
      daily_drip_rate:   z.number().int().min(1).optional(),
      // Booking link (Calendly / Cal.com / Google) that FIGSY emails offer leads.
      booking_url:       z.string().url().optional().or(z.literal('')),
      // P-a: exact name FIGSY signs outreach as. Activates after migration 012
      // (clients.signer_name); the portal form must not send this until then.
      signer_name:       z.string().max(120).optional().or(z.literal('')),
      // R2 (#27): opt in/out of Milla's daily morning brief. Honoured by the
      // morning-brief cron (apps/api/src/routes/internal.ts).
      daily_brief_enabled: z.boolean().optional(),
      // ⚑ 31 Aug (BUILD-004A-2D, founder decision D1) — the two switches that were labelled
      // "Soon" while their crons sent every week. They are preferences the SERVER has to read,
      // so they cannot live in localStorage the way the other panel rows did: the thing that
      // must obey them is a cron, and a cron cannot open a browser. Honoured at the send site
      // in `internal.ts` via `mayNotify` (`lib/programme-notifications.ts`).
      campaign_paused_emails_enabled: z.boolean().optional(),
      weekly_digest_enabled:          z.boolean().optional(),
    }).parse(req.body)
    // Upsert: creates the row if none exists (partner accounts have no client row by default)
    const { data, error } = await db.from('clients')
      .upsert({ ...body, user_id: req.userId! }, { onConflict: 'user_id' })
      .select()
      .single()
    if (error) throw error
    res.json({ success: true, data })
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ success: false, error: err.errors }); return }
    console.error(err); res.status(500).json({ success: false, error: 'Update failed' })
  }
})

clientRouter.post('/me/crm/test', async (req: AuthRequest, res) => {
  try {
    const { crm_type, crm_api_key } = z.object({
      crm_type:    z.enum(['hubspot', 'pipedrive']),
      crm_api_key: z.string().min(1),
    }).parse(req.body)
    const result = await testCrmConnection(crm_type, crm_api_key)
    res.json({ success: result.success, error: result.error })
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ success: false, error: err.errors }); return }
    console.error(err); res.status(500).json({ success: false, error: 'Test failed' })
  }
})

clientRouter.patch('/me/auto-topup', async (req: AuthRequest, res) => {
  try {
    const body = z.object({
      auto_topup_enabled:     z.boolean(),
      auto_topup_threshold:   z.number().int().min(0).max(500),
      auto_topup_plan:        z.enum(['kind_ai', 'figsy']).optional(),
      auto_topup_bundle_size: z.number().int().positive().optional(),
    }).parse(req.body)
    const { data: client } = await db.from('clients').select('id').eq('user_id', req.userId!).single()
    if (!client) { res.status(404).json({ success: false, error: 'Client not found' }); return }
    await db.from('clients').update(body).eq('id', client.id)
    res.json({ success: true })
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ success: false, error: err.errors }); return }
    console.error(err); res.status(500).json({ success: false, error: 'Failed to save auto top-up settings' })
  }
})

// POST /clients/me/suggest-icp — AI-generated ICP suggestions based on client profile
clientRouter.post('/me/suggest-icp', async (req: AuthRequest, res) => {
  try {
    const { data: client, error } = await db.from('clients')
      .select('company_name, industry, country, website')
      .eq('user_id', req.userId!)
      .single()
    if (error || !client) { res.status(404).json({ success: false, error: 'Client not found' }); return }

    const context = [
      client.company_name ? `Company: ${client.company_name}` : '',
      client.industry     ? `Industry: ${client.industry}` : '',
      client.country      ? `Country: ${client.country}` : '',
      client.website      ? `Website: ${client.website}` : '',
    ].filter(Boolean).join('\n')

    const msg = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 500,
      messages: [{
        role: 'user',
        content: `You are a B2B sales expert. Based on this company profile, suggest an Ideal Customer Profile (ICP) for their outreach.\n\n${context}\n\nRespond ONLY with valid JSON in this exact shape (no markdown, no explanation):\n{\n  "name": "string — short ICP name e.g. 'SA Fintech CTOs'",\n  "industries": ["up to 3 target industries"],\n  "job_titles": ["3-5 specific job titles to target"],\n  "seniority_levels": ["2-3 from: C-Suite, VP / Director, Head of, Manager, Senior, Individual Contributor"],\n  "company_sizes": ["2-3 from: 1–10, 11–50, 51–200, 201–500, 501–1,000, 1,000+"],\n  "geographies": ["1-3 countries/regions"],\n  "keywords": ["2-3 buying signal keywords"]\n}`,
      }],
    })

    const raw = (msg.content[0] as { type: string; text: string }).text
      .trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '')
    const suggestion = JSON.parse(raw)
    res.json({ success: true, data: suggestion })
  } catch (err) {
    console.error('[clients/suggest-icp]', err)
    res.status(500).json({ success: false, error: 'Failed to generate suggestion' })
  }
})

clientRouter.get('/me/notifications', async (req: AuthRequest, res) => {
  try {
    const { data: client } = await db.from('clients')
      .select('id, credit_balance, company_id, seat_role, subscriptions(status, trial_ends_at)')
      .eq('user_id', req.userId!).single()
    if (!client) { res.json({ success: true, data: [] }); return }

    const notifications: { id: string; type: string; title: string; message: string; created_at: string }[] = []
    const now = new Date()

    // Low credits
    //
    // ── ⚑ R87 — A PROGRAMME CUSTOMER NEVER SEES THE RETIRED WALLET NUDGE ─────────────────
    //
    // 🛑 THIS IS A LOW-CREDIT PATH THAT SENDS NO EMAIL, WHICH IS EXACTLY WHY IT WAS MISSED.
    // The two email sweeps in `internal.ts` were fenced; this one renders the same retired
    // sentence — "Top up to keep outreach running" — inside the product, to a customer whose
    // own billing page says they are on a programme and owe nothing. Fencing only the paths
    // that happen to use `resend` would have left the contradiction on screen.
    //
    // Same helper, same fail-closed asymmetry: an unreadable programme state withholds the
    // notice rather than showing a programme customer a credit balance they do not spend.
    const { mayNotify, programmeClientIds } = await import('../lib/programme-notifications')
    const onProgrammeIds = await programmeClientIds([client.id as string])
    const onProgramme = onProgrammeIds === null ? null : onProgrammeIds.has(client.id as string)
    if ((client.credit_balance ?? 0) < 10 && mayNotify('low_credits', { onProgramme })) {
      notifications.push({ id: 'low_credits', type: 'low_credits', title: 'Low credit balance', message: `You have ${client.credit_balance ?? 0} credits remaining. Top up to keep outreach running.`, created_at: now.toISOString() })
    }

    // Interested replies in last 7 days
    const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000).toISOString()
    const { data: interestedReplies } = await db.from('figsy_replies')
      .select('id, from_email, received_at')
      .eq('client_id', client.id)
      .in('classification', ['hot', 'interested'])
      .gte('received_at', sevenDaysAgo)
      .order('received_at', { ascending: false })
      .limit(5)
    for (const r of interestedReplies ?? []) {
      notifications.push({ id: `reply_${r.id}`, type: 'interested_reply', title: 'Interested reply', message: `${r.from_email} replied positively to your outreach.`, created_at: r.received_at })
    }

    // New consented leads in last 48h
    const twoDaysAgo = new Date(now.getTime() - 48 * 3600000).toISOString()
    const { count: newConsented } = await db.from('leads')
      .select('id', { count: 'exact', head: true })
      .eq('client_id', client.id)
      .eq('status', 'consent_given')
      .gte('consent_given_at', twoDaysAgo)
    if ((newConsented ?? 0) > 0) {
      notifications.push({ id: 'new_consented', type: 'new_consented_lead', title: `${newConsented} new consented lead${newConsented === 1 ? '' : 's'}`, message: 'New leads have given POPIA consent and are ready for outreach.', created_at: now.toISOString() })
    }

    // Trial expiring
    const subs = (client as any).subscriptions ?? []
    const trialing = subs.find((s: any) => s.status === 'trialing' && s.trial_ends_at)
    if (trialing) {
      const daysLeft = Math.ceil((new Date(trialing.trial_ends_at).getTime() - now.getTime()) / 86400000)
      if (daysLeft <= 3 && daysLeft >= 0) {
        notifications.push({ id: 'trial_expiring', type: 'trial_expiring', title: 'Trial expiring soon', message: `Your trial ends in ${daysLeft} day${daysLeft === 1 ? '' : 's'}. Add billing to keep access.`, created_at: now.toISOString() })
      }
    }

    // #109 — Company Engine owner↔rep notifications. Derived on-read from the
    // existing seat_credit_requests table (same pattern as every notification
    // above — no notifications table, no migration). Two directions:
    //   • owner / manager → a rep's pending credit request needs a decision
    //   • rep            → their request was approved/denied (last 7 days)
    // ⛓️ 4 Sep — 🛑 AND THE BELL IS A COMMAND CENTRE SURFACE TOO. These notifications say
    // "requested +5,000 credits. Approve or deny in the Command Centre" and "Credit request
    // approved" — retired-model actions, delivered to a customer who no longer has a wallet,
    // pointing at a panel that is now correctly empty for them. Suppressing the panel while
    // the bell still announces the same rows would be the roster/drill-down contradiction
    // again, one surface further out (R98).
    //
    // ⚠️ THE GATE IS THE SAME AUTHORITY AND FAILS CLOSED — a manager gate resolves the
    // COMPANY (any programme seat retires the shared surface, mirroring `/overview`), a rep
    // gate resolves their own seat. Nothing is deleted; these are derived on read.
    const creditNotificationsAllowed = async (): Promise<boolean> => {
      const { currentOutreachLeads } = await import('../lib/current-outreach')
      const seatOk = async (id: string) => (await currentOutreachLeads(id)).mode === 'client'
      const isMgr = (client as any).seat_role === 'owner' || (client as any).seat_role === 'manager'
      if (!isMgr) return seatOk(client.id)
      const { data, error } = await db.from('clients')
        .select('id').eq('company_id', (client as any).company_id).eq('seat_role', 'rep')
      if (error) return false
      for (const r of (data ?? []) as Array<{ id: string }>) if (!(await seatOk(r.id))) return false
      return true
    }

    if ((client as any).company_id && await creditNotificationsAllowed()) {
      const companyId = (client as any).company_id
      const isManager = (client as any).seat_role === 'owner' || (client as any).seat_role === 'manager'
      const sevenDaysAgoIso = new Date(now.getTime() - 7 * 86400000).toISOString()

      if (isManager) {
        // Owner/manager: every pending credit request across the company. Rep
        // names are resolved with a second query (same style as company/overview),
        // avoiding any PostgREST embed-relationship ambiguity.
        const { data: pending } = await db.from('seat_credit_requests')
          .select('id, rep_client_id, amount, created_at')
          .eq('company_id', companyId).eq('status', 'pending')
          .order('created_at', { ascending: false }).limit(10)
        const repIds = Array.from(new Set((pending ?? []).map((r: any) => r.rep_client_id).filter(Boolean)))
        const repName: Record<string, string> = {}
        if (repIds.length) {
          const { data: repRows } = await db.from('clients')
            .select('id, invited_email, company_name').in('id', repIds)
          for (const rr of (repRows ?? []) as any[]) repName[rr.id] = rr.invited_email || rr.company_name || 'A rep'
        }
        for (const r of (pending ?? []) as any[]) {
          const who = repName[r.rep_client_id] || 'A rep'
          notifications.push({ id: `credit_request_${r.id}`, type: 'credit_request', title: 'Credit request', message: `${who} requested +${(r.amount ?? 0).toLocaleString()} credits. Approve or deny in the Command Centre.`, created_at: r.created_at })
        }
      } else {
        // Rep: their own requests that were decided in the last 7 days.
        const { data: decided } = await db.from('seat_credit_requests')
          .select('id, amount, status, decided_at')
          .eq('rep_client_id', client.id).in('status', ['approved', 'denied'])
          .gte('decided_at', sevenDaysAgoIso)
          .order('decided_at', { ascending: false }).limit(10)
        for (const r of (decided ?? []) as any[]) {
          const approved = r.status === 'approved'
          notifications.push({
            id: `credit_decision_${r.id}`,
            type: approved ? 'credit_approved' : 'credit_denied',
            title: approved ? 'Credit request approved' : 'Credit request declined',
            message: approved
              ? `Your request for +${(r.amount ?? 0).toLocaleString()} credits was approved — they're in your balance.`
              : `Your request for +${(r.amount ?? 0).toLocaleString()} credits was declined. Reach out to your owner for more.`,
            created_at: r.decided_at ?? now.toISOString(),
          })
        }
      }
    }

    // Sort by created_at desc
    notifications.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    res.json({ success: true, data: notifications })
  } catch (err) { console.error(err); res.status(500).json({ success: false, data: [] }) }
})

// ── Web Push (PWA notifications) ────────────────────────────────────────────
// GET /clients/push/vapid-key — the public key the browser needs to subscribe.
// Returns enabled:false when VAPID keys are not configured, so the UI hides
// the "enable notifications" prompt rather than erroring.
clientRouter.get('/push/vapid-key', (_req, res) => {
  const key = process.env.VAPID_PUBLIC_KEY
  res.json({ success: true, data: { enabled: Boolean(key), publicKey: key ?? null } })
})

// POST /clients/me/push-subscribe — store a browser push subscription.
// Body: { endpoint, keys: { p256dh, auth } }
clientRouter.post('/me/push-subscribe', async (req: AuthRequest, res) => {
  try {
    const sub = z.object({
      endpoint: z.string().url(),
      keys: z.object({ p256dh: z.string(), auth: z.string() }),
    }).parse(req.body)
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }

    const { error } = await db.from('push_subscriptions').upsert({
      client_id: clientId,
      endpoint: sub.endpoint,
      p256dh: sub.keys.p256dh,
      auth: sub.keys.auth,
    }, { onConflict: 'endpoint' })
    if (error) { res.status(500).json({ success: false, error: error.message }); return }
    res.json({ success: true })
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ success: false, error: err.errors }); return }
    res.status(500).json({ success: false, error: 'Failed to save subscription' })
  }
})

// POST /clients/me/push-unsubscribe — remove a browser push subscription.
clientRouter.post('/me/push-unsubscribe', async (req: AuthRequest, res) => {
  try {
    const { endpoint } = z.object({ endpoint: z.string() }).parse(req.body)
    await db.from('push_subscriptions').delete().eq('endpoint', endpoint).then(() => {}, () => {})
    res.json({ success: true })
  } catch {
    res.json({ success: true })
  }
})

async function getClientId(userId: string): Promise<string | null> {
  const { data } = await db.from('clients').select('id').eq('user_id', userId).single()
  return data?.id ?? null
}

clientRouter.get('/referrals', async (req: AuthRequest, res) => {
  try {
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }

    const { data: referrals } = await db.from('clients')
      .select('id, company_name, created_at, subscriptions(status)')
      .eq('referred_by', clientId)
      .order('created_at', { ascending: false })

    const mapped = (referrals ?? []).map((r: any) => {
      const subs = r.subscriptions ?? []
      const hasActive = subs.some((s: any) => s.status === 'active')
      const hasTrial  = subs.some((s: any) => s.status === 'trialing')
      const status = hasActive ? 'paying' : hasTrial ? 'trial' : 'churned'
      return { id: r.id, company_name: r.company_name, status, created_at: r.created_at }
    })

    res.json({ success: true, data: mapped })
  } catch (err) { console.error(err); res.status(500).json({ success: false, error: 'Failed to fetch referrals' }) }
})


// ── P3-3: IN-PORTAL MESSAGING ─────────────────────────────────────────────────
clientRouter.get('/messages', async (req: AuthRequest, res) => {
  try {
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }
    const { data } = await db.from('client_messages')
      .select('id, content, sender_type, created_at, read_at')
      .eq('client_id', clientId)
      .order('created_at', { ascending: true })
      .limit(200)
    res.json({ success: true, data: data ?? [] })
  } catch (err) { console.error(err); res.status(500).json({ success: false, error: 'Failed to fetch messages' }) }
})

clientRouter.post('/messages', async (req: AuthRequest, res) => {
  try {
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }
    const { content } = z.object({ content: z.string().min(1).max(2000) }).parse(req.body)
    const { data, error } = await db.from('client_messages').insert({
      client_id: clientId,
      content,
      sender_type: 'client',
    }).select('id, content, sender_type, created_at, read_at').single()
    if (error) throw error
    res.json({ success: true, data })
  } catch (err) { console.error(err); res.status(500).json({ success: false, error: 'Failed to send message' }) }
})
