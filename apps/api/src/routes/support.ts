import { Router } from 'express'
import { z } from 'zod'
import { db } from '@kind/db'
import { requireAuth, AuthRequest } from '../middleware/auth'
import { rateLimit } from '../lib/rate-limit'
import { sendFounderAlert } from '../lib/alerts'

export const supportRouter = Router()
supportRouter.use(requireAuth)

// ⚑ 1 Oct (R182 · W-7) — THE OLD SUPPORT CHAT IS RETIRED. The founder: "all yes" to "Retire it (switch
// the route off). If you want a website chat later, it gets rebuilt on today's model." Its prompt sold the
// retired model — "1 credit = 1 positive reply", "credit bundles $12/$35", "Payment via Paystack", "Billed
// in ZAR", "Requires FIGSY subscription" — and nothing in the product called it, but anyone signed in could.
// The route now answers 410 and points at the one help path that is real: "Talk to a human" (/escalate).
supportRouter.post('/chat', (_req: AuthRequest, res) => {
  res.status(410).json({
    success: false,
    error: 'The support chat has been retired. Use "Talk to a human" and a person will reply.',
  })
})

// ── PR-D (#377): SUPPORT ESCALATION — "Talk to a human" ─────────────────────────
// The in-portal help is Claude-only; a stuck client had no way to reach a person. This
// routes the client's message to the founder (sendFounderAlert also writes a durable
// founder_alerts row, so it survives even if email + Slack both fail) and confirms.
// No ticketing system, no new deps.
supportRouter.post(
  '/escalate',
  rateLimit({ limit: 5, windowMs: 60_000, key: 'support-escalate', byUser: true }),
  async (req: AuthRequest, res) => {
    try {
      const { message } = z.object({ message: z.string().min(1).max(4000) }).parse(req.body)

      // Resolve who's asking + a reply-to email so the founder can respond.
      const { data: client } = await db.from('clients')
        .select('company_name').eq('user_id', req.userId!).maybeSingle()
      let email = ''
      try {
        const { data: { user } } = await db.auth.admin.getUserById(req.userId!)
        email = user?.email ?? ''
      } catch { /* best-effort — the alert still goes, just without a reply-to */ }

      // ── ⚑ 14 Sep (S1-RT-004) — SOMEBODY STILL IN ONBOARDING HAS NO CLIENT ROW ────────
      //
      // 🛑 THIS ROUTE ALREADY WORKED FOR THEM — `.maybeSingle()` and the auth lookup mean a
      // person with no `clients` row still reaches a human — but the alert then read
      // "Client: (unknown)", which tells an operator nothing they can act on. The Milla
      // Brief escape (S1-RT-004) is reached precisely by people who have no client row yet,
      // so the one identity we DO hold is named instead of a blank.
      //
      // ⚠️ READ-ONLY AND BEST-EFFORT. A draft that cannot be read costs nobody their
      // escalation; the alert simply goes without the company name, exactly as before.
      let onboardingName = ''
      let onboardingProgress = ''
      if (!client?.company_name) {
        try {
          const { briefDraftFor, draftProgress } = await import('../lib/brief-draft')
          const draft = await briefDraftFor(req.userId!)
          if (draft) {
            onboardingName = (draft.facts.company_name ?? '').trim()
            const p = draftProgress(draft)
            onboardingProgress = `${p.count} of ${p.total} Brief facts held`
          }
        } catch { /* the alert still goes — an unreadable draft is not a reason to drop it */ }
      }
      const who = client?.company_name || onboardingName || 'a client'

      const delivery = await sendFounderAlert(
        'support_escalation',
        `🆘 Support request — ${who}`,
        [
          client?.company_name
            ? `Client: ${client.company_name}`
            : `ONBOARDING (no client row yet): ${onboardingName || '(company not yet given)'}`,
          `Reply to: ${email || '(no email on file)'}`,
          // ⚠️ THE AUTH USER ID, so Vida can find the exact draft. It is an internal
          // identifier, never a secret, and it is the only durable handle a person who has
          // not been promoted yet actually has.
          `Onboarding user id: ${req.userId ?? '(unknown)'}`,
          ...(onboardingProgress ? [`Brief progress: ${onboardingProgress}`] : []),
          '',
          message.trim(),
        ],
      )

      // ── 🛑 ⚑ 14 Sep (RT-008) — WE ONLY SAY A HUMAN WAS TOLD IF ONE ACTUALLY WAS ────────
      //
      // ⛓️ THIS ANSWERED `{ success: true }` UNCONDITIONALLY, because `sendFounderAlert`
      // returned `void`. A stuck client pressing Get Help on the Milla Brief was shown "we
      // have told the team" while every channel could have failed silently — email
      // unconfigured, Slack unconfigured, the durable insert rejected. The button reported a
      // rescue that never happened, which is worse than a button that says it could not.
      //
      // ⚠️ THE CLIENT IS NEVER SHOWN THE TECHNICAL REASON. They get a plain sentence and a
      // way out; the channel detail is logged for us.
      if (!delivery.delivered) {
        console.error('[support/escalate] ⛔ nobody was reached —', JSON.stringify(delivery))
        res.status(503).json({
          success: false, retryable: true,
          error: 'We could not get a message to the team just now. Nothing you typed is lost — please try again, or email hello@get-kind.com.',
        })
        return
      }
      res.json({ success: true, data: { escalated: true } })
    } catch (err) {
      if (err instanceof z.ZodError) { res.status(400).json({ success: false, error: err.errors }); return }
      console.error('[support/escalate]', err)
      res.status(500).json({ success: false, error: 'Failed to escalate to the team' })
    }
  },
)
