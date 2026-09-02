// ── PROGRAMME OPERATOR SURFACE (BUILD-002) ───────────────────────────────────────────────
//
// The minimum set of doors needed to actually run the journey the founder specified:
//
//   PRICE → TAKE FIRST PAYMENT → AUTHORISE CONTROLLED SOURCING → SOURCE WITH A HARD CEILING
//   → PROGRAMME APPROVE → TAKE SECOND PAYMENT → GO LIVE → ACCOUNT FOR VALUE / CONTRIBUTION
//
// ⚠️ OPERATOR-GATED, ADMIN KEY ONLY — the same gate `operatorRouter` uses. Nothing here is
// reachable from a client browser. K.I.N.D owns GO (AR9): a client does not approve their own
// programme into sourcing, and a client cannot mint a checkout for a stage the state refuses.
//
// ⚠️ NOTHING HERE RE-DERIVES MONEY. Every figure comes from the stored programme row, which
// was priced once from the shared curve at creation. A route recomputing the price would be
// the two-places-one-number defect with a client-visible amount attached.
//
// ⚠️ AND NO LEGACY MONEY CONSTANT IS IMPORTED HERE — `programme-legacy-fence.test.ts` reads
// every `programme*` file in this directory, including this one.

import { Router, type Request, type Response } from 'express'
import { adminKeyValid } from './admin'
import { db } from '@kind/db'
import { quoteProgramme } from '@kind/shared'
import {
  createProgramme, getProgramme, openProgrammeForClient, recommendProgramme,
  awaitFirstPayment, markReadyForApproval, approveProgramme, pauseProgramme, resumeProgramme,
  authoriseFirstInternal, authoriseSecondInternal, goLiveProgramme,
  maySecondCharge, mayStartCampaign, mayComplete, completeProgramme,
  computeContribution, finaliseContribution, writeProgrammePartnerCommission,
  recordMakeWhole, nextBatchSize, ProgrammeStorageError,
} from '../lib/programme'
import { createProgrammeCheckoutSession } from '../lib/programme-checkout'

/**
 * The client's checkout address, or a 400 — never a blank string.
 *
 * ⚠️ FAIL CLOSED, AND THIS REPLACED A FAIL-OPEN `?? ''`. Stripe accepts a session with no
 * `customer_email`, so an empty string does not error: the checkout would be created, the
 * operator would hand over a link, and the client would simply never receive a receipt at an
 * address we hold. A money surface that degrades silently is the defect class this repo keeps
 * finding — the same shape as `.data ?? []` rendering a rejected query as an empty result.
 *
 * ⚠️ `contact_email`, NOT `email` — `clients` has no `email` column. The legacy wallet
 * checkout reads the address from the AUTHENTICATED USER's session, which an operator route
 * does not have. Caught by `schema-truth.test.ts`.
 *
 * A read error is refused too: not knowing the address is not the same as knowing it is fine.
 */
async function clientEmailOrRefuse(clientId: string, res: Response): Promise<string | null> {
  const { data, error } = await db.from('clients').select('contact_email').eq('id', clientId).maybeSingle()
  if (error) {
    res.status(502).json({ success: false, error: 'Could not read the client record, so no checkout was created. Nothing was charged.' })
    return null
  }
  const email = (data as { contact_email?: string | null } | null)?.contact_email
  if (typeof email !== 'string' || email.trim() === '') {
    res.status(400).json({
      success: false,
      error: 'This client has no contact email, so no checkout was created. Stripe would accept the session and the client would never receive a receipt. Set the contact email first.',
    })
    return null
  }
  return email.trim()
}

export const programmeRouter = Router()

/**
 * Wraps a handler so a thrown `ProgrammeStorageError` becomes a visible 503 instead of a
 * hung request.
 *
 * ⚠️ THIS IS NOT DECORATION — WITHOUT IT THE FIX WOULD BE WORSE THAN THE BUG. This is
 * Express 4 with no error-handling middleware and no async wrapper anywhere in the app, so
 * an async handler that throws produces an UNHANDLED PROMISE REJECTION: the request never
 * answers, the operator sees a spinner, and the process may die. Making the readers throw
 * only helps if something catches.
 *
 * A storage failure answers **503**, not 500: it is explicitly "ask again", and it says so
 * in words an operator can act on. Anything else keeps the 500 it would have had.
 */
function guard(
  fn: (req: Request, res: Response) => Promise<void>,
): (req: Request, res: Response) => void {
  return (req, res) => {
    fn(req, res).catch((e: unknown) => {
      if (res.headersSent) return
      if (e instanceof ProgrammeStorageError) {
        console.error('[programmes] storage read failed —', e.message)
        res.status(503).json({
          success: false,
          error: 'K.I.N.D could not read programme storage, so nothing was read or changed. This is NOT "no programme exists" — it is a storage failure. Try again; if it persists, check that the programme migration is applied.',
          storage: 'unavailable',
        })
        return
      }
      console.error('[programmes] unhandled error —', e)
      res.status(500).json({ success: false, error: 'Something went wrong. Nothing was changed.' })
    })
  }
}

programmeRouter.use((req: Request, res: Response, next: () => void) => {
  if (!adminKeyValid(req.headers['x-admin-key'])) {
    res.status(401).json({ success: false, error: 'Unauthorized' }); return
  }
  next()
})

/** PRICE — a quote, with nothing written. Safe to call while a client is still deciding. */
programmeRouter.get('/quote/:meetings', (req: Request, res: Response) => {
  const meetings = Number(req.params.meetings)
  try {
    res.json({ success: true, quote: quoteProgramme(meetings) })
  } catch (e) {
    res.status(400).json({ success: false, error: e instanceof Error ? e.message : 'Invalid meeting target' })
  }
})

/** Create the programme in DRAFT, priced once from the curve and stored. */
programmeRouter.post('/', guard(async (req: Request, res: Response) => {
  const { clientId, meetings } = req.body ?? {}
  if (!clientId || !Number.isInteger(meetings)) {
    res.status(400).json({ success: false, error: 'clientId and a whole meetings target are required.' }); return
  }
  const r = await createProgramme(String(clientId), Number(meetings))
  if (!r.ok) { res.status(400).json({ success: false, error: r.reason }); return }
  res.json({ success: true, programme: r.programme })
}))

programmeRouter.get('/client/:clientId', guard(async (req: Request, res: Response) => {
  const p = await openProgrammeForClient(req.params.clientId)
  res.json({ success: true, programme: p })
}))

programmeRouter.get('/:id', guard(async (req: Request, res: Response) => {
  const p = await getProgramme(req.params.id)
  if (!p) { res.status(404).json({ success: false, error: 'No such programme.' }); return }
  const { data: batches } = await db.from('programme_batches').select('*')
    .eq('programme_id', p.id).order('seq', { ascending: true })
  res.json({
    success: true,
    programme: p,
    batches: batches ?? [],
    // Derived read-outs, so an operator screen never re-implements a rule.
    nextBatchSize: nextBatchSize(p),
    maySecondCharge: maySecondCharge(p),
    mayStartCampaign: mayStartCampaign(p),
    mayComplete: mayComplete(p),
  })
}))

programmeRouter.post('/:id/recommend', guard(async (req: Request, res: Response) => {
  const r = await recommendProgramme(req.params.id)
  if (r.ok) await auditProgramme(req, 'programme_lifecycle', req.params.id, { from: 'DRAFT', to: 'RECOMMENDED' })
  res.status(r.ok ? 200 : 400).json({ success: r.ok, error: r.reason })
}))

/**
 * FIRST PAYMENT — mint the checkout for the first 50%.
 *
 * The amount comes from `programmeStripeAmountCents` inside the checkout module, derived
 * from the meeting target. The programme moves to AWAITING_FIRST_PAYMENT; the ceiling is NOT
 * set here — that happens when the webhook confirms the money actually arrived.
 */
programmeRouter.post('/:id/checkout/first', guard(async (req: Request, res: Response) => {
  const p = await getProgramme(req.params.id)
  if (!p) { res.status(404).json({ success: false, error: 'No such programme.' }); return }
  if (p.first_payment_ref) { res.status(400).json({ success: false, error: 'The first payment is already recorded.' }); return }

  const email = await clientEmailOrRefuse(p.client_id, res)
  if (email === null) return
  const r = await createProgrammeCheckoutSession({
    clientId: p.client_id, programmeId: p.id, meetings: p.meeting_target, stage: 'programme_first',
    successUrl: String(req.body?.successUrl ?? ''), cancelUrl: String(req.body?.cancelUrl ?? ''),
    clientEmail: email,
  })
  if (!r.url) { res.status(502).json({ success: false, error: r.error ?? 'Could not create checkout.' }); return }
  await awaitFirstPayment(p.id)
  res.json({ success: true, url: r.url, sessionId: r.sessionId })
}))

programmeRouter.post('/:id/ready-for-approval', guard(async (req: Request, res: Response) => {
  const r = await markReadyForApproval(req.params.id)
  if (r.ok) await auditProgramme(req, 'programme_lifecycle', req.params.id, { to: 'READY_FOR_APPROVAL', next: 'the client approves in Milla — Vida cannot' })
  res.status(r.ok ? 200 : 400).json({ success: r.ok, error: r.reason })
}))

/** ONE programme-level approval (founder lock 5) — never thousands of paid lead approvals. */
programmeRouter.post('/:id/approve', guard(async (req: Request, res: Response) => {
  const r = await approveProgramme(req.params.id)
  res.status(r.ok ? 200 : 400).json({ success: r.ok, error: r.reason })
}))

/**
 * SECOND PAYMENT — mint the checkout for the second 50%, at Approve & Go Live.
 *
 * ⚠️ REFUSED BEFORE THE CHECKOUT IS CREATED IF STATE FORBIDS IT. "Paused before Go Live means
 * the second 50% is not charged" (founder lock 6) has to be enforced HERE as well as at the
 * webhook — refusing only at the webhook would take the client's money and then decline to
 * act on it. The webhook still re-reads state, because a client can pause in between.
 */
programmeRouter.post('/:id/checkout/second', guard(async (req: Request, res: Response) => {
  const p = await getProgramme(req.params.id)
  if (!p) { res.status(404).json({ success: false, error: 'No such programme.' }); return }
  const gate = maySecondCharge(p)
  if (!gate.allowed) { res.status(400).json({ success: false, error: gate.reason }); return }

  const email = await clientEmailOrRefuse(p.client_id, res)
  if (email === null) return
  const r = await createProgrammeCheckoutSession({
    clientId: p.client_id, programmeId: p.id, meetings: p.meeting_target, stage: 'programme_second',
    successUrl: String(req.body?.successUrl ?? ''), cancelUrl: String(req.body?.cancelUrl ?? ''),
    clientEmail: email,
  })
  if (!r.url) { res.status(502).json({ success: false, error: r.error ?? 'Could not create checkout.' }); return }
  res.json({ success: true, url: r.url, sessionId: r.sessionId })
}))

/**
 * PAUSE — stops sourcing AND sending.
 *
 * ⚠️ Best-effort expiry of a live second checkout, then the refusal that actually matters.
 * Expiring the Stripe session is a courtesy: if it fails, or the client already has the tab
 * open and pays, `recordSecondPayment` re-reads state and records the money WITHOUT going
 * live. The URL is never authority.
 */
programmeRouter.post('/:id/pause', guard(async (req: Request, res: Response) => {
  const reason = req.body?.reason
  if (reason !== 'client' && reason !== 'quality' && reason !== 'icp_change') {
    res.status(400).json({ success: false, error: 'reason must be client, quality or icp_change.' }); return
  }
  const r = await pauseProgramme(req.params.id, reason)
  res.status(r.ok ? 200 : 400).json({
    success: r.ok, error: r.reason,
    note: 'Any second-payment checkout already open is not cancelled by this. If it is paid, the money is recorded and the programme does NOT go live.',
  })
}))

programmeRouter.post('/:id/resume', guard(async (req: Request, res: Response) => {
  const r = await resumeProgramme(req.params.id)
  res.status(r.ok ? 200 : 400).json({ success: r.ok, error: r.reason })
}))

// ═══════════════════════════════════════════════════════════════════════════════════════
// PR A2 · THE INTERNAL LIFECYCLE — House / Client Zero walks the customer's path, unpaid
// ═══════════════════════════════════════════════════════════════════════════════════════

/** Who pressed it. Same header the operator console already sends; never trusted for auth. */
function pressedBy(req: Request): string {
  const h = req.headers['x-operator-email']
  return (typeof h === 'string' && h.trim()) ? h.trim() : 'unknown-operator'
}

async function auditProgramme(
  req: Request, action: 'programme_lifecycle' | 'programme_internal_authority' | 'programme_go_live' | 'programme_icp_attached',
  programmeId: string, detail: Record<string, unknown>,
) {
  const { writeOperatorAudit } = await import('../lib/operator-audit')
  const p = await getProgramme(programmeId).catch(() => null)
  await writeOperatorAudit({
    operatorEmail: pressedBy(req),
    clientId: p?.client_id ?? null,
    action,
    subjectType: 'programme',
    subjectId: programmeId,
    detail,
  })
}

/**
 * MOVE TO P1 — RECOMMENDED only, and this route is stricter than the function it calls.
 *
 * ⚠️ `awaitFirstPayment` ACCEPTS DRAFT TOO, and that is left alone on purpose: the paid
 * checkout path has always been able to reach it from DRAFT, and narrowing a function the
 * Stripe flow depends on to fix an operator screen would be changing paying-client behaviour
 * to solve an internal problem. The restriction belongs to the NEW action, so it is enforced
 * here — in the route, not in the UI, because a route is callable without the screen that
 * hides its button.
 *
 * Creates no checkout, no session, and records no payment. The name says so: "Move to P1",
 * never "Pay".
 */
programmeRouter.post('/:id/await-first-payment', guard(async (req: Request, res: Response) => {
  const p = await getProgramme(req.params.id)
  if (!p) { res.status(404).json({ success: false, error: 'No such programme.' }); return }
  if (p.status !== 'RECOMMENDED') {
    res.status(400).json({
      success: false,
      error: `This action is only available from RECOMMENDED, not ${p.status}. Recommendation is not a step to skip — it is where the programme is priced and put to the client.`,
    })
    return
  }
  const r = await awaitFirstPayment(req.params.id)
  if (r.ok) await auditProgramme(req, 'programme_lifecycle', req.params.id, { from: 'RECOMMENDED', to: 'AWAITING_FIRST_PAYMENT', money: 'none — no checkout created, no payment recorded' })
  res.status(r.ok ? 200 : 400).json({ success: r.ok, error: r.reason })
}))

/**
 * INTERNAL P1 — authority without money.
 *
 * The response says `money: 'none'` explicitly, because the one thing an operator must never
 * have to infer from this screen is whether pressing it charged somebody.
 */
programmeRouter.post('/:id/authorise/first', guard(async (req: Request, res: Response) => {
  const r = await authoriseFirstInternal(req.params.id)
  if (r.ok) {
    await auditProgramme(req, 'programme_internal_authority', req.params.id, {
      stage: 'P1', by: pressedBy(req),
      money: 'none — no Stripe object, no invoice, no revenue, no commission, no wallet movement',
    })
  }
  res.status(r.ok ? 200 : 400).json({ success: r.ok, error: r.reason, money: 'none' })
}))

/**
 * INTERNAL P2 — authority without money, and WITHOUT going live.
 *
 * ⚠️ THE RESPONSE SAYS SO. Collapsing "P2 authorised" into "live" would take two separate
 * founder decisions and make them one keystroke; saying it in the payload keeps the screen
 * honest about what just happened.
 */
programmeRouter.post('/:id/authorise/second', guard(async (req: Request, res: Response) => {
  const r = await authoriseSecondInternal(req.params.id)
  if (r.ok) {
    await auditProgramme(req, 'programme_internal_authority', req.params.id, {
      stage: 'P2', by: pressedBy(req),
      money: 'none — no Stripe object, no invoice, no revenue, no commission, no wallet movement',
      live: false,
    })
  }
  res.status(r.ok ? 200 : 400).json({
    success: r.ok, error: r.reason, money: 'none',
    note: 'P2 authority is not Go Live. The programme goes live only when a human presses Make live.',
  })
}))

/** THE EXPLICIT GO LIVE. Idempotent: an already-live programme succeeds and writes nothing. */
programmeRouter.post('/:id/go-live', guard(async (req: Request, res: Response) => {
  const r = await goLiveProgramme(req.params.id)
  // ⚠️ NO AUDIT ROW FOR A NO-OP. An already-live programme did not transition, and recording
  // a second "went live" would put an event in the log that never happened.
  if (r.ok && !r.alreadyLive) await auditProgramme(req, 'programme_go_live', req.params.id, { by: pressedBy(req) })
  res.status(r.ok ? 200 : 400).json({ success: r.ok, error: r.reason, already_live: r.alreadyLive ?? false })
}))

/**
 * ATTACH ONE ICP TO THIS PROGRAMME — the only writer of `icps.programme_id` in the product.
 *
 * ⚠️ ONE ICP PER CALL, DELIBERATELY. There is no "attach all": which targeting feeds a
 * programme is a decision about what the client will be shown and billed for, and a bulk
 * button turns that decision into a reflex.
 */
programmeRouter.post('/:id/attach-icp', guard(async (req: Request, res: Response) => {
  const icpId = typeof req.body?.icp_id === 'string' ? req.body.icp_id : ''
  if (!icpId) { res.status(400).json({ success: false, error: 'icp_id is required.' }); return }
  const { attachIcpToProgramme } = await import('../lib/programme-icp')
  const r = await attachIcpToProgramme(req.params.id, icpId)
  if (r.ok && !r.alreadyAttached) {
    await auditProgramme(req, 'programme_icp_attached', req.params.id, {
      icp_id: icpId, icp_name: r.icp.name, by: pressedBy(req),
      effect: 'future sourcing from this ICP belongs to this programme; no historical lead, enrollment or campaign was changed',
    })
  }
  res.status(r.ok ? 200 : 400).json({
    success: r.ok,
    error: r.ok ? undefined : r.reason,
    already_attached: r.ok ? (r.alreadyAttached ?? false) : false,
    note: 'Only future sourcing is affected. Existing leads and enrolments keep the attribution they already had.',
  })
}))

/**
 * CONTRIBUTION — always labelled. A provisional figure is returned as provisional and is
 * never persisted; only a terminal, value-settled programme can be finalised.
 */
programmeRouter.get('/:id/contribution', guard(async (req: Request, res: Response) => {
  const b = await computeContribution(req.params.id)
  if (!b) { res.status(404).json({ success: false, error: 'No such programme.' }); return }
  res.json({
    success: true, contribution: b,
    label: b.provisional
      ? 'PROVISIONAL — the programme is still open; costs are still moving. Not a final figure and not a partner commission basis.'
      : 'FINAL basis. Contribution is programme revenue minus directly attributable acquisition and delivery costs, with fixed company overhead excluded. It is NOT net profit and NOT net margin.',
  })
}))

programmeRouter.post('/:id/contribution/finalise', guard(async (req: Request, res: Response) => {
  const r = await finaliseContribution(req.params.id)
  res.status(r.ok ? 200 : 400).json({ success: r.ok, cents: r.cents, error: r.reason })
}))

programmeRouter.post('/:id/partner-commission', guard(async (req: Request, res: Response) => {
  const { partnerId, periodMonth } = req.body ?? {}
  if (!partnerId || !periodMonth) {
    res.status(400).json({ success: false, error: 'partnerId and periodMonth are required.' }); return
  }
  const r = await writeProgrammePartnerCommission({
    programmeId: req.params.id, partnerId: String(partnerId), periodMonth: String(periodMonth),
  })
  res.status(r.ok ? 200 : 400).json({ success: r.ok, cents: r.cents, error: r.reason })
}))

/** MAKE-WHOLE — a delivery obligation, deliberately not a Stripe refund. */
programmeRouter.post('/:id/make-whole', guard(async (req: Request, res: Response) => {
  const { cents, note } = req.body ?? {}
  const r = await recordMakeWhole(req.params.id, Number(cents), String(note ?? ''))
  res.status(r.ok ? 200 : 400).json({
    success: r.ok, error: r.reason,
    note: 'Recorded as undelivered value settled. This is NOT a Stripe refund — if money is also to be returned, do that separately in Stripe.',
  })
}))

programmeRouter.post('/:id/complete', guard(async (req: Request, res: Response) => {
  const r = await completeProgramme(req.params.id)
  res.status(r.ok ? 200 : 400).json({ success: r.ok, error: r.reason })
}))
