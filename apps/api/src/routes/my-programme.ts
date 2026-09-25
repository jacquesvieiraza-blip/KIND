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
// ── ⚑ 25 Sep (R158 · R163) — THE CLIENT'S OFFER, IN THEIR OWN WORDS ─────────────────────────
// Four answers — problems, impact, ROI (quoted only with the client's tick), solution — saved into
// the store the email writer already reads (`lib/client-offer.ts`). Skippable; nothing waits on it.
myProgrammeRouter.get('/offer', async (req: AuthRequest, res) => {
  try {
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }
    const { readOffer } = await import('../lib/client-offer')
    res.json({ success: true, data: await readOffer(clientId) })
  } catch (err) {
    console.error('[programme/me/offer GET]', err)
    res.status(503).json({ success: false, error: MILLA_FAILURE_COPY.pipelineFailed })
  }
})

myProgrammeRouter.post('/offer', async (req: AuthRequest, res) => {
  try {
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }
    const { cleanOffer, saveOffer } = await import('../lib/client-offer')
    const input = cleanOffer(req.body)
    if (!input) { res.status(400).json({ success: false, error: 'Answer at least one of the four questions, or skip for now.' }); return }
    await saveOffer(clientId, input)
    res.json({ success: true, saved: true, roi_may_quote: input.roiMayQuote })
  } catch (err) {
    console.error('[programme/me/offer POST]', err)
    res.status(503).json({ success: false, error: 'Your answers could not be saved just now. Please try again.' })
  }
})

myProgrammeRouter.post('/offer/skip', async (req: AuthRequest, res) => {
  try {
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }
    const { skipOffer } = await import('../lib/client-offer')
    await skipOffer(clientId)
    res.json({ success: true, skipped: true })
  } catch (err) {
    console.error('[programme/me/offer/skip POST]', err)
    res.status(503).json({ success: false, error: 'That could not be saved just now. Please try again.' })
  }
})

myProgrammeRouter.get('/review', async (req: AuthRequest, res) => {
  try {
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }

    const p = await openProgrammeForSession(clientId)
    if (!p) { res.json({ success: true, data: { programme: null, prospects: [], total: 0, canApprove: false } }); return }


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
    const frozenLeadIds = Array.isArray(snapObj?.enrolled_lead_ids)
      ? (snapObj.enrolled_lead_ids as unknown[]).filter((v): v is string => typeof v === 'string')
      : []
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
      /**
       * ⚑ 11 Sep (DAY 3) — THE HUMAN-READABLE VERSION NUMBER, alongside the opaque one.
       *
       * The hash is what the approval is pinned to; a client cannot say "I approved dc41f8…"
       * to anybody. This is what a person quotes, and it is the column a re-freeze bumps, so
       * "you are looking at version 2" and "version 1 is what you approved" are both sayable.
       */
      version_number: (p as unknown as { review_preparation_version?: number | null }).review_preparation_version ?? null,
      at: (p as unknown as { review_preparation_at?: string | null }).review_preparation_at ?? null,
      messages: rawSteps.map((st, i) => ({
        step: i + 1,
        subject: String(st.subject ?? ''),
        body: String(st.body ?? ''),
        /** Days after this message before the next one. The final step's own wait is unused. */
        wait_days: Number.isFinite(st.wait_days as number) ? Number(st.wait_days) : 0,
      })),
      /** How many prospects the frozen set holds — the exact population being approved. */
      prospects: frozenLeadIds.length,
      /**
       * ⚑ 18 Sep (J16-C1) — HOW MANY OF THEM WE MAY ACTUALLY EMAIL (FD-5).
       *
       * 🛑 THE NUMBER THAT WAS NOT ON THE SCREEN THEY SAY YES TO. The package stated WHO would
       * receive this and never how many were reachable, so a client approved "40 prospects"
       * when the number we could write to was eighteen. FD-5: *"verified business email
       * required before send; QUALIFIED ≠ SENDABLE."*
       *
       * ⚠️ READ FROM THE FREEZE, NEVER RE-COUNTED HERE. Counting now would state a number that
       * has moved since the package was fixed — the exact drift the freeze exists to stop, and
       * the reason `sendable_count` is inside the digest (J13-C1).
       *
       * ⚠️ NULL IS NOT ZERO. A v2 package predates the field and a failed count could not be
       * taken; both mean "not stated". Rendering 0 would tell a client nobody in their package
       * is reachable, which is a claim about a number nobody took.
       */
      sendable: typeof snapObj.sendable_count === 'number' ? snapObj.sendable_count : null,
      send_schedule: snapObj.send_schedule ?? null,
      /**
       * ⚑ 11 Sep (DAY 3) — THE TARGET, FROM THE FREEZE AND NOT FROM THE LIVE ROW.
       *
       * 🛑 IT IS A TARGET, NEVER A GUARANTEE (founder-locked). Reading it off `p.meeting_target`
       * here would show whatever the number is NOW, which is exactly the drift the freeze
       * exists to stop — and `meeting_target` is inside the digest from v2 precisely so a
       * change to it invalidates the package rather than quietly re-describing the deal.
       */
      meeting_target: typeof snapObj.meeting_target === 'number' ? snapObj.meeting_target : null,
      /**
       * ⚑ 11 Sep (DAY 3) — WHICH MAILBOX THESE WOULD COME FROM.
       *
       * ⛓️ THE HEADER ABOVE SAID "no sender address", AND THAT WAS THE WRONG CALL. It was made
       * to keep OUR plumbing out of a customer screen, and the sending address is not our
       * plumbing — it is the client's own from-line, the thing every recipient will see, and
       * part of what they are being asked to approve. What stays out is the INBOX ID, the
       * credentials and the provider; only the address is shown.
       *
       * ⚠️ PARSED FROM THE SNAPSHOT'S `id|email` FORM, so a snapshot that recorded no address
       * shows none rather than showing an internal identifier.
       */
      sender_email: ((): string | null => {
        const raw = typeof snapObj.sender === 'string' ? snapObj.sender : ''
        const email = raw.includes('|') ? raw.slice(raw.indexOf('|') + 1) : ''
        return email.trim() === '' ? null : email.trim()
      })(),
    } : null

    // ── ⚑ 18 Sep (J14-C3 · R129) — WHOSE ADDRESS IS THAT, ACTUALLY ───────────────────────
    //
    // 🛑 THE SCREEN SAID "Sent from ada@…" AND STOPPED THERE. R129 (16 Sep, founder-locked):
    // *"ENV-BACKED POOLED SENDER INVENTORY + `client_inboxes` as durable assignment/claim
    // truth."* So for most clients that address is one WE own and assign to them for the
    // duration of their programme — and a bare from-line reads as the client's own mailbox,
    // which is the one reading the copy must not leave available.
    //
    // ⚠️ IT IS NOT ALWAYS POOLED. `client_inboxes.kind` also admits `branded` — a client's own
    // domain — and saying "this is ours" about theirs would be the same defect pointing the
    // other way. The KIND is read, never assumed.
    //
    // ⚠️ READING IT LIVE DOES NOT BREAK THE FREEZE. The frozen package pins WHICH mailbox
    // (`sender` is `id|email`); this reads a property OF that exact mailbox by its frozen id.
    // Nothing here can change which sender was approved.
    //
    // ⚠️ AND AN UNREADABLE KIND IS `null`, WHICH RENDERS NO CLAIM AT ALL. A guess about whose
    // mailbox a client is sending from is worse than the bare address they had before.
    let senderKind: string | null = null
    if (frozen?.sender_email) {
      const rawSender = typeof snapObj?.sender === 'string' ? snapObj.sender : ''
      const inboxId = rawSender.includes('|') ? rawSender.slice(0, rawSender.indexOf('|')).trim() : ''
      if (inboxId) {
        const { data: inboxRow, error: inboxErr } = await db.from('client_inboxes')
          .select('kind').eq('id', inboxId).eq('client_id', clientId).maybeSingle()
        if (inboxErr) {
          console.error(`[programme/me/review] the sending mailbox kind could not be read for programme ${p.id}: ${inboxErr.message}. The address is shown without a claim about whose it is.`)
        } else {
          const k = (inboxRow as { kind?: string | null } | null)?.kind
          senderKind = typeof k === 'string' && k.trim() !== '' ? k.trim() : null
        }
      }
    }

    // ── ⚑ 11 Sep (DAY 3) — THE PROSPECTS COME FROM THE FREEZE, AND ALL OF THEM CAN BE READ ──
    //
    // 🛑 THE TWO DEFECTS THIS CLOSES. The desk was a LIVE recomputation of "who is eligible
    // right now" while the client was being asked to approve a FROZEN set — so the screen and
    // the package could describe different people — and it returned the best 50 with a total of
    // 250 and no parameter anywhere that could fetch the other 200. A "view all" with nothing
    // behind it is worse than no count at all.
    //
    // ⚠️ THE FALLBACK IS THE OLD LIVE READ, AND ONLY WHERE THERE IS NO FREEZE TO READ. A
    // programme before `READY_FOR_APPROVAL` has no package yet; showing it the live set is
    // honest there, because nothing is being approved.
    const { readFrozenReviewPage, readProgrammeReviewSet, REVIEW_PAGE } = await import('../lib/programme-review')
    const offset = Number.isFinite(Number(req.query.offset)) ? Math.max(0, Math.floor(Number(req.query.offset))) : 0
    const set = frozen
      ? await readFrozenReviewPage(clientId, p.id, frozenLeadIds, offset, REVIEW_PAGE)
      : await (async () => {
          const live = await readProgrammeReviewSet(clientId, p.id)
          return { prospects: live.prospects, total: live.total, offset: 0, missing: 0, live: true as const, complete: live.complete }
        })()
    // ⚠️ A FROZEN SET IS FINITE AND COUNTED, so `complete` is unconditionally true for it — the
    // floor-vs-count caveat belongs only to the budgeted live scan.
    const complete = 'complete' in set ? set.complete : true

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
        // ⚑ 18 Sep (J14-C3 · R129) — the package, plus whose mailbox the from-line is. The
        // kind rides ON the frozen block because it describes the frozen sender and belongs
        // beside the address it qualifies; `null` states nothing rather than guessing.
        frozen: frozen ? { ...frozen, sender_kind: senderKind } : null,
        prospects: set.prospects,
        total: set.total,
        /** Where this page starts, and the page size — so "view all" is a real parameter. */
        offset: set.offset,
        page_size: REVIEW_PAGE,
        /** True when this set is the frozen package rather than a live eligibility read. */
        from_freeze: !('live' in set),
        /**
         * Ids in the frozen package with no readable lead row behind them.
         *
         * ⚠️ SURFACED RATHER THAN SWALLOWED. They still count toward `total`, because the
         * package contains them; a screen quietly showing fewer people than the package holds
         * is the same disagreement this whole change exists to remove.
         */
        missing: set.missing,
        // ⚠️ `complete: false` MEANS "AT LEAST `total`" — and applies ONLY to the live scan,
        // which is bounded at REVIEW_SCAN_BUDGET rows. A frozen package is a finite list, so it
        // is counted exactly and this is always true for it.
        complete,
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

  // ⚑ 25 Sep — THE HOUSE ACCOUNT OWES NOTHING, AT EITHER HALF, AND NO CHECKOUT IS EVER MINTED FOR IT.
  // The founder's House walk: after approving, Milla offered "Pay the second half — $2,187.50",
  // and this route would have opened a LIVE Stripe session for it until P2 was authorised
  // internally. House's P1 and P2 are internal authority, granted in Vida (R152). Refused before
  // Stripe is reached, so nothing is created and nothing can be charged.
  // ⚑ 25 Sep — A DEMO ACCOUNT IS NEVER CHARGED EITHER. Said here with the reason; the checkout
  // builder refuses too (`programme-checkout.ts`), so no other door can reach Stripe for a demo.
  const { isDemoClient } = await import('../lib/demo')
  if (await isDemoClient(clientId)) {
    res.status(409).json({
      success: false, error: 'demo_account',
      message: 'This is a demo account, so there is nothing to pay and nothing is ever charged.',
    })
    return
  }
  const { isHouseClient } = await import('../lib/house-client')
  if (await isHouseClient(clientId)) {
    res.status(409).json({
      success: false, error: 'internally_billed',
      message: 'This is the House account, so there is nothing to pay. P1 and P2 are authorised internally in Vida. Nothing has been charged.',
    })
    return
  }

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
    // ── 🛑 ⛓️ CORRECTED 11 Sep — UNKNOWN IS NOT ACCEPTED ─────────────────────────────
    //
    // The first cut let an ABSENT `recommendation_accepted_at` through as "the pre-migration
    // world", so the old behaviour stood. That is too permissive for a MONEY-AUTHORITY gate:
    // if we cannot establish whether the client accepted, the one thing we must not do is mint
    // a payment session. Documented migration ordering is a note to a human; this is the
    // control, and it fails closed when the ordering is wrong.
    //
    // THREE OUTCOMES, AND THEY ARE DISTINCT:
    //   a value          → P1 may proceed
    //   present and null → 409 `not_accepted` (they have not agreed yet)
    //   absent           → 503 `acceptance_unavailable`, naming the migration. Retryable,
    //                      because it is OUR configuration and not their fault, and the same
    //                      press works the moment it is applied.
    //
    // ⚠️ A READ FAILURE NEVER REACHES HERE AT ALL. `openProgrammeForClient` throws
    // `ProgrammeStorageError` on a storage error, which the route's own catch answers 503 —
    // so an unreadable programme cannot arrive looking like an accepted one.
    const acceptance = (p as unknown as { recommendation_accepted_at?: string | null })
    if (!('recommendation_accepted_at' in acceptance)) {
      res.status(503).json({
        success: false, error: 'acceptance_unavailable', retryable: true,
        message: 'We could not confirm that you accepted this recommendation, so nothing has been charged. Please try again shortly.',
        detail: 'clients/programmes: run migration 20260910_programme_calculator_choice — until it is applied, acceptance cannot be established and no first payment may be taken.',
      })
      return
    }
    if (!acceptance.recommendation_accepted_at) {
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

    // ── 🛑 ⚑ 11 Sep (DAY 3) — P2 IS CHARGED AGAINST AN *EXACT* APPROVAL, NOT MERELY A STATUS ──
    //
    // 🛑 THE GAP. `maySecondCharge` asks `status === 'APPROVED'`, which was the whole test. A
    // programme can be APPROVED and have its prepared work move afterwards — a prospect
    // evicted, the sequence re-drafted, the sending window or mailbox changed. `preparationDrift`
    // has detected exactly that since 7 Sep and the RUN gate refuses on it, so the drifted
    // programme could never go live — and the client could still be charged the second half for
    // it. Taking money against an approval that no longer covers the work is the defect, and it
    // is a money defect, not a scheduling one.
    //
    // ⚠️ IT REFUSES BEFORE A STRIPE SESSION EXISTS. Nothing is minted and nothing is charged.
    //
    // 🛑 AND `unreadable` REFUSES TOO. "We cannot tell whether this approval still covers the
    // work" is not permission to charge for it. 503 and retryable, because it is our read that
    // failed, not their programme.
    const { preparationDrift } = await import('../lib/preparation-snapshot')
    const drift = await preparationDrift(p.id)
    if (drift.state === 'changed') {
      res.status(409).json({
        success: false, error: 'approval_superseded',
        message: 'This programme has changed since you approved it, so the second payment is not due on it. Nothing has been charged — take another look and approve the current version first.',
      })
      return
    }
    if (drift.state !== 'unchanged') {
      res.status(503).json({
        success: false, error: 'approval_unverifiable', retryable: true,
        message: 'We could not confirm that what you approved is still what would run, so nothing has been charged. Please try again shortly.',
        detail: drift.state === 'unreadable' ? drift.detail : 'This programme carries no approval to charge against.',
      })
      return
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

  // ── 🛑 ⚑ 23 Sep (R136 ④) — WALLET CREDIT IS APPLIED TO P1, AND ONLY TO P1 ──────────────
  //
  // Founder-ruled 23 Sep. P1 authorises sourcing, so a credit reduces the cost of STARTING the
  // next run — which is what *"to use towards another icp run"* means. P2 is going live, a
  // different promise, and takes no credit.
  //
  // ⚠️ IT NEVER COVERS THE WHOLE PAYMENT. Asked directly, the founder answered *"No."* —
  // `walletCreditForPayment` leaves at least the minimum cash going through Stripe.
  //
  // ⚠️ AND NOTHING LEAVES THE WALLET HERE. This is the amount we INTEND to apply; the draw
  // happens when the payment is confirmed. A checkout the client abandons must not have spent
  // their credit.
  //
  // ⚠️ AN UNREADABLE BALANCE APPLIES NO CREDIT RATHER THAN GUESSING ONE. The client pays full
  // price and keeps their credit — recoverable. The opposite error discounts a payment against
  // money that may not be there.
  let walletCreditCents = 0
  if (stage === 'programme_first') {
    try {
      const { walletCreditForPayment, programmeStripeAmountCents } = await import('@kind/shared')
      const { data: w } = await db.from('clients')
        .select('wallet_balance_usd').eq('id', clientId).maybeSingle()
      const balanceUsd = Number((w as { wallet_balance_usd?: number | null } | null)?.wallet_balance_usd ?? 0)
      // ⚠️ THE WALLET IS IN DOLLARS AND THE CURVE IS IN CENTS. Crossing that boundary without
      // the ×100 would apply a credit a hundred times too small — and it would look plausible.
      const balanceCents = Number.isFinite(balanceUsd) ? Math.max(0, Math.floor(balanceUsd * 100)) : 0
      walletCreditCents = walletCreditForPayment(
        balanceCents, programmeStripeAmountCents(p.meeting_target, stage))
    } catch (err) {
      console.error('[programme/me/checkout] wallet balance unreadable — charging full price', err)
      walletCreditCents = 0
    }
  }

  const { createProgrammeCheckoutSession } = await import('../lib/programme-checkout')
  const r = await createProgrammeCheckoutSession({
    clientId, programmeId: p.id, meetings: p.meeting_target, stage, walletCreditCents,
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
            PROGRAMME_BEST_EFFORTS, WIDEN_TO_GO_FURTHER,
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
      // ⚑ 23 Sep (R136 ② · ⑥). Both travel WITH the numbers for the same reason the two above
      // do: a screen cannot render the figures and leave the caveats behind, and neither
      // sentence may be typed into a component where it would drift from the rule.
      best_efforts_note: PROGRAMME_BEST_EFFORTS,
      widen_note: WIDEN_TO_GO_FURTHER,
      benchmark: { leadsPerMeeting: LEADS_PER_TARGETED_MEETING, minLeadsPerMeeting: MIN_LEADS_PER_MEETING },
    })
  } catch (err) {
    console.error('[programme/me/calculator]', err)
    res.status(503).json({ success: false, error: MILLA_FAILURE_COPY.pipelineFailed })
  }
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// 🛑 ⚑ 23 Sep (R136 ⑥) — WHAT THE SLIDER IS ALLOWED TO REACH
//
// The meetings control was `max={50}` with a number box accepting up to 500, hard-coded, with
// no connection to whether the client's targeting contains enough people to carry any of it.
// A client could buy twenty meetings out of a pool that carries three, and every screen after
// that would keep agreeing with them.
//
// 🛑 IT IS A SEPARATE CALL FROM THE QUOTE, DELIBERATELY. `/calculator` is a pure arithmetic
// read and is re-run on every slider movement; this one costs a provider round trip, so the
// client fetches it ONCE per screen. Folding capacity into the quote would put a vendor call
// behind every keystroke — the same "per selection, not per rail refresh" discipline Vida's
// capacity read already follows.
//
// ⚠️ IT RETURNS `committed` AND `known`, AND NOTHING THAT LEAKS THE RATE. Founder, reaffirmed
// 23 Sep: *"i said 400 internally. we dont disclose this."* The assembly is
// `lib/client-capacity.ts`, shared with the Proof screen so the slider stops at exactly the
// number Milla already promised them.
//
// ⚠️ AND A CLIENT WITH NO TARGETING YET IS `known: false`, NOT ZERO. They are simply earlier in
// the journey than this question; answering "0 meetings" would be a claim about their market.
// ═══════════════════════════════════════════════════════════════════════════════════════
myProgrammeRouter.get('/capacity', async (req: AuthRequest, res) => {
  try {
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }

    const { activeIcpFor, clientCapacityFor } = await import('../lib/client-capacity')
    const icp = await activeIcpFor(clientId)
    if (!icp) {
      res.json({ success: true, data: { committed: 0, known: false } })
      return
    }
    const cap = await clientCapacityFor(clientId, icp)
    // ⚑ 24 Sep (R145 step 4 · #29) — AND THE WORKABLE POOL, which the Programme panel's Capacity card
    // shows. The pool is the CLIENT's (matched − their own exclusions − already worked); the rates
    // behind `committed` stay ours and are not sent.
    res.json({ success: true, data: { committed: cap.committed, known: cap.known, workable: cap.workable } })
  } catch (err) {
    console.error('[programme/me/capacity]', err)
    // ⚠️ AN UNREADABLE CAPACITY IS NOT A CAPACITY OF ZERO. The screen leaves the cap off rather
    // than capping a paying client at nothing because a vendor was slow.
    res.json({ success: true, data: { committed: 0, known: false } })
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
      // ⚑ 23 Sep — `over_capacity` is a 409: a state of their targeting, answerable by widening
      // it, not a malformed request and not our fault. It carries `committed` so the screen can
      // put the slider back where the pool actually stops.
      const status = r.reason === 'invalid_target' ? 400
        : r.reason === 'proof_incomplete' || r.reason === 'locked' || r.reason === 'over_capacity' ? 409 : 503
      res.status(status).json({
        success: false, code: r.reason, error: r.detail,
        ...(r.reason === 'over_capacity' ? { committed: r.committed ?? 0 } : {}),
      })
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

// ═══════════════════════════════════════════════════════════════════════════════════════
// 🛑 ⚑ 23 Sep (Section 4 #18) — THE CLIENT SAYS SOMETHING IS WRONG
//
// The Approval screen had exactly one control and it was Approve. If the people were wrong, or
// the emails were wrong, there was no reject, no "ask for changes" and no box to say why — on
// the one screen where a client approves real outreach to real people.
//
// ⚠️ IT PAUSES, IT DOES NOT CANCEL. Pause is orthogonal to status by design, so the freeze, the
// approval state and the money stay exactly where they were. A client must not be able to lose
// their own programme by objecting to it.
//
// ⚠️ AND IT TAKES THEIR WORDS, NOT A CATEGORY. Founder-locked 22 Sep at the equivalent moment:
// *"we cant guess peoples way of speaking ever."*
// ═══════════════════════════════════════════════════════════════════════════════════════
myProgrammeRouter.post('/concern', async (req: AuthRequest, res) => {
  try {
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }

    const p = await openProgrammeForSession(clientId)
    if (!p) { res.status(404).json({ success: false, error: 'not_found', message: 'No such programme.' }); return }

    const { raiseApprovalConcern } = await import('../lib/programme')
    const r = await raiseApprovalConcern({
      programmeId: p.id, clientId, words: String(req.body?.words ?? ''),
    })

    if (!r.ok) {
      // ⚠️ `unpaused` IS A 503, NOT A 409. The words were recorded and the hold was not — that
      // is our failure and it is retryable, and the client was promised nothing would be sent.
      const code = r.code === 'not_found' ? 404
        : r.code === 'unwritable' || r.code === 'unpaused' ? 503
        : r.code === 'empty' || r.code === 'too_long' ? 400
        : 409
      res.status(code).json({ success: false, error: r.code, message: r.reason })
      return
    }
    const { APPROVAL_CONCERN_ACKNOWLEDGED } = await import('@kind/shared')
    res.json({ success: true, data: { held: true, message: APPROVAL_CONCERN_ACKNOWLEDGED } })
  } catch (err) {
    console.error('[programme/me/concern]', err)
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
    // ⚠️ THE AUTHOR COMES FROM THE SESSION. `req.userId` is what `requireAuth` proved; there is
    // no body field for it, so there is nothing a browser can put a different person into.
    const r = await approveProgrammeAsCustomer(clientId, p.id, version || null, req.userId ?? null)

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
