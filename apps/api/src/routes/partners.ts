/**
 * Partner programme routes
 *
 * Public:
 *   POST /partners/apply          — submit a partner application
 *   GET  /partners/ref/:code      — validate a referral code
 *
 * Admin (x-admin-key required):
 *   GET   /partners/admin/list                        — all partners with stats
 *   PATCH /partners/admin/:partnerId/approve          — approve a partner
 *   POST  /partners/admin/:partnerId/commission       — record a commission
 *   GET   /partners/admin/:partnerId/dashboard        — full partner dashboard
 */

import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { db } from '@kind/db'
import { Resend } from 'resend'
import { requireAuth, AuthRequest } from '../middleware/auth'
import { runIcpJob } from './icps'
import { adminKeyValid } from './admin'
import { sendFounderAlert } from '../lib/alerts'
import { partnerDocuments } from '../lib/partner-documents'
import { RATES } from '../lib/comp-engine'

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null
const FROM   = 'K.I.N.D <hello@get-kind.com>'

export const partnersRouter = Router()

// ── Admin key guard ───────────────────────────────────────────────────────────

function requireAdminKey(req: Request, res: Response, next: () => void) {
  // #402 (AR-65) — constant-time compare (no char-by-char timing side-channel).
  if (!adminKeyValid(req.headers['x-admin-key'])) {
    res.status(401).json({ success: false, error: 'Unauthorized' })
    return
  }
  next()
}

// ── Sandbox helpers ───────────────────────────────────────────────────────────

async function provisionPartnerSandbox(partner: { id: string; name: string; email: string; referral_code: string | null }) {
  const suffix = Math.random().toString(36).slice(2, 10)
  const sandboxEmail    = `sandbox-${partner.referral_code ?? suffix}@kind-demo.internal`
  const sandboxPassword = `Demo${suffix}!`
  const expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()

  const { data: userData, error: userErr } = await db.auth.admin.createUser({
    email: sandboxEmail, password: sandboxPassword, email_confirm: true,
  })
  if (userErr) throw new Error(`Sandbox auth user creation failed: ${userErr.message}`)
  const userId = userData.user!.id

  const { data: client, error: clientErr } = await db.from('clients').insert({
    user_id:            userId,
    company_name:       `K.I.N.D Demo — ${partner.name}`,
    industry:           'SaaS',
    country:            'South Africa',
    credit_balance:     100,
    onboarded_at:       new Date().toISOString(),
    is_demo:            true,
    demo_prospect_name: 'Demo Prospect',
    demo_created_by:    `partner:${partner.name}`,
    demo_expires_at:    expiresAt,
  }).select('id').single()
  if (clientErr) throw new Error(`Sandbox client insert failed: ${clientErr.message}`)
  const clientId = client.id

  // #349 — these four rows ARE the sandbox: every product page gates on an active
  // subscription, so a swallowed failure hands the partner a demo environment where the
  // thing they're demoing shows the locked/upgrade state. Fail loudly like the client and
  // ICP inserts above — the caller reports the failure instead of emailing "your sandbox
  // is ready" about a sandbox that isn't.
  for (const product of ['lead_gen', 'lead_gen_figsy', 'virtual_assistant', 'chatbot']) {
    const { error: subErr } = await db.from('subscriptions').insert({
      client_id:            clientId,
      product,
      tier:                 'starter',
      status:               'active',
      billing_interval:     'monthly',
      current_period_start: new Date().toISOString(),
      current_period_end:   expiresAt,
    })
    if (subErr) throw new Error(`Sandbox ${product} subscription insert failed: ${subErr.message}`)
  }

  const { data: icp, error: icpErr } = await db.from('icps').insert({
    client_id:       clientId,
    name:            'Demo ICP — SaaS Decision Makers',
    industries:      ['SaaS'],
    geographies:     ['South Africa'],
    seniority_levels: ['C-Suite', 'VP / Director', 'Head of'],
    company_sizes:   ['11–50', '51–200', '201–500'],
    job_titles:      [],
    tech_stack:      [],
    keywords:        ['SaaS', 'B2B software', 'growth'],
  }).select('id').single()
  if (icpErr) throw new Error(`Sandbox ICP insert failed: ${icpErr.message}`)

  runIcpJob(icp.id, clientId, userId).catch(err =>
    console.error('[partner/sandbox] ICP job failed:', err)
  )

  // #349 — demo_env_id is the only link from the partner back to the sandbox they were
  // given. Lost, the sandbox is orphaned: the partner dashboard shows no environment and
  // the next request builds a SECOND one (another client, another four subscriptions).
  const { error: linkErr } = await db.from('partners')
    .update({ demo_env_id: clientId }).eq('id', partner.id)
  if (linkErr) throw new Error(`Sandbox built but not linked to the partner: ${linkErr.message}`)

  return { clientId, userId, sandboxEmail, expiresAt }
}

async function sendSandboxReadyEmail(partner: { name: string; email: string }, expiresAt: string) {
  if (!resend) return
  const PARTNERS_FROM = 'K.I.N.D Partners <partners@get-kind.com>'
  const portalUrl = process.env.PORTAL_URL || 'https://app.get-kind.com'
  const expiryLabel = new Date(expiresAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

  await resend.emails.send({
    from:    PARTNERS_FROM,
    to:      partner.email,
    subject: `Your K.I.N.D demo sandbox is ready`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#111">
        <div style="background:#7C3AED;border-radius:12px 12px 0 0;padding:28px 32px">
          <p style="color:#fff;font-size:0.75rem;letter-spacing:0.08em;text-transform:uppercase;margin:0 0 8px">K.I.N.D Partner Programme</p>
          <h1 style="color:#fff;font-size:1.5rem;font-weight:800;margin:0">Your demo sandbox is live.</h1>
        </div>
        <div style="background:#fff;border:1px solid #e9e9e9;border-top:none;border-radius:0 0 12px 12px;padding:28px 32px">
          <p style="font-size:0.95rem;color:#444;margin:0 0 20px">
            Hi ${partner.name}, your K.I.N.D demo environment is set up and ready to use. Log into your partner portal to access it.
          </p>
          <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #f0f0f0;border-radius:8px;overflow:hidden;margin-bottom:24px">
            <tr>
              <td style="padding:10px 16px;background:#f9fafb;font-size:0.8rem;color:#888;width:140px">What's inside</td>
              <td style="padding:10px 16px;font-size:0.9rem">Pre-loaded SaaS leads, active ICP, all 4 products on Starter plan</td>
            </tr>
            <tr>
              <td style="padding:10px 16px;background:#f9fafb;font-size:0.8rem;color:#888">Credits</td>
              <td style="padding:10px 16px;font-size:0.9rem">100 credits — enough to run a full demo</td>
            </tr>
            <tr>
              <td style="padding:10px 16px;background:#f9fafb;font-size:0.8rem;color:#888">Expires</td>
              <td style="padding:10px 16px;font-size:0.9rem">${expiryLabel} (90 days)</td>
            </tr>
          </table>
          <a href="${portalUrl}/dashboard/partner" style="display:inline-block;background:#7C3AED;color:#fff;font-size:0.9rem;font-weight:600;padding:12px 24px;border-radius:8px;text-decoration:none;margin-bottom:24px">
            Go to Partner Hub →
          </a>
          <p style="font-size:0.85rem;color:#aaa;border-top:1px solid #f0f0f0;padding-top:16px;margin:0">
            In your Partner Hub you'll find a "Demo Sandbox" section with a one-click login link to show prospects the full K.I.N.D experience.
          </p>
        </div>
      </div>`,
  }).catch(err => console.error('[partner/sandbox] sandbox ready email error:', err))
}

async function sendPartnerDripEmail(partner: { name: string; email: string; referral_code: string | null }, day: 2 | 7 | 14) {
  if (!resend) return
  const PARTNERS_FROM = 'K.I.N.D Partners <partners@get-kind.com>'
  const portalUrl = process.env.PORTAL_URL || 'https://app.get-kind.com'
  const refLink = partner.referral_code ? `https://get-kind.com?ref=${partner.referral_code}` : 'https://get-kind.com'

  const emails: Record<number, { subject: string; heading: string; body: string; cta_label: string; cta_url: string }> = {
    2: {
      subject: 'Your demo sandbox is ready — here\'s how to use it',
      heading: 'Walk a prospect through K.I.N.D in 10 minutes',
      body: `Your demo sandbox is pre-loaded with SaaS leads, an active ICP, and 100 credits. The fastest way to convert a prospect is to log them into it and let them see a campaign running in real time.`,
      cta_label: 'Open your Partner Hub',
      cta_url: `${portalUrl}/dashboard/partner`,
    },
    7: {
      subject: 'Have you registered your first deal yet?',
      heading: 'Lock in 60-day protection on your first prospect',
      body: `Once you register a deal, no other partner can claim that prospect for 60 days. It takes 30 seconds. If you've had any conversations this week, register them now before they expire.`,
      cta_label: 'Register a deal',
      cta_url: `${portalUrl}/dashboard/partner`,
    },
    14: {
      subject: 'How\'s it going? Your referral link is ready to share',
      heading: '14 days in — let\'s get your first referral',
      body: `The simplest way to earn is to share your referral link with anyone who runs outbound sales. Every sign-up through your link earns you ${partner.referral_code ? '20%' : '20%'} recurring commission — forever, as long as they stay a client.`,
      cta_label: 'Copy your referral link',
      cta_url: refLink,
    },
  }

  const e = emails[day]
  await resend.emails.send({
    from:    PARTNERS_FROM,
    to:      partner.email,
    subject: e.subject,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#111">
        <div style="background:#7C3AED;border-radius:12px 12px 0 0;padding:24px 32px">
          <p style="color:#fff;font-size:0.75rem;letter-spacing:0.08em;text-transform:uppercase;margin:0 0 8px">K.I.N.D Partner Programme</p>
          <h1 style="color:#fff;font-size:1.4rem;font-weight:800;margin:0">Hi ${partner.name} — ${e.heading}</h1>
        </div>
        <div style="background:#fff;border:1px solid #e9e9e9;border-top:none;border-radius:0 0 12px 12px;padding:28px 32px">
          <p style="font-size:0.95rem;color:#444;margin:0 0 24px">${e.body}</p>
          <a href="${e.cta_url}" style="display:inline-block;background:#7C3AED;color:#fff;font-size:0.9rem;font-weight:600;padding:12px 24px;border-radius:8px;text-decoration:none">
            ${e.cta_label} →
          </a>
          <p style="font-size:0.85rem;color:#aaa;border-top:1px solid #f0f0f0;padding-top:16px;margin-top:24px">
            Questions? Reply to this email or contact <a href="mailto:partners@get-kind.com" style="color:#7C3AED">partners@get-kind.com</a>
          </p>
        </div>
      </div>`,
  }).catch(err => console.error(`[partner/drip] day ${day} email error:`, err))
}

// ── POST /partners/apply ──────────────────────────────────────────────────────

partnersRouter.post('/apply', async (req: Request, res: Response) => {
  try {
    const body = z.object({
      name:             z.string().min(1),
      email:            z.string().email(),
      company:          z.string().optional(),
      partner_type:     z.enum(['referral', 'agency', 'technology']),
      message:          z.string().optional(),
      agreed_to_contract: z.boolean().optional(),
    }).parse(req.body)

    if (!body.agreed_to_contract) {
      res.status(400).json({ success: false, error: 'You must accept the Partner Agreement to apply.' })
      return
    }

    const { error } = await db
      .from('partners')
      .insert({
        name:               body.name,
        email:              body.email,
        company:            body.company ?? null,
        partner_type:       body.partner_type,
        notes:              body.message ?? null,
        status:             'pending',
        contract_signed_at: new Date().toISOString(),
        contract_version:   'v1.0',
      })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        res.status(409).json({ success: false, error: 'An application with this email already exists.' })
        return
      }
      throw error
    }

    // Notify founder
    const founderEmail = process.env.FOUNDER_EMAIL
    if (founderEmail && resend) {
      await resend.emails.send({
        from:    FROM,
        to:      founderEmail,
        subject: `New partner application — ${body.name} (${body.partner_type})`,
        html: `
          <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#111">
            <h2 style="margin-bottom:4px">New Partner Application</h2>
            <p style="color:#888;font-size:0.85rem;margin-bottom:20px">${new Date().toLocaleDateString('en-ZA')}</p>
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #f0f0f0;border-radius:8px;overflow:hidden">
              <tr>
                <td style="padding:10px 16px;background:#f9fafb;font-size:0.8rem;color:#888;width:120px">Name</td>
                <td style="padding:10px 16px;font-size:0.9rem">${body.name}</td>
              </tr>
              <tr>
                <td style="padding:10px 16px;background:#f9fafb;font-size:0.8rem;color:#888">Email</td>
                <td style="padding:10px 16px;font-size:0.9rem"><a href="mailto:${body.email}" style="color:#7C3AED">${body.email}</a></td>
              </tr>
              <tr>
                <td style="padding:10px 16px;background:#f9fafb;font-size:0.8rem;color:#888">Company</td>
                <td style="padding:10px 16px;font-size:0.9rem">${body.company ?? '—'}</td>
              </tr>
              <tr>
                <td style="padding:10px 16px;background:#f9fafb;font-size:0.8rem;color:#888">Type</td>
                <td style="padding:10px 16px;font-size:0.9rem;text-transform:capitalize">${body.partner_type}</td>
              </tr>
              ${body.message ? `
              <tr>
                <td style="padding:10px 16px;background:#f9fafb;font-size:0.8rem;color:#888">Message</td>
                <td style="padding:10px 16px;font-size:0.9rem;color:#555">${body.message}</td>
              </tr>` : ''}
            </table>
            <p style="margin-top:20px">
              <a href="https://admin.get-kind.com" style="display:inline-block;background:#7C3AED;color:#fff;text-decoration:none;padding:10px 20px;border-radius:8px;font-weight:600;font-size:0.85rem">
                Review in admin →
              </a>
            </p>
          </div>`,
      }).catch(err => console.error('[partners/apply] email error:', err))
    }

    res.json({ success: true, message: 'Application received. We will be in touch within 48 hours.' })
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ success: false, error: err.errors }); return }
    console.error('[partners/apply]', err)
    res.status(500).json({ success: false, error: 'Application failed' })
  }
})

/**
 * #370 — THE ONE WAY a logged-in user becomes a partner seat.
 *
 * Every one of these lookups used `.ilike('email', …)`. The audit row named a single line;
 * there were FOUR, all on authenticated paths. `ilike` gives `%` wildcard meaning, so an
 * address containing one matched an arbitrary seat — reading their commissions and, on the
 * sandbox route, logging in as them. Exact match on a normalised address, in one function,
 * so a fifth copy cannot drift back in.
 */
function normaliseSeatEmail(email: string): string {
  return String(email ?? '').trim().toLowerCase()
}

// ── GET /partners/me — must be BEFORE /ref/:code to avoid param shadowing ────

partnersRouter.get('/me', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { data: userResp } = await (db as any).auth.admin.getUserById(req.userId!)
    const userEmail = userResp?.user?.email
    if (!userEmail) { res.status(401).json({ error: 'Unauthorized' }); return }

    // ⚠️ #370 — THIS LINE WAS `.ilike('email', userEmail)`, ON THE LOGIN PATH.
    // `ilike` treats `%` as a wildcard, so an account registered as `%@x.com` matched an
    // ARBITRARY partner row and logged in as them — their book, their commissions, their
    // clients. Identity is now an exact match on a normalised address; a `%` in an email
    // is just a character with no meaning, and matches nothing.
    const { data: partner, error } = await db
      .from('partners')
      .select('*')
      .eq('email', normaliseSeatEmail(userEmail))
      .maybeSingle()

    if (error || !partner) { res.status(404).json({ error: 'Not a partner account' }); return }

    // R40 — "her cut only". A Client Partner runs customer success, so she sees WHICH
    // clients are hers and how they are doing; she must never see what a client SPENDS.
    // `credit_balance` is a client's money, so it is selected only for legacy partners.
    const isClientPartner = partner.seat_type === 'client_partner'
    const referralFields = isClientPartner
      ? 'id, client_id, status, first_payment_at, created_at, clients(company_name)'
      : 'id, client_id, status, first_payment_at, created_at, clients(company_name, contact_name, credit_balance)'

    const { data: referrals } = await db
      .from('partner_referrals')
      .select(referralFields)
      .eq('partner_id', partner.id)
      .order('created_at', { ascending: false })

    const { data: commissions } = await db
      .from('partner_commissions')
      .select('id, period_month, amount_usd, amount_zar, commission_type, client_id, status, paid_at')
      .eq('partner_id', partner.id)
      .order('created_at', { ascending: false })
      .limit(24)

    const { data: deals } = await db
      .from('deal_registrations')
      .select('*')
      .eq('partner_id', partner.id)
      .order('created_at', { ascending: false })

    const allComms = commissions || []
    // USD is the currency of record (#238). The rand figures below are legacy readers.
    const usd = (c: any) => Number(c.amount_usd ?? 0)
    const thisMonth = new Date().toISOString().slice(0, 7)
    const earnedThisMonth = allComms.filter((c: any) => c.period_month === thisMonth).reduce((s: number, c: any) => s + usd(c), 0)
    const recurringThisMonth = allComms
      .filter((c: any) => c.period_month === thisMonth && c.commission_type === 'retain')
      .reduce((s: number, c: any) => s + usd(c), 0)
    const totalEarnedUsd  = allComms.filter((c: any) => c.status === 'paid').reduce((s: number, c: any) => s + usd(c), 0)
    const totalPendingUsd = allComms.filter((c: any) => c.status !== 'paid' && c.status !== 'cancelled').reduce((s: number, c: any) => s + usd(c), 0)
    const totalEarned   = allComms.filter((c: any) => c.status === 'paid').reduce((s: number, c: any) => s + Number(c.amount_zar ?? 0), 0)
    const totalPending  = allComms.filter((c: any) => c.status !== 'paid' && c.status !== 'cancelled').reduce((s: number, c: any) => s + Number(c.amount_zar), 0)

    res.json({
      partner,
      referrals:   referrals || [],
      commissions: allComms,
      deals:       deals || [],
      seat_type:   partner.seat_type ?? 'partner',
      // The rates travel WITH the seat so no screen has to type a percentage. Her page used
      // `PACK_PRICE_USD * 0.2` and printed "20% land" as text — correct today, and exactly
      // the shape that goes wrong the day a rate moves (method rule 7).
      land_rate:   RATES.PARTNER_ACQUISITION,
      retain_rate: Number(partner.retain_rate) > 0
        ? Number(partner.retain_rate)
        : (partner.seat_type === 'client_partner' ? RATES.CLIENT_PARTNER_RETENTION : RATES.PARTNER_RETENTION),
      stats: {
        total_clients:     (referrals || []).length,
        clients_held:      (referrals || []).filter((r: any) => r.status === 'active').length,
        earned_this_month_usd:    earnedThisMonth,
        recurring_this_month_usd: recurringThisMonth,
        total_earned_usd:  totalEarnedUsd,
        total_pending_usd: totalPendingUsd,
        total_earned_zar:  totalEarned,
        total_pending_zar: totalPending,
        active_deals:      (deals || []).filter((d: any) => d.status === 'pending' || d.status === 'approved').length,
      },
    })
  } catch (err: any) {
    console.error('[partners/me]', err)
    res.status(500).json({ error: err.message })
  }
})

// ── THE DOCUMENT PACK (#202) ──────────────────────────────────────────────────
//
// Her vault menu named five documents and opened none of them — `VaultItem` was a hover
// state with no link behind it. These two routes are what put a document behind each label:
// one for the seat holder reading her own pack, one for the operator reading a seat's pack
// from Vida.
//
// The pack is generated per seat rather than stored per seat, because the rate belongs to
// the seat (R40: she retains at a different rate to a legacy referral partner) and a stored
// PDF cannot follow a rate change. A SIGNED copy is a different artefact and is not built
// yet — see the inventory note on #202.

// GET /partners/documents — the signed-in seat's own pack.
partnersRouter.get('/documents', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { data: userResp } = await (db as any).auth.admin.getUserById(req.userId!)
    const userEmail = userResp?.user?.email
    if (!userEmail) { res.status(401).json({ error: 'Unauthorized' }); return }

    const { data: partner, error } = await db
      .from('partners')
      .select('name, seat_type, retain_rate, address, country, phone, created_at')
      .eq('email', normaliseSeatEmail(userEmail))
      .maybeSingle()

    if (error || !partner) { res.status(404).json({ error: 'Not a partner account' }); return }

    res.json({
      documents: partnerDocuments({
        seatType: partner.seat_type,
        retainRate: partner.retain_rate,
        name: partner.name,
        address: partner.address,
        country: partner.country,
        phone: partner.phone,
        dated: String(partner.created_at ?? '').slice(0, 10) || null,
      }),
    })
  } catch (err) {
    console.error('[partners/documents]', err)
    res.status(500).json({ error: 'Failed to load documents' })
  }
})

// GET /partners/admin/:partnerId/documents — the same pack, read by an operator in Vida.
partnersRouter.get('/admin/:partnerId/documents', requireAdminKey, async (req: Request, res: Response) => {
  try {
    const { data: partner, error } = await db
      .from('partners')
      .select('id, name, email, seat_type, retain_rate, address, country, phone, created_at')
      .eq('id', req.params.partnerId)
      .maybeSingle()

    if (error || !partner) { res.status(404).json({ error: 'Seat not found' }); return }

    res.json({
      partner: { id: partner.id, name: partner.name, email: partner.email, seat_type: partner.seat_type },
      documents: partnerDocuments({
        seatType: partner.seat_type,
        retainRate: partner.retain_rate,
        name: partner.name,
        address: partner.address,
        country: partner.country,
        phone: partner.phone,
        dated: String(partner.created_at ?? '').slice(0, 10) || null,
      }),
    })
  } catch (err) {
    console.error('[partners/admin/documents]', err)
    res.status(500).json({ error: 'Failed to load documents' })
  }
})

// ── GET /partners/ref/:code ───────────────────────────────────────────────────

partnersRouter.get('/ref/:code', async (req: Request, res: Response) => {
  try {
    const { code } = req.params
    const { data: partner, error } = await db
      .from('partners')
      .select('name, company, status')
      .eq('referral_code', code)
      .single()

    if (error || !partner || partner.status !== 'active') {
      res.json({ valid: false })
      return
    }

    res.json({ valid: true, partner_name: partner.name, partner_company: partner.company ?? null })
  } catch (err) {
    console.error('[partners/ref]', err)
    res.status(500).json({ valid: false })
  }
})

// ── Admin endpoints ───────────────────────────────────────────────────────────

// GET /partners/admin/list
partnersRouter.get('/admin/list', requireAdminKey, async (_req: Request, res: Response) => {
  try {
    const { data: partners, error } = await db
      .from('partners')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error

    // Fetch referral counts and total paid commissions for each partner
    const enriched = await Promise.all(
      (partners ?? []).map(async (p: Record<string, unknown>) => {
        const [referralsRes, commissionsRes] = await Promise.all([
          db.from('partner_referrals')
            .select('id', { count: 'exact', head: true })
            .eq('partner_id', p.id),
          db.from('partner_commissions')
            .select('amount_zar')
            .eq('partner_id', p.id)
            .eq('status', 'paid'),
        ])

        const totalPaidZar = (commissionsRes.data ?? []).reduce(
          (sum: number, c: { amount_zar: number }) => sum + Number(c.amount_zar),
          0,
        )

        return {
          ...p,
          referral_count:   referralsRes.count ?? 0,
          total_paid_zar:   totalPaidZar,
        }
      }),
    )

    res.json({ success: true, data: enriched })
  } catch (err) {
    console.error('[partners/admin/list]', err)
    res.status(500).json({ success: false, error: 'Failed to fetch partners' })
  }
})

// PATCH /partners/admin/:partnerId/approve
partnersRouter.patch('/admin/:partnerId/approve', requireAdminKey, async (req: Request, res: Response) => {
  try {
    const { partnerId } = req.params

    const { data: partner, error } = await db
      .from('partners')
      .update({ status: 'active', approved_at: new Date().toISOString() })
      .eq('id', partnerId)
      .select()
      .single()

    if (error) throw error
    if (!partner) { res.status(404).json({ success: false, error: 'Partner not found' }); return }

    // Guarantee a referral code — without it the partner has no referral link and
    // literally can't refer anyone. Don't rely on the DB default (it can silently
    // not fire under schema drift, as seen on the first live partner).
    if (!partner.referral_code) {
      const base = (partner.name || 'partner').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 8) || 'partner'
      const code = `${base}${Math.random().toString(36).slice(2, 6)}`
      const { data: withCode, error: codeErr } = await db.from('partners')
        .update({ referral_code: code }).eq('id', partnerId).select().single()
      if (withCode?.referral_code) partner.referral_code = withCode.referral_code
      // #349 — the approval email and the response below are sent regardless, so a
      // swallowed failure here approves a partner whose referral link is blank. Say so:
      // this is a one-shot path, nothing re-runs it on the next approval.
      if (codeErr || !withCode?.referral_code) {
        console.error('[partners/approve] referral code not written:', codeErr?.message ?? 'no row returned')
        void sendFounderAlert('api_down', 'Partner approved WITHOUT a referral code', [
          `Partner ${partnerId} (${partner.name || 'unnamed'}) was approved but the referral code could not be saved: ${codeErr?.message ?? 'no row returned'}`,
          'They have no referral link, so they cannot refer anyone and no commission can ever be attributed to them.',
          'Fix: set partners.referral_code by hand, then resend their approval email.',
        ])
      }
    }

    // Return immediately — email + sandbox are fire-and-forget
    res.json({ success: true, data: partner })

    // ── Send approval email ───────────────────────────────────────────────
    const PARTNERS_FROM = 'K.I.N.D Partners <partners@get-kind.com>'
    const commissionRate =
      partner.partner_type === 'technology' ? '30%' :
      partner.partner_type === 'agency'     ? '25%' : '20%'
    const tierLabel =
      partner.partner_type === 'technology' ? 'White-label' :
      partner.partner_type === 'agency'     ? 'Agency'      : 'Referral'
    const refLink = partner.referral_code
      ? `https://get-kind.com?ref=${partner.referral_code}`
      : 'https://get-kind.com'

    if (resend) {
      resend.emails.send({
        from:    PARTNERS_FROM,
        to:      partner.email,
        subject: "You're approved — welcome to the K.I.N.D Partner Programme",
        html: `
          <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#111">
            <div style="background:#7C3AED;border-radius:12px 12px 0 0;padding:28px 32px">
              <p style="color:#fff;font-size:0.75rem;letter-spacing:0.08em;text-transform:uppercase;margin:0 0 8px">K.I.N.D Partner Programme</p>
              <h1 style="color:#fff;font-size:1.75rem;font-weight:800;margin:0">Hi ${partner.name}, you're in.</h1>
            </div>
            <div style="background:#fff;border:1px solid #e9e9e9;border-top:none;border-radius:0 0 12px 12px;padding:28px 32px">

              <p style="font-size:0.95rem;color:#444;margin:0 0 20px">
                Your application has been approved. You're now an official K.I.N.D Partner — here's everything you need to get started.
              </p>

              <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #f0f0f0;border-radius:8px;overflow:hidden;margin-bottom:24px">
                <tr>
                  <td style="padding:10px 16px;background:#f9fafb;font-size:0.8rem;color:#888;width:140px">Partner tier</td>
                  <td style="padding:10px 16px;font-size:0.9rem;font-weight:600;color:#7C3AED">${tierLabel}</td>
                </tr>
                <tr>
                  <td style="padding:10px 16px;background:#f9fafb;font-size:0.8rem;color:#888">Commission rate</td>
                  <td style="padding:10px 16px;font-size:0.9rem;font-weight:600;color:#111">${commissionRate} recurring</td>
                </tr>
                <tr>
                  <td style="padding:10px 16px;background:#f9fafb;font-size:0.8rem;color:#888">Your referral link</td>
                  <td style="padding:10px 16px;font-size:0.9rem">
                    <a href="${refLink}" style="color:#7C3AED;word-break:break-all">${refLink}</a>
                  </td>
                </tr>
              </table>

              <h2 style="font-size:1rem;font-weight:700;color:#1E1152;margin:0 0 8px">Log in to your partner portal</h2>
              <p style="font-size:0.9rem;color:#444;margin:0 0 20px">
                Log in at <a href="https://kindportal-production.up.railway.app/login" style="color:#7C3AED">https://kindportal-production.up.railway.app/login</a>
                with this email address. If you don't have an account yet, sign up at the same URL.
              </p>

              <h2 style="font-size:1rem;font-weight:700;color:#1E1152;margin:0 0 8px">Your demo sandbox</h2>
              <p style="font-size:0.9rem;color:#444;margin:0 0 20px">
                We're setting up your demo environment right now. You'll get a separate email when it's ready — usually within a few minutes.
                It comes pre-loaded with leads, an active ICP, and 100 credits so you can walk any prospect through the full K.I.N.D experience for free.
              </p>

              <h2 style="font-size:1rem;font-weight:700;color:#1E1152;margin:0 0 12px">3 things to do first</h2>
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px">
                <tr>
                  <td style="vertical-align:top;padding:0 12px 12px 0;width:28px">
                    <div style="width:24px;height:24px;border-radius:50%;background:#7C3AED;color:#fff;font-size:0.75rem;font-weight:700;text-align:center;line-height:24px">1</div>
                  </td>
                  <td style="vertical-align:top;padding-bottom:12px">
                    <p style="font-size:0.9rem;font-weight:600;color:#111;margin:0">Log in and visit Partner Hub in the sidebar</p>
                    <p style="font-size:0.82rem;color:#888;margin:2px 0 0">Your deal pipeline, commissions, and resources are all there.</p>
                  </td>
                </tr>
                <tr>
                  <td style="vertical-align:top;padding:0 12px 12px 0">
                    <div style="width:24px;height:24px;border-radius:50%;background:#7C3AED;color:#fff;font-size:0.75rem;font-weight:700;text-align:center;line-height:24px">2</div>
                  </td>
                  <td style="vertical-align:top;padding-bottom:12px">
                    <p style="font-size:0.9rem;font-weight:600;color:#111;margin:0">Copy your referral link and share it with prospects</p>
                    <p style="font-size:0.82rem;color:#888;margin:2px 0 0">Every sign-up through your link is tracked automatically.</p>
                  </td>
                </tr>
                <tr>
                  <td style="vertical-align:top;padding:0 12px 0 0">
                    <div style="width:24px;height:24px;border-radius:50%;background:#7C3AED;color:#fff;font-size:0.75rem;font-weight:700;text-align:center;line-height:24px">3</div>
                  </td>
                  <td style="vertical-align:top">
                    <p style="font-size:0.9rem;font-weight:600;color:#111;margin:0">Register your first deal to lock in 60-day protection</p>
                    <p style="font-size:0.82rem;color:#888;margin:2px 0 0">Once registered, no other partner can claim that prospect for 60 days.</p>
                  </td>
                </tr>
              </table>

              <p style="font-size:0.85rem;color:#aaa;border-top:1px solid #f0f0f0;padding-top:16px;margin:0">
                Questions? Reply to this email or contact
                <a href="mailto:partners@get-kind.com" style="color:#7C3AED">partners@get-kind.com</a>
              </p>
            </div>
          </div>`,
      }).catch(err => console.error('[partners/admin/approve] approval email error:', err))
    }

    // ── Auto-provision demo sandbox ───────────────────────────────────────
    try {
      const { expiresAt } = await provisionPartnerSandbox(partner)
      await sendSandboxReadyEmail(partner, expiresAt)
    } catch (sandboxErr) {
      console.error('[partners/admin/approve] demo sandbox provision error:', sandboxErr)
    }

    // ── Drip email sequence (day 2, 7, 14) ───────────────────────────────
    const delayAndSend = (day: 2 | 7 | 14) =>
      setTimeout(() => {
        sendPartnerDripEmail(partner, day).catch(err =>
          console.error(`[partner/drip] day ${day} send error:`, err)
        )
      }, day * 24 * 60 * 60 * 1000)

    delayAndSend(2)
    delayAndSend(7)
    delayAndSend(14)
  } catch (err) {
    console.error('[partners/admin/approve]', err)
    if (!res.headersSent) res.status(500).json({ success: false, error: 'Failed to approve partner' })
  }
})

// POST /partners/admin/:partnerId/provision-sandbox — manual sandbox provision (admin fallback)
partnersRouter.post('/admin/:partnerId/provision-sandbox', requireAdminKey, async (req: Request, res: Response) => {
  try {
    const { partnerId } = req.params

    const { data: partner, error } = await db
      .from('partners')
      .select('id, name, email, referral_code, demo_env_id, status')
      .eq('id', partnerId)
      .single()

    if (error || !partner) { res.status(404).json({ success: false, error: 'Partner not found' }); return }

    if (partner.demo_env_id) {
      const { data: existing } = await db.from('clients').select('id, demo_expires_at').eq('id', partner.demo_env_id).single()
      if (existing) {
        res.json({ success: true, already_provisioned: true, sandbox_client_id: existing.id, expires_at: existing.demo_expires_at })
        return
      }
    }

    const { clientId, expiresAt } = await provisionPartnerSandbox(partner)
    await sendSandboxReadyEmail(partner, expiresAt)

    res.json({ success: true, already_provisioned: false, sandbox_client_id: clientId, expires_at: expiresAt })
  } catch (err) {
    console.error('[partners/admin/provision-sandbox]', err)
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Provision failed' })
  }
})

// POST /partners/admin/:partnerId/commission
partnersRouter.post('/admin/:partnerId/commission', requireAdminKey, async (req: Request, res: Response) => {
  try {
    const { partnerId } = req.params
    const body = z.object({
      client_id:    z.string().uuid(),
      amount_zar:   z.number().positive(),
      period_month: z.string().regex(/^\d{4}-\d{2}$/),
    }).parse(req.body)

    // Look up the partner_referral_id from client_id
    const { data: referral, error: refError } = await db
      .from('partner_referrals')
      .select('id')
      .eq('partner_id', partnerId)
      .eq('client_id', body.client_id)
      .single()

    if (refError || !referral) {
      res.status(404).json({ success: false, error: 'No referral found for this partner + client combination' })
      return
    }

    const { error } = await db.from('partner_commissions').insert({
      partner_id:         partnerId,
      partner_referral_id: referral.id,
      client_id:          body.client_id,
      amount_zar:         body.amount_zar,
      period_month:       body.period_month,
      status:             'pending',
    })

    if (error) throw error

    res.json({ success: true })
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ success: false, error: err.errors }); return }
    console.error('[partners/admin/commission]', err)
    res.status(500).json({ success: false, error: 'Failed to create commission' })
  }
})

// GET /partners/admin/deals — all deal registrations
partnersRouter.get('/admin/deals', requireAdminKey, async (_req, res) => {
  try {
    const { data, error } = await db
      .from('deal_registrations')
      .select('*, partners(name, company, email, tier)')
      .order('created_at', { ascending: false })
    if (error) throw error
    res.json({ success: true, data })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// PATCH /partners/admin/deals/:dealId — update deal status
partnersRouter.patch('/admin/deals/:dealId', requireAdminKey, async (req, res) => {
  try {
    const { status } = req.body
    if (!['pending','approved','won','lost','expired'].includes(status)) {
      res.status(400).json({ success: false, error: 'Invalid status' }); return
    }
    const updates: any = { status }
    if (status === 'won') updates.won_at = new Date().toISOString()
    if (status === 'lost') updates.lost_at = new Date().toISOString()

    const { data, error } = await db
      .from('deal_registrations')
      .update(updates)
      .eq('id', req.params.dealId)
      .select()
      .single()
    if (error) throw error
    res.json({ success: true, data })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// GET /partners/admin/commissions — all commissions with partner info
partnersRouter.get('/admin/commissions', requireAdminKey, async (_req: Request, res: Response) => {
  try {
    const { data, error } = await db
      .from('partner_commissions')
      .select(`
        *,
        partners(name, company, email, tier)
      `)
      .order('created_at', { ascending: false })

    if (error) throw error
    return res.json({ commissions: data ?? [] })
  } catch (err) {
    console.error('[partners/admin/commissions]', err)
    return res.status(500).json({ error: 'Failed to fetch commissions' })
  }
})

// PATCH /partners/admin/commissions/:commissionId — approve or mark paid
partnersRouter.patch('/admin/commissions/:commissionId', requireAdminKey, async (req: Request, res: Response) => {
  const { commissionId } = req.params
  const { status, wise_reference } = req.body

  const allowed = ['pending', 'approved', 'paid', 'cancelled']
  if (!status || !allowed.includes(status)) {
    return res.status(400).json({ error: 'Invalid status' })
  }

  try {
    const updates: Record<string, unknown> = { status }
    if (status === 'paid') {
      updates.paid_at = new Date().toISOString()
      if (wise_reference) updates.wise_reference = wise_reference
    }

    const { data, error } = await db
      .from('partner_commissions')
      .update(updates)
      .eq('id', commissionId)
      .select()
      .single()

    if (error) throw error
    return res.json({ success: true, commission: data })
  } catch (err) {
    console.error('[partners/admin/commissions/patch]', err)
    return res.status(500).json({ error: 'Failed to update commission' })
  }
})

// GET /partners/admin/:partnerId/dashboard
partnersRouter.get('/admin/:partnerId/dashboard', requireAdminKey, async (req: Request, res: Response) => {
  try {
    const { partnerId } = req.params

    const { data: partner, error: partnerError } = await db
      .from('partners')
      .select('*')
      .eq('id', partnerId)
      .single()

    if (partnerError || !partner) {
      res.status(404).json({ success: false, error: 'Partner not found' })
      return
    }

    // Referrals with client details
    const { data: referrals } = await db
      .from('partner_referrals')
      .select('id, client_id, status, first_payment_at, created_at, clients(company_name)')
      .eq('partner_id', partnerId)
      .order('created_at', { ascending: false })

    // Commissions
    const { data: commissions } = await db
      .from('partner_commissions')
      .select('id, period_month, amount_zar, status, created_at, paid_at')
      .eq('partner_id', partnerId)
      .order('created_at', { ascending: false })

    const allCommissions = commissions ?? []
    const totalEarned  = allCommissions
      .filter((c: { status: string }) => c.status === 'paid')
      .reduce((sum: number, c: { amount_zar: number }) => sum + Number(c.amount_zar), 0)
    const totalPending = allCommissions
      .filter((c: { status: string }) => c.status === 'pending')
      .reduce((sum: number, c: { amount_zar: number }) => sum + Number(c.amount_zar), 0)

    const referralList = (referrals ?? []).map((r: any) => ({
      id:              r.id,
      client_id:       r.client_id,
      client_name:     Array.isArray(r.clients) ? (r.clients[0]?.company_name ?? '—') : (r.clients?.company_name ?? '—'),
      status:          r.status,
      first_payment_at: r.first_payment_at,
      created_at:      r.created_at,
    }))

    res.json({
      success: true,
      data: {
        partner,
        referrals:     referralList,
        commissions:   allCommissions,
        total_earned:  totalEarned,
        total_pending: totalPending,
      },
    })
  } catch (err) {
    console.error('[partners/admin/dashboard]', err)
    res.status(500).json({ success: false, error: 'Failed to fetch partner dashboard' })
  }
})

// ── Authenticated partner self-service endpoints ──────────────────────────────

// GET /partners/me — partner's own dashboard data
// POST /partners/deals — register a deal
partnersRouter.post('/deals', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { data: userResp } = await (db as any).auth.admin.getUserById(req.userId!)
    const userEmail = userResp?.user?.email
    if (!userEmail) { res.status(401).json({ error: 'Unauthorized' }); return }

    const { data: partner } = await db.from('partners').select('id').eq('email', normaliseSeatEmail(userEmail)).maybeSingle()
    if (!partner) { res.status(403).json({ error: 'Not a partner account' }); return }

    const { company_name, contact_name, contact_email, company_size, industry, country, estimated_value, notes } = req.body
    if (!company_name || !contact_name || !contact_email) {
      res.status(400).json({ error: 'company_name, contact_name, contact_email required' }); return
    }

    const { data, error } = await db.from('deal_registrations').insert({
      partner_id:      partner.id,
      company_name,
      contact_name,
      contact_email,
      company_size:    company_size    || null,
      industry:        industry        || null,
      country:         country         || null,
      estimated_value: estimated_value || null,
      notes:           notes           || null,
      status:          'pending',
      protected_until: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
    }).select().single()

    if (error) throw error
    res.json(data)
  } catch (err: any) {
    console.error('[partners/deals]', err)
    res.status(500).json({ error: err.message })
  }
})

// GET /partners/me/sandbox — sandbox status for the authenticated partner
partnersRouter.get('/me/sandbox', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { data: userResp } = await (db as any).auth.admin.getUserById(req.userId!)
    const userEmail = userResp?.user?.email
    if (!userEmail) { res.status(401).json({ error: 'Unauthorized' }); return }

    const { data: partner } = await db
      .from('partners')
      .select('id, name, referral_code, demo_env_id, status')
      .eq('email', normaliseSeatEmail(userEmail))
      .maybeSingle()
    if (!partner) { res.status(403).json({ error: 'Not a partner account' }); return }
    if (partner.status !== 'active') { res.json({ provisioned: false, reason: 'pending_approval' }); return }

    if (!partner.demo_env_id) {
      res.json({ provisioned: false }); return
    }

    const { data: sandboxClient } = await db
      .from('clients')
      .select('id, company_name, demo_expires_at, is_demo')
      .eq('id', partner.demo_env_id)
      .eq('is_demo', true)
      .single()

    if (!sandboxClient) {
      res.json({ provisioned: false }); return
    }

    res.json({
      provisioned:      true,
      sandbox_client_id: sandboxClient.id,
      expires_at:        sandboxClient.demo_expires_at,
      portal_url:        process.env.PORTAL_URL || 'https://app.get-kind.com',
    })
  } catch (err: any) {
    console.error('[partners/me/sandbox]', err)
    res.status(500).json({ error: err.message })
  }
})

// POST /partners/me/sandbox-login — generate a one-click login link for the sandbox
partnersRouter.post('/me/sandbox-login', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { data: userResp } = await (db as any).auth.admin.getUserById(req.userId!)
    const userEmail = userResp?.user?.email
    if (!userEmail) { res.status(401).json({ error: 'Unauthorized' }); return }

    const { data: partner } = await db
      .from('partners')
      .select('id, demo_env_id, status')
      .eq('email', normaliseSeatEmail(userEmail))
      .maybeSingle()
    if (!partner) { res.status(403).json({ error: 'Not a partner account' }); return }
    if (!partner.demo_env_id) { res.status(404).json({ error: 'Sandbox not provisioned yet' }); return }

    const { data: sandboxClient } = await db
      .from('clients')
      .select('user_id, is_demo')
      .eq('id', partner.demo_env_id)
      .eq('is_demo', true)
      .single()
    if (!sandboxClient) { res.status(404).json({ error: 'Sandbox not found' }); return }

    const { data: { user } } = await db.auth.admin.getUserById(sandboxClient.user_id)
    if (!user?.email) { res.status(404).json({ error: 'Sandbox user not found' }); return }

    const portalUrl = process.env.PORTAL_URL || 'https://app.get-kind.com'
    const { data: linkData } = await db.auth.admin.generateLink({
      type:  'magiclink',
      email: user.email,
      options: { redirectTo: `${portalUrl}/dashboard` },
    })

    res.json({ success: true, data: { magic_link: linkData?.properties?.action_link ?? null } })
  } catch (err: any) {
    console.error('[partners/me/sandbox-login]', err)
    res.status(500).json({ error: err.message })
  }
})
