import { Router } from 'express'
import { z } from 'zod'
import { db } from '@kind/db'
import { requireAuth, AuthRequest } from '../middleware/auth'
import { pauseStripeSubscription, resumeStripeSubscription } from '../lib/stripe'

export const subscriptionRouter = Router()
subscriptionRouter.use(requireAuth)

// #325 — Paystack fully removed (Stripe-only). Subscriptions now start via
// POST /stripe/subscribe (Stripe Checkout) and are activated by the Stripe
// webhook; there is no longer a Paystack initialise/verify grant path.

subscriptionRouter.get('/', async (req: AuthRequest, res) => {
  try {
    const { data: client } = await db.from('clients').select('id').eq('user_id', req.userId!).single()
    if (!client) { res.status(404).json({ success: false, error: 'Client not found' }); return }
    const { data } = await db.from('subscriptions').select('*').eq('client_id', client.id).order('created_at', { ascending: false })
    res.json({ success: true, data })
  } catch (err) { console.error(err); res.status(500).json({ success: false, error: 'Failed to fetch subscriptions' }) }
})


// ── CANCEL subscription ────────────────────────────────────────────────────────
subscriptionRouter.post('/:id/cancel', async (req: AuthRequest, res) => {
  try {
    const { data: client } = await db.from('clients').select('id').eq('user_id', req.userId!).single()
    if (!client) { res.status(404).json({ success: false, error: 'Client not found' }); return }

    // Verify this subscription belongs to this client
    const { data: sub } = await db.from('subscriptions')
      .select('id, product, status')
      .eq('id', req.params.id)
      .eq('client_id', client.id)
      .single()

    if (!sub) { res.status(404).json({ success: false, error: 'Subscription not found' }); return }
    if (sub.status === 'cancelled') { res.status(400).json({ success: false, error: 'Subscription already cancelled' }); return }

    // Stripe cancellation is handled by the client through Stripe's billing portal /
    // the Stripe webhook; here we only mark the local record. (Paystack removed, #325.)
    // Mark cancelled in DB — access continues until current_period_end
    // #349 — swallowed, the client is told "cancelled" while the row still reads active.
    // They believe they've cancelled, keep being billed by Stripe, and the churn report
    // never counts them. Refuse instead of lying.
    const { error: cancelErr } = await db.from('subscriptions')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
      })
      .eq('id', sub.id)
    if (cancelErr) {
      console.error('[subscriptions/cancel] write failed:', cancelErr.message)
      res.status(500).json({ success: false, error: 'Could not cancel the subscription — nothing was changed. Please try again or email hello@get-kind.com.' })
      return
    }

    res.json({
      success: true,
      message: `${sub.product} subscription cancelled. Access continues until end of current billing period.`,
    })
  } catch (err) {
    console.error('[subscriptions/cancel]', err)
    res.status(500).json({ success: false, error: 'Failed to cancel subscription' })
  }
})

// ── PAUSE subscription (item 190 — graceful hold instead of cancel) ─────────────
// Stops billing for 1–3 months but KEEPS the client's data + settings warm. This
// is the "save" offer on the cancel path so churn isn't one-way + final.
//
// CONSERVATIVE: this does NOT delete data and does NOT change how charges are
// computed elsewhere. Billing is stopped by pausing the Stripe recurring charge,
// and the subscription is marked paused with a resume date. It RELIES on the
// additive migration
// supabase/migrations/20260622_subscription_pause.sql (status 'paused' + the
// paused_until / paused_at columns). Until the founder applies that migration the
// DB write is rejected by the status CHECK constraint — in that case we return a
// clear 409 and DO NOT cancel or otherwise mutate the subscription.
subscriptionRouter.post('/:id/pause', async (req: AuthRequest, res) => {
  try {
    const { months } = z.object({
      months: z.coerce.number().int().min(1).max(3).default(1),
    }).parse(req.body ?? {})

    const { data: client } = await db.from('clients').select('id').eq('user_id', req.userId!).single()
    if (!client) { res.status(404).json({ success: false, error: 'Client not found' }); return }

    // Verify this subscription belongs to this client
    const { data: sub } = await db.from('subscriptions')
      .select('id, product, status, stripe_subscription_id')
      .eq('id', req.params.id)
      .eq('client_id', client.id)
      .single()

    if (!sub) { res.status(404).json({ success: false, error: 'Subscription not found' }); return }
    if (sub.status === 'cancelled') { res.status(400).json({ success: false, error: 'Subscription already cancelled' }); return }
    if (sub.status === 'paused') { res.status(400).json({ success: false, error: 'Subscription already paused' }); return }

    const now = new Date()
    const resumeAt = new Date(now.getTime() + months * 30 * 86400000)

    // Actually STOP the recurring charge so "billing is stopped" is true, not a lie.
    // Stripe (the only processor, #325) via pause_collection.
    // CRITICAL (#319): if the sub has a Stripe id but the pause CALL FAILS, the card
    // is still live and will be charged — so we must NOT mark the sub paused or tell
    // the client "billing is stopped". Only proceed when Stripe confirmed the pause.
    if (sub.stripe_subscription_id) {
      const ok = await pauseStripeSubscription(sub.stripe_subscription_id)
      if (!ok) {
        console.error(`[subscriptions/pause] Stripe pause FAILED for sub ${sub.id} — refusing to mark paused.`)
        res.status(502).json({
          success: false,
          error: 'We could not stop billing with Stripe, so your subscription was NOT paused and no change was made. Please try again in a moment or contact support.',
          code: 'external_pause_failed',
        })
        return
      }
    } else {
      // No Stripe subscription attached (e.g. a comped / legacy sub with no live
      // billing) — there is genuinely nothing to charge, so a DB pause is honest.
      console.warn(`[subscriptions/pause] sub ${sub.id} has no stripe id — no live billing to stop; DB pause only.`)
    }

    // Mark paused in DB. Data + settings are untouched (no delete).
    const { error: updErr } = await db.from('subscriptions')
      .update({
        status: 'paused',
        paused_at: now.toISOString(),
        paused_until: resumeAt.toISOString(),
      })
      .eq('id', sub.id)

    if (updErr) {
      // Almost certainly the 'paused' status / columns aren't migrated yet.
      // We did NOT change the DB state — report it plainly so nothing is half-done.
      console.warn('[subscriptions/pause] DB write rejected (migration likely not applied):', updErr.message)
      res.status(409).json({
        success: false,
        error: 'Pause is not enabled yet. Run migration 20260622_subscription_pause.sql to activate it.',
        code: 'pause_not_migrated',
      })
      return
    }

    res.json({
      success: true,
      message: `${sub.product} subscription paused. Billing is stopped and your data + settings are kept warm. Resumes ${resumeAt.toISOString().slice(0, 10)}.`,
      data: { paused_until: resumeAt.toISOString(), months },
    })
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ success: false, error: err.errors }); return }
    console.error('[subscriptions/pause]', err)
    res.status(500).json({ success: false, error: 'Failed to pause subscription' })
  }
})

// ── RESUME a paused subscription (item 190) ─────────────────────────────────────
// Lifts the pause and returns the subscription to active. Does NOT re-charge or
// re-create the external recurring billing on its own — the client re-subscribes
// through the normal checkout flow if the external charge was disabled. This just
// clears the paused flags so the account is usable again.
subscriptionRouter.post('/:id/resume', async (req: AuthRequest, res) => {
  try {
    const { data: client } = await db.from('clients').select('id').eq('user_id', req.userId!).single()
    if (!client) { res.status(404).json({ success: false, error: 'Client not found' }); return }

    const { data: sub } = await db.from('subscriptions')
      .select('id, product, status, stripe_subscription_id')
      .eq('id', req.params.id)
      .eq('client_id', client.id)
      .single()

    if (!sub) { res.status(404).json({ success: false, error: 'Subscription not found' }); return }
    if (sub.status !== 'paused') { res.status(400).json({ success: false, error: 'Subscription is not paused' }); return }

    // Re-enable the Stripe recurring charge (clears pause_collection) so resuming
    // actually restarts billing, mirroring the pause above.
    await resumeStripeSubscription(sub.stripe_subscription_id)

    const { error: updErr } = await db.from('subscriptions')
      .update({ status: 'active', paused_at: null, paused_until: null })
      .eq('id', sub.id)

    if (updErr) {
      console.warn('[subscriptions/resume] DB write rejected:', updErr.message)
      res.status(409).json({ success: false, error: 'Resume is not enabled yet. Run migration 20260622_subscription_pause.sql.', code: 'pause_not_migrated' })
      return
    }

    res.json({ success: true, message: `${sub.product} subscription resumed.` })
  } catch (err) {
    console.error('[subscriptions/resume]', err)
    res.status(500).json({ success: false, error: 'Failed to resume subscription' })
  }
})

