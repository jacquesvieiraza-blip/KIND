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

    res.json({
      success: true,
      data: {
        programme: {
          id: p.id,
          status: p.status,
          meeting_target: p.meeting_target ?? null,
          approved_at: p.approved_at ?? null,
          paused: !!p.paused_at,
        },
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
myProgrammeRouter.post('/approve', async (req: AuthRequest, res) => {
  try {
    const clientId = await getClientId(req.userId!)
    if (!clientId) { res.status(404).json({ success: false, error: 'Client not found' }); return }

    const p = await openProgrammeForSession(clientId)
    if (!p) { res.status(404).json({ success: false, error: 'not_found', message: 'No such programme.' }); return }

    const { approveProgrammeAsCustomer } = await import('../lib/programme')
    const r = await approveProgrammeAsCustomer(clientId, p.id)

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
