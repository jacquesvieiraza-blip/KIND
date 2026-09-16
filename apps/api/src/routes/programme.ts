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
  awaitFirstPayment, approveProgramme, pauseProgramme, resumeProgramme,
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

/**
 * ⛓️ 9 Sep — THIS ROUTE WAS THE DEADLOCK, AND THE FIX IS HERE RATHER THAN IN THE GATE.
 *
 * 🛑 It called `markReadyForApproval` DIRECTLY. That function demands, through
 * `programmePreparationReadiness`, the campaign, sequence, cadence, schedule and enrolments
 * that only `prepareProgrammeOutreach` creates — and preparation's two callers were Make Live
 * and the paid-P2 webhook, both strictly AFTER approval. So a programme that had sourced,
 * qualified and settled could press this button forever and only ever be told what was missing.
 *
 * `advanceProgrammeToReview` does the preparation first and then asks the SAME unchanged
 * question. No requirement is weakened, skipped or reordered: the transition re-proves all
 * sixteen itself and still freezes the review snapshot in the same write as the status.
 *
 * ⚠️ IT STILL SENDS NOTHING. Pre-approval preparation creates the campaign as a DRAFT
 * (`activate: false`); activation remains behind `assertGoingLive`, which demands an approval
 * and P2. Preparing is not sending, and this route cannot make it so.
 */
/**
 * ⛓️ 9 Sep — THE RESPONSE RETURNS BEFORE THE WORK FINISHES, and that is the whole fix.
 *
 * 🛑 WHAT HAPPENED. This route held the connection open for the entire chain — for House,
 * thousands of sequential Supabase round trips across 246 prospects, several minutes — until
 * an edge in front of Vida closed it with a plain-text `upstream error`. The API kept running
 * (the sequence write landed), Vida tried to parse the text as JSON, and the founder read
 * *Unexpected token 'u'*. The eventual outcome was delivered to nobody and, because this route
 * audited success only, recorded nowhere.
 *
 * Now: the same work starts, in the same order, behind the same unchanged gates, and this
 * responds 202 at once. `startAdvanceInBackground` audits the outcome on BOTH branches, and
 * Vida reads it back from the programme panel as *last preparation attempt*. A second press
 * while a run is in flight is answered *already running*, never started twice.
 *
 * ⚠️ NOTHING IS WEAKENED. `advanceProgrammeToReview` still runs preparation, still consults
 * readiness, still hands the transition to `markReadyForApproval` with its sixteen
 * requirements and its snapshot freeze. Only WHEN the client learns the answer has changed.
 */
programmeRouter.post('/:id/ready-for-approval', guard(async (req: Request, res: Response) => {
  const { startAdvanceInBackground } = await import('../lib/programme-advance')
  const started = startAdvanceInBackground(req.params.id, 'operator_recovery', pressedBy(req))
  await auditProgramme(req, 'programme_lifecycle', req.params.id, {
    to: 'READY_FOR_APPROVAL', requested: true, started: started.started, already_running: started.already_running,
    next: started.started
      ? 'preparation is running in the background — the programme panel shows the outcome'
      : 'a preparation run was already in flight for this programme; nothing new was started',
  })
  res.status(202).json({
    success: true,
    data: {
      started: started.started,
      already_running: started.already_running,
      headline: started.started
        ? 'Preparing this programme for the client. This runs in the background and can take a few minutes — the programme panel shows the outcome when it finishes. Nothing is sent.'
        : 'This programme is already being prepared. Nothing new was started — wait for the current run to finish.',
    },
  })
}))

/**
 * ⚑ 11 Sep (DAY 3) — RE-FREEZE THE REVIEW PACKAGE, WHICH MAKES A NEW VERSION.
 *
 * 🛑 THE DEAD END THIS OPENS. The versioning rule was fully enforced and had no remedy: once
 * anything approval-relevant moved under a reviewing client, `reviewDrift` refused every
 * approval — correctly, because what they were looking at was not what would run — and NOTHING
 * in the product could re-freeze it. The client pressed, was told to take another look, took
 * another look, and pressed again. Forever.
 *
 * ⚠️ IT AUTHORISES NOTHING AND CHANGES NO WORK. It re-reads what preparation has already
 * produced, re-proves every readiness requirement, and stamps a NEW version so the client is
 * asked again. It never approves, never grants P2, never makes live and never sends — and it
 * cannot touch an APPROVED programme at all, because re-freezing approved work IS the in-place
 * mutation the founder's rule forbids.
 *
 * ⚠️ AN UNCHANGED PACKAGE WRITES NOTHING, so pressing it on a healthy programme is a no-op
 * rather than a version bump that invalidates the screen a client has open.
 */
programmeRouter.post('/:id/refreeze', guard(async (req: Request, res: Response) => {
  const { refreezeForReview } = await import('../lib/programme')
  const r = await refreezeForReview(req.params.id)
  if (!r.ok) {
    await auditProgramme(req, 'programme_lifecycle', req.params.id, {
      refreeze: 'refused', reason: r.reason, by: pressedBy(req),
      money: 'none — re-freezing changes no authority and no money',
    })
    res.status(r.code === 'not_found' ? 404 : r.code === 'unreadable' ? 503 : 409)
      .json({ success: false, error: r.code, message: r.reason })
    return
  }
  await auditProgramme(req, 'programme_lifecycle', req.params.id, {
    refreeze: r.changed ? 'new version' : 'unchanged — nothing written',
    version: r.version, by: pressedBy(req),
    money: 'none — re-freezing changes no authority and no money',
    authorised: 'nothing — the client is asked to approve the new version',
  })
  res.json({
    success: true,
    data: {
      changed: r.changed,
      version: r.version,
      headline: r.changed
        ? `This is now version ${r.version}. The client is being asked to approve the updated package — nothing was approved, charged or sent.`
        : 'Nothing had changed, so nothing was re-frozen. The client is still looking at the current version.',
    },
  })
}))

/**
 * 🛑 WITHDRAWN (founder-locked 11 Sep). THE CLIENT APPROVES; AN OPERATOR MAY NOT APPROVE FOR
 * THEM.
 *
 * ⛓️ THIS ROUTE USED TO WORK, AND THAT WAS THE BYPASS. It called `approveProgramme` with a
 * programme id and nothing else — no client, no ownership, no House check — so anybody holding
 * the admin key could approve ANY client's programme, and the row afterwards was
 * indistinguishable to every downstream reader from the client having agreed. Vida never drew
 * a button for it, which is a courtesy; this is the control. *"A BACKEND AUTHORITY, NOT A
 * HIDDEN BUTTON"* is this repo's own rule and it applies to its own doors.
 *
 * ⚠️ KEPT AND REFUSING, NOT DELETED. A removed route is a hole the next person fills; a route
 * that answers 403 with the rule is the rule. `approveProgramme` refuses on its own too, so
 * this is the second of two locks rather than the only one.
 */
programmeRouter.post('/:id/approve', guard(async (req: Request, res: Response) => {
  const r = await approveProgramme(req.params.id)
  await auditProgramme(req, 'programme_lifecycle', req.params.id, {
    approve: 'refused — client-owned', by: pressedBy(req),
    money: 'none — nothing was approved, authorised or charged',
  })
  // 403, not 400: this is not a badly-formed request or a wrong state. It is an act an
  // operator does not have the authority to perform, in any state, for any client.
  res.status(403).json({ success: false, error: 'client_owned', message: r.reason })
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
  req: Request,
  // ⛓️ 16 Sep (MVP1 · D3) — `programme_review_resolved` joins the list. Every member is a
  // material act that moves no money, which is exactly why each is audited: a payment leaves a
  // Stripe object behind it, an authority leaves one timestamp.
  action: 'programme_lifecycle' | 'programme_internal_authority' | 'programme_go_live'
    | 'programme_icp_attached' | 'programme_run' | 'programme_review_resolved',
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
  let started: { started: boolean; already_running: boolean; detail: string } | null = null
  if (r.ok) {
    await auditProgramme(req, 'programme_internal_authority', req.params.id, {
      stage: 'P1', by: pressedBy(req),
      money: 'none — no Stripe object, no invoice, no revenue, no commission, no wallet movement',
    })
    // ⚑ 9 Sep — INTERNAL P1 IS P1. The founder-locked rule is about the AUTHORITY, not about
    // which door committed it: a programme authorised internally starts exactly as a paid one
    // does. `authoriseFirstInternal` refuses unless the programme was AWAITING_FIRST_PAYMENT,
    // so this cannot fire twice for one programme, and the continuation re-proves every fact
    // from the row before anything is bought.
    const { startProgrammeAfterP1 } = await import('../lib/programme-p1-continuation')
    started = await startProgrammeAfterP1(req.params.id, 'internal_first_authority', pressedBy(req))
  }
  res.status(r.ok ? 200 : 400).json({ success: r.ok, error: r.reason, money: 'none', sourcing: started })
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
  const r = await goLiveProgramme(req.params.id, pressedBy(req))
  // ⚠️ NO AUDIT ROW FOR A NO-OP. An already-live programme did not transition, and recording
  // a second "went live" would put an event in the log that never happened.
  //
  // ⚑ THE AUDIT RECORDS WHAT PREPARATION ACHIEVED, including a partial one. A go-live that
  // left the programme unable to work its leads is exactly the event somebody will need to
  // find later, so it is written whether or not preparation completed.
  if (r.preparation || (r.ok && !r.alreadyLive)) {
    await auditProgramme(req, 'programme_go_live', req.params.id, {
      by: pressedBy(req),
      operable: r.ok,
      campaigns: r.preparation?.campaigns.length ?? 0,
      enrolled: r.preparation?.enrolled.length ?? 0,
      already_enrolled: r.preparation?.alreadyEnrolled ?? 0,
      problems: r.preparation?.problems ?? [],
      sent: 'nothing — preparation creates campaigns and enrolments only',
    })
  }
  res.status(r.ok ? 200 : 400).json({
    success: r.ok, error: r.reason, already_live: r.alreadyLive ?? false,
    // 🛑 THE SCREEN MUST NOT BE ABLE TO SAY "LIVE" WITHOUT SAYING WHETHER IT WORKS.
    operable: r.ok,
    preparation: r.preparation ?? null,
    // ⚑ 10 Sep (H) — AND IT MUST NOT READ AS "SENDING". Make Live ARMS; nothing leaves until
    // Run. Stated in the response so a screen cannot imply otherwise by omission.
    armed_only: true,
    sends: 'zero — Run is a separate action',
  })
}))

/**
 * 🛑 RUN — THE SECOND OPERATOR ACT. IT GRANTS DELIVERY AUTHORITY AND SENDS NOTHING ITSELF.
 *
 * ⚠️ SEPARATE ROUTE, SEPARATE PRESS, SEPARATE AUDIT ROW. Before this existed, Run was
 * `POST /operator/send-due/run-once` — a bounded send with no persisted grant — so nothing
 * on the programme distinguished "armed" from "started" and the cron treated LIVE as both.
 *
 * ⚠️ THE KILL-SWITCH IS NOT CHECKED HERE, ON PURPOSE. Run records an AUTHORITY; the switch
 * governs DELIVERY, and it is asked at the provider seam every time something actually goes
 * out. Refusing the grant while the switch is on would mean the founder could not arrange a
 * programme's authority before opening the switch — and would tempt exactly the "just flip it
 * for a second" shape R114 exists to remove.
 */
programmeRouter.post('/:id/run', guard(async (req: Request, res: Response) => {
  const { runProgramme } = await import('../lib/programme')
  const r = await runProgramme(req.params.id, pressedBy(req))
  // ⚠️ NO AUDIT ROW FOR A NO-OP. A repeat press changes nothing and the log must not gain a
  // second "started" event for one start; the first press keeps the record.
  if (r.ok && !r.alreadyRunning) {
    await auditProgramme(req, 'programme_run', req.params.id, {
      by: pressedBy(req),
      run_at: r.runAt ?? null,
      granted: 'external delivery authority for this programme',
      sent: 'nothing — Run grants authority; delivery still passes the kill-switch, schedule, caps, sender and per-lead gates',
    })
  }
  res.status(r.ok ? 200 : 400).json({
    success: r.ok, error: r.reason,
    already_running: r.alreadyRunning ?? false,
    run_at: r.runAt ?? null,
  })
}))

/**
 * ⚑ 16 Sep (MVP1 · D3) — RESOLVE THE REVIEW HOLD. The door that was missing.
 *
 * 🛑 `review_required_at` had a writer and `review_resolved_at` had none, so the R77 benchmark
 * hold was a one-way door: a programme that reached it lost its next-batch authority for ever
 * and no screen in the product could return it.
 *
 * ⚠️ IT RESOLVES A REVIEW; IT DOES NOT CHANGE ONE. The trigger, its threshold and its reason
 * sentence are untouched. Nothing is paused, refunded, sent or approved here.
 *
 * ⚠️ AND IT IS AUDITED, because clearing this hold returns authority to spend on a programme
 * that is not converting — which is exactly the decision a person must be answerable for.
 */
programmeRouter.post('/:id/resolve-review', guard(async (req: Request, res: Response) => {
  const { resolveProgrammeReview } = await import('../lib/programme-authority')
  const r = await resolveProgrammeReview(req.params.id, pressedBy(req))
  if (r.ok) {
    await auditProgramme(req, 'programme_review_resolved', req.params.id, {
      by: pressedBy(req),
      resolved_at: r.resolvedAt,
      granted: 'new-batch authority for this programme resumes',
      sent: 'nothing — resolving a review grants no delivery; every send gate still applies',
    })
  }
  res.status(r.ok ? 200 : 409).json({
    success: r.ok,
    error: r.ok ? undefined : r.detail,
    reason: r.ok ? undefined : r.reason,
    resolved_at: r.ok ? r.resolvedAt : null,
  })
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
