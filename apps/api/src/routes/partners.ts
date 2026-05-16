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
      name:         z.string().min(1),
      email:        z.string().email(),
      company:      z.string().optional(),
      partner_type: z.enum(['referral', 'agency', 'technology']),
      message:      z.string().optional(),
    }).parse(req.body)

    const { error } = await db
      .from('partners')
      .insert({
        name:         body.name,
        email:        body.email,
        company:      body.company ?? null,
        partner_type: body.partner_type,
        notes:        body.message ?? null,
        status:       'pending',
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

    res.json({ success: true, data: partner })
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
