import { Router } from 'express'
import { db } from '@kind/db'
import { requireAuth, AuthRequest } from '../middleware/auth'
import { PURCHASE_TX_TYPES } from '../lib/onboarding-pack'
import { readProgress, unavailableNote, type Counted } from '../lib/onboarding-progress'

export const onboardingRouter = Router()
onboardingRouter.use(requireAuth)

// Allowed onboarding statuses — the client may only PATCH into one of these.
const ONBOARDING_STATUSES = ['not_started', 'in_progress', 'skipped', 'completed'] as const
type OnboardingStatus = (typeof ONBOARDING_STATUSES)[number]

// ── GET /onboarding/progress ────────────────────────────────────────────────
// Powers the first-run checklist, the two-wallet explainer AND the guided tour
// (#454) on the dashboard. The booleans are lit from REAL data so a step only
// completes when the client has actually crossed the $1 → $4 money-model line:
//   hasIcp        — client told FIGSY who they sell to (≥1 ICP)
//   hasLeads      — FIGSY sourced ≥1 delivered lead
//   hasReveal     — client spent $1 to reveal ≥1 lead's email (revealed_at set)
//   hasEnrollment — client put FIGSY to work (≥1 figsy_enrollment)
//   hasPurchase   — client has made a real credit purchase (drives the wallet card)
// Alongside the booleans it returns the persisted tour cursor so the tour can
// RESUME from the server on a new device / after a browser close (§7 edge cases):
//   current_step / completed_steps / status / version
onboardingRouter.get('/progress', async (req: AuthRequest, res) => {
  try {
    const { data: client } = await db.from('clients')
      .select('id, onboarding_step, onboarding_completed, onboarding_status, onboarding_version')
      .eq('user_id', req.userId!).maybeSingle()
    if (!client) { res.status(404).json({ success: false, error: 'Client not found' }); return }
    const clientId = client.id as string

    // AUDIT 27 Jul, two defects fixed here.
    //
    // ① `hasPurchase` counted `.eq('type', 'purchase')`. Stripe writes `wallet_topup` for
    //    every wallet payment INCLUDING the first $99 (routes/stripe.ts:330) — so the one
    //    step proving they are a paying client never ticked. PURCHASE_TX_TYPES is the
    //    canonical list and exists precisely so this cannot drift again.
    //
    // ② A failed count became `0`, which renders as "you haven't done this yet" over a
    //    question we could not ask. The failures are carried separately now — see
    //    `readProgress`.
    const settled = await Promise.allSettled([
      db.from('icps').select('id', { count: 'exact', head: true }).eq('client_id', clientId),
      db.from('leads').select('id', { count: 'exact', head: true }).eq('client_id', clientId).not('delivered_at', 'is', null),
      db.from('leads').select('id', { count: 'exact', head: true }).eq('client_id', clientId).not('revealed_at', 'is', null),
      db.from('figsy_enrollments').select('id', { count: 'exact', head: true }).eq('client_id', clientId),
      db.from('credit_transactions').select('id', { count: 'exact', head: true }).eq('client_id', clientId).in('type', PURCHASE_TX_TYPES),
    ])
    const asCounted = (r: PromiseSettledResult<{ count: number | null; error?: { message?: string } | null }>): Counted => {
      if (r.status !== 'fulfilled') return { ok: false, why: String(r.reason).slice(0, 200) }
      if (r.value?.error) return { ok: false, why: r.value.error.message ?? 'query failed' }
      return { ok: true, count: r.value?.count ?? 0 }
    }
    const { flags, unavailable } = readProgress({
      hasIcp:        asCounted(settled[0] as never),
      hasLeads:      asCounted(settled[1] as never),
      hasReveal:     asCounted(settled[2] as never),
      hasEnrollment: asCounted(settled[3] as never),
      hasPurchase:   asCounted(settled[4] as never),
    })

    const c = client as Record<string, unknown>
    res.json({
      success: true,
      data: {
        ...flags,
        // Which of the five could NOT be checked. Empty means the flags are the whole truth.
        // An unticked box with its key listed here means "we could not ask", never "you
        // have not done it".
        unavailable,
        unavailable_note: unavailableNote(unavailable),
        // Tour cursor (guarded — columns are additive, may be null pre-migration).
        current_step:    (c.onboarding_step as string | null) ?? null,
        completed_steps: (c.onboarding_completed as string[] | null) ?? [],
        status:          (c.onboarding_status as string | null) ?? 'not_started',
        version:         (c.onboarding_version as number | null) ?? 1,
      },
    })
  } catch (err) {
    console.error('[onboarding/progress]', err)
    res.status(500).json({ success: false, error: 'Failed to fetch onboarding progress' })
  }
})

// ── PATCH /onboarding/progress ──────────────────────────────────────────────
// The tour calls this on Next / Back / Skip so the cursor survives a refresh or a
// second device. The client is ALWAYS derived from the authed user — never trusted
// from the body (mirrors the guarded-write pattern used across this codebase). The
// write is guarded: a DB error is reported to the caller, never thrown past it.
// Body: { step?: string|null, status?: OnboardingStatus, completed?: string[] }
onboardingRouter.patch('/progress', async (req: AuthRequest, res) => {
  try {
    const { data: client } = await db.from('clients')
      .select('id, onboarding_started_at').eq('user_id', req.userId!).maybeSingle()
    if (!client) { res.status(404).json({ success: false, error: 'Client not found' }); return }
    const clientId = client.id as string

    const body = (req.body ?? {}) as { step?: unknown; status?: unknown; completed?: unknown }
    const patch: Record<string, unknown> = {}

    if ('step' in body) {
      if (body.step === null || typeof body.step === 'string') patch.onboarding_step = body.step
      else { res.status(400).json({ success: false, error: 'step must be a string or null' }); return }
    }

    if ('status' in body) {
      if (typeof body.status !== 'string' || !ONBOARDING_STATUSES.includes(body.status as OnboardingStatus)) {
        res.status(400).json({ success: false, error: `status must be one of: ${ONBOARDING_STATUSES.join(', ')}` }); return
      }
      patch.onboarding_status = body.status
      // Stamp lifecycle timestamps from the status transition (never from the body).
      if (body.status === 'in_progress' && !(client as Record<string, unknown>).onboarding_started_at) {
        patch.onboarding_started_at = new Date().toISOString()
      }
      if (body.status === 'completed') patch.onboarding_completed_at = new Date().toISOString()
    }

    if ('completed' in body) {
      if (!Array.isArray(body.completed) || body.completed.some(s => typeof s !== 'string')) {
        res.status(400).json({ success: false, error: 'completed must be an array of strings' }); return
      }
      patch.onboarding_completed = body.completed
    }

    if (Object.keys(patch).length === 0) {
      res.status(400).json({ success: false, error: 'Nothing to update' }); return
    }

    const { error } = await db.from('clients').update(patch).eq('id', clientId)
    if (error) {
      console.error('[onboarding/progress PATCH]', error)
      res.status(500).json({ success: false, error: 'Failed to save onboarding progress' }); return
    }

    res.json({ success: true, data: { saved: true } })
  } catch (err) {
    console.error('[onboarding/progress PATCH]', err)
    res.status(500).json({ success: false, error: 'Failed to save onboarding progress' })
  }
})
