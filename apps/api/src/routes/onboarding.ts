import { Router } from 'express'
import { db } from '@kind/db'
import { requireAuth, AuthRequest } from '../middleware/auth'

export const onboardingRouter = Router()
onboardingRouter.use(requireAuth)

// ── GET /onboarding/progress ────────────────────────────────────────────────
// Powers the first-run checklist + two-wallet explainer on the dashboard home.
// Each flag is lit from REAL data so the card only completes when the client has
// actually crossed the $1 → $4 money-model line:
//   hasIcp        — client told FIGSY who they sell to (≥1 ICP)
//   hasLeads      — FIGSY sourced ≥1 delivered lead
//   hasReveal     — client spent $1 to reveal ≥1 lead's email (revealed_at set)
//   hasEnrollment — client put FIGSY to work (≥1 figsy_enrollment)
//   hasPurchase   — client has made a real credit purchase (drives the wallet card)
onboardingRouter.get('/progress', async (req: AuthRequest, res) => {
  try {
    const { data: client } = await db.from('clients')
      .select('id').eq('user_id', req.userId!).maybeSingle()
    if (!client) { res.status(404).json({ success: false, error: 'Client not found' }); return }
    const clientId = client.id as string

    const [icps, leads, revealed, enrollments, purchases] = (await Promise.allSettled([
      db.from('icps').select('id', { count: 'exact', head: true }).eq('client_id', clientId),
      db.from('leads').select('id', { count: 'exact', head: true }).eq('client_id', clientId).not('delivered_at', 'is', null),
      db.from('leads').select('id', { count: 'exact', head: true }).eq('client_id', clientId).not('revealed_at', 'is', null),
      db.from('figsy_enrollments').select('id', { count: 'exact', head: true }).eq('client_id', clientId),
      db.from('credit_transactions').select('id', { count: 'exact', head: true }).eq('client_id', clientId).eq('type', 'purchase'),
    ])).map(r => r.status === 'fulfilled' ? (r.value.count ?? 0) : 0)

    res.json({
      success: true,
      data: {
        hasIcp:        icps > 0,
        hasLeads:      leads > 0,
        hasReveal:     revealed > 0,
        hasEnrollment: enrollments > 0,
        hasPurchase:   purchases > 0,
      },
    })
  } catch (err) {
    console.error('[onboarding/progress]', err)
    res.status(500).json({ success: false, error: 'Failed to fetch onboarding progress' })
  }
})
