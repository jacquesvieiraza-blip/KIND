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

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null
const FROM   = 'K.I.N.D <hello@get-kind.com>'

export const partnersRouter = Router()

// ── Admin key guard ───────────────────────────────────────────────────────────

function requireAdminKey(req: Request, res: Response, next: () => void) {
  if (!process.env.ADMIN_SECRET_KEY || req.headers['x-admin-key'] !== process.env.ADMIN_SECRET_KEY) {
    res.status(401).json({ success: false, error: 'Unauthorized' })
    return
  }
  next()
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
                <td style="padding:10px 16px;font-size:0.9rem"><a href="mailto:${body.email}" style="color:#0066FF">${body.email}</a></td>
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
              <a href="https://admin.get-kind.com" style="display:inline-block;background:#0066FF;color:#fff;text-decoration:none;padding:10px 20px;border-radius:8px;font-weight:600;font-size:0.85rem">
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

// ── GET /partners/me — must be BEFORE /ref/:code to avoid param shadowing ────

partnersRouter.get('/me', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { data: userResp } = await (db as any).auth.admin.getUserById(req.userId!)
    const userEmail = userResp?.user?.email
    if (!userEmail) { res.status(401).json({ error: 'Unauthorized' }); return }

    const { data: partner, error } = await db
      .from('partners')
      .select('*')
      .eq('email', userEmail)
      .single()

    if (error || !partner) { res.status(404).json({ error: 'Not a partner account' }); return }

    const { data: referrals } = await db
      .from('partner_referrals')
      .select('id, client_id, status, first_payment_at, created_at, clients(company_name, contact_name, credit_balance)')
      .eq('partner_id', partner.id)
      .order('created_at', { ascending: false })

    const { data: commissions } = await db
      .from('partner_commissions')
      .select('id, period_month, amount_zar, amount_usd, status, paid_at')
      .eq('partner_id', partner.id)
      .order('created_at', { ascending: false })
      .limit(24)

    const { data: deals } = await db
      .from('deal_registrations')
      .select('*')
      .eq('partner_id', partner.id)
      .order('created_at', { ascending: false })

    const allComms = commissions || []
    const totalEarned   = allComms.filter((c: any) => c.status === 'paid').reduce((s: number, c: any) => s + Number(c.amount_zar), 0)
    const totalPending  = allComms.filter((c: any) => c.status !== 'paid' && c.status !== 'cancelled').reduce((s: number, c: any) => s + Number(c.amount_zar), 0)

    res.json({
      partner,
      referrals:   referrals || [],
      commissions: allComms,
      deals:       deals || [],
      stats: {
        total_clients:     (referrals || []).length,
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
      const { data: demoEnv } = await db.from('demo_environments').insert({
        label:  `Partner Demo — ${partner.name}`,
        type:   'partner',
        status: 'active',
      }).select().single()

      if (demoEnv) {
        await db.from('partners').update({ demo_env_id: demoEnv.id }).eq('id', partner.id)
      }
    } catch (sandboxErr) {
      console.error('[partners/admin/approve] demo sandbox provision error:', sandboxErr)
    }
  } catch (err) {
    console.error('[partners/admin/approve]', err)
    res.status(500).json({ success: false, error: 'Failed to approve partner' })
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

    const { data: partner } = await db.from('partners').select('id').eq('email', userEmail).single()
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

// POST /partners/demo-sandbox — provision a demo env for this partner
partnersRouter.post('/demo-sandbox', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { data: userResp } = await (db as any).auth.admin.getUserById(req.userId!)
    const userEmail = userResp?.user?.email
    if (!userEmail) { res.status(401).json({ error: 'Unauthorized' }); return }

    const { data: partner } = await db.from('partners').select('id, demo_env_id').eq('email', userEmail).single()
    if (!partner) { res.status(403).json({ error: 'Not a partner account' }); return }

    if (partner.demo_env_id) {
      const { data: env } = await db.from('demo_environments').select('*').eq('id', partner.demo_env_id).single()
      res.json({ already_exists: true, demo_env: env }); return
    }

    const { data: env, error } = await db.from('demo_environments').insert({
      label:  `Partner Demo — ${userEmail}`,
      type:   'partner',
      status: 'active',
    }).select().single()

    if (error) throw error

    await db.from('partners').update({ demo_env_id: env.id }).eq('id', partner.id)

    res.json({ already_exists: false, demo_env: env })
  } catch (err: any) {
    console.error('[partners/demo-sandbox]', err)
    res.status(500).json({ error: err.message })
  }
})
