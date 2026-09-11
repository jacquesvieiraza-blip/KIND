// ═══════════════════════════════════════════════════════════════════════════════════════
// THE CUSTOMER'S PROGRAMME — the only programme truth Milla is allowed to read.
//
// ⚠️ ITS OWN ROUTER, AND THAT IS NOT TIDINESS. `routes/programme.ts` is the BUILD-002 operator
// money surface and gates EVERY route behind `adminKeyValid` at the router level — checkout,
// approve, pause, complete. A customer read cannot live in it: it would either be unreachable
// from a browser or it would require loosening that gate, which is the last gate that should
// ever be loosened. Separate router, session auth, read-only.
//
// 🛑 WHY THIS IS NOT `/operator/programme`. That endpoint exists and returns the right facts,
// and reusing it would have been one line. It is admin-key gated, and it returns OPERATOR
// truth: stranded batch ids, reservation arithmetic, "needs reconciling by hand", the internal
// blocker vocabulary. None of that belongs in front of a paying customer — a client reading
// "batch 3 is STRANDED, 150 records held" learns only that something is broken and that we
// talk about them in machine. So the customer gets its own read model, scoped to their own
// client by their own session, returning the seven stages the founder specified and nothing
// else.
//
// ⚠️ TENANCY COMES FROM THE SESSION, NEVER FROM THE REQUEST. `getClientId(req.userId)` — the
// same shape every other customer route uses. No `client_id` query parameter exists here, so
// there is nothing for a browser to tamper with.
//
// ⚠️ READ-ONLY. This router performs no writes at all. Payment, approval and go-live already
// have their own routes with their own money guards; a read model that could also spend would
// be the wrong place for either.
//
// ⚠️ `null` IS "UNKNOWN", NEVER "FINE". A failed read returns a 503 carrying the founder's
// locked copy rather than an empty programme — because an empty programme renders as "you have
// no programme", which for a paying client is a lie with their money in it.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { Router } from 'express'
import { requireAuth, AuthRequest } from '../middleware/auth'
import { db } from '@kind/db'
import { MILLA_FAILURE_COPY } from '@kind/shared'
// ⚑ 30 Aug (BUILD-004A-2) — THE READ MOVED, THE CONTRACT DID NOT. Milla's chat now needs the
// same programme facts this route serves, and a second reader would be a second truth — the
// exact defect the 4A-1 live walk found (a campaign row saying "Paused" beside a programme
// saying "Proof"). One reader, two doors. This route's response shape is unchanged.
import { readCustomerProgramme, type CustomerProgramme } from '../lib/customer-programme'
import { p2Authorised, firstPaid, firstInternallyAuthorised, secondInternallyAuthorised } from '../lib/programme'

export type { CustomerProgramme }

export const myProgrammeRouter = Router()
myProgrammeRouter.use(requireAuth)

async function getClientId(userId: string): Promise<string | null> {
  const { data } = await db.from('clients').select('id').eq('user_id', userId).maybeSingle()
  return data?.id ?? null
}

myProgrammeRouter.get('/', async (req: AuthRequest, res) => {
  try {
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }

    const data = await readCustomerProgramme(clientId)
    // 🛑 A FAILED READ IS NOT "NO PROGRAMME". Returning `{ programme: null }` here would render
    // the Proof stage to a client who has paid — telling them their programme does not exist.
    // 503 + the locked sentence instead, which says what has NOT changed.
    if (data === null) {
      res.status(503).json({ success: false, error: MILLA_FAILURE_COPY.pipelineFailed })
      return
    }
    res.json({ success: true, data })
  } catch (err) {
    console.error('[programme/me]', err)
    res.status(503).json({ success: false, error: MILLA_FAILURE_COPY.pipelineFailed })
  }
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// THE CUSTOMER'S REVIEW, AND THE ONE APPROVAL THEY GIVE
//
// R39, founder-locked 15 Aug: **"We run it in Vida; the client approves in Milla."**
//
// ⚠️ THE ROUTER'S EXISTING PROMISE IS NARROWED HERE, DELIBERATELY AND ONCE. Its header says
// "READ-ONLY. This router performs no writes at all." That was correct when the only customer
// programme act was reading, and it is no longer the whole truth: the customer's ONE approval
// is a write, it is theirs, and R39 says it happens in Milla. Everything else stays true —
// there is still exactly one write in this file, it moves no money, and payment and go-live
// keep their own routes and their own guards.
//
// 🛑 AND THE ADMIN SURFACE IS UNTOUCHED. `routes/programme.ts` still gates every operator route
// behind `adminKeyValid`; `POST /programmes/:id/approve` still exists for the operator. This is
// not a loosening of that gate — it is a second door with its own, weaker, correctly-scoped
// authority: a session that proves it owns the client, and nothing else.
// ═══════════════════════════════════════════════════════════════════════════════════════

/**
 * The programme this customer may review or approve, resolved from THEIR OWN session.
 *
 * ⚠️ THE PROGRAMME IS NEVER TAKEN FROM THE REQUEST. There is no `:id` in these routes and no
 * body field that names a programme — the client comes from the session and the programme comes
 * from the client. A customer who wants to approve somebody else's programme has nowhere to put
 * the id. That is stronger than validating one, because there is no parameter to get wrong.
 */
async function openProgrammeForSession(clientId: string) {
  const { openProgrammeForClient } = await import('../lib/programme')
  return openProgrammeForClient(clientId)
}

// ── GET /my/programme/review — the masked prospects for THIS programme ─────────────────
myProgrammeRouter.get('/review', async (req: AuthRequest, res) => {
  try {
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }

    const p = await openProgrammeForSession(clientId)
    if (!p) { res.json({ success: true, data: { programme: null, prospects: [], total: 0, canApprove: false } }); return }

    const { readProgrammeReviewSet } = await import('../lib/programme-review')
    const set = await readProgrammeReviewSet(clientId, p.id)

    // ── ⛓️ 9 Sep — WHAT THE CLIENT IS ACTUALLY APPROVING, READ FROM THE FREEZE ────────────
    //
    // 🛑 THE BACKEND HANDOFF WORKED AND THE EXPERIENCE DID NOT. This route returned the masked
    // prospect list and nothing else, so a customer at the Approval stage was shown an outcome
    // and a count and asked to approve — with no sight of the words that would be sent, and no
    // indication that what they were reading was FROZEN.
    //
    // ⚠️ READ FROM `review_preparation_snapshot`, NEVER REBUILT. The snapshot is written in the
    // same conditional UPDATE as `status = 'READY_FOR_APPROVAL'`, so it describes the work as
    // it stood when the question was put. Re-resolving the sequence here would show whatever is
    // true NOW and collect consent against it — precisely the drift the freeze exists to stop.
    //
    // ⚠️ AND IT CARRIES NO IDENTIFIERS. Steps, timing and counts; no lead ids, no campaign id,
    // no sequence id, no sender address. The customer approves the WORK, not our plumbing.
    const snapObj = ((): Record<string, unknown> | null => {
      const raw = (p as unknown as { review_preparation_snapshot?: unknown }).review_preparation_snapshot
      return raw && typeof raw === 'object' ? raw as Record<string, unknown> : null
    })()
    const rawSteps = Array.isArray(snapObj?.steps) ? snapObj.steps as Record<string, unknown>[] : []
    const frozen = snapObj ? {
      /**
       * ⚑ 11 Sep (DAY 3) — WHICH EXACT VERSION THIS IS, and the client sends it back when they
       * approve.
       *
       * 🛑 THE GAP THIS CLOSES. Approval recorded `approved_preparation_hash` from whatever
       * was frozen AT THE MOMENT OF THE PRESS. The client never said which version they were
       * approving — so a re-preparation between the screen rendering and the button being
       * pressed was approved silently, and the founder's rule is the opposite: never mutate an
       * approved frozen version underneath the client; a change means a NEW version and a NEW
       * approval.
       *
       * ⚠️ IT IS AN OPAQUE VERSION STRING TO THE CLIENT, not "our plumbing" — it identifies
       * the package they are reading and nothing else.
       */
      version: (p as unknown as { review_preparation_hash?: string | null }).review_preparation_hash ?? null,
      at: (p as unknown as { review_preparation_at?: string | null }).review_preparation_at ?? null,
      messages: rawSteps.map((st, i) => ({
        step: i + 1,
        subject: String(st.subject ?? ''),
        body: String(st.body ?? ''),
        /** Days after this message before the next one. The final step's own wait is unused. */
        wait_days: Number.isFinite(st.wait_days as number) ? Number(st.wait_days) : 0,
      })),
      /** How many prospects the frozen set holds — the exact population being approved. */
      prospects: Array.isArray(snapObj.enrolled_lead_ids) ? snapObj.enrolled_lead_ids.length : 0,
      send_schedule: snapObj.send_schedule ?? null,
    } : null

    res.json({
      success: true,
      data: {
        programme: {
          id: p.id,
          status: p.status,
          meeting_target: p.meeting_target ?? null,
          approved_at: p.approved_at ?? null,
          paused: !!p.paused_at,
          // ⚑ P2 STATUS, SO THE SCREEN NEVER HAS TO GUESS WHAT COMES NEXT.
          //
          // ⚠️ THROUGH THE CANONICAL HELPER, NOT THE COLUMNS. `p2Authorised` is the ONE
          // definition of "the second half is settled" — paid or internally authorised, since
          // House runs on the second and owes nothing. Naming the columns here would restate
          // that rule in a second place AND breach the internal-authority allowlist, which
          // exists precisely so a fourth module cannot invent its own answer.
          second_settled: p2Authorised(p),
        },
        frozen,
        prospects: set.prospects,
        total: set.total,
        // ⚠️ `complete: false` MEANS "AT LEAST `total`". The scan is bounded at
        // REVIEW_SCAN_BUDGET rows, so a very large programme reports a floor rather than a
        // number it did not finish counting. The UI renders "N+" for that case — telling a
        // customer "5,000 prospects" when we stopped counting at 5,000 would be a made-up
        // figure, and telling them exactly 5,000 when there are 6,200 is worse.
        complete: set.complete,
        // ⚠️ THE BUTTON'S ENABLED-NESS IS DECIDED SERVER-SIDE, and re-decided by the POST. This
        // is what the UI renders from; it is NOT what authorises anything.
        canApprove: p.status === 'READY_FOR_APPROVAL' && !p.paused_at && set.total > 0,
      },
    })
  } catch (err) {
    // 🛑 A FAILED READ IS NOT AN EMPTY DESK. Returning `[]` here would render "we found nobody"
    // to a customer whose programme is full of people — and then offer them an approval button
    // for a set they cannot see. 503 and the locked sentence instead.
    console.error('[programme/me/review]', err)
    res.status(503).json({ success: false, error: MILLA_FAILURE_COPY.pipelineFailed })
  }
})

// ── POST /my/programme/approve — THE ONE CUSTOMER APPROVAL ─────────────────────────────
//
// 🛑 WHAT THIS IS NOT: it is not P2, it is not go-live, it is not send authority, and it is not
// a per-lead approval. It writes `status = APPROVED` and `approved_at`, and every one of those
// other things keeps its own separate act with its own separate guard.
// ── ⛓️ 9 Sep — THE CLIENT'S OWN PAYMENT DOORS ──────────────────────────────────────────
//
// 🛑 A CLIENT COULD NOT PAY. `/programmes/:id/checkout/first` and `/checkout/second` create
// correctly scoped Stripe sessions and always have — but they live on `programmeRouter`, which
// is behind the ADMIN KEY. So the only way to take a programme payment was for an operator to
// mint a link and send it by hand. Milla is supposed to own the client payment experience, and
// it had no door at all.
//
// ⚠️ NO NEW PAYMENT LOGIC. Both routes call the SAME `createProgrammeCheckoutSession` with the
// same metadata and the same amounts, derived from the stored row exactly as before. What is
// new is only WHO may ask, and how the programme is resolved.
//
// 🛑 THE PROGRAMME COMES FROM THE SESSION, NEVER FROM THE REQUEST. A body-supplied programme id
// would let any signed-in customer mint a checkout against somebody else's programme — with
// that programme's id in the metadata, and therefore that programme's authority when the
// webhook lands. The client is resolved from `req.userId`, the programme from the client, and
// nothing about either is taken from the caller.
//
// ⚠️ AND THE WEBHOOK REMAINS THE AUTHORITY. A checkout URL grants nothing: an abandoned or
// failed session leaves the row untouched, and `recordFirstPayment` / `recordSecondPayment`
// re-read state and compare-and-set. These routes create an intention to pay, not a payment.
async function programmeCheckout(
  req: AuthRequest, res: Parameters<Parameters<typeof myProgrammeRouter.post>[1]>[1],
  stage: 'programme_first' | 'programme_second',
): Promise<void> {
  const clientId = await getClientId(req.userId!)
  if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }

  const p = await openProgrammeForSession(clientId)
  if (!p) { res.status(404).json({ success: false, error: 'not_found', message: 'No such programme.' }); return }

  // 🛑 THE SAME STATE RULES THE OPERATOR DOORS USE. Restating them loosely here is how a client
  // pays for a stage the programme is not in.
  if (stage === 'programme_first') {
    if (firstPaid(p)) {
      res.status(409).json({ success: false, error: 'already_paid', message: 'The first payment is already recorded.' }); return
    }
    if (firstInternallyAuthorised(p)) {
      res.status(409).json({ success: false, error: 'internally_authorised', message: 'This programme is authorised internally and owes nothing.' }); return
    }
    // ── 🛑 ⚑ 11 Sep (DAY 3) — P1 IS NOT EXPOSED UNTIL THE CLIENT HAS ACCEPTED ─────────
    //
    // 🛑 THE GAP THIS CLOSES. `POST /programme/me/accept` exists and persists
    // `recommendation_accepted_at`, and NOTHING read it before charging. So the first payment
    // was reachable for a client who had only ever SEEN the recommendation: the calculator
    // renders, the checkout button posts, Stripe opens. Viewing is not accepting, and the
    // recommendation is a TARGET rather than a guarantee — being asked for money against a
    // target nobody agreed to is the defect.
    //
    // ⚠️ IT REFUSES BEFORE A STRIPE SESSION IS CREATED, so nothing is minted, nothing is
    // charged, and the answer names the missing act rather than reading as a fault.
    //
    // ⚠️ AND IT IS THE SERVER'S CHECK. Milla hides the payment step until acceptance is
    // recorded; a hidden button is a courtesy and this is the control.
    //
    // ⚠️ FAIL-CLOSED ONLY WHERE THE COLUMN EXISTS. On a database where
    // `20260910_programme_calculator_choice` has not run the field reads `undefined`, which
    // would refuse every first payment in the book — so an ABSENT column is treated as the
    // pre-migration world and lets the old behaviour stand, while an explicit `null` (the
    // column exists, nobody accepted) refuses.
    const acceptance = (p as unknown as { recommendation_accepted_at?: string | null })
    if ('recommendation_accepted_at' in acceptance && !acceptance.recommendation_accepted_at) {
      res.status(409).json({
        success: false, error: 'not_accepted',
        message: 'This recommendation has not been accepted yet. Accept it with Milla and the first payment step opens. Nothing has been charged.',
      })
      return
    }
    if (p.status !== 'RECOMMENDED' && p.status !== 'AWAITING_FIRST_PAYMENT') {
      res.status(409).json({ success: false, error: 'wrong_state', message: `This programme is ${p.status}, so the first payment is not due.` }); return
    }
  } else {
    const { maySecondCharge } = await import('../lib/programme')
    const gate = maySecondCharge(p)
    if (!gate.allowed) { res.status(409).json({ success: false, error: 'wrong_state', message: gate.reason }); return }
    if (secondInternallyAuthorised(p)) {
      res.status(409).json({ success: false, error: 'internally_authorised', message: 'This programme is authorised internally and owes nothing.' }); return
    }
  }

  const { data: c } = await db.from('clients').select('contact_email').eq('id', clientId).maybeSingle()
  const email = (c as { contact_email?: string | null } | null)?.contact_email
  if (typeof email !== 'string' || email.trim() === '') {
    // ⚠️ FAIL CLOSED. Stripe accepts a session with no email, so the checkout would be created
    // and the client would never receive a receipt at an address we hold.
    res.status(400).json({ success: false, error: 'no_email', message: 'We do not have your email address, so we could not start the payment. Nothing was charged.' })
    return
  }

  const { createProgrammeCheckoutSession } = await import('../lib/programme-checkout')
  const r = await createProgrammeCheckoutSession({
    clientId, programmeId: p.id, meetings: p.meeting_target, stage,
    successUrl: String((req.body ?? {}).successUrl ?? ''),
    cancelUrl: String((req.body ?? {}).cancelUrl ?? ''),
    clientEmail: email.trim(),
  })
  if (!r.url) {
    res.status(502).json({ success: false, error: 'checkout_failed', message: r.error ?? 'We could not start the payment. Nothing was charged.' })
    return
  }
  res.json({ success: true, data: { url: r.url } })
}

// ═══════════════════════════════════════════════════════════════════════════════════════
// 🛑 THE CALCULATOR — CLIENT-FACING, IN MILLA (B/C, 10 Sep)
//
// `GET /programmes/quote/:meetings` already existed and returned exactly the right figures —
// behind the ADMIN KEY, on a router no client browser can reach, and the portal never called
// it. So the one primitive the calculator needs was present and unreachable.
//
// ⚠️ A QUOTE WRITES NOTHING. It is safe to call on every keystroke while a client is still
// deciding, which is precisely why it is a GET with no side effect.
// ⚠️ AND IT IS STILL GATED — `requireAuth` plus the client's own record. A quote is not a
// secret, but an unauthenticated pricing endpoint is a free scraping surface for our curve.
// ═══════════════════════════════════════════════════════════════════════════════════════
myProgrammeRouter.get('/calculator', async (req: AuthRequest, res) => {
  try {
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }
    const { calculateProgramme, meetingTargetProblem, TARGET_NOT_GUARANTEE, ILLUSTRATIVE_LABEL,
            LEADS_PER_TARGETED_MEETING, MIN_LEADS_PER_MEETING } = await import('@kind/shared')
    const meetings = Number(req.query.meetings)
    const problem = meetingTargetProblem(meetings)
    if (problem) { res.status(400).json({ success: false, error: problem }); return }
    const result = calculateProgramme({
      meetings,
      leadsPerMeeting: req.query.leadsPerMeeting === undefined ? undefined : Number(req.query.leadsPerMeeting),
      averageClientValue: req.query.averageClientValue === undefined ? undefined : Number(req.query.averageClientValue),
      meetingToClientPct: req.query.meetingToClientPct === undefined ? undefined : Number(req.query.meetingToClientPct),
    })
    res.json({
      success: true,
      data: result,
      // The two framings travel WITH the numbers, so a screen cannot render the figures and
      // leave the caveats behind.
      target_note: TARGET_NOT_GUARANTEE,
      illustrative_note: ILLUSTRATIVE_LABEL,
      benchmark: { leadsPerMeeting: LEADS_PER_TARGETED_MEETING, minLeadsPerMeeting: MIN_LEADS_PER_MEETING },
    })
  } catch (err) {
    console.error('[programme/me/calculator]', err)
    res.status(503).json({ success: false, error: MILLA_FAILURE_COPY.pipelineFailed })
  }
})

/**
 * 🛑 THE CLIENT CHOOSES THEIR PROGRAMME. Creates or re-prices it, attaches their ICP, and
 * records the assumptions they were shown. Takes no money and sources nothing.
 */
myProgrammeRouter.post('/choose', async (req: AuthRequest, res) => {
  try {
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }
    const { chooseProgramme } = await import('../lib/client-programme-choice')
    const r = await chooseProgramme(clientId, {
      meetings: Number(req.body?.meetings),
      leadsPerMeeting: req.body?.leadsPerMeeting === undefined ? undefined : Number(req.body.leadsPerMeeting),
      averageClientValue: req.body?.averageClientValue === undefined ? undefined : Number(req.body.averageClientValue),
      meetingToClientPct: req.body?.meetingToClientPct === undefined ? undefined : Number(req.body.meetingToClientPct),
    })
    if (!r.ok) {
      // 400 for an input the client can fix, 409 for a state that says no, 503 for a write we
      // could not make. Never a bare 500 on a button the client just pressed.
      const status = r.reason === 'invalid_target' ? 400
        : r.reason === 'proof_incomplete' || r.reason === 'locked' ? 409 : 503
      res.status(status).json({ success: false, code: r.reason, error: r.detail })
      return
    }
    res.json({
      success: true,
      created: r.created,
      data: r.result,
      programme: { id: r.programme.id, status: r.programme.status },
      charged: 'nothing — choosing is free; the first payment is a separate step',
    })
  } catch (err) {
    console.error('[programme/me/choose]', err)
    res.status(503).json({ success: false, error: MILLA_FAILURE_COPY.pipelineFailed })
  }
})

/** The client accepts the recommendation. Records agreement; authorises nothing. */
myProgrammeRouter.post('/accept', async (req: AuthRequest, res) => {
  try {
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }
    const { acceptRecommendation } = await import('../lib/client-programme-choice')
    const r = await acceptRecommendation(clientId)
    if (!r.ok) {
      res.status(r.reason === 'locked' ? 409 : r.reason === 'no_programme' ? 404 : 503)
        .json({ success: false, code: r.reason, error: r.detail })
      return
    }
    res.json({
      success: true,
      accepted_at: r.acceptedAt,
      already_accepted: r.alreadyAccepted,
      authorised: 'nothing — the first payment is the next, separate step',
    })
  } catch (err) {
    console.error('[programme/me/accept]', err)
    res.status(503).json({ success: false, error: MILLA_FAILURE_COPY.pipelineFailed })
  }
})

myProgrammeRouter.post('/checkout/first', async (req: AuthRequest, res) => {
  try { await programmeCheckout(req, res, 'programme_first') }
  catch (err) {
    console.error('[programme/me/checkout/first]', err)
    res.status(503).json({ success: false, error: MILLA_FAILURE_COPY.pipelineFailed })
  }
})

myProgrammeRouter.post('/checkout/second', async (req: AuthRequest, res) => {
  try { await programmeCheckout(req, res, 'programme_second') }
  catch (err) {
    console.error('[programme/me/checkout/second]', err)
    res.status(503).json({ success: false, error: MILLA_FAILURE_COPY.pipelineFailed })
  }
})

myProgrammeRouter.post('/approve', async (req: AuthRequest, res) => {
  try {
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }

    const p = await openProgrammeForSession(clientId)
    if (!p) { res.status(404).json({ success: false, error: 'not_found', message: 'No such programme.' }); return }

    // ⚠️ THE VERSION THE CLIENT WAS LOOKING AT, sent back with the press. See `frozen.version`
    // above and the refusal in `approveProgrammeAsCustomer`.
    const version = typeof req.body?.version === 'string' ? req.body.version.trim() : ''
    const { approveProgrammeAsCustomer } = await import('../lib/programme')
    const r = await approveProgrammeAsCustomer(clientId, p.id, version || null)

    if (!r.ok) {
      // ⚠️ THE STATUS CODE CARRIES THE MEANING, so Milla can tell "not yet" from "broken".
      // `nothing_to_review` is a 409, not a 200 with a sad message: the founder's rule is that
      // a READY_FOR_APPROVAL programme with an empty desk must FAIL VISIBLY.
      const code = r.code === 'not_found' ? 404
        : r.code === 'unreadable' ? 503
        : 409
      res.status(code).json({ success: false, error: r.code, message: r.reason })
      return
    }

    res.json({
      success: true,
      data: {
        id: r.programme.id,
        status: r.programme.status,
        approved_at: r.programme.approved_at ?? null,
        already_approved: r.alreadyApproved,
      },
    })
  } catch (err) {
    console.error('[programme/me/approve]', err)
    res.status(503).json({ success: false, error: MILLA_FAILURE_COPY.pipelineFailed })
  }
})
