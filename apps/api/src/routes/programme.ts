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
